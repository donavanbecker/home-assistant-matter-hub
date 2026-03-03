import type { HomeAssistantEntityInformation } from "@home-assistant-matter-hub/common";
import {
  RvcRunModeServer as Base,
  ServiceAreaBehavior,
} from "@matter/main/behaviors";
import { ModeBase } from "@matter/main/clusters/mode-base";
import { RvcRunMode } from "@matter/main/clusters/rvc-run-mode";
import { applyPatchState } from "../../utils/apply-patch-state.js";
import { HomeAssistantEntityBehavior } from "./home-assistant-entity-behavior.js";
import type { ValueGetter, ValueSetter } from "./utils/cluster-config.js";

export enum RvcSupportedRunMode {
  Idle = 0,
  Cleaning = 1,
}

export interface RvcRunModeServerConfig {
  getCurrentMode: ValueGetter<RvcSupportedRunMode>;
  getSupportedModes: ValueGetter<RvcRunMode.ModeOption[]>;

  start: ValueSetter<void>;
  returnToBase: ValueSetter<void>;
  pause: ValueSetter<void>;
  /** Optional: Clean a specific room by mode value */
  cleanRoom?: ValueSetter<number>;
}

export interface RvcRunModeServerInitialState {
  supportedModes: RvcRunMode.ModeOption[];
  currentMode: number;
}

/** Base mode value for room-specific cleaning modes */
export const ROOM_MODE_BASE = 100;

/** Check if a mode value represents a room-specific cleaning mode */
export function isRoomMode(mode: number): boolean {
  return mode >= ROOM_MODE_BASE;
}

// biome-ignore lint/correctness/noUnusedVariables: Biome thinks this is unused, but it's used by the function below
class RvcRunModeServerBase extends Base {
  declare state: RvcRunModeServerBase.State;

  override async initialize() {
    // supportedModes and currentMode are set via .set() BEFORE initialize is called
    // This ensures Matter.js has the modes at pairing time
    await super.initialize();
    const homeAssistant = await this.agent.load(HomeAssistantEntityBehavior);
    this.update(homeAssistant.entity);
    if (homeAssistant.state.managedByEndpoint) {
      homeAssistant.registerUpdate(this.callback(this.update));
    } else {
      this.reactTo(homeAssistant.onChange, this.update);
    }
  }

  public update(entity: HomeAssistantEntityInformation) {
    if (!entity.state) {
      return;
    }
    applyPatchState(this.state, {
      currentMode: this.state.config.getCurrentMode(entity.state, this.agent),
      supportedModes: this.state.config.getSupportedModes(
        entity.state,
        this.agent,
      ),
    });
  }

  override changeToMode(
    request: ModeBase.ChangeToModeRequest,
  ): ModeBase.ChangeToModeResponse {
    const homeAssistant = this.agent.get(HomeAssistantEntityBehavior);
    const { newMode } = request;

    // Validate mode exists in supportedModes (matches matter.js base behavior)
    if (
      newMode !== this.state.currentMode &&
      !this.state.supportedModes.some((m) => m.mode === newMode)
    ) {
      return {
        status: ModeBase.ModeChangeStatus.UnsupportedMode,
        statusText: `Unsupported mode: ${newMode}`,
      };
    }

    // Check for room-specific cleaning mode
    if (isRoomMode(newMode)) {
      // When selectedAreas exist (e.g. Apple Home sends selectAreas before
      // changeToMode), prefer area-based cleaning over mode-based room selection.
      try {
        const serviceArea = this.agent.get(ServiceAreaBehavior);
        if (serviceArea.state.selectedAreas?.length > 0) {
          homeAssistant.callAction(this.state.config.start(void 0, this.agent));
          return {
            status: ModeBase.ModeChangeStatus.Success,
            statusText: "Starting room cleaning",
          };
        }
      } catch {
        // ServiceArea not available, fall through to mode-based room cleaning
      }

      if (this.state.config.cleanRoom) {
        homeAssistant.callAction(
          this.state.config.cleanRoom(newMode, this.agent),
        );
        return {
          status: ModeBase.ModeChangeStatus.Success,
          statusText: "Starting room cleaning",
        };
      }
    }

    switch (newMode) {
      case RvcSupportedRunMode.Cleaning:
        homeAssistant.callAction(this.state.config.start(void 0, this.agent));
        break;
      case RvcSupportedRunMode.Idle:
        homeAssistant.callAction(
          this.state.config.returnToBase(void 0, this.agent),
        );
        break;
      default:
        homeAssistant.callAction(this.state.config.pause(void 0, this.agent));
        break;
    }
    return {
      status: ModeBase.ModeChangeStatus.Success,
      statusText: "Successfully switched mode",
    };
  }
}

namespace RvcRunModeServerBase {
  export class State extends Base.State {
    config!: RvcRunModeServerConfig;
  }
}

/**
 * Create an RvcRunMode behavior with initial state.
 * The initialState MUST include supportedModes - Matter.js requires this at pairing time.
 */
export function RvcRunModeServer(
  config: RvcRunModeServerConfig,
  initialState?: RvcRunModeServerInitialState,
) {
  const defaultModes: RvcRunMode.ModeOption[] = [
    {
      label: "Idle",
      mode: RvcSupportedRunMode.Idle,
      modeTags: [{ value: RvcRunMode.ModeTag.Idle }],
    },
    {
      label: "Cleaning",
      mode: RvcSupportedRunMode.Cleaning,
      modeTags: [{ value: RvcRunMode.ModeTag.Cleaning }],
    },
  ];

  return RvcRunModeServerBase.set({
    config,
    supportedModes: initialState?.supportedModes ?? defaultModes,
    currentMode: initialState?.currentMode ?? RvcSupportedRunMode.Idle,
  });
}
