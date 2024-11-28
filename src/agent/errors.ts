/**
 * Agent-specific error types
 * @module agent/errors
 */

import { DenoAgentsError, ErrorCode } from "../types/error.ts";

/**
 * Error thrown when agent validation fails
 */
export class ValidationError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.VALIDATION_ERROR, { agentId });
        this.name = "ValidationError";
    }
}

/**
 * Error thrown when message processing fails
 */
export class MessageProcessingError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.RUNTIME_ERROR, { agentId });
        this.name = "MessageProcessingError";
    }
}

/**
 * Error thrown when agent state operations fail
 */
export class StateError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.RUNTIME_ERROR, { agentId });
        this.name = "StateError";
    }
}

/**
 * Error thrown when agent initialization fails
 */
export class InitializationError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.INITIALIZATION_ERROR, { agentId });
        this.name = "InitializationError";
    }
}

/**
 * Error thrown when agent termination fails
 */
export class TerminationError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.RUNTIME_ERROR, { agentId });
        this.name = "TerminationError";
    }
}

/**
 * Error thrown when agent function execution fails
 */
export class FunctionExecutionError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.RUNTIME_ERROR, { agentId });
        this.name = "FunctionExecutionError";
    }
}

/**
 * Error thrown when agent tool execution fails
 */
export class ToolExecutionError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.RUNTIME_ERROR, { agentId });
        this.name = "ToolExecutionError";
    }
}

/**
 * Error thrown when agent resource limits are exceeded
 */
export class ResourceLimitError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.RESOURCE_EXHAUSTED, { agentId });
        this.name = "ResourceLimitError";
    }
}

/**
 * Error thrown when agent permissions are insufficient
 */
export class PermissionError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.PERMISSION_DENIED, { agentId });
        this.name = "PermissionError";
    }
}

/**
 * Error thrown when agent operation times out
 */
export class TimeoutError extends DenoAgentsError {
    constructor(message: string, agentId?: string) {
        super(message, ErrorCode.TIMEOUT, { agentId });
        this.name = "TimeoutError";
    }
}
