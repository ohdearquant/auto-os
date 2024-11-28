/**
 * Function system tests
 * @module tests/agent/function_test
 */

import { assertEquals } from "https://deno.land/std/assert/assert_equals.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { FunctionRegistry } from "../../src/agent/function_registry.ts";
import { FunctionExecutor } from "../../src/agent/function_executor.ts";
import { createMockSecurityContext } from "../utils/test_utils.ts";
import { ValidationError } from "../../src/types/mod.ts";

Deno.test("Function System", async (t) => {
  const security = createMockSecurityContext();

  await t.step("Function Registration", async () => {
    const registry = new FunctionRegistry(security);

    // Register a simple uppercase function
    const uppercaseFunc = {
      name: "uppercase",
      description: "Converts string to uppercase",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" }
        },
        required: ["text"]
      },
      returns: {
        type: "string"
      },
      handler: (params: { text: string }) => params.text.toUpperCase()
    };

    await registry.registerFunction(uppercaseFunc);

    // Function should be retrievable
    const func = registry.getFunction("uppercase");
    assertEquals(func.name, "uppercase");
    assertEquals(func.description, "Converts string to uppercase");

    // Should reject duplicate registration
    await assertRejects(
      () => registry.registerFunction(uppercaseFunc),
      ValidationError,
      "Function already registered"
    );
  });

  await t.step("Function Validation", async () => {
    const registry = new FunctionRegistry(security);

    // Missing name
    await assertRejects(
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
    await assertRejects(
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

    // Invalid parameter schema
    await assertRejects(
      () => registry.registerFunction({
        name: "test",
        description: "Test",
        parameters: { type: "invalid" } as any,
        returns: { type: "string" },
        handler: () => ""
      }),
      ValidationError,
      "Invalid parameter schema"
    );

    // Missing handler
    await assertRejects(
      () => registry.registerFunction({
        name: "test",
        description: "Test",
        parameters: { type: "object" },
        returns: { type: "string" },
        handler: undefined as any
      }),
      ValidationError,
      "Function must have handler"
    );
  });

  await t.step("Function Execution", async () => {
    const executor = new FunctionExecutor(security, {
      memory: 100 * 1024 * 1024, // 100MB
      cpu: 1000 // 1s
    });

    // Execute simple function
    const result = await executor.executeFunction({
      name: "uppercase",
      description: "Converts string to uppercase",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" }
        },
        required: ["text"]
      },
      handler: (params: { text: string }) => params.text.toUpperCase()
    }, { text: "hello" });

    assertEquals(result.success, true);
    assertEquals(result.result, "HELLO");

    // Invalid parameters
    const invalidResult = await executor.executeFunction({
      name: "uppercase",
      description: "Converts string to uppercase",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" }
        },
        required: ["text"]
      },
      handler: (params: { text: string }) => params.text.toUpperCase()
    }, { wrongParam: "hello" });

    assertEquals(invalidResult.success, false);
    assertEquals(invalidResult.error instanceof ValidationError, true);
  });

  await t.step("Resource Limits", async () => {
    const executor = new FunctionExecutor(security, {
      memory: 1024, // 1KB
      cpu: 100 // 100ms
    });

    // Memory limit
    const memoryResult = await executor.executeFunction({
      name: "memory-heavy",
      description: "Memory intensive operation",
      parameters: { type: "object" },
      handler: () => {
        const arr = new Array(1000000).fill(0); // Should exceed 1KB
        return arr.join("");
      }
    }, {});

    assertEquals(memoryResult.success, false);
    assertEquals(memoryResult.error?.message.includes("Memory limit exceeded"), true);

    // CPU limit
    const cpuResult = await executor.executeFunction({
      name: "cpu-heavy",
      description: "CPU intensive operation",
      parameters: { type: "object" },
      handler: () => {
        let x = 0;
        for (let i = 0; i < 1000000000; i++) x++; // Should exceed 100ms
        return x;
      }
    }, {});

    assertEquals(cpuResult.success, false);
    assertEquals(cpuResult.error?.message.includes("CPU limit exceeded"), true);
  });

  await t.step("Tool Registration and Execution", async () => {
    const registry = new FunctionRegistry(security);
    const executor = new FunctionExecutor(security, {
      memory: 100 * 1024 * 1024,
      cpu: 1000
    });

    // Register a search tool
    const searchTool = {
      name: "search",
      description: "Search for content",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", optional: true }
        },
        required: ["query"]
      },
      handler: (params: { query: string; limit?: number }) => {
        return `Results for: ${params.query} (limit: ${params.limit ?? 10})`;
      }
    };

    await registry.registerTool(searchTool);

    // Tool should be retrievable
    const tool = registry.getTool("search");
    assertEquals(tool.name, "search");
    assertEquals(tool.description, "Search for content");

    // Execute tool
    const result = await executor.executeTool(searchTool, {
      query: "test",
      limit: 5
    });

    assertEquals(result.success, true);
    assertEquals(result.result, "Results for: test (limit: 5)");

    // Invalid tool parameters
    const invalidResult = await executor.executeTool(searchTool, {
      wrongParam: "test"
    });

    assertEquals(invalidResult.success, false);
    assertEquals(invalidResult.error instanceof ValidationError, true);
  });
});
