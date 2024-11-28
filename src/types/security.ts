/**
 * Security-related type definitions
 * @module types/security
 */

/**
 * Permission set interface
 */
export interface PermissionSet {
    /** Network access permissions */
    network?: NetworkPermission[];
    /** File system permissions */
    fileSystem?: FileSystemPermission[];
    /** Environment access permissions */
    env?: EnvPermission[];
    /** Function execution permissions */
    execution?: ExecutionPermission[];
}

/**
 * Network permission configuration
 */
export interface NetworkPermission {
    /** Allowed hosts */
    allow: string[];
    /** Port restrictions */
    ports?: number[];
    /** Protocol restrictions */
    protocols?: ("http" | "https")[];
}

/**
 * File system permission configuration
 */
export interface FileSystemPermission {
    /** Allowed paths */
    paths: string[];
    /** Allowed operations */
    operations: ("read" | "write" | "delete")[];
}

/**
 * Environment variable permission configuration
 */
export interface EnvPermission {
    /** Allowed variable names */
    variables: string[];
    /** Allowed operations */
    operations: ("read" | "write")[];
}

/**
 * Function execution permission configuration
 */
export interface ExecutionPermission {
    /** Allowed function names */
    functions: string[];
    /** Resource limits */
    limits?: ResourceLimits;
}

/**
 * Security context for operations
 */
export interface SecurityContext {
    /** Principal performing the operation */
    principal: string;
    /** Security scope */
    scope: string;
    /** Operation context */
    context: Record<string, unknown>;
    /** Timestamp */
    timestamp: number;
    /** Check if an action is permitted */
    checkPermission(
        action: string,
        context?: Record<string, unknown>
    ): Promise<boolean>;
}

/**
 * Resource usage limits
 */
export interface ResourceLimits {
    /** Memory limit in MB */
    memory?: number;
    /** CPU time limit in ms */
    cpu?: number;
    /** Network bandwidth limit */
    bandwidth?: number;
}
