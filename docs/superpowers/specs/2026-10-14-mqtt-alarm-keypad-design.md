# SenseCAP Alarm Keypad — MQTT edition: design

**Date:** 2026-10-14 · **Owner:** DomMonte · **Base:** v0.1.0 (Home Assistant event/blueprint design)

## Goal

A wall keypad on the SenseCAP Indicator D1 (ESPHome, LVGL) that controls Alarmo in
Home Assistant over **MQTT**. The keypad has a **Home / Away / Off** mode selector, the
PIN pad is **always on screen**, and **PINs exist only in Alarmo**. The keypad never
stores or validates codes.

Success means you can arm Home or Away and disarm from the keypad with an Alarmo PIN
on the real D1. The screen also has to show the exit and entry countdowns, wrong PINs,
open sensors blocking arming, and the triggered state, all in step with Alarmo.

## Changes from v0.1.0

| v0.1.0 | This design |
|---|---|
| Events out + `text.alarm_sync` in + HA blueprint | Alarmo's native MQTT topics; **no blueprint/automation** |
| Away / Home / Night arm buttons + Disarm button | One **Home \| Away \| Off** segmented selector |
| Onboarding step 3: "Link to Alarmo" (blueprint QR) | Step 3: "Set MQTT login in Home Assistant" |
| Repo / CI / web installer / release | Out of scope for this iteration (files kept, not exercised) |

Kept as-is: the hardware package, Wi-Fi onboarding (on screen, captive portal,
Improv), ESPHome API with auto-provisioned encryption, OTA, screen sleep and wake,
settings page, factory reset, and the 5-wrong-PIN 60 s lockout.

## Architecture

```
SenseCAP D1 (ESPHome)                       Home Assistant
 ├─ ESPHome API  ◀──────────────────────────▶ ESPHome integration
 │    config entities: MQTT Broker/Port/        (adoption, OTA, settings,
 │    Username/Password/Topic prefix            MQTT login entry)
 └─ MQTT client ◀──▶ Mosquitto add-on ◀──▶ Alarmo (MQTT enabled, require code)
      sub  <prefix>/state   (retained)
      sub  <prefix>/event
      pub  <prefix>/command
```

### MQTT contract (from Alarmo `mqtt.py`, main branch)

- **`alarmo/state`** (retained) carries a plain string: `disarmed`, `arming`,
  `armed_home`, `armed_away`, `armed_night`, `armed_vacation`,
  `armed_custom_bypass`, `pending` or `triggered`. The keypad requires Alarmo's
  *state payload* overrides to be left at their defaults.
- **`alarmo/command`**, published by the keypad (not retained):
  `{"command":"ARM_HOME"|"ARM_AWAY"|"DISARM","code":"<pin>"}`.
  Alarmo's *command payload* overrides must also be left at their defaults.
- **`alarmo/event`** (JSON), published by Alarmo:
  - `ARM_AWAY` / `ARM_HOME` … `{delay}`: exit delay in seconds. Starts the local
    countdown.
  - `TRIGGER {delay, sensors[{entity_id,name}]}`: entry delay (state `pending`) or
    triggered. Sets the countdown and the message "Opened: …" or "Triggered by …".
  - `FAILED_TO_ARM {sensors[]}`: message "Close first: <names>".
  - `INVALID_CODE_PROVIDED`: message "Wrong PIN" and counts toward the lockout.
  - `NO_CODE_PROVIDED`: message "Enter PIN first".
  - `COMMAND_NOT_ALLOWED {state, command}`: message "Not allowed now".
- If Alarmo has more than one area, topics become `alarmo/<area>/state`. This version
  supports a **single area** (or the master) only. The topic prefix entity lets you
  point the keypad at an area's topics.
- **Known limitation:** events are broadcast, so with several keypads every keypad
  shows a failure message. That's acceptable for one keypad.

### Device entities (new, in `packages/mqtt.yaml`)

| Entity | Type | Notes |
|---|---|---|
| MQTT Broker | text (config, restore) | default `homeassistant.local` |
| MQTT Port | number (config, restore) | default 1883 |
| MQTT Username | text (config, restore) | MQTT stays **disabled** while this is empty |
| MQTT Password | text, `mode: password` (config, restore) | stored in device flash |
| Alarmo Topic Prefix | text (config, restore) | default `alarmo` |
| MQTT Connected | binary_sensor (diagnostic) | |
| Require PIN to Arm | switch (config, restore, default off) | also on the keypad Settings page |

