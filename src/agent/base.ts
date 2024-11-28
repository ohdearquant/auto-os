/**
 * Enhanced base agent with performance monitoring
 * @module agent/base
 */

import {
    Message,
    AgentConfig,
    AgentState,
    AgentStatus,
    SecurityContext,
    ValidationError,
    MessageMetadata,
    RuntimeError,
} from "../types/mod.ts";
import { Logger } from "../utils/logger.ts";
import { PerformanceOptimizer } from "../utils/performance.ts";
import { SecurityPolicy } from "../security/policy.ts";
import { SecurityValidator } from "../security/validator.ts";

/**
 * Base agent implementation with security and performance
 */
export abstract class BaseAgent {
    protected readonly state: AgentState;
    protected readonly logger: Logger;
    private readonly optimizer: PerformanceOptimizer;
    private readonly security: SecurityPolicy;

    constructor(public readonly config: AgentConfig) {
        // Validate required config fields
        if (!config.name || config.name.trim() === "") {
            throw new ValidationError("Agent name is required");
        }

        this.state = this.initializeState();
        this.logger = new Logger({
            source: `Agent(${config.name})`,
            level: "info"
        });
        
        this.optimizer = new PerformanceOptimizer({
            memory: 256 * 1024 * 1024, // 256MB
            cpu: 1000 // 1s
        });
        
        this.security = new SecurityPolicy(
            this.createSecurityContext()
        );
    }

    /**
     * Enhanced message sending with security and performance
     */
    public async sendMessage(
        message: Message,
        recipient: BaseAgent
    ): Promise<Message> {
        if (this.state.status === "terminated") {
            throw new Error("Agent is terminated");
        }

        return await this.optimizer.monitor(async () => {
            try {
                // Validate message security
                await SecurityValidator.validateInput(
                    message,
                    this.createSecurityContext()
                );

                // Check permissions
                await this.security.enforcePermissions(
                    "send_message",
                    recipient.getId()
                );

                // Check rate limits
                await this.security.enforceRateLimit(
                    "send_message",
                    100, // 100 messages
                    60000 // per minute
                );

                const response = await recipient.receiveMessage(message, this);

                // Validate response
                await SecurityValidator.validateInput(
                    response,
                    this.createSecurityContext()
                );

                return response;
            } catch (error) {
                this.logger.error("Message sending failed", {
                    error
                });
                throw new RuntimeError("Message sending failed", { originalError: error });
            }
        });
    }

    /**
     * Creates a new message with updated metadata
     */
    protected createMessage(
        originalMessage: Message,
        content: string,
        role: Message["role"] = "assistant"
    ): Message {
        const metadata: MessageMetadata = {
            senderId: this.getId(),
            recipientId: originalMessage.metadata.senderId,
            conversationId: originalMessage.metadata.conversationId,
            timestamp: Date.now(),
            parentMessageId: originalMessage.id
        };

        return {
            id: crypto.randomUUID(),
            role,
            content,
            timestamp: Date.now(),
            metadata
        };
    }

    /**
     * Receives a message from another agent
     */
    public abstract receiveMessage(
        message: Message,
        sender: BaseAgent
    ): Promise<Message>;

    /**
     * Handles system messages
     */
    protected abstract handleSystemMessage(message: Message): Promise<Message>;

    /**
     * Handles user messages
     */
    protected abstract handleUserMessage(message: Message): Promise<Message>;

    /**
     * Handles function messages
     */
    protected abstract handleFunctionMessage(message: Message): Promise<Message>;

    /**
     * Handles tool messages
     */
    protected abstract handleToolMessage(message: Message): Promise<Message>;

    /**
     * Batch process multiple operations efficiently
     */
    protected async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>
    ): Promise<R[]> {
        return await this.optimizer.processBatch(
            items,
            processor,
            10 // batch size
        );
    }

    /**
     * Gets agent identifier
     */
    public getId(): string {
        return this.config.id;
    }

    /**
     * Gets agent name
     */
    public getName(): string {
        return this.config.name;
    }

    /**
     * Gets agent type
     */
    public getType(): string {
        return this.config.type;
    }

    /**
     * Gets current agent state
     */
    public getState(): AgentState {
        return { ...this.state };
    }

    /**
     * Terminates the agent
     */
    public async terminate(): Promise<void> {
        this.updateStatus("terminated");
    }

    /**
     * Resets the agent state
     */
    public async reset(): Promise<void> {
        const newState = this.initializeState();
        this.updateState(newState);
    }

    /**
     * Updates agent status
     */
    protected updateStatus(status: AgentStatus): void {
        this.state.status = status;
        this.state.lastActivity = Date.now();
    }

    /**
     * Updates agent state
     */
    protected updateState(newState: AgentState): void {
        this.state.status = newState.status;
        this.state.messageCount = newState.messageCount;
        this.state.lastActivity = newState.lastActivity;
        this.state.activeConversations = new Set(newState.activeConversations);
        this.state.registeredFunctions = new Set(newState.registeredFunctions);
    }

    /**
     * Initializes agent state
     */
    protected initializeState(): AgentState {
        return {
            status: "idle",
            messageCount: 0,
            lastActivity: Date.now(),
            activeConversations: new Set(),
            registeredFunctions: new Set()
        };
    }

    /**
     * Creates security context
     */
    protected createSecurityContext(): SecurityContext {
        return {
            principal: this.config.id,
            scope: `agent:${this.config.id}`,
            context: {
                agentType: this.config.type,
                permissions: this.config.permissions
            },
            timestamp: Date.now(),
            async checkPermission(
                _action: string,
                _context?: Record<string, unknown>
            ): Promise<boolean> {
                // Implement permission checking
                return true; // Placeholder
            }
        };
    }
}
