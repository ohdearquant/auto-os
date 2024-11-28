/**
 * Function system tests
 * @module tests/function
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { createMockFunctionDefinition } from "../utils/test_utils.ts";
import { FunctionRegistry } from "../../src/agent/function_registry.ts";
import { FunctionExecutor } from "../../src/agent/function_executor.ts";
import { ValidationError } from "../../src/agent/errors.ts";
import type { FunctionDefinition } from "../../types/mod.ts";

Deno.test("Function Registry", async (t) => {
    const registry = new FunctionRegistry();

    await t.step("registers functions", () => {
        const func = createMockFunctionDefinition();
        registry.register(func);
        const registered = registry.get(func.name);
        assertEquals(registered?.name, func.name);
    });

    await t.step("validates function definitions", () => {
        const invalidFunc = {
            ...createMockFunctionDefinition(),
            name: ""
        };

        assertRejects(
            () => registry.register(invalidFunc),
            ValidationError,
            "Function name is required"
        );
    });

    await t.step("unregisters functions", () => {
        const func = createMockFunctionDefinition();
        registry.register(func);
        registry.unregister(func.name);
        assertEquals(registry.get(func.name), undefined);
    });

    await t.step("lists registered functions", () => {
        const func1 = createMockFunctionDefinition("func1");
        const func2 = createMockFunctionDefinition("func2");
        
        registry.register(func1);
        registry.register(func2);
        
        const functions = registry.list();
        assertEquals(functions.length, 2);
        assertEquals(functions.map(f => f.name).sort(), ["func1", "func2"]);
    });
});

Deno.test("Function Executor", async (t) => {
    const registry = new FunctionRegistry();
    const executor = new FunctionExecutor(registry);

    await t.step("executes functions", async () => {
        const func = createMockFunctionDefinition(
            "test",
            async (input: string) => `Result: ${input}`
        );
        registry.register(func);

        const result = await executor.execute("test", ["input"]);
        assertEquals(result.success, true);
        assertEquals(result.value, "Result: input");
    });

    await t.step("validates arguments", async () => {
        const func: FunctionDefinition = {
            name: "validate",
            description: "Test validation",
            parameters: {
                type: "object",
                properties: {
                    required: { type: "string" }
                },
                required: ["required"]
            },
            handler: async () => "ok"
        };
        registry.register(func);

        await assertRejects(
            () => executor.execute("validate", [{}]),
            ValidationError,
            "Missing required parameter: required"
        );
    });

    await t.step("handles execution errors", async () => {
        const func = createMockFunctionDefinition(
            "error",
            async () => { throw new Error("Test error"); }
        );
        registry.register(func);

        const result = await executor.execute("error", []);
        assertEquals(result.success, false);
        assertExists(result.error);
    });

    await t.step("respects timeouts", async () => {
        const func = createMockFunctionDefinition(
            "slow",
            async () => {
                await new Promise(r => setTimeout(r, 1000));
                return "done";
            }
        );
        registry.register(func);

        const result = await executor.execute(
            "slow",
            [],
            { timeoutMs: 100 }
        );
        assertEquals(result.success, false);
        assertEquals(result.error?.name, "TimeoutError");
    });
});

Deno.test("Function Type Safety", async (t) => {
    const registry = new FunctionRegistry();
    const executor = new FunctionExecutor(registry);

    await t.step("enforces parameter types", async () => {
        const func: FunctionDefinition = {
            name: "typed",
            description: "Test types",
            parameters: {
                type: "object",
                properties: {
                    number: { type: "number" },
                    string: { type: "string" },
                    boolean: { type: "boolean" }
                }
            },
            handler: async (params: Record<string, unknown>) => params
        };
        registry.register(func);

        // Valid types
        const validResult = await executor.execute(
            "typed",
            [{
                number: 42,
                string: "test",
                boolean: true
            }]
        );
        assertEquals(validResult.success, true);

        // Invalid types
        await assertRejects(
            () => executor.execute(
                "typed",
                [{
                    number: "not a number",
                    string: 42,
                    boolean: "not a boolean"
                }]
            ),
            ValidationError
        );
    });

    await t.step("handles array parameters", async () => {
        const func: FunctionDefinition = {
            name: "array",
            description: "Test arrays",
            parameters: {
                type: "object",
                properties: {
                    items: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            },
            handler: async (params: Record<string, unknown>) => params
        };
        registry.register(func);

        // Valid array
        const validResult = await executor.execute(
            "array",
            [{ items: ["one", "two", "three"] }]
        );
        assertEquals(validResult.success, true);

        // Invalid array
        await assertRejects(
            () => executor.execute(
                "array",
                [{ items: [1, 2, 3] }]
            ),
            ValidationError
        );
    });

    await t.step("handles nested objects", async () => {
        const func: FunctionDefinition = {
            name: "nested",
            description: "Test nested objects",
            parameters: {
                type: "object",
                properties: {
                    nested: {
                        type: "object",
                        properties: {
                            value: { type: "string" }
                        }
                    }
                }
            },
            handler: async (params: Record<string, unknown>) => params
        };
        registry.register(func);

        // Valid nested object
        const validResult = await executor.execute(
            "nested",
            [{
                nested: { value: "test" }
            }]
        );
        assertEquals(validResult.success, true);

        // Invalid nested object
        await assertRejects(
            () => executor.execute(
                "nested",
                [{
                    nested: { value: 42 }
                }]
            ),
            ValidationError
        );
    });
});
