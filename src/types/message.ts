/**
 * Message-related type definitions
 * @module types/message
 */

import { FunctionCall, FunctionResult } from "./function.ts";
/**
 * Tool call interface
 */
export interface ToolCall {
    /** Unique identifier for the tool call */
    id: string;
    /** Name of the tool being called */
    toolName: string;
    /** Parameters for the tool call */
    parameters: Record<string, unknown>;
    /** Result of the tool call (if applicable) */
    result?: unknown;
}
/**
 * Core message interface
 */
export interface Message {
    /** Unique message identifier */
    readonly id: string;
    /** Role of the message sender */
    role: MessageRole;
    /** Message content */
    content: MessageContent;
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
    /** Parent message reference */
    parentId?: string;
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
 * Message content interface
 */
export interface MessageContent {
    /** Text content */
    text?: string;
    /** Function call details (if applicable) */
    functionCall?: FunctionCall;
    /** Function result details (if applicable) */
    functionResult?: FunctionResult;
}

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
}

/**
 * Message router interface
 */
export interface MessageRouter {
    /**
     * Route a message to its intended recipient(s)
     * @param message Message to be routed
     * @returns Promise resolving to an array of recipient IDs
     */
    route(message: Message): Promise<string[]>;
    /**
     * Register an agent with a routing pattern
     * @param agentId Unique identifier of the agent
     * @param pattern Routing pattern for the agent
     */
    register(agentId: string, pattern: string): void;
    /**
     * Unregister an agent
     * @param agentId Unique identifier of the agent
     */
    unregister(agentId: string): void;
}

/**
 * Message queue interface
 */
export interface MessageQueue {
    /**
     * Enqueue a message for processing
     * @param message Message to be enqueued
     * @returns Promise resolving when the message is enqueued
     */
    enqueue(message: Message): Promise<void>;
    /**
     * Dequeue a message from the queue
     * @returns Promise resolving to the dequeued message, or undefined if the queue is empty
     */
    dequeue(): Promise<Message | undefined>;
    /**
     * Peek at the next message in the queue without removing it
     * @returns Promise resolving to the next message, or undefined if the queue is empty
     */
    peek(): Promise<Message | undefined>;
    /**
     * Get the current size of the queue
     * @returns Promise resolving to the queue size
     */
    size(): Promise<number>;
}

/**
 * Message store interface
 */
export interface MessageStore {
    /**
     * Save a message to the store
     * @param message Message to be saved
     * @returns Promise resolving when the message is saved
     */
    save(message: Message): Promise<void>;
    /**
     * Retrieve a message by its ID
     * @param id Unique identifier of the message
     * @returns Promise resolving to the message, or undefined if not found
     */
    get(id: string): Promise<Message | undefined>;
    /**
     * Retrieve a thread of messages by their parent ID
     * @param parentId Unique identifier of the parent message
     * @returns Promise resolving to an array of messages in the thread
     */
    getThread(parentId: string): Promise<Message[]>;
    /**
     * Delete a message by its ID
     * @param id Unique identifier of the message
     * @returns Promise resolving when the message is deleted
     */
    delete(id: string): Promise<void>;
}