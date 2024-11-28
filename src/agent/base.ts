/**
 * Enhanced base agent with performance monitoring
 * @module agent/base
 */

import {
    Message,
    AgentConfig,
    AgentState,
    DenoAgentsError,
    SecurityContext
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

    constructor(protected readonly config: AgentConfig) {
        this.state = this.initializeState();
        this.logger = new Logger({
            source: `Agent(${config.name})`
        });
        
        this.optimizer = new PerformanceOptimizer(
            config.limits ?? {
                memory: 256 * 1024 * 1024, // 256MB
                cpu: 1000 // 1s
            }
        );
        
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
        return await this.optimizer.monitor(async () => {
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

            try {
                const response = await recipient.receiveMessage(
                    message,
                    this
                );

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
                throw new DenoAgentsError(
                    "Message sending failed",
                    { originalError: error }
                );
            }
        });
    }

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
     * Receives a message from another agent
     */
    public abstract receiveMessage(
        message: Message,
        sender: BaseAgent
    ): Promise<Message>;

    /**
     * Initializes agent state
     */
    protected initializeState(): AgentState {
        return {
            status: "idle",
            messageCount: 0,
            lastActivity: Date.now()
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
                action: string,
                context?: Record<string, unknown>
            ): Promise<boolean> {
                // Implement permission checking
                return true; // Placeholder
            }
        };
    }
}
