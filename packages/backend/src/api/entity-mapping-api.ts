import type { EntityMappingRequest } from "@home-assistant-matter-hub/common";
import express from "express";
import type { EntityMappingStorage } from "../services/storage/entity-mapping-storage.js";

export function entityMappingApi(
  mappingStorage: EntityMappingStorage,
): express.Router {
  const router = express.Router();
    import rateLimit from "express-rate-limit";
    import { expressjwt as jwt } from "express-jwt";

    // JWT authentication middleware (replace secret in production)
    router.use(
      jwt({ secret: process.env.JWT_SECRET || "dev_secret", algorithms: ["HS256"] }).unless({
        path: [
          // Allow GETs without auth for demonstration; lock down in production
          /^\/[^/]+$/,
          /^\/[^/]+\/[^/]+$/,
        ],
      })
    );

    // Rate limiting middleware (per IP)
    router.use(
      rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 30 requests per minute per IP
        standardHeaders: true,
        legacyHeaders: false,
      })
    );

  router.get("/:bridgeId", (req, res) => {
    const { bridgeId } = req.params;
    const mappings = mappingStorage.getMappingsForBridge(bridgeId);
    res.status(200).json({ bridgeId, mappings });
  });

  router.get("/:bridgeId/:entityId", (req, res) => {
    const { bridgeId, entityId } = req.params;
    const mapping = mappingStorage.getMapping(bridgeId, entityId);
    if (mapping) {
      res.status(200).json(mapping);
    } else {
      res.status(404).json({ error: "Mapping not found" });
    }
  });

  router.put("/:bridgeId/:entityId", async (req, res) => {
    const { bridgeId, entityId } = req.params;
    const body = req.body as Partial<EntityMappingRequest>;

    const request: EntityMappingRequest = {
      bridgeId,
      entityId,
      matterDeviceType: body.matterDeviceType,
      customName: body.customName,
      disabled: body.disabled,
      filterLifeEntity: body.filterLifeEntity,
      cleaningModeEntity: body.cleaningModeEntity,
      humidityEntity: body.humidityEntity,
      pressureEntity: body.pressureEntity,
      batteryEntity: body.batteryEntity,
      roomEntities: body.roomEntities,
      disableLockPin: body.disableLockPin,
      powerEntity: body.powerEntity,
      energyEntity: body.energyEntity,
      suctionLevelEntity: body.suctionLevelEntity,
      mopIntensityEntity: body.mopIntensityEntity,
      customServiceAreas: body.customServiceAreas,
      customFanSpeedTags: body.customFanSpeedTags,
    };

    const config = await mappingStorage.setMapping(request);
    res.status(200).json(config);
  });

  router.delete("/:bridgeId/:entityId", async (req, res) => {
    const { bridgeId, entityId } = req.params;
    await mappingStorage.deleteMapping(bridgeId, entityId);
    res.status(204).send();
  });

  router.delete("/:bridgeId", async (req, res) => {
    const { bridgeId } = req.params;
    await mappingStorage.deleteBridgeMappings(bridgeId);
    res.status(204).send();
  });

  return router;
}
