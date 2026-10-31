#!/bin/sh
set -e
G="/Users/oyster/Library/CloudStorage/OneDrive-개인/Documents/interest/gense/GAME/haiyuki_win_kr"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
cp "$G/haiyuki.wlk" "$G/haiyuki.mlk" "$TMP/"
python3 -m compilegfx.cli batch "$G/graph" "$HERE/../extracted/assets/graph"
PYTHONPATH=/Users/oyster/GitHub/compile-audio/src python3 -m compileaudio.cli extract "$TMP" "$HERE/../extracted/assets/audio"
rm -r "$TMP"
