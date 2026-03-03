import type { BridgeDataWithMetadata } from "./bridge-data.js";
import type {
  DiagnosticEvent,
  DiagnosticSnapshot,
} from "./diagnostic-event.js";

export type WebSocketMessageType =
  | "bridges_update"
  | "bridge_update"
  | "diagnostic_event"
  | "diagnostic_snapshot"
  | "subscribe_diagnostics"
  | "unsubscribe_diagnostics"
  | "ping"
  | "pong";

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?:
    | BridgeDataWithMetadata
    | BridgeDataWithMetadata[]
    | DiagnosticEvent
    | DiagnosticSnapshot;
  bridgeId?: string;
}
