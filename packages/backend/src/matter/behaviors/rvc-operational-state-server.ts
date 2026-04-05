import type { HomeAssistantEntityInformation } from "@home-assistant-matter-hub/common";
import { Logger } from "@matter/general";
import { RvcOperationalStateServer as Base } from "@matter/main/behaviors/rvc-operational-state";
import { RvcOperationalState } from "@matter/main/clusters/rvc-operational-state";
import { applyPatchState } from "../../utils/apply-patch-state.js";
import { HomeAssistantEntityBehavior } from "./home-assistant-entity-behavior.js";
import type { ValueGetter, ValueSetter } from "./utils/cluster-config.js";

import OperationalState = RvcOperationalState.OperationalState;
import ErrorState = RvcOperationalState.ErrorState;

const logger = Logger.get("RvcOperationalStateServer");

// States that indicate the vacuum is actively performing work
const activeStates = new Set([
  OperationalState.Running,
  OperationalState.SeekingCharger,
]);

// Operational states to advertise in operationalStateList.
// Only include the well-established states from the base OperationalState
// cluster (0-3) and the core RVC-specific states (64-66).
// Matter 1.4 added new states (EmptyingDustBin=67, CleaningMop=68,
// FillingWaterTank=69, UpdatingMaps=70) but controllers like Alexa
// (Matter 1.3) may not handle them and could reject the device.
const advertisedOperationalStates: number[] = [
  OperationalState.Stopped,
  OperationalState.Running,
  OperationalState.Paused,
  OperationalState.Error,
  OperationalState.SeekingCharger,
  OperationalState.Charging,
  OperationalState.Docked,
];

export interface RvcOperationalStateServerConfig {
  getOperationalState: ValueGetter<OperationalState>;
  pause: ValueSetter<void>;
  resume: ValueSetter<void>;
  goHome?: ValueSetter<void>;
}

// biome-ignore lint/correctness/noUnusedVariables: Biome thinks this is unused, but it's used by the function below
class RvcOperationalStateServerBase extends Base {
  declare state: RvcOperationalStateServerBase.State;

  /**
   * Alternating nonce that forces a structural difference in operationalError
   * on every update call.  matter.js's Datasource uses isDeepEqual to detect
   * attribute changes — writing the same value is silently ignored, so no
   * subscription report is generated.  By toggling errorStateDetails between
   * absent and "" (an optional, semantically meaningless field when
   * errorStateId is NoError), we guarantee the struct is never deep-equal to
   * its predecessor, which makes matter.js emit attrsChanged and produce a
   * subscription report.
   *
   * This works around a matter.js 0.16.x bug where the subscription
   * heartbeat timer (sendInterval) fails to fire for certain sessions,
   * causing Apple Home (iOS via Apple TV proxy) to show "Updating...".
   */
  private keepaliveNonce = false;

