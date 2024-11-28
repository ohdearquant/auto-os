/**
 * System benchmark tests
 * @module tests/integration
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { Agent } from "../../src/agent/base.ts";
import { LLMProvider } from "../../src/llm/provider.ts";
import { ChatManager } from "../../src/chat/manager.ts";
import { MemoryManager } from "../../src/utils/memory_manager.ts";
import { SecurityManager } from "../../src/utils/security.ts";
import { AsyncOptimizer } from "../../src/utils/async_optimizer.ts";
import type { Message, SecurityContext } from "../../src/types/mod.ts";

interface BenchmarkResult {
    operation: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    memoryUsage: {
        before: number;
        after: number;
        delta: number;
    };
}

async function runBenchmark(
    name: string,
    iterations: number,
    operation: () => Promise<void>,
    memory: MemoryManager
): Promise<BenchmarkResult> {
    const times: number[] = [];
    const initialMemory = await memory.getStats();

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await operation();
        const end = performance.now();
        times.push(end - start);
    }

    const finalMemory = await memory.getStats();

    return {
        operation: name,
        iterations,
        totalTime: times.reduce((a, b) => a + b, 0),
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        memoryUsage: {
            before: initialMemory.allocated,
            after: finalMemory.allocated,
            delta: finalMemory.allocated - initialMemory.allocated
        }
    };
}

Deno.test("System Benchmarks", async (t) => {
    const security = new SecurityManager();
    const memory = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 200
    });

    const context: SecurityContext = {
        principal: "benchmark",
        scope: "performance",
        permissions: {
            "llm:access": true,
            "memory:allocate": true,
            "chat:create": true
        },
        timestamp: Date.now()
    };

    await security.grantPermissions(context);

    const llm = new LLMProvider({
        provider: "openai",
        model: "gpt-4",
        apiConfig: {
            apiKey: "test-key"
        }
    }, security);

    const chatManager = new ChatManager(security);
    const optimizer = new AsyncOptimizer({
        maxQueueSize: 1000,
        batchSize: 10,
        batchTimeout: 100,
        maxConcurrent: 5
    });

    await t.step("message processing benchmark", async () => {
        const agent = new Agent({
            id: "bench-agent",
            llm,
            security,
            memory
        });

        const chat = await chatManager.createChat("direct", {
            id: "bench-chat",
            security
        });

        await chat.addParticipant("sender");
        await chat.addParticipant("bench-agent");

        const result = await runBenchmark(
            "message_processing",
            100,
            async () => {
                const message: Message = {
                    id: crypto.randomUUID(),
                    role: "user",
                    content: "Test message",
                    metadata: {
                        senderId: "sender",
                        recipientId: "bench-agent",
                        conversationId: "bench-chat",
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                };
                await chat.sendMessage(message);
            },
            memory
        );

        assertEquals(result.iterations, 100);
        assertEquals(result.averageTime < 50, true); // < 50ms per message
        assertEquals(result.memoryUsage.delta >= 0, true);
    });

    await t.step("batch processing benchmark", async () => {
        const result = await runBenchmark(
            "batch_processing",
            10,
            async () => {
                const items = Array(100).fill(0).map((_, i) => ({
                    id: `item-${i}`,
                    value: i
                }));

                const processor = optimizer.createBatchProcessor<typeof items[0], number>(
                    async (batch) => {
                        await new Promise(r => setTimeout(r, 1)); // Minimal delay
                        return batch.map(item => item.value * 2);
                    }
                );

                await Promise.all(
                    items.map(item => processor.process(item))
                );
            },
            memory
        );

        assertEquals(result.iterations, 10);
        assertEquals(result.averageTime < 200, true); // < 200ms per batch
        assertEquals(result.memoryUsage.delta >= 0, true);
    });

    await t.step("memory allocation benchmark", async () => {
        const result = await runBenchmark(
            "memory_allocation",
            1000,
            async () => {
                const block = await memory.allocate(1024);
                await memory.release(block.id);
            },
            memory
        );

        assertEquals(result.iterations, 1000);
        assertEquals(result.averageTime < 1, true); // < 1ms per allocation
        assertEquals(result.memoryUsage.delta, 0); // Should clean up
    });

    await t.step("concurrent operations benchmark", async () => {
        const result = await runBenchmark(
            "concurrent_operations",
            10,
            async () => {
                const operations = [];

                // Mix of different operations
                operations.push(
                    chatManager.createChat("direct", {
                        id: `bench-${crypto.randomUUID()}`,
                        security
                    })
                );

                operations.push(memory.allocate(1024));

                operations.push(
                    optimizer.process(Array(10).fill(0))
                );

                await Promise.all(operations);
            },
            memory
        );

        assertEquals(result.iterations, 10);
        assertEquals(result.averageTime < 100, true); // < 100ms per concurrent set
        assertEquals(result.memoryUsage.delta >= 0, true);
    });

    await t.step("system stability benchmark", async () => {
        const results: BenchmarkResult[] = [];
        const iterations = 5;

        // Run increasingly intensive operations
        for (let i = 0; i < iterations; i++) {
            const scale = i + 1;
            const result = await runBenchmark(
                `stability_test_${scale}x`,
                1,
                async () => {
                    const operations = [];

                    // Scale up the number of operations
                    for (let j = 0; j < scale; j++) {
                        operations.push(
                            chatManager.createChat("direct", {
                                id: `bench-${crypto.randomUUID()}`,
                                security
                            })
                        );

                        operations.push(
                            memory.allocate(1024 * scale)
                        );

                        operations.push(
                            optimizer.process(
                                Array(10 * scale).fill(0)
                            )
                        );
                    }

                    await Promise.all(operations);
                    await memory.runGarbageCollection();
                },
                memory
            );

            results.push(result);
        }

        // Verify system stability
        for (let i = 1; i < results.length; i++) {
            const prevResult = results[i - 1];
            const currResult = results[i];

            // Time should scale sub-linearly
            assertEquals(
                currResult.totalTime < prevResult.totalTime * 2,
                true
            );

            // Memory should be managed effectively
            assertEquals(
                currResult.memoryUsage.after < 
                memory.getStats().limit * 0.9,
                true
            );
        }
    });
});
