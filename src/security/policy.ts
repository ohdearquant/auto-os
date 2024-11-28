/**
 * Security policy enforcement
 * @module security/policy
 */

import {
    SecurityContext,
    Permission,
    SecurityError
} from "../types/mod.ts";

/**
 * Enforces security policies
 */
export class SecurityPolicy {
    private static readonly DEFAULT_PERMISSIONS: Permission[] = [
        { type: "read", scope: "self" },
        { type: "write", scope: "self" }
    ];

    private readonly permissionCache = new Map<string, boolean>();
    private readonly rateLimitCache = new Map<string, number[]>();

    constructor(
        private readonly context: SecurityContext
    ) {}

    /**
     * Validates and enforces permissions
     */
    public async enforcePermissions(
        action: string,
        resource: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        const cacheKey = `${action}:${resource}`;
        
        if (this.permissionCache.has(cacheKey)) {
            if (!this.permissionCache.get(cacheKey)) {
                throw new SecurityError(
                    `Permission denied: ${action} on ${resource}`
                );
            }
            return;
        }

        const allowed = await this.checkPermission(
            action,
            resource,
            context
        );
        
        this.permissionCache.set(cacheKey, allowed);

        if (!allowed) {
            throw new SecurityError(
                `Permission denied: ${action} on ${resource}`
            );
        }
    }

    /**
     * Implements rate limiting
     */
    public async enforceRateLimit(
        action: string,
        limit: number,
        window: number
    ): Promise<void> {
        const key = `ratelimit:${action}`;
        const now = Date.now();
        
        const usage = await this.getRateLimitUsage(key, now - window);
        
        if (usage >= limit) {
            throw new SecurityError(
                "Rate limit exceeded",
                { action, limit, window }
            );
        }

        await this.recordRateLimitUsage(key, now);
    }

    /**
     * Validates security scope
     */
    public async validateScope(
        scope: string,
        targetScope: string
    ): Promise<void> {
        if (!this.isInScope(scope, targetScope)) {
            throw new SecurityError(
                "Operation outside security scope",
                { scope, targetScope }
            );
        }
    }

    /**
     * Validates security principal
     */
    public async validatePrincipal(
        principal: string,
        requiredRole?: string
    ): Promise<void> {
        if (!this.context.principal) {
            throw new SecurityError("No security principal");
        }

        if (principal !== this.context.principal) {
            throw new SecurityError(
                "Principal mismatch",
                { principal, required: this.context.principal }
            );
        }

        if (requiredRole && !await this.hasRole(requiredRole)) {
            throw new SecurityError(
                "Insufficient role",
                { principal, requiredRole }
            );
        }
    }

    private async checkPermission(
        action: string,
        resource: string,
        context?: Record<string, unknown>
    ): Promise<boolean> {
        // Check against security context
        if (!this.context.principal) {
            return false;
        }

        // Check resource scope
        if (!this.isInScope(resource, this.context.scope)) {
            return false;
        }

        // Check specific permissions
        return await this.context.checkPermission(
            action,
            {
                resource,
                principal: this.context.principal,
                ...context
            }
        );
    }

    private async getRateLimitUsage(
        key: string,
        since: number
    ): Promise<number> {
        const timestamps = this.rateLimitCache.get(key) ?? [];
        const recentTimestamps = timestamps.filter(t => t >= since);
        this.rateLimitCache.set(key, recentTimestamps);
        return recentTimestamps.length;
    }

    private async recordRateLimitUsage(
        key: string,
        timestamp: number
    ): Promise<void> {
        const timestamps = this.rateLimitCache.get(key) ?? [];
        timestamps.push(timestamp);
        this.rateLimitCache.set(key, timestamps);
    }

    private isInScope(
        resource: string,
        scope: string
    ): boolean {
        return resource.startsWith(scope);
    }

    private async hasRole(role: string): Promise<boolean> {
        // Implement role checking
        return true; // Placeholder
    }

    /**
     * Clears security caches
     */
    public clearCaches(): void {
        this.permissionCache.clear();
        this.rateLimitCache.clear();
    }
}
