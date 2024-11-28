/**
 * Azure OpenAI provider implementation
 * @module llm/azure_provider
 */

import { OpenAIProvider } from "./openai_provider.ts";
import { 
    LLMConfig, 
    SecurityContext,
    ValidationError
} from "../types/mod.ts";

interface AzureConfig extends LLMConfig {
    apiConfig: {
        apiKey: string;
        endpoint: string;
        deployment: string;
    };
}

export class AzureOpenAIProvider extends OpenAIProvider {
    constructor(config: AzureConfig, security: SecurityContext) {
        super(config, security);
        
        if (!config.apiConfig.endpoint || !config.apiConfig.deployment) {
            throw new ValidationError(
                "Azure OpenAI requires endpoint and deployment"
            );
        }
        
        // Override endpoint and headers for Azure
        this.apiEndpoint = this.buildAzureEndpoint(config);
        this.headers = new Headers({
            "api-key": config.apiConfig.apiKey,
            "Content-Type": "application/json"
        });
    }

    private buildAzureEndpoint(config: AzureConfig): string {
        const { endpoint, deployment } = config.apiConfig;
        return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-05-15`;
    }

    protected override async generateCompletion(
        messages: Message[]
    ): Promise<LLMResponse> {
        // Azure requires deployment name instead of model in the request
        const body = {
            messages: this.formatMessages(messages),
            temperature: this.config.parameters?.temperature ?? 0.7,
            max_tokens: this.config.parameters?.maxTokens,
            top_p: this.config.parameters?.topP
        };

        const response = await fetch(this.apiEndpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(
                `Azure OpenAI API error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        return {
            ...this.formatResponse(data),
            metadata: {
                model: this.config.model,
                provider: "azure",
                timestamp: Date.now(),
                latency: 0  // Set by base class
            }
        };
    }
}
