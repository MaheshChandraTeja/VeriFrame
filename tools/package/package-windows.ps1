<#
.SYNOPSIS
  Build VeriFrame Windows release artifacts into repo-root /dist.

.DESCRIPTION
  Produces:
    dist/windows/VeriFrame-<version>-app.exe
    dist/windows/VeriFrame-<version>-portable/
    dist/windows/VeriFrame-<version>-portable.zip
    dist/windows/VeriFrame-<version>-setup.exe      # NSIS, if Tauri target enabled
    dist/windows/VeriFrame-<version>-setup.msi      # MSI, if Tauri target enabled
    dist/windows/checksums.sha256.txt
    dist/windows/release-manifest.json

  This script assumes Windows + PowerShell + PNPM + Rust + Python/Conda.

.NOTES
  Place this file at:
    tools/package/package-windows.ps1

  Run from repo root:
    powershell -ExecutionPolicy Bypass -File tools/package/package-windows.ps1 -Version 0.1.0

  For a dev-only UI package without building the Python sidecar:
    powershell -ExecutionPolicy Bypass -File tools/package/package-windows.ps1 -Version 0.1.0 -SkipEngineSidecar
#>

param(
  [string]$Version = "0.1.0",
  [string]$ProductName = "VeriFrame",
  [switch]$SkipTests,
  [switch]$SkipEngineSidecar,
  [switch]$NoClean,
  [switch]$VerboseCommands,
  [string]$PythonExe = "",
  [string]$CondaEnvName = "veriframe"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Fail {
  param([string]$Message)
  throw "[VeriFrame Packaging] $Message"
}


function Resolve-PackagingPython {
  param(
    [string]$ExplicitPython,
    [string]$EnvName
  )

  if ($ExplicitPython -and (Test-Path $ExplicitPython)) {
    return (Resolve-Path $ExplicitPython).Path
  }

  if ($env:CONDA_PREFIX) {
    $condaPrefixPython = Join-Path $env:CONDA_PREFIX "python.exe"
    if (Test-Path $condaPrefixPython) {
      return (Resolve-Path $condaPrefixPython).Path
    }
  }

  $condaCommand = Get-Command conda -ErrorAction SilentlyContinue
  if ($condaCommand -and $EnvName) {
    $resolved = & conda run -n $EnvName python -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $resolved) {
      $candidate = ($resolved | Select-Object -Last 1).Trim()
      if (Test-Path $candidate) {
        return (Resolve-Path $candidate).Path
      }
    }
  }

  $pathPython = & python -c "import sys; print(sys.executable)"
  if ($LASTEXITCODE -eq 0 -and $pathPython) {
    $candidate = ($pathPython | Select-Object -Last 1).Trim()
    if (Test-Path $candidate) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "Could not resolve a usable Python executable for packaging."
}
function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  if ($VerboseCommands) {
    Write-Host "RUN $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
  }

  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      Fail "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Resolve-RepoRoot {
  $scriptDir = Split-Path -Parent $PSCommandPath

  if (Test-Path (Join-Path $scriptDir "package.json")) {
    return (Resolve-Path $scriptDir).Path
  }

  $candidate = Resolve-Path (Join-Path $scriptDir "..\..") -ErrorAction SilentlyContinue
  if ($candidate -and (Test-Path (Join-Path $candidate.Path "package.json"))) {
    return $candidate.Path
  }

  $current = (Get-Location).Path
  if (Test-Path (Join-Path $current "package.json")) {
    return $current
  }

  Fail "Could not resolve repo root. Run this from the VeriFrame repo root or place script in tools/package."
}

function Get-TargetTriple {
  $rustcOutput = & rustc -vV
  $hostLine = $rustcOutput | Where-Object { $_ -like "host:*" } | Select-Object -First 1
  if (-not $hostLine) {
    return "x86_64-pc-windows-msvc"
  }

  return ($hostLine -replace "host:\s*", "").Trim()
}

