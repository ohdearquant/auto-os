/**
 * Agent system tests
 * @module tests/agent
 */

import { assertEquals } from "https://deno.land/std/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std/assert/assert_exists.ts";
import { assert } from "https://deno.land/std/assert/assert.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { BaseAgent } from "../../src/agent/base.ts";
import { ValidationError } from "../../src/types/error.ts";
import { createMockMessage, createMockAgentConfig } from "../utils/test_utils.ts";
import type { Message, MessageMetadata } from "../../src/types/mod.ts";

class TestAgent extends BaseAgent {
    private messageHistory: Message[] = [];
    private functions = new Map<string, Function>();

    public async receiveMessage(message: Message, sender: BaseAgent): Promise<Message> {
        if (this.state.status === "terminated") {
            throw new Error("Agent is terminated");
        }

        // Verify sender exists
        if (!sender) {
            throw new ValidationError("Sender is required");
        }

        // Verify message metadata
        if (!message.metadata?.senderId) {
            throw new ValidationError("Message must have sender ID");
        }

        if (message.metadata.senderId !== sender.getId()) {
            throw new ValidationError("Invalid sender ID in message metadata");
        }

        this.state.status = "busy";
        try {
            // Validate message format
            if (!message.role || !message.content) {
                throw new ValidationError("Invalid message format");
            }

            // Store incoming message
            this.messageHistory.push(message);

            // Process message based on role
            let response: Message;
            switch (message.role) {
                case "system":
                    response = await this.handleSystemMessage(message);
                    break;
                case "user":
                    response = await this.handleUserMessage(message);
                    break;
                case "function":
                    response = await this.handleFunctionMessage(message);
                    break;
                case "tool":
                    response = await this.handleToolMessage(message);
                    break;
                default:
                    throw new ValidationError("Invalid message role");
            }

            // Store response
            this.messageHistory.push(response);
            return response;
        } finally {
            this.state.status = "idle";
        }
    }

    protected createResponse(message: Message, content: string): Message {
        if (!message.metadata?.conversationId) {
            throw new ValidationError("Message must have conversation ID");
        }

        const metadata: MessageMetadata = {
            conversationId: message.metadata.conversationId,
            senderId: this.getId(),
            recipientId: message.metadata.senderId,
            timestamp: Date.now()
        };

        return createMockMessage({
            role: "assistant",
            content,
            metadata
        });
    }

    protected async handleSystemMessage(message: Message): Promise<Message> {
        return this.createResponse(message, "System message handled");
    }

    protected async handleUserMessage(message: Message): Promise<Message> {
        return this.createResponse(message, "User message handled");
    }

    protected async handleFunctionMessage(message: Message): Promise<Message> {
        return this.createResponse(message, "Function message handled");
    }

    protected async handleToolMessage(message: Message): Promise<Message> {
        return this.createResponse(message, "Tool message handled");
    }

    public getMessageHistory(): Message[] {
        return [...this.messageHistory];
    }

    public async registerFunction(name: string, fn: Function): Promise<void> {
        if (!name || typeof fn !== "function") {
            throw new ValidationError("Invalid function registration");
        }
        this.functions.set(name, fn);
    }

    public async terminate(): Promise<void> {
        this.state.status = "terminated";
    }

    public async reset(): Promise<void> {
        this.state.messageCount = 0;
        this.state.status = "idle";
        this.messageHistory = [];
        this.functions.clear();
    }
}

Deno.test("Agent System", async (t) => {
    await t.step("Agent Creation and Configuration", async () => {
        // Test valid configuration
        const agent = new TestAgent(createMockAgentConfig());
        assertExists(agent.getId());
        assertExists(agent.getName());
        assertEquals(agent.getType(), "base");

        // Test invalid configuration
        await assertRejects(
            () => Promise.resolve(new TestAgent(createMockAgentConfig({ name: "" }))),
            ValidationError,
            "Agent name is required"
        );

        // Test unique ID generation
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());
        assert(agent1.getId() !== agent2.getId(), "Agent IDs should be unique");
    });

    await t.step("Message Exchange", async () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());

        const metadata: MessageMetadata = {
            senderId: agent1.getId(),
            recipientId: agent2.getId(),
            conversationId: crypto.randomUUID(),
            timestamp: Date.now()
        };

        // Test message exchange between agents
        const message = createMockMessage({ metadata });
        const response = await agent2.receiveMessage(message, agent1);
        
        // Verify response metadata
        assertExists(response.metadata);
        assertEquals(response.metadata.senderId, agent2.getId());
        assertEquals(response.metadata.recipientId, agent1.getId());
        assertEquals(response.metadata.conversationId, metadata.conversationId);
    });

    await t.step("Message Validation", async () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());

        // Test missing sender
        await assertRejects(
            () => agent1.receiveMessage(createMockMessage(), null as any),
            ValidationError,
            "Sender is required"
        );

        // Test missing metadata
        const invalidMessage = createMockMessage();
        invalidMessage.metadata = {} as MessageMetadata;

        await assertRejects(
            () => agent1.receiveMessage(invalidMessage, agent2),
            ValidationError,
            "Message must have sender ID"
        );

        // Test mismatched sender ID
        const badMessage = createMockMessage({
            metadata: {
                senderId: "wrong-id",
                recipientId: agent1.getId(),
                conversationId: crypto.randomUUID(),
                timestamp: Date.now()
            }
        });

        await assertRejects(
            () => agent1.receiveMessage(badMessage, agent2),
            ValidationError,
            "Invalid sender ID in message metadata"
        );
    });

    await t.step("Message History", async () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());

        const metadata: MessageMetadata = {
            senderId: agent1.getId(),
            recipientId: agent2.getId(),
            conversationId: crypto.randomUUID(),
            timestamp: Date.now()
        };

        const message = createMockMessage({ metadata });
        await agent2.receiveMessage(message, agent1);
        const history = agent2.getMessageHistory();

        assertEquals(history.length, 2); // Original message + response
        assertExists(history[0].metadata);
        assertExists(history[1].metadata);
        assertEquals(history[0].metadata.senderId, agent1.getId());
        assertEquals(history[1].metadata.senderId, agent2.getId());
    });

    await t.step("Agent State", async () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());

        const metadata: MessageMetadata = {
            senderId: agent2.getId(),
            recipientId: agent1.getId(),
            conversationId: crypto.randomUUID(),
            timestamp: Date.now()
        };

        // Test state transitions during message processing
        const messagePromise = agent1.receiveMessage(createMockMessage({ metadata }), agent2);
        assertEquals(agent1.getState().status, "busy");
        await messagePromise;
        assertEquals(agent1.getState().status, "idle");
    });

    await t.step("Agent Lifecycle", async () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());

        const metadata: MessageMetadata = {
            senderId: agent2.getId(),
            recipientId: agent1.getId(),
            conversationId: crypto.randomUUID(),
            timestamp: Date.now()
        };

        // Test message exchange
        await agent1.receiveMessage(createMockMessage({ metadata }), agent2);

        // Test termination
        await agent1.terminate();
        assertEquals(agent1.getState().status, "terminated");

        // Test message rejection after termination
        await assertRejects(
            () => agent1.receiveMessage(createMockMessage({ metadata }), agent2),
            Error,
            "Agent is terminated"
        );

        // Test reset
        await agent1.reset();
        assertEquals(agent1.getState().status, "idle");
        assertEquals(agent1.getMessageHistory().length, 0);
    });
});
