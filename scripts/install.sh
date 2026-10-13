#!/usr/bin/env bash
# LucentEdit installer for macOS and Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/Tanvir-Chowdhury/LucentEdit/main/scripts/install.sh | bash
#
# Options (pass after `bash -s --` when piping):
#   --appimage   Linux only: install the portable AppImage instead of .deb/.rpm
#   --uninstall  Remove LucentEdit
#   -h, --help   Show help
set -euo pipefail

# GitHub owner/repo that publishes the releases. Change this one line for forks.
REPO="Tanvir-Chowdhury/LucentEdit"

API_URL="https://api.github.com/repos/${REPO}/releases/latest"
ICON_URL="https://raw.githubusercontent.com/${REPO}/main/src-tauri/icons/128x128@2x.png"
APP_NAME="LucentEdit"

BIN_DIR="${HOME}/.local/bin"
APPIMAGE_PATH="${BIN_DIR}/lucentedit"
DESKTOP_FILE="${HOME}/.local/share/applications/lucentedit.desktop"
ICON_FILE="${HOME}/.local/share/icons/hicolor/256x256/apps/lucentedit.png"

# Colors only when writing to a terminal.
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi

info() { printf '%s==>%s %s\n' "${BLUE}${BOLD}" "${RESET}" "$*"; }
ok()   { printf '%s ok%s %s\n' "${GREEN}${BOLD}" "${RESET}" "$*"; }
warn() { printf '%s !!%s %s\n' "${YELLOW}${BOLD}" "${RESET}" "$*" >&2; }
die()  { printf '%serror:%s %s\n' "${RED}${BOLD}" "${RESET}" "$*" >&2; exit 1; }
has()  { command -v "$1" >/dev/null 2>&1; }

usage() {
  cat <<EOF
${BOLD}LucentEdit installer${RESET}

Usage: install.sh [--appimage] [--uninstall]

  --appimage   Linux: install the AppImage to ~/.local/bin/lucentedit (any distro)
  --uninstall  Remove LucentEdit from this machine
  -h, --help   Show this help
EOF
}

FORCE_APPIMAGE=0
UNINSTALL=0
for arg in "$@"; do
  case "$arg" in
    --appimage) FORCE_APPIMAGE=1 ;;
    --uninstall) UNINSTALL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "unknown option: $arg" ;;
  esac
done

# Use sudo only when not already root.
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if has sudo; then SUDO="sudo"; elif has doas; then SUDO="doas"; fi
fi

