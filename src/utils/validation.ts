/**
 * Validation utility functions
 * @module utils/validation
 */

import { JSONSchema, ValidationError } from "../types/mod.ts";

/**
 * Validates a JSON Schema definition
 * 
 * Ensures the schema follows JSON Schema specification and
 * contains all required fields.
 * 
 * @param {JSONSchema} schema - Schema to validate
 * @returns {Promise<void>}
 * @throws {ValidationError} If schema is invalid
 */
export async function validateSchema(
    schema: JSONSchema
): Promise<void> {
    if (!schema.type) {
        throw new ValidationError("Schema must have type");
    }

    switch (schema.type) {
        case "object":
            await validateObjectSchema(schema);
            break;
        case "array":
            await validateArraySchema(schema);
            break;
        case "string":
        case "number":
        case "boolean":
        case "null":
            // Primitive types are valid by default
            break;
        default:
            throw new ValidationError(`Invalid schema type: ${schema.type}`);
    }
}

/**
 * Validates an object schema
 */
async function validateObjectSchema(
    schema: JSONSchema
): Promise<void> {
    if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
            if (typeof prop !== "object") {
                throw new ValidationError(
                    `Invalid property schema for ${key}`
                );
            }
            await validateSchema(prop);
        }
    }

    if (schema.required) {
        if (!Array.isArray(schema.required)) {
            throw new ValidationError(
                "Required must be an array"
            );
        }

        if (!schema.properties) {
            throw new ValidationError(
                "Required properties must be defined in properties"
            );
        }

        for (const prop of schema.required) {
            if (!schema.properties[prop]) {
                throw new ValidationError(
                    `Required property ${prop} not defined`
                );
            }
        }
    }
}

/**
 * Validates an array schema
 */
async function validateArraySchema(
    schema: JSONSchema
): Promise<void> {
    if (!schema.items) {
        throw new ValidationError(
            "Array schema must define items"
        );
    }

    if (Array.isArray(schema.items)) {
        for (const item of schema.items) {
            await validateSchema(item);
        }
    } else {
        await validateSchema(schema.items);
    }
}

/**
 * Validates data against a schema
 * 
 * @param {unknown} data - Data to validate
 * @param {JSONSchema} schema - Schema to validate against
 * @returns {Promise<boolean>} Whether the data is valid
 */
export async function validateData(
    data: unknown,
    schema: JSONSchema
): Promise<boolean> {
    try {
        await validateSchema(schema);

        switch (schema.type) {
            case "object":
                return validateObject(data, schema);
            case "array":
                return validateArray(data, schema);
            case "string":
                return typeof data === "string";
            case "number":
                return typeof data === "number";
            case "boolean":
                return typeof data === "boolean";
            case "null":
                return data === null;
            default:
                return false;
        }
    } catch {
        return false;
    }
}

/**
 * Validates an object against a schema
 */
function validateObject(
    data: unknown,
    schema: JSONSchema
): boolean {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const obj = data as Record<string, unknown>;

    // Check required properties
    if (schema.required) {
        for (const prop of schema.required) {
            if (!(prop in obj)) {
                return false;
            }
        }
    }

    // Validate properties
    if (schema.properties) {
        for (const [key, value] of Object.entries(obj)) {
            const propSchema = schema.properties[key];
            if (propSchema && !validateData(value, propSchema)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Validates an array against a schema
 */
function validateArray(
    data: unknown,
    schema: JSONSchema
): boolean {
    if (!Array.isArray(data)) {
        return false;
    }

    if (!schema.items) {
        return true;
    }

    if (Array.isArray(schema.items)) {
        return data.every((item, index) => 
            schema.items[index] && 
            validateData(item, schema.items[index])
        );
    }

    return data.every(item => validateData(item, schema.items));
}
