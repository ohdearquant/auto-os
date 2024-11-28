/**
 * Function and tool related type definitions
 * @module types/function
 */

import type { PermissionSet, ResourceLimits } from "./security.ts";

/**
 * Function definition interface
 */
export interface FunctionDefinition<P = Record<string, unknown>> {
    /** Function name */
    readonly name: string;
    /** Function description */
    readonly description: string;
    /** Parameter schema (JSON Schema) */
    parameters: JSONSchema;
    /** Return value schema */
    returns?: JSONSchema;
    /** Function implementation */
    handler: (params: P) => unknown;
    /** Required permissions */
    permissions?: PermissionSet;
    /** Execution timeout (ms) */
    timeout?: number;
}

/**
 * Tool definition interface
 */
export interface ToolDefinition<P = Record<string, unknown>> {
    /** Tool identifier */
    readonly name: string;
    /** Tool description */
    readonly description: string;
    /** Parameter schema */
    parameters: JSONSchema;
    /** Tool implementation */
    handler: (params: P) => unknown;
    /** Required permissions */
    permissions?: PermissionSet;
    /** Resource limits */
    limits?: ResourceLimits;
}

/**
 * Function call representation
 */
export interface FunctionCall {
    /** Called function name */
    name: string;
    /** Arguments as JSON string */
    arguments: string;
    /** Call timestamp */
    timestamp: number;
}

/**
 * Tool call representation
 */
export interface ToolCall {
    /** Tool identifier */
    id: string;
    /** Tool name */
    name: string;
    /** Arguments as JSON string */
    arguments: string;
    /** Call timestamp */
    timestamp: number;
}

/**
 * JSON Schema type definition
 */
export type JSONSchema = {
    type: string;
    properties?: Record<string, JSONSchema>;
    required?: string[];
    additionalProperties?: boolean;
    items?: JSONSchema;
    [key: string]: unknown;
};

/**
 * Function execution result
 */
export interface ExecutionResult<T = unknown> {
    success: boolean;
    result?: T;
    error?: Error;
    metrics: {
        executionTime: number;
        memoryUsage: number;
    };
}
