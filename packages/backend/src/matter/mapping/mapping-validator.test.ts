import { describe, expect, it } from "vitest";
import { validateMapping } from "./mapping-validator.js";

describe("MappingValidator", () => {
  it("should accept a valid mapping", () => {
    const result = validateMapping({
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
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject missing $schema", () => {
    const result = validateMapping({
      domain: "switch",
      matterDeviceType: "on_off_plugin_unit",
      clusters: [{ cluster: "onOff", attributes: [], commands: [] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject wrong $schema version", () => {
    const result = validateMapping({
      $schema: "hamh-mapping-v99",
      domain: "switch",
      matterDeviceType: "on_off_plugin_unit",
      clusters: [{ cluster: "onOff", attributes: [], commands: [] }],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject unknown transform operators", () => {
    const result = validateMapping({
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
                transform: "eval",
                value: "process.exit(1)",
              },
            },
          ],
          commands: [],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transform"))).toBe(true);
  });

  it("should reject empty clusters", () => {
    const result = validateMapping({
      $schema: "hamh-mapping-v1",
      domain: "switch",
      matterDeviceType: "on_off_plugin_unit",
      clusters: [],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject extra properties", () => {
    const result = validateMapping({
      $schema: "hamh-mapping-v1",
      domain: "switch",
      matterDeviceType: "on_off_plugin_unit",
      clusters: [{ cluster: "onOff", attributes: [], commands: [] }],
      dangerousField: true,
    });
    expect(result.valid).toBe(false);
  });

  it("should accept optional when clause", () => {
    const result = validateMapping({
      $schema: "hamh-mapping-v1",
      domain: "sensor",
      matterDeviceType: "temperature_sensor",
      when: {
        deviceClass: "temperature",
        hasAttributes: ["unit_of_measurement"],
      },
      clusters: [
        {
          cluster: "temperatureMeasurement",
          attributes: [
            {
              attribute: "measuredValue",
              stateTransform: { path: "state", transform: "toNumber" },
            },
          ],
          commands: [],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });
});
