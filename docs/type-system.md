# DenoAgents Framework Type System Implementation

## Overview

The DenoAgents Framework implements a comprehensive type system designed for building robust, type-safe agent-based applications. This document outlines the core type definitions and their relationships within the framework.

## Core Type Structure

The type system is organized into several key modules:

```
src/types/
├── mod.ts          # Main type exports
├── agent.ts        # Agent-related types
├── message.ts      # Message handling types
├── function.ts     # Function and tool types
├── security.ts     # Security-related types
├── error.ts        # Error handling types
└── config.ts       # Configuration types
```

## Type Definitions

### Core Exports (mod.ts)

Main entry point for type exports:

```typescript
/**
 * Core type exports for the DenoAgents Framework
 * @module types
 */

export * from "./agent.ts";
export * from "./message.ts";
export * from "./function.ts";
export * from "./security.ts";
export * from "./error.ts";
export * from "./config.ts";
```

### Agent Types (agent.ts)

Defines the core agent-related types:

```typescript
/**
 * Agent-related type definitions
 * @module types/agent
 */

/**
 * Supported agent types in the framework
 */
export type AgentType = "base" | "conversable" | "assistant" | "userProxy" | "custom";

/**
 * Configuration options for agent initialization
 */
export interface AgentConfig {
    /** Unique identifier for the agent */
    readonly id: string;
    /** Display name of the agent */
    readonly name: string;
    /** Type of agent being configured */
    readonly type: AgentType;
    /** System message defining agent behavior */
    systemMessage?: string;
    /** Configuration for LLM integration */
    llmConfig?: LLMConfig | false;
    /** Maximum number of consecutive auto-replies */
    maxConsecutiveAutoReply?: number;
    /** Human input requirement mode */
    humanInputMode?: "ALWAYS" | "NEVER" | "TERMINATE";
    /** Security permissions for the agent */
    permissions?: PermissionSet;
    /** Custom metadata for agent extension */
    metadata?: Record<string, unknown>;
}

/**
 * Base agent state interface
 */
export interface AgentState {
    /** Current agent status */
    status: AgentStatus;
    /** Active conversation IDs */
    activeConversations: Set<string>;
    /** Registered function names */
    registeredFunctions: Set<string>;
    /** Current message count */
    messageCount: number;
    /** Last activity timestamp */
    lastActivity: number;
}

/**
 * Agent status enumeration
 */
export type AgentStatus = "idle" | "busy" | "error" | "terminated";
```

### Message Types (message.ts)

Defines message-related types:

```typescript
/**
 * Message-related type definitions
 * @module types/message
 */

/**
 * Core message interface
 */
export interface Message {
    /** Unique message identifier */
    readonly id: string;
    /** Role of the message sender */
    role: MessageRole;
    /** Message content */
    content: string | null;
    /** Name of the sender (optional) */
    name?: string;
    /** Function call details (if applicable) */
    functionCall?: FunctionCall;
    /** Tool call details (if applicable) */
    toolCalls?: ToolCall[];
    /** Message metadata */
    metadata: MessageMetadata;
    /** Creation timestamp */
    timestamp: number;
}

/**
 * Available message roles
 */
export type MessageRole = 
    | "system"
    | "user"
    | "assistant"
    | "function"
    | "tool";

/**
 * Message metadata interface
 */
export interface MessageMetadata {
    /** Sender identifier */
    senderId: string;
    /** Recipient identifier */
    recipientId: string;
    /** Conversation context */
    conversationId: string;
    /** Parent message reference */
    parentMessageId?: string;
    /** Thread identifier for grouped messages */
    threadId?: string;
    /** Custom metadata extensions */
    extensions?: Record<string, unknown>;
}
```

### Function Types (function.ts)

Defines function and tool-related types:

```typescript
/**
 * Function and tool related type definitions
 * @module types/function
 */

/**
 * Function definition interface
 */
export interface FunctionDefinition {
    /** Function name */
    readonly name: string;
    /** Function description */
    readonly description: string;
    /** Parameter schema (JSON Schema) */
    parameters: JSONSchema;
    /** Return value schema */
    returns: JSONSchema;
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
```

### Security Types (security.ts)

Defines security-related types:

```typescript
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
```

### Error Types (error.ts)

Defines error-related types:

```typescript
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
```

### Configuration Types (config.ts)

Defines configuration-related types:

```typescript
/**
 * Configuration type definitions
 * @module types/config
 */

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
```

## Type System Features

The DenoAgents Framework type system is designed with the following key features:

1. **Strict Type Safety**
   - Comprehensive type definitions
   - No implicit any types
   - Readonly properties where appropriate
   - Discriminated unions for type narrowing

2. **Documentation**
   - Extensive JSDoc comments
   - Clear interface hierarchies
   - Self-documenting type names
   - Inline documentation of complex types

3. **Extensibility**
   - Interface-based design
   - Generic type parameters where appropriate
   - Extension points via Record types
   - Plugin system support

4. **Security**
   - Built-in permission types
   - Resource limit definitions
   - Security context tracking
   - Error handling for security violations

5. **Error Handling**
   - Hierarchical error classes
   - Typed error codes
   - Context preservation
   - Stack trace support

## Usage Guidelines

1. Always import types from the main `mod.ts` export
2. Use strict type checking with `"strict": true` in tsconfig
3. Leverage readonly properties for immutable data
4. Implement proper error handling using the provided error classes
5. Follow the security model using PermissionSet types

## Best Practices

1. **Type Safety**
   ```typescript
   // Good
   function processMessage(message: Message): void {
       // Type-safe processing
   }

   // Bad
   function processMessage(message: any): void {
       // Unsafe processing
   }
   ```

2. **Readonly Properties**
   ```typescript
   // Good
   const agent: AgentConfig = {
       readonly id: "agent1",
       // ...
   };

   // Bad
   const agent: AgentConfig = {
       id: "agent1", // Mutable
       // ...
   };
   ```

3. **Error Handling**
   ```typescript
   // Good
   try {
       // Operation
   } catch (error) {
       if (error instanceof ValidationError) {
           // Handle validation error
       }
   }

   // Bad
   try {
       // Operation
   } catch (error: any) {
       // Generic error handling
   }
   ```

4. **Security**
   ```typescript
   // Good
   const permissions: PermissionSet = {
       network: [{
           allow: ["api.example.com"],
           protocols: ["https"]
       }]
   };

   // Bad
   const permissions = {
       allowAll: true // Too permissive
   };
   ```

## Implementation Notes

1. All types are designed to be immutable where appropriate
2. Security is enforced at the type level
3. Error handling is comprehensive and type-safe
4. Configuration is flexible but strictly typed
5. Documentation is thorough and maintainable
