/**
 * Test utilities
 * @module utils/test_utils
 */

import { SecurityContext } from "../types/mod.ts";

/**
 * Creates a test security context
 */
export function createTestSecurityContext(): SecurityContext {
    return {
        principal: "test-principal",
        scope: "test",
        context: {},
        timestamp: Date.now(),
        checkPermission: async () => true
    };
}

/**
 * Mock fetch for testing
 */
export function mockFetch(response: unknown): void {
    globalThis.fetch = async () => new Response(
        JSON.stringify(response)
    );
}

/**
 * Restore original fetch
 */
export function restoreFetch(): void {
    delete (globalThis as any).fetch;
}
