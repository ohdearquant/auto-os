/**
 * Logger tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { Logger } from "../../src/utils/logger.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Logger Configuration", async (t) => {
    await t.step("initializes with defaults", () => {
        const logger = new Logger({
            source: "test",
            level: "info"
        });
        assertExists(logger);
    });

    await t.step("validates log levels", () => {
        // Valid levels
        new Logger({ source: "test", level: "debug" });
        new Logger({ source: "test", level: "info" });
        new Logger({ source: "test", level: "warn" });
        new Logger({ source: "test", level: "error" });

        // Invalid level
        await assertRejects(
            async () => new Logger({ source: "test", level: "invalid" as any }),
            ValidationError,
            "Invalid log level"
        );
    });

    await t.step("sets log level", () => {
        const logger = new Logger({
            source: "test",
            level: "info"
        });

        logger.setLevel("debug");
        assertEquals(logger.getLevel(), "debug");
    });
});

Deno.test("Logging Methods", async (t) => {
    let output = "";
    const mockWrite = (msg: string) => {
        output += msg + "\n";
    };

    const logger = new Logger({
        source: "test",
        level: "debug",
        write: mockWrite
    });

    await t.step("logs debug messages", () => {
        output = "";
        logger.debug("Debug message");
        assertEquals(output.includes("DEBUG"), true);
        assertEquals(output.includes("Debug message"), true);
    });

    await t.step("logs info messages", () => {
        output = "";
        logger.info("Info message");
        assertEquals(output.includes("INFO"), true);
        assertEquals(output.includes("Info message"), true);
    });

    await t.step("logs warning messages", () => {
        output = "";
        logger.warn("Warning message");
        assertEquals(output.includes("WARN"), true);
        assertEquals(output.includes("Warning message"), true);
    });

    await t.step("logs error messages", () => {
        output = "";
        logger.error("Error message");
        assertEquals(output.includes("ERROR"), true);
        assertEquals(output.includes("Error message"), true);
    });
});

Deno.test("Log Level Filtering", async (t) => {
    let output = "";
    const mockWrite = (msg: string) => {
        output += msg + "\n";
    };

    await t.step("filters based on level", () => {
        const logger = new Logger({
            source: "test",
            level: "warn",
            write: mockWrite
        });

        output = "";
        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warning message");
        logger.error("Error message");

        assertEquals(output.includes("Debug message"), false);
        assertEquals(output.includes("Info message"), false);
        assertEquals(output.includes("Warning message"), true);
        assertEquals(output.includes("Error message"), true);
    });

    await t.step("updates filtering on level change", () => {
        const logger = new Logger({
            source: "test",
            level: "error",
            write: mockWrite
        });

        output = "";
        logger.warn("Warning 1");
        assertEquals(output.includes("Warning 1"), false);

        logger.setLevel("warn");
        logger.warn("Warning 2");
        assertEquals(output.includes("Warning 2"), true);
    });
});

Deno.test("Log Formatting", async (t) => {
    let output = "";
    const mockWrite = (msg: string) => {
        output += msg + "\n";
    };

    const logger = new Logger({
        source: "test",
        level: "info",
        write: mockWrite
    });

    await t.step("includes timestamp", () => {
        output = "";
        logger.info("Test message");
        const hasTimestamp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(output);
        assertEquals(hasTimestamp, true);
    });

    await t.step("includes source", () => {
        output = "";
        logger.info("Test message");
        assertEquals(output.includes("[test]"), true);
    });

    await t.step("formats objects", () => {
        output = "";
        logger.info("Object test", { key: "value" });
        assertEquals(output.includes('"key": "value"'), true);
    });

    await t.step("formats errors", () => {
        output = "";
        const error = new Error("Test error");
        logger.error("Error test", error);
        assertEquals(output.includes("Test error"), true);
        assertEquals(output.includes("Error:"), true);
    });
});

Deno.test("Log Performance", async (t) => {
    const logger = new Logger({
        source: "test",
        level: "info"
    });

    await t.step("handles high volume", () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            logger.info(`Message ${i}`);
        }
        const duration = performance.now() - start;
        assertEquals(duration < 1000, true);
    });

    await t.step("handles large objects", () => {
        const largeObject = Array(1000).fill(0).map((_, i) => ({
            id: i,
            data: `data-${i}`,
            nested: {
                value: i * 2
            }
        }));

        const start = performance.now();
        logger.info("Large object", largeObject);
        const duration = performance.now() - start;
        assertEquals(duration < 100, true);
    });

    await t.step("handles concurrent logging", async () => {
        const promises = Array(100).fill(0).map((_, i) => 
            Promise.resolve().then(() => 
                logger.info(`Concurrent message ${i}`)
            )
        );

        await Promise.all(promises);
    });
});

Deno.test("Security Validation", async (t) => {
    const validator = new Validator();

    await t.step("validates security context", () => {
        const securitySchema: JSONSchema = {
            type: "object",
            properties: {
                principal: { type: "string" },
                scope: { type: "string" },
                permissions: {
                    type: "object",
                    properties: {
                        network: { type: "array" },
                        fileSystem: { type: "array" },
                        env: { type: "array" }
                    }
                }
            },
            required: ["principal", "scope"]
        };

        // Valid security context
        validator.validate({
            principal: "test-user",
            scope: "test-scope",
            permissions: {
                network: ["api.example.com"],
                fileSystem: ["/tmp"],
                env: ["TEST_VAR"]
            }
        }, securitySchema);

        // Invalid security context
        assertRejects(
            () => validator.validate({
                scope: "test-scope",
                permissions: {}
            }, securitySchema),
            ValidationError,
            "Missing required principal"
        );
    });

    await t.step("validates permission patterns", () => {
        const permissionSchema: JSONSchema = {
            type: "array",
            items: {
                type: "string",
                pattern: "^[a-zA-Z0-9_\\-\\.\\*]+$"
            }
        };

        // Valid patterns
        validator.validate(["api.*", "file.read", "env.TEST_*"], permissionSchema);

        // Invalid patterns
        assertRejects(
            () => validator.validate(["../dangerous", "$(command)"], permissionSchema),
            ValidationError,
            "Invalid permission pattern"
        );
    });

    await t.step("enforces resource limits", () => {
        const limitsSchema: JSONSchema = {
            type: "object",
            properties: {
                memory: { type: "number", minimum: 0, maximum: 1024 },
                cpu: { type: "number", minimum: 0, maximum: 100 },
                connections: { type: "number", minimum: 0, maximum: 50 }
            }
        };

        // Valid limits
        validator.validate({
            memory: 512,
            cpu: 50,
            connections: 25
        }, limitsSchema);

        // Invalid limits
        assertRejects(
            () => validator.validate({
                memory: -1,
                cpu: 150,
                connections: 100
            }, limitsSchema),
            ValidationError,
            "Resource limits exceeded"
        );
    });
});
