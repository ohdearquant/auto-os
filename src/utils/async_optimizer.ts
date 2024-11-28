/**
 * Async operation optimization
 * @module utils/async_optimizer
 */

import { Logger } from "./logger.ts";
import { QueueItem, BatchProcessor } from "../types/mod.ts";

export class AsyncOptimizer {
    private readonly logger: Logger;
    private readonly queues = new Map<string, Queue>();
    private readonly batches = new Map<string, BatchProcessor>();

    constructor(
        private readonly options = {
            maxQueueSize: 1000,
            batchSize: 10,
            batchTimeout: 100, // ms
            maxConcurrent: 5
        }
    ) {
        this.logger = new Logger({
            source: "AsyncOptimizer",
            level: "info"
        });
    }

    /**
     * Queues async operations for optimized processing
     */
    public async queueOperation<T>(
        operation: () => Promise<T>,
        queueId: string,
        priority = 0
    ): Promise<T> {
        let queue = this.queues.get(queueId);
        if (!queue) {
            queue = new Queue(this.options.maxQueueSize);
            this.queues.set(queueId, queue);
        }

        return await queue.enqueue(
            operation,
            priority
        );
    }

    /**
     * Implements batch processing for multiple operations
     */
    public async processBatch<T, R>(
        items: T[],
        processor: (items: T[]) => Promise<R[]>,
        batchId: string
    ): Promise<R[]> {
        let batch = this.batches.get(batchId);
        if (!batch) {
            batch = new BatchProcessor<T, R>(
                processor,
                this.options.batchSize,
                this.options.batchTimeout
            );
            this.batches.set(batchId, batch);
        }

        return await batch.process(items);
    }

    /**
     * Implements concurrent operation limiting
     */
    public async withConcurrencyLimit<T>(
        operations: Array<() => Promise<T>>,
        maxConcurrent = this.options.maxConcurrent
    ): Promise<T[]> {
        const results: T[] = [];
        const executing = new Set<Promise<void>>();

        for (const operation of operations) {
            if (executing.size >= maxConcurrent) {
                // Wait for one operation to complete
                await Promise.race(executing);
            }

            const exec = async () => {
                try {
                    results.push(await operation());
                } finally {
                    executing.delete(promise);
                }
            };

            const promise = exec();
            executing.add(promise);
        }

        // Wait for remaining operations
        await Promise.all(executing);
        return results;
    }

    /**
     * Gets optimizer metrics
     */
    public getMetrics(): {
        queueSizes: Record<string, number>;
        activeBatches: string[];
        concurrentOperations: number;
    } {
        return {
            queueSizes: Object.fromEntries(
                Array.from(this.queues.entries())
                    .map(([id, queue]) => [id, queue.size()])
            ),
            activeBatches: Array.from(this.batches.keys()),
            concurrentOperations: 0 // TODO: Track this
        };
    }
}

/**
 * Priority queue implementation for async operations
 */
class Queue {
    private items: QueueItem[] = [];
    private processing = false;

    constructor(
        private readonly maxSize: number
    ) {}

    public async enqueue<T>(
        operation: () => Promise<T>,
        priority: number
    ): Promise<T> {
        if (this.items.length >= this.maxSize) {
            throw new Error("Queue full");
        }

        return new Promise((resolve, reject) => {
            this.items.push({
                operation,
                priority,
                resolve,
                reject
            });
            
            this.items.sort((a, b) => b.priority - a.priority);
            
            if (!this.processing) {
                this.process();
            }
        });
    }

    public size(): number {
        return this.items.length;
    }

    private async process(): Promise<void> {
        this.processing = true;
        
        while (this.items.length > 0) {
            const item = this.items.shift()!;
            try {
                const result = await item.operation();
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
        }
        
        this.processing = false;
    }
}

/**
 * Batch processor for efficient operation batching
 */
class BatchProcessor<T, R> {
    private batch: T[] = [];
    private timer: number | undefined;
    private waiting = new Set<{
        item: T;
        resolve: (result: R) => void;
        reject: (error: unknown) => void;
    }>();

    constructor(
        private readonly processor: (items: T[]) => Promise<R[]>,
        private readonly batchSize: number,
        private readonly timeout: number
    ) {}

    public async process(items: T[]): Promise<R[]> {
        const results = await Promise.all(
            items.map(item => this.addToBatch(item))
        );
        return results;
    }

    private async addToBatch(item: T): Promise<R> {
        return new Promise((resolve, reject) => {
            this.waiting.add({ item, resolve, reject });
            this.batch.push(item);

            if (this.batch.length >= this.batchSize) {
                this.processBatch();
            } else if (!this.timer) {
                this.timer = setTimeout(
                    () => this.processBatch(),
                    this.timeout
                );
            }
        });
    }

    private async processBatch(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }

        const currentBatch = [...this.batch];
        this.batch = [];

        const currentWaiting = new Set(this.waiting);
        this.waiting.clear();

        try {
            const results = await this.processor(currentBatch);
            let i = 0;
            for (const { resolve } of currentWaiting) {
                resolve(results[i++]);
            }
        } catch (error) {
            for (const { reject } of currentWaiting) {
                reject(error);
            }
        }
    }
}
