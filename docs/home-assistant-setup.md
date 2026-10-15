# Home Assistant setup

Everything the keypad depends on that lives **in Home Assistant**, where to find it,
and how it is configured. Nothing here is compiled into the firmware.

| What | Where in Home Assistant | Why |
|---|---|---|
| Mosquitto broker | Settings › Add-ons › Mosquitto broker | Carries Alarmo's MQTT topics |
| Keypad MQTT login | Settings › People › Users › **Alarm Keypad** (`alarm-keypad`) | Broker login used by the keypad |
| Alarmo MQTT | Alarmo › General › **Enable MQTT** › MQTT Configuration | Lets the keypad read state and send commands |
| Alarmo code rules | Alarmo › **Codes** tab | PIN to disarm only |
| Exit / entry delays | Alarmo › General › **Modes** › Armed away | 30 s to leave, 30 s to disarm |
| PINs | Alarmo › Codes › **User management** | The only place PINs exist |
| Keypad settings | Settings › Devices › *(keypad)* › Configuration | MQTT login, topic prefix, Require PIN to Arm, Entry Delay Beep |
| Apple Home helper | Settings › Devices & services › **Helpers** › **Alarm** | No-code alarm panel for the Home app |
| HomeKit Bridge | Settings › Devices & services › HomeKit Bridge › Configure | Shares **Alarm**, not Alarmo |
| Dashboard cards | Overview › Home view | Automate logo card, alarm tile |
| Brand theme | `/config/themes/automate.yaml` + `/config/www/automate/` | Automate look, logo in sidebar, tab icon (see §6) |
| Test sensor (dev only) | Helpers › **Test Door** / `input_boolean.test_door` | Dummy door for testing |

---

## 1. Mosquitto and the keypad login

- **Add-on:** *Mosquitto broker* (`core_mosquitto`), port 1883.
- **Login:** a normal (non-admin), **local-network-only** HA user, username
  `alarm-keypad`. The Mosquitto add-on accepts HA users as broker logins.
- The same username and password are entered on the keypad device (§4).

> The keypad talks plain MQTT on port 1883, so the disarm PIN crosses the LAN
> unencrypted. Keep the keypad and HA on a trusted VLAN.

## 2. Alarmo

### MQTT — *Alarmo › General › Enable MQTT › MQTT Configuration*

| Setting | Value |
|---|---|
| Enabled | on |
| State topic | `alarmo/state` |
| Command topic | `alarmo/command` |
| Event topic | `alarmo/event` |
| Require code | on |
| State / command payloads | leave at defaults (the keypad expects them) |

If Alarmo has more than one area, topics become `alarmo/<area>/…`. Set the keypad's
**Alarmo Topic Prefix** to match (e.g. `alarmo/house`).

### Codes — *Alarmo › Codes tab*

| Setting | Value | Effect |
|---|---|---|
| Require code for disarming | **on** | Turning the alarm off needs a valid PIN |
| Require code for arming | **off** | Arming needs no PIN |
| Require code for switching mode | off | |

The keypad's **Require PIN to Arm** switch (§4) only makes the keypad *ask* for a PIN
before arming. For Alarmo to actually *check* that PIN, turn **Require code for arming** on too.

### Delays — *Alarmo › General › Modes*

| Mode | Exit time (to leave) | Entry time (to disarm) |
|---|---|---|
| Armed away | **30 s** | **30 s** |
| Armed home | none | none |

Change these here; the keypad shows whatever countdown Alarmo sends, no firmware
change needed. A door with an exit delay may be open while arming **Away** (you walk
out through it); in **Home** an open sensor blocks arming ("Close first: …").
The keypad beeps through the whole entry time, so a mode with no entry time goes
straight to the siren without a beep.

### Users — *Alarmo › Codes › User management*

Each person gets an Alarmo user with a PIN and *can arm* / *can disarm* permissions.
PINs are only ever set here — never on the keypad.

## 3. The keypad in Home Assistant

Adopted through the ESPHome integration (Settings › Devices › *Alarm Keypad*).
Entities (prefix `alarm_keypad_`, or whatever you named the device):

| Entity | Type | Purpose |
|---|---|---|
| `text.*_mqtt_broker` | config | Broker host (`homeassistant.local`) |
| `number.*_mqtt_port` | config | `1883` |
| `text.*_mqtt_username` | config | `alarm-keypad` |
| `text.*_mqtt_password` | config | Broker password. Stored on the device only; HA just shows `••••••••`, so it never appears in history or the activity log. To change it, type the new one over the dots |
| `text.*_alarmo_topic_prefix` | config | `alarmo` |
| `switch.*_require_pin_to_arm` | config | Off = Home/Away arm with one tap. Also on the keypad's Settings page |
| `switch.*_entry_delay_beep` | config | On (default) = beep through the keypad's buzzer during the entry delay. Needs the RP2040 buzzer firmware (README › Buzzer) |
| `number.*_pin_length` | config | Digits in your Alarmo PINs (default 4). The PIN pad sends as soon as this many are typed |
| `select.*_screen_rotation` | config | 0° / 90° / 180° / 270°. Also the **Rotate** button on the keypad's Settings page |
| `number.*_screen_timeout`, `*_active_brightness`, `*_idle_brightness` | config | Screen |
| `binary_sensor.*_mqtt_connected` | diagnostic | Keypad ↔ broker link |
| `sensor.*_screen_status` | diagnostic | Mirror of the keypad header, e.g. `Arming Away \| Leave now - 25 s [away]`. Never contains a PIN |
| `button.*_restart`, `*_re_run_onboarding` | | Maintenance |

