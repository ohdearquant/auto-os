/**
 * LLM integration tests
 * @module tests/llm
 */

import { 
    assertEquals, 
    assertThrows,
    assertExists 
} from "https://deno.land/std/testing/asserts.ts";
import { OpenAIProvider } from "../../src/llm/openai_provider.ts";
import { ModelManager } from "../../src/llm/model_manager.ts";
import { 
    Message,
    LLMConfig,
    ValidationError,
    LLMProvider 
} from "../../src/types/mod.ts";
import { 
    createMockMessage,
    createMockSecurityContext
} from "../utils/test_utils.ts";

const createTestConfig = (
    partial?: Partial<LLMConfig>
): LLMConfig => ({
    id: crypto.randomUUID(),
    name: "test-model",
    provider: "openai" as LLMProvider,
    model: "gpt-4",
    apiConfig: {
        apiKey: "test-key"
    },
    parameters: {
        temperature: 0.7,
        maxTokens: 100
    },
    ...partial
});

// Store original fetch for cleanup
const originalFetch = globalThis.fetch;

function mockFetch(response: unknown) {
    globalThis.fetch = async () => new Response(
        JSON.stringify(response)
    );
}

function restoreFetch() {
    globalThis.fetch = originalFetch;
}

Deno.test("LLM Integration", async (t) => {
    const security = createMockSecurityContext();
    
    await t.step("Model Manager Registration", async () => {
        const manager = new ModelManager(security);
        
        await manager.registerProvider(createTestConfig());
        const provider = manager.getProvider("openai");
        assertEquals(provider instanceof OpenAIProvider, true);
    });

    await t.step("Model Manager Validation", async () => {
        const manager = new ModelManager(security);

        // Invalid config - missing provider
        await assertThrows(
            () => manager.registerProvider({
                ...createTestConfig(),
                provider: "invalid" as LLMProvider
            }),
            ValidationError,
            "Provider and model required"
        );

        // Invalid config - missing API key
        await assertThrows(
            () => manager.registerProvider({
                ...createTestConfig(),
                apiConfig: { apiKey: "" }
            }),
            ValidationError,
            "API key required"
        );

        // Invalid config - Azure missing endpoint
        await assertThrows(
            () => manager.registerProvider({
                ...createTestConfig(),
                provider: "azure" as LLMProvider
            }),
            ValidationError,
            "Azure requires endpoint and deployment"
        );
    });

    await t.step("OpenAI Provider Completion", async () => {
        const provider = new OpenAIProvider(
            createTestConfig(),
            security
        );

        // Mock successful response
        mockFetch({
            choices: [{
                message: {
                    content: "Hello! How can I help you?",
                    role: "assistant"
                },
                finish_reason: "stop"
            }],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 8,
                total_tokens: 18
            },
            model: "gpt-4"
        });

        const response = await provider.complete([createMockMessage()]);
        
        assertEquals(response.content, "Hello! How can I help you?");
        assertEquals(response.metadata.provider, "openai");
        assertEquals(response.metadata.model, "gpt-4");
        assertExists(response.metadata.latency);
        
        restoreFetch();
    });

    await t.step("OpenAI Provider Error Handling", async () => {
        const provider = new OpenAIProvider(
            createTestConfig(),
            security
        );

        // Mock API error
        mockFetch({
            error: {
                message: "Invalid API key",
                type: "invalid_request_error"
            }
        });

        await assertThrows(
            () => provider.complete([createMockMessage()]),
            Error,
            "OpenAI API error"
        );

        restoreFetch();
    });

    await t.step("Rate Limiting", async () => {
        const provider = new OpenAIProvider(
            createTestConfig(),
            security
        );

        // Mock rate limit response
        mockFetch({
            error: {
                message: "Rate limit exceeded"
            }
        });

        await assertThrows(
            () => provider.complete([createMockMessage()]),
            Error,
            "Rate limit exceeded"
        );

        restoreFetch();
    });

    await t.step("Message Validation", async () => {
        const provider = new OpenAIProvider(
            createTestConfig(),
            security
        );

        // Empty messages array
        await assertThrows(
            () => provider.complete([]),
            ValidationError,
            "Empty message array"
        );

        // Invalid message format
        await assertThrows(
            () => provider.complete([{
                ...createMockMessage(),
                content: null
            } as Message]),
            ValidationError,
            "Invalid message format"
        );
    });
});
