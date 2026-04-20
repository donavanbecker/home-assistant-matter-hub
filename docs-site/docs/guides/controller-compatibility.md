# Controller Compatibility Matrix

This page documents which Matter device types work with which controllers, based on community testing and the vendors' published Matter device-type lists.

:::info
Compatibility depends on controller firmware versions. This matrix reflects the latest known state. If you find discrepancies, please open an issue.
:::

## Device Type Support

Rows flagged with a footnote number link to the vendor source that establishes the value. Rows without a number are established by community testing or by earlier releases of HAMH.

| HA Domain | Matter Device Type | Apple Home | Google Home | Alexa | SmartThings |
|---|---|:---:|:---:|:---:|:---:|
| `light` | OnOffLight | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `light` | DimmableLight | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `light` | ColorTemperatureLight | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `light` | ExtendedColorLight | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `switch` | OnOffPlugInUnit | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `switch` | DimmablePlugInUnit | ✅ | ✅ | ✅ [²](#sources) | ✅ |
| `lock` | DoorLock | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `cover` | WindowCovering | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `climate` | Thermostat | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `fan` | Fan | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ⚠️ |
| `sensor` | TemperatureSensor | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `sensor` | HumiditySensor | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `sensor` | PressureSensor | ✅ | ✅ [¹](#sources) | ❌ [²](#sources) | ✅ |
| `sensor` | IlluminanceSensor | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `sensor` | FlowSensor | ❓ | ✅ [¹](#sources) | ❌ [²](#sources) | ❓ |
| `sensor` | AirQualitySensor | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ❓ |
| `sensor` | ElectricalSensor | ❓ | ❓ | ❓ | ❓ |
| `binary_sensor` | ContactSensor | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `binary_sensor` | OccupancySensor | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |
| `binary_sensor` | SmokeCoAlarm | ✅ | ✅ | ✅ [²](#sources) | ✅ |
| `binary_sensor` | WaterLeakDetector | ✅ | ✅ | ✅ [²](#sources) | ✅ |
| `binary_sensor` | WaterFreezeDetector | ❓ | ❓ | ❓ | ❓ |
| `media_player` | Speaker | ❓ | ✅ [¹](#sources) | ❌ [²](#sources) | ❓ |
| `media_player` | BasicVideoPlayer | ❓ | ❓ | ❓ | ❓ |
| `valve` | WaterValve | ✅ | ❌ [¹](#sources) | ❌ [²](#sources) | ❓ |
| `vacuum` | RoboticVacuumCleaner | ✅ [³](#sources) | ✅ [¹](#sources) | ✅* [²](#sources) | ❓ |
| `water_heater` | Thermostat | ✅ | ✅ | ✅ | ❓ |
| `alarm_control_panel` | ModeSelect | ❓ | ❓ | ❌** | ❓ |
| `select` | ModeSelect | ❓ | ❓ | ❌** | ❓ |
| `event` | GenericSwitch | ✅ | ❓ | ✅ [²](#sources) | ❓ |
| `humidifier` | Fan | ✅ | ✅ [¹](#sources) | ✅ [²](#sources) | ❓ |
| `dishwasher` (override) | Dishwasher | ❌ [³](#sources) | ✅ [¹](#sources) | ✅ [²](#sources) | ✅ |

### Legend

- ✅ = Confirmed working
- ⚠️ = Partial support or known issues
- ❓ = Untested or unknown
- ❌ = Not supported by the controller

\* Alexa vacuum support requires the `vacuumOnOff` feature flag enabled.

\*\* Alexa does not support the standalone ModeSelect device type (0x0027). The ModeSelect cluster is only recognized on specific device types like Lamp or Fan. See [Alexa Supported Device Categories](https://developer.amazon.com/en-US/docs/alexa/smarthome/supported-matter-device-categories.html) and [#273](https://github.com/RiDDiX/home-assistant-matter-hub/issues/273).

### Sources

Footnote references for the ✅ / ❌ cells above:

1. Google Home — [Supported devices](https://developers.home.google.com/matter/supported-devices) (doc dated 2024-12-20). Rows marked ❌ for Google are device types not listed on that page. The Google doc is roughly 16 months old; a cell not listed may just mean "not yet documented".
2. Amazon Alexa — [Supported Matter Device Categories and Clusters](https://developer.amazon.com/en-US/docs/alexa/smarthome/supported-matter-device-categories.html) (doc dated 2026-04-08). Rows marked ❌ for Alexa are device types absent from that page.
3. Apple Home — [Use Matter accessories with the Home app](https://support.apple.com/en-us/102135) (doc dated 2025-12-12) plus iOS 18.4 release coverage for robot vacuum support. Apple's public doc does not list dishwashers as a supported category.

Apple, Google, Alexa, and SmartThings each move at a different cadence. A ❌ here means the vendor has not published support on their current device-type page — not that the device is known to fail. When a vendor adds the category we flip the cell and cite the update.

## Controller Profiles

HAMH includes built-in controller profiles that pre-configure feature flags for optimal compatibility:

| Profile | Key Settings |
|---|---|
| **Apple Home** | `autoForceSync: true`, `coverUseHomeAssistantPercentage: true` |
| **Google Home** | `autoForceSync: true` |
| **Alexa** | `autoForceSync: true`, `vacuumOnOff: true` |
| **Multi-Controller** | `autoForceSync: true`, `vacuumOnOff: true`, `coverUseHomeAssistantPercentage: true` |

See [Bridge Configuration](../getting-started/bridge-configuration.md) for details on how to select a profile.

## Official Controller Documentation

- **Alexa**: [Matter Support](https://developer.amazon.com/en-US/docs/alexa/smarthome/matter-support.html#device-categories-and-clusters)
- **Google Home**: [Supported Devices](https://developers.home.google.com/matter/supported-devices#device_type_and_control_support)
- **Apple Home**: [Matter Accessories](https://support.apple.com/en-us/102135)
- **SmartThings**: [Supported Device Types](https://developer.smartthings.com/docs/devices/hub-connected/matter/matter-device-types)

## Contributing

If you have tested a device type with a controller not marked above, please open an issue or PR with your findings. Include:
- Controller name and firmware version
- Device type tested
- Whether it works, partially works, or doesn't work
- Any specific issues encountered
