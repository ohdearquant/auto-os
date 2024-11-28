/**
 * Configuration type definitions
 * @module types/config
 */

import type { PermissionSet, ResourceLimits } from "./security.ts";

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
