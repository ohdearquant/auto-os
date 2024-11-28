/**
 * Validation system tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { Validator } from "../../src/utils/validation.ts";
import { ValidationError } from "../../src/agent/errors.ts";
import type { JSONSchema } from "../../types/mod.ts";

Deno.test("Schema Validation", async (t) => {
    const validator = new Validator();

    await t.step("validates basic types", () => {
        const schema: JSONSchema = {
            type: "object",
            properties: {
                string: { type: "string" },
                number: { type: "number" },
                boolean: { type: "boolean" }
            },
            required: ["string"]
        };

        // Valid data
        validator.validate({
            string: "test",
            number: 42,
            boolean: true
        }, schema);

        // Invalid data
        assertRejects(
            () => validator.validate({
                number: "not a number"
            }, schema),
            ValidationError,
            "Missing required property: string"
        );
    });

    await t.step("validates arrays", () => {
        const schema: JSONSchema = {
            type: "array",
            items: {
                type: "string"
            },
            minItems: 1
        };

        // Valid array
        validator.validate(["one", "two"], schema);

        // Invalid array
        assertRejects(
            () => validator.validate([1, 2], schema),
            ValidationError,
            "Invalid array item type"
        );
    });

    await t.step("validates nested objects", () => {
        const schema: JSONSchema = {
            type: "object",
            properties: {
                nested: {
                    type: "object",
                    properties: {
                        value: { type: "string" }
                    },
                    required: ["value"]
                }
            }
        };

        // Valid nested object
        validator.validate({
            nested: { value: "test" }
        }, schema);

        // Invalid nested object
        assertRejects(
            () => validator.validate({
                nested: { value: 42 }
            }, schema),
            ValidationError,
            "Invalid type"
        );
    });
});

Deno.test("Type Constraints", async (t) => {
    const validator = new Validator();

    await t.step("enforces string constraints", () => {
        const schema: JSONSchema = {
            type: "string",
            minLength: 3,
            maxLength: 10,
            pattern: "^[a-z]+$"
        };

        // Valid string
        validator.validate("test", schema);

        // Too short
        assertRejects(
            () => validator.validate("ab", schema),
            ValidationError,
            "String too short"
        );

        // Too long
        assertRejects(
            () => validator.validate("toolongstring", schema),
            ValidationError,
            "String too long"
        );

        // Invalid pattern
        assertRejects(
            () => validator.validate("Test123", schema),
            ValidationError,
            "String does not match pattern"
        );
    });

    await t.step("enforces number constraints", () => {
        const schema: JSONSchema = {
            type: "number",
            minimum: 0,
            maximum: 100,
            multipleOf: 5
        };

        // Valid number
        validator.validate(25, schema);

        // Too small
        assertRejects(
            () => validator.validate(-1, schema),
            ValidationError,
            "Number too small"
        );

        // Too large
        assertRejects(
            () => validator.validate(101, schema),
            ValidationError,
            "Number too large"
        );

        // Not multiple
        assertRejects(
            () => validator.validate(23, schema),
            ValidationError,
            "Number must be multiple of 5"
        );
    });

    await t.step("enforces array constraints", () => {
        const schema: JSONSchema = {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
            uniqueItems: true
        };

        // Valid array
        validator.validate(["one", "two", "three"], schema);

        // Too few items
        assertRejects(
            () => validator.validate(["one"], schema),
            ValidationError,
            "Array too short"
        );

        // Too many items
        assertRejects(
            () => validator.validate(["one", "two", "three", "four", "five"], schema),
            ValidationError,
            "Array too long"
        );

        // Duplicate items
        assertRejects(
            () => validator.validate(["one", "one", "two"], schema),
            ValidationError,
            "Array items must be unique"
        );
    });
});

Deno.test("Custom Validation", async (t) => {
    const validator = new Validator();

    await t.step("supports custom formats", () => {
        const schema: JSONSchema = {
            type: "string",
            format: "email"
        };

        // Valid email
        validator.validate("test@example.com", schema);

        // Invalid email
        assertRejects(
            () => validator.validate("not-an-email", schema),
            ValidationError,
            "Invalid email format"
        );
    });

    await t.step("supports custom keywords", () => {
        validator.addKeyword("range", (schema, value) => {
            const [min, max] = schema.range;
            if (value < min || value > max) {
                throw new ValidationError("Value out of range");
            }
        });

        const schema = {
            type: "number",
            range: [0, 100]
        };

        // Valid range
        validator.validate(50, schema);

        // Invalid range
        assertRejects(
            () => validator.validate(150, schema),
            ValidationError,
            "Value out of range"
        );
    });

    await t.step("supports custom error messages", () => {
        validator.addErrorMessage("required", "Property '${path}' must be provided");
        
        const schema: JSONSchema = {
            type: "object",
            properties: {
                name: { type: "string" }
            },
            required: ["name"]
        };

        assertRejects(
            () => validator.validate({}, schema),
            ValidationError,
            "Property 'name' must be provided"
        );
    });
});

Deno.test("Validation Performance", async (t) => {
    const validator = new Validator();
    const complexSchema: JSONSchema = {
        type: "object",
        properties: {
            id: { type: "string" },
            data: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        value: { type: "number" },
                        tags: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            }
        }
    };

    await t.step("handles large objects", () => {
        const largeObject = {
            id: "test",
            data: Array(1000).fill(0).map((_, i) => ({
                name: `item-${i}`,
                value: i,
                tags: [`tag-${i}`]
            }))
        };

        const start = performance.now();
        validator.validate(largeObject, complexSchema);
        const duration = performance.now() - start;

        assertEquals(duration < 1000, true);
    });

    await t.step("caches schemas", () => {
        const simpleSchema: JSONSchema = {
            type: "string",
            minLength: 3
        };

        // First validation compiles schema
        const start1 = performance.now();
        validator.validate("test", simpleSchema);
        const duration1 = performance.now() - start1;

        // Second validation uses cached schema
        const start2 = performance.now();
        validator.validate("test", simpleSchema);
        const duration2 = performance.now() - start2;

        assertEquals(duration2 < duration1, true);
    });
});
