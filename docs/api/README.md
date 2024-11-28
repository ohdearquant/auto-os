# DenoAgents Framework API Documentation

## Core APIs Overview

### Agent System API
```typescript
interface IAgent {
    readonly id: string;
    readonly name: string;
    readonly type: AgentType;
    
    configure(config: AgentConfig): Promise<void>;
    initialize(): Promise<void>;
    sendMessage(message: Message, recipient: IAgent): Promise<MessageResponse>;
    receiveMessage(message: Message, sender: IAgent): Promise<void>;
    getState(): AgentState;
    setState(state: Partial<AgentState>): Promise<void>;
}

interface IConversableAgent extends IAgent {
    registerFunction(func: FunctionDefinition): void;
    registerTool(tool: ToolDefinition): void;
    generateReply(messages: Message[], sender: IAgent): Promise<Message | null>;
    executeFunctionCall(functionCall: FunctionCall): Promise<FunctionResponse>;
}
```

### Chat System API
```typescript
interface IChatSystem {
    createChat(config: ChatConfig): Promise<Chat>;
    joinChat(chatId: string, agent: IAgent): Promise<void>;
    leaveChat(chatId: string, agent: IAgent): Promise<void>;
    routeMessage(message: Message): Promise<void>;
    broadcast(message: Message, chat: Chat): Promise<void>;
    getHistory(chatId: string): Promise<Message[]>;
    summarizeHistory(chatId: string): Promise<string>;
}

interface Message {
    id: string;
    role: MessageRole;
    content: string | null;
    name?: string;
    functionCall?: FunctionCall;
    toolCalls?: ToolCall[];
    metadata?: MessageMetadata;
    timestamp: number;
}
```

### LLM Integration API
```typescript
interface ILLMProvider {
    initialize(config: ProviderConfig): Promise<void>;
    validateConfig(config: ProviderConfig): boolean;
    complete(prompt: string, options: CompletionOptions): Promise<CompletionResponse>;
    chat(messages: Message[], options: ChatOptions): Promise<ChatResponse>;
    countTokens(text: string): number;
    validateTokenCount(text: string, max: number): boolean;
}
```

### Security API
```typescript
interface SecurityModel {
    permissions: {
        core: {
            network: {
                level: "Critical",
                scope: ["api", "llm", "external"],
                validation: "Explicit allow-list",
                default: "Deny-all"
            },
            fileSystem: {
                level: "Critical",
                scope: ["read", "write", "temp"],
                validation: "Path-based",
                default: "No access"
            }
        },
        runtime: {
            execution: {
                level: "Critical",
                scope: ["functions", "tools", "plugins"],
                validation: "Signature-based",
                default: "Sandbox-only"
            }
        }
    }
}
```

## Detailed Documentation
- [Agent System API](./agent-system.md)
- [Chat System API](./chat-system.md)
- [LLM Integration API](./llm-integration.md)
- [Security API](./security.md)
