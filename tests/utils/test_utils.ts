/**
 * Test utilities for the DenoAgents Framework
 * @module test/utils
 */

import type { 
    Agent,
    Message,
    MessageMetadata,
    AgentConfig,
    LLMConfig,
    FunctionDefinition,
    Result,
    SecurityContext,
    AgentType
} from "../../src/types/mod.ts";

/**
 * Creates a mock message for testing
 */
export function createMockMessage(
    partial: Partial<Message> = {}
): Message {
    const metadata: MessageMetadata = {
        senderId: partial.metadata?.senderId ?? "test-sender",
        recipientId: partial.metadata?.recipientId ?? "test-recipient",
        conversationId: partial.metadata?.conversationId ?? "test-conversation",
        timestamp: partial.metadata?.timestamp ?? Date.now(),
        parentMessageId: partial.metadata?.parentMessageId,
        metadata: partial.metadata?.metadata
    };

    return {
        id: partial.id ?? crypto.randomUUID(),
        role: partial.role ?? "user",
        content: partial.content ?? "Test message",
        name: partial.name,
        timestamp: partial.timestamp ?? Date.now(),
        function_call: partial.function_call,
        tool_calls: partial.tool_calls,
        metadata
    };
}

/**
 * Creates a mock agent config for testing
 */
export function createMockAgentConfig(
    partial: Partial<AgentConfig> = {}
): AgentConfig {
    return {
        id: partial.id ?? crypto.randomUUID(),
        name: partial.name ?? `test-agent-${crypto.randomUUID()}`,
        type: (partial.type ?? "base") as AgentType,
        systemMessage: partial.systemMessage,
        llmConfig: partial.llmConfig,
        maxConsecutiveAutoReply: partial.maxConsecutiveAutoReply,
        humanInputMode: partial.humanInputMode,
        permissions: partial.permissions,
        metadata: partial.metadata
    };
}

/**
 * Creates a mock LLM config for testing
 */
export function createMockLLMConfig(
    partial: Partial<LLMConfig> = {}
): LLMConfig {
    return {
        provider: partial.provider ?? "openai",
        model: partial.model ?? "gpt-4",
        apiConfig: {
            apiKey: partial.apiConfig?.apiKey ?? "test-key",
            organization: partial.apiConfig?.organization,
            endpoint: partial.apiConfig?.endpoint
        },
        parameters: partial.parameters,
        rateLimit: partial.rateLimit
    };
}

/**
 * Creates a mock function definition for testing
 */
export function createMockFunctionDefinition<T extends Record<string, unknown>>(
    name = "test-function",
    handler: (params: T) => unknown = async () => "test-result"
): FunctionDefinition<T> {
    return {
        name,
        description: "Test function",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        returns: { type: "string" },
        handler
    };
}

/**
 * Creates a mock security context for testing
 */
export function createMockSecurityContext(): SecurityContext {
    return {
        principal: "test-principal",
        scope: "test-scope",
        context: {},
        timestamp: Date.now(),
        async checkPermission(
            _action: string,
            _context?: Record<string, unknown>
        ): Promise<boolean> {
            return true;
        }
    };
}

/**
 * Creates a mock LLM response for testing
 */
export function createMockLLMResponse(
    content = "Test response"
): Result<Message> {
    return {
        success: true,
        value: createMockMessage({
            role: "assistant",
            content
        })
    };
}

/**
 * Test agent implementation for testing
 */
export class TestAgent implements Agent {
    constructor(readonly config: AgentConfig) {}

    async sendMessage(message: Message): Promise<Result<Message>> {
        return {
            success: true,
            value: createMockMessage({
                role: "assistant",
                content: `Response to: ${message.content}`,
                metadata: {
                    senderId: this.config.id,
                    recipientId: message.metadata.senderId,
                    conversationId: message.metadata.conversationId,
                    timestamp: Date.now()
                }
            })
        };
    }

    async receiveMessage(message: Message): Promise<Result<Message>> {
        return {
            success: true,
            value: createMockMessage({
                role: "assistant", 
                content: `Received: ${message.content}`,
                metadata: {
                    senderId: this.config.id,
                    recipientId: message.metadata.senderId,
                    conversationId: message.metadata.conversationId,
                    timestamp: Date.now()
                }
            })
        };
    }

    async reset(): Promise<void> {
        // No-op for testing
    }

    async terminate(): Promise<void> {
        // No-op for testing
    }
}

/**
 * Asserts that a promise rejects with a specific error
 */
export async function assertRejects(
    promise: Promise<unknown>,
    errorClass: new (...args: any[]) => Error,
    message?: string
): Promise<void> {
    let error: Error | undefined;
    try {
        await promise;
    } catch (e) {
        error = e instanceof Error ? e : new Error(String(e));
    }
    if (!error) {
        throw new Error("Expected promise to reject");
    }
    if (!(error instanceof errorClass)) {
        throw new Error(`Expected error to be instance of ${errorClass.name}`);
    }
    if (message && error.message !== message) {
        throw new Error(`Expected error message "${message}" but got "${error.message}"`);
    }
}

/**
 * Waits for a specified condition to be true
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 1000,
    interval = 10
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Timeout waiting for condition");
}
