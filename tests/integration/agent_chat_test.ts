/**
 * Agent-Chat integration tests
 * @module test/integration/agent_chat
 */

import {
    assertEquals
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std/assert/assert_exists.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import {
    ConversableAgent,
    DirectChat,
    ChatManager,
    Message
} from "../../mod.ts";
import { createTestContext } from "../setup.ts";
import { createTestMessage } from "../setup.ts";

Deno.test("Agent-Chat Integration", async (t) => {
    const manager = new ChatManager(createTestContext());
    let agent1: ConversableAgent;
    let agent2: ConversableAgent;
    let chat: DirectChat;

    await t.step("Setup", async () => {
        // Initialize components
        agent1 = new ConversableAgent({
            id: "agent1",
            name: "Agent 1",
            type: "conversable",
            security: createTestContext()
        });

        agent2 = new ConversableAgent({
            id: "agent2",
            name: "Agent 2",
            type: "conversable",
            security: createTestContext()
        });

        chat = await manager.createChat("direct", {
            id: "test-chat",
            security: createTestContext()
        });
    });

    await t.step("Chat Participation", async () => {
        await chat.addParticipant(agent1.getId());
        await chat.addParticipant(agent2.getId());

        assertEquals(chat.getParticipants().length, 2);
        assertEquals(
            chat.getParticipants().includes(agent1.getId()),
            true
        );
    });

    await t.step("Message Exchange", async () => {
        const message: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: "Hello",
            metadata: {
                senderId: agent1.getId(),
                recipientId: agent2.getId(),
                conversationId: chat.getId(),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        await chat.sendMessage(message);
        
        // Verify message flow
        const history = chat.getHistory();
        assertEquals(history.length, 1);
        assertEquals(
            history[0].metadata.senderId,
            agent1.getId()
        );
    });

    await t.step("Response Generation", async () => {
        const lastMessage = chat.getHistory()[0];
        const response = await agent2.generateResponse(
            lastMessage.content
        );

        assertExists(response);
        assertEquals(
            response.metadata.recipientId,
            agent1.getId()
        );
    });

    await t.step("Error Handling", async () => {
        // Test invalid message
        await assertRejects(
            async () => {
                await chat.sendMessage({
                    ...createTestMessage(),
                    metadata: {
                        senderId: "invalid",
                        recipientId: agent2.getId(),
                        conversationId: chat.getId(),
                        timestamp: Date.now()
                    }
                });
            },
            Error,
            "Invalid sender"
        );

        // Test participant limit
        await assertRejects(
            async () => {
                await chat.addParticipant("agent3");
            },
            Error,
            "Chat at capacity"
        );

        // Test invalid recipient
        await assertRejects(
            async () => {
                await chat.sendMessage({
                    ...createTestMessage(),
                    metadata: {
                        senderId: agent1.getId(),
                        recipientId: "invalid",
                        conversationId: chat.getId(),
                        timestamp: Date.now()
                    }
                });
            },
            Error,
            "Invalid recipient"
        );
    });

    await t.step("Resource Management", async () => {
        // Test history limit
        const maxHistory = 10;
        for (let i = 0; i < maxHistory + 5; i++) {
            await chat.sendMessage({
                ...createTestMessage(),
                metadata: {
                    senderId: agent1.getId(),
                    recipientId: agent2.getId(),
                    conversationId: chat.getId(),
                    timestamp: Date.now()
                }
            });
        }

        assertEquals(
            chat.getHistory().length,
            maxHistory
        );
    });

    await t.step("Cleanup", async () => {
        await manager.removeChat(chat.getId());
        assertEquals(
            manager.listChats().length,
            0
        );
    });
});
