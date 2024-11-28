# Developer Guide

## Getting Started

### Installation
```typescript
// Import in your project
import {
    Agent,
    ChatManager,
    ModelManager,
    ResourceManager
} from "https://deno.land/x/denoagents/mod.ts";
```

### Basic Setup
```typescript
// Initialize components
const agent = new ConversableAgent({
    id: "agent-1",
    name: "Assistant",
    type: "conversable",
    llmConfig: {
        provider: "openai",
        model: "gpt-4"
    }
});

const chat = await chatManager.createChat("direct", {
    id: "chat-1",
    security: securityContext
});

const llm = await modelManager.getProvider("openai");
```

## Architecture Overview

### Core Components

1. Agent System
   - Base agent implementation
   - Message handling
   - Function registration
   - State management

2. Chat System
   - Message routing
   - Participant management
   - History tracking
   - Event handling

3. LLM Integration
   - Provider management
   - Response generation
   - Token management
   - Error handling

4. Resource Management
   - Memory optimization
   - Resource cleanup
   - Performance monitoring
   - Error recovery

### Data Flow

1. Message Creation
   ```typescript
   const message = {
       id: crypto.randomUUID(),
       role: "user",
       content: "Hello",
       metadata: {
           senderId: "user-1",
           recipientId: "agent-1"
       }
   };
   ```

2. Permission Validation
   ```typescript
   await securityContext.checkPermission(
       "send_message",
       { recipient: "agent-1" }
   );
   ```

3. Resource Allocation
   ```typescript
   await resourceManager.registerResource({
       id: "message-1",
       type: "memory"
   });
   ```

4. Processing
   ```typescript
   const response = await agent.processMessage(message);
   ```

5. Response Generation
   ```typescript
   const llmResponse = await llm.complete([
       message,
       // context messages
   ]);
   ```

6. Resource Cleanup
   ```typescript
   await resourceManager.releaseResource("message-1");
   ```

## Extension Points

### Custom Agents
```typescript
class CustomAgent extends BaseAgent {
    protected async processMessage(
        message: Message
    ): Promise<Message> {
        // Custom processing logic
        const response = await this.generateResponse(
            message.content
        );
        return this.createMessage(response);
    }

    private async generateResponse(
        input: string
    ): Promise<string> {
        // Custom response generation
        return `Processed: ${input}`;
    }
}
```

### Custom LLM Providers
```typescript
class CustomProvider extends BaseLLMProvider {
    protected async generateCompletion(
        messages: Message[]
    ): Promise<LLMResponse> {
        // Custom LLM integration
        const response = await this.makeRequest(
            messages
        );
        return this.formatResponse(response);
    }

    private async makeRequest(
        messages: Message[]
    ): Promise<unknown> {
        // Custom API request
        return await fetch(this.endpoint, {
            method: "POST",
            body: JSON.stringify({ messages })
        });
    }
}
```

### Custom Resource Management
```typescript
class CustomResourceManager extends ResourceManager {
    protected async cleanup(
        resource: Resource
    ): Promise<void> {
        // Custom cleanup logic
        await super.cleanup(resource);
        await this.additionalCleanup(resource);
    }

    private async additionalCleanup(
        resource: Resource
    ): Promise<void> {
        // Additional cleanup steps
    }
}
```

## Best Practices

### 1. Security

- Always validate input
```typescript
await SecurityValidator.validateInput(
    userInput,
    securityContext
);
```

- Implement proper permissions
```typescript
const security = {
    permissions: ["basic_execution"],
    constraints: {
        maxTokens: 1000
    }
};
```

- Use sandboxed execution
```typescript
await sandbox.execute(
    operation,
    security
);
```

### 2. Performance

- Use batch processing
```typescript
await asyncOptimizer.processBatch(
    items,
    processor
);
```

- Implement resource cleanup
```typescript
try {
    await operation();
} finally {
    await cleanup();
}
```

- Monitor memory usage
```typescript
const metrics = await memoryManager.getMetrics();
```

### 3. Error Handling

- Implement proper error recovery
```typescript
try {
    await operation();
} catch (error) {
    if (error instanceof ValidationError) {
        // Handle validation error
    } else if (error instanceof SecurityError) {
        // Handle security error
    } else {
        // Handle other errors
    }
}
```

- Use typed errors
```typescript
class CustomError extends DenoAgentsError {
    constructor(
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message, context);
    }
}
```

- Log errors appropriately
```typescript
logger.error("Operation failed", {
    error,
    context
});
```

## Testing

### Unit Tests
```typescript
Deno.test("Agent Processing", async () => {
    const agent = new TestAgent();
    const message = createTestMessage();
    const response = await agent.processMessage(message);
    assertEquals(response.role, "assistant");
});
```

### Integration Tests
```typescript
Deno.test("System Integration", async () => {
    const system = new TestSystem();
    await system.initialize();
    const result = await system.performOperation();
    assert(result.success);
});
```

### Performance Tests
```typescript
Deno.test("Performance", async () => {
    const benchmark = new Benchmark();
    const metrics = await benchmark.run();
    assert(metrics.latency < 100);
});
```

## Debugging

### Logging
```typescript
const logger = new Logger({
    source: "Component",
    level: "debug"
});

logger.debug("Operation details", {
    input,
    context
});
```

### Metrics
```typescript
const metrics = {
    memory: await memoryManager.getMetrics(),
    resources: await resourceManager.getMetrics(),
    operations: await asyncOptimizer.getMetrics()
};
```

### Error Tracking
```typescript
process.on("unhandledRejection", (error) => {
    logger.error("Unhandled rejection", { error });
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
});
```

This developer guide provides:
- Clear setup instructions
- Architecture overview
- Extension points
- Best practices
- Testing guidance
- Debugging tools

The guide ensures developers can:
- Understand the framework
- Implement features correctly
- Follow best practices
- Debug effectively
- Maintain code quality
