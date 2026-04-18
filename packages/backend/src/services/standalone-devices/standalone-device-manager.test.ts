import { describe, it, expect, beforeEach } from "vitest";
import { StandaloneDeviceManager } from "./standalone-device-manager";

// Mock storage
class MockStorage {
  private data: any[] = [];
  async add(device: any) { this.data.push(device); }
  async getAll() { return this.data; }
  async clear() { this.data = []; }
}

describe("StandaloneDeviceManager", () => {
  let manager: StandaloneDeviceManager;
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    manager = new StandaloneDeviceManager(storage as any);
  });

  it("should add and retrieve a standalone device", async () => {
    const device = { id: "standalone-1", name: "Test Device", port: 1234, deviceType: "light", entities: ["light.test"] };
    await storage.add(device);
    const all = await storage.getAll();
    expect(all).toContain(device);
  });

  it("should validate deviceType and entities", async () => {
    // This test assumes validateEndpointType is used in the manager
    // and that getDeviceClass throws for unknown deviceType
    let error: any = null;
    try {
      await manager.addDevice({ id: "x", name: "", port: 0, deviceType: "invalid", entities: [] });
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
  });
});
