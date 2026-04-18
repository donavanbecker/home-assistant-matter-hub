import request from "supertest";
import express from "express";
import { entityMappingApi } from "../../../api/entity-mapping-api.js";
import { standaloneDeviceApi } from "../../../api/standalone-device-api.js";
import { StandaloneDeviceStorage } from "../storage/standalone-device-storage.js";
import { EntityMappingStorage } from "../storage/entity-mapping-storage.js";

// Mock storage for test isolation
const mappingStorage = new EntityMappingStorage();
const standaloneStorage = new StandaloneDeviceStorage();

const app = express();
app.use(express.json());
app.use("/api/entity-mappings", entityMappingApi(mappingStorage));
app.use("/api/standalone-devices", standaloneDeviceApi(standaloneStorage));

// Example JWT for test (matches dev_secret)
const jwt = require("jsonwebtoken");
const token = jwt.sign({ user: "test" }, "dev_secret", { algorithm: "HS256" });

describe("Standalone Device E2E Integration", () => {
  it("should create, store, and retrieve a standalone device via API", async () => {
    // 1. Create mapping
    const mappingRes = await request(app)
      .put("/api/entity-mappings/test-bridge/test-entity")
      .set("Authorization", `Bearer ${token}`)
      .send({
        matterDeviceType: "on_off_switch",
        customName: "Test Switch",
      });
    expect(mappingRes.status).toBe(200);
    expect(mappingRes.body.entityId).toBe("test-entity");
    expect(mappingRes.body.matterDeviceType).toBe("on_off_switch");

    // 2. Create standalone device
    const deviceRes = await request(app)
      .post("/api/standalone-devices")
      .set("Authorization", `Bearer ${token}`)
      .send({
        bridgeId: "test-bridge",
        entityId: "test-entity",
      });
    expect(deviceRes.status).toBe(201);
    expect(deviceRes.body.entityId).toBe("test-entity");
    expect(deviceRes.body.bridgeId).toBe("test-bridge");

    // 3. Retrieve device
    const getRes = await request(app)
      .get("/api/standalone-devices/test-bridge/test-entity")
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.entityId).toBe("test-entity");
    expect(getRes.body.bridgeId).toBe("test-bridge");
  });

  it("should reject unauthenticated requests to protected endpoints", async () => {
    const res = await request(app)
      .put("/api/entity-mappings/test-bridge/test-entity")
      .send({ matterDeviceType: "on_off_switch" });
    expect(res.status).toBe(401);
  });

  it("should enforce rate limiting", async () => {
    for (let i = 0; i < 30; i++) {
      await request(app)
        .get("/api/entity-mappings/test-bridge/test-entity")
        .set("Authorization", `Bearer ${token}`);
    }
    const res = await request(app)
      .get("/api/entity-mappings/test-bridge/test-entity")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(429);
  });
});
