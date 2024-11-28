/**
 * Agent-LLM integration tests
 * @module test/integration/agent_llm
 */

import {
    assertEquals
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std/assert/assert_exists.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import {
    ConversableAgent,
    ModelManager,
    OpenAIProvider
} from "../../mod.ts";
import { createTestContext } from "../setup.ts";

// Mock LLM responses
const mockLLMResponse = {
    choices: [{
        message: {
            content: "Test response",
            role: "assistant"
        }
    }],
    usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
    }
};

Deno.test("Agent-LLM Integration", async (t) => {
    const manager = new ModelManager(createTestContext());
    let agent: ConversableAgent;
    let originalFetch: typeof globalThis.fetch;

    await t.step("Setup", async () => {
        // Save original fetch
        originalFetch = globalThis.fetch;

        // Mock fetch
        globalThis.fetch = async () => new Response(
            JSON.stringify(mockLLMResponse)
        );

        await manager.registerProvider({
            provider: "openai",
            model: "gpt-4",
            apiConfig: {
                apiKey: "test-key"
            }
        });

        agent = new ConversableAgent({
            id: "llm-agent",
            name: "LLM Agent",
            type: "conversable",
            security: createTestContext(),
            llmConfig: {
                provider: "openai",
                model: "gpt-4"
            }
        });
    });

    await t.step("Response Generation", async () => {
        const response = await agent.generateResponse(
            "Test prompt"
        );

        assertExists(response);
        assertEquals(
            typeof response.content,
            "string"
        );
        assertEquals(
            response.role,
            "assistant"
        );
    });

    await t.step("Token Management", async () => {
        const usage = await agent.getTokenUsage();
        assertExists(usage);
        assertEquals(
            typeof usage.totalTokens,
            "number"
        );
        assertEquals(usage.totalTokens, 15);
    });

    await t.step("Error Handling", async () => {
        // Test API failure
        globalThis.fetch = async () => 
            new Response("", { status: 500 });

        await assertRejects(
            async () => {
                await agent.generateResponse("Test");
            },
            Error,
            "API error"
        );

        // Test rate limiting
        globalThis.fetch = async () => 
            new Response(
                JSON.stringify({
                    error: {
                        message: "Rate limit exceeded"
                    }
                }),
                { 
                    status: 429,
                    headers: {
                        "Retry-After": "5"
                    }
                }
            );

        await assertRejects(
            async () => {
                await agent.generateResponse("Test");
            },
            Error,
            "Rate limit exceeded"
        );
    });

    await t.step("Model Configuration", async () => {
        // Test model switching
        await manager.registerProvider({
            provider: "openai",
            model: "gpt-3.5-turbo",
            apiConfig: {
                apiKey: "test-key"
            }
        });

        await agent.setModel("gpt-3.5-turbo");

        // Mock successful response
        globalThis.fetch = async () => new Response(
            JSON.stringify(mockLLMResponse)
        );

        const response = await agent.generateResponse(
            "Test prompt"
        );

        assertExists(response);
    });

    await t.step("Cleanup", async () => {
        // Restore original fetch
        globalThis.fetch = originalFetch;
    });
});
