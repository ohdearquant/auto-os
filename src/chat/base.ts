/**
 * Core chat system implementation
 * @module chat/base
 */

import { 
    Message, 
    AgentState,
    DenoAgentsError,
    SecurityContext,
    ErrorCode 
} from "../types/mod.ts";
import { MessageHandler } from "../agent/message_handler.ts";
import { Logger } from "../utils/logger.ts";
import { EventEmitter } from "../utils/events.ts";

/**
 * Chat configuration interface
 */
export interface ChatConfig {
    id: string;
    name?: string;
    maxParticipants?: number;
    maxHistory?: number;
    metadata?: Record<string, unknown>;
    security: SecurityContext;
}

/**
 * Base chat implementation
 */
export abstract class BaseChat {
    protected readonly participants = new Set<string>();
    protected readonly history: Message[] = [];
    protected readonly events = new EventEmitter();
    protected readonly logger: Logger;
    protected readonly messageHandler: MessageHandler;

    constructor(
        protected readonly config: ChatConfig
    ) {
        this.logger = new Logger({
            source: `Chat(${config.id})`,
            level: "info"
        });
        this.messageHandler = new MessageHandler({
            agentId: config.id,
            security: config.security
        });
    }

    /**
     * Adds a participant to the chat
     * @throws Error if participant limit reached
     */
    public async addParticipant(participantId: string): Promise<void> {
        if (this.hasParticipant(participantId)) {
            throw new DenoAgentsError(
                "Participant already exists",
                ErrorCode.VALIDATION_ERROR
            );
        }

        if (this.isAtCapacity()) {
            throw new DenoAgentsError(
                "Chat at capacity",
                ErrorCode.RESOURCE_EXHAUSTED
            );
        }

        await this.validateParticipant(participantId);
        this.participants.add(participantId);
        this.events.emit("participant_added", participantId);
        
        this.logger.info("Added participant", { participantId });
    }

    /**
     * Removes a participant from the chat
     */
    public async removeParticipant(participantId: string): Promise<void> {
        if (!this.hasParticipant(participantId)) {
            throw new DenoAgentsError(
                "Participant not found",
                ErrorCode.VALIDATION_ERROR
            );
        }

        this.participants.delete(participantId);
        this.events.emit("participant_removed", participantId);
        
        this.logger.info("Removed participant", { participantId });
    }

    /**
     * Sends a message to the chat
     */
    public async sendMessage(message: Message): Promise<void> {
        try {
            await this.validateMessage(message);
            await this.processMessage(message);
            await this.updateHistory(message);
        } catch (error) {
            this.logger.error("Failed to send message", { error });
            throw new DenoAgentsError(
                "Message sending failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        }
    }

    protected abstract processMessage(message: Message): Promise<void>;
    protected abstract validateMessage(message: Message): Promise<void>;
    protected abstract validateParticipant(participantId: string): Promise<void>;

    protected hasParticipant(participantId: string): boolean {
        return this.participants.has(participantId);
    }

    protected isAtCapacity(): boolean {
        return this.config.maxParticipants !== undefined &&
            this.participants.size >= this.config.maxParticipants;
    }

    protected async updateHistory(message: Message): Promise<void> {
        this.history.push(message);
        
        if (this.config.maxHistory && 
            this.history.length > this.config.maxHistory) {
            this.history.shift();
        }

        this.events.emit("history_updated", message);
        this.logger.debug("Updated history", { messageId: message.id });
    }

    public getHistory(): readonly Message[] {
        return [...this.history];
    }

    public getParticipants(): readonly string[] {
        return [...this.participants];
    }
}
