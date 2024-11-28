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
/**
 * System integration tests
 * @module tests/integration
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { Agent } from "../../src/agent/base.ts";
import { LLMProvider } from "../../src/llm/provider.ts";
import { ChatManager } from "../../src/chat/manager.ts";
import { FunctionRegistry } from "../../src/agent/function_registry.ts";
import { SecurityManager } from "../../src/utils/security.ts";
import { MemoryManager } from "../../src/utils/memory_manager.ts";
import { ValidationError } from "../../src/agent/errors.ts";
import type { Message, SecurityContext } from "../../src/types/mod.ts";

Deno.test("Agent-LLM Integration", async (t) => {
    const security = new SecurityManager();
    const memory = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 50
    });

    const context: SecurityContext = {
        principal: "test-agent",
        scope: "test",
        permissions: {
            "llm:access": true,
            "memory:allocate": true
        },
        timestamp: Date.now()
    };

    await security.grantPermissions(context);

    const llm = new LLMProvider({
        provider: "openai",
        model: "gpt-4",
        apiConfig: {
            apiKey: "test-key"
        }
    }, security);

    const agent = new Agent({
        id: "test-agent",
        llm,
        security,
        memory
    });

    await t.step("processes messages through LLM", async () => {
        const message: Message = {
            id: "test-msg",
            role: "user",
            content: "Hello",
            metadata: {
                senderId: "user",
                recipientId: "test-agent",
                conversationId: "test-conv",
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        const response = await agent.processMessage(message);
        assertExists(response);
        assertEquals(response.role, "assistant");
    });

    await t.step("manages memory during processing", async () => {
        const initialStats = await memory.getStats();
        
        await agent.processMessage({
            id: "test-msg-2",
            role: "user",
            content: "Process this with memory usage",
            metadata: {
                senderId: "user",
                recipientId: "test-agent",
                conversationId: "test-conv",
                timestamp: Date.now()
            },
            timestamp: Date.now()
        });

        const finalStats = await memory.getStats();
        assertEquals(finalStats.allocated > initialStats.allocated, true);
    });
});

Deno.test("Chat-Function Integration", async (t) => {
    const security = new SecurityManager();
    const registry = new FunctionRegistry();
    const chatManager = new ChatManager(security);

    await t.step("executes functions in chat context", async () => {
        await registry.register({
            name: "test_function",
            description: "Test function",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string" }
                }
            },
            handler: async (input: string) => `Processed: ${input}`
        });

        const chat = await chatManager.createChat("direct", {
            id: "test-chat",
            security
        });

        await chat.addParticipant("agent1");
        await chat.addParticipant("agent2");

        const message: Message = {
            id: "test-msg",
            role: "user",
            content: null,
            function_call: {
                name: "test_function",
                arguments: JSON.stringify({ input: "test" })
            },
            metadata: {
                senderId: "agent1",
                recipientId: "agent2",
                conversationId: "test-chat",
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        await chat.sendMessage(message);
        const history = chat.getHistory();
        assertEquals(history.length, 2);
        assertEquals(
            history[1].content?.includes("Processed: test"),
            true
        );
    });
});

Deno.test("Security-Resource Integration", async (t) => {
    const security = new SecurityManager();
    const memory = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 10
    });

    await t.step("enforces resource limits", async () => {
        const context: SecurityContext = {
            principal: "test-user",
            scope: "resources",
            permissions: {
                "memory:allocate": true
            },
            limits: {
                memory: 1024 * 1024 // 1MB
            },
            timestamp: Date.now()
        };

        await security.grantPermissions(context);

        // Allocate within limits
        const block = await memory.allocate(1024);
        assertExists(block);

        // Try to exceed limits
        await assertRejects(
            () => memory.allocate(1024 * 1024 * 2),
            ValidationError,
            "Memory limit exceeded"
        );
    });

    await t.step("tracks resource usage", async () => {
        const stats = await memory.getStats();
        assertEquals(stats.allocated > 0, true);
        assertEquals(stats.allocated <= stats.limit, true);
    });
});

Deno.test("System Performance", async (t) => {
    const security = new SecurityManager();
    const memory = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 100
    });
    const chatManager = new ChatManager(security);

    await t.step("handles concurrent operations", async () => {
        const context: SecurityContext = {
            principal: "test-system",
            scope: "performance",
            permissions: {
                "chat:create": true,
                "memory:allocate": true
            },
            timestamp: Date.now()
        };

        await security.grantPermissions(context);

        const operations = await Promise.all([
            chatManager.createChat("direct", {
                id: "chat-1",
                security
            }),
            chatManager.createChat("direct", {
                id: "chat-2",
                security
            }),
            memory.allocate(1024),
            memory.allocate(2048)
        ]);

        assertEquals(operations.length, 4);
        assertEquals(operations.every(op => op !== null), true);
    });

    await t.step("maintains system stability", async () => {
        const initialMemory = await memory.getStats();
        const chats = chatManager.listChats();

        // Cleanup resources
        for (const chat of chats) {
            await chatManager.removeChat(chat.id);
        }

        const finalMemory = await memory.getStats();
        assertEquals(
            finalMemory.allocated <= initialMemory.allocated,
            true
        );
    });
});
