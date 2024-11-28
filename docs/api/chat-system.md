# Chat System API

## Message System

### Message Interface
```typescript
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

type MessageRole = "system" | "user" | "assistant" | "function" | "tool";

interface MessageMetadata {
    sender: string;
    recipient: string;
    conversationId: string;
    parentMessageId?: string;
    threadId?: string;
}
```

### Message Validation
```typescript
class MessageValidator {
    static validate(message: Message): ValidationResult;
    static sanitizeContent(content: string): string;
}
```

## Chat System

### Chat System Interface
```typescript
interface IChatSystem {
    /** Chat Management */
    createChat(config: ChatConfig): Promise<Chat>;
    joinChat(chatId: string, agent: IAgent): Promise<void>;
    leaveChat(chatId: string, agent: IAgent): Promise<void>;
    
    /** Message Routing */
    routeMessage(message: Message): Promise<void>;
    broadcast(message: Message, chat: Chat): Promise<void>;
    
    /** History Management */
    getHistory(chatId: string): Promise<Message[]>;
    summarizeHistory(chatId: string): Promise<string>;
}
```

### Chat Interface
```typescript
interface Chat {
    id: string;
    participants: Set<IAgent>;
    history: Message[];
    metadata: ChatMetadata;
    
    /** Chat Operations */
    sendMessage(message: Message): Promise<void>;
    addParticipant(agent: IAgent): Promise<void>;
    removeParticipant(agent: IAgent): Promise<void>;
}

interface ChatMetadata {
    created: number;
    type: "direct" | "group";
    name?: string;
    description?: string;
    settings: ChatSettings;
}

interface ChatSettings {
    maxParticipants?: number;
    historyRetention?: number;
    permissions?: ChatPermissions;
    features?: ChatFeatures;
}
```

## Message Flow System
```typescript
interface MessageFlow {
    stages: {
        submission: {
            entry: "Agent.sendMessage()",
            validation: {
                preChecks: [
                    "Message format validation",
                    "Permission verification",
                    "Rate limiting check"
                ],
                errorHandling: "ValidationError"
            },
            output: "ValidatedMessage"
        },
        routing: {
            processor: "MessageRouter",
            operations: [
                "Recipient resolution",
                "Queue management",
                "Priority handling"
            ],
            errorHandling: "RoutingError"
        },
        processing: {
            handlers: {
                llm: "LLMProvider.process()",
                function: "FunctionExecutor.execute()",
                tool: "ToolExecutor.run()"
            },
            errorHandling: "ProcessingError"
        },
        delivery: {
            validation: "DeliveryValidator",
            confirmation: "MessageConfirmation",
            errorHandling: "DeliveryError"
        }
    }
}
```

## Error Handling
```typescript
interface ChatError extends Error {
    code: ChatErrorCode;
    context: {
        chatId?: string;
        messageId?: string;
        participants?: string[];
        timestamp: number;
    };
}

type ChatErrorCode = 
    | "INVALID_MESSAGE"
    | "ROUTING_ERROR"
    | "DELIVERY_FAILED"
    | "PERMISSION_DENIED"
    | "RATE_LIMITED";
