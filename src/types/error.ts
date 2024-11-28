/**
 * Error type definitions
 * @module types/error
 */

/**
 * Base error class for the framework
 */
export class DenoAgentsError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = "DenoAgentsError";
    }
}

/**
 * Error codes enumeration
 */
export enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",
    TIMEOUT = "TIMEOUT",
    INITIALIZATION_ERROR = "INITIALIZATION_ERROR",
    RUNTIME_ERROR = "RUNTIME_ERROR"
}

/**
 * Validation error class
 */
export class ValidationError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, ErrorCode.VALIDATION_ERROR, context);
        this.name = "ValidationError";
    }
}

/**
 * Permission error class
 */
export class SecurityError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, ErrorCode.PERMISSION_DENIED, context);
        this.name = "SecurityError";
    }
}

/**
 * Resource error class
 */
export class ResourceError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, ErrorCode.RESOURCE_EXHAUSTED, context);
        this.name = "ResourceError";
    }
}

/**
 * Timeout error class
 */
export class TimeoutError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, ErrorCode.TIMEOUT, context);
        this.name = "TimeoutError";
    }
}

/**
 * Initialization error class
 */
export class InitializationError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, ErrorCode.INITIALIZATION_ERROR, context);
        this.name = "InitializationError";
    }
}

/**
 * Runtime error class
 */
export class RuntimeError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, ErrorCode.RUNTIME_ERROR, context);
        this.name = "RuntimeError";
    }
}
