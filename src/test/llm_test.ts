/**
 * LLM integration tests
 * @module test/llm
 */

import {
    assertEquals,
    assertThrows,
    assertExists
} from "https://deno.land/std/testing/asserts.ts";
import { OpenAIProvider } from "../llm/openai_provider.ts";
import { ModelManager } from "../llm/model_manager.ts";
import { createTestContext, createTestMessage } from "./setup.ts";

// Mock fetch for testing
const originalFetch = globalThis.fetch;

function setupFetchMock() {
    globalThis.fetch = async () => new Response(JSON.stringify({
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
        },
        model: "gpt-4"
    }));
}

function restoreFetch() {
    globalThis.fetch = originalFetch;
}

Deno.test("LLM Integration", async (t) => {
    setupFetchMock();

    try {
        await t.step("OpenAI Provider", async () => {
            const provider = new OpenAIProvider({
                provider: "openai",
                model: "gpt-4",
                apiConfig: {
                    apiKey: "test-key"
                }
            }, createTestContext());

            const response = await provider.complete([
                createTestMessage()
            ]);

            assertEquals(response.content, "Test response");
            assertEquals(response.metadata.provider, "openai");
            assertExists(response.usage);
        });

        await t.step("Model Manager", async () => {
            const manager = new ModelManager(createTestContext());

            // Test provider registration
            await manager.registerProvider({
                provider: "openai",
                model: "gpt-4",
                apiConfig: {
                    apiKey: "test-key"
                }
            });

            const provider = manager.getProvider("openai");
            assertExists(provider);

            // Test invalid configuration
            await assertThrows(
                () => manager.registerProvider({
                    provider: "openai",
                    model: "",
                    apiConfig: { apiKey: "" }
                }),
                Error,
                "Invalid provider configuration"
            );
        });

        await t.step("Error Handling", async () => {
            const provider = new OpenAIProvider({
                provider: "openai",
                model: "gpt-4",
                apiConfig: {
                    apiKey: "test-key"
                }
            }, createTestContext());

            // Mock API error
            globalThis.fetch = async () => new Response(
                JSON.stringify({
                    error: {
                        message: "API Error"
                    }
                }),
                { status: 400 }
            );

            await assertThrows(
                () => provider.complete([createTestMessage()]),
                Error,
                "OpenAI API error"
            );
        });

        await t.step("Rate Limiting", async () => {
            const provider = new OpenAIProvider({
                provider: "openai",
                model: "gpt-4",
                apiConfig: {
                    apiKey: "test-key"
                }
            }, createTestContext());

            // Mock rate limit response
            globalThis.fetch = async () => new Response(
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

            await assertThrows(
                () => provider.complete([createTestMessage()]),
                Error,
                "Rate limit exceeded"
            );
        });
    } finally {
        restoreFetch();
    }
});
