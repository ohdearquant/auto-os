# Getting Started with DenoAgents Framework

## Prerequisites

- Deno >= 1.37.0
- TypeScript >= 5.0.0
- Basic understanding of TypeScript and async programming

## Installation

1. Create a new project:
```bash
mkdir my-denoagents-project
cd my-denoagents-project
```

2. Create a basic project structure:
```bash
mkdir -p src/{agents,chat,config}
```

3. Create a `deno.json` configuration:
```json
{
    "compilerOptions": {
        "strict": true,
        "allowJs": false,
        "lib": ["deno.window"],
        "noImplicitAny": true
    }
}
```

## Quick Start

### 1. Basic Agent Creation

Create your first agent in `src/agents/my-agent.ts`:

```typescript
import { Agent, AgentConfig } from "denoagents/mod.ts";

const config: AgentConfig = {
    name: "MyFirstAgent",
    type: "assistant",
    systemMessage: "You are a helpful assistant.",
    llmConfig: {
        model: "gpt-4",
        temperature: 0.7
    }
};

const agent = new Agent(config);
await agent.initialize();
```

### 2. Basic Chat Implementation

Create a chat handler in `src/chat/basic-chat.ts`:

```typescript
import { ChatSystem, Message } from "denoagents/mod.ts";

const chat = await ChatSystem.createChat({
    name: "BasicChat",
    type: "direct"
});

// Add participants
await chat.addParticipant(agent);

// Send a message
await chat.sendMessage({
    role: "user",
    content: "Hello, agent!",
    metadata: {
        sender: "user",
        timestamp: Date.now()
    }
});
```

### 3. Function Registration

Register custom functions with your agent:

```typescript
import { FunctionDefinition } from "denoagents/mod.ts";

const weatherFunction: FunctionDefinition = {
    name: "getWeather",
    description: "Get weather information for a location",
    parameters: {
        type: "object",
        properties: {
            location: {
                type: "string",
                description: "City name or coordinates"
            }
        },
        required: ["location"]
    },
    handler: async (params) => {
        // Implementation
        return { temperature: 20, condition: "sunny" };
    }
};

agent.registerFunction(weatherFunction);
```

## Basic Security Setup

### 1. Permission Configuration

```typescript
const securityConfig = {
    permissions: {
        network: ["api.openai.com"],
        fileSystem: ["read"],
        execution: ["sandbox-only"]
    }
};

agent.configure({ ...config, permissions: securityConfig });
```

### 2. Sandbox Usage

```typescript
import { Sandbox } from "denoagents/mod.ts";

const sandbox = new Sandbox({
    timeout: 5000,
    memoryLimit: 100 * 1024 * 1024, // 100MB
    allowedModules: ["crypto"]
});

const result = await sandbox.execute(
    someCode,
    { context: {} }
);
```

## Resource Management

### 1. Basic Resource Configuration

```typescript
const resourceConfig = {
    memory: {
        limit: "256MB",
        threshold: "200MB"
    },
    connections: {
        max: 10,
        timeout: "30s"
    }
};

agent.configure({ ...config, resources: resourceConfig });
```

### 2. Rate Limiting Setup

```typescript
const rateLimitConfig = {
    requests: {
        perSecond: 10,
        perMinute: 100
    },
    tokens: {
        perMinute: 10000
    }
};
```

## Common Patterns

### 1. Message Handling

```typescript
// Register message handler
agent.onMessage(async (message: Message) => {
    if (message.content.includes("weather")) {
        return agent.executeFunctionCall({
            name: "getWeather",
            arguments: {
                location: "extractLocationFromMessage(message)"
            }
        });
    }
    return agent.generateReply([message]);
});
```

### 2. State Management

```typescript
// Update agent state
await agent.setState({
    context: {
        lastQuery: "weather",
        userPreferences: {
            location: "New York"
        }
    }
});

// Get current state
const state = agent.getState();
```

### 3. Error Handling

```typescript
try {
    await agent.sendMessage(message);
} catch (error) {
    if (error instanceof SecurityError) {
        console.error("Security violation:", error.message);
    } else if (error instanceof ResourceError) {
        console.error("Resource limit exceeded:", error.message);
    } else {
        console.error("Unexpected error:", error);
    }
}
```

## Next Steps

1. Explore the [API Documentation](../api/README.md) for detailed interface descriptions
2. Review the [Security Guide](./security-guide.md) for secure implementation practices
3. Check the [Development Guide](./development.md) for best practices and patterns
4. See the [Deployment Guide](./deployment.md) for production deployment instructions

## Common Issues

1. **Permission Errors**: Ensure proper permission configuration in agent setup
2. **Resource Limits**: Monitor and adjust resource limits based on usage
3. **Rate Limiting**: Implement proper rate limiting for external API calls
4. **State Management**: Use appropriate state management patterns for your use case
