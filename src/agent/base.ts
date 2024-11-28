/**
 * Base Agent Implementation
 * @module agent/base
 */

import { 
    AgentConfig, 
    AgentState, 
    Message, 
    DenoAgentsError,
    SecurityContext,
    ValidationError,
    SecurityError,
    ErrorCode
} from "../types/mod.ts";
import { validateMessage } from "../utils/validation.ts";
import { createSecurityContext } from "../utils/security.ts";
import { Logger } from "../utils/logger.ts";

/**
 * Abstract base agent class providing core agent functionality
 */
export abstract class BaseAgent {
    protected readonly state: AgentState;
    protected readonly security: SecurityContext;
    protected readonly logger: Logger;

    /**
     * Creates a new base agent instance
     * @param config Agent configuration
     * @throws ValidationError if configuration is invalid
     */
    constructor(protected readonly config: AgentConfig) {
        this.validateConfig(config);
        
        this.state = this.initializeState();
        this.security = createSecurityContext(config.permissions);
        this.logger = new Logger({ 
            source: `Agent(${config.name})`,
            level: "info"
        });
    }

    /**
     * Validates agent configuration
     * @throws ValidationError for invalid configurations
     */
    private validateConfig(config: AgentConfig): void {
        if (!config.id || !config.name) {
            throw new ValidationError("Agent requires id and name");
        }
        if (!this.isSupportedType(config.type)) {
            throw new ValidationError(`Unsupported agent type: ${config.type}`);
        }
    }

    /**
     * Initializes agent state
     */
    protected initializeState(): AgentState {
        return {
            status: "idle",
            activeConversations: new Set(),
            registeredFunctions: new Set(),
            messageCount: 0,
            lastActivity: Date.now()
        };
    }

    /**
     * Sends a message to another agent
     * @param message Message to send
     * @param recipient Target agent
     * @returns Promise resolving to the message response
     * @throws DenoAgentsError on sending failure
     */
    public async sendMessage(
        message: Message, 
        recipient: BaseAgent
    ): Promise<Message> {
        try {
            await this.validateMessage(message);
            await this.checkPermissions("send_message");
            
            this.state.messageCount++;
            this.state.lastActivity = Date.now();
            
            this.logger.debug("Sending message", { 
                recipient: recipient.getId(),
                messageId: message.id 
            });
            
            return await recipient.receiveMessage(message, this);
        } catch (error) {
            this.logger.error("Failed to send message", { error });
            throw new DenoAgentsError(
                "Message sending failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Handles incoming messages
     * @param message Received message
     * @param sender Source agent
     * @returns Promise resolving to response message
     */
    public async receiveMessage(
        message: Message,
        sender: BaseAgent
    ): Promise<Message> {
        try {
            await this.validateMessage(message);
            await this.checkPermissions("receive_message");
            
            this.state.messageCount++;
            this.state.lastActivity = Date.now();
            
            return await this.processMessage(message, sender);
        } catch (error) {
            this.logger.error("Message processing failed", { error });
            throw new DenoAgentsError(
                "Message processing failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Processes received messages (to be implemented by subclasses)
     */
    protected abstract processMessage(
        message: Message,
        sender: BaseAgent
    ): Promise<Message>;

    /**
     * Checks if the agent has required permissions
     * @throws SecurityError if permission is denied
     */
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

    /**
     * Validates incoming/outgoing messages
     */
    protected async validateMessage(message: Message): Promise<void> {
        await validateMessage(message);
    }

    // Utility methods
    public getId(): string {
        return this.config.id;
    }

    public getName(): string {
        return this.config.name;
    }

    public getType(): string {
        return this.config.type;
    }

    public getState(): Readonly<AgentState> {
        return { ...this.state };
    }

    private isSupportedType(type: string): boolean {
        return ["base", "conversable", "assistant", "userProxy", "custom"]
            .includes(type);
    }
}
