/**
 * Message handling system implementation
 * @module agent/message_handler
 */

import { 
    Message, 
    MessageRole,
    MessageMetadata,
    ValidationError,
    DenoAgentsError,
    SecurityContext,
    SecurityError,
    ErrorCode
} from "../types/mod.ts";
import { Logger } from "../utils/logger.ts";
import { EventEmitter } from "../utils/events.ts";

/**
 * Message handling configuration
 */
interface MessageHandlerConfig {
    agentId: string;
    security: SecurityContext;
    maxQueueSize?: number;
    messageTimeout?: number;
}

/**
 * Handles message processing and routing for agents
 */
export class MessageHandler {
    private messageQueue: Message[] = [];
    private readonly events: EventEmitter;
    private readonly logger: Logger;
    
    constructor(
        private readonly config: MessageHandlerConfig
    ) {
        this.events = new EventEmitter();
        this.logger = new Logger({
            source: `MessageHandler(${config.agentId})`,
            level: "info"
        });
    }

    /**
     * Processes an outgoing message
     * @param message Message to send
     * @param recipientId Target recipient
     * @returns Processed message with metadata
     * @throws ValidationError for invalid messages
     */
    public async prepareOutgoingMessage(
        message: Message,
        recipientId: string
    ): Promise<Message> {
        try {
            await this.validateMessage(message);
            await this.checkPermissions("send_message");

            const enrichedMessage = await this.enrichMessage(
                message,
                recipientId
            );
            
            this.logger.debug("Prepared outgoing message", {
                messageId: enrichedMessage.id,
                recipient: recipientId
            });

            return enrichedMessage;
        } catch (error) {
            this.logger.error("Failed to prepare message", { error });
            throw new DenoAgentsError(
                "Message preparation failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Processes an incoming message
     * @param message Received message
     * @param senderId Source of the message
     * @returns Promise indicating processing success
     * @throws ValidationError for invalid messages
     */
    public async handleIncomingMessage(
        message: Message,
        senderId: string
    ): Promise<void> {
        try {
            await this.validateMessage(message);
            await this.checkPermissions("receive_message");

            if (this.messageQueue.length >= (this.config.maxQueueSize ?? 100)) {
                throw new DenoAgentsError(
                    "Message queue full",
                    ErrorCode.RESOURCE_EXHAUSTED
                );
            }

            const validatedMessage = await this.validateAndEnrichMessage(
                message,
                senderId
            );

            await this.queueMessage(validatedMessage);
            this.events.emit("message_received", validatedMessage);
            
            this.logger.debug("Processed incoming message", {
                messageId: message.id,
                sender: senderId
            });
        } catch (error) {
            this.logger.error("Failed to process incoming message", { error });
            throw new DenoAgentsError(
                "Message processing failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Processes function call messages
     * @param message Function call message
     * @returns Function response message
     */
    public async handleFunctionCallMessage(
        message: Message
    ): Promise<Message> {
        try {
            await this.validateFunctionCallMessage(message);
            await this.checkPermissions("execute_function");

            const response = await this.createFunctionResponseMessage(
                message
            );

            this.logger.debug("Processed function call", {
                messageId: message.id,
                function: message.functionCall?.name
            });

            return response;
        } catch (error) {
            this.logger.error("Function call processing failed", { error });
            throw new DenoAgentsError(
                "Function call failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Subscribes to message events
     * @param handler Event handler function
     */
    public onMessage(
        handler: (message: Message) => void | Promise<void>
    ): void {
        this.events.on("message_received", handler);
    }

    /**
     * Validates message format and content
     * @throws ValidationError for invalid messages
     */
    private async validateMessage(message: Message): Promise<void> {
        if (!message.id || !message.role) {
            throw new ValidationError("Invalid message format");
        }

        if (!this.isValidMessageRole(message.role)) {
            throw new ValidationError(`Invalid message role: ${message.role}`);
        }

        if (message.functionCall) {
            await this.validateFunctionCallMessage(message);
        }
    }

    /**
     * Validates function call message format
     * @throws ValidationError for invalid function calls
     */
    private async validateFunctionCallMessage(
        message: Message
    ): Promise<void> {
        if (!message.functionCall?.name || !message.functionCall?.arguments) {
            throw new ValidationError("Invalid function call format");
        }

        try {
            JSON.parse(message.functionCall.arguments);
        } catch {
            throw new ValidationError("Invalid function arguments format");
        }
    }

    /**
     * Enriches message with metadata
     */
    private async enrichMessage(
        message: Message,
        recipientId: string
    ): Promise<Message> {
        const metadata: MessageMetadata = {
            senderId: this.config.agentId,
            recipientId,
            conversationId: message.metadata?.conversationId ?? 
                          crypto.randomUUID(),
            timestamp: Date.now()
        };

        return {
            ...message,
            id: message.id ?? crypto.randomUUID(),
            metadata,
            timestamp: Date.now()
        };
    }

    /**
     * Validates and enriches incoming message
     */
    private async validateAndEnrichMessage(
        message: Message,
        senderId: string
    ): Promise<Message> {
        // Verify sender matches metadata
        if (message.metadata?.senderId !== senderId) {
            throw new ValidationError("Sender ID mismatch");
        }

        // Verify recipient
        if (message.metadata?.recipientId !== this.config.agentId) {
            throw new ValidationError("Recipient ID mismatch");
        }

        return message;
    }

    /**
     * Queues a message for processing
     */
    private async queueMessage(message: Message): Promise<void> {
        this.messageQueue.push(message);
        
        // Set timeout for message processing
        if (this.config.messageTimeout) {
            setTimeout(() => {
                const index = this.messageQueue.findIndex(
                    m => m.id === message.id
                );
                if (index !== -1) {
                    this.messageQueue.splice(index, 1);
                    this.events.emit("message_timeout", message);
                }
            }, this.config.messageTimeout);
        }
    }

    /**
     * Creates a function response message
     */
    private async createFunctionResponseMessage(
        message: Message
    ): Promise<Message> {
        return {
            id: crypto.randomUUID(),
            role: "function",
            content: null,
            functionCall: message.functionCall,
            metadata: {
                senderId: this.config.agentId,
                recipientId: message.metadata.senderId,
                conversationId: message.metadata.conversationId,
                parentMessageId: message.id,
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    /**
     * Checks if a message role is valid
     */
    private isValidMessageRole(role: string): role is MessageRole {
        return [
            "system",
            "user",
            "assistant",
            "function",
            "tool"
        ].includes(role);
    }

    /**
     * Verifies security permissions
     * @throws SecurityError if permission is denied
     */
    private async checkPermissions(
        action: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        const allowed = await this.config.security.checkPermission(
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
