import { Logger } from "@matter/general";
import type { EndpointType } from "@matter/main";
import {
  ContactSensorDevice,
  DimmableLightDevice,
  DoorLockDevice,
  FanDevice,
  HumiditySensorDevice,
  LightSensorDevice,
  OccupancySensorDevice,
  OnOffLightDevice,
  OnOffPlugInUnitDevice,
  TemperatureSensorDevice,
  ThermostatDevice,
} from "@matter/main/devices";
import { BasicInformationServer } from "../matter/behaviors/basic-information-server.js";
import { IdentifyServer } from "../matter/behaviors/identify-server.js";
import { PluginDeviceBehavior } from "./plugin-behavior.js";

const logger = Logger.get("PluginDeviceFactory");

/**
 * Maps plugin device type strings to Matter.js EndpointTypes.
 *
 * Each device type gets IdentifyServer, BasicInformationServer, and
 * PluginDeviceBehavior attached. The plugin's command/attribute callbacks
 * are invoked via PluginDeviceBehavior when controllers interact.
 */
const deviceTypeMap: Record<string, () => EndpointType> = {
  on_off_light: () =>
    OnOffLightDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  dimmable_light: () =>
    DimmableLightDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  on_off_plugin_unit: () =>
    OnOffPlugInUnitDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  temperature_sensor: () =>
    TemperatureSensorDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  humidity_sensor: () =>
    HumiditySensorDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  light_sensor: () =>
    LightSensorDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  occupancy_sensor: () =>
    OccupancySensorDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  contact_sensor: () =>
    ContactSensorDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  thermostat: () =>
    ThermostatDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  door_lock: () =>
    DoorLockDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
  fan: () =>
    FanDevice.with(
      IdentifyServer,
      BasicInformationServer,
      PluginDeviceBehavior,
    ),
};

/**
 * Create a Matter.js EndpointType for a plugin device type string.
 * Returns undefined if the device type is not supported.
 */
export function createPluginEndpointType(
  deviceType: string,
): EndpointType | undefined {
  const factory = deviceTypeMap[deviceType];
  if (!factory) {
    logger.warn(`Unsupported plugin device type: "${deviceType}"`);
    return undefined;
  }
  return factory();
}

/**
 * Get all supported plugin device type strings.
 */
export function getSupportedPluginDeviceTypes(): string[] {
  return Object.keys(deviceTypeMap);
}
