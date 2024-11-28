# Integration Guide

## System Integration

### Basic Integration
```typescript
import {
    Agent,
    ChatManager,
    ModelManager,
    ResourceManager
} from "denoagents";

// Initialize core components
const agent = new Agent(config);
const chat = await chatManager.createChat(chatConfig);
const llm = await modelManager.getProvider("openai");

// Connect components
await agent.connectToChat(chat);
await agent.setLLMProvider(llm);
```

### Custom Integration
```typescript
// Implement custom functionality
class CustomSystem {
    constructor(
        private readonly agent: Agent,
        private readonly chat: ChatManager,
        private readonly resources: ResourceManager
    ) {}

    public async initialize(): Promise<void> {
        // Register resources
        await this.resources.registerResource({
            id: "system",
            type: "memory"
        });

        // Setup agent
        await this.agent.initialize();

        // Configure chat
        await this.chat.initialize();
    }

    public async shutdown(): Promise<void> {
        // Cleanup resources
        await this.resources.shutdown();
    }
}
```

## External System Integration

### Database Integration
```typescript
// Implement custom storage
class DatabaseStorage implements Storage {
    constructor(
        private readonly db: Database
    ) {}

    async save(data: unknown): Promise<void> {
        await this.db.insert(data);
    }

    async load(id: string): Promise<unknown> {
        return await this.db.select(id);
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(id);
    }
}

// Use with framework
const storage = new DatabaseStorage(database);
const agent = new Agent({
    storage,
    // other config
});
```

### API Integration
```typescript
// Custom API client
class APIClient {
    constructor(
        private readonly agent: Agent,
        private readonly security: SecurityContext
    ) {}

    public async makeRequest(
        endpoint: string,
        data: unknown
    ): Promise<Response> {
        // Validate request
        await this.security.checkPermission(
            "api_access",
            { endpoint }
        );

        // Make request
        return await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
            headers: this.getHeaders()
        });
    }

    private getHeaders(): Headers {
        return new Headers({
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.getToken()}`
        });
    }
}
```

## Resource Integration

### Memory Management
```typescript
// Custom memory manager
class CustomMemoryManager extends MemoryManager {
    constructor(
        private readonly metrics: MetricsService
    ) {
        super({
            memory: 256 * 1024 * 1024,
            poolSize: 100
        });
    }

    protected async cleanup(): Promise<void> {
        await super.cleanup();
        await this.metrics.record("memory_cleanup");
    }
}

// Use custom manager
const memoryManager = new CustomMemoryManager(metrics);
const agent = new Agent({
    memoryManager,
    // other config
});
```

### File System Integration
```typescript
// Custom file manager
class CustomFileManager extends FileManager {
    constructor(
        private readonly storage: StorageService
    ) {
        super({
            maxOpenFiles: 100,
            cleanupInterval: 60000
        });
    }

    public async readFile(
        path: string
    ): Promise<string> {
        // Check storage first
        const cached = await this.storage.get(path);
        if (cached) return cached;

        // Read from file system
        const content = await super.readFile(path);
        
        // Cache content
        await this.storage.set(path, content);
        
        return content;
    }
}
```

## Event Integration

### Event System
```typescript
// Custom event handler
class EventHandler {
    constructor(
        private readonly agent: Agent,
        private readonly logger: Logger
    ) {
        this.setupHandlers();
    }

    private setupHandlers(): void {
        // Handle agent events
        this.agent.on("message", this.handleMessage);
        this.agent.on("error", this.handleError);

        // Handle system events
        process.on("SIGINT", this.handleShutdown);
        process.on("uncaughtException", this.handleError);
    }

    private handleMessage = async (
        message: Message
    ): Promise<void> => {
        await this.logger.info("Message received", {
            id: message.id,
            type: message.type
        });
    };

    private handleError = async (
        error: Error
    ): Promise<void> => {
        await this.logger.error("Error occurred", {
            error
        });
    };

    private handleShutdown = async (): Promise<void> => {
        await this.agent.shutdown();
        process.exit(0);
    };
}
```

## Monitoring Integration

### Metrics Collection
```typescript
// Custom metrics collector
class MetricsCollector {
    constructor(
        private readonly agent: Agent,
        private readonly metrics: MetricsService
    ) {
        this.startCollection();
    }

    private startCollection(): void {
        // Collect agent metrics
        setInterval(async () => {
            const metrics = await this.agent.getMetrics();
            await this.metrics.record("agent", metrics);
        }, 60000);

        // Collect memory metrics
        setInterval(async () => {
            const usage = await Deno.memoryUsage();
            await this.metrics.record("memory", usage);
        }, 60000);
    }
}
```

### Logging Integration
```typescript
// Custom logger
class CustomLogger extends Logger {
    constructor(
        private readonly logService: LogService
    ) {
        super({
            source: "CustomLogger",
            level: "info"
        });
    }

    public async log(
        level: string,
        message: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        await super.log(level, message, context);
        await this.logService.send({
            level,
            message,
            context,
            timestamp: Date.now()
        });
    }
}
```

## Security Integration

### Authentication
```typescript
// Custom auth provider
class AuthProvider {
    constructor(
        private readonly security: SecurityContext
    ) {}

    public async authenticate(
        token: string
    ): Promise<void> {
        const valid = await this.validateToken(token);
        if (!valid) {
            throw new SecurityError("Invalid token");
        }

        await this.security.setPrincipal(
            await this.getPrincipal(token)
        );
    }

    private async validateToken(
        token: string
    ): Promise<boolean> {
        // Token validation logic
        return true;
    }
}
```

### Authorization
```typescript
// Custom permission checker
class PermissionChecker {
    constructor(
        private readonly security: SecurityContext
    ) {}

    public async checkPermission(
        action: string,
        resource: string
    ): Promise<boolean> {
        const principal = await this.security.getPrincipal();
        const permissions = await this.getPermissions(
            principal
        );

        return permissions.includes(
            `${action}:${resource}`
        );
    }
}
```

This integration guide provides:
- System integration patterns
- External system integration
- Resource management
- Event handling
- Monitoring setup
- Security integration

The guide ensures:
- Proper integration
- Resource management
- Security compliance
- Performance monitoring
- Error handling
