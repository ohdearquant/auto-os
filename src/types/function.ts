/**
 * Function and tool related type definitions
 * @module types/function
 */

import { PermissionSet, ResourceLimits } from '@/types/security.ts';

/**
 * Function parameter definition interface
 */
export interface FunctionParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: "string" | "number" | "boolean" | "array" | "object";
  /** Parameter description */
  description?: string;
  /** Is parameter required? */
  required?: boolean;
  /** Default value */
  default?: unknown;
}

/**
 * Function definition interface
 */
export interface FunctionDefinition {
    /** Function name */
    readonly name: string;
    /** Function description */
    readonly description: string;
    /** Parameter definitions */
    parameters: FunctionParameter[];
    /** Return value definition */
    returns?: {
      /** Return value type */
      type: string;
      /** Return value description */
      description?: string;
    };
    /** Function implementation */
    handler: (...args: unknown[]) => Promise<unknown>;
    /** Required permissions */
    permissions?: PermissionSet;
    /** Execution timeout (ms) */
    timeout?: number;
}

/**
 * Tool definition interface
 */
export interface ToolDefinition {
    /** Tool identifier */
    readonly name: string;
    /** Tool description */
    readonly description: string;
    /** Parameter schema */
    parameters: JSONSchema;
    /** Tool implementation */
    handler: (params: Record<string, unknown>) => Promise<unknown>;
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
    /** Arguments */
    arguments: Record<string, unknown>;
    /** Call timestamp */
    timestamp: number;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Function result representation
 */
export interface FunctionResult {
    /** Function name */
    name: string;
    /** Result value */
    result: unknown;
    /** Error message */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Function registry interface
 */
export interface FunctionRegistry {
    /** Register a function */
    register(definition: FunctionDefinition, implementation: (...args: unknown[]) => Promise<unknown>): void;
    /** Unregister a function */
    unregister(name: string): void;
    /** Get a function definition and implementation */
    get(name: string): { definition: FunctionDefinition; implementation: (...args: unknown[]) => Promise<unknown> } | undefined;
    /** List all registered functions */
    list(): FunctionDefinition[];
    /** Call a function */
    call(name: string, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * Function validator interface
 */
export interface FunctionValidator {
    /** Validate a function definition */
    validateDefinition(definition: FunctionDefinition): boolean;
    /** Validate function arguments */
    validateArguments(definition: FunctionDefinition, args: Record<string, unknown>): boolean;
    /** Validate a function result */
    validateResult(definition: FunctionDefinition, result: unknown): boolean;
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