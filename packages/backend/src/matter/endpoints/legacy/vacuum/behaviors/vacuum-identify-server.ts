import { VacuumDeviceFeature } from "@home-assistant-matter-hub/common";
import { Logger } from "@matter/general";
import type { Identify } from "@matter/main/clusters";
import { testBit } from "../../../../../utils/test-bit.js";
import { HomeAssistantEntityBehavior } from "../../../../behaviors/home-assistant-entity-behavior.js";
import { IdentifyServer } from "../../../../behaviors/identify-server.js";

const logger = Logger.get("VacuumIdentifyServer");

export class VacuumIdentifyServer extends IdentifyServer {
  override triggerEffect(effect: Identify.TriggerEffectRequest) {
    this.#locate("triggerEffect");
    return super.triggerEffect(effect);
  }

  override identify(request: Identify.IdentifyRequest) {
    if (request.identifyTime > 0) {
      this.#locate("identify");
    }
    return super.identify(request);
  }

  #locate(source: string) {
    const homeAssistant = this.agent.get(HomeAssistantEntityBehavior);
    const features =
      homeAssistant.entity.state.attributes.supported_features ?? 0;
    const hasLocate = testBit(features, VacuumDeviceFeature.LOCATE);
    if (!hasLocate) {
      logger.warn(
        `${source} for ${homeAssistant.entityId} — LOCATE not in supported_features (${features}), calling vacuum.locate anyway`,
      );
    } else {
      logger.info(`${source} → vacuum.locate for ${homeAssistant.entityId}`);
    }
    homeAssistant.callAction({ action: "vacuum.locate" });
  }
}
