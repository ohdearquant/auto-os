/**
 * LLM-related type definitions
 * @module types/llm
 */

import { BaseConfig } from "./base.ts";
import { Message } from "./message.ts";
import { Result } from "./base.ts";

/**
 * LLM provider types
 */
export type LLMProvider = "openai" | "azure" | "anthropic" | "custom";

/**
 * Base LLM configuration
 */
export interface LLMConfig extends BaseConfig {
    readonly provider: LLMProvider;
    readonly model: string;
    readonly apiConfig: {
        readonly apiKey: string;
        readonly organization?: string;
        readonly endpoint?: string;
        readonly deployment?: string;
    };
    readonly parameters?: {
        readonly temperature?: number;
        readonly maxTokens?: number;
        readonly topP?: number;
        readonly frequencyPenalty?: number;
        readonly presencePenalty?: number;
        readonly stop?: string[];
    };
}

/**
 * LLM response interface
 */
export interface LLMResponse {
    readonly id: string;
    readonly message: Message;
    readonly usage: TokenUsage;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly cost?: number;
}

/**
 * LLM client interface
 */
export interface LLMClient {
    readonly config: LLMConfig;
    
    complete(messages: Message[]): Promise<Result<LLMResponse, Error>>;
    countTokens(text: string): Promise<number>;
    validateResponse(response: LLMResponse): Promise<boolean>;
}

/**
 * LLM rate limit configuration
 */
export interface RateLimitConfig {
    readonly requestsPerMinute: number;
    readonly tokensPerMinute: number;
    readonly costPerMinute?: number;
    readonly retryAfter?: number;
}

/**
 * LLM metrics interface
 */
export interface LLMMetrics {
    readonly totalRequests: number;
    readonly totalTokens: number;
    readonly totalCost: number;
    readonly averageLatency: number;
    readonly errorRate: number;
    readonly rateLimitHits: number;
}

/**
 * LLM cache interface
 */
export interface LLMCache {
    get(key: string): Promise<LLMResponse | undefined>;
    set(key: string, value: LLMResponse): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

/**
 * LLM retry configuration
 */
export interface RetryConfig {
    readonly maxRetries: number;
    readonly initialDelay: number;
    readonly maxDelay: number;
    readonly backoffFactor: number;
    readonly retryableErrors: string[];
}

/**
 * LLM model capabilities
 */
export interface ModelCapabilities {
    readonly maxTokens: number;
    readonly inputTokenLimit: number;
    readonly outputTokenLimit: number;
    readonly supportsFunctions: boolean;
    readonly supportsImages: boolean;
    readonly supportsChatHistory: boolean;
}

/**
 * LLM provider capabilities
 */
export interface ProviderCapabilities {
    readonly models: Record<string, ModelCapabilities>;
    readonly supportsStreaming: boolean;
    readonly supportsBatching: boolean;
    readonly supportsRetries: boolean;
    readonly supportsCaching: boolean;
}

/**
 * LLM provider status
 */
export interface ProviderStatus {
    readonly available: boolean;
    readonly latency: number;
    readonly errorRate: number;
    readonly rateLimitRemaining: number;
    readonly nextReset: number;
}
