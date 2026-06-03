# Fetch the projectM presets-cream-of-the-crop pack and copy subsets into public/vendor/projectm/presets/
# Requires: git
set -e
$repo = 'https://github.com/projectM-visualizer/presets-cream-of-the-crop.git'
$tmp = Join-Path $PSScriptRoot 'tmp-presets'
$dest = Join-Path $PSScriptRoot '..\public\vendor\projectm\presets'
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
Write-Host "Cloning $repo..."
git clone --depth 1 $repo $tmp
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
# Copy top-level directories (subsets) preserving structure
Get-ChildItem -Path $tmp -Directory | ForEach-Object {
    $name = $_.Name
    Write-Host "Copying subset: $name"
    $src = Join-Path $tmp $name
    $tgt = Join-Path $dest $name
    if (Test-Path $tgt) { Remove-Item -Recurse -Force $tgt }
    Copy-Item -Path $src -Destination $tgt -Recurse -Force
}
# Clean tmp
Remove-Item -Recurse -Force $tmp
Write-Host "Copied presets to $dest"
Write-Host "Run: node scripts/generate-preset-manifest.mjs to index presets into manifest.json"