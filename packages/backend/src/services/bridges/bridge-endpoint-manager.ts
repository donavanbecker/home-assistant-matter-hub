import type {
  EntityMappingConfig,
  FailedEntity,
} from "@home-assistant-matter-hub/common";
import type { Logger } from "@matter/general";
import { Endpoint, type EndpointType } from "@matter/main";
import { Service } from "../../core/ioc/service.js";
import { AggregatorEndpoint } from "../../matter/endpoints/aggregator-endpoint.js";
import { createDomainEndpoint } from "../../matter/endpoints/domains/create-domain-endpoint.js";
import type { EntityEndpoint } from "../../matter/endpoints/entity-endpoint.js";
import { LegacyEndpoint } from "../../matter/endpoints/legacy/legacy-endpoint.js";
import { createPluginEndpointType } from "../../plugins/plugin-device-factory.js";
import type { PluginManager } from "../../plugins/plugin-manager.js";
import type { PluginDevice } from "../../plugins/types.js";
import { isHeapUnderPressure } from "../../utils/log-memory.js";
import { subscribeEntities } from "../home-assistant/api/subscribe-entities.js";
import type { HomeAssistantClient } from "../home-assistant/home-assistant-client.js";
import type { HomeAssistantStates } from "../home-assistant/home-assistant-registry.js";
import type { EntityMappingStorage } from "../storage/entity-mapping-storage.js";
import type { BridgeRegistry } from "./bridge-registry.js";
import { EntityIsolationService } from "./entity-isolation-service.js";

const MAX_ENTITY_ID_LENGTH = 150;

export class BridgeEndpointManager extends Service {
  readonly root: Endpoint;
  private entityIds: string[] = [];
  private unsubscribe?: () => void;
  private _failedEntities: FailedEntity[] = [];
  private readonly mappingFingerprints = new Map<string, string>();
  private readonly pluginEndpoints = new Map<string, Endpoint>();

  get failedEntities(): FailedEntity[] {
    // Combine static failed entities with dynamically isolated entities
    const isolated = EntityIsolationService.getIsolatedEntities(this.bridgeId);
    return [...this._failedEntities, ...isolated];
  }

  constructor(
    private readonly client: HomeAssistantClient,
    private readonly registry: BridgeRegistry,
    private readonly mappingStorage: EntityMappingStorage,
    private readonly bridgeId: string,
    private readonly log: Logger,
    private readonly pluginManager?: PluginManager,
  ) {
    super("BridgeEndpointManager");
    this.root = new AggregatorEndpoint("aggregator");

    // Register callback to isolate problematic entities at runtime
    EntityIsolationService.registerIsolationCallback(
      bridgeId,
      this.isolateEntity.bind(this),
    );

    if (this.pluginManager) {
      this.wirePluginCallbacks();
    }
  }

  /**
   * Isolate an entity by removing it from the aggregator.
   * Called by EntityIsolationService when a runtime error is detected.
   */
  async isolateEntity(entityName: string): Promise<void> {
    const endpoints = this.root.parts.map((p) => p as EntityEndpoint);
    const endpoint = endpoints.find(
      (e) => e.id === entityName || e.entityId === entityName,
    );

    if (endpoint) {
      this.log.warn(
        `Isolating entity ${endpoint.entityId} due to runtime error`,
      );
      try {
        await endpoint.delete();
      } catch (e) {
        this.log.error(`Failed to delete isolated endpoint:`, e);
      }
    }
  }

  private getEntityMapping(entityId: string): EntityMappingConfig | undefined {
    return this.mappingStorage.getMapping(this.bridgeId, entityId);
  }

  private computeMappingFingerprint(
    mapping: EntityMappingConfig | undefined,
  ): string {
    if (!mapping) return "";
    return JSON.stringify(mapping);
  }

  override async dispose(): Promise<void> {
    this.stopObserving();
    EntityIsolationService.unregisterIsolationCallback(this.bridgeId);
    EntityIsolationService.clearIsolatedEntities(this.bridgeId);

    // Delete all endpoints to free memory
    const endpoints = this.root.parts.map((p) => p as EntityEndpoint);
    for (const endpoint of endpoints) {
      try {
        await endpoint.delete();
      } catch (e) {
        this.log.warn(`Failed to delete endpoint during dispose:`, e);
      }
    }
  }

