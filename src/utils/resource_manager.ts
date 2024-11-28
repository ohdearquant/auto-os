/**
 * Resource management and cleanup system
 * @module utils/resource_manager
 */

import { Logger } from "./logger.ts";
import {
    Resource,
    ResourceType,
    CleanupStrategy,
    ResourceManagerOptions,
    ResourceMetrics
} from "../types/resource.ts";

export class ResourceManager {
    private readonly resources = new Map<string, Resource>();
    private readonly cleanupStrategies = new Map<
        ResourceType,
        CleanupStrategy
    >();
    private readonly logger: Logger;
    private isShuttingDown = false;
    private metrics: ResourceMetrics = {
        totalResources: 0,
        byType: {
            connection: 0,
            file: 0,
            memory: 0
        },
        averageIdleTime: 0,
        cleanupAttempts: 0,
        cleanupSuccesses: 0,
        cleanupFailures: 0
    };

    constructor(
        private readonly options: ResourceManagerOptions = {
            cleanupInterval: 60000, // 1 minute
            maxIdleTime: 300000,    // 5 minutes
            gracefulTimeout: 5000,   // 5 seconds
            maxRetries: 3,
            retryDelay: 1000
        }
    ) {
        this.logger = new Logger({
            source: "ResourceManager",
            level: "info"
        });
        this.initializeCleanupStrategies();
        this.startPeriodicCleanup();
        this.registerShutdownHook();
    }

    /**
     * Registers a resource for management
     */
    public async registerResource(
        resource: Resource
    ): Promise<void> {
        try {
            this.validateResource(resource);
            this.resources.set(resource.id, {
                ...resource,
                lastUsed: Date.now()
            });

            this.metrics.totalResources++;
            this.metrics.byType[resource.type]++;

            this.logger.debug("Resource registered", {
                id: resource.id,
                type: resource.type
            });
        } catch (error) {
            this.logger.error("Failed to register resource", {
                error,
                resource
            });
            throw error;
        }
    }

    /**
     * Updates resource usage timestamp
     */
    public async touchResource(id: string): Promise<void> {
        const resource = this.resources.get(id);
        if (resource) {
            resource.lastUsed = Date.now();
        }
    }

    /**
     * Explicitly releases a resource
     */
    public async releaseResource(id: string): Promise<void> {
        const resource = this.resources.get(id);
        if (resource) {
            await this.cleanup(resource);
            this.resources.delete(id);
            this.metrics.totalResources--;
            this.metrics.byType[resource.type]--;

            this.logger.debug("Resource released", {
                id,
                type: resource.type
            });
        }
    }

    /**
     * Gets current resource metrics
     */
    public getMetrics(): ResourceMetrics {
        const now = Date.now();
        const idleTimes = Array.from(this.resources.values())
            .map(r => now - r.lastUsed);
        
        this.metrics.averageIdleTime = idleTimes.length > 0
            ? idleTimes.reduce((a, b) => a + b, 0) / idleTimes.length
            : 0;

        return { ...this.metrics };
    }

    /**
     * Implements graceful shutdown
     */
    public async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        this.logger.info("Initiating graceful shutdown");

        try {
            // Stop accepting new resources
            clearInterval(this.cleanupInterval);

            // Cleanup all resources
            const timeout = setTimeout(
                () => {
                    this.logger.warn(
                        "Graceful shutdown timed out"
                    );
                    Deno.exit(1);
                },
                this.options.gracefulTimeout
            );

            await Promise.all(
                Array.from(this.resources.values())
                    .map(r => this.cleanup(r))
            );

            clearTimeout(timeout);
            this.logger.info("Graceful shutdown completed");
        } catch (error) {
            this.logger.error("Shutdown error", { error });
            Deno.exit(1);
        }
    }

    private cleanupInterval: number;

    private initializeCleanupStrategies(): void {
        // Connection cleanup
        this.cleanupStrategies.set(
            "connection",
            async (resource: Resource) => {
                if (resource.connection) {
                    await resource.connection.close();
                }
            }
        );

        // File handle cleanup
        this.cleanupStrategies.set(
            "file",
            async (resource: Resource) => {
                if (resource.handle) {
                    await resource.handle.close();
                }
            }
        );

        // Memory cleanup
        this.cleanupStrategies.set(
            "memory",
            async (resource: Resource) => {
                if (resource.buffer) {
                    resource.buffer = null;
                }
            }
        );
    }

    private async cleanup(
        resource: Resource,
        retryCount = 0
    ): Promise<void> {
        this.metrics.cleanupAttempts++;

        try {
            const strategy = this.cleanupStrategies.get(
                resource.type
            );
            
            if (strategy) {
                await strategy(resource);
                this.metrics.cleanupSuccesses++;
                
                this.logger.debug("Resource cleaned up", {
                    id: resource.id,
                    type: resource.type
                });
            }
        } catch (error) {
            this.metrics.cleanupFailures++;

            if (retryCount < (this.options.maxRetries ?? 3)) {
                this.logger.warn("Cleanup failed, retrying", {
                    error,
                    resource,
                    attempt: retryCount + 1
                });

                await new Promise(resolve => 
                    setTimeout(resolve, this.options.retryDelay)
                );

                return this.cleanup(
                    resource,
                    retryCount + 1
                );
            }

            this.logger.error("Cleanup failed", {
                error,
                resource
            });
            throw error;
        }
    }

    private startPeriodicCleanup(): void {
        this.cleanupInterval = setInterval(
            async () => {
                await this.performPeriodicCleanup();
            },
            this.options.cleanupInterval
        );
    }

    private async performPeriodicCleanup(): Promise<void> {
        const now = Date.now();
        const idleThreshold = now - this.options.maxIdleTime;

        for (const [id, resource] of this.resources) {
            if (resource.lastUsed < idleThreshold) {
                try {
                    await this.releaseResource(id);
                } catch (error) {
                    this.logger.error(
                        "Failed to cleanup idle resource",
                        { error, resource }
                    );
                }
            }
        }
    }

    private registerShutdownHook(): void {
        addEventListener("unload", () => this.shutdown());
        addEventListener("error", (event) => {
            this.logger.error("Uncaught error", { 
                error: event.error 
            });
            this.shutdown();
        });
    }

    private validateResource(resource: Resource): void {
        if (!resource.id || !resource.type) {
            throw new Error("Invalid resource format");
        }

        if (!this.cleanupStrategies.has(resource.type)) {
            throw new Error(
                `Unsupported resource type: ${resource.type}`
            );
        }
    }
}
