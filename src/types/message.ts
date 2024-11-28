/**
 * Message-related type definitions
 * @module types/message
 */

import { FunctionCall, ToolCall } from "./function.ts";

/**
 * Supported message roles
 */
export type MessageRole = "system" | "user" | "assistant" | "function" | "tool";

/**
 * Content types that can be included in messages
 */
export type MessageContent = string | null | {
    text?: string;
    images?: ImageContent[];
    files?: FileContent[];
};

/**
 * Image content in messages
 */
export interface ImageContent {
    readonly url: string;
    readonly alt?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * File content in messages
 */
export interface FileContent {
    readonly url: string;
    readonly filename: string;
    readonly mimeType: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Message metadata interface
 */
export interface MessageMetadata {
    readonly senderId: string;
    readonly recipientId: string;
    readonly conversationId: string;
    readonly timestamp: number;
    readonly parentMessageId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Core message interface
 */
export interface Message {
    readonly id: string;
    readonly role: MessageRole;
    readonly content: MessageContent;
    readonly name?: string;
    readonly timestamp: number;
    readonly function_call?: FunctionCall;
    readonly tool_calls?: ToolCall[];
    readonly metadata: MessageMetadata;
}

/**
 * Chat history interface
 */
export interface ChatHistory {
    readonly messages: Message[];
    readonly summary?: string;
    
    add(message: Message): Promise<void>;
    clear(): Promise<void>;
    getSummary(): Promise<string>;
}

/**
 * Message validation interface
 */
export interface MessageValidator {
    validateMessage(message: Message): Promise<boolean>;
    validateContent(content: MessageContent): Promise<boolean>;
    validateMetadata(metadata: MessageMetadata): Promise<boolean>;
}

/**
 * Message transformation interface
 */
export interface MessageTransformer {
    transform(message: Message): Promise<Message>;
    rewrite(content: MessageContent): Promise<MessageContent>;
    enrich(metadata: MessageMetadata): Promise<MessageMetadata>;
}

/**
 * Message filtering interface
 */
export interface MessageFilter {
    shouldProcess(message: Message): Promise<boolean>;
    filterContent(content: MessageContent): Promise<MessageContent>;
    filterMetadata(metadata: MessageMetadata): Promise<MessageMetadata>;
}

/**
 * Message routing interface
 */
export interface MessageRouter {
    route(message: Message): Promise<string[]>;
    getRecipients(message: Message): Promise<string[]>;
    shouldRoute(message: Message): Promise<boolean>;
}

/**
 * Message storage interface
 */
export interface MessageStorage {
    save(message: Message): Promise<void>;
    load(messageId: string): Promise<Message>;
    delete(messageId: string): Promise<void>;
    list(filter?: MessageFilter): Promise<Message[]>;
}

/**
 * Message metrics interface
 */
export interface MessageMetrics {
    readonly totalMessages: number;
    readonly messagesByRole: Record<MessageRole, number>;
    readonly averageResponseTime: number;
    readonly errorRate: number;
}
