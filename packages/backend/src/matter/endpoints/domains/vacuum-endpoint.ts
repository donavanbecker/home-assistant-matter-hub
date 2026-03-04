import type {
  EntityMappingConfig,
  HomeAssistantEntityInformation,
  VacuumDeviceAttributes,
} from "@home-assistant-matter-hub/common";
import { Logger } from "@matter/general";
import type { BridgeRegistry } from "../../../services/bridges/bridge-registry.js";
import type { HomeAssistantEntityBehavior } from "../../behaviors/home-assistant-entity-behavior.js";
import { DomainEndpoint } from "../domain-endpoint.js";
import { supportsCleaningModes } from "../legacy/vacuum/behaviors/vacuum-rvc-clean-mode-server.js";
import { VacuumDevice } from "../legacy/vacuum/index.js";

const logger = Logger.get("VacuumEndpoint");

/**
 * Domain-specific endpoint for vacuum entities.
 *
 * Unlike GenericDomainEndpoint, this properly handles:
 * - Feature flags (vacuumOnOff, vacuumMinimalClusters)
 * - Auto-detection of cleaning mode, suction level, and mop intensity entities
 * - Auto-detection of rooms (Valetudo segments, Roborock rooms)
 * - Cleaning mode option resolution
 */
export class VacuumEndpoint extends DomainEndpoint {
  static async create(
    registry: BridgeRegistry,
    entityId: string,
    mapping?: EntityMappingConfig,
  ): Promise<VacuumEndpoint | undefined> {
    let state = registry.initialState(entityId);
    if (!state) return undefined;

    const entity = registry.entity(entityId);
    const deviceRegistry = registry.deviceOf(entityId);

    let effectiveMapping = mapping;

    // Auto-detect vacuum select entities (cleaning mode, suction, mop intensity)
    if (entity?.device_id) {
      const vacuumEntities = registry.findVacuumSelectEntities(
        entity.device_id,
      );

      if (
        !effectiveMapping?.cleaningModeEntity &&
        vacuumEntities.cleaningModeEntity
      ) {
        effectiveMapping = {
          ...effectiveMapping,
          entityId: effectiveMapping?.entityId ?? entityId,
          cleaningModeEntity: vacuumEntities.cleaningModeEntity,
        };
        logger.debug(
          `Auto-assigned cleaningMode ${vacuumEntities.cleaningModeEntity} to ${entityId}`,
        );
      }
      if (
        !effectiveMapping?.suctionLevelEntity &&
        vacuumEntities.suctionLevelEntity
      ) {
        effectiveMapping = {
          ...effectiveMapping,
          entityId: effectiveMapping?.entityId ?? entityId,
          suctionLevelEntity: vacuumEntities.suctionLevelEntity,
        };
        logger.debug(
          `Auto-assigned suctionLevel ${vacuumEntities.suctionLevelEntity} to ${entityId}`,
        );
      }
      if (
        !effectiveMapping?.mopIntensityEntity &&
        vacuumEntities.mopIntensityEntity
      ) {
        effectiveMapping = {
          ...effectiveMapping,
          entityId: effectiveMapping?.entityId ?? entityId,
          mopIntensityEntity: vacuumEntities.mopIntensityEntity,
        };
        logger.debug(
          `Auto-assigned mopIntensity ${vacuumEntities.mopIntensityEntity} to ${entityId}`,
        );
      }

      // Auto-detect rooms when no rooms in attributes
      const vacAttrs = state.attributes as VacuumDeviceAttributes;
      if (!vacAttrs.rooms && !vacAttrs.segments && !vacAttrs.room_mapping) {
        // Try Valetudo map segments sensor first
        const valetudoRooms = registry.findValetudoMapSegments(
          entity.device_id,
        );
        if (valetudoRooms.length > 0) {
          const roomsObj: Record<string, string> = {};
          for (const r of valetudoRooms) {
            roomsObj[String(r.id)] = r.name;
          }
          state = {
            ...state,
            attributes: {
              ...state.attributes,
              rooms: roomsObj,
            } as typeof state.attributes,
          };
          logger.debug(
            `Auto-detected ${valetudoRooms.length} Valetudo segments for ${entityId}`,
          );
        } else {
          // Try Roborock integration service call
          const roborockRooms = await registry.resolveRoborockRooms(entityId);
          if (roborockRooms.length > 0) {
            const roomsObj: Record<string, string> = {};
            for (const r of roborockRooms) {
              roomsObj[String(r.id)] = r.name;
            }
            state = {
              ...state,
              attributes: {
                ...state.attributes,
                rooms: roomsObj,
              } as typeof state.attributes,
            };
            logger.debug(
              `Auto-detected ${roborockRooms.length} Roborock rooms for ${entityId}`,
            );
          }
        }
      }
    }

    // Resolve cleaning mode options
    let cleaningModeOptions: string[] | undefined;
    if (effectiveMapping?.cleaningModeEntity) {
      const cmState = registry.initialState(
        effectiveMapping.cleaningModeEntity,
      );
      cleaningModeOptions = (
        cmState?.attributes as { options?: string[] } | undefined
      )?.options;
    }
    // Fallback: if no options from entity (unavailable / not loaded),
    // use hardcoded defaults so mop modes are still generated.
    if (
      !cleaningModeOptions &&
      (effectiveMapping?.cleaningModeEntity ||
        supportsCleaningModes(state.attributes as VacuumDeviceAttributes))
    ) {
      cleaningModeOptions = [
        "vacuum",
        "mop",
        "vacuum_and_mop",
        "vacuum_then_mop",
      ];
    }

    const haState: HomeAssistantEntityBehavior.State = {
      entity: {
        entity_id: entityId,
        state,
        registry: entity,
        deviceRegistry,
      },
      customName: effectiveMapping?.customName,
      mapping: effectiveMapping,
      managedByEndpoint: true,
    };

    const type = VacuumDevice(
      haState,
      registry.isVacuumOnOffEnabled(),
      registry.isVacuumMinimalClustersEnabled(),
      cleaningModeOptions,
    );
    if (!type) return undefined;

    return new VacuumEndpoint(type, entityId, registry, effectiveMapping);
  }

  protected updateEntity(_entity: HomeAssistantEntityInformation): void {
    // Vacuum-specific cross-entity updates can be added here.
    // Currently, PowerSourceServer reads battery from EntityStateProvider
    // on every primary entity update via dispatchUpdate().
  }
}
