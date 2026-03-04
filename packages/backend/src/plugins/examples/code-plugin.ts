/**
 * Example: Code Plugin with Polling
 *
 * This plugin demonstrates a more advanced pattern:
 * - Discovers devices dynamically
 * - Polls an external source for state changes
 * - Uses persistent storage to cache device list across restarts
 * - Handles commands from Matter controllers
 * - Properly cleans up on shutdown
 *
 * To use this as a template:
 * 1. Copy this file into a new npm package
 * 2. Replace the simulated polling with your actual API calls
 * 3. Export your class as default export
 * 4. Install the package and configure it in HAMH
 */

import type {
  MatterHubPlugin,
  PluginConfigSchema,
  PluginContext,
} from "../types.js";

// Simulated external device state
interface ExternalDeviceState {
  id: string;
  name: string;
  isOn: boolean;
  temperature?: number;
}

export class CodePlugin implements MatterHubPlugin {
  readonly name = "code-plugin-example";
  readonly version = "1.0.0";

  private context?: PluginContext;
  private pollTimer?: ReturnType<typeof setInterval>;
  private devices: ExternalDeviceState[] = [];

  async onStart(context: PluginContext): Promise<void> {
    this.context = context;

    // Restore cached devices from storage for faster startup
    const cached =
      (await context.storage.get<ExternalDeviceState[]>("devices")) ?? [];
    context.log.info(`Restored ${cached.length} cached devices`);

    // Discover devices (simulated — replace with your API call)
    this.devices = await this.discoverDevices();

    // Register discovered devices
    for (const device of this.devices) {
      await context.registerDevice({
        id: device.id,
        name: device.name,
        deviceType: "on_off_light",
        clusters: [
          {
            clusterId: "onOff",
            attributes: { onOff: device.isOn },
          },
        ],
        async onCommand(clusterId, command, _args) {
          if (clusterId === "onOff") {
            context.log.info(`Device ${device.id}: command ${command}`);
            // In a real plugin, send the command to your external API here
            // Then update the device state
            const newState = command === "on";
            context.updateDeviceState(device.id, "onOff", {
              onOff: newState,
            });
          }
        },
      });
    }

    // Start polling for state changes
    const pollInterval =
      ((await context.storage.get<number>("pollInterval")) ?? 30) * 1000;
    this.pollTimer = setInterval(() => this.pollStates(), pollInterval);

    context.log.info(
      `Code plugin started with ${this.devices.length} devices, polling every ${pollInterval / 1000}s`,
    );
  }

  async onConfigure(): Promise<void> {
    // Called after bridge is fully operational
    // Good place to restore persistent attribute values
    this.context?.log.info("Code plugin configured");
  }

  async onShutdown(_reason?: string): Promise<void> {
    // Clean up polling timer
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Cache current device list for faster restart
    if (this.context) {
      await this.context.storage.set("devices", this.devices);
    }
  }

  getConfigSchema(): PluginConfigSchema {
    return {
      title: "Code Plugin Example",
      description: "Example plugin with device discovery and polling",
      properties: {
        apiEndpoint: {
          type: "string",
          title: "API Endpoint",
          description: "URL of your external device API",
          default: "http://localhost:8080",
        },
        pollInterval: {
          type: "number",
          title: "Poll Interval (seconds)",
          description: "How often to check for state changes",
          default: 30,
        },
        apiKey: {
          type: "string",
          title: "API Key",
          description: "Authentication key for your API",
          required: true,
        },
      },
    };
  }

  async onConfigChanged(config: Record<string, unknown>): Promise<void> {
    // User changed config via the UI — update polling interval
    const interval = (config.pollInterval as number) ?? 30;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = setInterval(() => this.pollStates(), interval * 1000);
    this.context?.log.info(`Poll interval updated to ${interval}s`);
  }

  // --- Private methods ---

  private async discoverDevices(): Promise<ExternalDeviceState[]> {
    // SIMULATED: Replace with your actual API discovery call
    // Example: const response = await fetch(`${this.apiEndpoint}/devices`);
    return [
      { id: "ext_light_1", name: "Living Room Light", isOn: false },
      { id: "ext_light_2", name: "Kitchen Light", isOn: true },
    ];
  }

  private pollStates(): void {
    // SIMULATED: Replace with your actual API polling
    // In a real plugin, fetch current state from your external API
    // and call context.updateDeviceState() for any changes.
    //
    // Example:
    // const states = await fetch(`${this.apiEndpoint}/states`);
    // for (const state of states) {
    //   this.context?.updateDeviceState(state.id, "onOff", { onOff: state.isOn });
    // }
  }
}

export default CodePlugin;
