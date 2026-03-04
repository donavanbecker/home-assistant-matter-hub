/**
 * Data-driven mapping schema for simple HA domains → Matter devices.
 *
 * This allows adding support for new device types via JSON config
 * without writing TypeScript code. Complex domains (vacuum, climate,
 * media_player) still use typed DomainEndpoint subclasses.
 *
 * Transforms are a CLOSED set of named operators — no eval, no templates.
 */

/** A single value transform operation */
export interface ValueTransform {
  /** Attribute path in HA entity state (e.g., "state", "attributes.brightness") */
  path: string;
  /** Transform operator to apply */
  transform: TransformOperator;
  /** Operator-specific parameters */
  value?: unknown;
  from?: [number, number];
  to?: [number, number];
  map?: Record<string, unknown>;
  default?: unknown;
}

/**
 * Closed set of allowed transform operators.
 * No eval, no templates, no arbitrary execution.
 */
export type TransformOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "scale"
  | "clamp"
  | "round"
  | "toNumber"
  | "toString"
  | "toBoolean"
  | "map"
  | "raw";

/** Maps a Matter cluster attribute to an HA state value */
export interface AttributeMapping {
  /** Matter attribute name (e.g., "onOff", "currentLevel") */
  attribute: string;
  /** Transform to compute the value from HA entity state */
  stateTransform: ValueTransform;
}

/** Maps a Matter command to an HA action */
export interface CommandMapping {
  /** Matter command name (e.g., "on", "off", "moveToLevel") */
  command: string;
  /** HA action to call (e.g., "homeassistant.turn_on") */
  action: string;
  /** Optional service data mapping from command args to HA action data */
  data?: Record<string, ValueTransform | string>;
}

/** Configuration for a single Matter cluster on the device */
export interface ClusterMapping {
  /** Matter cluster ID (e.g., "onOff", "levelControl") */
  cluster: string;
  /** How to read HA state → Matter attributes */
  attributes: AttributeMapping[];
  /** How to handle Matter commands → HA actions */
  commands: CommandMapping[];
}

/** Top-level mapping definition for an HA domain → Matter device */
export interface DeviceMapping {
  /** Schema version for forward compatibility */
  $schema: "hamh-mapping-v1";
  /** HA domain this mapping applies to (e.g., "switch", "button") */
  domain: string;
  /** Matter device type (must be in the pre-composed registry) */
  matterDeviceType: string;
  /** Optional: only apply when entity has specific features/attributes */
  when?: {
    /** Entity must have these attributes present */
    hasAttributes?: string[];
    /** Entity state must match one of these values */
    stateIn?: string[];
    /** Entity device_class must match */
    deviceClass?: string;
  };
  /** Cluster mappings */
  clusters: ClusterMapping[];
}
