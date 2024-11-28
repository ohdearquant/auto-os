/**
 * Chat system tests
 * @module test/chat
 */

import {
    assertEquals,
    assertThrows,
    assertExists
} from "https://deno.land/std/testing/asserts.ts";
import { DirectChat } from "../chat/direct_chat.ts";
import { GroupChat } from "../chat/group_chat.ts";
import { ChatManager } from "../chat/manager.ts";
import { createTestContext, createTestMessage } from "./setup.ts";

Deno.test("Chat System", async (t) => {
    await t.step("Direct Chat", async () => {
        const chat = new DirectChat({
            id: "test-chat",
            security: createTestContext()
        });

        // Test participant management
        await chat.addParticipant("participant1");
        await chat.addParticipant("participant2");
        
        assertEquals(chat.getParticipants().length, 2);

        // Test message handling
        await chat.sendMessage(createTestMessage({
            metadata: {
                senderId: "participant1",
                recipientId: "participant2",
                conversationId: "test-chat",
                timestamp: Date.now()
            }
        }));

        assertEquals(chat.getHistory().length, 1);

        // Test participant limit
        await assertThrows(
            () => chat.addParticipant("participant3"),
            Error,
            "Chat at capacity"
        );
    });

    await t.step("Group Chat", async () => {
        const chat = new GroupChat({
            id: "test-group",
            security: createTestContext(),
            maxParticipants: 5,
            moderators: ["mod1"]
        });

        // Test participant management
        await chat.addParticipant("participant1");
        await chat.addParticipant("participant2");
        await chat.addParticipant("mod1");

        assertEquals(chat.getParticipants().length, 3);

        // Test message broadcasting
        await chat.sendMessage(createTestMessage({
            metadata: {
                senderId: "participant1",
                conversationId: "test-group",
                timestamp: Date.now()
            }
        }));

        assertEquals(chat.getHistory().length, 1);

        // Test moderator functions
        await chat.addModerator("participant2", "mod1");
        await assertThrows(
            () => chat.addModerator("participant1", "participant2"),
            Error,
            "Not a moderator"
        );
    });

    await t.step("Chat Manager", async () => {
        const manager = new ChatManager(createTestContext());

        // Test chat creation
        const chat = await manager.createChat("direct", {
            id: "managed-chat",
            security: createTestContext()
        });

        assertExists(chat);
        assertEquals(manager.listChats().length, 1);

        // Test message routing
        await chat.addParticipant("participant1");
        await chat.addParticipant("participant2");

        await manager.routeMessage(createTestMessage({
            metadata: {
                senderId: "participant1",
                recipientId: "participant2",
                conversationId: "managed-chat",
                timestamp: Date.now()
            }
        }));

        assertEquals(chat.getHistory().length, 1);

        // Test chat removal
        await manager.removeChat("managed-chat");
        assertEquals(manager.listChats().length, 0);
    });
});
