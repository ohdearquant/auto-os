/**
 * Security validation and enforcement
 * @module security/validator
 */

import {
    SecurityContext,
    Permission,
    ValidationError,
    SecurityError
} from "../types/mod.ts";

/**
 * Enhanced input validation with security checks
 */
export class SecurityValidator {
    private static readonly INJECTION_PATTERNS = [
        /(eval|exec)\s*\(/i,
        /import\s*\(/i,
        /require\s*\(/i
    ];

    /**
     * Validates and sanitizes input with security checks
     */
    public static async validateInput(
        input: unknown,
        context: SecurityContext
    ): Promise<void> {
        // Type checking
        if (typeof input === "string") {
            await SecurityValidator.validateString(input);
        } else if (typeof input === "object") {
            await SecurityValidator.validateObject(input);
        }

        // Resource size validation
        await SecurityValidator.validateResourceLimits(input);

        // Context-specific validation
        await SecurityValidator.validateContext(input, context);
    }

    /**
     * Validates string content for security issues
     */
    private static async validateString(
        input: string
    ): Promise<void> {
        // Check for code injection attempts
        for (const pattern of SecurityValidator.INJECTION_PATTERNS) {
            if (pattern.test(input)) {
                throw new SecurityError(
                    "Potential code injection detected"
                );
            }
        }

        // Size limits
        if (input.length > 1000000) { // 1MB limit
            throw new ValidationError("Input exceeds size limit");
        }

        // Character encoding validation
        if (!SecurityValidator.isValidEncoding(input)) {
            throw new ValidationError("Invalid character encoding");
        }
    }

    /**
     * Validates object structure and content
     */
    private static async validateObject(
        input: unknown
    ): Promise<void> {
        if (!input || typeof input !== "object") {
            return;
        }

        // Prototype pollution prevention
        if (Object.prototype.hasOwnProperty.call(input, "__proto__")) {
            throw new SecurityError(
                "Prototype pollution attempt detected"
            );
        }

        // Recursive validation
        for (const value of Object.values(input)) {
            if (typeof value === "string") {
                await SecurityValidator.validateString(value);
            } else if (typeof value === "object") {
                await SecurityValidator.validateObject(value);
            }
        }
    }

    /**
     * Validates resource limits
     */
    private static async validateResourceLimits(
        input: unknown
    ): Promise<void> {
        const size = SecurityValidator.calculateSize(input);
        if (size > 10 * 1024 * 1024) { // 10MB limit
            throw new ValidationError("Input exceeds resource limits");
        }
    }

    /**
     * Validates input against security context
     */
    private static async validateContext(
        input: unknown,
        context: SecurityContext
    ): Promise<void> {
        // Implement context-specific validation
        if (!context.principal) {
            throw new SecurityError("No security principal");
        }

        // Validate against context scope
        if (!SecurityValidator.isInScope(input, context.scope)) {
            throw new SecurityError("Input outside security scope");
        }
    }

    private static isValidEncoding(input: string): boolean {
        try {
            return input === decodeURIComponent(
                encodeURIComponent(input)
            );
        } catch {
            return false;
        }
    }

    private static calculateSize(input: unknown): number {
        try {
            const json = JSON.stringify(input);
            return new TextEncoder().encode(json).length;
        } catch {
            return 0;
        }
    }

    private static isInScope(
        input: unknown,
        scope: string
    ): boolean {
        // Implement scope validation
        return true; // Placeholder
    }
}
