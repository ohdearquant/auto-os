# DenoAgents Framework API Specification

## 1. Core Agent API

### 1.1 Agent Base Interface

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

### 1.2 Conversable Agent API

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

## 2. Message System API

### 2.1 Message Interface

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

/** Message Validation */
class MessageValidator {
    static validate(message: Message): ValidationResult;
    static sanitizeContent(content: string): string;
}
```

### 2.2 Chat System API

```typescript
interface IChatSystem {
    /** Chat Management */
    async createChat(config: ChatConfig): Promise<Chat>;
    async joinChat(chatId: string, agent: IAgent): Promise<void>;
    async leaveChat(chatId: string, agent: IAgent): Promise<void>;
    
    /** Message Routing */
    async routeMessage(message: Message): Promise<void>;
    async broadcast(message: Message, chat: Chat): Promise<void>;
    
    /** History Management */
    async getHistory(chatId: string): Promise<Message[]>;
    async summarizeHistory(chatId: string): Promise<string>;
}

interface Chat {
    id: string;
    participants: Set<IAgent>;
    history: Message[];
    metadata: ChatMetadata;
    
    /** Chat Operations */
    async sendMessage(message: Message): Promise<void>;
    async addParticipant(agent: IAgent): Promise<void>;
    async removeParticipant(agent: IAgent): Promise<void>;
}
```

## 3. LLM Integration API

### 3.1 Provider Interface

```typescript
interface ILLMProvider {
    /** Provider Management */
    initialize(config: ProviderConfig): Promise<void>;
    validateConfig(config: ProviderConfig): boolean;
    
    /** Request Handling */
    async complete(
        prompt: string,
        options: CompletionOptions
    ): Promise<CompletionResponse>;
    
    async chat(
        messages: Message[],
        options: ChatOptions
    ): Promise<ChatResponse>;
    
    /** Token Management */
    countTokens(text: string): number;
    validateTokenCount(text: string, max: number): boolean;
}

interface ProviderConfig {
    apiKey: string;
    model: string;
    organizationId?: string;
    endpoint?: string;
    timeout?: number;
    maxRetries?: number;
}
```

### 3.2 Response Handling

```typescript
interface CompletionResponse {
    text: string;
    usage: TokenUsage;
    metadata: ResponseMetadata;
}

interface ChatResponse {
    message: Message;
    usage: TokenUsage;
    metadata: ResponseMetadata;
}

interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
}
```

## 4. Security API

### 4.1 Permission System

```typescript
interface IPermissionSystem {
    /** Permission Management */
    grantPermission(
        entity: IAgent | Function,
        permission: Permission
    ): Promise<void>;
    
    revokePermission(
        entity: IAgent | Function,
        permission: Permission
    ): Promise<void>;
    
    /** Permission Checking */
    async checkPermission(
        entity: IAgent | Function,
        permission: Permission
    ): Promise<boolean>;
    
    /** Permission Inheritance */
    async inheritPermissions(
        source: IAgent,
        target: IAgent
    ): Promise<void>;
}

interface Permission {
    type: PermissionType;
    scope: PermissionScope;
    constraints?: PermissionConstraints;
}

type PermissionType = 
    | "network"
    | "fileSystem"
    | "functionExecution"
    | "messageAccess"
    | "stateAccess";
```

### 4.2 Sandbox API

```typescript
interface ISandbox {
    /** Sandbox Management */
    initialize(config: SandboxConfig): Promise<void>;
    
    /** Code Execution */
    async execute<T>(
        code: string,
        context: Record<string, unknown>
    ): Promise<T>;
    
    /** Resource Management */
    setResourceLimits(limits: ResourceLimits): void;
    cleanup(): Promise<void>;
}

interface SandboxConfig {
    timeout: number;
    memoryLimit: number;
    allowedModules: string[];
    environment: Record<string, string>;
}
```

## 5. Plugin System API

### 5.1 Plugin Interface

```typescript
interface IPlugin {
    /** Plugin Lifecycle */
    install(framework: Framework): Promise<void>;
    uninstall(): Promise<void>;
    
    /** Plugin Information */
    readonly name: string;
    readonly version: string;
    readonly dependencies: PluginDependency[];
    
    /** Plugin Configuration */
    configure(config: unknown): Promise<void>;
    validate(): Promise<boolean>;
}

interface PluginDependency {
    name: string;
    version: string;
    optional: boolean;
}
```

### 5.2 Plugin Manager API

```typescript
interface IPluginManager {
    /** Plugin Management */
    async loadPlugin(plugin: IPlugin): Promise<void>;
    async unloadPlugin(pluginName: string): Promise<void>;
    
    /** Plugin Discovery */
    getLoadedPlugins(): IPlugin[];
    findPlugin(name: string): IPlugin | null;
    
    /** Dependency Management */
    validateDependencies(plugin: IPlugin): Promise<boolean>;
    resolveDependencies(plugin: IPlugin): Promise<void>;
}
```

## 6. Error Handling

```typescript
/** Base Error Classes */
class DenoAgentsError extends Error {
    readonly code: ErrorCode;
    readonly context: Record<string, unknown>;
}

class ValidationError extends DenoAgentsError {}
class SecurityError extends DenoAgentsError {}
class LLMError extends DenoAgentsError {}
class PluginError extends DenoAgentsError {}

/** Error Handler */
interface ErrorHandler {
    handle(error: DenoAgentsError): Promise<void>;
    register(
        errorType: typeof DenoAgentsError,
        handler: ErrorHandler
    ): void;
}
