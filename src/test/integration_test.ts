/**
 * Integration test suite
 * @module test/integration
 */

import {
    assertEquals,
    assertExists
} from "https://deno.land/std/testing/asserts.ts";
import {
    BaseAgent,
    ConversableAgent,
    DirectChat,
    ModelManager,
    FunctionRegistry
} from "../mod.ts";
import { createTestContext } from "./setup.ts";

Deno.test("Component Integration", async (t) => {
    await t.step("Agent with Chat System", async () => {
        // Setup components
        const agent1 = new ConversableAgent({
            id: "agent1",
            name: "Agent 1",
            type: "conversable",
            security: createTestContext()
        });

        const agent2 = new ConversableAgent({
            id: "agent2",
            name: "Agent 2",
            type: "conversable",
            security: createTestContext()
        });

        const chat = new DirectChat({
            id: "test-chat",
            security: createTestContext()
        });

        // Test integration
        await chat.addParticipant(agent1.getId());
        await chat.addParticipant(agent2.getId());

        const message = {
            id: crypto.randomUUID(),
            role: "user",
            content: "Hello",
            metadata: {
                senderId: agent1.getId(),
                recipientId: agent2.getId(),
                conversationId: chat.getId(),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        await chat.sendMessage(message);
        
        assertEquals(chat.getHistory().length, 1);
        assertEquals(
            chat.getHistory()[0].metadata.senderId,
            agent1.getId()
        );
    });

    await t.step("Agent with LLM Integration", async () => {
        const manager = new ModelManager(createTestContext());
        
        await manager.registerProvider({
            provider: "openai",
            model: "gpt-4",
            apiConfig: {
                apiKey: "test-key"
            }
        });

        const agent = new ConversableAgent({
            id: "llm-agent",
            name: "LLM Agent",
            type: "conversable",
            security: createTestContext(),
            llmConfig: {
                provider: "openai",
                model: "gpt-4"
            }
        });

        const response = await agent.generateResponse(
            "Hello, how are you?"
        );

        assertExists(response);
        assertEquals(typeof response.content, "string");
    });

    await t.step("Function Registration and Execution", async () => {
        const registry = new FunctionRegistry(
            createTestContext()
        );

        const agent = new ConversableAgent({
            id: "func-agent",
            name: "Function Agent",
            type: "conversable",
            security: createTestContext()
        });

        // Register function
        await registry.registerFunction({
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

        // Execute function
        const result = await agent.executeFunction(
            "test_function",
            ["hello"]
        );

        assertEquals(result, "HELLO");
    });

    await t.step("Security Integration", async () => {
        const agent = new ConversableAgent({
            id: "secure-agent",
            name: "Secure Agent",
            type: "conversable",
            security: createTestContext()
        });

        // Test permission enforcement
        await agent.security.enforcePermissions(
            "send_message",
            "recipient-id"
        );

        // Test rate limiting
        await agent.security.enforceRateLimit(
            "send_message",
            100,
            60000
        );

        // Test input validation
        const message = {
            id: crypto.randomUUID(),
            role: "user",
            content: "Hello",
            metadata: {
                senderId: agent.getId(),
                recipientId: "recipient",
                conversationId: "test",
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        await agent.validator.validateInput(message);
    });

    await t.step("Performance Integration", async () => {
        const agent = new ConversableAgent({
            id: "perf-agent",
            name: "Performance Agent",
            type: "conversable",
            security: createTestContext(),
            limits: {
                memory: 100 * 1024 * 1024,
                cpu: 1000
            }
        });

        // Test resource monitoring
        const result = await agent.optimizer.monitor(async () => {
            return "test";
        });

        assertEquals(result, "test");

        // Test batch processing
        const items = ["a", "b", "c"];
        const results = await agent.optimizer.processBatch(
            items,
            async (item: string) => item.toUpperCase(),
            2
        );

        assertEquals(results, ["A", "B", "C"]);

        // Get performance metrics
        const metrics = agent.optimizer.getMetrics();
        assertExists(metrics.averageLatency);
        assertExists(metrics.averageMemory);
        assertExists(metrics.peakMemory);
    });
});
