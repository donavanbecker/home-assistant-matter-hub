import { Logger } from "@matter/general";
import { Ajv } from "ajv";
import type { DeviceMapping } from "./mapping-schema.js";

const logger = Logger.get("MappingValidator");

const VALID_TRANSFORMS = [
  "equals",
  "notEquals",
  "greaterThan",
  "lessThan",
  "scale",
  "clamp",
  "round",
  "toNumber",
  "toString",
  "toBoolean",
  "map",
  "raw",
];

const mappingJsonSchema = {
  type: "object",
  required: ["$schema", "domain", "matterDeviceType", "clusters"],
  properties: {
    $schema: { type: "string", const: "hamh-mapping-v1" },
    domain: { type: "string", minLength: 1 },
    matterDeviceType: { type: "string", minLength: 1 },
    when: {
      type: "object",
      properties: {
        hasAttributes: { type: "array", items: { type: "string" } },
        stateIn: { type: "array", items: { type: "string" } },
        deviceClass: { type: "string" },
      },
      additionalProperties: false,
    },
    clusters: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["cluster", "attributes", "commands"],
        properties: {
          cluster: { type: "string", minLength: 1 },
          attributes: {
            type: "array",
            items: {
              type: "object",
              required: ["attribute", "stateTransform"],
              properties: {
                attribute: { type: "string", minLength: 1 },
                stateTransform: {
                  type: "object",
                  required: ["path", "transform"],
                  properties: {
                    path: { type: "string", minLength: 1 },
                    transform: { type: "string", enum: VALID_TRANSFORMS },
                    value: {},
                    from: {
                      type: "array",
                      items: { type: "number" },
                      minItems: 2,
                      maxItems: 2,
                    },
                    to: {
                      type: "array",
                      items: { type: "number" },
                      minItems: 2,
                      maxItems: 2,
                    },
                    map: { type: "object" },
                    default: {},
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          },
          commands: {
            type: "array",
            items: {
              type: "object",
              required: ["command", "action"],
              properties: {
                command: { type: "string", minLength: 1 },
                action: { type: "string", minLength: 1 },
                data: { type: "object" },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(mappingJsonSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a device mapping config against the JSON schema.
 * Returns clear error messages for broken configs.
 */
export function validateMapping(mapping: unknown): ValidationResult {
  const valid = validate(mapping);
  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map(
    (e: { instancePath?: string; message?: string }) => {
      const path = e.instancePath || "(root)";
      return `${path}: ${e.message}`;
    },
  );

  return { valid: false, errors };
}

/**
 * Validate and log errors for a mapping. Returns the typed mapping if valid, undefined otherwise.
 */
export function validateAndParseMappings(
  raw: unknown[],
  source: string,
): DeviceMapping[] {
  const result: DeviceMapping[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const validation = validateMapping(item);
    if (!validation.valid) {
      logger.warn(
        `Invalid mapping at index ${i} from ${source}: ${validation.errors.join("; ")}`,
      );
      continue;
    }
    result.push(item as DeviceMapping);
  }
  return result;
}
