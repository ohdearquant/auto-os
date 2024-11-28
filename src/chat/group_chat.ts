/**
 * Group chat implementation
 * @module chat/group_chat
 */

import { BaseChat, ChatConfig } from "./base.ts";
import { Message, ValidationError, SecurityError } from "../types/mod.ts";

interface GroupChatConfig extends ChatConfig {
    maxParticipants?: number;
    moderators?: string[];
}

/**
 * Manages group chat between multiple agents
 */
export class GroupChat extends BaseChat {
    private readonly moderators = new Set<string>();

    constructor(config: GroupChatConfig) {
        super(config);
        config.moderators?.forEach(id => this.moderators.add(id));
    }

    /**
     * Validates group chat message
     */
    protected async validateMessage(message: Message): Promise<void> {
        if (!message.metadata?.senderId) {
            throw new ValidationError("Message must have sender");
        }

        if (!this.hasParticipant(message.metadata.senderId)) {
            throw new ValidationError("Sender not in chat");
        }

        // Additional group-specific validation
        await this.validateGroupMessage(message);
    }

    /**
     * Processes group chat message
     */
    protected async processMessage(message: Message): Promise<void> {
        // Broadcast message to all participants
        for (const participantId of this.participants) {
            if (participantId !== message.metadata.senderId) {
                const broadcastMessage = await this.prepareGroupMessage(
                    message,
                    participantId
                );
                await this.messageHandler.handleIncomingMessage(
                    broadcastMessage,
                    message.metadata.senderId
                );
            }
        }
        this.events.emit("message_sent", message);
        
        this.logger.debug("Processed group message", {
            messageId: message.id,
            sender: message.metadata.senderId,
            recipients: this.getParticipants().filter(
                id => id !== message.metadata.senderId
            )
        });
    }

    protected async validateParticipant(
        participantId: string
    ): Promise<void> {
        await this.config.security.checkPermission(
            "join_group_chat",
            { participantId }
        );
    }

    /**
     * Adds a moderator to the group
     */
    public async addModerator(
        participantId: string,
        requesterId: string
    ): Promise<void> {
        if (!this.isModerator(requesterId)) {
            throw new SecurityError(
                "Only moderators can add moderators"
            );
        }

        if (!this.hasParticipant(participantId)) {
            throw new ValidationError("Participant not in chat");
        }

        this.moderators.add(participantId);
        this.events.emit("moderator_added", participantId);
        
        this.logger.info("Added moderator", { 
            moderatorId: participantId,
            requesterId 
        });
    }

    /**
     * Removes a moderator from the group
     */
    public async removeModerator(
        participantId: string,
        requesterId: string
    ): Promise<void> {
        if (!this.isModerator(requesterId)) {
            throw new SecurityError(
                "Only moderators can remove moderators"
            );
        }

        if (!this.isModerator(participantId)) {
            throw new ValidationError("Participant is not a moderator");
        }

        // Prevent removing the last moderator
        if (this.moderators.size <= 1) {
            throw new ValidationError(
                "Cannot remove last moderator"
            );
        }

        this.moderators.delete(participantId);
        this.events.emit("moderator_removed", participantId);
        
        this.logger.info("Removed moderator", { 
            moderatorId: participantId,
            requesterId 
        });
    }

    private isModerator(participantId: string): boolean {
        return this.moderators.has(participantId);
    }

    private async validateGroupMessage(
        message: Message
    ): Promise<void> {
        // Implement group-specific message validation
        // e.g., content filtering, rate limiting
        await this.config.security.checkPermission(
            "send_group_message",
            { 
                senderId: message.metadata.senderId,
                content: message.content
            }
        );
    }

    private async prepareGroupMessage(
        message: Message,
        recipientId: string
    ): Promise<Message> {
        return {
            ...message,
            metadata: {
                ...message.metadata,
                recipientId,
                groupId: this.config.id
            }
        };
    }

    public getModerators(): readonly string[] {
        return [...this.moderators];
    }
}