function Copy-FirstMatch {
  param(
    [string[]]$Patterns,
    [string]$Destination,
    [string]$Label,
    [switch]$Required
  )

  foreach ($pattern in $Patterns) {
    $match = Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if ($match) {
      Copy-Item $match.FullName $Destination -Force
      Write-Ok "$Label copied: $($match.FullName) -> $Destination"
      return $true
    }
  }

  if ($Required) {
    Fail "$Label was not found. Checked: $($Patterns -join ', ')"
  }

  Write-Warn "$Label not found. Checked: $($Patterns -join ', ')"
  return $false
}

function Copy-DirectoryIfExists {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (Test-Path $Source) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
    if (Test-Path $Destination) {
      Remove-Item $Destination -Recurse -Force
    }
    Copy-Item $Source $Destination -Recurse -Force
    Write-Ok "Copied directory: $Source -> $Destination"
  } else {
    Write-Warn "Directory not found, skipped: $Source"
  }
}

$RepoRoot = Resolve-RepoRoot
$UiDir = Join-Path $RepoRoot "apps\ui-angular"
$DesktopDir = Join-Path $RepoRoot "apps\desktop-tauri"
$SrcTauriDir = Join-Path $DesktopDir "src-tauri"
$TauriTargetDir = Join-Path $SrcTauriDir "target"
$DistRoot = Join-Path $RepoRoot "dist"
$DistWindows = Join-Path $DistRoot "windows"
$ResolvedPythonExe = Resolve-PackagingPython -ExplicitPython $PythonExe -EnvName $CondaEnvName
Write-Ok "Using Python for packaging: $ResolvedPythonExe"
& $ResolvedPythonExe -c "import sys; print('Python executable:', sys.executable); print('Python version:', sys.version)"
if ($LASTEXITCODE -ne 0) {
  Fail "Selected Python executable failed sanity check: $ResolvedPythonExe"
}
$BuildCache = Join-Path $DistRoot "_build-cache"
$PortableFolder = Join-Path $DistWindows "$ProductName-$Version-portable"
$PortableExe = Join-Path $DistWindows "$ProductName-$Version-app.exe"
$PortableZip = Join-Path $DistWindows "$ProductName-$Version-portable.zip"
$SetupExe = Join-Path $DistWindows "$ProductName-$Version-setup.exe"
$SetupMsi = Join-Path $DistWindows "$ProductName-$Version-setup.msi"

Write-Step "Resolved paths"
Write-Host "Repo:          $RepoRoot"
Write-Host "Angular UI:    $UiDir"
Write-Host "Tauri shell:   $SrcTauriDir"
Write-Host "Output:        $DistWindows"

if (-not (Test-Path $UiDir)) { Fail "Angular UI directory missing: $UiDir" }
if (-not (Test-Path $SrcTauriDir)) { Fail "Tauri src-tauri directory missing: $SrcTauriDir" }
if (-not (Test-Path (Join-Path $RepoRoot "engine\veriframe_core"))) { Fail "Python engine missing." }