# Temp dir removed on any exit (also unmounts a dmg left attached on failure).
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t lucentedit)"
MOUNT_POINT=""
cleanup() {
  if [ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ]; then
    hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# Download $1 to $2 (or stdout when $2 is "-") with curl, falling back to wget.
fetch() {
  if has curl; then
    if [ "$2" = "-" ]; then curl -fsSL "$1"; else curl -fL --progress-bar -o "$2" "$1"; fi
  elif has wget; then
    if [ "$2" = "-" ]; then wget -qO- "$1"; else wget -q --show-progress -O "$2" "$1"; fi
  else
    die "curl or wget is required"
  fi
}

# Print the browser_download_url of the first release asset whose URL matches
# the extended regex $1. Parses the JSON with grep so no jq is needed.
RELEASE_JSON=""
find_asset() {
  printf '%s\n' "$RELEASE_JSON" \
    | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | sed -E 's/.*"(https:[^"]*)"$/\1/' \
    | grep -E "$1" | head -n 1 || true
}

load_release() {
  info "Fetching latest release from ${DIM}${REPO}${RESET}"
  RELEASE_JSON="$(fetch "$API_URL" -)" || die "could not reach GitHub API ($API_URL)"
  local tag
  tag="$(printf '%s\n' "$RELEASE_JSON" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed -E 's/.*"([^"]*)"$/\1/')"
  [ -n "$tag" ] || die "no published release found for $REPO"
  ok "Latest version: ${BOLD}${tag}${RESET}"
}

download_asset() {
  local pattern="$1" url file
  url="$(find_asset "$pattern")"
  [ -n "$url" ] || return 1
  file="${TMP_DIR}/${url##*/}"
  info "Downloading ${url##*/}" >&2
  fetch "$url" "$file" >&2
  printf '%s\n' "$file"
}

# ---------- macOS ----------

mac_app_dir() {
  if [ -w /Applications ]; then echo "/Applications"; else echo "${HOME}/Applications"; fi
}

install_macos() {
  local arch pattern dmg dest
  case "$(uname -m)" in
    arm64|aarch64) arch="aarch64" ;;
    x86_64) arch="x64" ;;
    *) die "unsupported Mac architecture: $(uname -m)" ;;
  esac
  pattern="_${arch}\.dmg$"
  load_release
  dmg="$(download_asset "$pattern")" || die "no .dmg for ${arch} in the latest release"

  info "Mounting disk image"
  MOUNT_POINT="${TMP_DIR}/mnt"
  mkdir -p "$MOUNT_POINT"
  hdiutil attach "$dmg" -nobrowse -readonly -quiet -mountpoint "$MOUNT_POINT" \
    || die "failed to mount $dmg"
  [ -d "${MOUNT_POINT}/${APP_NAME}.app" ] || die "${APP_NAME}.app not found inside the dmg"

  dest="$(mac_app_dir)"
  mkdir -p "$dest"
  info "Copying ${APP_NAME}.app to ${dest}"
  rm -rf "${dest:?}/${APP_NAME}.app"
  cp -R "${MOUNT_POINT}/${APP_NAME}.app" "$dest/"
  hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || true
  MOUNT_POINT=""

  # The app is not notarized; drop the quarantine flag so Gatekeeper opens it.
  xattr -dr com.apple.quarantine "${dest}/${APP_NAME}.app" 2>/dev/null || true

  ok "Installed ${BOLD}${dest}/${APP_NAME}.app${RESET}"
  printf '   Launch from Launchpad or run: %sopen -a %s%s\n' "$BOLD" "$APP_NAME" "$RESET"
}

uninstall_macos() {
  local removed=0 d
  for d in /Applications "${HOME}/Applications"; do
    if [ -d "${d}/${APP_NAME}.app" ]; then
      info "Removing ${d}/${APP_NAME}.app"
      rm -rf "${d:?}/${APP_NAME}.app" 2>/dev/null || ${SUDO} rm -rf "${d:?}/${APP_NAME}.app"
      removed=1
    fi
  done
  if [ "$removed" -eq 1 ]; then ok "LucentEdit removed"; else warn "LucentEdit.app was not found"; fi
}

# ---------- Linux ----------

linux_arch_check() {
  case "$(uname -m)" in
    x86_64|amd64) ;;
    *) die "prebuilt Linux builds are x86_64 only (found $(uname -m)); build from source instead" ;;
  esac
}

install_deb() {
  local file
  file="$(download_asset '_amd64\.deb$')" || return 1
  info "Installing with apt (may ask for your password)"
  ${SUDO} apt-get install -y "$file"
}

install_rpm() {
  local file
  file="$(download_asset '\.x86_64\.rpm$')" || return 1
  if has dnf; then
    info "Installing with dnf (may ask for your password)"
    ${SUDO} dnf install -y "$file"
  elif has zypper; then
    info "Installing with zypper (may ask for your password)"
    ${SUDO} zypper --non-interactive install --allow-unsigned-rpm "$file"
  else
    info "Installing with yum (may ask for your password)"
    ${SUDO} yum install -y "$file"
  fi
}

