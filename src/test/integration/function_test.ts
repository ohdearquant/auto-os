/**
 * Function system integration tests
 * @module test/integration/function
 */

import {
    assertEquals,
    assertExists,
    assert,
    assertRejects
} from "https://deno.land/std/testing/asserts.ts";
import {
    ConversableAgent,
    FunctionRegistry,
    FunctionExecutor
} from "../../mod.ts";
import { createTestContext } from "../setup.ts";

Deno.test("Function System Integration", async (t) => {
    const registry = new FunctionRegistry(createTestContext());
    const executor = new FunctionExecutor(
        createTestContext(),
        { memory: 100 * 1024 * 1024 }
    );
    let agent: ConversableAgent;

    await t.step("Setup", async () => {
        agent = new ConversableAgent({
            id: "func-agent",
            name: "Function Agent",
            type: "conversable",
            security: createTestContext()
        });

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
    });

    await t.step("Function Execution", async () => {
        const result = await executor.executeFunction(
            registry.getFunction("test_function"),
            ["hello"]
        );

        assertEquals(result.success, true);
        assertEquals(result.result, "HELLO");
        assertExists(result.metrics);
    });

    await t.step("Agent Function Integration", async () => {
        const message = {
            id: crypto.randomUUID(),
            role: "function",
            content: null,
            functionCall: {
                name: "test_function",
                arguments: '{"input":"test"}',
                timestamp: Date.now()
            },
            metadata: {
                senderId: "system",
                recipientId: agent.getId(),
                conversationId: "test",
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };

        const response = await agent.receiveMessage(
            message,
            agent
        );

        assertExists(response);
        assertEquals(response.role, "function");
    });

    await t.step("Resource Management", async () => {
        const metrics = await executor.getMetrics();
        assertExists(metrics.memoryUsage);
        assert(metrics.memoryUsage < 100 * 1024 * 1024);
    });

    await t.step("Error Handling", async () => {
        // Test invalid function
        await assertRejects(
            async () => {
                await executor.executeFunction(
                    registry.getFunction("nonexistent"),
                    []
                );
            },
            Error,
            "Function not found"
        );

        // Test invalid arguments
        await assertRejects(
            async () => {
                await executor.executeFunction(
                    registry.getFunction("test_function"),
                    [42] // Wrong type
                );
            },
            Error,
            "Invalid arguments"
        );

        // Test function execution error
        await registry.registerFunction({
            name: "error_function",
            description: "Function that throws",
            parameters: { type: "object" },
            returns: { type: "string" },
            handler: async () => {
                throw new Error("Test error");
            }
        });

        const result = await executor.executeFunction(
            registry.getFunction("error_function"),
            []
        );

        assertEquals(result.success, false);
        assertExists(result.error);
    });

    await t.step("Performance", async () => {
        // Test batch execution
        const inputs = ["a", "b", "c", "d", "e"];
        const results = await Promise.all(
            inputs.map(input => 
                executor.executeFunction(
                    registry.getFunction("test_function"),
                    [input]
                )
            )
        );

        assertEquals(results.length, inputs.length);
        assertEquals(
            results.every(r => r.success),
            true
        );

        // Check resource usage
        const metrics = await executor.getMetrics();
        assert(
            metrics.memoryUsage < 100 * 1024 * 1024,
            "Memory usage within limits"
        );
        assert(
            metrics.cpuUsage < 1000,
            "CPU usage within limits"
        );
    });

    await t.step("Security", async () => {
        // Test permission enforcement
        await registry.registerFunction({
            name: "secure_function",
            description: "Function with permissions",
            parameters: { type: "object" },
            returns: { type: "string" },
            handler: async () => "test",
            permissions: {
                read: ["test"],
                write: false,
                net: false
            }
        });

        const result = await executor.executeFunction(
            registry.getFunction("secure_function"),
            []
        );

        assertEquals(result.success, true);

        // Test permission denial
        await registry.registerFunction({
            name: "network_function",
            description: "Function requiring network",
            parameters: { type: "object" },
            returns: { type: "string" },
            handler: async () => {
                await fetch("https://example.com");
                return "test";
            },
            permissions: {
                net: false
            }
        });

        const netResult = await executor.executeFunction(
            registry.getFunction("network_function"),
            []
        );

        assertEquals(netResult.success, false);
        assert(
            netResult.error instanceof Error &&
            netResult.error.message.includes("permission denied")
        );
    });
});
