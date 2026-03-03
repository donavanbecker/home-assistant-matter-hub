import type {
  DiagnosticEvent,
  DiagnosticEventType,
} from "@home-assistant-matter-hub/common";

const MAX_EVENTS = 500;
let eventCounter = 0;

type DiagnosticListener = (event: DiagnosticEvent) => void;

class DiagnosticEventBusImpl {
  private events: DiagnosticEvent[] = [];
  private listeners: Set<DiagnosticListener> = new Set();

  emit(
    type: DiagnosticEventType,
    message: string,
    options?: {
      bridgeId?: string;
      bridgeName?: string;
      entityId?: string;
      details?: Record<string, unknown>;
    },
  ): void {
    const event: DiagnosticEvent = {
      id: `diag_${++eventCounter}`,
      timestamp: Date.now(),
      type,
      message,
      bridgeId: options?.bridgeId,
      bridgeName: options?.bridgeName,
      entityId: options?.entityId,
      details: options?.details,
    };

    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors should not break the event bus
      }
    }
  }

  subscribe(listener: DiagnosticListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecentEvents(limit = 100): DiagnosticEvent[] {
    return this.events.slice(-limit);
  }

  get totalEventCount(): number {
    return eventCounter;
  }
}

export const diagnosticEventBus = new DiagnosticEventBusImpl();
