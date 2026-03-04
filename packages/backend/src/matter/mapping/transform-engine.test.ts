import type { HomeAssistantEntityState } from "@home-assistant-matter-hub/common";
import { describe, expect, it } from "vitest";
import { applyTransform } from "./transform-engine.js";

const makeState = (
  state: string,
  attributes: Record<string, unknown> = {},
): HomeAssistantEntityState =>
  ({
    state,
    attributes,
    last_changed: "",
    last_updated: "",
  }) as HomeAssistantEntityState;

describe("TransformEngine", () => {
  it("equals: matches state", () => {
    const result = applyTransform(makeState("on"), {
      path: "state",
      transform: "equals",
      value: "on",
    });
    expect(result).toBe(true);
  });

  it("equals: does not match state", () => {
    const result = applyTransform(makeState("off"), {
      path: "state",
      transform: "equals",
      value: "on",
    });
    expect(result).toBe(false);
  });

  it("notEquals: matches", () => {
    const result = applyTransform(makeState("on"), {
      path: "state",
      transform: "notEquals",
      value: "off",
    });
    expect(result).toBe(true);
  });

  it("toNumber: converts string to number", () => {
    const result = applyTransform(makeState("42"), {
      path: "state",
      transform: "toNumber",
    });
    expect(result).toBe(42);
  });

  it("toNumber: returns default for NaN", () => {
    const result = applyTransform(makeState("unavailable"), {
      path: "state",
      transform: "toNumber",
      default: -1,
    });
    expect(result).toBe(-1);
  });

  it("scale: scales brightness 0-255 to 0-254", () => {
    const result = applyTransform(makeState("on", { brightness: 128 }), {
      path: "attributes.brightness",
      transform: "scale",
      from: [0, 255],
      to: [0, 254],
    });
    expect(result).toBe(127);
  });

  it("scale: handles edge case 0", () => {
    const result = applyTransform(makeState("on", { brightness: 0 }), {
      path: "attributes.brightness",
      transform: "scale",
      from: [0, 255],
      to: [0, 254],
    });
    expect(result).toBe(0);
  });

  it("clamp: clamps value in range", () => {
    const result = applyTransform(makeState("on", { level: 150 }), {
      path: "attributes.level",
      transform: "clamp",
      to: [0, 100],
    });
    expect(result).toBe(100);
  });

  it("map: maps string values", () => {
    const result = applyTransform(makeState("heating"), {
      path: "state",
      transform: "map",
      map: { heating: 4, cooling: 3, off: 0 },
      default: 0,
    });
    expect(result).toBe(4);
  });

  it("map: returns default for unknown key", () => {
    const result = applyTransform(makeState("unknown_mode"), {
      path: "state",
      transform: "map",
      map: { heating: 4 },
      default: 0,
    });
    expect(result).toBe(0);
  });

  it("raw: returns raw value", () => {
    const result = applyTransform(makeState("on", { custom_attr: "hello" }), {
      path: "attributes.custom_attr",
      transform: "raw",
    });
    expect(result).toBe("hello");
  });

  it("raw: returns default for missing path", () => {
    const result = applyTransform(makeState("on"), {
      path: "attributes.nonexistent",
      transform: "raw",
      default: "fallback",
    });
    expect(result).toBe("fallback");
  });

  it("toBoolean: converts truthy values", () => {
    expect(
      applyTransform(makeState("on", { val: 1 }), {
        path: "attributes.val",
        transform: "toBoolean",
      }),
    ).toBe(true);
    expect(
      applyTransform(makeState("on", { val: 0 }), {
        path: "attributes.val",
        transform: "toBoolean",
      }),
    ).toBe(false);
  });

  it("round: rounds to nearest integer", () => {
    const result = applyTransform(makeState("on", { temp: 21.7 }), {
      path: "attributes.temp",
      transform: "round",
    });
    expect(result).toBe(22);
  });
});
