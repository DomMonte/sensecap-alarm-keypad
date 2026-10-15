# Changelog

## 0.1.0 - unreleased
- MQTT Password is masked in HA (kept on the device only), so it no longer shows in history/activity.
- Entry delay beep through the D1's buzzer (constant tone); *Entry Delay Beep*
  setting. Needs the new RP2040 buzzer firmware (`rp2040-buzzer.yaml`).
- Switched to Alarmo's native MQTT (no blueprint); broker login set from HA.
- Home | Away | Off selector; PIN pad always visible; PIN needed only to turn off
  (optional *Require PIN to arm* setting).
- Gear opens Settings on tap; entry countdown names the sensor that opened.
- Screen Status diagnostic sensor.
- Automate Smart Home Studio branding; status ring with countdown; PIN pad only when needed.
- Desktop preview (`preview/`).
- PIN sends as soon as PIN Length digits are typed; Rotate screen setting (90° per tap).
- First version: on-screen Wi-Fi + Home Assistant + Alarmo onboarding, keypad UI,
  Alarmo bridge blueprint, web installer, OTA update entity.
