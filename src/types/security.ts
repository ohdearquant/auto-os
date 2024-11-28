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
    }
    
    /**
     * File system permission configuration
     */
    export interface FileSystemPermission {
        /** Allowed file paths */
        allow: string[];
        /** Allowed operations */
        operations?: ("read" | "write" | "execute")[];
    /** Environment access permissions */
    env?: EnvPermission[];
    /** Function execution permissions */
    execution?: ExecutionPermission[];
}

/**
 * Environment permission configuration
 */
export interface EnvPermission {
    /** Allowed environment variables */
    allow: string[];
}

/**
 * Execution permission configuration
 */
export interface ExecutionPermission {
    /** Allowed functions */
    allow: string[];
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

/**
 * Permission type
 */
export type Permission = 
  | "function:call"
  | "function:register"
  | "message:send"
  | "message:receive"
  | "agent:create"
  | "agent:delete"
  | "memory:read"
  | "memory:write";

/**
 * Security policy interface
 */
export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  constraints?: Record<string, unknown>;
}

/**
 * Security context interface
 */
export interface SecurityContext {
  id: string;
  policies: SecurityPolicy[];
  validate(permission: Permission, context?: Record<string, unknown>): Promise<boolean>;
  grant(policy: SecurityPolicy): void;
  revoke(policyId: string): void;
}

/**
 * Security manager interface
 */
export interface SecurityManager {
  createContext(policies?: SecurityPolicy[]): SecurityContext;
  createPolicy(name: string, permissions: Permission[]): SecurityPolicy;
  validateContext(context: SecurityContext): Promise<boolean>;
  validatePolicy(policy: SecurityPolicy): Promise<boolean>;
}

/**
 * Authenticator interface
 */
export interface Authenticator {
  authenticate(credentials: Record<string, unknown>): Promise<SecurityContext>;
  verify(token: string): Promise<SecurityContext>;
  refresh(token: string): Promise<string>;
}