  async startObserving() {
    this.stopObserving();

    if (!this.entityIds.length) {
      return;
    }

    this.unsubscribe = subscribeEntities(
      this.client.connection,
      (e) => this.updateStates(e),
      this.entityIds,
    );
  }

  stopObserving() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  async refreshDevices() {
    this.registry.refresh();
    this._failedEntities = [];

    const endpoints = this.root.parts.map((p) => p as EntityEndpoint);
    this.entityIds = this.registry.entityIds;

    // Pre-calculate composed air purifier sub-entities so they get skipped
    // during individual endpoint creation (requires mapping access).
    if (this.registry.isAutoComposedDevicesEnabled()) {
      for (const eid of this.entityIds) {
        if (!eid.startsWith("fan.")) continue;
        const m = this.getEntityMapping(eid);
        const matterType = m?.matterDeviceType ?? "fan";
        if (matterType !== "air_purifier") continue;
        const ent = this.registry.entity(eid);
        if (!ent?.device_id) continue;
        const tempId = this.registry.findTemperatureEntityForDevice(
          ent.device_id,
        );
        const humId = this.registry.findHumidityEntityForDevice(ent.device_id);
        if (tempId) this.registry.markComposedSubEntityUsed(tempId);
        if (humId) this.registry.markComposedSubEntityUsed(humId);
      }
    }

    const existingEndpoints: EntityEndpoint[] = [];
    for (const endpoint of endpoints) {
      if (!this.entityIds.includes(endpoint.entityId)) {
        try {
          await endpoint.delete();
        } catch (e) {
          this.log.warn(`Failed to delete endpoint ${endpoint.entityId}:`, e);
        }
        this.mappingFingerprints.delete(endpoint.entityId);
      } else {
        // Check if the mapping changed since the endpoint was created.
        // If so, delete the old endpoint so it gets recreated with the new config.
        const currentMapping = this.getEntityMapping(endpoint.entityId);
        const currentFp = this.computeMappingFingerprint(currentMapping);
        const storedFp = this.mappingFingerprints.get(endpoint.entityId) ?? "";
        if (currentFp !== storedFp) {
          this.log.info(
            `Mapping changed for ${endpoint.entityId}, recreating endpoint`,
          );
          try {
            await endpoint.delete();
          } catch (e) {
            this.log.warn(
              `Failed to delete endpoint ${endpoint.entityId} for mapping change:`,
              e,
            );
          }
          this.mappingFingerprints.delete(endpoint.entityId);
        } else {
          existingEndpoints.push(endpoint);
        }
      }
    }

    let memoryLimitReached = false;

    for (const entityId of this.entityIds) {
      // Check heap pressure before creating a new endpoint.
      // matter.js endpoints are memory-heavy (~1-3 MB each), so we stop
      // loading more entities when the heap approaches its limit to
      // prevent OOM crashes. Already-loaded endpoints keep working.
      if (!memoryLimitReached && isHeapUnderPressure()) {
        memoryLimitReached = true;
        this.log.error(
          "Memory pressure detected — skipping remaining entities to prevent OOM crash. " +
            "Reduce the number of entities in this bridge or increase the Node.js heap size (NODE_OPTIONS=--max-old-space-size=1024).",
        );
      }
      if (memoryLimitReached) {
        // Skip existing endpoints that are already loaded
        if (!existingEndpoints.some((e) => e.entityId === entityId)) {
          this._failedEntities.push({
            entityId,
            reason:
              "Skipped due to memory pressure — reduce entities or increase heap size",
          });
        }
        continue;
      }

      const mapping = this.getEntityMapping(entityId);

      if (mapping?.disabled) {
        this.log.debug(`Skipping disabled entity: ${entityId}`);
        continue;
      }

      if (entityId.length > MAX_ENTITY_ID_LENGTH) {
        const reason = `Entity ID too long (${entityId.length} chars, max ${MAX_ENTITY_ID_LENGTH}). This would cause filesystem errors.`;
        this.log.warn(`Skipping entity: ${entityId}. Reason: ${reason}`);
        this._failedEntities.push({ entityId, reason });
        continue;
      }

      let endpoint = existingEndpoints.find((e) => e.entityId === entityId);
      if (!endpoint) {
        try {
          // Vision 1: All known domains use DomainEndpoint.
          // LegacyEndpoint kept as fallback for unknown/future domains only.
          endpoint =
            createDomainEndpoint(this.registry, entityId, mapping) ??
            (await LegacyEndpoint.create(this.registry, entityId, mapping));
        } catch (e) {
          // Handle all endpoint creation errors gracefully to prevent boot crashes
          const reason = this.extractErrorReason(e);
          this.log.warn(`Failed to create device ${entityId}: ${reason}`);
          this._failedEntities.push({ entityId, reason });
          continue;
        }

        if (endpoint) {
          try {
            await this.root.add(endpoint);
            this.mappingFingerprints.set(
              entityId,
              this.computeMappingFingerprint(mapping),
            );
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            // Handle all endpoint initialization errors gracefully
            this.log.warn(
              `Failed to add endpoint for ${entityId}: ${errorMessage}`,
            );
            // Extract detailed behavior error info for debugging
            this.logDetailedError(entityId, e);
            this._failedEntities.push({
              entityId,
              reason: this.extractErrorReason(e),
            });
          }
        }
      }
    }

    if (this.unsubscribe) {
      this.startObserving();
    }
  }

