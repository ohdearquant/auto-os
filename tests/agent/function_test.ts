/**
 * Function system tests
 * @module agent/tests
 */

import { 
    assertEquals, 
    assertThrows 
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { FunctionRegistry } from "../function_registry.ts";
import { FunctionExecutor } from "../function_executor.ts";
import { createTestSecurityContext } from "../../utils/test_utils.ts";
import { ValidationError } from "../../types/mod.ts";

Deno.test("Function System", async (t) => {
    const security = createTestSecurityContext();
    
    await t.step("Function Registration", async () => {
        const registry = new FunctionRegistry(security);
        
        await registry.registerFunction({
            name: "test",
            description: "Test function",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string" }
                },
                required: ["input"]
            },
            returns: {
                type: "string"
            },
            handler: async (input: string) => input.toUpperCase()
        });

        const func = registry.getFunction("test");
        assertEquals(func.name, "test");
        assertEquals(func.description, "Test function");
    });

    await t.step("Function Validation", async () => {
        const registry = new FunctionRegistry(security);

        // Missing name
        await assertThrows(
            () => registry.registerFunction({
                name: "",
                description: "Test",
                parameters: { type: "object" },
                returns: { type: "string" },
                handler: () => ""
            }),
            ValidationError,
            "Function must have name"
        );

        // Missing description
        await assertThrows(
            () => registry.registerFunction({
                name: "test",
                description: "",
                parameters: { type: "object" },
                returns: { type: "string" },
                handler: () => ""
            }),
            ValidationError,
            "Function must have description"
        );

        // Invalid schema
        await assertThrows(
            () => registry.registerFunction({
                name: "test",
                description: "Test",
                parameters: { type: "invalid" } as any,
                returns: { type: "string" },
                handler: () => ""
            }),
            ValidationError,
            "Invalid schema type"
        );
    });

    await t.step("Function Execution", async () => {
        const executor = new FunctionExecutor(security, {
            memory: 100 * 1024 * 1024, // 100MB
            cpu: 1000 // 1s
        });

        const result = await executor.executeFunction(
            {
                name: "test",
                description: "Test function",
                parameters: {
                    type: "object",
                    properties: {
                        input: { type: "string" }
                    },
                    required: ["input"]
                },
                returns: {
                    type: "string"
                },
                handler: async (input: string) => input.toUpperCase()
            },
            ["hello"]
        );

        assertEquals(result.success, true);
        assertEquals(result.result, "HELLO");
    });

    await t.step("Tool Registration", async () => {
        const registry = new FunctionRegistry(security);
        
        await registry.registerTool({
            name: "search",
            description: "Search tool",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string" }
                },
                required: ["query"]
            },
            handler: async (params: { query: string }) => {
                return `Results for: ${params.query}`;
            }
        });

        const tool = registry.getTool("search");
        assertEquals(tool.name, "search");
        assertEquals(tool.description, "Search tool");
    });

    await t.step("Tool Execution", async () => {
        const executor = new FunctionExecutor(security, {
            memory: 100 * 1024 * 1024,
            cpu: 1000
        });

        const result = await executor.executeTool(
            {
                name: "search",
                description: "Search tool",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                },
                handler: async (params: { query: string }) => {
                    return `Results for: ${params.query}`;
                }
            },
            { query: "test" }
        );

        assertEquals(result.success, true);
        assertEquals(result.result, "Results for: test");
    });

    await t.step("Resource Limits", async () => {
        const executor = new FunctionExecutor(security, {
            memory: 1, // 1 byte (unrealistic but good for testing)
            cpu: 1000
        });

        const result = await executor.executeFunction(
            {
                name: "memory-heavy",
                description: "Memory heavy function",
                parameters: { type: "object" },
                returns: { type: "string" },
                handler: () => {
                    const arr = new Array(1000000).fill(0);
                    return arr.join("");
                }
            },
            []
        );

        assertEquals(result.success, false);
        assertEquals(
            result.error?.message.includes("Memory limit exceeded"),
            true
        );
    });
});
