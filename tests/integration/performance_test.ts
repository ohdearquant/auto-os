/**
 * Performance integration tests
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

Deno.test("System Performance", async (t) => {
    const security = new SecurityManager();
    const memory = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 100
    });

    const context: SecurityContext = {
        principal: "test-system",
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

    await t.step("handles high message throughput", async () => {
        const agent = new Agent({
            id: "perf-agent",
            llm,
            security,
            memory
        });

        const chat = await chatManager.createChat("direct", {
            id: "perf-chat",
            security
        });

        await chat.addParticipant("sender");
        await chat.addParticipant("perf-agent");

        const messages: Message[] = Array(100).fill(0).map((_, i) => ({
            id: `msg-${i}`,
            role: "user",
            content: `Test message ${i}`,
            metadata: {
                senderId: "sender",
                recipientId: "perf-agent",
                conversationId: "perf-chat",
                timestamp: Date.now()
            },
            timestamp: Date.now()
        }));

        const startTime = performance.now();
        await Promise.all(messages.map(msg => chat.sendMessage(msg)));
        const duration = performance.now() - startTime;

        assertEquals(duration < 5000, true); // Should process 100 messages in < 5s
        assertEquals(chat.getHistory().length, messages.length);
    });

    await t.step("optimizes batch processing", async () => {
        const items = Array(1000).fill(0).map((_, i) => ({
            id: `item-${i}`,
            value: i
        }));

        const processor = optimizer.createBatchProcessor<typeof items[0], number>(
            async (batch) => {
                await new Promise(r => setTimeout(r, 10)); // Simulate processing
                return batch.map(item => item.value * 2);
            }
        );

        const startTime = performance.now();
        const results = await Promise.all(
            items.map(item => processor.process(item))
        );
        const duration = performance.now() - startTime;

        assertEquals(duration < 2000, true); // Should process 1000 items in < 2s
        assertEquals(results.length, items.length);
        assertEquals(
            results.every((r, i) => r === items[i].value * 2),
            true
        );
    });

    await t.step("manages memory efficiently", async () => {
        const initialStats = await memory.getStats();
        const largeData = new Array(1000).fill("x".repeat(1000));

        // Allocate memory in chunks
        const allocations = await Promise.all(
            largeData.map(() => memory.allocate(1024))
        );

        const midStats = await memory.getStats();
        assertEquals(
            midStats.allocated > initialStats.allocated,
            true
        );

        // Release memory
        await Promise.all(
            allocations.map(block => memory.release(block.id))
        );

        const finalStats = await memory.getStats();
        assertEquals(
            finalStats.allocated <= initialStats.allocated,
            true
        );
    });

    await t.step("handles concurrent operations", async () => {
        const operations = [];

        // Create multiple chats
        for (let i = 0; i < 10; i++) {
            operations.push(
                chatManager.createChat("direct", {
                    id: `concurrent-${i}`,
                    security
                })
            );
        }

        // Allocate memory
        for (let i = 0; i < 10; i++) {
            operations.push(memory.allocate(1024 * 1024));
        }

        const startTime = performance.now();
        const results = await Promise.all(operations);
        const duration = performance.now() - startTime;

        assertEquals(duration < 1000, true); // Should complete in < 1s
        assertEquals(results.length, 20);
        assertEquals(
            results.every(r => r !== null),
            true
        );
    });

    await t.step("maintains system stability", async () => {
        const iterations = 5;
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const startStats = await memory.getStats();

            // Perform intensive operations
            await Promise.all([
                chatManager.createChat("direct", {
                    id: `stability-${i}`,
                    security
                }),
                memory.allocate(1024 * 1024),
                optimizer.process(Array(100).fill(0))
            ]);

            const endStats = await memory.getStats();
            results.push({
                iteration: i,
                memoryDelta: endStats.allocated - startStats.allocated,
                pressure: endStats.pressure
            });

            // Cleanup
            await memory.runGarbageCollection();
        }

        // Verify system stability
        assertEquals(
            results.every(r => r.pressure < 0.9),
            true
        );
        assertEquals(
            results[iterations - 1].memoryDelta < 
            results[0].memoryDelta,
            true
        );
    });
});
