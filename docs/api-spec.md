# API Specification

## 1. Core Interfaces

### 1.1 Agent Interface
```typescript
interface Agent {
  // Core properties
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  
  // State management
  state: AgentState;
  memory: AgentMemory;
  
  // Core methods
  initialize(config: AgentConfig): Promise<void>;
  sendMessage(message: Message): Promise<void>;
  receiveMessage(message: Message): Promise<void>;
  executeFunction(name: string, args: unknown): Promise<unknown>;
  
  // Event handlers
  onMessage?(message: Message): Promise<void>;
  onError?(error: Error): Promise<void>;
  onStateChange?(state: AgentState): Promise<void>;
}
```

### 1.2 Chat System
```typescript
interface ChatSystem {
  // Chat management
  createChat(config: ChatConfig): Promise<Chat>;
  joinChat(chatId: string, agent: Agent): Promise<void>;
  leaveChat(chatId: string, agent: Agent): Promise<void>;
  
  // Message handling
  sendMessage(chatId: string, message: Message): Promise<void>;
  getHistory(chatId: string, options?: HistoryOptions): Promise<Message[]>;
  
  // Chat state
  getChatState(chatId: string): Promise<ChatState>;
  updateChatState(chatId: string, state: Partial<ChatState>): Promise<void>;
}

interface GroupChat extends ChatSystem {
  // Group specific features
  addModerator(chatId: string, agent: Agent): Promise<void>;
  removeModerator(chatId: string, agent: Agent): Promise<void>;
  setPolicy(chatId: string, policy: ChatPolicy): Promise<void>;
}
```

### 1.3 LLM Provider
```typescript
interface LLMProvider {
  // Configuration
  initialize(config: ProviderConfig): Promise<void>;
  validateConfig(config: ProviderConfig): Promise<boolean>;
  
  // Core functionality
  getCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  getEmbedding(text: string): Promise<number[]>;
  
  // Function calling
  registerFunction(func: FunctionDefinition): void;
  callFunction(name: string, args: unknown): Promise<unknown>;
  
  // State & monitoring
  getStats(): ProviderStats;
  getRateLimit(): RateLimitInfo;
}
```

### 1.4 Plugin System
```typescript
interface Plugin {
  // Metadata
  name: string;
  version: string;
  description: string;
  
  // Lifecycle
  install(framework: Framework): Promise<void>;
  uninstall(): Promise<void>;
  
  // Configuration
  configure(config: unknown): Promise<void>;
  validate(): Promise<boolean>;
  
  // Event handlers
  onMessage?(message: Message): Promise<void>;
  onError?(error: Error): Promise<void>;
}
```

## 2. Type Definitions

### 2.1 Message Types
```typescript
type MessageRole = "system" | "user" | "assistant" | "function";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  
  // Function calling
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    result: unknown;
  };
}
```

### 2.2 Configuration Types
```typescript
interface AgentConfig {
  name: string;
  description?: string;
  systemMessage?: string;
  llmConfig?: LLMConfig;
  maxConsecutiveAutoReply?: number;
  humanInputMode?: "ALWAYS" | "NEVER" | "TERMINATE";
}

interface ChatConfig {
  name: string;
  description?: string;
  participants: Agent[];
  moderators?: Agent[];
  policy?: ChatPolicy;
  maxParticipants?: number;
  maxHistory?: number;
}

interface LLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
```

### 2.3 State Types
```typescript
interface AgentState {
  status: "idle" | "busy" | "error";
  currentTask?: string;
  lastActive: number;
  metadata: Record<string, unknown>;
}

interface ChatState {
  status: "active" | "paused" | "terminated";
  participants: Set<string>;
  moderators: Set<string>;
  messageCount: number;
  lastMessage: number;
  metadata: Record<string, unknown>;
}
```

## 3. Events System

### 3.1 Core Events
```typescript
type EventType = 
  | "message"
  | "error"
  | "stateChange"
  | "functionCall"
  | "pluginAction";

interface Event<T = unknown> {
  type: EventType;
  source: string;
  timestamp: number;
  data: T;
  metadata?: Record<string, unknown>;
}
```

### 3.2 Event Handlers
```typescript
type EventHandler<T = unknown> = (event: Event<T>) => Promise<void>;

interface EventEmitter {
  on<T>(event: EventType, handler: EventHandler<T>): void;
  off<T>(event: EventType, handler: EventHandler<T>): void;
  emit<T>(event: Event<T>): Promise<void>;
}
```

## 4. Error Handling

### 4.1 Error Types
```typescript
class AgentError extends Error {
  code: string;
  source: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class LLMError extends AgentError {
  provider: string;
  requestId?: string;
  retryable: boolean;
}

class ChatError extends AgentError {
  chatId: string;
  participantId?: string;
}
```

### 4.2 Error Recovery
```typescript
interface ErrorHandler {
  handleError(error: AgentError): Promise<void>;
  shouldRetry(error: AgentError): boolean;
  getBackoffTime(error: AgentError, attempts: number): number;
}
```

## 5. Security

### 5.1 Authentication
```typescript
interface AuthProvider {
  authenticate(credentials: unknown): Promise<boolean>;
  authorize(action: string, context: unknown): Promise<boolean>;
  validateToken(token: string): Promise<boolean>;
}
```

### 5.2 Permissions
```typescript
interface PermissionSet {
  network: boolean;
  fileSystem: boolean;
  environment: boolean;
  plugins: boolean;
  functions: string[];
}

interface SecurityContext {
  permissions: PermissionSet;
  validateAction(action: string): Promise<boolean>;
  auditLog(action: string, context: unknown): Promise<void>;
}
