# Home-Assistant-Matter-Hub

!["Home-Assistant-Matter-Hub"](./assets/hamh-logo-small.png)

---

> **Community Fork** - This is a fork of the original [t0bst4r/home-assistant-matter-hub](https://github.com/t0bst4r/home-assistant-matter-hub), which was discontinued in January 2026. We continue active development with bug fixes, new features, and community support.
>
> We actively work on fixing old issues from the original project and welcome new feature requests. This is a living project maintained by the community!

---

This project simulates bridges to publish your entities from Home Assistant to any Matter-compatible controller like
Alexa, Apple Home or Google Home. Using Matter, those can be connected easily using local communication without the need
of port forwarding etc.

---

## Known issues and limitations

### Device Type Support

This project does not yet support all available device types in the matter specification.
In addition, controllers like Alexa or Google Home do not support all device types, too.

To check which types are supported, please review the
[list of supported device types](./Supported%20Device%20Types.md).

### Alexa

- Alexa cannot pair with a bridge which has too many devices attached. It seems to have a limit of
  about 80-100 devices
- Alexa needs at least one Amazon device which supports Matter to pair with a Matter device.
  If you only have a third party smart speaker which supports Alexa, this isn't enough.

### Google Home

- Google Home needs an actual Google Hub to connect a Matter device. Just using the GH app isn't enough.
- Google Home can deny the Matter device under certain conditions because it is not a certified Matter
  device. You need to follow
  [this guide](https://github.com/project-chip/matter.js/blob/main/docs/ECOSYSTEMS.md#google-home-ecosystem)
  to register your hub.

### Network setup

The Matter protocol is designed to work best with UDP and IPv6 within your local network. At the moment some
manufacturers built their controllers to be compatible with IPv4, too, but this can break at any time with any update.

Many users report connection issues when using VLANs or firewalls, where HAMH and the assistant devices (Alexa, Google
Home, ...) are not placed in the same network segment. Please make sure to review the
[common connectivity issues](./Guides/Connectivity%20Issues.md).

## What's New

<details>
<summary><strong>📦 Stable (v2.0.26) - Current</strong></summary>

**New in v2.0.26:**

| Feature | Description |
|---------|-------------|
| **🔐 Authentication UI** | Configure authentication credentials from the web UI Settings page ([#197](https://github.com/RiDDiX/home-assistant-matter-hub/issues/197)) |
| **🔌 Select Entity Support** | `select` and `input_select` entities mapped to Matter ModeSelectDevice |
| **🔗 Webhook Event Bridge** | `hamh_action` events on the HA event bus for controller command automations |
| **🔍 Cluster Diagnostics** | Expandable per-cluster state inspection on device cards |
| **🤖 Vacuum Cleaning Mode Fallback** | "Vacuum Then Mop" falls back to "Vacuum & Mop" when entity lacks dedicated option ([#189](https://github.com/RiDDiX/home-assistant-matter-hub/issues/189)) |
| **🤖 Vacuum Entity Filter Fix** | Server-mode bridge entity filter changes now update correctly ([#202](https://github.com/RiDDiX/home-assistant-matter-hub/issues/202)) |
| **� Matter.js 0.16.10** | Updated for stability and spec compliance |
| **🐳 Docker Node 22** | Fixes `ERR_INVALID_PACKAGE_CONFIG` ([#200](https://github.com/RiDDiX/home-assistant-matter-hub/issues/200)) |

**Previously in v2.0.25:**

| Feature | Description |
|---------|-------------|
| **� Vacuum Mop Intensity** | `mopIntensityEntity` mapping adds mop intensity modes to Apple Home extra features |
| **🤖 Vacuum Auto-Detection** | Cleaning mode, suction level, and mop intensity entities auto-detected |
| **🤖 Roborock Room Auto-Detect** | Rooms resolved via `roborock.get_maps` — no manual button mapping needed |
| **� Live Entity Mapping** | Device type changes take effect automatically ([#192](https://github.com/RiDDiX/home-assistant-matter-hub/issues/192)) |
| **� Dynamic Heap Sizing** | Node.js heap from system RAM (25%, 256–1024 MB) ([#190](https://github.com/RiDDiX/home-assistant-matter-hub/issues/190)) |

</details>

<details>
<summary><strong>🧪 Alpha (v2.1.0-alpha.x)</strong></summary>

Alpha is currently in sync with Stable (v2.0.26). All alpha features have been promoted to stable. New alpha features will appear here as development continues.

</details>

<details>
<summary><strong>� Previous Versions</strong></summary>

### v2.0.17–v2.0.23
Thermostat overhaul, Lock Unlatch, Vacuum Server Mode, Bridge Templates, Live Filter Preview, Entity Diagnostics, Multi-Bridge Bulk Operations, Power & Energy Measurement, Event domain, Network Map, Mobile UI

### v2.0.16
Force Sync, Lock PIN, Cover/Blinds improvements, Roborock Rooms, Auto Entity Grouping, Water Heater, Vacuum Server Mode, OOM fix

### v1.9.0
Custom bridge icons, Basic Video Player, Alexa deduplication, Health Check API, WebSocket, Full backup/restore

### v1.8.x
Graceful crash handler, PM2.5/PM10 sensors, Water Valve, Smoke/CO Detector, Pressure/Flow sensors

### v1.5.x
Health Monitoring, Bridge Wizard, AirQuality sensors, Fan control, Media playback

</details>

## Getting started

To get things up and running, please follow the [installation guide](./Getting%20Started/Installation.md).

## Additional Resources

If you need more assistance on the topic, please have a look at the following external resources:

### Videos

#### YouTube-Video on "HA Matter HUB/BRIDGE 😲 👉 Das ändert alles für ALEXA und GOOGLE Nutzer" (🇩🇪)

[![HA Matter HUB/BRIDGE 😲 👉 Das ändert alles für ALEXA und GOOGLE Nutzer](https://img.youtube.com/vi/yOkPzEzuVhM/mqdefault.jpg)](https://www.youtube.com/watch?v=yOkPzEzuVhM)

#### YouTube-Video on "Alexa et Google Home dans Home Assistant GRATUITEMENT grâce à Matter" (🇫🇷)

[![Alexa et Google Home dans Home Assistant GRATUITEMENT grâce à Matter](https://img.youtube.com/vi/-TMzuHFo_-g/mqdefault.jpg)](https://www.youtube.com/watch?v=-TMzuHFo_-g)

## Support the Project

> **This is completely optional!** The project will continue regardless of donations.
> I maintain this in my free time because I believe in open source and helping the community.

If you find this project useful and want to support its development, consider buying me a coffee! ☕

[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?logo=paypal)](https://www.paypal.me/RiDDiX93)

Maintaining this project takes time and effort - from fixing bugs, adding new features, to helping users in issues.
Your support is appreciated but never expected. Thank you for using Home-Assistant-Matter-Hub! ❤️
