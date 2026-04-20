import type { HomeAssistantEntityState } from "@home-assistant-matter-hub/common";
import { WindowCovering } from "@matter/main/clusters";
import { describe, expect, it } from "vitest";
import {
  DEVICE_CLASS_TO_MATTER_TYPE,
  deviceClassMapping,
} from "./cover-window-covering-server.js";

const entity = (device_class?: unknown): HomeAssistantEntityState =>
  ({
    entity_id: "cover.test",
    state: "open",
    context: { id: "ctx" },
    last_changed: "t",
    last_updated: "t",
    attributes: device_class === undefined ? {} : { device_class },
  }) as unknown as HomeAssistantEntityState;

describe("deviceClassMapping", () => {
  it("maps curtain to Drapery + CentralCurtain", () => {
    const mapping = deviceClassMapping(entity("curtain"));
    expect(mapping?.type).toBe(WindowCovering.WindowCoveringType.Drapery);
    expect(mapping?.endProductType).toBe(
      WindowCovering.EndProductType.CentralCurtain,
    );
  });

  it("maps shutter to Shutter + RollerShutter", () => {
    const mapping = deviceClassMapping(entity("shutter"));
    expect(mapping?.type).toBe(WindowCovering.WindowCoveringType.Shutter);
    expect(mapping?.endProductType).toBe(
      WindowCovering.EndProductType.RollerShutter,
    );
  });

  it("maps awning to Awning + AwningTerracePatio", () => {
    const mapping = deviceClassMapping(entity("awning"));
    expect(mapping?.type).toBe(WindowCovering.WindowCoveringType.Awning);
    expect(mapping?.endProductType).toBe(
      WindowCovering.EndProductType.AwningTerracePatio,
    );
  });

  it("is case-insensitive", () => {
    expect(deviceClassMapping(entity("Curtain"))?.type).toBe(
      WindowCovering.WindowCoveringType.Drapery,
    );
  });

  it("returns undefined for missing device_class", () => {
    expect(deviceClassMapping(entity())).toBeUndefined();
  });

  it("returns undefined for unknown device_class", () => {
    expect(deviceClassMapping(entity("spaceship"))).toBeUndefined();
  });

  it("returns undefined for non-string device_class", () => {
    expect(deviceClassMapping(entity(42))).toBeUndefined();
  });

  it("covers every documented key", () => {
    expect(Object.keys(DEVICE_CLASS_TO_MATTER_TYPE).sort()).toEqual([
      "awning",
      "blind",
      "curtain",
      "shade",
      "shutter",
    ]);
  });
});
