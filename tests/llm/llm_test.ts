/**
 * LLM system tests
 * @module tests/llm
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { createMockMessage, createMockLLMResponse } from "../utils/test_utils.ts";
import { OpenAIProvider } from "../../src/llm/openai_provider.ts";
import { AzureOpenAIProvider } from "../../src/llm/azure_provider.ts";
import { ModelManager } from "../../src/llm/model_manager.ts";
import { ValidationError } from "../../src/agent/errors.ts";
import type { LLMConfig } from "../../types/mod.ts";

const createTestConfig = (
    partial?: Partial<LLMConfig>
): LLMConfig => ({
    id: crypto.randomUUID(),
    name: "test-model",
    provider: "openai",
    model: "gpt-4",
    apiConfig: {
        apiKey: "test-key"
    },
    ...partial
});

Deno.test("OpenAI Provider", async (t) => {
    const provider = new OpenAIProvider(createTestConfig());

    await t.step("validates configuration", () => {
        assertRejects(
            () => new OpenAIProvider(createTestConfig({ apiConfig: { apiKey: "" } })),
            ValidationError,
            "API key required"
        );
    });

    await t.step("formats messages correctly", async () => {
        const message = createMockMessage();
        const formatted = await provider.formatMessages([message]);
        assertEquals(formatted[0].role, message.role);
        assertEquals(formatted[0].content, message.content);
    });

    await t.step("handles API responses", async () => {
        // Mock fetch for testing
        globalThis.fetch = async () => new Response(
            JSON.stringify(createMockLLMResponse())
        );

        const result = await provider.complete([createMockMessage()]);
        assertEquals(result.success, true);
        assertExists(result.value);
    });

    await t.step("handles API errors", async () => {
        // Mock fetch error
        globalThis.fetch = async () => new Response(
            JSON.stringify({ error: "API Error" }),
            { status: 400 }
        );

        const result = await provider.complete([createMockMessage()]);
        assertEquals(result.success, false);
        assertExists(result.error);
    });
});

Deno.test("Azure Provider", async (t) => {
    const config = createTestConfig({
        provider: "azure",
        apiConfig: {
            apiKey: "test-key",
            endpoint: "https://test.openai.azure.com",
            deployment: "test-deployment"
        }
    });
    const provider = new AzureOpenAIProvider(config);

    await t.step("validates Azure configuration", () => {
        assertRejects(
            () => new AzureOpenAIProvider(createTestConfig()),
            ValidationError,
            "Azure requires endpoint and deployment"
        );
    });

    await t.step("formats Azure endpoint correctly", () => {
        const endpoint = provider.getEndpoint();
        assert(endpoint.includes(config.apiConfig.endpoint));
        assert(endpoint.includes(config.apiConfig.deployment));
    });

    await t.step("handles Azure responses", async () => {
        // Mock fetch for testing
        globalThis.fetch = async () => new Response(
            JSON.stringify(createMockLLMResponse())
        );

        const result = await provider.complete([createMockMessage()]);
        assertEquals(result.success, true);
        assertExists(result.value);
    });
});

Deno.test("Model Manager", async (t) => {
    const manager = new ModelManager();

    await t.step("registers providers", async () => {
        await manager.registerProvider(createTestConfig());
        const provider = manager.getProvider("openai");
        assertExists(provider);
    });

    await t.step("validates provider registration", async () => {
        await assertRejects(
            () => manager.registerProvider(createTestConfig({ provider: "" as any })),
            ValidationError,
            "Invalid provider"
        );
    });

    await t.step("manages multiple providers", async () => {
        await manager.registerProvider(createTestConfig());
        await manager.registerProvider(createTestConfig({
            provider: "azure",
            apiConfig: {
                apiKey: "test-key",
                endpoint: "https://test.openai.azure.com",
                deployment: "test-deployment"
            }
        }));

        const openai = manager.getProvider("openai");
        const azure = manager.getProvider("azure");

        assertExists(openai);
        assertExists(azure);
        assert(openai instanceof OpenAIProvider);
        assert(azure instanceof AzureOpenAIProvider);
    });

    await t.step("handles provider errors", () => {
        assertRejects(
            () => manager.getProvider("invalid"),
            Error,
            "Provider not found"
        );
    });
});

Deno.test("Token Management", async (t) => {
    const provider = new OpenAIProvider(createTestConfig());

    await t.step("counts tokens accurately", async () => {
        const count = await provider.countTokens("Hello, world!");
        assert(count > 0);
    });

    await t.step("respects token limits", async () => {
        const config = createTestConfig({
            parameters: {
                maxTokens: 10
            }
        });
        const limitedProvider = new OpenAIProvider(config);

        // Mock fetch for testing
        globalThis.fetch = async () => new Response(
            JSON.stringify(createMockLLMResponse("Short response"))
        );

        const result = await limitedProvider.complete([createMockMessage()]);
        assertEquals(result.success, true);
        assert(result.value?.usage.completionTokens <= 10);
    });
});

Deno.test("Rate Limiting", async (t) => {
    const config = createTestConfig({
        rateLimit: {
            requestsPerMinute: 2,
            tokensPerMinute: 1000
        }
    });
    const provider = new OpenAIProvider(config);

    await t.step("enforces request rate limits", async () => {
        // Mock fetch for testing
        globalThis.fetch = async () => new Response(
            JSON.stringify(createMockLLMResponse())
        );

        await provider.complete([createMockMessage()]);
        await provider.complete([createMockMessage()]);

        await assertRejects(
            () => provider.complete([createMockMessage()]),
            Error,
            "Rate limit exceeded"
        );
    });

    await t.step("enforces token rate limits", async () => {
        const config = createTestConfig({
            rateLimit: {
                requestsPerMinute: 10,
                tokensPerMinute: 10
            }
        });
        const provider = new OpenAIProvider(config);

        // Mock fetch for testing
        globalThis.fetch = async () => new Response(
            JSON.stringify(createMockLLMResponse("Long response that exceeds token limit"))
        );

        await assertRejects(
            () => provider.complete([createMockMessage()]),
            Error,
            "Token limit exceeded"
        );
    });
});