install_appimage() {
  local file
  file="$(download_asset '_amd64\.AppImage$')" || die "no AppImage in the latest release"
  mkdir -p "$BIN_DIR" "$(dirname "$DESKTOP_FILE")" "$(dirname "$ICON_FILE")"
  mv -f "$file" "$APPIMAGE_PATH"
  chmod +x "$APPIMAGE_PATH"

  fetch "$ICON_URL" "$ICON_FILE" >/dev/null 2>&1 || warn "could not download icon (menu entry will use a generic one)"

  cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=LucentEdit
GenericName=Image & Vector Editor
Comment=Lightweight open-source Photoshop + Illustrator alternative
Exec=${APPIMAGE_PATH} %f
Icon=${ICON_FILE}
Terminal=false
Categories=Graphics;2DGraphics;RasterGraphics;VectorGraphics;
MimeType=application/x-lucentedit;image/png;image/jpeg;image/webp;image/svg+xml;image/vnd.adobe.photoshop;
StartupWMClass=lucentedit
EOF
  if has update-desktop-database; then update-desktop-database "$(dirname "$DESKTOP_FILE")" >/dev/null 2>&1 || true; fi

  if ! has fusermount && ! has fusermount3; then
    warn "FUSE not found. AppImages need libfuse2 (or run: lucentedit --appimage-extract-and-run)"
  fi
  case ":${PATH}:" in
    *":${BIN_DIR}:"*) ;;
    *) warn "${BIN_DIR} is not on your PATH; add: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
  esac
  ok "Installed AppImage to ${BOLD}${APPIMAGE_PATH}${RESET}"
}

install_linux() {
  linux_arch_check
  load_release
  if [ "$FORCE_APPIMAGE" -eq 1 ]; then
    install_appimage
  elif has apt-get; then
    install_deb || { warn ".deb install failed or missing, falling back to AppImage"; install_appimage; }
  elif has dnf || has yum || has zypper; then
    install_rpm || { warn ".rpm install failed or missing, falling back to AppImage"; install_appimage; }
  else
    install_appimage
  fi
  ok "Done. Launch ${BOLD}LucentEdit${RESET} from your app menu or run ${BOLD}lucentedit${RESET}"
}

uninstall_linux() {
  local removed=0
  if [ -f "$APPIMAGE_PATH" ] || [ -f "$DESKTOP_FILE" ]; then
    info "Removing AppImage and desktop entry"
    rm -f "$APPIMAGE_PATH" "$DESKTOP_FILE" "$ICON_FILE"
    removed=1
  fi
  if has dpkg && dpkg -s lucentedit >/dev/null 2>&1; then
    info "Removing lucentedit .deb package"
    if has apt-get; then ${SUDO} apt-get remove -y lucentedit; else ${SUDO} dpkg -r lucentedit; fi
    removed=1
  elif has rpm && rpm -q lucentedit >/dev/null 2>&1; then
    info "Removing lucentedit .rpm package"
    if has dnf; then ${SUDO} dnf remove -y lucentedit
    elif has zypper; then ${SUDO} zypper --non-interactive remove lucentedit
    else ${SUDO} yum remove -y lucentedit; fi
    removed=1
  fi
  if [ "$removed" -eq 1 ]; then ok "LucentEdit removed"; else warn "LucentEdit does not appear to be installed"; fi
}

# ---------- main ----------

printf '\n%s  LucentEdit%s %sfree, open-source image & vector editor%s\n\n' "$BOLD" "$RESET" "$DIM" "$RESET"

case "$(uname -s)" in
  Darwin)
    if [ "$UNINSTALL" -eq 1 ]; then uninstall_macos; else install_macos; fi ;;
  Linux)
    if [ "$UNINSTALL" -eq 1 ]; then uninstall_linux; else install_linux; fi ;;
  *)
    die "unsupported OS $(uname -s). On Windows run: irm https://raw.githubusercontent.com/${REPO}/main/scripts/install.ps1 | iex" ;;
esac

if [ "$UNINSTALL" -eq 0 ]; then
  printf '\n   AI agents: while LucentEdit runs, MCP is served at %shttp://127.0.0.1:47800/mcp%s\n' "$BOLD" "$RESET"
  printf '   Docs: https://github.com/%s#use-with-ai-agents-mcp\n\n' "$REPO"
fi
