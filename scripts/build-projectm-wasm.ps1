# Build libprojectM + GameDude bridge for the WAV player (Emscripten → WASM).
# Requires: git, cmake, Python 3, and enough disk space (~2 GB for emsdk + build).
#
# Usage (from repo root):
#   .\scripts\build-projectm-wasm.ps1
#   .\scripts\build-projectm-wasm.ps1 -SkipEmsdkInstall   # if emsdk already activated

param(
    [string]$ProjectMTag = "v4.1.6",
    [int]$MaxPresets = 40,
    [switch]$SkipEmsdkInstall
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null }
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BuildRoot = Join-Path $RepoRoot ".build\projectm"
Ensure-Dir $BuildRoot
$EmsdkRoot = Join-Path $BuildRoot "emsdk"
$ProjectMSrc = Join-Path $BuildRoot "projectm-src"
$BridgeBuild = Join-Path $BuildRoot "bridge-build"
$PresetsStage = Join-Path $BuildRoot "presets-stage"
$OutDir = Join-Path $RepoRoot "public\vendor\projectm"

function Invoke-GitClone([string]$Url, [string]$Dest, [string]$Branch = "") {
    if (Test-Path (Join-Path $Dest ".git")) {
        Write-Host "Already cloned: $Dest"
        return
    }
    Ensure-Dir (Split-Path $Dest -Parent)
    if ($Branch) {
        git clone --depth 1 --branch $Branch $Url $Dest
    } else {
        git clone --depth 1 $Url $Dest
    }
}

Write-Host "=== GameDudeSynth projectM WASM build ==="

# 1. Emscripten SDK
if (-not $SkipEmsdkInstall) {
    if (-not (Test-Path $EmsdkRoot)) {
        Write-Host "Cloning emsdk..."
        Invoke-GitClone "https://github.com/emscripten-core/emsdk.git" $EmsdkRoot
    }
    Push-Location $EmsdkRoot
    Write-Host "Installing/activating Emscripten (this may take several minutes)..."
    & .\emsdk install latest
    & .\emsdk activate latest
    Pop-Location
}

$EmsdkEnv = Join-Path $EmsdkRoot "emsdk_env.ps1"
if (-not (Test-Path $EmsdkEnv)) {
    throw "emsdk_env.ps1 not found at $EmsdkEnv - run without -SkipEmsdkInstall first."
}
. $EmsdkEnv

$emccPath = Get-Command emcc -ErrorAction SilentlyContinue
if (-not $emccPath) { throw "emcc not on PATH after emsdk activation." }
Write-Host "Using emcc: $($emccPath.Source)"

# 2. libprojectM source
Invoke-GitClone "https://github.com/projectM-visualizer/projectm.git" $ProjectMSrc $ProjectMTag

Write-Host "Initializing libprojectM submodules..."
Push-Location $ProjectMSrc
git submodule update --init --recursive
Pop-Location

$ProjectMBuild = Join-Path $BuildRoot "projectm-build"
$ProjectMInstall = Join-Path $BuildRoot "projectm-install"
Ensure-Dir $ProjectMBuild
Push-Location $ProjectMBuild
if (-not (Test-Path "CMakeCache.txt")) {
    Write-Host "Configuring libprojectM..."
    emcmake cmake $ProjectMSrc `
        -DENABLE_PLAYLIST=OFF `
        -DENABLE_SDL_UI=OFF `
        -DBUILD_TESTING=OFF `
        -DENABLE_INSTALL=ON `
        -DCMAKE_INSTALL_PREFIX="$ProjectMInstall" `
        -DCMAKE_BUILD_TYPE=Release
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "libprojectM cmake configure failed." }
}
Write-Host "Building libprojectM..."
emmake cmake --build . --config Release
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "libprojectM build failed." }
emmake cmake --install .
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "libprojectM install failed." }
Pop-Location

# 3. Stage presets (cream-of-the-crop subset + textures)
Ensure-Dir $PresetsStage
$TexturesDir = Join-Path $PresetsStage "textures"
Ensure-Dir $TexturesDir

