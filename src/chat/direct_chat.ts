/**
 * Direct chat implementation
 * @module chat/direct_chat
 */

import { BaseChat, ChatConfig } from "./base.ts";
import { Message, ValidationError } from "../types/mod.ts";

/**
 * Manages direct chat between two agents
 */
export class DirectChat extends BaseChat {
    constructor(config: ChatConfig) {
        super({
            ...config,
            maxParticipants: 2
        });
    }

    /**
     * Validates direct chat message
     */
    protected async validateMessage(message: Message): Promise<void> {
        if (!message.metadata?.senderId || 
            !message.metadata?.recipientId) {
            throw new ValidationError(
                "Message must have sender and recipient"
            );
        }

        if (!this.hasParticipant(message.metadata.senderId)) {
            throw new ValidationError("Sender not in chat");
        }

        if (!this.hasParticipant(message.metadata.recipientId)) {
            throw new ValidationError("Recipient not in chat");
        }
    }

    /**
     * Processes direct chat message
     */
    protected async processMessage(message: Message): Promise<void> {
        await this.messageHandler.handleIncomingMessage(
            message,
            message.metadata.senderId
        );
        this.events.emit("message_sent", message);
        
        this.logger.debug("Processed direct message", {
            messageId: message.id,
            sender: message.metadata.senderId,
            recipient: message.metadata.recipientId
        });
    }

    /**
     * Validates participant before adding to chat
     */
    protected async validateParticipant(
        participantId: string
    ): Promise<void> {
        await this.config.security.checkPermission(
            "join_chat",
            { participantId }
        );
    }
}
