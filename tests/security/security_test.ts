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

    await t.step("validates permissions", async () => {
        const allowed = await context.checkPermission("test_action");
        assertEquals(allowed, true);
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
