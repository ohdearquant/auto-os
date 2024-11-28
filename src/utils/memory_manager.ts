/**
 * Memory management and optimization
 * @module utils/memory_manager
 */

import { Logger } from "./logger.ts";
import { MemoryStats, ResourceLimits } from "../types/mod.ts";

export class MemoryManager {
    private readonly logger: Logger;
    private readonly gcThreshold: number;
    private memoryUsage: MemoryStats = {
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        rss: 0
    };

    constructor(
        private readonly limits: ResourceLimits,
        private readonly options = {
            gcThreshold: 0.8, // 80% of limit
            monitorInterval: 1000 // 1 second
        }
    ) {
        this.logger = new Logger({
            source: "MemoryManager",
            level: "info"
        });
        this.gcThreshold = limits.memory * options.gcThreshold;
        this.startMonitoring();
    }

    /**
     * Memory-optimized operation wrapper
     */
    public async withMemoryOptimization<T>(
        operation: () => Promise<T>,
        context?: string
    ): Promise<T> {
        const startUsage = await this.getCurrentMemoryUsage();
        
        try {
            // Check memory availability
            await this.ensureMemoryAvailable(context);
            
            // Execute operation
            return await operation();
        } finally {
            // Cleanup
            const endUsage = await this.getCurrentMemoryUsage();
            const delta = endUsage.heapUsed - startUsage.heapUsed;
            
            if (delta > 1024 * 1024) { // 1MB
                this.logger.debug("Memory usage delta", {
                    context,
                    delta: `${Math.round(delta / 1024 / 1024)}MB`
                });
            }
            
            await this.cleanup();
        }
    }

    /**
     * Implements object pooling for frequently used objects
     */
    public createObjectPool<T>(
        factory: () => T,
        initialSize = 10
    ): ObjectPool<T> {
        return new ObjectPool<T>(
            factory,
            initialSize,
            this.limits
        );
    }

    /**
     * Implements weak caching for memory-sensitive data
     */
    public createWeakCache<K extends object, V>(): WeakCache<K, V> {
        return new WeakCache<K, V>();
    }

    private async getCurrentMemoryUsage(): Promise<MemoryStats> {
        try {
            // Try to use Deno.memoryUsage() if available
            const usage = await Deno.memoryUsage();
            this.memoryUsage = {
                heapTotal: usage.heapTotal,
                heapUsed: usage.heapUsed,
                external: usage.external,
                rss: usage.rss
            };
        } catch {
            // Fallback to estimation
            this.memoryUsage = {
                heapTotal: 0,
                heapUsed: 0,
                external: 0,
                rss: 0
            };
        }
        return this.memoryUsage;
    }

    private async ensureMemoryAvailable(
        context?: string
    ): Promise<void> {
        const usage = await this.getCurrentMemoryUsage();
        
        if (usage.heapUsed > this.gcThreshold) {
            this.logger.warn("Memory threshold exceeded", {
                context,
                usage: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
                threshold: `${Math.round(this.gcThreshold / 1024 / 1024)}MB`
            });
            await this.forceGC();
        }
    }

    private async forceGC(): Promise<void> {
        if (typeof Deno.core !== "undefined" && 
            // @ts-ignore: Deno internal API
            typeof Deno.core.gc === "function") {
            // @ts-ignore: Deno internal API
            Deno.core.gc();
        }
        
        // Alternative cleanup strategies
        this.cleanup();
    }

    private async cleanup(): Promise<void> {
        // Clear temporary caches
        WeakCache.cleanup();
        
        // Reset object pools
        ObjectPool.resetPools();
    }

    private startMonitoring(): void {
        setInterval(async () => {
            await this.getCurrentMemoryUsage();
            
            if (this.memoryUsage.heapUsed > this.limits.memory) {
                this.logger.error("Memory limit exceeded", {
                    usage: this.memoryUsage
                });
                await this.forceGC();
            }
        }, this.options.monitorInterval);
    }
}

/**
 * Object pool implementation for memory reuse
 */
class ObjectPool<T> {
    private pool: T[] = [];
    private inUse = new Set<T>();

    constructor(
        private readonly factory: () => T,
        initialSize: number,
        private readonly limits: ResourceLimits
    ) {
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }

    public acquire(): T {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.factory();
        }
        this.inUse.add(obj);
        return obj;
    }

    public release(obj: T): void {
        if (this.inUse.has(obj)) {
            this.inUse.delete(obj);
            if (this.pool.length < this.limits.poolSize!) {
                this.pool.push(obj);
            }
        }
    }

    public static resetPools(): void {
        // Reset all object pools
    }
}

/**
 * Weak cache implementation for memory-sensitive caching
 */
class WeakCache<K extends object, V> {
    private cache = new WeakMap<K, V>();

    public set(key: K, value: V): void {
        this.cache.set(key, value);
    }

    public get(key: K): V | undefined {
        return this.cache.get(key);
    }

    public static cleanup(): void {
        // WeakMap automatically handles cleanup
    }
}
