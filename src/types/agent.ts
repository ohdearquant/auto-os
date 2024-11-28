/**
 * Agent-related type definitions
 * @module types/agent
 */

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

import { Message } from "./message.ts";
import { PermissionSet, SecurityContext } from "./security.ts";
import { FunctionRegistry } from "./function.ts";
import { LLMConfig } from '@/types/config.ts';

/**
 * Agent configuration options
 */
export interface AgentConfig {
  /**
   * Display name of the agent
   */
  readonly name: string;
  /**
   * Optional description of the agent
   */
  description?: string;
  /**
   * Model used by the agent
   */
  model: string;
  /**
   * Temperature value for the agent
   */
  temperature?: number;
  /**
   * Maximum number of tokens for the agent
   */
  maxTokens?: number;
  /**
   * Stop sequences for the agent
   */
  stopSequences?: string[];
  /**
   * Registered functions for the agent
   */
  functions?: FunctionRegistry;
  /**
   * Security context for the agent
   */
  security?: SecurityContext;
}

/**
 * Agent interface
 */
export interface Agent {
  /**
   * Unique identifier for the agent
   */
  id: string;
  /**
   * Agent configuration
   */
  config: AgentConfig;
  /**
   * Send a message
   * @param message Message to send
   * @returns Promise resolving to the sent message
   */
  send(message: Message): Promise<Message>;
  /**
   * Receive a message
   * @param message Message to receive
   * @returns Promise resolving when the message is received
   */
  receive(message: Message): Promise<void>;
}

/**
 * Conversable agent interface
 */
export interface ConversableAgent extends Agent {
  /**
   * Conversation history
   */
  conversation: Message[];
  /**
   * Memory for the conversable agent
   */
  memory: {
    /**
     * Short-term memory
     */
    shortTerm: Message[];
    /**
     * Long-term memory (optional)
     */
    longTerm?: Message[];
  };
  /**
   * Add a message to the memory
   * @param message Message to add
   */
  addToMemory(message: Message): void;
  /**
   * Clear the memory
   */
  clearMemory(): void;
  /**
   * Summarize the memory
   * @returns Promise resolving to a summary of the memory
   */
  summarizeMemory(): Promise<string>;
}

/**
 * Agent factory interface
 */
export interface AgentFactory {
  /**
   * Create an agent
   * @param config Agent configuration
   * @returns Promise resolving to the created agent
   */
  create(config: AgentConfig): Promise<Agent>;
  /**
   * Create a conversable agent
   * @param config Agent configuration
   * @returns Promise resolving to the created conversable agent
   */
  createConversable(config: AgentConfig): Promise<ConversableAgent>;
}