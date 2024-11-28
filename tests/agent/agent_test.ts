/**
 * Agent system tests
 * @module test/agent
 */

import {
    assertEquals,
    assertThrows,
    assertExists
} from "https://deno.land/std/testing/asserts.ts";
import { BaseAgent } from "../agent/base.ts";
import { ConversableAgent } from "../agent/conversable.ts";
import { createTestContext, createTestMessage } from "./setup.ts";

Deno.test("Agent System", async (t) => {
    await t.step("Agent Creation", () => {
        const agent = new ConversableAgent({
            id: "test-agent",
            name: "Test Agent",
            type: "conversable",
            security: createTestContext()
        });

        assertEquals(agent.getId(), "test-agent");
        assertEquals(agent.getName(), "Test Agent");
        assertEquals(agent.getType(), "conversable");
    });

    await t.step("Agent State Management", async () => {
        const agent = new ConversableAgent({
            id: "test-agent",
            name: "Test Agent",
            type: "conversable",
            security: createTestContext()
        });

        const initialState = agent.getState();
        assertEquals(initialState.messageCount, 0);
        assertEquals(initialState.status, "idle");

        // Send a message to update state
        const recipient = new ConversableAgent({
            id: "recipient",
            name: "Recipient",
            type: "conversable",
            security: createTestContext()
        });

        await agent.sendMessage(
            createTestMessage(),
            recipient
        );

        const updatedState = agent.getState();
        assertEquals(updatedState.messageCount, 1);
        assertExists(updatedState.lastActivity);
    });

    await t.step("Function Registration", async () => {
        const agent = new ConversableAgent({
            id: "test-agent",
            name: "Test Agent",
            type: "conversable",
            security: createTestContext()
        });

        await agent.registerFunction({
            name: "test_function",
            description: "Test function",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string" }
                }
            },
            returns: { type: "string" },
            handler: async (...args: unknown[]) => {
                const input = args[0] as string;
                return input.toUpperCase();
            }
        });

        const state = agent.getState();
        assertEquals(
            state.registeredFunctions.has("test_function"),
            true
        );
    });

    await t.step("Message Processing", async () => {
        const agent = new ConversableAgent({
            id: "test-agent",
            name: "Test Agent",
            type: "conversable",
            security: createTestContext()
        });

        // Test normal message
        const response = await agent.receiveMessage(
            createTestMessage(),
            new ConversableAgent({
                id: "sender",
                name: "Sender",
                type: "conversable",
                security: createTestContext()
            })
        );

        assertExists(response.id);
        assertEquals(response.role, "assistant");

        // Test function call message
        const functionResponse = await agent.receiveMessage(
            createTestMessage({
                functionCall: {
                    name: "test_function",
                    arguments: '{"input":"test"}',
                    timestamp: Date.now()
                }
            }),
            new ConversableAgent({
                id: "sender",
                name: "Sender",
                type: "conversable",
                security: createTestContext()
            })
        );

        assertEquals(functionResponse.role, "function");
    });

    await t.step("Error Handling", () => {
        // Invalid configuration
        assertThrows(
            () => new ConversableAgent({
                id: "",
                name: "",
                type: "invalid" as any,
                security: createTestContext()
            }),
            Error,
            "Invalid configuration"
        );

        // Invalid function registration
        const agent = new ConversableAgent({
            id: "test-agent",
            name: "Test Agent",
            type: "conversable",
            security: createTestContext()
        });

        assertThrows(
            () => agent.registerFunction({
                name: "",
                description: "",
                parameters: { type: "invalid" } as any,
                returns: { type: "string" },
                handler: async () => ""
            }),
            Error,
            "Invalid function definition"
        );
    });
});
