# DenoAgents Framework API Documentation

## Core Components

### Agent System
The agent system provides the foundation for creating and managing AI agents.

```typescript
import { ConversableAgent } from "denoagents";

// Create a new agent
const agent = new ConversableAgent({
    id: "assistant",
    name: "Helper",
    type: "conversable",
    llmConfig: {
        provider: "openai",
        model: "gpt-4"
    },
    security: {
        permissions: ["network", "basic_execution"]
    }
});

// Register capabilities
await agent.registerFunction({
    name: "search",
    description: "Search for information",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string" }
        }
    },
    handler: async (query: string) => {
        // Implementation
    }
});

// Send messages
const response = await agent.sendMessage({
    content: "Hello!",
    metadata: { /* ... */ }
}, recipient);
```

### Chat System
Enables direct and group chat functionality between agents.

```typescript
import { ChatManager, DirectChat } from "denoagents";

// Initialize chat manager
const manager = new ChatManager(securityContext);

// Create chat session
const chat = await manager.createChat("direct", {
    id: "chat-1",
    security: securityContext
});

// Add participants
await chat.addParticipant(agent1.getId());
await chat.addParticipant(agent2.getId());

// Send messages
await chat.sendMessage({
    content: "Hello",
    metadata: {
        senderId: agent1.getId(),
        recipientId: agent2.getId()
    }
});
```

### LLM Integration
Provides integration with language models through various providers.

```typescript
import { ModelManager, OpenAIProvider } from "denoagents";

// Initialize model manager
const manager = new ModelManager(securityContext);

// Register provider
await manager.registerProvider({
    provider: "openai",
    model: "gpt-4",
    apiConfig: {
        apiKey: Deno.env.get("OPENAI_API_KEY")
    }
});

// Generate completions
const response = await provider.complete([
    { role: "user", content: "Hello" }
]);
```

### Performance Optimizations

#### Memory Management
```typescript
import { MemoryManager } from "denoagents";

const memoryManager = new MemoryManager({
    memory: 256 * 1024 * 1024, // 256MB limit
    poolSize: 100
});

// Optimize memory usage
await memoryManager.withMemoryOptimization(
    async () => {
        // Memory-intensive operation
    }
);
```

#### Async Operations
```typescript
import { AsyncOptimizer } from "denoagents";

const optimizer = new AsyncOptimizer({
    maxQueueSize: 1000,
    batchSize: 10
});

// Batch processing
const results = await optimizer.processBatch(
    items,
    async batch => {
        // Process batch
    }
);
```

#### Resource Management
```typescript
import { ResourceManager } from "denoagents";

const manager = new ResourceManager({
    cleanupInterval: 60000,
    maxIdleTime: 300000
});

// Register resources
await manager.registerResource({
    id: "resource-1",
    type: "connection",
    // ...
});

// Cleanup
await manager.releaseResource("resource-1");
```

### File Management
```typescript
import { FileManager } from "denoagents";

const fileManager = new FileManager({
    maxOpenFiles: 100,
    cleanupInterval: 60000
});

// Read file with resource management
const content = await fileManager.readFile("path/to/file");

// Write file with resource management
await fileManager.writeFile("path/to/file", "content");

// Get file metrics
const metrics = fileManager.getMetrics();
```

### Security Features
```typescript
import { SecurityValidator } from "denoagents";

// Validate input
await SecurityValidator.validateInput(
    userInput,
    securityContext
);

// Enforce permissions
await securityPolicy.enforcePermissions(
    "operation",
    "resource"
);

// Rate limiting
await securityPolicy.enforceRateLimit(
    "operation",
    100,  // limit
    60000 // window
);
```

## Type Definitions

### Agent Types
```typescript
interface AgentConfig {
    id: string;
    name: string;
    type: string;
    llmConfig?: LLMConfig;
    security: SecurityContext;
    limits?: ResourceLimits;
}

interface Message {
    id: string;
    role: string;
    content: string;
    metadata: MessageMetadata;
    timestamp: number;
}
```

### Resource Types
```typescript
interface Resource {
    id: string;
    type: ResourceType;
    lastUsed: number;
    connection?: {
        close: () => Promise<void>;
    };
    handle?: {
        close: () => Promise<void>;
    };
    buffer?: unknown | null;
    metadata?: Record<string, unknown>;
}

type ResourceType = "connection" | "file" | "memory";
```

### Security Types
```typescript
interface SecurityContext {
    principal: string;
    scope: string;
    context: Record<string, unknown>;
    timestamp: number;
    checkPermission(
        action: string,
        context?: Record<string, unknown>
    ): Promise<boolean>;
}

interface ResourceLimits {
    memory: number;
    poolSize?: number;
    maxConcurrent?: number;
}
```

## Error Handling

The framework provides typed errors for different scenarios:

```typescript
// Validation errors
throw new ValidationError("Invalid input format");

// Security errors
throw new SecurityError("Permission denied");

// Resource errors
throw new ResourceError("Resource limit exceeded");

// Framework errors
throw new DenoAgentsError(
    "Operation failed",
    { originalError: error }
);
```

## Best Practices

1. Resource Management
   - Always use resource managers for cleanup
   - Implement proper error handling
   - Monitor resource usage

2. Performance
   - Use batch processing for multiple operations
   - Implement memory optimization
   - Monitor performance metrics

3. Security
   - Validate all input
   - Implement proper permissions
   - Use rate limiting
   - Monitor security events

4. Error Handling
   - Use typed errors
   - Implement proper recovery
   - Log errors appropriately