## 4. Apple Home: "Alarm" helper

**Where:** Settings › Devices & services › **Helpers** › **Alarm**
(type *Template* › *Alarm control panel*, entity `alarm_control_panel.alarm`).

**Why:** the Home app has no way to enter a PIN, and Alarmo requires one to disarm.
This helper mirrors Alarmo and turns its buttons into Alarmo's built-in
*actionable-notification* commands, which Alarmo carries out without a code. No PIN is
stored anywhere, so changing PINs never breaks it.

| Field | Value |
|---|---|
| Name | `Alarm` |
| State template | `{{ states('alarm_control_panel.alarmo') }}` |
| Disarm action | Fire event `mobile_app_notification_action` with data `action: ALARMO_DISARM` |
| Arm away action | Fire event `mobile_app_notification_action` with data `action: ALARMO_ARM_AWAY` |
| Arm home action | Fire event `mobile_app_notification_action` with data `action: ALARMO_ARM_HOME` |
| Code arm required | off |
| Code format | No code |

YAML equivalent (if you ever rebuild it in `configuration.yaml` instead of the UI):

```yaml
template:
  - alarm_control_panel:
      - name: Alarm
        unique_id: alarm_apple_home
        state: "{{ states('alarm_control_panel.alarmo') }}"
        code_arm_required: false
        code_format: no_code
        disarm:
          - event: mobile_app_notification_action
            event_data: {action: ALARMO_DISARM}
        arm_away:
          - event: mobile_app_notification_action
            event_data: {action: ALARMO_ARM_AWAY}
        arm_home:
          - event: mobile_app_notification_action
            event_data: {action: ALARMO_ARM_HOME}
```

**HomeKit Bridge:** shares `alarm_control_panel.alarm`, **not** `alarm_control_panel.alarmo`
(Alarmo needs a PIN the Home app can't send). If you delete the helper, share Alarmo again.

> **Security:** anyone with access to your Apple Home can disarm without a PIN
> (Apple asks for Face ID / passcode first). The same is true of anything in HA that
> fires `mobile_app_notification_action` with `ALARMO_DISARM`. Alarmo logs these as
> disarmed with no user. The keypad still always needs a PIN.

## 5. Dashboard

**Overview › Home** view, first two cards:

- **Alarm** — `alarm-panel` card for `alarm_control_panel.alarmo` (Home / Away).
- **Alarm test** — entities card: Alarmo state, Test Door toggle and sensor, keypad
  MQTT connection, keypad Require PIN to Arm.

## 6. Automate brand theme

Files (copies in this repo's `ha-theme/`):

| On the HA box | From | What it does |
|---|---|---|
| `/config/themes/automate.yaml` | `ha-theme/automate.yaml` | Colours and fonts: near-black surfaces, flat bordered cards, white primary, red armed / amber delay. HA's blue `ha-color-primary-*` scale is mapped to greys |
| `/config/www/automate/automate-brand.js` | `ha-theme/automate-brand.js` | Loads Inter + Space Grotesk, shows the Automate wordmark at the top of the sidebar, sets the tab icon and "Automate" in the tab title |
| `/config/www/automate/*.png` | `ha-theme/*.png` | Logo, padded logo for the dashboard card, tab icons |

`configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
  extra_module_url:
    - /local/automate/automate-brand.js
```

Restart HA once (needed the first time `frontend:` or `www/` is added), then make it
the default for everyone, including wall tablets:

```yaml
action: frontend.set_theme
data: {name: Automate}            # and again with mode: dark
```

**Dashboard logo:** kiosk mode hides the sidebar and header, so customer screens get a
picture card at the top of the dashboard: `image: /local/automate/automate-logo-card.png`.

Notes: HA draws a white icon on the selected button of tile controls, so the
*disarmed* colour is grey (`#5a5a5a`) rather than white. The loading splash
(HA's own logo, shown before the frontend starts) can't be themed. After
updating `automate-brand.js`, browsers may keep the old copy until a hard refresh.

## 7. Test fixtures (remove before going live)

- `input_boolean.test_door` — toggle to "open" the dummy door.
- **Test Door** template helper → `binary_sensor.test_door`
  (`{{ is_state('input_boolean.test_door', 'on') }}`, device class door).
- Added to Alarmo as a door sensor (Away + Home, uses exit and entry delay).
- Alarmo user **Keypad Test**.

To go live: remove the Test Door sensor from Alarmo, delete both helpers and the
Keypad Test user, add your real sensors to Alarmo, and
delete the *Alarm test* dashboard card.

## Troubleshooting

| Keypad shows | Check |
|---|---|
| `Offline \| Set the MQTT login in Home Assistant` | Keypad's MQTT Username is empty |
| `Offline \| Can't reach the MQTT broker` | Broker host/port/password; Mosquitto running; try the HA IP instead of `homeassistant.local` |
| `Waiting... \| No state from Alarmo` | Alarmo › General › MQTT enabled? Arm/disarm once so Alarmo republishes the retained state |
| Commands do nothing | Reload Alarmo (Settings › Devices & services › Alarmo › ⋮ › Reload) — it can lose its MQTT subscription after a broker restart |
| `Wrong PIN` on a correct PIN | The user is disabled or lacks *can disarm* in Alarmo |
