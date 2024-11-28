/**
 * Integration tests for the DenoAgents Framework
 * @module tests/integration
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { createMockMessage, createMockAgentConfig, TestAgent } from "../utils/test_utils.ts";
import { OpenAIProvider } from "../../src/llm/openai_provider.ts";
import { ChatManager } from "../../src/chat/manager.ts";
import { ModelManager } from "../../src/llm/model_manager.ts";
import { FunctionRegistry } from "../../src/agent/function_registry.ts";
import { ValidationError } from "../../src/agent/errors.ts";
import type { Message, LLMConfig } from "../../types/mod.ts";

Deno.test("Agent-Chat Integration", async (t) => {
    const agent1 = new TestAgent(createMockAgentConfig());
    const agent2 = new TestAgent(createMockAgentConfig());
    const chatManager = new ChatManager();

    await t.step("creates chat session", async () => {
        const chat = await chatManager.createChat("direct", {
            id: "test-chat",
            name: "Test Chat"
        });
        
        await chat.addParticipant(agent1.config.id);
        await chat.addParticipant(agent2.config.id);
        
        assertEquals(chat.getParticipants().size, 2);
    });

    await t.step("exchanges messages", async () => {
        const chat = await chatManager.getChat("test-chat");
        const message = createMockMessage({
            metadata: {
                senderId: agent1.config.id,
                recipientId: agent2.config.id,
                conversationId: chat.getId()
            }
        });

        const result = await chat.sendMessage(message);
        assertEquals(result.success, true);
        assertExists(result.value);
    });

    await t.step("maintains conversation history", async () => {
        const chat = await chatManager.getChat("test-chat");
        const history = chat.getHistory();
        assertEquals(history.length > 0, true);
    });
});

Deno.test("Agent-LLM Integration", async (t) => {
    const modelManager = new ModelManager();
    const config: LLMConfig = {
        id: crypto.randomUUID(),
        name: "test-model",
        provider: "openai",
        model: "gpt-4",
        apiConfig: {
            apiKey: "test-key"
        }
    };

    await t.step("connects agent to LLM", async () => {
        await modelManager.registerProvider(config);
        const provider = modelManager.getProvider("openai");
        const agent = new TestAgent(createMockAgentConfig({
            llmConfig: config
        }));

        assertExists(provider);
        assertEquals(agent.config.llmConfig?.provider, "openai");
    });

    await t.step("processes messages through LLM", async () => {
        // Mock fetch for testing
        globalThis.fetch = async () => new Response(
            JSON.stringify({
                choices: [{
                    message: {
                        content: "LLM response",
                        role: "assistant"
                    }
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                }
            })
        );

        const provider = modelManager.getProvider("openai");
        const result = await provider.complete([createMockMessage()]);
        assertEquals(result.success, true);
        assertExists(result.value);
    });
});

Deno.test("Agent-Function Integration", async (t) => {
    const registry = new FunctionRegistry();
    const agent = new TestAgent(createMockAgentConfig());

    await t.step("registers functions with agent", () => {
        const testFunction = {
            name: "test",
            description: "Test function",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string" }
                }
            },
            handler: async (input: string) => `Result: ${input}`
        };

        registry.register(testFunction);
        assertEquals(registry.list().length, 1);
    });

    await t.step("executes functions through messages", async () => {
        const message = createMockMessage({
            function_call: {
                name: "test",
                arguments: JSON.stringify({ input: "test" })
            }
        });

        const result = await agent.receiveMessage(message);
        assertEquals(result.success, true);
        assertExists(result.value);
    });
});

Deno.test("Full System Integration", async (t) => {
    const modelManager = new ModelManager();
    const chatManager = new ChatManager();
    const registry = new FunctionRegistry();

    await t.step("initializes system components", async () => {
        // Register LLM provider
        await modelManager.registerProvider({
            id: crypto.randomUUID(),
            name: "test-model",
            provider: "openai",
            model: "gpt-4",
            apiConfig: {
                apiKey: "test-key"
            }
        });

        // Create agents
        const agent1 = new TestAgent(createMockAgentConfig({
            llmConfig: {
                id: crypto.randomUUID(),
                name: "test-model",
                provider: "openai",
                model: "gpt-4",
                apiConfig: {
                    apiKey: "test-key"
                }
            }
        }));
        const agent2 = new TestAgent(createMockAgentConfig());

        // Create chat
        const chat = await chatManager.createChat("direct", {
            id: "test-chat",
            name: "Test Chat"
        });

        await chat.addParticipant(agent1.config.id);
        await chat.addParticipant(agent2.config.id);

        // Register function
        registry.register({
            name: "test",
            description: "Test function",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string" }
                }
            },
            handler: async (input: string) => `Result: ${input}`
        });

        assertExists(modelManager.getProvider("openai"));
        assertEquals(chat.getParticipants().size, 2);
        assertEquals(registry.list().length, 1);
    });

    await t.step("processes end-to-end interaction", async () => {
        const chat = await chatManager.getChat("test-chat");
        const message = createMockMessage({
            content: "Call test function",
            function_call: {
                name: "test",
                arguments: JSON.stringify({ input: "test" })
            }
        });

        const result = await chat.sendMessage(message);
        assertEquals(result.success, true);
        assertExists(result.value);
        assertEquals(chat.getHistory().length > 0, true);
    });
});
