/**
 * Performance optimization utilities
 * @module utils/performance
 */

import { ResourceLimits } from "../types/mod.ts";

/**
 * Resource pool for managing concurrent operations
 */
class ResourcePool {
    private available: number;
    private waitQueue: Array<() => void> = [];

    constructor(size: number) {
        this.available = size;
    }

    async acquire(): Promise<void> {
        if (this.available > 0) {
            this.available--;
            return;
        }

        return new Promise<void>(resolve => {
            this.waitQueue.push(resolve);
        });
    }

    release(): void {
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            next?.();
        } else {
            this.available++;
        }
    }
}

/**
 * Performance monitoring and optimization
 */
export class PerformanceOptimizer {
    private static readonly MEMORY_THRESHOLD = 0.8; // 80%
    private static readonly CPU_THRESHOLD = 0.7; // 70%

    private readonly metrics: {
        memory: number[];
        cpu: number[];
        latency: number[];
    } = {
        memory: [],
        cpu: [],
        latency: []
    };

    constructor(
        private readonly limits: ResourceLimits
    ) {}

    /**
     * Monitors and optimizes resource usage
     */
    public async monitor<T>(
        operation: () => Promise<T>
    ): Promise<T> {
        const startTime = performance.now();
        const startMemory = this.getCurrentMemory();

        try {
            // Check resource availability
            await this.checkResources();

            // Execute operation
            const result = await operation();

            // Record metrics
            this.recordMetrics(
                performance.now() - startTime,
                this.getCurrentMemory() - startMemory
            );

            return result;
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }

    /**
     * Implements resource pooling
     */
    public async withResourcePool<T>(
        operation: () => Promise<T>,
        poolSize: number
    ): Promise<T> {
        const pool = new ResourcePool(poolSize);
        
        try {
            await pool.acquire();
            return await this.monitor(operation);
        } finally {
            pool.release();
        }
    }

    /**
     * Implements batch processing for efficiency
     */
    public async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        batchSize = 10
    ): Promise<R[]> {
        const results: R[] = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => 
                    this.monitor(() => processor(item))
                )
            );
            results.push(...batchResults);

            // Allow event loop to process other tasks
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return results;
    }

    /**
     * Gets current performance metrics
     */
    public getMetrics(): {
        averageLatency: number;
        averageMemory: number;
        peakMemory: number;
    } {
        const avgLatency = this.average(this.metrics.latency);
        const avgMemory = this.average(this.metrics.memory);
        const peakMemory = Math.max(...this.metrics.memory);

        return {
            averageLatency: avgLatency,
            averageMemory: avgMemory,
            peakMemory
        };
    }

    private async checkResources(): Promise<void> {
        const memoryUsage = this.getCurrentMemory();
        const cpuUsage = await this.getCPUUsage();

        if (memoryUsage > this.limits.memory * 
            PerformanceOptimizer.MEMORY_THRESHOLD) {
            await this.handleResourcePressure("memory");
        }

        if (cpuUsage > PerformanceOptimizer.CPU_THRESHOLD) {
            await this.handleResourcePressure("cpu");
        }
    }

    private async handleResourcePressure(
        resource: "memory" | "cpu"
    ): Promise<void> {
        // Implement pressure handling
        switch (resource) {
            case "memory":
                await this.garbageCollect();
                break;
            case "cpu":
                await this.throttle();
                break;
        }
    }

    private async garbageCollect(): Promise<void> {
        // Force garbage collection if available
        if (typeof Deno.core !== "undefined" && 
            // @ts-ignore: Deno internal API
            typeof Deno.core.gc === "function") {
            // @ts-ignore: Deno internal API
            Deno.core.gc();
        }
    }

    private async throttle(): Promise<void> {
        await new Promise(resolve => 
            setTimeout(resolve, 100)
        );
    }

    private getCurrentMemory(): number {
        // Use Deno.memoryUsage() when available
        return process.memoryUsage().heapUsed;
    }

    private async getCPUUsage(): Promise<number> {
        // Implement CPU usage measurement
        return 0; // Placeholder
    }

    private recordMetrics(
        latency: number,
        memory: number
    ): void {
        this.metrics.latency.push(latency);
        this.metrics.memory.push(memory);

        // Keep only recent metrics
        if (this.metrics.latency.length > 100) {
            this.metrics.latency.shift();
            this.metrics.memory.shift();
        }
    }

    private async cleanup(): Promise<void> {
        // Resource cleanup
        await this.garbageCollect();
    }

    private average(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        const sum = numbers.reduce((a, b) => a + b, 0);
        return sum / numbers.length;
    }
}
