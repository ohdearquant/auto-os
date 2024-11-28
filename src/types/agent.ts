/**
 * Agent-related type definitions
 * @module types/agent
 */

import type { LLMConfig } from "./config.ts";
import type { PermissionSet } from "./security.ts";

/**
 * Supported agent types in the framework
 */
export type AgentType = "base" | "conversable" | "assistant" | "userProxy" | "custom";

/**
 * Configuration options for agent initialization
 */
export interface AgentConfig {
    /** Unique identifier for the agent */
    readonly id: string;
    /** Display name of the agent */
    readonly name: string;
    /** Type of agent being configured */
    readonly type: AgentType;
    /** System message defining agent behavior */
    systemMessage?: string;
    /** Configuration for LLM integration */
    llmConfig?: LLMConfig | false;
    /** Maximum number of consecutive auto-replies */
    maxConsecutiveAutoReply?: number;
    /** Human input requirement mode */
    humanInputMode?: "ALWAYS" | "NEVER" | "TERMINATE";
    /** Security permissions for the agent */
    permissions?: PermissionSet;
    /** Custom metadata for agent extension */
    metadata?: Record<string, unknown>;
}

/**
 * Base agent state interface
 */
export interface AgentState {
    /** Current agent status */
    status: AgentStatus;
    /** Active conversation IDs */
    activeConversations: Set<string>;
    /** Registered function names */
    registeredFunctions: Set<string>;
    /** Current message count */
    messageCount: number;
    /** Last activity timestamp */
    lastActivity: number;
}

/**
 * Agent status enumeration
 */
export type AgentStatus = "idle" | "busy" | "error" | "terminated";
