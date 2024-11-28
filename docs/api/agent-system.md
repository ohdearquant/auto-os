# Agent System API

## Core Agent Interfaces

### Base Agent Interface
```typescript
interface IAgent {
    readonly id: string;
    readonly name: string;
    readonly type: AgentType;
    
    /** Agent configuration and initialization */
    configure(config: AgentConfig): Promise<void>;
    initialize(): Promise<void>;
    
    /** Core message handling */
    sendMessage(message: Message, recipient: IAgent): Promise<MessageResponse>;
    receiveMessage(message: Message, sender: IAgent): Promise<void>;
    
    /** State management */
    getState(): AgentState;
    setState(state: Partial<AgentState>): Promise<void>;
}

type AgentType = "base" | "conversable" | "assistant" | "userProxy" | "custom";

interface AgentConfig {
    name: string;
    systemMessage?: string;
    description?: string;
    llmConfig?: LLMConfig | false;
    maxConsecutiveAutoReply?: number;
    humanInputMode?: "ALWAYS" | "NEVER" | "TERMINATE";
    permissions?: PermissionSet;
}
```

### Conversable Agent Interface
```typescript
interface IConversableAgent extends IAgent {
    /** Function/Tool Registration */
    registerFunction(func: FunctionDefinition): void;
    registerTool(tool: ToolDefinition): void;
    
    /** Message Generation */
    generateReply(
        messages: Message[],
        sender: IAgent
    ): Promise<Message | null>;
    
    /** Function Execution */
    executeFunctionCall(
        functionCall: FunctionCall
    ): Promise<FunctionResponse>;
}

interface FunctionDefinition {
    name: string;
    description: string;
    parameters: JSONSchema;
    returns: JSONSchema;
    handler: (...args: unknown[]) => Promise<unknown>;
    permissions?: PermissionSet;
}

interface ToolDefinition {
    name: string;
    description: string;
    parameters: JSONSchema;
    handler: (params: Record<string, unknown>) => Promise<unknown>;
    permissions?: PermissionSet;
}
```

## Function & Tool System

### Function Call Interface
```typescript
interface FunctionCall {
    name: string;
    arguments: Record<string, unknown>;
    metadata?: {
        caller: string;
        timestamp: number;
        context?: Record<string, unknown>;
    };
}

interface FunctionResponse {
    result: unknown;
    error?: Error;
    metadata: {
        executionTime: number;
        resourceUsage?: ResourceUsage;
    };
}
```

## State Management

### Agent State Interface
```typescript
interface AgentState {
    status: "idle" | "busy" | "error";
    context: Record<string, unknown>;
    history: Message[];
    resources: ResourceUsage;
    metadata: {
        lastActive: number;
        errorCount: number;
        successCount: number;
    };
}

interface ResourceUsage {
    memory: number;
    cpu: number;
    network: {
        requests: number;
        bandwidth: number;
    };
}
