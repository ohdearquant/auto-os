# Core Agent API Specification

## 1. Agent Base Interface

```typescript
interface IAgent {
    readonly id: string;
    readonly name: string;
    readonly type: AgentType;
    
    /** Agent configuration and initialization */
    configure(config: AgentConfig): Promise<void>;
    initialize(): Promise<void>;
    
    /** Core message handling */
    async sendMessage(message: Message, recipient: IAgent): Promise<MessageResponse>;
    async receiveMessage(message: Message, sender: IAgent): Promise<void>;
    
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

## 2. Conversable Agent API

```typescript
interface IConversableAgent extends IAgent {
    /** Function/Tool Registration */
    registerFunction(func: FunctionDefinition): void;
    registerTool(tool: ToolDefinition): void;
    
    /** Message Generation */
    async generateReply(
        messages: Message[],
        sender: IAgent
    ): Promise<Message | null>;
    
    /** Function Execution */
    async executeFunctionCall(
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

## Implementation Guidelines

### Agent Lifecycle

1. **Initialization**
   - Configure agent with required parameters
   - Initialize state and resources
   - Validate permissions and configuration

2. **Message Handling**
   - Implement secure message passing
   - Handle message validation
   - Manage message flow control

3. **State Management**
   - Maintain consistent agent state
   - Handle state transitions
   - Implement state persistence if required

### Security Considerations

1. **Permission Management**
   - Validate all function/tool registrations
   - Enforce permission boundaries
   - Implement secure message handling

2. **Resource Control**
   - Monitor resource usage
   - Implement rate limiting
   - Handle resource cleanup

### Best Practices

1. **Error Handling**
   - Implement comprehensive error handling
   - Provide meaningful error messages
   - Maintain error recovery strategies

2. **Performance**
   - Optimize message processing
   - Implement efficient state management
   - Monitor and optimize resource usage
