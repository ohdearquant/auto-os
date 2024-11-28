/**
 * Error handling tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import {
    DenoAgentsError,
    ValidationError,
    SecurityError,
    TimeoutError,
    ResourceError,
    NetworkError
} from "../../src/agent/errors.ts";

Deno.test("Base Error", async (t) => {
    await t.step("creates basic error", () => {
        const error = new DenoAgentsError("Test error");
        assertEquals(error.name, "DenoAgentsError");
        assertEquals(error.message, "Test error");
    });

    await t.step("includes error code", () => {
        const error = new DenoAgentsError("Test error", {
            code: "TEST_ERROR"
        });
        assertEquals(error.code, "TEST_ERROR");
    });

    await t.step("includes original error", () => {
        const originalError = new Error("Original error");
        const error = new DenoAgentsError("Test error", {
            originalError
        });
        assertEquals(error.originalError, originalError);
    });

    await t.step("includes context", () => {
        const error = new DenoAgentsError("Test error", {
            context: { key: "value" }
        });
        assertEquals(error.context?.key, "value");
    });
});

Deno.test("Validation Error", async (t) => {
    await t.step("validates input", () => {
        const error = new ValidationError("Invalid input", {
            field: "username",
            value: "",
            constraint: "required"
        });
        assertEquals(error.name, "ValidationError");
        assertEquals(error.field, "username");
        assertEquals(error.constraint, "required");
    });

    await t.step("validates schema", () => {
        const error = new ValidationError("Schema error", {
            schema: {
                type: "string",
                minLength: 3
            },
            value: "ab"
        });
        assertEquals(error.schema?.type, "string");
        assertEquals(error.schema?.minLength, 3);
    });

    await t.step("validates array", () => {
        const error = new ValidationError("Array error", {
            field: "items",
            value: [],
            constraint: "minItems",
            context: { min: 1 }
        });
        assertEquals(error.context?.min, 1);
    });
});

Deno.test("Security Error", async (t) => {
    await t.step("handles permission denied", () => {
        const error = new SecurityError("Permission denied", {
            permission: "write",
            resource: "file.txt"
        });
        assertEquals(error.name, "SecurityError");
        assertEquals(error.permission, "write");
        assertEquals(error.resource, "file.txt");
    });

    await t.step("handles invalid token", () => {
        const error = new SecurityError("Invalid token", {
            tokenType: "access",
            reason: "expired"
        });
        assertEquals(error.tokenType, "access");
        assertEquals(error.reason, "expired");
    });

    await t.step("handles rate limit", () => {
        const error = new SecurityError("Rate limit exceeded", {
            limit: 100,
            interval: "1m",
            current: 101
        });
        assertEquals(error.context?.limit, 100);
        assertEquals(error.context?.interval, "1m");
    });
});

Deno.test("Timeout Error", async (t) => {
    await t.step("handles operation timeout", () => {
        const error = new TimeoutError("Operation timed out", {
            operation: "database_query",
            timeout: 5000
        });
        assertEquals(error.name, "TimeoutError");
        assertEquals(error.operation, "database_query");
        assertEquals(error.timeout, 5000);
    });

    await t.step("includes attempt count", () => {
        const error = new TimeoutError("Request timed out", {
            operation: "api_call",
            timeout: 1000,
            attempts: 3
        });
        assertEquals(error.attempts, 3);
    });
});

Deno.test("Resource Error", async (t) => {
    await t.step("handles resource limits", () => {
        const error = new ResourceError("Memory limit exceeded", {
            resource: "memory",
            limit: "1GB",
            usage: "1.1GB"
        });
        assertEquals(error.name, "ResourceError");
        assertEquals(error.resource, "memory");
        assertEquals(error.limit, "1GB");
    });

    await t.step("handles resource not found", () => {
        const error = new ResourceError("Resource not found", {
            resource: "file",
            path: "/path/to/file.txt"
        });
        assertEquals(error.resource, "file");
        assertEquals(error.path, "/path/to/file.txt");
    });
});

Deno.test("Network Error", async (t) => {
    await t.step("handles connection errors", () => {
        const error = new NetworkError("Connection failed", {
            host: "api.example.com",
            port: 443,
            protocol: "https"
        });
        assertEquals(error.name, "NetworkError");
        assertEquals(error.host, "api.example.com");
        assertEquals(error.port, 443);
    });

    await t.step("handles request errors", () => {
        const error = new NetworkError("Request failed", {
            method: "POST",
            url: "https://api.example.com/data",
            status: 500
        });
        assertEquals(error.method, "POST");
        assertEquals(error.status, 500);
    });

    await t.step("includes response data", () => {
        const error = new NetworkError("API error", {
            status: 400,
            response: {
                error: "Bad Request",
                details: "Invalid parameter"
            }
        });
        assertEquals(error.response?.error, "Bad Request");
    });
});

Deno.test("Error Chain", async (t) => {
    await t.step("chains multiple errors", () => {
        const networkError = new NetworkError("Request failed", {
            status: 500
        });
        const resourceError = new ResourceError("Resource unavailable", {
            resource: "api",
            originalError: networkError
        });
        const timeoutError = new TimeoutError("Operation timed out", {
            operation: "api_request",
            originalError: resourceError
        });

        assertEquals(timeoutError.originalError, resourceError);
        assertEquals(
            (timeoutError.originalError as ResourceError).originalError,
            networkError
        );
    });

    await t.step("preserves error chain context", () => {
        const baseError = new Error("System error");
        const networkError = new NetworkError("Connection failed", {
            originalError: baseError,
            host: "example.com"
        });
        const error = new DenoAgentsError("Operation failed", {
            originalError: networkError,
            context: { operation: "sync" }
        });

        assertEquals(error.context?.operation, "sync");
        assertEquals(
            (error.originalError as NetworkError).host,
            "example.com"
        );
    });
});

Deno.test("Error Context Chain", async (t) => {
    await t.step("preserves error context through chain", () => {
        const baseError = new Error("Original error");
        const validationError = new ValidationError("Validation failed", {
            field: "test",
            value: null,
            originalError: baseError
        });
        const securityError = new SecurityError("Security check failed", {
            permission: "read",
            originalError: validationError
        });

        // Verify context preservation
        assertEquals(securityError.permission, "read");
        assertEquals(
            (securityError.originalError as ValidationError).field,
            "test"
        );
        assertEquals(
            ((securityError.originalError as ValidationError).originalError as Error).message,
            "Original error"
        );
    });
});

Deno.test("Error Code Coverage", async (t) => {
    await t.step("covers all error codes", () => {
        // Test each error code has corresponding error class
        const errorCodes = Object.values(ErrorCode);
        const errorClasses = [
            ValidationError,
            SecurityError,
            ResourceError,
            TimeoutError,
            InitializationError,
            RuntimeError
        ];

        assertEquals(
            errorCodes.length,
            errorClasses.length,
            "Each error code should have corresponding class"
        );
    });
});

Deno.test("Error Recovery", async (t) => {
    await t.step("supports recovery metadata", () => {
        const error = new DenoAgentsError("Test error", {
            code: ErrorCode.RUNTIME_ERROR,
            context: {
                recoverable: true,
                retryCount: 2,
                lastAttempt: Date.now()
            }
        });

        assertExists(error.context?.recoverable);
        assertExists(error.context?.retryCount);
        assertExists(error.context?.lastAttempt);
    });
});
