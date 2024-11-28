/**
 * Base configuration type for all configurable entities
 */
export interface BaseConfig {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
}

/**
 * Represents a generic result with success/failure status
 */
export interface Result<T, E = Error> {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: E;
}

/**
 * Represents pagination parameters
 */
export interface PaginationParams {
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Base interface for all entities that can be identified
 */
export interface Identifiable {
  readonly id: string;
}

/**
 * Base interface for all entities that can be named
 */
export interface Named {
  readonly name: string;
}

/**
 * Base interface for all entities that can be described
 */
export interface Describable {
  readonly description?: string;
}

/**
 * Base interface for all entities that can be timestamped
 */
export interface Timestamped {
  readonly timestamp: number;
}

/**
 * Base interface for all entities that can have metadata
 */
export interface Metadatable {
  readonly metadata?: Record<string, unknown>;
}

/**
 * Base interface for all entities that can be validated
 */
export interface Validatable {
  validate(): Promise<boolean>;
}

/**
 * Base interface for all entities that can be serialized
 */
export interface Serializable {
  serialize(): Promise<string>;
  deserialize(data: string): Promise<void>;
}

/**
 * Base interface for all entities that can be cleaned up
 */
export interface Cleanable {
  cleanup(): Promise<void>;
}

/**
 * Base interface for all entities that can be initialized
 */
export interface Initializable {
  initialize(): Promise<void>;
}

/**
 * Base interface for all entities that can be reset
 */
export interface Resettable {
  reset(): Promise<void>;
}

/**
 * Base interface for all entities that can be terminated
 */
export interface Terminatable {
  terminate(): Promise<void>;
}

/**
 * Base interface for all entities that can emit events
 */
export interface EventEmitter {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
}

/**
 * Base interface for all entities that can be configured
 */
export interface Configurable<T extends BaseConfig> {
  readonly config: T;
}

/**
 * Basic logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Base interface for all entities that can be logged
 */
export interface Loggable {
  readonly logger: Logger;
}

/**
 * Base interface for all entities that can be measured
 */
export interface Measurable {
  getMetrics(): Promise<Record<string, unknown>>;
}

/**
 * Base interface for all entities that can be versioned
 */
export interface Versionable {
  readonly version: string;
}

/**
 * Base interface for all entities that can be enabled/disabled
 */
export interface Toggleable {
  readonly enabled: boolean;
  enable(): Promise<void>;
  disable(): Promise<void>;
}
