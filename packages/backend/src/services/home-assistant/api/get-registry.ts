import type {
  HomeAssistantAreaRegistry,
  HomeAssistantDeviceRegistry,
  HomeAssistantEntityRegistry,
} from "@home-assistant-matter-hub/common";
import type { Connection } from "home-assistant-js-websocket";
import { sendHaMessage } from "../../../utils/send-ha-message.js";

export async function getRegistry(
  connection: Connection,
): Promise<HomeAssistantEntityRegistry[]> {
  return sendHaMessage<HomeAssistantEntityRegistry[]>(connection, {
    type: "config/entity_registry/list",
  });
}

export async function getDeviceRegistry(
  connection: Connection,
): Promise<HomeAssistantDeviceRegistry[]> {
  return sendHaMessage<HomeAssistantDeviceRegistry[]>(connection, {
    type: "config/device_registry/list",
  });
}

export interface HomeAssistantLabel {
  label_id: string;
  name: string;
  icon?: string;
  color?: string;
}

export async function getLabelRegistry(
  connection: Connection,
): Promise<HomeAssistantLabel[]> {
  return sendHaMessage<HomeAssistantLabel[]>(connection, {
    type: "config/label_registry/list",
  });
}

export async function getAreaRegistry(
  connection: Connection,
): Promise<HomeAssistantAreaRegistry[]> {
  return sendHaMessage<HomeAssistantAreaRegistry[]>(connection, {
    type: "config/area_registry/list",
  });
}
