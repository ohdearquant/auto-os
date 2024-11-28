/**
 * System-wide integration tests
 * @module test/integration/system
 */

import {
    assertEquals,
    assertExists,
    assert
} from "https://deno.land/std/testing/asserts.ts";
import {
    ConversableAgent,
    ChatManager,
    ModelManager,
    FunctionRegistry
} from "../../mod.ts";
import { createTestContext } from "../setup.ts";

Deno.test("System Integration", async (t) => {
    // Initialize all components
    const chatManager = new ChatManager(createTestContext());
    const modelManager = new ModelManager(createTestContext());
    const functionRegistry = new FunctionRegistry(
        createTestContext()
    );

    await t.step("System Initialization", async () => {
        // Register LLM provider
        await modelManager.registerProvider({
            provider: "openai",
            model: "gpt-4",
            apiConfig: {
                apiKey: "test-key"
            }
        });

        // Register function
        await functionRegistry.registerFunction({
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

        // Create agents
        const agent1 = new ConversableAgent({
            id: "agent1",
            name: "Agent 1",
            type: "conversable",
            security: createTestContext(),
            llmConfig: {
                provider: "openai",
                model: "gpt-4"
            }
        });

        const agent2 = new ConversableAgent({
            id: "agent2",
            name: "Agent 2",
            type: "conversable",
            security: createTestContext(),
            llmConfig: {
                provider: "openai",
                model: "gpt-4"
            }
        });

        // Create chat
        const chat = await chatManager.createChat("direct", {
            id: "test-chat",
            security: createTestContext()
        });

        await chat.addParticipant(agent1.getId());
        await chat.addParticipant(agent2.getId());

        // Verify system state
        assertEquals(
            chatManager.listChats().length,
            1
        );
        assertExists(
            modelManager.getProvider("openai")
        );
        assertExists(
            functionRegistry.getFunction("test_function")
        );
    });

    await t.step("End-to-end Workflow", async () => {
        // Mock LLM responses
        globalThis.fetch = async () => new Response(
            JSON.stringify({
                choices: [{
                    message: {
                        content: "Let me help with that calculation",
                        role: "assistant",
                        function_call: {
                            name: "test_function",
                            arguments: '{"input":"calculate this"}'
                        }
                    }
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                }
            })
        );

        // Get chat
        const chat = chatManager.getChat("test-chat");
        const participants = chat.getParticipants();
        const [agent1Id, agent2Id] = participants;

        // Send initial message
        await chat.sendMessage({
            id: crypto.randomUUID(),
            role: "user",
            content: "Please help me calculate something",
            metadata: {
                senderId: agent1Id,
                recipientId: agent2Id,
                conversationId: chat.getId(),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        });

        // Verify message flow
        const history = chat.getHistory();
        assertEquals(history.length, 2);
        assertEquals(
            history[0].metadata.senderId,
            agent1Id
        );
        assertEquals(
            history[1].metadata.senderId,
            agent2Id
        );
        assert(
            history[1].functionCall !== undefined,
            "Function call present"
        );
    });

    await t.step("Error Recovery", async () => {
        // Test system recovery from various errors
        // 1. LLM error
        globalThis.fetch = async () => 
            new Response("", { status: 500 });

        const chat = chatManager.getChat("test-chat");
        const [agent1Id, agent2Id] = chat.getParticipants();

        try {
            await chat.sendMessage({
                id: crypto.randomUUID(),
                role: "user",
                content: "This should fail",
                metadata: {
                    senderId: agent1Id,
                    recipientId: agent2Id,
                    conversationId: chat.getId(),
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            });
        } catch (error) {
            assert(error instanceof Error);
            assert(
                chat.getHistory().length === 2,
                "History preserved after error"
            );
        }
    });

    await t.step("Resource Cleanup", async () => {
        // Remove chat
        await chatManager.removeChat("test-chat");
        assertEquals(
            chatManager.listChats().length,
            0
        );

        // Verify cleanup
        assert(
            modelManager.getMetrics().activeConnections === 0,
            "LLM connections closed"
        );
    });
});
