import type {
  DiagnosticBridgeInfo,
  DiagnosticEntityInfo,
  DiagnosticSnapshot,
} from "@home-assistant-matter-hub/common";
import type { BridgeService } from "../bridges/bridge-service.js";
import { diagnosticEventBus } from "./diagnostic-event-bus.js";

export class DiagnosticService {
  private readonly startTime: number;

  constructor(private readonly bridgeService: BridgeService) {
    this.startTime = Date.now();
  }

  getSnapshot(): DiagnosticSnapshot {
    const bridges: DiagnosticBridgeInfo[] = this.bridgeService.bridges.map(
      (bridge) => {
        const data = bridge.data;
        const featureFlags: Record<string, boolean> = {};
        if (data.featureFlags) {
          for (const [key, value] of Object.entries(data.featureFlags)) {
            if (typeof value === "boolean") {
              featureFlags[key] = value;
            }
          }
        }

        const entities: DiagnosticEntityInfo[] = [];
        // Entity info is populated from bridge endpoint data if available
        // For now, provide bridge-level summary
        return {
          bridgeId: data.id,
          bridgeName: data.name,
          status: data.status,
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          entityCount: data.deviceCount,
          sessionCount: data.commissioning?.fabrics?.length ?? 0,
          subscriptionCount: 0,
          featureFlags,
          entities,
        };
      },
    );

    const memUsage = process.memoryUsage();

    return {
      timestamp: Date.now(),
      bridges,
      recentEvents: diagnosticEventBus.getRecentEvents(100),
      system: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        eventCount: diagnosticEventBus.totalEventCount,
      },
    };
  }
}
