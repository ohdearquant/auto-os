/**
 * DenoAgents Framework Main Module
 * @module denoagents
 */

// Core exports
export {
    BaseAgent,
    ConversableAgent,
    AssistantAgent,
    UserProxyAgent
} from "./agent/mod.ts";

export {
    DirectChat,
    GroupChat,
    ChatManager
} from "./chat/mod.ts";

export {
    OpenAIProvider,
    AzureOpenAIProvider,
    ModelManager
} from "./llm/mod.ts";

export {
    FunctionRegistry,
    FunctionExecutor
} from "./agent/function/mod.ts";

// Type exports
export type {
    AgentConfig,
    Message,
    FunctionDefinition,
    ToolDefinition,
    SecurityContext,
    ResourceLimits
} from "./types/mod.ts";

// Utility exports
export {
    SecurityValidator,
    PerformanceOptimizer,
    Logger
} from "./utils/mod.ts";

// Version information
export const VERSION = "1.0.0";

// Integration phases
export const INTEGRATION_PHASES = {
    phase1: {
        name: "Core Systems Integration",
        components: [
            "Base Agent",
            "Message System",
            "Security Layer",
            "Performance Monitor"
        ],
        dependencies: [],
        validation: "Core functionality tests"
    },
    phase2: {
        name: "Feature Systems Integration",
        components: [
            "Conversable Agent",
            "Chat System",
            "Function Registry"
        ],
        dependencies: ["phase1"],
        validation: "Feature integration tests"
    },
    phase3: {
        name: "External Systems Integration",
        components: [
            "LLM Integration",
            "Tool System",
            "Plugin System"
        ],
        dependencies: ["phase2"],
        validation: "External systems tests"
    }
} as const;

// Integration verification checklist
export const INTEGRATION_CHECKLIST = {
    codeQuality: [
        "TypeScript strict mode enabled",
        "No implicit any types",
        "Consistent code formatting",
        "Comprehensive documentation"
    ],
    testing: [
        "Unit tests passing",
        "Integration tests passing",
        "Coverage requirements met",
        "Performance benchmarks passed"
    ],
    security: [
        "Permission system validated",
        "Input validation implemented",
        "Secure defaults confirmed",
        "Security tests passing"
    ],
    performance: [
        "Memory usage within limits",
        "Response times acceptable",
        "Resource cleanup verified",
        "Monitoring implemented"
    ],
    compatibility: [
        "Module imports working",
        "API consistency verified",
        "Type definitions aligned",
        "Version compatibility checked"
    ],
    documentation: [
        "API documentation complete",
        "Integration guide updated",
        "Examples provided",
        "Change log updated"
    ]
} as const;
