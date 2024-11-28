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
 * Agent error class
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AgentError";
  }
}

/**
 * Security error class
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public permission: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SecurityError";
  }
}

/**
 * Function error class
 */
export class FunctionError extends Error {
  constructor(
    message: string,
    public functionName: string,
    public args?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FunctionError";
  }
}

/**
 * Message error class
 */
export class MessageError extends Error {
  constructor(
    message: string,
    public messageId: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MessageError";
  }
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  handle(error: Error): Promise<void>;
  register(errorType: string, handler: (error: Error) => Promise<void>): void;
  unregister(errorType: string): void;
}