Write-Step "Preparing dist directory"
if (-not $NoClean -and (Test-Path $DistWindows)) {
  Remove-Item $DistWindows -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $DistWindows | Out-Null
New-Item -ItemType Directory -Force -Path $BuildCache | Out-Null
New-Item -ItemType Directory -Force -Path $PortableFolder | Out-Null

Write-Step "Toolchain preflight"
Invoke-Checked $ResolvedPythonExe @("--version") $RepoRoot
Invoke-Checked "pnpm" @("--version") $RepoRoot
Invoke-Checked "cargo" @("--version") $RepoRoot
Invoke-Checked "rustc" @("--version") $RepoRoot
$TargetTriple = Get-TargetTriple
Write-Ok "Rust target triple: $TargetTriple"

Write-Step "Ensuring Tauri sidecar placeholder exists for cargo check"

$BinariesDir = Join-Path $SrcTauriDir "binaries"
New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null

$ExpectedSidecar = Join-Path $BinariesDir "veriframe-engine-$TargetTriple.exe"

if (-not (Test-Path $ExpectedSidecar)) {
  New-Item -ItemType File -Force -Path $ExpectedSidecar | Out-Null
  Write-Warn "Created temporary sidecar placeholder for Tauri config validation: $ExpectedSidecar"
  Write-Warn "The real PyInstaller sidecar will overwrite this later in the packaging flow."
} else {
  Write-Ok "Tauri sidecar already exists: $ExpectedSidecar"
}

Write-Step "Static file preflight"
$IconPath = Join-Path $SrcTauriDir "icons\icon.ico"
if (-not (Test-Path $IconPath)) {
  Fail "Windows icon missing: $IconPath. Tauri needs icons/icon.ico for Windows packaging."
}
Write-Ok "Windows icon exists: $IconPath"

$TauriConfig = Join-Path $SrcTauriDir "tauri.conf.json"
if (-not (Test-Path $TauriConfig)) {
  Fail "tauri.conf.json missing: $TauriConfig"
}
Write-Ok "Tauri config exists"

$TauriConfigText = Get-Content $TauriConfig -Raw
if ($TauriConfigText -notmatch "msi") {
  Write-Warn "tauri.conf.json does not appear to mention MSI target. MSI may not be produced."
}
if ($TauriConfigText -notmatch "nsis") {
  Write-Warn "tauri.conf.json does not appear to mention NSIS target. setup.exe may not be produced."
}
if (-not $SkipEngineSidecar -and $TauriConfigText -notmatch "externalBin") {
  Write-Warn "tauri.conf.json does not appear to include bundle.externalBin. The packaged app may not start the Python sidecar by itself."
}

if (-not $SkipTests) {
  Write-Step "Running automated test gate"
  Invoke-Checked "pnpm" @("test:engine") $RepoRoot
  Invoke-Checked "pnpm" @("--filter", "@veriframe/ui-angular", "test") $RepoRoot
  Invoke-Checked "pnpm" @("--filter", "@veriframe/desktop-tauri", "check") $RepoRoot
} else {
  Write-Warn "Skipping tests because -SkipTests was provided."
}

if (-not $SkipEngineSidecar) {
  Write-Step "Building Python engine sidecar with PyInstaller"
  $PythonExe = $ResolvedPythonExe
  Write-Ok "Using Python for sidecar build: $PythonExe"

  $BinariesDir = Join-Path $SrcTauriDir "binaries"
  New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null

  $LauncherPath = Join-Path $BuildCache "veriframe_engine_sidecar_launcher.py"
  @'
from __future__ import annotations

import os
import sys
from pathlib import Path


def _bootstrap_source_layout() -> None:
    # Supports dev packaging when run before a wheel/install step.
    candidates = [
        Path.cwd() / "engine" / "veriframe_core",
        Path(__file__).resolve().parents[1] / "engine" / "veriframe_core",
    ]

    for candidate in candidates:
        if candidate.exists():
            sys.path.insert(0, str(candidate))
            return


_bootstrap_source_layout()

from veriframe_core.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
'@ | Set-Content -Path $LauncherPath -Encoding UTF8

  $PythonExe = "python"

  if ($env:CONDA_PREFIX -and (Test-Path (Join-Path $env:CONDA_PREFIX "python.exe"))) {
    $PythonExe = Join-Path $env:CONDA_PREFIX "python.exe"
  }

  Write-Ok "Using Python for sidecar build: $PythonExe"

  $PythonExe = $ResolvedPythonExe
  Write-Ok "Using Python for sidecar build: $PythonExe"
  $PyInstallerAvailable = & $PythonExe -c "import importlib.util; print('yes' if importlib.util.find_spec('PyInstaller') else 'no')"

  if ($PyInstallerAvailable.Trim() -ne "yes") {
    Write-Warn "PyInstaller not found in selected Python environment. Installing it now."
    Invoke-Checked $PythonExe @("-m", "pip", "install", "pyinstaller") $RepoRoot
  } else {
    $PyInstallerVersion = & $PythonExe -m PyInstaller --version
    Write-Ok "PyInstaller available: $PyInstallerVersion"
  }

  $EngineDist = Join-Path $BuildCache "engine-dist"
  $EngineBuild = Join-Path $BuildCache "engine-build"
  $EngineSpec = Join-Path $BuildCache "engine-spec"
  New-Item -ItemType Directory -Force -Path $EngineDist, $EngineBuild, $EngineSpec | Out-Null

  $EnginePackagePath = Join-Path $RepoRoot "engine\veriframe_core"
  $MigrationsPath = Join-Path $RepoRoot "storage\migrations"
  $ModelConfigsPath = Join-Path $RepoRoot "models\configs"
  $ModelCardsPath = Join-Path $RepoRoot "models\model_cards"

  $pyiArgs = @(
    "-m", "PyInstaller",
    "--clean",
    "--noconfirm",
    "--onefile",
    "--console",
    "--name", "veriframe-engine",
    "--distpath", $EngineDist,
    "--workpath", $EngineBuild,
    "--specpath", $EngineSpec,
    "--paths", $EnginePackagePath,
    "--collect-submodules", "veriframe_core",
    "--collect-data", "veriframe_core",
    "--hidden-import", "uvicorn.loops.auto",
    "--hidden-import", "uvicorn.protocols.http.auto",
    "--hidden-import", "uvicorn.protocols.websockets.auto",
    "--hidden-import", "uvicorn.lifespan.on"
  )

  if (Test-Path $MigrationsPath) {
    $pyiArgs += @("--add-data", "$MigrationsPath;storage/migrations")
  }
  if (Test-Path $ModelConfigsPath) {
    $pyiArgs += @("--add-data", "$ModelConfigsPath;models/configs")
  }
  if (Test-Path $ModelCardsPath) {
    $pyiArgs += @("--add-data", "$ModelCardsPath;models/model_cards")
  }

  $pyiArgs += $LauncherPath

  Invoke-Checked $PythonExe $pyiArgs $RepoRoot

  $EngineExe = Join-Path $EngineDist "veriframe-engine.exe"
  if (-not (Test-Path $EngineExe)) {
    Fail "PyInstaller finished but engine exe was not found: $EngineExe"
  }

  $TauriSidecarName = "veriframe-engine-$TargetTriple.exe"
  $TauriSidecarPath = Join-Path $BinariesDir $TauriSidecarName
  Copy-Item $EngineExe $TauriSidecarPath -Force
  Write-Ok "Tauri sidecar copied: $TauriSidecarPath"

  # Also include the raw sidecar in portable folder for debugging/fallback.
  Copy-Item $EngineExe (Join-Path $PortableFolder "veriframe-engine.exe") -Force
} else {
  Write-Warn "Skipping Python engine sidecar. Portable EXE may require separately running pnpm dev:engine."
}

Write-Step "Building Angular production bundle"
Invoke-Checked "pnpm" @("--filter", "@veriframe/ui-angular", "build") $RepoRoot

Write-Step "Building Tauri desktop bundles"
Invoke-Checked "pnpm" @("--filter", "@veriframe/desktop-tauri", "build") $RepoRoot

Write-Step "Collecting artifacts into dist/windows"

$ReleaseExePatterns = @(
  (Join-Path $SrcTauriDir "target\release\veriframe-desktop.exe"),
  (Join-Path $SrcTauriDir "target\release\VeriFrame.exe"),
  (Join-Path $SrcTauriDir "target\release\*.exe")
)

Copy-FirstMatch `
  -Patterns $ReleaseExePatterns `
  -Destination $PortableExe `
  -Label "Raw desktop app EXE" `
  -Required | Out-Null

Copy-Item $PortableExe (Join-Path $PortableFolder "$ProductName.exe") -Force

# Copy sidecar and app resources into portable folder where useful.
$SidecarCandidates = @(
  (Join-Path $SrcTauriDir "binaries\veriframe-engine-$TargetTriple.exe"),
  (Join-Path $BuildCache "engine-dist\veriframe-engine.exe")
)

foreach ($candidate in $SidecarCandidates) {
  if (Test-Path $candidate) {
    $leaf = Split-Path -Leaf $candidate

    Copy-Item $candidate (Join-Path $PortableFolder $leaf) -Force

    $portableBinaries = Join-Path $PortableFolder "binaries"
    $portableResourceBinaries = Join-Path $PortableFolder "resources\binaries"

    New-Item -ItemType Directory -Force -Path $portableBinaries | Out-Null
    New-Item -ItemType Directory -Force -Path $portableResourceBinaries | Out-Null

    Copy-Item $candidate (Join-Path $portableBinaries $leaf) -Force
    Copy-Item $candidate (Join-Path $portableResourceBinaries $leaf) -Force

    # Friendly fallback name for custom launcher/debug paths.
    Copy-Item $candidate (Join-Path $portableBinaries "veriframe-engine.exe") -Force
    Copy-Item $candidate (Join-Path $portableResourceBinaries "veriframe-engine.exe") -Force
  }
}

Copy-DirectoryIfExists (Join-Path $RepoRoot "models\configs") (Join-Path $PortableFolder "resources\models\configs")
Copy-DirectoryIfExists (Join-Path $RepoRoot "models\model_cards") (Join-Path $PortableFolder "resources\models\model_cards")
Copy-DirectoryIfExists (Join-Path $RepoRoot "storage\migrations") (Join-Path $PortableFolder "resources\storage\migrations")
Copy-DirectoryIfExists (Join-Path $RepoRoot "docs") (Join-Path $PortableFolder "resources\docs")

$BundleDir = Join-Path $SrcTauriDir "target\release\bundle"

Copy-FirstMatch `
  -Patterns @(
    (Join-Path $BundleDir "nsis\*.exe"),
    (Join-Path $BundleDir "*.exe")
  ) `
  -Destination $SetupExe `
  -Label "NSIS setup EXE" | Out-Null

Copy-FirstMatch `
  -Patterns @(
    (Join-Path $BundleDir "msi\*.msi"),
    (Join-Path $BundleDir "*.msi")
  ) `
  -Destination $SetupMsi `
  -Label "MSI installer" | Out-Null

Write-Step "Creating portable ZIP"
if (Test-Path $PortableZip) {
  Remove-Item $PortableZip -Force
}
Compress-Archive -Path (Join-Path $PortableFolder "*") -DestinationPath $PortableZip -Force
Write-Ok "Portable ZIP created: $PortableZip"

Write-Step "Generating checksums"
$ChecksumPath = Join-Path $DistWindows "checksums.sha256.txt"
$ArtifactFiles = Get-ChildItem $DistWindows -File |
  Where-Object { $_.Extension -in @(".exe", ".msi", ".zip") } |
  Sort-Object Name

$ChecksumLines = foreach ($file in $ArtifactFiles) {
  $hash = Get-FileHash $file.FullName -Algorithm SHA256
  "$($hash.Hash.ToLower())  $($file.Name)"
}
$ChecksumLines | Set-Content $ChecksumPath -Encoding UTF8
Write-Ok "Checksums written: $ChecksumPath"

Write-Step "Writing release manifest"
$ManifestPath = Join-Path $DistWindows "release-manifest.json"
$Manifest = [ordered]@{
  product = $ProductName
  version = $Version
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  repoRoot = $RepoRoot
  targetTriple = $TargetTriple
  artifacts = @(
    $ArtifactFiles | ForEach-Object {
      [ordered]@{
        name = $_.Name
        path = $_.FullName
        sizeBytes = $_.Length
        sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
      }
    }
  )
}
$Manifest | ConvertTo-Json -Depth 10 | Set-Content $ManifestPath -Encoding UTF8
Write-Ok "Manifest written: $ManifestPath"

Write-Step "Final artifacts"
Get-ChildItem $DistWindows -File | Sort-Object Name | Format-Table Name, Length, LastWriteTime -AutoSize
Write-Host ""
Write-Host "VeriFrame packaging complete." -ForegroundColor Green
Write-Host "Output directory: $DistWindows" -ForegroundColor Green




