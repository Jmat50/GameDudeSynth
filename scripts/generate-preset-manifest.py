#!/usr/bin/env python3
"""Generate scripts/projectm-preset-manifest.txt from local presets-cream clone."""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CREAM = REPO_ROOT / ".build" / "projectm" / "presets-cream"
OUT = REPO_ROOT / "scripts" / "projectm-preset-manifest.txt"
SKIP_TOP = {"! Transition"}
SKIP_NAME_PARTS = ("transition", "===", "black -", "fade to black", "mashup", "mashpotato")
SKIP_UNLESS_ROYAL_BASELINE = ("$$$ royal", "royal - mashup")
PER_FOLDER = 4
TARGET = 40
MAX_NAME_LEN = 72


def _score_preset(path: str) -> tuple[int, int]:
    """Lower is better: prefer short, simple names."""
    name = Path(path).name.lower()
    penalty = len(name)
    if "nz+" in name or "flexi" in name or "amandio" in name:
        penalty += 40
    if "edit" in name or "roam" in name:
        penalty += 20
    return (penalty, len(path))


def main() -> int:
    if not CREAM.is_dir():
        print(f"Missing cream repo at {CREAM}; run build-projectm-wasm.ps1 once to clone.", file=sys.stderr)
        return 1

    royal = next((p for p in CREAM.rglob("*.milk") if "Royal - Mashup (1)" in p.name), None)
    if not royal:
        print("Could not find $$$ Royal - Mashup (1).milk", file=sys.stderr)
        return 1

    entries: list[str] = [royal.relative_to(CREAM).as_posix().replace("\\", "/")]
    folders = sorted(
        d.name
        for d in CREAM.iterdir()
        if d.is_dir() and d.name not in SKIP_TOP
    )

    for top in folders:
        folder = CREAM / top
        files: list[str] = []
        for p in sorted(folder.rglob("*.milk")):
            name = p.name.lower()
            if len(p.name) > MAX_NAME_LEN:
                continue
            if any(s in name for s in SKIP_NAME_PARTS):
                continue
            if any(s in name for s in SKIP_UNLESS_ROYAL_BASELINE):
                continue
            rel = p.relative_to(CREAM).as_posix().replace("\\", "/")
            if rel in entries:
                continue
            files.append(rel)

        files.sort(key=_score_preset)
        n = PER_FOLDER - 1 if top == "Particles" else PER_FOLDER
        n = min(n, len(files))
        if n <= 0:
            continue
        step = max(1, len(files) // n)
        for i in range(n):
            entries.append(files[(i * step) % len(files)])

    entries = entries[:TARGET]
    lines = [
        "# GameDudeSynth curated projectM presets (paths relative to presets-cream-of-the-crop repo root)",
        "# Regenerate: python scripts/generate-preset-manifest.py",
        "",
    ]
    lines.extend(entries)
    if len(entries) < TARGET:
        print(f"Warning: only {len(entries)} presets selected (target {TARGET})", file=sys.stderr)

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
