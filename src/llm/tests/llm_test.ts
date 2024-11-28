/**
 * LLM integration tests
 * @module llm/tests
 */

import { 
    assertEquals, 
    assertThrows,
    assertExists 
} from "https://deno.land/std/testing/asserts.ts";
import { ModelManager } from "../model_manager.ts";
import { OpenAIProvider } from "../openai_provider.ts";
import { 
    Message,
    LLMConfig,
    ValidationError 
} from "../../types/mod.ts";
import { 
    createTestSecurityContext,
    mockFetch,
    restoreFetch
} from "../../utils/test_utils.ts";

const createTestConfig = (
    partial?: Partial<LLMConfig>
): LLMConfig => ({
    provider: "openai",
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

const createTestMessage = (): Message => ({
    id: "test-message",
    role: "user",
    content: "Hello",
    metadata: {
        senderId: "user",
        recipientId: "assistant",
        conversationId: "test-conv",
        timestamp: Date.now()
    },
    timestamp: Date.now()
});

Deno.test("LLM Integration", async (t) => {
    const security = createTestSecurityContext();
    
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
                provider: ""
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
                provider: "azure"
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

        const response = await provider.complete([createTestMessage()]);
        
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
            () => provider.complete([createTestMessage()]),
            Error,
            "OpenAI API error"
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
                ...createTestMessage(),
                content: null
            }]),
            ValidationError,
            "Invalid message format"
        );
    });
});
