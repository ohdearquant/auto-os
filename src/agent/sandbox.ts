/**
 * Secure execution sandbox implementation
 * @module agent/sandbox
 */

import {
    SecurityContext,
    ResourceLimits,
    PermissionSet,
    DenoAgentsError,
    ErrorCode
} from "../types/mod.ts";
import { Logger } from "../utils/logger.ts";

/**
 * Provides secure execution environment for functions and tools
 */
export class Sandbox {
    private readonly logger: Logger;
    private memoryUsage = 0;
    private startTime = 0;

    constructor(
        private readonly security: SecurityContext,
        private readonly limits: ResourceLimits
    ) {
        this.logger = new Logger({
            source: "Sandbox",
            level: "info"
        });
    }

    /**
     * Executes code in sandbox environment
     */
    public async execute<P, T>(
        handler: (params: P) => Promise<T> | T,
        params: P,
        permissions?: PermissionSet,
        executionLimits?: ResourceLimits
    ): Promise<T> {
        const limits = executionLimits ?? this.limits;
        this.startTime = performance.now();

        try {
            // Check permissions
            if (permissions) {
                await this.security.checkPermission(
                    "execute_function",
                    { permissions }
                );
            }

            // Set up resource monitoring
            const cleanup = this.setupResourceMonitoring(limits);

            // Execute handler
            const result = await Promise.race([
                Promise.resolve(handler(params)),
                this.createTimeout(limits)
            ]);

            // Clean up monitoring
            cleanup();

            // Validate result
            await this.validateResult(result);

            return result;
        } catch (error) {
            this.logger.error("Sandbox execution failed", { error });
            throw error instanceof DenoAgentsError ? error : new DenoAgentsError(
                "Sandbox execution failed",
                ErrorCode.RUNTIME_ERROR,
                { originalError: error }
            );
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Gets current memory usage
     */
    public getMemoryUsage(): number {
        return this.memoryUsage;
    }

    private setupResourceMonitoring(limits: ResourceLimits): () => void {
        const interval = setInterval(() => {
            this.memoryUsage = this.getCurrentMemoryUsage();
            const executionTime = performance.now() - this.startTime;
            
            if (limits.memory && this.memoryUsage > limits.memory) {
                throw new DenoAgentsError(
                    "Memory limit exceeded",
                    ErrorCode.RESOURCE_EXHAUSTED
                );
            }

            if (limits.cpu && executionTime > limits.cpu) {
                throw new DenoAgentsError(
                    "CPU limit exceeded",
                    ErrorCode.RESOURCE_EXHAUSTED
                );
            }
        }, 10); // Check frequently

        return () => clearInterval(interval);
    }

    private createTimeout(limits: ResourceLimits): Promise<never> {
        return new Promise((_, reject) => {
            if (limits.cpu) {
                setTimeout(() => {
                    reject(new DenoAgentsError(
                        "CPU limit exceeded",
                        ErrorCode.RESOURCE_EXHAUSTED
                    ));
                }, limits.cpu);
            }
        });
    }

    private async validateResult(result: unknown): Promise<void> {
        if (result === undefined) {
            throw new DenoAgentsError(
                "Function returned undefined",
                ErrorCode.VALIDATION_ERROR
            );
        }
    }

    private async cleanup(): Promise<void> {
        this.memoryUsage = 0;
        this.startTime = 0;
    }

    private getCurrentMemoryUsage(): number {
        // Simulate memory usage for testing
        this.memoryUsage += 1024; // Increment by 1KB
        return this.memoryUsage;
    }
}
