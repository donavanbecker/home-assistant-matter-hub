import express from "express";
import type { BridgeService } from "../services/bridges/bridge-service.js";

export function pluginApi(bridgeService: BridgeService) {
  const router = express.Router();

  /**
   * GET /api/plugins
   * Returns all plugins across all bridges with metadata, devices, and circuit breaker state.
   */
  router.get("/", (_req, res) => {
    const result: Array<{
      bridgeId: string;
      bridgeName: string;
      plugins: Array<{
        name: string;
        version: string;
        source: string;
        enabled: boolean;
        config: Record<string, unknown>;
        circuitBreaker?: {
          failures: number;
          disabled: boolean;
          lastError?: string;
          disabledAt?: number;
        };
        devices: Array<{
          id: string;
          name: string;
          deviceType: string;
        }>;
      }>;
    }> = [];

    for (const bridge of bridgeService.bridges) {
      const info = bridge.pluginInfo;
      const plugins = info.metadata.map((meta) => ({
        name: meta.name,
        version: meta.version,
        source: meta.source,
        enabled: meta.enabled,
        config: meta.config,
        circuitBreaker: info.circuitBreakers[meta.name],
        devices: info.devices
          .filter((d) => d.pluginName === meta.name)
          .map((d) => ({
            id: d.device.id,
            name: d.device.name,
            deviceType: d.device.deviceType,
          })),
      }));

      result.push({
        bridgeId: bridge.id,
        bridgeName: bridge.data.name,
        plugins,
      });
    }

    res.json(result);
  });

  /**
   * POST /api/plugins/:bridgeId/:pluginName/enable
   */
  router.post("/:bridgeId/:pluginName/enable", (req, res) => {
    const bridge = bridgeService.get(req.params.bridgeId);
    if (!bridge) {
      res.status(404).json({ error: "Bridge not found" });
      return;
    }
    const { pluginName } = req.params;
    bridge.enablePlugin(pluginName);
    res.json({ success: true, pluginName, enabled: true });
  });

  /**
   * POST /api/plugins/:bridgeId/:pluginName/disable
   */
  router.post("/:bridgeId/:pluginName/disable", (req, res) => {
    const bridge = bridgeService.get(req.params.bridgeId);
    if (!bridge) {
      res.status(404).json({ error: "Bridge not found" });
      return;
    }
    const { pluginName } = req.params;
    bridge.disablePlugin(pluginName);
    res.json({ success: true, pluginName, enabled: false });
  });

  /**
   * POST /api/plugins/:bridgeId/:pluginName/reset
   * Reset the circuit breaker for a plugin.
   */
  router.post("/:bridgeId/:pluginName/reset", (req, res) => {
    const bridge = bridgeService.get(req.params.bridgeId);
    if (!bridge) {
      res.status(404).json({ error: "Bridge not found" });
      return;
    }
    const { pluginName } = req.params;
    bridge.resetPlugin(pluginName);
    res.json({ success: true, pluginName, reset: true });
  });

  return router;
}
