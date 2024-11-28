/**
 * Base agent tests
 * @module tests/agent
 */

import {
    assertEquals,
    assertNotEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { Agent } from "../../src/agent/base.ts";
import { ValidationError, MessageProcessingError } from "../../src/agent/errors.ts";
import { createMockMessage, createMockAgentConfig } from "../utils/test_utils.ts";
import type { Message } from "../../types/mod.ts";

class TestableAgent extends Agent {
    protected async handleSystemMessage(message: Message): Promise<Message> {
        return createMockMessage({
            role: "assistant",
            content: "System message handled",
            metadata: {
                senderId: this.config.id,
                recipientId: message.metadata.senderId,
                conversationId: message.metadata.conversationId,
                timestamp: Date.now()
            }
        });
    }

    protected async handleUserMessage(message: Message): Promise<Message> {
        return createMockMessage({
            role: "assistant",
            content: "User message handled",
            metadata: {
                senderId: this.config.id,
                recipientId: message.metadata.senderId,
                conversationId: message.metadata.conversationId,
                timestamp: Date.now()
            }
        });
    }

    protected async handleFunctionMessage(message: Message): Promise<Message> {
        return createMockMessage({
            role: "assistant",
            content: "Function message handled",
            metadata: {
                senderId: this.config.id,
                recipientId: message.metadata.senderId,
                conversationId: message.metadata.conversationId,
                timestamp: Date.now()
            }
        });
    }

    protected async handleToolMessage(message: Message): Promise<Message> {
        return createMockMessage({
            role: "assistant",
            content: "Tool message handled",
            metadata: {
                senderId: this.config.id,
                recipientId: message.metadata.senderId,
                conversationId: message.metadata.conversationId,
                timestamp: Date.now()
            }
        });
    }
}

Deno.test("Agent - Configuration", async (t) => {
    await t.step("validates required config fields", () => {
        assertRejects(
            () => new TestableAgent({ name: "", type: "base" }),
            ValidationError,
            "Agent name is required"
        );
    });

    await t.step("generates unique ID if not provided", () => {
        const agent1 = new TestableAgent(createMockAgentConfig());
        const agent2 = new TestableAgent(createMockAgentConfig());
        assertNotEquals(agent1.config.id, agent2.config.id);
    });

    await t.step("uses provided ID if available", () => {
        const id = crypto.randomUUID();
        const agent = new TestableAgent(createMockAgentConfig({ id }));
        assertEquals(agent.config.id, id);
    });
});

Deno.test("Agent - Message Handling", async (t) => {
    const agent = new TestableAgent(createMockAgentConfig());

    await t.step("handles system messages", async () => {
        const message = createMockMessage({ role: "system" });
        const result = await agent.receiveMessage(message);
        assertEquals(result.success, true);
        assertEquals(result.value?.content, "System message handled");
    });

    await t.step("handles user messages", async () => {
        const message = createMockMessage({ role: "user" });
        const result = await agent.receiveMessage(message);
        assertEquals(result.success, true);
        assertEquals(result.value?.content, "User message handled");
    });

    await t.step("handles function messages", async () => {
        const message = createMockMessage({ role: "function" });
        const result = await agent.receiveMessage(message);
        assertEquals(result.success, true);
        assertEquals(result.value?.content, "Function message handled");
    });

    await t.step("handles tool messages", async () => {
        const message = createMockMessage({ role: "tool" });
        const result = await agent.receiveMessage(message);
        assertEquals(result.success, true);
        assertEquals(result.value?.content, "Tool message handled");
    });

    await t.step("rejects invalid messages", async () => {
        const invalidMessage = createMockMessage({ role: "invalid" as any });
        const result = await agent.receiveMessage(invalidMessage);
        assertEquals(result.success, false);
        assertExists(result.error);
    });
});

Deno.test("Agent - Message History", async (t) => {
    const agent = new TestableAgent(createMockAgentConfig());

    await t.step("maintains message history", async () => {
        const message = createMockMessage();
        await agent.receiveMessage(message);
        const history = agent.getMessageHistory();
        assertEquals(history.length, 2); // Original message + response
        assertEquals(history[0].id, message.id);
    });

    await t.step("clears message history", async () => {
        await agent.receiveMessage(createMockMessage());
        await agent.clearMessageHistory();
        const history = agent.getMessageHistory();
        assertEquals(history.length, 0);
    });
});

Deno.test("Agent - State Management", async (t) => {
    const agent = new TestableAgent(createMockAgentConfig());

    await t.step("tracks message count", async () => {
        const initialCount = agent.getState().messageCount;
        await agent.receiveMessage(createMockMessage());
        assertEquals(agent.getState().messageCount, initialCount + 2); // Message + response
    });

    await t.step("updates last activity", async () => {
        const beforeTime = Date.now();
        await agent.receiveMessage(createMockMessage());
        const state = agent.getState();
        assert(state.lastActivity >= beforeTime);
    });

    await t.step("resets state", async () => {
        await agent.receiveMessage(createMockMessage());
        await agent.reset();
        const state = agent.getState();
        assertEquals(state.messageCount, 0);
        assertEquals(state.status, "idle");
    });
});

Deno.test("Agent - Lifecycle", async (t) => {
    const agent = new TestableAgent(createMockAgentConfig());

    await t.step("starts in idle state", () => {
        assertEquals(agent.getState().status, "idle");
    });

    await t.step("becomes busy during processing", async () => {
        const messagePromise = agent.receiveMessage(createMockMessage());
        assertEquals(agent.getState().status, "busy");
        await messagePromise;
    });

    await t.step("returns to idle after processing", async () => {
        await agent.receiveMessage(createMockMessage());
        assertEquals(agent.getState().status, "idle");
    });

    await t.step("terminates properly", async () => {
        await agent.terminate();
        assertEquals(agent.getState().status, "terminated");
        const result = await agent.receiveMessage(createMockMessage());
        assertEquals(result.success, false);
    });
});
