/**
 * Security system tests
 * @module tests/security
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { createMockSecurityContext } from "../utils/test_utils.ts";
import { SecurityValidator } from "../../src/security/validator.ts";
import { SecurityPolicy } from "../../src/security/policy.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Security Context", async (t) => {
    const context = createMockSecurityContext();

    await t.step("validates permission patterns", async () => {
        // Test hierarchical permissions as specified in security-architecture.md
        const networkPermission = await context.checkPermission({
            type: "network",
            action: "connect",
            target: "api.example.com",
            protocol: "https"
        });
        assertEquals(networkPermission, true);

        // Test file system permissions
        const fsPermission = await context.checkPermission({
            type: "fileSystem",
            action: "read",
            path: "/allowed/path"
        });
        assertEquals(fsPermission, true);

        // Test environment permissions
        const envPermission = await context.checkPermission({
            type: "env",
            action: "read",
            variable: "ALLOWED_VAR"
        });
        assertEquals(envPermission, true);

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
                bandwidth: 1024 * 1024 // 1MB/s
            }
        });
        
        // Test memory quota
        assertEquals(
            await quotaContext.checkResourceLimit("memory", 50 * 1024 * 1024),
            true
        );
        
        // Test CPU quota
        assertEquals(
            await quotaContext.checkResourceLimit("cpu", 25),
            true
        );
        
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
