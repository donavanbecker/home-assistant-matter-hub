
import {
  createStandaloneDeviceRequestSchema,
  updateStandaloneDeviceRequestSchema,
} from "@home-assistant-matter-hub/common/schemas";
import type {
  CreateStandaloneDeviceRequest,
  UpdateStandaloneDeviceRequest,
  StandaloneDeviceData,
} from "@home-assistant-matter-hub/common/standalone-device-data";
import type { StandaloneDeviceStorage } from "../services/storage/standalone-device-storage.js";

export function standaloneDeviceApi(storage: StandaloneDeviceStorage) {
  return async function (fastify: any) {
    // Create standalone device
    fastify.post<{
      Body: CreateStandaloneDeviceRequest;
      Reply: StandaloneDeviceData | { error: string; validationErrors?: string[] };
    }>("/standalone-devices", {
      schema: { body: createStandaloneDeviceRequestSchema },
      handler: async (request, reply) => {
        // Hardened input validation
        const { name, port, deviceType, entities } = request.body;
        if (!name || typeof name !== "string" || !name.trim()) {
          reply.code(400).send({ error: "Device name is required." });
          return;
        }
        if (!Number.isInteger(port) || port < 1024 || port > 65535) {
          reply.code(400).send({ error: "Port must be an integer between 1024 and 65535." });
          return;
        }
        if (!deviceType || typeof deviceType !== "string") {
          reply.code(400).send({ error: "Device type is required." });
          return;
        }
        if (!Array.isArray(entities) || entities.length === 0) {
          reply.code(400).send({ error: "At least one entity is required." });
          return;
        }
        const entityIdRegex = /^([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)$/;
        const invalidEntities = entities.filter((id) => typeof id !== "string" || !entityIdRegex.test(id));
        if (invalidEntities.length > 0) {
          reply.code(400).send({ error: `Invalid entity ID(s): ${invalidEntities.join(", ")}` });
          return;
        }
        // Sanitize input
        const safeName = name.trim().slice(0, 64);
        const safeEntities = entities.map((id) => id.trim());
        const id = `standalone-${Date.now()}`;
        const data: StandaloneDeviceData = {
          ...request.body,
          name: safeName,
          entities: safeEntities,
          id,
          basicInformation: {
            vendorId: 0,
            vendorName: "",
            productId: 0,
            productName: "",
            productLabel: "",
            hardwareVersion: 1,
            softwareVersion: 1,
          },
        };
        // Validate endpoint type for required clusters
        try {
          const { getDeviceClass } = await import("../services/standalone-devices/standalone-device-manager.js");
          const { validateEndpointType } = await import("../matter/endpoints/validate-endpoint-type.js");
          const DeviceClass = getDeviceClass(data.deviceType);
          const IdentifyServer = (await import("@matter/main/behaviors")).IdentifyServer;
          const Endpoint = (await import("@matter/main")).Endpoint;
          let deviceTypeObj = DeviceClass.with(IdentifyServer);
          const mainEndpoint = new Endpoint(deviceTypeObj, { id: data.id });
          const validation = validateEndpointType(deviceTypeObj, data.id);
          if (validation && validation.missingMandatory.length > 0) {
            reply.code(400).send({
              error: `Device missing mandatory clusters: ${validation.missingMandatory.join(", ")}`,
              validationErrors: validation.missingMandatory,
            });
            return;
          }
        } catch (e) {
          // If validation fails for any reason, allow creation (fail open)
        }
        await storage.add(data);
        reply.code(201).send(data);
      },
    });

    // Update standalone device
    fastify.put<{
      Body: UpdateStandaloneDeviceRequest;
      Params: { id: string };
      Reply: StandaloneDeviceData | { error: string };
    }>("/standalone-devices/:id", {
      schema: { body: updateStandaloneDeviceRequestSchema },
      handler: async (request, reply) => {
        const { id } = request.params;
        const existing = storage.devices.find((d) => d.id === id);
        if (!existing) {
          reply.code(404).send({ error: "Device not found" });
          return;
        }
        const updated: StandaloneDeviceData = {
          ...request.body,
          id,
          basicInformation: existing.basicInformation,
        };
        await storage.update(updated);
        reply.send(updated);
      },
    });

    // Get all standalone devices
    fastify.get("/standalone-devices", async (_request, reply) => {
      reply.send(storage.devices);
    });

    // Get a single standalone device
    fastify.get<{ Params: { id: string } }>("/standalone-devices/:id", async (request, reply) => {
      const device = storage.devices.find((d) => d.id === request.params.id);
      if (!device) {
        reply.code(404).send({ error: "Device not found" });
        return;
      }
      reply.send(device);
    });

    // Delete a standalone device
    fastify.delete<{ Params: { id: string } }>("/standalone-devices/:id", async (request, reply) => {
      const { id } = request.params;
      const existing = storage.devices.find((d) => d.id === id);
      if (!existing) {
        reply.code(404).send({ error: "Device not found" });
        return;
      }
      await storage.remove(id);
      reply.code(204).send();
    });
  };
}
