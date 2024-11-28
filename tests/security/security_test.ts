/**
 * Security system tests
 * @module tests/security
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { createMockSecurityContext } from "../utils/test_utils.ts";
import { SecurityValidator } from "../../src/security/validator.ts";
import { SecurityPolicy } from "../../src/security/policy.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Security Context", async (t) => {
    const context = createMockSecurityContext();

    await t.step("validates permission patterns", async () => {
        // Network permissions with wildcards
        const networkPermissions = [
            { type: "network", action: "connect", target: "api.example.com", protocol: "https" },
            { type: "network", action: "connect", target: "*.example.com", protocol: "https" },
            { type: "network", action: "*", target: "internal.example.com", protocol: "*" }
        ];
        
        for (const perm of networkPermissions) {
            assertEquals(await context.checkPermission(perm), true);
        }

        // File system permissions with patterns
        const fsPermissions = [
            { type: "fileSystem", action: "read", path: "/allowed/path" },
            { type: "fileSystem", action: "write", path: "/allowed/path/*.txt" },
            { type: "fileSystem", action: "read", path: "/allowed/**/logs" }
        ];
        
        for (const perm of fsPermissions) {
            assertEquals(await context.checkPermission(perm), true);
        }

        // Environment permissions with patterns
        const envPermissions = [
            { type: "env", action: "read", variable: "ALLOWED_VAR" },
            { type: "env", action: "read", variable: "ALLOWED_*" },
            { type: "env", action: "*", variable: "SYSTEM_*" }
        ];
        
        for (const perm of envPermissions) {
            assertEquals(await context.checkPermission(perm), true);
        }

        // Test permission inheritance
        const childContext = await context.createChildContext({
            scope: "limited"
        });
        assertEquals(await childContext.checkPermission("test_action"), true);
        
        // Test permission denial
        const deniedPermission = await context.checkPermission({
            type: "network",
            action: "connect",
            target: "malicious.com"
        });
        assertEquals(deniedPermission, false);
    });

    await t.step("enforces resource quotas", async () => {
        const quotaContext = createMockSecurityContext({
            limits: {
                memory: 100 * 1024 * 1024, // 100MB
                cpu: 50, // 50% CPU
                connections: 10,
                bandwidth: 1024 * 1024, // 1MB/s
                operations: 1000, // ops/sec
                storage: 500 * 1024 * 1024 // 500MB
            }
        });

        // Test all resource limits
        const resourceTests = [
            { type: "memory", value: 50 * 1024 * 1024, expected: true },
            { type: "memory", value: 150 * 1024 * 1024, expected: false },
            { type: "cpu", value: 25, expected: true },
            { type: "cpu", value: 75, expected: false },
            { type: "connections", value: 5, expected: true },
            { type: "connections", value: 15, expected: false },
            { type: "bandwidth", value: 512 * 1024, expected: true },
            { type: "bandwidth", value: 2 * 1024 * 1024, expected: false },
            { type: "operations", value: 500, expected: true },
            { type: "operations", value: 1500, expected: false },
            { type: "storage", value: 250 * 1024 * 1024, expected: true },
            { type: "storage", value: 750 * 1024 * 1024, expected: false }
        ];

        for (const test of resourceTests) {
            assertEquals(
                await quotaContext.checkResourceLimit(test.type, test.value),
                test.expected,
                `Resource limit check failed for ${test.type}`
            );
        }

        // Test quota monitoring
        const usage = await quotaContext.getResourceUsage();
        assertExists(usage.memory);
        assertExists(usage.cpu);
        assertExists(usage.connections);
        assertExists(usage.bandwidth);
        assertExists(usage.operations);
        assertExists(usage.storage);
        
        // Test connection quota
        assertEquals(
            await quotaContext.checkResourceLimit("connections", 5),
            true
        );

        // Test bandwidth quota
        assertEquals(
            await quotaContext.checkResourceLimit("bandwidth", 512 * 1024),
            true
        );

        // Test quota exceeded
        assertEquals(
            await quotaContext.checkResourceLimit("memory", 150 * 1024 * 1024),
            false
        );

        // Test quota monitoring
        const usage = await quotaContext.getResourceUsage();
        assertExists(usage.memory);
        assertExists(usage.cpu);
        assertExists(usage.connections);
        assertExists(usage.bandwidth);
    });

    await t.step("tracks principal", () => {
        assertEquals(context.principal, "test-principal");
        assertEquals(context.scope, "test-scope");
    });
});

Deno.test("Security Validator", async (t) => {
    const validator = new SecurityValidator();

    await t.step("validates input", async () => {
        await validator.validateInput("safe input");
        await assertRejects(
            () => validator.validateInput("<script>alert('xss')</script>"),
            ValidationError,
            "Invalid input"
        );
    });

    await t.step("validates permissions", async () => {
        await validator.validatePermissions(["read", "write"]);
        await assertRejects(
            () => validator.validatePermissions(["dangerous_action"]),
            ValidationError,
            "Invalid permissions"
        );
    });

    await t.step("validates resource access", async () => {
        await validator.validateResourceAccess("safe_resource");
        await assertRejects(
            () => validator.validateResourceAccess("../dangerous/path"),
            ValidationError,
            "Invalid resource path"
        );
    });
});

Deno.test("Security Policy", async (t) => {
    const policy = new SecurityPolicy();

    await t.step("enforces role-based access", async () => {
        await policy.grantRole("user", ["read"]);
        const allowed = await policy.checkAccess("user", "read");
        assertEquals(allowed, true);
    });

    await t.step("enforces resource limits", async () => {
        await policy.setResourceLimit("memory", 100);
        await assertRejects(
            () => policy.checkResourceUsage("memory", 150),
            ValidationError,
            "Resource limit exceeded"
        );
    });

    await t.step("manages API keys", async () => {
        await policy.registerAPIKey("test-key", ["read"]);
        const valid = await policy.validateAPIKey("test-key");
        assertEquals(valid, true);
    });
});
