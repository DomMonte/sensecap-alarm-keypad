# CLAUDE.md - working notes for this repo

ESPHome firmware (SenseCAP Indicator D1 -> Alarmo wall keypad) talking to Alarmo over MQTT.
HA-side setup (Alarmo settings, Apple Home helper, HomeKit, dashboard) is in `docs/home-assistant-setup.md`.

## Commands
- Validate: `esphome config sensecap-alarm-keypad.yaml`
- Build:    `esphome compile sensecap-alarm-keypad.yaml`
- Flash:    `esphome run sensecap-alarm-keypad.yaml --device /dev/cu.usbserial-XXXX` (USB) or `--device <keypad IP>` (OTA)
- Logs:     `esphome logs sensecap-alarm-keypad.yaml`
- ESPHome is pinned to **2026.9.1** (CI + `min_version`). Bump both together.

## Layout
- `sensecap-alarm-keypad.yaml` - entry point, substitutions only
- `packages/hardware-d1.yaml` - pins/display/touch/backlight/button (D1 only)
- `packages/core.yaml` - Wi-Fi provisioning, API, OTA, update entity, globals, settings numbers
- `packages/theme.yaml` - brand (Automate Smart Home Studio): fonts, logo images, colours, styles
- `packages/alarm.yaml` - keypad logic (state/events in, request_mode/send_command out); hardware-free
- `packages/mqtt.yaml` - Alarmo MQTT transport: runtime broker config, subscriptions, send_command
- `packages/ui-main.yaml` - main screen (status ring, Arm Home/Away, Disarm) + PIN pad; hardware-free
- `preview/` - host/SDL build that renders ui-main to PNGs (`preview/render.sh`). Check UI changes here.
- `packages/ui.yaml` - onboarding + settings pages, device scripts (screen power, link status)

## Rules
- Never compile secrets/Wi-Fi/API keys in. The firmware must stay generic.
- The MQTT contract is Alarmo's default topics/payloads (see the spec in
  `docs/superpowers/specs/`). Broker login is set at runtime from HA, never compiled in.
- Anything changed on the HA side must be reflected in `docs/home-assistant-setup.md`.
- Codes are never logged or persisted on the device.
- LVGL widget ids: plain widgets are `lv_obj_t*`; dropdown/roller/page are
  wrappers - use `id(x)->obj`. `App.get_friendly_name()` is a StringRef - use `.str()`.
- Keep the 480x480 layout absolute-positioned; the PIN grid is 3 x 140 px + 12 px gaps.
- Labels showing LVGL symbols (Wi-Fi, gear, ...) must use a `montserrat_*` font; brand fonts have no symbols.
- The PIN pad only appears when a PIN is needed; don't put it back on the main screen.
