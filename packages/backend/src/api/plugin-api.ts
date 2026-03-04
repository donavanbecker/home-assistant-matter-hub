import express from "express";
import { PluginInstaller } from "../plugins/plugin-installer.js";
import { PluginRegistry } from "../plugins/plugin-registry.js";
import type { BridgeService } from "../services/bridges/bridge-service.js";

export function pluginApi(
  bridgeService: BridgeService,
  storageLocation: string,
) {
  const router = express.Router();
  const installer = new PluginInstaller(storageLocation);
  const registry = new PluginRegistry(storageLocation);

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

  /**
   * GET /api/plugins/installed
   * List all installed plugin packages (from registry + npm).
   */
  router.get("/installed", (_req, res) => {
    const registered = registry.getAll();
    const npmInstalled = installer.listInstalled();

    const result = registered.map((entry) => {
      const npm = npmInstalled.find((p) => p.name === entry.packageName);
      return {
        packageName: entry.packageName,
        version: npm?.version ?? "unknown",
        config: entry.config,
        autoLoad: entry.autoLoad,
        installedAt: entry.installedAt,
        path: installer.getPluginPath(entry.packageName),
      };
    });

    res.json(result);
  });

  /**
   * POST /api/plugins/install
   * Install a plugin via npm and register it.
   * Body: { packageName: string, config?: object }
   */
  router.post("/install", async (req, res) => {
    const { packageName, config } = req.body as {
      packageName?: string;
      config?: Record<string, unknown>;
    };

    if (!packageName || typeof packageName !== "string") {
      res.status(400).json({ error: "packageName is required" });
      return;
    }

    try {
      const result = await installer.install(packageName);
      if (!result.success) {
        res.status(500).json({
          error: `Installation failed: ${result.error}`,
          details: result,
        });
        return;
      }

      registry.add(packageName, config ?? {});

      res.json({
        success: true,
        packageName,
        version: result.version,
        message: "Plugin installed. Restart the bridge to load it.",
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Installation failed",
      });
    }
  });

  /**
   * POST /api/plugins/uninstall
   * Uninstall a plugin via npm and remove it from registry.
   * Body: { packageName: string }
   */
  router.post("/uninstall", async (req, res) => {
    const { packageName } = req.body as { packageName?: string };

    if (!packageName || typeof packageName !== "string") {
      res.status(400).json({ error: "packageName is required" });
      return;
    }

    try {
      const result = await installer.uninstall(packageName);
      if (!result.success) {
        res.status(500).json({
          error: `Uninstall failed: ${result.error}`,
          details: result,
        });
        return;
      }

      registry.remove(packageName);

      res.json({
        success: true,
        packageName,
        message: "Plugin uninstalled. Restart the bridge to apply changes.",
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Uninstall failed",
      });
    }
  });

  return router;
}
