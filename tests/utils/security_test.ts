/**
 * Security system tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { SecurityManager } from "../../src/utils/security.ts";
import { ValidationError } from "../../src/agent/errors.ts";
import type { SecurityContext, PermissionSet } from "../../src/types/mod.ts";

Deno.test("Permission Management", async (t) => {
    const manager = new SecurityManager();

    await t.step("grants basic permissions", async () => {
        const context: SecurityContext = {
            principal: "test-user",
            scope: "test",
            permissions: {
                read: true,
                write: false
            },
            timestamp: Date.now()
        };

        await manager.grantPermissions(context);
        const result = await manager.checkPermission(
            context.principal,
            "read"
        );
        assertEquals(result, true);
    });

    await t.step("denies unauthorized access", async () => {
        const result = await manager.checkPermission(
            "unknown-user",
            "write"
        );
        assertEquals(result, false);
    });

    await t.step("handles permission inheritance", async () => {
        const parent: SecurityContext = {
            principal: "parent",
            scope: "test",
            permissions: {
                admin: true
            },
            timestamp: Date.now()
        };

        const child: SecurityContext = {
            principal: "child",
            scope: "test",
            permissions: {
                read: true
            },
            parent: "parent",
            timestamp: Date.now()
        };

        await manager.grantPermissions(parent);
        await manager.grantPermissions(child);

        const result = await manager.checkPermission(
            "child",
            "admin"
        );
        assertEquals(result, true);
    });
});

Deno.test("Resource Access Control", async (t) => {
    const manager = new SecurityManager();

    await t.step("controls file access", async () => {
        const context: SecurityContext = {
            principal: "test-user",
            scope: "files",
            permissions: {
                "file:read": ["*.txt"],
                "file:write": ["test.txt"]
            },
            timestamp: Date.now()
        };

        await manager.grantPermissions(context);

        assertEquals(
            await manager.checkResourceAccess(
                "test-user",
                "file:read",
                "doc.txt"
            ),
            true
        );

        assertEquals(
            await manager.checkResourceAccess(
                "test-user",
                "file:write",
                "other.txt"
            ),
            false
        );
    });

    await t.step("controls network access", async () => {
        const context: SecurityContext = {
            principal: "service",
            scope: "network",
            permissions: {
                "net:connect": ["api.example.com:443"]
            },
            timestamp: Date.now()
        };

        await manager.grantPermissions(context);

        assertEquals(
            await manager.checkResourceAccess(
                "service",
                "net:connect",
                "api.example.com:443"
            ),
            true
        );

        assertEquals(
            await manager.checkResourceAccess(
                "service",
                "net:connect",
                "other.com:80"
            ),
            false
        );
    });
});

Deno.test("Permission Validation", async (t) => {
    const manager = new SecurityManager();

    await t.step("validates permission format", async () => {
        const validPerms: PermissionSet = {
            read: true,
            write: ["test.txt"]
        };

        const invalidPerms = {
            read: "invalid",
            write: 123
        };

        await manager.validatePermissions(validPerms);
        await assertRejects(
            () => manager.validatePermissions(invalidPerms as any),
            ValidationError,
            "Invalid permission format"
        );
    });

    await t.step("validates resource patterns", async () => {
        const context: SecurityContext = {
            principal: "test-user",
            scope: "test",
            permissions: {
                "file:read": ["*.{txt,md}"],
                "file:write": ["test/**/*.txt"]
            },
            timestamp: Date.now()
        };

        await manager.grantPermissions(context);

        assertEquals(
            await manager.checkResourceAccess(
                "test-user",
                "file:read",
                "doc.txt"
            ),
            true
        );

        assertEquals(
            await manager.checkResourceAccess(
                "test-user",
                "file:read",
                "doc.jpg"
            ),
            false
        );

        assertEquals(
            await manager.checkResourceAccess(
                "test-user",
                "file:write",
                "test/sub/file.txt"
            ),
            true
        );
    });
});

Deno.test("Security Context", async (t) => {
    const manager = new SecurityManager();

    await t.step("validates context", async () => {
        const validContext: SecurityContext = {
            principal: "test-user",
            scope: "test",
            permissions: {
                read: true
            },
            timestamp: Date.now()
        };

        const invalidContext = {
            principal: "",
            scope: "",
            permissions: null
        };

        await manager.validateContext(validContext);
        await assertRejects(
            () => manager.validateContext(invalidContext as any),
            ValidationError,
            "Invalid security context"
        );
    });

    await t.step("handles context expiration", async () => {
        const context: SecurityContext = {
            principal: "test-user",
            scope: "test",
            permissions: {
                read: true
            },
            timestamp: Date.now() - 3600000, // 1 hour ago
            expiry: 1800 // 30 minutes
        };

        await manager.grantPermissions(context);
        const result = await manager.checkPermission(
            "test-user",
            "read"
        );
        assertEquals(result, false);
    });
});

Deno.test("Security Policies", async (t) => {
    const manager = new SecurityManager();

    await t.step("applies role-based policies", async () => {
        await manager.addPolicy("admin", {
            permissions: {
                read: true,
                write: true,
                admin: true
            }
        });

        await manager.addPolicy("user", {
            permissions: {
                read: true,
                write: ["own-files"]
            }
        });

        const adminContext: SecurityContext = {
            principal: "admin-user",
            scope: "system",
            role: "admin",
            timestamp: Date.now()
        };

        const userContext: SecurityContext = {
            principal: "normal-user",
            scope: "system",
            role: "user",
            timestamp: Date.now()
        };

        await manager.grantPermissions(adminContext);
        await manager.grantPermissions(userContext);

        assertEquals(
            await manager.checkPermission("admin-user", "admin"),
            true
        );
        assertEquals(
            await manager.checkPermission("normal-user", "admin"),
            false
        );
    });

    await t.step("applies resource limits", async () => {
        await manager.addPolicy("api-client", {
            limits: {
                "requests-per-minute": 60,
                "concurrent-connections": 10
            }
        });

        const context: SecurityContext = {
            principal: "client",
            scope: "api",
            role: "api-client",
            timestamp: Date.now()
        };

        await manager.grantPermissions(context);
        
        // Simulate requests
        for (let i = 0; i < 60; i++) {
            await manager.checkResourceLimit(
                "client",
                "requests-per-minute"
            );
        }

        await assertRejects(
            () => manager.checkResourceLimit(
                "client",
                "requests-per-minute"
            ),
            ValidationError,
            "Resource limit exceeded"
        );
    });
});
