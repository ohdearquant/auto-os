/**
 * Chat system tests
 * @module tests/chat
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { createMockMessage, createMockAgentConfig, TestAgent } from "../utils/test_utils.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Chat - Initialization", async (t) => {
    await t.step("creates chat with default config", () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());
        const chat = new Chat(agent1, agent2);
        
        assertExists(chat.getId());
        assertEquals(chat.getHistory().length, 0);
        assertEquals(chat.getParticipants().size, 2);
    });

    await t.step("applies custom configuration", () => {
        const agent1 = new TestAgent(createMockAgentConfig());
        const agent2 = new TestAgent(createMockAgentConfig());
        const config = {
            name: "TestChat",
            maxHistoryLength: 100,
            retentionPeriod: 3600000,
        };
        
        const chat = new Chat(agent1, agent2, config);
        const actualConfig = chat.getConfig();
        
        assertEquals(actualConfig.name, config.name);
        assertEquals(actualConfig.maxHistoryLength, config.maxHistoryLength);
        assertEquals(actualConfig.retentionPeriod, config.retentionPeriod);
    });
});

Deno.test("Chat - Message Exchange", async (t) => {
    const agent1 = new TestAgent(createMockAgentConfig({ name: "agent1" }));
    const agent2 = new TestAgent(createMockAgentConfig({ name: "agent2" }));
    const chat = new Chat(agent1, agent2);

    await t.step("successfully sends messages", async () => {
        const result = await chat.sendMessage(agent1.config.id, agent2.config.id, "Hello!");
        assertEquals(result.success, true);
        assertExists(result.value);
    });

    await t.step("updates chat history", async () => {
        await chat.sendMessage(agent1.config.id, agent2.config.id, "Test message");
        const history = chat.getHistory();
        assertEquals(history.length, 2); // Message + response
    });

    await t.step("rejects messages from non-participants", async () => {
        await assertRejects(
            () => chat.sendMessage("invalid", agent2.config.id, "Hello!"),
            ValidationError,
            "Participant not found: invalid"
        );
    });
});

Deno.test("Chat - History Management", async (t) => {
    const agent1 = new TestAgent(createMockAgentConfig());
    const agent2 = new TestAgent(createMockAgentConfig());
    const chat = new Chat(agent1, agent2, { maxHistoryLength: 2 });

    await t.step("respects maxHistoryLength", async () => {
        await chat.sendMessage(agent1.config.id, agent2.config.id, "1");
        await chat.sendMessage(agent1.config.id, agent2.config.id, "2");
        await chat.sendMessage(agent1.config.id, agent2.config.id, "3");
        
        const history = chat.getHistory();
        assertEquals(history.length, 2);
        assertEquals(history[history.length - 1].content.includes("3"), true);
    });

    await t.step("generates history summary", async () => {
        const summary = await chat.getHistorySummary();
        assertExists(summary);
        assertEquals(typeof summary, "string");
    });
});

Deno.test("Chat - Participant Management", async (t) => {
    const agent1 = new TestAgent(createMockAgentConfig());
    const agent2 = new TestAgent(createMockAgentConfig());
    const chat = new Chat(agent1, agent2);

    await t.step("tracks participant activity", async () => {
        const beforeTime = Date.now();
        await chat.sendMessage(agent1.config.id, agent2.config.id, "Hello");
        const participants = chat.getParticipants();
        
        for (const [, participant] of participants) {
            assert(participant.lastActive >= beforeTime);
        }
    });

    await t.step("handles participant removal", async () => {
        await chat.removeParticipant(agent1.config.id);
        assertEquals(chat.getParticipants().size, 1);
        
        await assertRejects(
            () => chat.sendMessage(agent1.config.id, agent2.config.id, "Hello"),
            ValidationError,
            "Participant not found"
        );
    });
});

Deno.test("Chat - Session Management", async (t) => {
    const agent1 = new TestAgent(createMockAgentConfig());
    const agent2 = new TestAgent(createMockAgentConfig());
    const chat = new Chat(agent1, agent2);

    await t.step("maintains session state", async () => {
        assertEquals(chat.getState().status, "active");
        assertEquals(chat.getState().messageCount, 0);
    });

    await t.step("updates session state", async () => {
        await chat.sendMessage(agent1.config.id, agent2.config.id, "Hello");
        assertEquals(chat.getState().messageCount, 2); // Message + response
    });

    await t.step("ends chat session", async () => {
        await chat.end();
        assertEquals(chat.getState().status, "ended");
        
        await assertRejects(
            () => chat.sendMessage(agent1.config.id, agent2.config.id, "Hello"),
            ValidationError,
            "Chat session has ended"
        );
    });
});

Deno.test("Chat - Error Handling", async (t) => {
    const agent1 = new TestAgent(createMockAgentConfig());
    const agent2 = new TestAgent(createMockAgentConfig());
    const chat = new Chat(agent1, agent2);

    await t.step("handles invalid messages", async () => {
        await assertRejects(
            () => chat.sendMessage(agent1.config.id, agent2.config.id, ""),
            ValidationError,
            "Message content cannot be empty"
        );
    });

    await t.step("handles participant errors", async () => {
        await assertRejects(
            () => chat.addParticipant(agent1.config.id),
            ValidationError,
            "Participant already exists"
        );
    });

    await t.step("handles state errors", async () => {
        await chat.end();
        await assertRejects(
            () => chat.addParticipant(agent1.config.id),
            ValidationError,
            "Chat session has ended"
        );
    });
});
