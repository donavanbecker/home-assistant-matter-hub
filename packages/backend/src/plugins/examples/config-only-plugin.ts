/**
 * Example: Config-Only Plugin
 *
 * This plugin demonstrates how to create a simple plugin that registers
 * a static device with no external dependencies. It's the simplest
 * possible plugin — just a single On/Off light.
 *
 * To use this as a template:
 * 1. Copy this file into a new npm package
 * 2. Change the name, version, and device configuration
 * 3. Export your class as default export
 * 4. Install the package and configure it in HAMH
 */

import type { MatterHubPlugin, PluginContext } from "../types.js";

export class ConfigOnlyPlugin implements MatterHubPlugin {
  readonly name = "config-only-example";
  readonly version = "1.0.0";

  async onStart(context: PluginContext): Promise<void> {
    context.log.info("Config-only plugin starting...");

    // Register a simple On/Off light device
    await context.registerDevice({
      id: "example_light_001",
      name: "Example Light",
      deviceType: "on_off_light",
      clusters: [
        {
          clusterId: "onOff",
          attributes: { onOff: false },
        },
      ],
      // Handle commands from Matter controllers
      async onCommand(clusterId, command, _args) {
        if (clusterId === "onOff") {
          if (command === "on") {
            context.log.info("Light turned ON");
            // Update the device state so controllers see the change
            context.updateDeviceState("example_light_001", "onOff", {
              onOff: true,
            });
          } else if (command === "off") {
            context.log.info("Light turned OFF");
            context.updateDeviceState("example_light_001", "onOff", {
              onOff: false,
            });
          }
        }
      },
    });

    context.log.info("Config-only plugin started with 1 device");
  }
}

export default ConfigOnlyPlugin;