When any of these changes, the keypad applies the setting to the MQTT client at
runtime (broker, port, credentials, topics) and reconnects. ESPHome MQTT
**discovery is off** and no ESPHome entities are published over MQTT, so the MQTT
connection is used only for Alarmo.

## Keypad UI (480×480, absolute layout)

- **Header (y 0–100):** state title + subline, coloured:
  - Disarmed: green
  - Arming "Leave now – 42 s", Entry "Enter PIN – 25 s": amber
  - Armed Home / Armed Away: red
  - ALARM: red
  - Offline / Waiting: grey
  - The subline shows transient messages for 8 s. Wi-Fi/link icons sit beside the gear; tapping the gear opens Settings (brightness, screen timeout, Require PIN to arm, info, restart/re-run setup).
- **PIN field:** dots, placeholder "Enter PIN".
- **Digit pad:** 1–9, Clear, 0, Backspace (3×4 grid).
- **Mode selector:** three equal segments, **Home | Away | Off**. The segment
  matching the current Alarmo mode is filled (arming or pending counts as the target
  mode, with a pulse or outline). Tapping a segment:
  - **no PIN typed:** Off always asks for a PIN; Home/Away send without a code unless
    the keypad's **Require PIN to Arm** setting is on (default off — Alarmo is set to
    code-to-disarm only, so Alarmo validates the PIN on disarm)
  - **locked out:** "Too many wrong PINs – wait"
  - **MQTT offline:** "Offline"
  - **otherwise:** publish the command, clear the PIN, show "Sending…"
  - Tapping the mode that's already active does nothing, with a message such as
    "Already armed Home".
- **Offline:** if MQTT is disconnected or no retained state has arrived yet, the
  header shows grey "Offline" / "Waiting for Alarmo" and the segments are disabled.

## Onboarding

Welcome → Wi-Fi → Add to Home Assistant → **Set MQTT login** → Done → Keypad.

The *Set MQTT login* page lists the entities to fill in under the device in HA:
Settings › Devices › Alarm Keypad › Configuration. It moves on automatically
once the MQTT connection is up and the first `state` message arrives. A *Skip*
link is also available.

## Error handling

- **MQTT drops:** show Offline and disable the segments. The ESPHome MQTT client
  reconnects automatically.
- **No retained state** (Alarmo MQTT disabled): show "Waiting for Alarmo",
  plus a hint on the subline: "Enable MQTT in Alarmo".
- **Malformed event JSON:** ignore it and log a warning.
- **Codes are never logged.** The command is published from a lambda, and logging is
  at INFO without payloads.

## Home Assistant configuration (test setup)

1. **Mosquitto login (you):** create a dedicated login for the keypad, either an HA
   user or a Mosquitto `logins` entry.
2. **Alarmo user (you):** create an Alarmo user with a PIN.
3. **Enable Alarmo MQTT (me, with your OK):** Alarmo › General › MQTT, enabled,
   *Require code* on, default topics.
4. **Dummy sensor (me, with your OK):**
   - `input_boolean.test_door` plus a template `binary_sensor.test_door`
     (device class door)
   - added to Alarmo as an entry/exit sensor, with modes Home and Away
5. Fill in the keypad's MQTT entities in HA (password typed by you).

## Testing

1. **`esphome config` then `esphome compile`** with ESPHome 2026.9.x, fixing lambda
   errors.
2. **MQTT contract check from the Mac:** `mosquitto_sub -t 'alarmo/#' -v` while
   arming and disarming from HA, to confirm the payloads above.
3. **Flash the D1 over USB** (`esphome run`), then onboard it.
4. **End-to-end on the device:**
   - arm Home, arm Away (60 s countdown), disarm
   - wrong PIN, 5 wrong PINs → lockout
   - Test Door on, then arm → "Close first: Test Door"
   - armed Away, toggle Test Door → entry countdown, then disarm, or let it run out → ALARM
   - stop Mosquitto or change the password → Offline, then recovery
   - reboot → returns to the keypad and the retained state shows immediately

## Out of scope

GitHub repo and CI, web installer, releases, RP2040 buzzer, multi-area selection,
Night/Vacation modes, hidden-SSID entry.
