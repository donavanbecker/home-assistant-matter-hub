# Plugin Development

Plugins extend Home-Assistant-Matter-Hub (HAMH) with custom device types, cloud integrations, and more. A plugin is an npm package that implements the `MatterHubPlugin` interface and registers Matter devices on a bridge.

## Quick Start

### 1. Create a Plugin Package

```bash
mkdir hamh-plugin-mydevice
cd hamh-plugin-mydevice
npm init -y
```

### 2. Implement the Plugin

Create `index.js` (or `index.ts` if using TypeScript):

```javascript
class MyPlugin {
  name = "hamh-plugin-mydevice";
  version = "1.0.0";

  async onStart(context) {
    await context.registerDevice({
      id: "my_device_001",
      name: "My Custom Device",
      deviceType: "on_off_light",
      clusters: [
        {
          clusterId: "onOff",
          attributes: { onOff: false },
        },
      ],
      async onCommand(clusterId, command) {
        if (clusterId === "onOff") {
          const isOn = command === "on";
          context.log.info(`Device turned ${isOn ? "ON" : "OFF"}`);
          context.updateDeviceState("my_device_001", "onOff", { onOff: isOn });
        }
      },
    });
  }
}

module.exports = MyPlugin;
module.exports.default = MyPlugin;
```

### 3. Install & Configure

```bash
# Install your plugin in HAMH's data directory
npm install /path/to/hamh-plugin-mydevice --prefix /data
```

Configure the plugin in your bridge settings or environment, then restart the bridge.

---

## Plugin Lifecycle

| Method | When Called | Required |
|--------|-----------|----------|
| `onStart(context)` | Bridge starts, before devices are commissioned | Yes |
| `onConfigure()` | After bridge is fully operational | No |
| `onShutdown(reason?)` | Bridge is stopping | No |
| `getConfigSchema()` | UI requests config form | No |
| `onConfigChanged(config)` | User updates config via UI | No |

## Plugin Context API

The `PluginContext` object is passed to `onStart()` and provides:

| Method / Property | Description |
|-------------------|-------------|
| `registerDevice(device)` | Register a Matter device on the bridge |
| `unregisterDevice(deviceId)` | Remove a previously registered device |
| `updateDeviceState(deviceId, clusterId, attributes)` | Update device attributes (pushes to controllers) |
| `storage` | Persistent key-value storage scoped to this plugin |
| `log` | Logger scoped to this plugin |
| `bridgeId` | ID of the bridge this plugin is attached to |

## Supported Device Types

Plugins can register devices with these Matter device types:

| Device Type String | Matter Device |
|-------------------|---------------|
| `on_off_light` | On/Off Light |
| `dimmable_light` | Dimmable Light |
| `on_off_plugin_unit` | On/Off Plug-In Unit (switch) |
| `temperature_sensor` | Temperature Sensor |
| `humidity_sensor` | Humidity Sensor |
| `light_sensor` | Light Sensor |
| `occupancy_sensor` | Occupancy Sensor |
| `contact_sensor` | Contact Sensor |
| `thermostat` | Thermostat |
| `door_lock` | Door Lock |
| `fan` | Fan |

## Persistent Storage

Each plugin gets isolated file-based storage:

```javascript
// Save data
await context.storage.set("myKey", { count: 42 });

// Read data
const data = await context.storage.get("myKey");

// Delete data
await context.storage.delete("myKey");

// List all keys
const keys = await context.storage.keys();
```

Storage is persisted as JSON in the HAMH data directory under `plugins/<bridgeId>/`.

## Fault Isolation

HAMH protects itself from faulty plugins:

- **Timeouts**: All plugin lifecycle calls have a 10-second timeout. If your plugin hangs, it will be terminated.
- **Circuit Breaker**: After 3 consecutive failures, a plugin is automatically disabled. Users can re-enable it from the Plugins page in the UI.
- **Error Logging**: All plugin errors are logged with the plugin name and stack trace (no secrets).

To avoid being disabled:
- Handle errors gracefully in your plugin code
- Don't block the event loop with synchronous operations
- Use `try/catch` around external API calls

## Config Schema (Optional)

Plugins can define a configuration schema for the UI:

```javascript
getConfigSchema() {
  return {
    title: "My Plugin",
    description: "Connect your devices",
    properties: {
      apiKey: {
        type: "string",
        title: "API Key",
        required: true,
      },
      pollInterval: {
        type: "number",
        title: "Poll Interval (seconds)",
        default: 30,
      },
      enableDebug: {
        type: "boolean",
        title: "Enable Debug Logging",
        default: false,
      },
    },
  };
}
```

## Matterbridge Plugin Compatibility

HAMH includes a `MatterbridgePluginAdapter` that can wrap existing Matterbridge DynamicPlatform plugins. This allows migrating plugins from Matterbridge without rewriting them. See `matterbridge-adapter.ts` for details.

## Example Plugins

Two example plugins are included in the HAMH source code:

1. **Config-Only Plugin** (`plugins/examples/config-only-plugin.ts`) — Simplest possible plugin: registers one static device.
2. **Code Plugin** (`plugins/examples/code-plugin.ts`) — Advanced pattern with device discovery, polling, persistent storage, and config schema.

## Managing Plugins

The **Plugins** page in the HAMH web UI shows:
- All installed plugins across all bridges
- Plugin status (Active / Disabled / Circuit Breaker Open)
- Registered devices per plugin
- Enable/Disable/Reset controls

Navigate to **Plugins** (puzzle piece icon) in the top navigation bar.