$CreamRepo = Join-Path $BuildRoot "presets-cream"
Invoke-GitClone "https://github.com/projectM-visualizer/presets-cream-of-the-crop.git" $CreamRepo

$TextureRepo = Join-Path $BuildRoot "presets-textures"
Invoke-GitClone "https://github.com/projectM-visualizer/presets-milkdrop-texture-pack.git" $TextureRepo

Get-ChildItem -Path $TextureRepo -Recurse -Include *.jpg,*.png,*.bmp -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName -Destination $TexturesDir -Force -ErrorAction SilentlyContinue }

$manifestSource = Join-Path $RepoRoot "scripts\projectm-preset-manifest.txt"
if (-not (Test-Path $manifestSource)) {
    throw "Missing curated preset manifest: $manifestSource (run: python scripts/generate-preset-manifest.py)"
}

$manifestPath = Join-Path $PresetsStage "presets.manifest"
$manifestLines = @()
$count = 0
Get-Content $manifestSource | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    if ($count -ge $MaxPresets) { return }
    $src = Join-Path $CreamRepo ($line -replace '/', '\')
    if (-not (Test-Path -LiteralPath $src)) {
        throw "Preset not found in cream repo: $line"
    }
    $baseName = [System.IO.Path]::GetFileName($src)
    $destName = "preset_{0:D3}_{1}" -f $count, $baseName
    Copy-Item -LiteralPath $src -Destination (Join-Path $PresetsStage $destName) -Force
    $manifestLines += "/presets/$destName"
    $count++
}
if ($count -eq 0) {
    throw "Curated preset manifest is empty: $manifestSource"
}
# UTF-8 without BOM so Emscripten manifest parsing does not treat header lines as presets.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($manifestPath, $manifestLines, $utf8NoBom)
Write-Host "Staged $count curated presets + textures"

# 4. Bridge
Ensure-Dir $BridgeBuild
Push-Location $BridgeBuild
$BridgeSrc = Join-Path $RepoRoot "vendor\projectm-bridge"
if (Test-Path "CMakeCache.txt") {
    Remove-Item "CMakeCache.txt" -Force
}
if (Test-Path "CMakeFiles") {
    Remove-Item "CMakeFiles" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Configuring bridge..."
$ProjectM4Dir = Join-Path $ProjectMInstall "lib\cmake\projectM4"
emcmake cmake $BridgeSrc `
    -DCMAKE_PREFIX_PATH="$ProjectMInstall" `
    -DprojectM4_DIR="$ProjectM4Dir" `
    -DPRESETS_DIR="$PresetsStage" `
    -DCMAKE_BUILD_TYPE=Release
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Bridge cmake configure failed." }
Write-Host "Building bridge..."
emmake cmake --build . --config Release
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Bridge build failed." }
Pop-Location

# 5. Copy artifacts
Ensure-Dir $OutDir
$artifacts = @("projectm.js", "projectm.wasm", "projectm.data")
foreach ($name in $artifacts) {
    $src = Join-Path $BridgeBuild $name
    if (-not (Test-Path $src)) {
        throw "Missing build artifact: $src"
    }
    Copy-Item $src -Destination (Join-Path $OutDir $name) -Force
}

$readme = @"
# projectM WASM (GameDudeSynth)

Built: $(Get-Date -Format o)
libprojectM: $ProjectMTag
Presets: $count from presets-cream-of-the-crop (max $MaxPresets)

## Licenses

- [libprojectM](https://github.com/projectM-visualizer/projectm) (LGPL-2.1+)
- [presets-cream-of-the-crop](https://github.com/projectM-visualizer/presets-cream-of-the-crop)
- [Milkdrop texture pack](https://github.com/projectM-visualizer/presets-milkdrop-texture-pack)
- Bridge source: vendor/projectm-bridge/

Rebuild: .\scripts\build-projectm-wasm.ps1 from repo root (requires Emscripten).
"@
Set-Content -Path (Join-Path $OutDir "README.md") -Value $readme -Encoding utf8

Write-Host "Done. Artifacts in $OutDir"
