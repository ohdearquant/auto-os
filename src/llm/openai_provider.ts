/**
 * OpenAI provider implementation
 * @module llm/openai_provider
 */

import { BaseLLMProvider, LLMResponse } from "./provider.ts";
import {
    Message,
    LLMConfig,
    ValidationError,
    SecurityContext
} from "../types/mod.ts";

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
            role: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    model: string;
}

export class OpenAIProvider extends BaseLLMProvider {
    protected readonly apiEndpoint: string;
    protected readonly headers: Headers;

    constructor(config: LLMConfig, security: SecurityContext) {
        super(config, security);
        
        this.apiEndpoint = "https://api.openai.com/v1/chat/completions";
        this.headers = new Headers({
            "Authorization": `Bearer ${config.apiConfig.apiKey}`,
            "Content-Type": "application/json"
        });

        if (config.apiConfig.organization) {
            this.headers.set(
                "OpenAI-Organization",
                config.apiConfig.organization
            );
        }
    }

    protected async generateCompletion(
        messages: Message[]
    ): Promise<LLMResponse> {
        const response = await fetch(this.apiEndpoint, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                model: this.config.model,
                messages: this.formatMessages(messages),
                temperature: this.config.parameters?.temperature ?? 0.7,
                max_tokens: this.config.parameters?.maxTokens,
                top_p: this.config.parameters?.topP
            })
        });

        if (!response.ok) {
            throw new Error(
                `OpenAI API error: ${response.status} ${response.statusText}`
            );
        }

        const data: OpenAIResponse = await response.json();
        return this.formatResponse(data);
    }

    protected async validateMessages(
        messages: Message[]
    ): Promise<void> {
        if (!messages.length) {
            throw new ValidationError("Empty message array");
        }

        for (const message of messages) {
            if (!message.role || !message.content) {
                throw new ValidationError(
                    "Invalid message format"
                );
            }
        }
    }

    private formatMessages(messages: Message[]): Array<{
        role: string;
        content: string;
    }> {
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content ?? ""
        }));
    }

    private formatResponse(
        response: OpenAIResponse
    ): LLMResponse {
        const choice = response.choices[0];
        if (!choice) {
            throw new Error("Empty response from OpenAI");
        }

        return {
            content: choice.message.content,
            usage: {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
                cost: this.calculateCost(
                    response.usage,
                    response.model
                )
            },
            metadata: {
                model: response.model,
                provider: "openai",
                timestamp: Date.now(),
                latency: 0  // Set by base class
            }
        };
    }

    private calculateCost(
        usage: OpenAIResponse["usage"],
        model: string
    ): number {
        // Cost per 1K tokens (as of 2023)
        const rates: Record<string, { input: number; output: number }> = {
            "gpt-4": { input: 0.03, output: 0.06 },
            "gpt-4-32k": { input: 0.06, output: 0.12 },
            "gpt-3.5-turbo": { input: 0.0015, output: 0.002 }
        };

        const rate = rates[model] ?? rates["gpt-3.5-turbo"];
        
        return (
            (usage.prompt_tokens / 1000) * rate.input +
            (usage.completion_tokens / 1000) * rate.output
        );
    }
}
