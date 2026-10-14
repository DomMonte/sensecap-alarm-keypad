#!/usr/bin/env bash
# Render every preview scenario to preview/out/<scenario>.png (macOS: needs sips).
set -euo pipefail
cd "$(dirname "$0")"
BIN=.esphome/build/keypad-preview/.pioenvs/keypad-preview/program
[ -x "$BIN" ] || { echo "Build first: esphome compile preview/preview.yaml"; exit 1; }
mkdir -p out
SCENARIOS=${*:-"disarmed blocked arming armed armed_home pending pending_main triggered triggered_main pin wrongpin offline"}
for s in $SCENARIOS; do
  SCENARIO=$s SNAP="out/$s.ppm" "$BIN" >/dev/null 2>&1 &
  pid=$!
  for _ in $(seq 1 50); do kill -0 $pid 2>/dev/null || break; sleep 0.1; done
  kill $pid 2>/dev/null || true
  sips -s format png "out/$s.ppm" --out "out/$s.png" >/dev/null && rm "out/$s.ppm"
  echo "out/$s.png"
done
