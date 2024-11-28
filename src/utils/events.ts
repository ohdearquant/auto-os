/**
 * Event emitter implementation
 * @module utils/events
 */

import type { Message } from "../types/mod.ts";

/**
 * Event handler type
 */
export type EventHandler<T = Message> = (data: T) => void | Promise<void>;

/**
 * Simple event emitter implementation
 */
export class EventEmitter {
    private handlers: Map<string, Set<EventHandler>>;

    constructor() {
        this.handlers = new Map();
    }

    /**
     * Subscribe to an event
     * @param event Event name
     * @param handler Event handler function
     */
    public on<T = Message>(
        event: string,
        handler: EventHandler<T>
    ): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler as EventHandler);
    }

    /**
     * Unsubscribe from an event
     * @param event Event name
     * @param handler Event handler function
     */
    public off<T = Message>(
        event: string,
        handler: EventHandler<T>
    ): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.delete(handler as EventHandler);
            if (handlers.size === 0) {
                this.handlers.delete(event);
            }
        }
    }

    /**
     * Emit an event
     * @param event Event name
     * @param data Event data
     */
    public emit<T = Message>(event: string, data: T): void {
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    const result = (handler as EventHandler<T>)(data);
                    if (result instanceof Promise) {
                        result.catch(error => {
                            console.error(
                                `Error in async event handler for ${event}:`,
                                error
                            );
                        });
                    }
                } catch (error) {
                    console.error(
                        `Error in event handler for ${event}:`,
                        error
                    );
                }
            }
        }
    }

    /**
     * Remove all event handlers
     */
    public clear(): void {
        this.handlers.clear();
    }

    /**
     * Get number of handlers for an event
     * @param event Event name
     */
    public listenerCount(event: string): number {
        return this.handlers.get(event)?.size ?? 0;
    }
}
