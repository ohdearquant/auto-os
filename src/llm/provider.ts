/**
 * Base LLM provider implementation
 * @module llm/provider
 */

import {
    LLMConfig,
    Message,
    SecurityContext,
    DenoAgentsError,
    SecurityError,
    ErrorCode
} from "../types/mod.ts";
import { Logger } from "../utils/logger.ts";

export interface LLMResponse {
    content: string;
    usage: TokenUsage;
    metadata: ResponseMetadata;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
}

export interface ResponseMetadata {
    model: string;
    provider: string;
    timestamp: number;
    latency: number;
}

/**
 * Abstract base LLM provider
 */
export abstract class BaseLLMProvider {
    protected readonly logger: Logger;

    constructor(
        protected readonly config: LLMConfig,
        protected readonly security: SecurityContext
    ) {
        this.logger = new Logger({
            source: `LLMProvider(${config.provider})`,
            level: "info"
        });
    }

    /**
     * Generates completion from messages
     */
    public async complete(
        messages: Message[]
    ): Promise<LLMResponse> {
        const startTime = Date.now();
        
        try {
            await this.checkPermissions("llm_access");
            await this.validateMessages(messages);
            
            const response = await this.generateCompletion(messages);
            
            return {
                ...response,
                metadata: {
                    ...response.metadata,
                    latency: Date.now() - startTime
                }
            };
        } catch (error) {
            this.logger.error("Completion failed", { error });
            throw new DenoAgentsError(
                "LLM completion failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    protected abstract generateCompletion(
        messages: Message[]
    ): Promise<LLMResponse>;

    protected abstract validateMessages(
        messages: Message[]
    ): Promise<void>;

    protected async checkPermissions(
        action: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        const allowed = await this.security.checkPermission(
            action,
            context
        );
        
        if (!allowed) {
            throw new SecurityError(
                `Permission denied: ${action}`,
                { context }
            );
        }
    }
}
