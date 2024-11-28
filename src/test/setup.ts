/**
 * Test setup and utilities
 * @module test/setup
 */

import { SecurityContext, Message } from "../types/mod.ts";

/**
 * Creates a test security context
 */
export function createTestContext(): SecurityContext {
    return {
        async checkPermission(
            action: string,
            context?: Record<string, unknown>
        ): Promise<boolean> {
            return true; // Allow all in tests
        }
    };
}

/**
 * Creates test message data
 */
export function createTestMessage(
    partial?: Partial<Message>
): Message {
    return {
        id: crypto.randomUUID(),
        role: "user",
        content: "Test message",
        metadata: {
            senderId: "test-sender",
            recipientId: "test-recipient",
            conversationId: "test-conversation",
            timestamp: Date.now()
        },
        timestamp: Date.now(),
        ...partial
    };
}
