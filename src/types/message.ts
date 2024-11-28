/**
 * Message-related type definitions
 * @module types/message
 */

import type { FunctionCall, ToolCall } from "./function.ts";

/**
 * Core message interface
 */
export interface Message {
    /** Unique message identifier */
    readonly id: string;
    /** Role of the message sender */
    role: MessageRole;
    /** Message content */
    content: string | null;
    /** Name of the sender (optional) */
    name?: string;
    /** Function call details (if applicable) */
    functionCall?: FunctionCall;
    /** Tool call details (if applicable) */
    toolCalls?: ToolCall[];
    /** Message metadata */
    metadata: MessageMetadata;
    /** Creation timestamp */
    timestamp: number;
}

/**
 * Available message roles
 */
export type MessageRole = 
    | "system"
    | "user"
    | "assistant"
    | "function"
    | "tool";

/**
 * Message metadata interface
 */
export interface MessageMetadata {
    /** Sender identifier */
    senderId: string;
    /** Recipient identifier */
    recipientId: string;
    /** Conversation context */
    conversationId: string;
    /** Parent message reference */
    parentMessageId?: string;
    /** Thread identifier for grouped messages */
    threadId?: string;
    /** Custom metadata extensions */
    extensions?: Record<string, unknown>;
    /** Metadata timestamp */
    timestamp: number;
}

/**
 * Message handler type
 */
export type MessageHandler = (message: Message) => void | Promise<void>;
