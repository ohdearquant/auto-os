/**
 * Performance benchmarking
 * @module test/benchmark
 */

import {
    BaseAgent,
    Message,
    MemoryManager,
    AsyncOptimizer
} from "../mod.ts";
import { createTestContext } from "./setup.ts";

class TestAgent extends BaseAgent {
    constructor() {
        super({
            id: "test-agent",
            name: "Test Agent",
            type: "test",
            security: createTestContext()
        });
    }

    public async processMessage(message: Message): Promise<Message> {
        return {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Processed: ${message.content}`,
            metadata: {
                senderId: this.getId(),
                recipientId: message.metadata.senderId,
                conversationId: message.metadata.conversationId,
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    public async receiveMessage(
        message: Message,
        sender: BaseAgent
    ): Promise<Message> {
        return this.processMessage(message);
    }
}

function generateTestMessages(count: number): Message[] {
    return Array.from({ length: count }, (_, i) => ({
        id: crypto.randomUUID(),
        role: "user",
        content: `Test message ${i}`,
        metadata: {
            senderId: "test-user",
            recipientId: "test-agent",
            conversationId: "test-conversation",
            timestamp: Date.now()
        },
        timestamp: Date.now()
    }));
}

export async function runBenchmarks(): Promise<void> {
    console.log("Running performance benchmarks...\n");

    // Message handling benchmark
    await benchmarkMessageHandling();

    // Memory usage benchmark
    await benchmarkMemoryUsage();

    // Async operation benchmark
    await benchmarkAsyncOperations();

    console.log("\nBenchmarks complete.");
}

async function benchmarkMessageHandling(): Promise<void> {
    const agent = new TestAgent();
    const messages = generateTestMessages(1000);

    console.log("Message Handling Benchmark:");
    
    // Single message processing
    const singleStart = performance.now();
    for (const msg of messages) {
        await agent.processMessage(msg);
    }
    const singleTime = performance.now() - singleStart;

    // Batch processing
    const batchStart = performance.now();
    await agent.processBatch(messages);
    const batchTime = performance.now() - batchStart;

    console.log(`Single processing: ${Math.round(singleTime)}ms`);
    console.log(`Batch processing: ${Math.round(batchTime)}ms`);
    console.log(`Improvement: ${Math.round((singleTime - batchTime) / singleTime * 100)}%`);
}

async function benchmarkMemoryUsage(): Promise<void> {
    const memoryManager = new MemoryManager({
        memory: 256 * 1024 * 1024, // 256MB
        poolSize: 1000
    });

    console.log("\nMemory Usage Benchmark:");

    // Without optimization
    const unoptimizedStart = await getCurrentMemory();
    const largeData = new Array(1000000).fill("test");
    const unoptimizedEnd = await getCurrentMemory();

    // With optimization
    const optimizedStart = await getCurrentMemory();
    await memoryManager.withMemoryOptimization(async () => {
        const data = new Array(1000000).fill("test");
        return data.length;
    });
    const optimizedEnd = await getCurrentMemory();

    console.log(`Without optimization: ${formatBytes(unoptimizedEnd - unoptimizedStart)}`);
    console.log(`With optimization: ${formatBytes(optimizedEnd - optimizedStart)}`);
    console.log(`Improvement: ${Math.round((unoptimizedEnd - unoptimizedStart - (optimizedEnd - optimizedStart)) / (unoptimizedEnd - unoptimizedStart) * 100)}%`);
}

async function benchmarkAsyncOperations(): Promise<void> {
    const optimizer = new AsyncOptimizer();
    const operations = Array.from(
        { length: 100 },
        (_, i) => async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return i;
        }
    );

    console.log("\nAsync Operation Benchmark:");

    // Sequential execution
    const seqStart = performance.now();
    for (const op of operations) {
        await op();
    }
    const seqTime = performance.now() - seqStart;

    // Optimized execution
    const optStart = performance.now();
    await optimizer.withConcurrencyLimit(operations, 10);
    const optTime = performance.now() - optStart;

    console.log(`Sequential execution: ${Math.round(seqTime)}ms`);
    console.log(`Optimized execution: ${Math.round(optTime)}ms`);
    console.log(`Improvement: ${Math.round((seqTime - optTime) / seqTime * 100)}%`);
}

async function getCurrentMemory(): Promise<number> {
    try {
        const usage = await Deno.memoryUsage();
        return usage.heapUsed;
    } catch {
        return 0;
    }
}

function formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }
    return `${Math.round(size * 100) / 100}${units[unit]}`;
}

if (import.meta.main) {
    await runBenchmarks();
}
