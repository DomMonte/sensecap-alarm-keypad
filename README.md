# SenseCAP Alarm Keypad

Turn a **Seeed SenseCAP Indicator D1** (4" 480×480 touch screen, ESP32-S3) into a wall-mounted keypad for **[Alarmo](https://github.com/nielsfaber/alarmo)** in Home Assistant.

- **Talks to Alarmo over MQTT** using Alarmo's built-in MQTT support. No blueprint or automation needed.
- **Branded for Automate Smart Home Studio:** monochrome, serif headlines, a status ring that fills with the exit/entry countdown.
- **One tap to arm** (Home / Away). The PIN pad only appears when a PIN is needed: to disarm, during the entry delay, or to arm if *Require PIN to arm* is on.
- **PINs only exist in Alarmo.** The keypad forwards what you type; Alarmo checks it, applies user permissions and logs who disarmed.
- **Live status:** Off / Armed / exit countdown / entry countdown with the door that opened / ALARM, plus wrong-PIN and "close first" messages.

> ⚠️ This is a convenience keypad, not a certified security product. If Home Assistant or the MQTT broker is down, the keypad can't arm or disarm. Make sure your sirens and sensors fail safe on their own (e.g. Konnected's standalone alarm logic).

| Ready | Leaving | Armed | Entry delay | PIN pad | Alarm |
|---|---|---|---|---|---|
| ![](docs/screens/disarmed.png) | ![](docs/screens/arming.png) | ![](docs/screens/armed.png) | ![](docs/screens/pending_main.png) | ![](docs/screens/pin.png) | ![](docs/screens/triggered_main.png) |

---

## What you need

| Item | Notes |
|---|---|
| SenseCAP Indicator **D1** | D1S / D1L / D1Pro also work. Their extra sensors are unused. |
| Home Assistant 2024.10+ | With the ESPHome integration |
| [Alarmo](https://github.com/nielsfaber/alarmo) | Installed via HACS and configured with at least one user code |
| 5 V USB-C power at the wall | e.g. a 12 V → 5 V USB-C buck converter fed from the alarm's 12 V aux supply |

## Install

### Option A: Web installer (recommended)

1. Open **https://DomMonte.github.io/sensecap-alarm-keypad/** in Chrome or Edge on a desktop computer.
2. Plug the Indicator in over USB-C and click **Install**.
3. Optionally enter Wi-Fi in the browser after flashing, or skip it and set it up on the screen.

### Option B: ESPHome dashboard

```yaml
# my-keypad.yaml
packages:
  keypad: github://DomMonte/sensecap-alarm-keypad/sensecap-alarm-keypad.yaml@main
```

You can override any `substitutions:` value, e.g. `friendly_name`.

## Home Assistant setup

**See [docs/home-assistant-setup.md](docs/home-assistant-setup.md)** for everything on
the HA side: the Mosquitto login, Alarmo MQTT/code/delay settings, the keypad's
entities, the **Apple Home "Alarm" helper** (Settings › Devices & services ›
Helpers › Alarm), the HomeKit Bridge exclusion, the dashboard cards and the test
fixtures.

## First-time setup (on the screen)

1. **Welcome** → *Get started*
2. **Wi-Fi.** Pick your network and type the password, or use *Set up with my phone instead* (captive portal) or Home Assistant's Improv (Bluetooth) discovery.
3. **Add to Home Assistant.** Accept *New device discovered* in HA.
4. **MQTT login.** In HA open the keypad device › Configuration and fill in MQTT Broker, Port, Username and Password. The keypad moves on once Alarmo's state arrives.
5. **Done.**

## Using the keypad

| Action | How |
|---|---|
| Arm | Tap **Arm Home** or **Arm Away**. With *Require PIN to arm* on, the PIN pad opens first. |
| Disarm / cancel arming | Tap **Disarm** (or **Cancel**), enter your PIN, tap **DISARM** |
| Entry delay / alarm | The PIN pad opens by itself |
| Settings | **Tap** the gear (next to the Wi-Fi icon): brightness, screen timeout, Require PIN to arm, device info, restart, re-run setup |
| Wake screen | Touch anywhere, or press the side button. It also wakes during arming, entry delay and alarm. |
| Factory reset | Hold the side button for 10 seconds |

After 5 wrong PINs the keypad locks itself for 60 seconds.

## How it works

```
 Keypad ── MQTT pub  alarmo/command {"command":"ARM_AWAY|ARM_HOME|DISARM","code":"…"} ──▶ Mosquitto ──▶ Alarmo
 Keypad ◀─ MQTT sub  alarmo/state (retained) + alarmo/event (JSON) ────────────────────── Mosquitto ◀── Alarmo
 Keypad ◀─▶ ESPHome API ◀─▶ HA  (adoption, OTA, settings, MQTT login)
```

The `code` field is only sent when a PIN was typed. Codes are never logged or stored on the device.

## Building from source

```bash
pip install esphome==2026.9.1
esphome run sensecap-alarm-keypad.yaml
```

Packages: `hardware-d1.yaml` (pins), `core.yaml` (network/API/OTA), `alarm.yaml` (keypad logic), `mqtt.yaml` (Alarmo MQTT transport), `theme.yaml` (brand fonts/colours/logo), `ui-main.yaml` (main screen + PIN pad) and `ui.yaml` (onboarding + settings).

### Desktop preview

The main screen can be rendered on a Mac/Linux desktop without the hardware (needs SDL2):

```bash
esphome compile preview/preview.yaml
preview/render.sh          # writes preview/out/<scenario>.png
``` CI builds every push. Publishing a GitHub release deploys the web installer and the OTA manifest to GitHub Pages.

## License

MIT
