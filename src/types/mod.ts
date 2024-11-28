/**
 * Core type exports for the DenoAgents Framework
 * @module types
 */

// Re-export all type definitions
export * from "./agent.ts";
export * from "./message.ts";
export * from "./function.ts";
export * from "./security.ts";
export * from "./error.ts";
export * from "./config.ts";
export * from "./base.ts";
export * from "./llm.ts";
export * from "./constraints.ts";

// Export convenience type unions
export type { Result } from "./base.ts";
export type { Message, MessageContent, MessageMetadata } from "./message.ts";
export type { FunctionDefinition, FunctionCall, JSONSchema } from "./function.ts";
export type { SecurityContext, PermissionSet, ResourceLimits } from "./security.ts";
export type { LLMConfig, LLMResponse, TokenUsage } from "./llm.ts";
export type { AgentConfig, AgentState, AgentStatus } from "./agent.ts";
export type { FrameworkConfig } from "./config.ts";

// Export error types explicitly
export { DenoAgentsError, ErrorCode } from "./error.ts";
export { ValidationError } from "./error.ts";
export { SecurityError } from "./error.ts";
export { ResourceError } from "./error.ts";
export { TimeoutError } from "./error.ts";
export type { 
    RuntimeDependency,
    ExternalAPI,
    PerformanceLimits,
    ResourceConstraints,
    APIConstraints,
    SecurityRequirements,
    CodeRequirements,
    ArchitecturalConstraints 
} from "./constraints.ts";

// Export constants
export {
    REQUIRED_RUNTIME,
    EXTERNAL_APIS,
    PERFORMANCE_LIMITS,
    RESOURCE_CONSTRAINTS,
    API_CONSTRAINTS,
    SECURITY_REQUIREMENTS,
    CODE_REQUIREMENTS,
    ARCHITECTURAL_CONSTRAINTS
} from "./constraints.ts";
