/**
 * LLM model manager implementation
 * @module llm/model_manager
 */

import { BaseLLMProvider } from "./provider.ts";
import { OpenAIProvider } from "./openai_provider.ts";
import { AzureOpenAIProvider } from "./azure_provider.ts";
import {
    LLMConfig,
    SecurityContext,
    ValidationError
} from "../types/mod.ts";
import { Logger } from "../utils/logger.ts";

export class ModelManager {
    private readonly providers = new Map<string, BaseLLMProvider>();
    private readonly logger: Logger;

    constructor(
        private readonly security: SecurityContext
    ) {
        this.logger = new Logger({
            source: "ModelManager",
            level: "info"
        });
    }

    /**
     * Registers a new LLM provider
     */
    public async registerProvider(
        config: LLMConfig
    ): Promise<void> {
        await this.validateConfig(config);
        
        const provider = this.createProvider(config);
        this.providers.set(config.provider, provider);
        
        this.logger.info("Registered provider", {
            provider: config.provider
        });
    }

    /**
     * Gets a provider instance
     */
    public getProvider(
        provider: string
    ): BaseLLMProvider {
        const instance = this.providers.get(provider);
        if (!instance) {
            throw new Error(`Provider not found: ${provider}`);
        }
        return instance;
    }

    private createProvider(
        config: LLMConfig
    ): BaseLLMProvider {
        switch (config.provider) {
            case "openai":
                return new OpenAIProvider(config, this.security);
            case "azure":
                return new AzureOpenAIProvider(config, this.security);
            default:
                throw new Error(
                    `Unsupported provider: ${config.provider}`
                );
        }
    }

    private async validateConfig(
        config: LLMConfig
    ): Promise<void> {
        if (!config.provider || !config.model) {
            throw new ValidationError(
                "Provider and model required"
            );
        }

        if (!config.apiConfig.apiKey) {
            throw new ValidationError("API key required");
        }

        // Provider-specific validation
        switch (config.provider) {
            case "azure":
                if (!config.apiConfig.endpoint ||
                    !config.apiConfig.deployment) {
                    throw new ValidationError(
                        "Azure requires endpoint and deployment"
                    );
                }
                break;
        }
    }
}
