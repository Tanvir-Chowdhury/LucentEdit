<div align="center">

<img src="public/logo.svg" alt="Lucent logo" width="112" height="112" />

# Lucent

**The free, lightweight, open-source Photoshop + Illustrator alternative, built for humans and AI agents.**

Layers, pen paths, filters, PSD import/export and a built-in MCP server so Claude, Cursor, Copilot, Codex, Gemini and any other AI coding agent can design for you.
No signup. No login. No subscription. A 2 MB Linux package and a 4 MB app binary.

[![License: MIT](https://img.shields.io/badge/license-MIT-7c5cff.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-2d2d3a.svg)](#install)
[![Latest release](https://img.shields.io/github/v/release/Tanvir-Chowdhury/lucent?color=22c55e&label=release)](https://github.com/Tanvir-Chowdhury/lucent/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Tanvir-Chowdhury/lucent/total?color=0ea5e9)](https://github.com/Tanvir-Chowdhury/lucent/releases)
[![MCP](https://img.shields.io/badge/MCP-built--in-f97316.svg)](#use-with-ai-agents-mcp)

[Install](#install) · [Use with AI agents](#use-with-ai-agents-mcp) · [Shortcuts](#coming-from-photoshop--illustrator) · [Build from source](#build-from-source) · [Roadmap](#roadmap)

<br />

<img src="docs/hero.png" alt="A social card designed in Lucent by an AI agent over MCP" width="900" />

<sub>This banner was designed inside Lucent by an AI agent through the built-in MCP server.</sub>

</div>

---

## Table of contents

- [Why Lucent](#why-lucent)
- [Features](#features)
- [Install](#install)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
  - [Manual downloads](#manual-downloads)
  - [Uninstall](#uninstall)
- [Use with AI agents (MCP)](#use-with-ai-agents-mcp)
  - [Client setup](#client-setup)
  - [MCP tools](#mcp-tools)
  - [Example prompts](#example-prompts)
- [Coming from Photoshop / Illustrator](#coming-from-photoshop--illustrator)
- [Build from source](#build-from-source)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why Lucent

- **Free forever.** MIT licensed, no account, no paywalled features.
- **Light.** Native Tauri shell with the system webview: the `.deb`/`.rpm` packages are about 2 MB, the app uses a fraction of the memory of Electron apps and runs on low-spec PCs. (The portable AppImage is ~110 MB because it bundles its own WebKit.)
- **One app for pixels and vectors.** Raster painting and Illustrator-style pen paths live in the same layer stack.
- **AI-native.** A local MCP server is built in. Any agent can create documents, draw, apply filters, look at a rendered preview and export, while you watch it happen live.
- **Familiar.** Photoshop keyboard shortcuts and terminology, PSD import/export with layers.

## Features

| Area | What you get in v0.1 |
| --- | --- |
| **Documents** | Multi-document tabs, 12 size presets, native `.lucent` format, open PNG/JPG/WebP/GIF/SVG/PSD, drag & drop and paste images from the clipboard, Image Size, Canvas Size, rotate/flip canvas, trim |
| **Layers** | Raster, vector shapes, pen paths, text and groups. Blend modes, opacity, lock, visibility, drag to reorder |
| **Selection & transform** | Move with free transform (resize, rotate), snapping and smart guides, Rectangular/Elliptical Marquee, Lasso, Magic Wand, Crop |
| **Painting** | Brush, Eraser, Paint Bucket, Gradient, Eyedropper |
| **Vector** | Pen (bezier), Direct Selection, Rectangle, Ellipse, Polygon, Star, Line |
| **Text** | Point and paragraph text edited directly on the canvas, font family/weight/size, line height, tracking, alignment, gradient and stroked text |
| **Fill & stroke** | Solid, linear and radial gradient fills. Strokes with dash, cap and join |
| **Effects** | Drop shadow, outer glow |
| **Masks** | Non-destructive layer masks (reveal/hide all, from selection; paint black to hide, white to reveal; enable, apply, delete) and clipping masks (Ctrl+Alt+G) |
| **Filters & adjustments** | Brightness/Contrast, Hue/Saturation, Levels, Exposure, Vibrance, Invert, Black & White, Sepia, Posterize, Threshold, Gaussian Blur, Unsharp Mask, Add Noise, Pixelate, Vignette, all with live preview and limited to the active selection |
| **Layout** | Align and distribute |
| **History** | History panel with undo/redo |
| **Import / export** | PSD import/export with layers, SVG import as editable vector layers (great for Illustrator files saved as SVG), export PNG / JPG / WebP (with 0.25× to 4× scale) / SVG, save `.lucent` |
| **Navigation** | Hand (or hold Space), Zoom, Ctrl+wheel zoom at cursor, fit to screen, 100% view, rulers, grid |
| **UX** | Premium dark UI, Photoshop keyboard shortcuts, command palette (Ctrl+K), scrubbable number fields that accept math (`120*2`), color picker with recent colors |
| **AI** | Built-in MCP server (Streamable HTTP) plus a stdio bridge for every MCP client |

## Install

All installers download the latest release from [GitHub Releases](https://github.com/Tanvir-Chowdhury/lucent/releases/latest). Nothing else is installed, and there is nothing to sign up for.

### macOS

Apple Silicon and Intel are both supported (macOS 10.15+).

```bash
curl -fsSL https://raw.githubusercontent.com/Tanvir-Chowdhury/lucent/main/scripts/install.sh | bash
```

The script picks the right `.dmg` for your chip, copies `Lucent.app` into `/Applications` (or `~/Applications` if that is not writable) and removes the quarantine flag.

> [!NOTE]
> **Unsigned app.** Lucent is not yet notarized by Apple. The installer script handles this for you. If you installed the `.dmg` manually and macOS says the app "is damaged" or "cannot be opened", run:
>
> ```bash
> xattr -dr com.apple.quarantine /Applications/Lucent.app
> ```
>
> or right-click Lucent.app, choose **Open**, then confirm.

### Windows

Windows 10 and 11 (x64). Open **PowerShell** and run:

```powershell
irm https://raw.githubusercontent.com/Tanvir-Chowdhury/lucent/main/scripts/install.ps1 | iex
```

This downloads the setup `.exe` (falls back to the `.msi`) and installs it silently for your user. Lucent appears in the Start menu.

> [!NOTE]
> **SmartScreen.** The installer is not code-signed yet, so if you download it manually Windows may show *"Windows protected your PC"*. Click **More info** then **Run anyway**. The PowerShell script avoids this prompt. WebView2 is required and ships with Windows 10/11; the installer fetches it if missing.

### Linux

One command for every distro (x86_64):

```bash
curl -fsSL https://raw.githubusercontent.com/Tanvir-Chowdhury/lucent/main/scripts/install.sh | bash
```

The script detects your package manager and picks the best format:

| Distro family | Format used | How it is installed |
| --- | --- | --- |
| **Debian, Ubuntu, Linux Mint, Pop!_OS, elementary, Zorin** | `.deb` | `sudo apt install ./Lucent_<version>_amd64.deb` |
| **Fedora, RHEL, CentOS Stream, Rocky, Alma, openSUSE** | `.rpm` | `sudo dnf install ./Lucent-<version>-1.x86_64.rpm` or `sudo zypper install ./Lucent-<version>-1.x86_64.rpm` |
| **Arch, Manjaro, CachyOS, EndeavourOS, Void, NixOS, others** | `.AppImage` | Saved to `~/.local/bin/lucent` with a desktop entry in `~/.local/share/applications/` |
| **Any distro** | `.AppImage` | Force it with the `--appimage` flag below |

Force the portable AppImage on any distro (no root needed):

```bash
curl -fsSL https://raw.githubusercontent.com/Tanvir-Chowdhury/lucent/main/scripts/install.sh | bash -s -- --appimage
```

> [!TIP]
> AppImages need FUSE 2. If Lucent does not start, install `fuse2` (Arch) / `libfuse2` (Debian/Ubuntu) / `fuse` (Fedora), or run `lucent --appimage-extract-and-run`. Make sure `~/.local/bin` is on your `PATH`.

### Manual downloads

Prefer clicking? Grab a file from the [latest release](https://github.com/Tanvir-Chowdhury/lucent/releases/latest):

| Platform | File | Notes |
| --- | --- | --- |
| macOS (Apple Silicon) | `Lucent_<version>_aarch64.dmg` | M1/M2/M3/M4. Drag to Applications, then see the quarantine note |
| macOS (Intel) | `Lucent_<version>_x64.dmg` | Drag to Applications |
| Windows (x64) | `Lucent_<version>_x64-setup.exe` | Recommended, per-user install |
| Windows (x64) | `Lucent_<version>_x64_en-US.msi` | For managed / IT deployments |
| Debian / Ubuntu | `Lucent_<version>_amd64.deb` | `sudo apt install ./Lucent_*_amd64.deb` |
| Fedora / openSUSE | `Lucent-<version>-1.x86_64.rpm` | `sudo dnf install ./Lucent-*.rpm` |
| Any Linux | `Lucent_<version>_amd64.AppImage` | `chmod +x Lucent_*.AppImage && ./Lucent_*.AppImage` |

### Uninstall

**macOS / Linux** (removes the app, `.deb`/`.rpm` package or AppImage + desktop entry):

```bash
curl -fsSL https://raw.githubusercontent.com/Tanvir-Chowdhury/lucent/main/scripts/install.sh | bash -s -- --uninstall
```

**Windows:**

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Tanvir-Chowdhury/lucent/main/scripts/install.ps1))) -Uninstall
```

Or by hand:

| OS | Command |
| --- | --- |
| macOS | `rm -rf /Applications/Lucent.app` |
| Debian / Ubuntu | `sudo apt remove lucent` |
| Fedora / RHEL | `sudo dnf remove lucent` |
| openSUSE | `sudo zypper remove lucent` |
| AppImage | `rm ~/.local/bin/lucent ~/.local/share/applications/lucent.desktop` |
| Windows | Settings > Apps > Installed apps > Lucent > Uninstall |

## Use with AI agents (MCP)

While Lucent is running, it serves the [Model Context Protocol](https://modelcontextprotocol.io) over **Streamable HTTP** at:

```
http://127.0.0.1:47800/mcp
```

If port 47800 is busy, Lucent falls back to 47801 to 47810. The active address is always shown in the app's status bar. The server only listens on localhost.

For clients that only speak **stdio**, use the zero-dependency Node bridge (Node 18+):

```bash
npx -y lucent-mcp                 # once published to npm
node /path/to/lucent/mcp/lucent-mcp.mjs   # from a clone of this repo
```

Set `LUCENT_MCP_URL` to point the bridge at a different port, e.g. `LUCENT_MCP_URL=http://127.0.0.1:47801/mcp`.

### Client setup

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --transport http lucent http://127.0.0.1:47800/mcp
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Edit `claude_desktop_config.json` (Settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "lucent": {
      "command": "npx",
      "args": ["-y", "lucent-mcp"]
    }
  }
}
```

Using a local clone instead: `"command": "node", "args": ["/absolute/path/to/lucent/mcp/lucent-mcp.mjs"]`.

</details>

<details>
<summary><b>Cursor</b></summary>

`.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "lucent": {
      "url": "http://127.0.0.1:47800/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>VS Code (GitHub Copilot agent mode)</b></summary>

`.vscode/mcp.json`:

```json
{
  "servers": {
    "lucent": {
      "type": "http",
      "url": "http://127.0.0.1:47800/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "lucent": {
      "serverUrl": "http://127.0.0.1:47800/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>OpenAI Codex CLI</b></summary>

`~/.codex/config.toml`:

```toml
[mcp_servers.lucent]
command = "npx"
args = ["-y", "lucent-mcp"]
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

`~/.gemini/settings.json` (or `.gemini/settings.json` in your project):

```json
{
  "mcpServers": {
    "lucent": {
      "httpUrl": "http://127.0.0.1:47800/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Any other client</b></summary>

Use the HTTP URL `http://127.0.0.1:47800/mcp` if the client supports Streamable HTTP, otherwise run the stdio bridge with `npx -y lucent-mcp`.

</details>

> [!TIP]
> Ask your agent to call `get_guide` first. It returns Lucent's coordinate system, layer model and best practices so the agent designs well from the first try.

### MCP tools

| Category | Tools |
| --- | --- |
| **Guide & documents** | `get_guide`, `get_document`, `list_documents`, `new_document`, `set_document`, `switch_document` |
| **Create** | `add_shape` (rect, ellipse, polygon, star, line), `add_path` (SVG path data), `add_text`, `add_image` (file path, URL or data URL), `add_raster_layer`, `draw_stroke` |
| **Edit layers** | `update_layer`, `delete_layers`, `duplicate_layer`, `reorder_layer`, `group_layers`, `ungroup_layer`, `select_layers` |
| **Layout** | `align_layers`, `distribute_layers` |
| **Masks & selections** | `set_layer_mask` (shape, selection, reveal, hide, apply), `set_clipping_mask`, `select_area` |
| **Filters** | `apply_filter` |
| **See the result** | `render_preview` (returns a PNG so the agent can look at its own work) |
| **Files** | `export_document` (png, jpg, webp, svg, psd, lucent), `open_file`, `save_document` |
| **History** | `undo`, `redo` |
| **Misc** | `list_fonts`, `batch` (run many operations in one call) |

### Example prompts

- *"Create a 1080x1080 Instagram post for a coffee shop launch: warm gradient background, a bold headline, a minimal cup icon drawn with paths. Render a preview and refine it until it looks polished, then export PNG to ~/Desktop/launch.png."*
- *"Open ~/Pictures/team.jpg, add a dark gradient overlay at the bottom and the text 'Meet the team' in white, then save as team.psd with layers."*
- *"Design a 1280x640 GitHub social preview for my repo using the colors in tailwind.config.js. Use list_fonts to pick a good sans-serif."*
- *"Make 5 app icon variations (1024x1024) of a paper plane logo, each in its own document, and export them as SVG."*
- *"Take the current document, convert it to grayscale, add noise and a sepia tone for a vintage look."*

## Coming from Photoshop / Illustrator

Lucent follows Photoshop shortcuts so your muscle memory works. On macOS use **Cmd** wherever **Ctrl** is listed and **Option** for **Alt**.

### Tools

| Key | Tool | Key | Tool |
| --- | --- | --- | --- |
| `V` | Move (free transform) | `T` | Text |
| `M` | Marquee (`Shift+M` cycles rectangular / elliptical) | `P` | Pen |
| `L` | Lasso | `A` | Direct Selection |
| `W` | Magic Wand | `U` | Shapes (`Shift+U` cycles rect / ellipse / polygon / star / line) |
| `C` | Crop | `H` | Hand (or hold `Space`) |
| `I` | Eyedropper | `Z` | Zoom |
| `B` | Brush | `D` | Default colors (black / white) |
| `E` | Eraser | `X` | Swap foreground / background |
| `G` | Paint Bucket / Gradient (`Shift+G` cycles) | `[` `]` | Decrease / increase brush size |

### Commands

| Shortcut | Action | Shortcut | Action |
| --- | --- | --- | --- |
| `Ctrl+Z` | Undo | `Ctrl+N` | New document |
| `Ctrl+Shift+Z` | Redo | `Ctrl+O` | Open |
| `Ctrl+T` | Free transform | `Ctrl+S` | Save |
| `Ctrl+J` | Duplicate layer | `Ctrl+Shift+S` | Save as |
| `Ctrl+G` | Group layers | `Ctrl+Shift+E` | Export |
| `Ctrl+Shift+G` | Ungroup | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / cut / paste |
| `Ctrl+E` | Merge down | `Delete` | Delete selected layer / selection |
| `Ctrl+A` | Select all | `Ctrl+0` | Fit on screen |
| `Ctrl+D` | Deselect | `Ctrl+1` | 100% zoom |
| `Ctrl+Shift+I` | Invert selection | `Ctrl++` / `Ctrl+-` | Zoom in / out |
| Arrow keys | Nudge 1 px | `Shift+Arrow` | Nudge 10 px |
| `Ctrl+Alt+G` | Create / release clipping mask | `Ctrl+K` | Command palette |
| `Ctrl+I` / `Ctrl+L` / `Ctrl+U` | Invert / Levels / Hue-Saturation | `Ctrl+Shift+U` | Black & White |
| `Ctrl+]` / `Ctrl+[` | Bring forward / send backward | `Ctrl+Shift+]` / `Ctrl+Shift+[` | Bring to front / send to back |
| `Alt+Backspace` | Fill with foreground | `Ctrl+Backspace` | Fill with background |
| `Ctrl+Alt+I` / `Ctrl+Alt+C` | Image size / Canvas size | `Ctrl+/` | All shortcuts |

> Note: Lucent uses `Ctrl+Shift+E` for **Export**, not Merge Visible as in Photoshop.

### Terminology

| Photoshop / Illustrator | Lucent |
| --- | --- |
| Artboard / Canvas | Document (each tab is one document) |
| Layer Styles / Appearance effects | Effects (drop shadow, outer glow) |
| Smart Guides | Smart guides and snapping (Move tool) |
| Adjustments / Filter menu | Filters & adjustments |
| Shape layer / Live Shape | Vector shape layer (rect, ellipse, polygon, star, line) |
| Path / Pen path (Illustrator) | Path layer (bezier, editable with Direct Selection) |
| Pixel layer | Raster layer |
| Swatches / Fill & Stroke | Fill (solid, linear, radial) and Stroke (dash, cap, join) |
| History palette | History panel |
| Align panel | Align & distribute |
| `.psd` | Import and export with layers; native format is `.lucent` |

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) stable
- Platform dependencies:

**Linux (Debian/Ubuntu)**

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

For other distros see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (e.g. Arch: `webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool`).

**macOS**

```bash
xcode-select --install
```

**Windows**

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++"
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 10/11)

### Build and run

```bash
git clone https://github.com/Tanvir-Chowdhury/lucent.git
cd lucent
npm install

npm run app:dev      # desktop app with hot reload
npm run app:build    # production installers in src-tauri/target/release/bundle/
```

Web-only version (no MCP server, runs in the browser):

```bash
npm run dev          # http://localhost:1420
```

## Project structure

```
lucent/
├── src/                 # Frontend (Preact + TypeScript, Canvas2D)
│   ├── core/            # Document model, rendering, tools, filters, PSD/SVG I/O
│   ├── mcp/             # MCP tool handlers (bridge between agent calls and the editor)
│   └── ui/              # Panels, toolbars, dialogs, dark theme
├── src-tauri/           # Rust shell: window, native dialogs, local MCP HTTP server
├── mcp/                 # lucent-mcp.mjs stdio bridge for stdio-only MCP clients
├── public/              # Static assets (logo.svg)
├── scripts/             # install.sh (macOS/Linux) and install.ps1 (Windows)
├── docs/                # Screenshots and docs assets
└── .github/             # CI, release workflow, issue templates
```

## Roadmap

- [x] Layer masks
- [x] Clipping masks
- [ ] Boolean path operations (unite, subtract, intersect, exclude)
- [ ] Artboards (multiple boards per document)
- [ ] Clone stamp and healing
- [ ] Smudge / blur / dodge / burn brushes
- [ ] Adobe Illustrator (`.ai`) import
- [ ] Plugin API
- [ ] Signed and notarized builds, auto-update

Have an idea? [Open a feature request](https://github.com/Tanvir-Chowdhury/lucent/issues/new?template=feature_request.md).

## Contributing

Contributions of all sizes are welcome: bug reports, docs, new tools, filters or MCP tools. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started, and use the [issue templates](https://github.com/Tanvir-Chowdhury/lucent/issues/new/choose) for bugs and feature ideas.

## License

[MIT](LICENSE) © 2026 Tanvir Chowdhury and Lucent contributors. Free for personal and commercial use.