  async updateStates(states: HomeAssistantStates) {
    // Only update HA entity endpoints, not plugin endpoints
    const endpoints = [...this.root.parts]
      .filter((p) => !this.pluginEndpoints.has(p.id))
      .map((p) => p as EntityEndpoint);
    // Process state updates in parallel for faster response times
    // Use allSettled so one failing endpoint doesn't block all others
    const results = await Promise.allSettled(
      endpoints.map((endpoint) => endpoint.updateStates(states)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        this.log.warn("State update failed for endpoint:", result.reason);
      }
    }
  }

  /**
   * Log detailed behavior error information for debugging "Behaviors have errors".
   * Matter.js EndpointBehaviorsError extends AggregateError — the `errors` array
   * contains individual behavior crash errors (one per failed behavior).
   */
  private logDetailedError(entityId: string, error: unknown): void {
    if (!(error instanceof Error)) return;

    // Matter.js EndpointBehaviorsError extends AggregateError
    // The `errors` array contains the actual per-behavior errors
    const errorsArray = (error as Error & { errors?: unknown[] }).errors;
    if (Array.isArray(errorsArray) && errorsArray.length > 0) {
      for (let i = 0; i < errorsArray.length; i++) {
        const subError = errorsArray[i];
        const subMsg =
          subError instanceof Error ? subError.message : String(subError);
        this.log.warn(
          `[${entityId}] Behavior error [${i + 1}/${errorsArray.length}]: ${subMsg}`,
        );

        // Walk the cause chain for each sub-error
        let cause: unknown =
          subError instanceof Error
            ? (subError as Error & { cause?: unknown }).cause
            : undefined;
        while (cause instanceof Error) {
          this.log.warn(`[${entityId}]   Caused by: ${cause.message}`);
          cause = (cause as Error & { cause?: unknown }).cause;
        }

        // Log sub-error stack at debug level
        if (subError instanceof Error && subError.stack) {
          this.log.debug(`[${entityId}] Sub-error stack: ${subError.stack}`);
        }
      }
    } else {
      // Fallback: walk the cause chain of the main error
      let current: unknown = (error as Error & { cause?: unknown }).cause;
      while (current instanceof Error) {
        this.log.warn(`[${entityId}] Caused by: ${current.message}`);
        current = (current as Error & { cause?: unknown }).cause;
      }
    }

    // Always log the main error stack at debug level
    if (error.stack) {
      this.log.debug(`[${entityId}] Full stack: ${error.stack}`);
    }
  }

  private extractErrorReason(error: unknown): string {
    if (error instanceof Error) {
      // Check for nested cause (common in Matter.js errors)
      const cause = (error as Error & { cause?: Error }).cause;
      if (cause?.message) {
        return `${error.message}: ${cause.message}`;
      }
      return error.message;
    }
    return String(error);
  }

  // --- Plugin integration ---

