import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntityIsolationService } from "./entity-isolation-service.js";

const BRIDGE_ID = "ed5b4f8d042e4599b833f21da4ededba";
const ENTITY_NAME = "Küchenlicht";

function makeError(pattern: string): Error {
  return new Error(
    `${BRIDGE_ID}.aggregator.${ENTITY_NAME}.onOff.on: ${pattern}`,
  );
}

describe("EntityIsolationService", () => {
  beforeEach(() => {
    EntityIsolationService.clearIsolatedEntities(BRIDGE_ID);
  });

  describe("parseEndpointPath", () => {
    it("should parse aggregator path from error message", () => {
      const result = EntityIsolationService.parseEndpointPath(
        `${BRIDGE_ID}.aggregator.${ENTITY_NAME}.onOff.on`,
      );
      expect(result).toEqual({
        bridgeId: BRIDGE_ID,
        entityName: ENTITY_NAME,
      });
    });

    it("should return null for messages without aggregator path", () => {
      expect(
        EntityIsolationService.parseEndpointPath("some random error"),
      ).toBeNull();
    });
  });

  describe("isolateFromError", () => {
    it("should isolate on Invalid intervalMs", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      const result = await EntityIsolationService.isolateFromError(
        makeError("Invalid intervalMs"),
      );

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith(ENTITY_NAME);

      const isolated = EntityIsolationService.getIsolatedEntities(BRIDGE_ID);
      expect(isolated).toHaveLength(1);
      expect(isolated[0].reason).toContain("Subscription timing error");

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should isolate on Behaviors have errors", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      const result = await EntityIsolationService.isolateFromError(
        makeError("Behaviors have errors"),
      );

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith(ENTITY_NAME);

      const isolated = EntityIsolationService.getIsolatedEntities(BRIDGE_ID);
      expect(isolated[0].reason).toContain("Behavior initialization failure");

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should isolate on TransactionDestroyedError", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      const result = await EntityIsolationService.isolateFromError(
        makeError("TransactionDestroyedError"),
      );

      expect(result).toBe(true);

      const isolated = EntityIsolationService.getIsolatedEntities(BRIDGE_ID);
      expect(isolated[0].reason).toContain("Transaction destroyed");

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should isolate on DestroyedDependencyError", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      const result = await EntityIsolationService.isolateFromError(
        makeError("DestroyedDependencyError"),
      );

      expect(result).toBe(true);

      const isolated = EntityIsolationService.getIsolatedEntities(BRIDGE_ID);
      expect(isolated[0].reason).toContain("Dependency destroyed");

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should isolate on UninitializedDependencyError", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      const result = await EntityIsolationService.isolateFromError(
        makeError("UninitializedDependencyError"),
      );

      expect(result).toBe(true);

      const isolated = EntityIsolationService.getIsolatedEntities(BRIDGE_ID);
      expect(isolated[0].reason).toContain("Uninitialized dependency");

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should isolate on Endpoint storage inaccessible", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      const result = await EntityIsolationService.isolateFromError(
        makeError("Endpoint storage inaccessible"),
      );

      expect(result).toBe(true);

      const isolated = EntityIsolationService.getIsolatedEntities(BRIDGE_ID);
      expect(isolated[0].reason).toContain("Endpoint storage inaccessible");

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should not isolate on unrecognized errors without aggregator path", async () => {
      const result = await EntityIsolationService.isolateFromError(
        new Error("some completely unknown error"),
      );
      expect(result).toBe(false);
    });

    it("should not isolate same entity twice", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      await EntityIsolationService.isolateFromError(
        makeError("Invalid intervalMs"),
      );
      await EntityIsolationService.isolateFromError(
        makeError("Invalid intervalMs"),
      );

      expect(callback).toHaveBeenCalledTimes(1);

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });

    it("should clear isolated entities on clearIsolatedEntities", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      EntityIsolationService.registerIsolationCallback(BRIDGE_ID, callback);

      await EntityIsolationService.isolateFromError(
        makeError("Invalid intervalMs"),
      );
      expect(
        EntityIsolationService.getIsolatedEntities(BRIDGE_ID),
      ).toHaveLength(1);

      EntityIsolationService.clearIsolatedEntities(BRIDGE_ID);
      expect(
        EntityIsolationService.getIsolatedEntities(BRIDGE_ID),
      ).toHaveLength(0);

      EntityIsolationService.unregisterIsolationCallback(BRIDGE_ID);
    });
  });
});
