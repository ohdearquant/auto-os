/**
 * Function system tests
 * @module test/function
 */

import {
    assertEquals
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertThrows } from "https://deno.land/std/assert/assert_throws.ts";
import { assertExists } from "https://deno.land/std/assert/assert_exists.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { FunctionRegistry } from "../agent/function_registry.ts";
import { FunctionExecutor } from "../agent/function_executor.ts";
import { createTestContext } from "./setup.ts";

Deno.test("Function System", async (t) => {
    await t.step("Function Registry", async () => {
        const registry = new FunctionRegistry(
            createTestContext(),
            { maxFunctions: 2 }
        );

        // Test function registration
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

        const func = registry.getFunction("test_function");
        assertEquals(func.name, "test_function");

        // Test function limit
        await registry.registerFunction({
            name: "test_function2",
            description: "Test function 2",
            parameters: { type: "object" },
            returns: { type: "string" },
            handler: async () => Promise.resolve("")
        });

        await assertThrows(
            () => registry.registerFunction({
                name: "test_function3",
                description: "Test function 3",
                parameters: { type: "object" },
                returns: { type: "string" },
                handler: async () => Promise.resolve("")
            }),
            Error,
            "Function limit reached"
        );
    });

    await t.step("Function Executor", async () => {
        const executor = new FunctionExecutor(
            createTestContext(),
            { memory: 100 * 1024 * 1024 }
        );

        // Test function execution
        const result = await executor.executeFunction(
            {
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
            },
            ["test"]
        );

        assertEquals(result.success, true);
        assertEquals(result.result, "TEST");
        assertExists(result.metrics);

        // Test execution error
        const errorResult = await executor.executeFunction(
            {
                name: "error_function",
                description: "Error function",
                parameters: { type: "object" },
                returns: { type: "string" },
                handler: async () => {
                    throw new Error("Test error");
                }
            },
            []
        );

        assertEquals(errorResult.success, false);
        assertExists(errorResult.error);
    });

    await t.step("Tool Registration", async () => {
        const registry = new FunctionRegistry(
            createTestContext(),
            { maxTools: 2 }
        );

        await registry.registerTool({
            name: "test_tool",
            description: "Test tool",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string" }
                }
            },
            handler: async (params: Record<string, unknown>) => {
                return `Result: ${params.query}`;
            }
        });

        const tool = registry.getTool("test_tool");
        assertEquals(tool.name, "test_tool");
    });

    await t.step("Tool Execution", async () => {
        const executor = new FunctionExecutor(
            createTestContext(),
            { memory: 100 * 1024 * 1024 }
        );

        const result = await executor.executeTool(
            {
                name: "test_tool",
                description: "Test tool",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    }
                },
                handler: async (params: Record<string, unknown>) => {
                    return `Result: ${params.query}`;
                }
            },
            { query: "test" }
        );

        assertEquals(result.success, true);
        assertEquals(result.result, "Result: test");
        assertExists(result.metrics);
    });
});
