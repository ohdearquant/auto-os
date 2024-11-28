/**
 * Security utilities
 * @module utils/security
 */

import { 
    SecurityContext, 
    PermissionSet,
    SecurityError
} from "../types/mod.ts";

/**
 * Creates a security context from permissions
 */
export function createSecurityContext(
    permissions?: PermissionSet
): SecurityContext {
    return {
        principal: crypto.randomUUID(),
        scope: "agent",
        context: {},
        timestamp: Date.now(),

        /**
         * Check if an action is permitted
         */
        async checkPermission(
            action: string,
            context?: Record<string, unknown>
        ): Promise<boolean> {
            if (!permissions) {
                return false;
            }

            // Network permissions
            if (action.startsWith("network:")) {
                return checkNetworkPermission(action, permissions);
            }

            // File system permissions
            if (action.startsWith("fs:")) {
                return checkFileSystemPermission(action, permissions);
            }

            // Function execution permissions
            if (action.startsWith("function:")) {
                return checkFunctionPermission(action, permissions);
            }

            // Environment permissions
            if (action.startsWith("env:")) {
                return checkEnvPermission(action, permissions);
            }

            // Message permissions
            if (action === "send_message" || action === "receive_message") {
                return true; // Basic messaging is always allowed
            }

            // Default deny
            return false;
        }
    };
}

/**
 * Check network permission
 */
function checkNetworkPermission(
    action: string,
    permissions: PermissionSet
): boolean {
    if (!permissions.network?.length) {
        return false;
    }

    const parts = action.split(":");
    if (parts.length < 2) {
        return false;
    }

    const host = parts[1];
    return permissions.network.some(perm => 
        perm.allow.includes(host) || 
        perm.allow.includes("*")
    );
}

/**
 * Check file system permission
 */
function checkFileSystemPermission(
    action: string,
    permissions: PermissionSet
): boolean {
    if (!permissions.fileSystem?.length) {
        return false;
    }

    const parts = action.split(":");
    if (parts.length < 3) {
        return false;
    }

    const [, operation, path] = parts;
    if (!operation || !path) {
        return false;
    }

    return permissions.fileSystem.some(perm => 
        perm.operations.includes(operation as any) &&
        perm.paths.some(allowedPath => 
            path.startsWith(allowedPath) || 
            allowedPath === "*"
        )
    );
}

/**
 * Check function execution permission
 */
function checkFunctionPermission(
    action: string,
    permissions: PermissionSet
): boolean {
    if (!permissions.execution?.length) {
        return false;
    }

    const parts = action.split(":");
    if (parts.length < 2) {
        return false;
    }

    const funcName = parts[1];
    if (!funcName) {
        return false;
    }

    return permissions.execution.some(perm =>
        perm.functions.includes(funcName) ||
        perm.functions.includes("*")
    );
}

/**
 * Check environment variable permission
 */
function checkEnvPermission(
    action: string,
    permissions: PermissionSet
): boolean {
    if (!permissions.env?.length) {
        return false;
    }

    const parts = action.split(":");
    if (parts.length < 3) {
        return false;
    }

    const [, operation, varName] = parts;
    if (!operation || !varName) {
        return false;
    }

    return permissions.env.some(perm =>
        perm.operations.includes(operation as any) &&
        perm.variables.includes(varName)
    );
}
