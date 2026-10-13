# LucentEdit installer for Windows (PowerShell 5.1+).
#
#   irm https://raw.githubusercontent.com/Tanvir-Chowdhury/LucentEdit/main/scripts/install.ps1 | iex
#
# Uninstall:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/Tanvir-Chowdhury/LucentEdit/main/scripts/install.ps1))) -Uninstall
[CmdletBinding()]
param(
    [switch]$Uninstall
)

# GitHub owner/repo that publishes the releases. Change this one line for forks.
$Repo = 'Tanvir-Chowdhury/LucentEdit'

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is very slow with the progress bar on PS 5
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

function Write-Step($msg) { Write-Host '==> ' -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Write-Ok($msg)   { Write-Host ' ok ' -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Warn2($msg){ Write-Host ' !! ' -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Fail($msg)       { Write-Host 'error: ' -ForegroundColor Red -NoNewline; Write-Host $msg; throw $msg }

# Finds LucentEdit entries in the per-user and machine uninstall registry keys.
function Get-LucentEditInstalls {
    $keys = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    Get-ItemProperty -Path $keys -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -eq 'LucentEdit' -or $_.DisplayName -like 'LucentEdit *' }
}

function Uninstall-LucentEdit {
    $entries = @(Get-LucentEditInstalls)
    if ($entries.Count -eq 0) { Write-Warn2 'LucentEdit does not appear to be installed.'; return }
    foreach ($e in $entries) {
        Write-Step "Removing $($e.DisplayName) $($e.DisplayVersion)"
        if ($e.PSChildName -match '^\{[0-9A-Fa-f-]+\}$') {
            # MSI install: product code is the registry key name.
            Start-Process msiexec.exe -ArgumentList "/x $($e.PSChildName) /qn" -Wait
        } else {
            # NSIS install: UninstallString points at uninstall.exe.
            $exe = ($e.UninstallString -replace '^"([^"]+)".*$', '$1')
            Start-Process -FilePath $exe -ArgumentList '/S' -Wait
        }
    }
    Write-Ok 'LucentEdit removed.'
}

function Install-LucentEdit {
    if (-not [Environment]::Is64BitOperatingSystem) { Fail 'LucentEdit requires 64-bit Windows.' }

    Write-Step "Fetching latest release from $Repo"
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ 'User-Agent' = 'lucentedit-installer' }
    Write-Ok "Latest version: $($release.tag_name)"

    # Prefer the NSIS setup.exe, fall back to the MSI.
    $asset = $release.assets | Where-Object { $_.name -match '_x64-setup\.exe$' } | Select-Object -First 1
    if (-not $asset) { $asset = $release.assets | Where-Object { $_.name -match '_x64.*\.msi$' } | Select-Object -First 1 }
    if (-not $asset) { Fail 'No Windows installer found in the latest release.' }

    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("lucentedit-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        $file = Join-Path $tmp $asset.name
        Write-Step "Downloading $($asset.name) ($([math]::Round($asset.size / 1MB, 1)) MB)"
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $file -UseBasicParsing
        Unblock-File -Path $file -ErrorAction SilentlyContinue

        Write-Step 'Installing silently'
        if ($file -like '*.msi') {
            $p = Start-Process msiexec.exe -ArgumentList "/i `"$file`" /qn /norestart" -Wait -PassThru
        } else {
            $p = Start-Process -FilePath $file -ArgumentList '/S' -Wait -PassThru
        }
        if ($p.ExitCode -ne 0) { Fail "Installer exited with code $($p.ExitCode)." }
    } finally {
        Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    }

    Write-Ok "LucentEdit $($release.tag_name) installed. Find it in the Start menu."
    Write-Host ''
    Write-Host '   AI agents: while LucentEdit runs, MCP is served at http://127.0.0.1:47800/mcp'
    Write-Host "   Docs: https://github.com/$Repo#use-with-ai-agents-mcp"
    Write-Host ''
}

Write-Host ''
Write-Host '  LucentEdit  ' -ForegroundColor White -NoNewline
Write-Host 'free, open-source image & vector editor' -ForegroundColor DarkGray
Write-Host ''

if ($Uninstall) { Uninstall-LucentEdit } else { Install-LucentEdit }
