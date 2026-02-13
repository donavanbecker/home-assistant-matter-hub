// https://www.home-assistant.io/integrations/event/
export enum EventDeviceClass {
  button = "button",
  doorbell = "doorbell",
  motion = "motion",
}

export interface EventDeviceAttributes {
  device_class?: EventDeviceClass;
  event_types?: string[];
  event_type?: string;
}
