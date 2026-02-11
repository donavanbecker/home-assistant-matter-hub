import { Behavior, EventEmitter } from "@matter/main";
import type { PluginDevice } from "./types.js";

/**
 * Behavior attached to plugin-provided endpoints.
 * Holds the plugin device reference and dispatches state updates
 * from the plugin to the Matter endpoint.
 */
export class PluginDeviceBehavior extends Behavior {
  static override readonly id = "pluginDevice";
  declare state: PluginDeviceBehavior.State;
  declare events: PluginDeviceBehavior.Events;

  get device(): PluginDevice {
    return this.state.device;
  }

  get pluginName(): string {
    return this.state.pluginName;
  }
}

export namespace PluginDeviceBehavior {
  export class State {
    device!: PluginDevice;
    pluginName!: string;
  }

  export class Events extends EventEmitter {
    // Future: add events for device state changes
  }
}
