/**
 * Configuration type definitions
 * @module types/config
 */

import { PermissionSet, ResourceLimits } from '@/types/security.ts';

/**
 * LLM provider configuration
 */
export interface LLMConfig {
    /** Provider type */
    provider: "openai" | "azure" | "custom";
    /** Model identifier */
    model: string;
    /** API configuration */
    apiConfig: {
        apiKey: string;
        organization?: string;
        endpoint?: string;
    };
    /** Model parameters */
    parameters?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    };
    /** Rate limiting */
    rateLimit?: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    };
}

/**
 * Framework configuration
 */
export interface FrameworkConfig {
    /** Security configuration */
    security: {
        defaultPermissions: PermissionSet;
        strictMode: boolean;
    };
    /** Resource limits */
    resources: {
        global: ResourceLimits;
        perAgent: ResourceLimits;
    };
    /** Logging configuration */
    logging: {
        level: "debug" | "info" | "warn" | "error";
        destination: "console" | "file";
        format: "json" | "text";
    };
}

/**
 * Logging configuration
 */
export interface LogConfig {
  level: "debug" | "info" | "warn" | "error";
  format?: "json" | "text";
  destination?: "console" | "file";
  filePath?: string;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  prefix?: string;
  labels?: Record<string, string>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  type: "memory" | "redis";
  ttl: number;
  maxSize?: number;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  enabled: boolean;
  policies: string[];
  authenticator?: {
    type: "jwt" | "basic";
    secret?: string;
    expiry?: number;
  };
}

/**
 * Agent runtime/operational configuration
 */
export interface AgentRuntimeConfig {
  maxInstances: number;
  timeout: number;
  retries: number;
  backoff: {
    initial: number;
    max: number;
    factor: number;
  };
}

/**
 * System configuration
 */
export interface SystemConfig {
  log: LogConfig;
  metrics: MetricsConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  agent: AgentRuntimeConfig;
  env: "development" | "production" | "test";
}

/**
 * Configuration manager
 */
export interface ConfigManager {
  load(path: string): Promise<void>;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  validate(): Promise<boolean>;
}