  private wirePluginCallbacks(): void {
    if (!this.pluginManager) return;

    this.pluginManager.onDeviceRegistered = async (
      pluginName: string,
      device: PluginDevice,
    ) => {
      await this.addPluginEndpoint(pluginName, device);
    };

    this.pluginManager.onDeviceUnregistered = async (
      _pluginName: string,
      deviceId: string,
    ) => {
      await this.removePluginEndpoint(deviceId);
    };

    this.pluginManager.onDeviceStateUpdated = (
      _pluginName: string,
      deviceId: string,
      clusterId: string,
      attributes: Record<string, unknown>,
    ) => {
      this.updatePluginEndpointState(deviceId, clusterId, attributes);
    };
  }

  async startPlugins(): Promise<void> {
    if (!this.pluginManager) return;
    await this.pluginManager.startAll();
    await this.pluginManager.configureAll();
  }

  async stopPlugins(): Promise<void> {
    if (!this.pluginManager) return;

    await this.pluginManager.shutdownAll("bridge stopping");

    for (const [id, endpoint] of this.pluginEndpoints) {
      try {
        await endpoint.delete();
      } catch (e) {
        this.log.warn(`Failed to delete plugin endpoint ${id}:`, e);
      }
    }
    this.pluginEndpoints.clear();
  }

  private async addPluginEndpoint(
    pluginName: string,
    device: PluginDevice,
  ): Promise<void> {
    const endpointType = createPluginEndpointType(device.deviceType);
    if (!endpointType) {
      this.log.warn(
        `Plugin "${pluginName}": unsupported device type "${device.deviceType}" for device "${device.id}"`,
      );
      return;
    }

    const endpointId = `plugin_${pluginName}_${device.id}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );

    if (this.pluginEndpoints.has(endpointId)) {
      this.log.warn(
        `Plugin "${pluginName}": device "${device.id}" already registered`,
      );
      return;
    }

    try {
      // createPluginEndpointType returns a MutableEndpoint with .set()
      const mutable = endpointType as EndpointType & {
        set(values: Record<string, unknown>): EndpointType;
      };
      const configured = mutable.set({
        pluginDevice: { device, pluginName },
        basicInformation: {
          nodeLabel: device.name,
          productName: device.name,
          vendorName: pluginName,
          serialNumber: endpointId,
        },
      });

      const endpoint = new Endpoint(configured, { id: endpointId });
      await this.root.add(endpoint);
      this.pluginEndpoints.set(endpointId, endpoint);
      this.log.info(
        `Plugin "${pluginName}": added device "${device.name}" (${device.deviceType})`,
      );
    } catch (e) {
      this.log.error(
        `Plugin "${pluginName}": failed to add device "${device.id}":`,
        e,
      );
    }
  }

  private async removePluginEndpoint(deviceId: string): Promise<void> {
    // Find endpoint by device ID (could be any plugin)
    for (const [endpointId, endpoint] of this.pluginEndpoints) {
      if (endpointId.endsWith(`_${deviceId}`)) {
        try {
          await endpoint.delete();
        } catch (e) {
          this.log.warn(`Failed to delete plugin endpoint ${endpointId}:`, e);
        }
        this.pluginEndpoints.delete(endpointId);
        return;
      }
    }
  }

  private updatePluginEndpointState(
    deviceId: string,
    clusterId: string,
    attributes: Record<string, unknown>,
  ): void {
    // Find endpoint by device ID
    let targetEndpoint: Endpoint | undefined;
    for (const [endpointId, endpoint] of this.pluginEndpoints) {
      if (endpointId.endsWith(`_${deviceId}`)) {
        targetEndpoint = endpoint;
        break;
      }
    }

    if (!targetEndpoint) {
      this.log.warn(
        `Plugin state update: endpoint not found for device "${deviceId}"`,
      );
      return;
    }

    try {
      // Access cluster state via endpoint.state proxy (keyed by behavior ID)
      const state = targetEndpoint.state as Record<
        string,
        Record<string, unknown>
      >;
      const clusterState = state[clusterId];
      if (!clusterState) {
        this.log.warn(
          `Plugin state update: cluster "${clusterId}" not found on endpoint`,
        );
        return;
      }
      for (const [key, value] of Object.entries(attributes)) {
        try {
          clusterState[key] = value;
        } catch (e) {
          this.log.debug(
            `Plugin state update: failed to set ${clusterId}.${key}:`,
            e,
          );
        }
      }
    } catch (e) {
      this.log.warn(`Plugin state update failed for device "${deviceId}":`, e);
    }
  }
}
