/**
 * Performance monitoring and optimization tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { PerformanceMonitor } from "../../src/utils/performance.ts";
import { AsyncOptimizer } from "../../src/utils/async_optimizer.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Performance Monitor", async (t) => {
    const monitor = new PerformanceMonitor();

    await t.step("tracks execution time", async () => {
        const result = await monitor.measure(async () => {
            await new Promise(r => setTimeout(r, 100));
            return "result";
        });
        assertEquals(result, "result");
        const stats = monitor.getStats();
        assertEquals(stats.lastExecutionTime >= 100, true);
    });

    await t.step("tracks memory usage", async () => {
        const stats = await monitor.getMemoryStats();
        assertExists(stats.heapUsed);
        assertExists(stats.heapTotal);
        assertEquals(stats.heapUsed <= stats.heapTotal, true);
    });

    await t.step("tracks operation counts", () => {
        monitor.incrementCounter("test_op");
        monitor.incrementCounter("test_op");
        const stats = monitor.getStats();
        assertEquals(stats.operationCounts.test_op, 2);
    });

    await t.step("enforces rate limits", async () => {
        monitor.setRateLimit("test_op", 1, 1000);
        await monitor.checkRateLimit("test_op");
        await assertRejects(
            () => monitor.checkRateLimit("test_op"),
            ValidationError,
            "Rate limit exceeded"
        );
    });
});

Deno.test("Async Optimizer", async (t) => {
    const optimizer = new AsyncOptimizer({
        maxConcurrent: 2,
        queueSize: 10,
        timeout: 1000
    });

    await t.step("processes tasks concurrently", async () => {
        const results = await Promise.all([
            optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 100));
                return 1;
            }),
            optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 100));
                return 2;
            })
        ]);
        assertEquals(results, [1, 2]);
    });

    await t.step("enforces concurrency limits", async () => {
        const startTime = Date.now();
        await Promise.all([
            optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 100));
                return 1;
            }),
            optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 100));
                return 2;
            }),
            optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 100));
                return 3;
            })
        ]);
        const duration = Date.now() - startTime;
        assertEquals(duration >= 200, true);
    });

    await t.step("handles timeouts", async () => {
        await assertRejects(
            () => optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 2000));
                return "timeout";
            }),
            ValidationError,
            "Operation timed out"
        );
    });

    await t.step("batches operations", async () => {
        const batchProcessor = optimizer.createBatchProcessor<number, number>({
            maxBatchSize: 3,
            maxWaitTime: 100,
            process: async (items) => items.map(x => x * 2)
        });

        const results = await Promise.all([
            batchProcessor.add(1),
            batchProcessor.add(2),
            batchProcessor.add(3)
        ]);
        assertEquals(results, [2, 4, 6]);
    });
});

Deno.test("Performance Optimization", async (t) => {
    const monitor = new PerformanceMonitor();
    const optimizer = new AsyncOptimizer({
        maxConcurrent: 2,
        queueSize: 10,
        timeout: 1000
    });

    await t.step("optimizes based on metrics", async () => {
        // Track initial performance
        const initialStats = monitor.getStats();

        // Run optimized operations
        const results = await optimizer.process(async () => {
            await monitor.measure(async () => {
                await new Promise(r => setTimeout(r, 100));
                return "optimized";
            });
        });

        // Check optimization results
        const finalStats = monitor.getStats();
        assertEquals(finalStats.operationCounts.total > initialStats.operationCounts.total, true);
    });

    await t.step("adapts concurrency", async () => {
        const adaptiveOptimizer = new AsyncOptimizer({
            maxConcurrent: "auto",
            queueSize: 10,
            timeout: 1000
        });

        const tasks = Array(5).fill(0).map(() => 
            adaptiveOptimizer.process(async () => {
                await new Promise(r => setTimeout(r, 100));
                return "done";
            })
        );

        const results = await Promise.all(tasks);
        assertEquals(results.every(r => r === "done"), true);
    });

    await t.step("handles backpressure", async () => {
        const stats = monitor.getStats();
        const initialPending = stats.pendingOperations;

        // Add more tasks than queue size
        const tasks = Array(15).fill(0).map(() => 
            optimizer.process(async () => {
                await new Promise(r => setTimeout(r, 50));
                return "queued";
            }).catch(() => "rejected")
        );

        const results = await Promise.all(tasks);
        assertEquals(results.filter(r => r === "rejected").length > 0, true);
    });

    await t.step("optimizes resource usage", async () => {
        const memStats1 = await monitor.getMemoryStats();
        
        // Run memory-intensive operation
        await optimizer.process(async () => {
            const arr = new Array(1000000);
            await new Promise(r => setTimeout(r, 100));
            return arr.length;
        });

        // Check memory was properly released
        const memStats2 = await monitor.getMemoryStats();
        assertEquals(
            Math.abs(memStats2.heapUsed - memStats1.heapUsed) < 1000000,
            true
        );
    });
});
