import type { DeviceMapping } from "./mapping-schema.js";

/**
 * Built-in device mappings for simple HA domains.
 * These replace hardcoded TypeScript device factories for trivial domains
 * and serve as examples of the data-driven mapping format.
 *
 * Complex domains (vacuum, climate, media_player, air_purifier) still use
 * typed DomainEndpoint subclasses because their logic cannot be expressed
 * in a constrained mapping DSL.
 */
export const builtinMappings: DeviceMapping[] = [
  // --- switch ---
  {
    $schema: "hamh-mapping-v1",
    domain: "switch",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: {
              path: "state",
              transform: "notEquals",
              value: "off",
            },
          },
        ],
        commands: [
          { command: "on", action: "homeassistant.turn_on" },
          { command: "off", action: "homeassistant.turn_off" },
        ],
      },
    ],
  },

  // --- button ---
  {
    $schema: "hamh-mapping-v1",
    domain: "button",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: { path: "state", transform: "equals", value: "on" },
          },
        ],
        commands: [{ command: "on", action: "button.press" }],
      },
    ],
  },

  // --- input_button ---
  {
    $schema: "hamh-mapping-v1",
    domain: "input_button",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: { path: "state", transform: "equals", value: "on" },
          },
        ],
        commands: [{ command: "on", action: "input_button.press" }],
      },
    ],
  },

  // --- scene ---
  {
    $schema: "hamh-mapping-v1",
    domain: "scene",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: { path: "state", transform: "equals", value: "on" },
          },
        ],
        commands: [{ command: "on", action: "scene.turn_on" }],
      },
    ],
  },

  // --- script ---
  {
    $schema: "hamh-mapping-v1",
    domain: "script",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: {
              path: "state",
              transform: "notEquals",
              value: "off",
            },
          },
        ],
        commands: [
          { command: "on", action: "script.turn_on" },
          { command: "off", action: "script.turn_off" },
        ],
      },
    ],
  },

  // --- automation ---
  {
    $schema: "hamh-mapping-v1",
    domain: "automation",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: {
              path: "state",
              transform: "notEquals",
              value: "off",
            },
          },
        ],
        commands: [
          { command: "on", action: "automation.turn_on" },
          { command: "off", action: "automation.turn_off" },
        ],
      },
    ],
  },

  // --- input_boolean ---
  {
    $schema: "hamh-mapping-v1",
    domain: "input_boolean",
    matterDeviceType: "on_off_plugin_unit",
    clusters: [
      {
        cluster: "onOff",
        attributes: [
          {
            attribute: "onOff",
            stateTransform: {
              path: "state",
              transform: "notEquals",
              value: "off",
            },
          },
        ],
        commands: [
          { command: "on", action: "input_boolean.turn_on" },
          { command: "off", action: "input_boolean.turn_off" },
        ],
      },
    ],
  },
];
