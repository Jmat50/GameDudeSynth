#!/usr/bin/env bash
# Build libprojectM + GameDude bridge for the WAV player (Emscripten → WASM).
# Usage (from repo root): ./scripts/build-projectm-wasm.sh

set -euo pipefail

PROJECTM_TAG="${PROJECTM_TAG:-v4.1.6}"
MAX_PRESETS="${MAX_PRESETS:-40}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="$REPO_ROOT/.build/projectm"
EMSDK_ROOT="$BUILD_ROOT/emsdk"
PROJECTM_SRC="$BUILD_ROOT/projectm-src"
PROJECTM_BUILD="$BUILD_ROOT/projectm-build"
PROJECTM_INSTALL="$BUILD_ROOT/projectm-install"
BRIDGE_BUILD="$BUILD_ROOT/bridge-build"
PRESETS_STAGE="$BUILD_ROOT/presets-stage"
OUT_DIR="$REPO_ROOT/public/vendor/projectm"

if [[ ! -f "$EMSDK_ROOT/emsdk_env.sh" ]]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK_ROOT"
  (cd "$EMSDK_ROOT" && ./emsdk install latest && ./emsdk activate latest)
fi
# shellcheck source=/dev/null
source "$EMSDK_ROOT/emsdk_env.sh"

if [[ ! -d "$PROJECTM_SRC/.git" ]]; then
  git clone --depth 1 --branch "$PROJECTM_TAG" https://github.com/projectM-visualizer/projectm.git "$PROJECTM_SRC"
fi
git -C "$PROJECTM_SRC" submodule update --init --recursive

mkdir -p "$PROJECTM_BUILD"
pushd "$PROJECTM_BUILD"
if [[ ! -f CMakeCache.txt ]]; then
  emcmake cmake "$PROJECTM_SRC" \
    -DENABLE_PLAYLIST=OFF \
    -DENABLE_SDL_UI=OFF \
    -DBUILD_TESTING=OFF \
    -DENABLE_INSTALL=ON \
    -DCMAKE_INSTALL_PREFIX="$PROJECTM_INSTALL" \
    -DCMAKE_BUILD_TYPE=Release
fi
emmake cmake --build . --config Release
emmake cmake --install .
popd

mkdir -p "$PRESETS_STAGE/textures"
CREAM_REPO="$BUILD_ROOT/presets-cream"
TEXTURE_REPO="$BUILD_ROOT/presets-textures"
[[ -d "$CREAM_REPO/.git" ]] || git clone --depth 1 https://github.com/projectM-visualizer/presets-cream-of-the-crop.git "$CREAM_REPO"
[[ -d "$TEXTURE_REPO/.git" ]] || git clone --depth 1 https://github.com/projectM-visualizer/presets-milkdrop-texture-pack.git "$TEXTURE_REPO"
find "$TEXTURE_REPO" -type f \( -iname '*.jpg' -o -iname '*.png' -o -iname '*.bmp' \) -exec cp {} "$PRESETS_STAGE/textures/" \; 2>/dev/null || true

MANIFEST_SOURCE="$REPO_ROOT/scripts/projectm-preset-manifest.txt"
MANIFEST="$PRESETS_STAGE/presets.manifest"
if [[ ! -f "$MANIFEST_SOURCE" ]]; then
  echo "Missing curated preset manifest: $MANIFEST_SOURCE" >&2
  exit 1
fi
: >"$MANIFEST"
count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="$(echo "$line" | xargs)"
  [[ -z "$line" ]] && continue
  [[ $count -ge $MAX_PRESETS ]] && break
  src="$CREAM_REPO/$line"
  if [[ ! -f "$src" ]]; then
    echo "Preset not found in cream repo: $line" >&2
    exit 1
  fi
  base="$(basename "$line")"
  dest="preset_$(printf '%03d' "$count")_${base}"
  cp "$src" "$PRESETS_STAGE/$dest"
  echo "/presets/$dest" >>"$MANIFEST"
  count=$((count + 1))
done <"$MANIFEST_SOURCE"
if [[ $count -eq 0 ]]; then
  echo "Curated preset manifest is empty: $MANIFEST_SOURCE" >&2
  exit 1
fi

mkdir -p "$BRIDGE_BUILD"
pushd "$BRIDGE_BUILD"
emcmake cmake "$REPO_ROOT/vendor/projectm-bridge" \
  -DCMAKE_PREFIX_PATH="$PROJECTM_INSTALL" \
  -DprojectM4_DIR="$PROJECTM_INSTALL/lib/cmake/projectM4" \
  -DPRESETS_DIR="$PRESETS_STAGE" \
  -DCMAKE_BUILD_TYPE=Release
emmake cmake --build . --config Release
popd

mkdir -p "$OUT_DIR"
cp "$BRIDGE_BUILD/projectm.js" "$BRIDGE_BUILD/projectm.wasm" "$BRIDGE_BUILD/projectm.data" "$OUT_DIR/"
echo "Built $count presets → $OUT_DIR"
