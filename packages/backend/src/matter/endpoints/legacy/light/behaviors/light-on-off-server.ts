import { consumePendingColorStaging } from "../../../../behaviors/color-control-server.js";
import { HomeAssistantEntityBehavior } from "../../../../behaviors/home-assistant-entity-behavior.js";
import { OnOffServer } from "../../../../behaviors/on-off-server.js";

export const LightOnOffServer = OnOffServer({
  turnOn: (_value, agent) => {
    const entityId = agent.get(HomeAssistantEntityBehavior).entityId;
    const staged = consumePendingColorStaging(entityId);
    return {
      action: "light.turn_on",
      data: staged,
    };
  },
  turnOff: () => ({
    action: "homeassistant.turn_off",
  }),
  isOn: (e) => e.state === "on",
}).with("Lighting");
