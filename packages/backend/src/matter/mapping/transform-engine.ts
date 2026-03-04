import type { HomeAssistantEntityState } from "@home-assistant-matter-hub/common";
import type { ValueTransform } from "./mapping-schema.js";

/**
 * Resolve a dotted path on an object (e.g., "attributes.brightness").
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Apply a constrained transform to an HA entity state value.
 * Only the closed set of operators is supported — no eval, no templates.
 */
export function applyTransform(
  state: HomeAssistantEntityState,
  transform: ValueTransform,
): unknown {
  const raw = resolvePath(
    state as unknown as Record<string, unknown>,
    transform.path,
  );

  switch (transform.transform) {
    case "raw":
      return raw ?? transform.default;

    case "equals":
      return raw === transform.value;

    case "notEquals":
      return raw !== transform.value;

    case "greaterThan":
      return typeof raw === "number" && typeof transform.value === "number"
        ? raw > transform.value
        : false;

    case "lessThan":
      return typeof raw === "number" && typeof transform.value === "number"
        ? raw < transform.value
        : false;

    case "toNumber": {
      const num = Number(raw);
      return Number.isNaN(num) ? (transform.default ?? 0) : num;
    }

    case "toString":
      return raw != null ? String(raw) : (transform.default ?? "");

    case "toBoolean":
      return Boolean(raw);

    case "scale": {
      const num = Number(raw);
      if (Number.isNaN(num)) return transform.default ?? 0;
      const [fromMin, fromMax] = transform.from ?? [0, 1];
      const [toMin, toMax] = transform.to ?? [0, 1];
      if (fromMax === fromMin) return toMin;
      const scaled =
        ((num - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
      return Math.round(scaled);
    }

    case "clamp": {
      const num = Number(raw);
      if (Number.isNaN(num)) return transform.default ?? 0;
      const [min, max] = transform.to ?? [0, 100];
      return Math.max(min, Math.min(max, num));
    }

    case "round": {
      const num = Number(raw);
      if (Number.isNaN(num)) return transform.default ?? 0;
      return Math.round(num);
    }

    case "map": {
      const key = String(raw);
      const mapped = transform.map?.[key];
      return mapped !== undefined ? mapped : (transform.default ?? raw);
    }

    default:
      return transform.default ?? raw;
  }
}
