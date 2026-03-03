import type { EndpointType } from "@matter/main";
import { GenericSwitchDevice } from "@matter/main/devices";
import { BasicInformationServer } from "../../../behaviors/basic-information-server.js";
import { HaGenericSwitchServer } from "../../../behaviors/generic-switch-server.js";
import { HomeAssistantEntityBehavior } from "../../../behaviors/home-assistant-entity-behavior.js";
import { IdentifyServer } from "../../../behaviors/identify-server.js";

const EventEndpointType = GenericSwitchDevice.with(
  BasicInformationServer,
  IdentifyServer,
  HomeAssistantEntityBehavior,
  HaGenericSwitchServer,
);

export function EventDevice(
  homeAssistantEntity: HomeAssistantEntityBehavior.State,
): EndpointType {
  return EventEndpointType.set({ homeAssistantEntity });
}
