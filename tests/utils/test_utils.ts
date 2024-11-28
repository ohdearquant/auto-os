/**
 * Test utilities for the DenoAgents Framework
 * @module tests/utils
 */

import type { 
    Agent, 
    Message, 
    AgentConfig, 
    Result,
    MessageMetadata 
} from "../../types/mod.ts";

/**
 * Creates a mock message for testing
 */
export function createMockMessage(
    partial: Partial<Message> = {}
): Message {
    const metadata: MessageMetadata = {
        senderId: "test-sender",
        recipientId: "test-recipient",
        conversationId: "test-conversation",
        timestamp: Date.now(),
        ...partial.metadata
    };

    return {
        id: crypto.randomUUID(),
        role: "user",
        content: "Test message",
        timestamp: Date.now(),
        metadata,
        ...partial
    };
}

/**
 * Creates a mock agent config for testing
 */
export function createMockAgentConfig(
    partial: Partial<AgentConfig> = {}
): AgentConfig {
    return {
        id: crypto.randomUUID(),
        name: `test-agent-${crypto.randomUUID()}`,
        type: "base",
        ...partial
    };
}

/**
 * Test agent implementation for testing
 */
export class TestAgent implements Agent {
    constructor(readonly config: AgentConfig) {}

    async sendMessage(message: Message): Promise<Result<Message, Error>> {
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

    async receiveMessage(message: Message): Promise<Result<Message, Error>> {
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
 * Creates a mock security context for testing
 */
export function createMockSecurityContext() {
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
) {
    return {
        choices: [{
            message: {
                content,
                role: "assistant"
            },
            finish_reason: "stop"
        }],
        usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
        },
        model: "test-model"
    };
}

/**
 * Creates a mock function definition for testing
 */
export function createMockFunctionDefinition(
    name = "test-function",
    handler = async () => "test-result"
) {
    return {
        name,
        description: "Test function",
        parameters: {
            type: "object",
            properties: {
                input: { type: "string" }
            }
        },
        returns: { type: "string" },
        handler
    };
}

/**
 * Asserts that a promise rejects with a specific error
 */
export async function assertRejects(
    promise: Promise<unknown>,
    errorClass: new (...args: any[]) => Error,
    message?: string
) {
    let error: Error | undefined;
    try {
        await promise;
    } catch (e) {
        error = e;
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