  override async initialize() {
    // Set initial operationalStateList BEFORE super.initialize().
    // Use the explicit list of well-known states to avoid advertising
    // Matter 1.4 states that older controllers may not understand.
    this.state.operationalStateList = advertisedOperationalStates.map((id) => ({
      operationalStateId: id,
    }));
    this.state.operationalState = OperationalState.Stopped;
    this.state.operationalError = { errorStateId: ErrorState.NoError };

    await super.initialize();
    const homeAssistant = await this.agent.load(HomeAssistantEntityBehavior);

    // #287 diag[3/3]: confirm matter.js Datasource actually registers a
    // structural change for operationalError when the keepalive nonce
    // toggles. If this never fires, the nonce is being deep-equaled
    // away and no subscription report leaves the server. Remove once
    // root cause is known.
    try {
      const events = this.events as unknown as {
        operationalError$Changed?: { on: (cb: () => void) => void };
      };
      events.operationalError$Changed?.on(() => {
        logger.info(
          `#287 diag[3]: operationalError$Changed fired for ${homeAssistant.entityId}`,
        );
      });
    } catch (e) {
      logger.warn(
        `#287 diag[3]: failed to attach operationalError$Changed listener: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    this.update(homeAssistant.entity);
    this.reactTo(homeAssistant.onChange, this.update);
  }

  private update(entity: HomeAssistantEntityInformation) {
    if (!entity.state) {
      return;
    }
    const newState = this.state.config.getOperationalState(
      entity.state,
      this.agent,
    );
    const previousState = this.state.operationalState;

    // #287 diag[2/3]: confirm the update() reactor is being invoked
    // as a consequence of the keepalive tick (or any other source).
    // Remove once root cause is known.
    logger.info(
      `#287 diag[2]: update() reactor invoked for ${entity.entity_id} — ` +
        `prevState=${previousState} newState=${newState} nonceBefore=${this.keepaliveNonce}`,
    );

    // Toggle nonce so operationalError is structurally different each call.
    this.keepaliveNonce = !this.keepaliveNonce;
    const errorStateId =
      newState === OperationalState.Error
        ? ErrorState.Stuck
        : ErrorState.NoError;
    const operationalError: {
      errorStateId: number;
      errorStateDetails?: string;
    } = { errorStateId };
    if (this.keepaliveNonce) {
      operationalError.errorStateDetails = "";
    }

    applyPatchState(
      this.state,
      {
        operationalState: newState,
        operationalError,
      },
      { force: true },
    );

    // Emit OperationCompletion event when transitioning from an active state
    // (Running, SeekingCharger) to an inactive state (Docked, Stopped, Paused).
    // This is MANDATORY for the RoboticVacuumCleaner device type.
    if (
      activeStates.has(previousState as OperationalState) &&
      !activeStates.has(newState)
    ) {
      logger.info(
        `Operation completed: ${OperationalState[previousState]} -> ${OperationalState[newState]}`,
      );
      try {
        this.events.operationCompletion?.emit(
          {
            completionErrorCode:
              newState === OperationalState.Error
                ? ErrorState.Stuck
                : ErrorState.NoError,
            totalOperationalTime: null,
            pausedTime: null,
          },
          this.context,
        );
      } catch (e) {
        logger.debug("Failed to emit operationCompletion event:", e);
      }
    }
  }

  override pause(): RvcOperationalState.OperationalCommandResponse {
    const homeAssistant = this.agent.get(HomeAssistantEntityBehavior);
    homeAssistant.callAction(this.state.config.pause(void 0, this.agent));
    return {
      commandResponseState: {
        errorStateId: ErrorState.NoError,
      },
    };
  }

  override resume(): RvcOperationalState.OperationalCommandResponse {
    const homeAssistant = this.agent.get(HomeAssistantEntityBehavior);
    homeAssistant.callAction(this.state.config.resume(void 0, this.agent));
    return {
      commandResponseState: {
        errorStateId: ErrorState.NoError,
      },
    };
  }

  override goHome(): RvcOperationalState.OperationalCommandResponse {
    // Already docked or charging - command is valid but no-op
    if (
      this.state.operationalState === OperationalState.Docked ||
      this.state.operationalState === OperationalState.Charging
    ) {
      return {
        commandResponseState: {
          errorStateId: ErrorState.NoError,
        },
      };
    }

    const goHomeAction = this.state.config.goHome;
    if (goHomeAction) {
      const homeAssistant = this.agent.get(HomeAssistantEntityBehavior);
      homeAssistant.callAction(goHomeAction(void 0, this.agent));
    } else {
      logger.warn("GoHome command received but no goHome action configured");
    }

    return {
      commandResponseState: {
        errorStateId: ErrorState.NoError,
      },
    };
  }
}

namespace RvcOperationalStateServerBase {
  export class State extends Base.State {
    config!: RvcOperationalStateServerConfig;
  }
}

export function RvcOperationalStateServer(
  config: RvcOperationalStateServerConfig,
) {
  return RvcOperationalStateServerBase.set({ config });
}
