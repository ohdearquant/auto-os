/**
 * Global test setup configuration for DenoAgents Framework
 * @module test/utils/setup
 */

import { assert } from "std/testing/asserts.ts";
import { TestAgent } from "./test_utils.ts";
import type { AgentType } from "../../src/types/agent.ts";
import type { LLMConfig } from "../../src/types/config.ts";

// Configure test environment
Deno.env.set("DENO_ENV", "test");
Deno.env.set("OPENAI_API_KEY", "test-key");
Deno.env.set("AZURE_OPENAI_KEY", "test-key");

// Global test timeout (30 seconds)
const TEST_TIMEOUT = 30000;

// Global beforeAll hook
Deno.test({
    name: "[Setup] Global test configuration",
    fn: async () => {
        // Verify test environment
        assert(Deno.env.get("DENO_ENV") === "test", "Test environment not set");
        
        // Set up global mocks
        const mockLLMConfig: LLMConfig = {
            provider: "openai",
            model: "gpt-4",
            apiConfig: {
                apiKey: "test-key"
            },
            parameters: {
                temperature: 0.7,
                maxTokens: 2048
            }
        };
        
        globalThis.testAgent = new TestAgent({
            id: crypto.randomUUID(),
            name: "test-agent",
            type: "base" as AgentType,
            llmConfig: mockLLMConfig
        });

        // Configure test timeouts
        Deno.env.set("TEST_TIMEOUT", TEST_TIMEOUT.toString());
    },
    sanitizeResources: false,
    sanitizeOps: false
});

// Global afterAll hook
Deno.test({
    name: "[Cleanup] Global test cleanup",
    fn: async () => {
        // Clean up test agent
        if (globalThis.testAgent) {
            await globalThis.testAgent.terminate();
        }

        // Clean up environment variables
        Deno.env.delete("DENO_ENV");
        Deno.env.delete("OPENAI_API_KEY");
        Deno.env.delete("AZURE_OPENAI_KEY");
        Deno.env.delete("TEST_TIMEOUT");
    },
    sanitizeResources: false,
    sanitizeOps: false
});

// Test helper functions
export function getTestTimeout(): number {
    return parseInt(Deno.env.get("TEST_TIMEOUT") || TEST_TIMEOUT.toString(), 10);
}

export function getTestAgent(): TestAgent {
    if (!globalThis.testAgent) {
        throw new Error("Test agent not initialized");
    }
    return globalThis.testAgent;
}

// Declare global test agent type
declare global {
    var testAgent: TestAgent;
}
