/**
 * Memory management tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { MemoryManager } from "../../src/utils/memory_manager.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Memory Allocation", async (t) => {
    const manager = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 100, // 100MB
        cleanupThreshold: 0.8,
        gcInterval: 1000
    });

    await t.step("allocates memory", async () => {
        const block = await manager.allocate(1024);
        assertExists(block);
        assertEquals(block.size, 1024);
    });

    await t.step("tracks allocations", async () => {
        const initialStats = await manager.getStats();
        await manager.allocate(2048);
        const finalStats = await manager.getStats();
        assertEquals(
            finalStats.allocated - initialStats.allocated,
            2048
        );
    });

    await t.step("enforces memory limits", async () => {
        const largeSize = 1024 * 1024 * 200; // 200MB
        await assertRejects(
            () => manager.allocate(largeSize),
            ValidationError,
            "Memory limit exceeded"
        );
    });
});

Deno.test("Memory Cleanup", async (t) => {
    const manager = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 10, // 10MB
        cleanupThreshold: 0.5,
        gcInterval: 100
    });

    await t.step("releases memory", async () => {
        const block = await manager.allocate(1024);
        const initialStats = await manager.getStats();
        await manager.release(block.id);
        const finalStats = await manager.getStats();
        assertEquals(
            finalStats.allocated < initialStats.allocated,
            true
        );
    });

    await t.step("handles invalid releases", async () => {
        await assertRejects(
            () => manager.release("invalid-id"),
            ValidationError,
            "Invalid block ID"
        );
    });

    await t.step("performs garbage collection", async () => {
        // Allocate multiple blocks
        const blocks = await Promise.all([
            manager.allocate(1024),
            manager.allocate(2048),
            manager.allocate(4096)
        ]);

        // Mark some as unused
        blocks[0].lastAccess = Date.now() - 60000; // 1 minute ago
        blocks[1].lastAccess = Date.now() - 120000; // 2 minutes ago

        const initialStats = await manager.getStats();
        await manager.runGarbageCollection();
        const finalStats = await manager.getStats();

        assertEquals(
            finalStats.allocated < initialStats.allocated,
            true
        );
    });
});

Deno.test("Memory Tracking", async (t) => {
    const manager = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 50, // 50MB
        cleanupThreshold: 0.7,
        gcInterval: 500
    });

    await t.step("tracks memory usage", async () => {
        const stats = await manager.getStats();
        assertExists(stats.allocated);
        assertExists(stats.available);
        assertExists(stats.limit);
        assertEquals(
            stats.allocated + stats.available <= stats.limit,
            true
        );
    });

    await t.step("tracks block metadata", async () => {
        const block = await manager.allocate(1024);
        const metadata = await manager.getBlockMetadata(block.id);
        assertEquals(metadata.size, 1024);
        assertExists(metadata.lastAccess);
        assertExists(metadata.allocatedAt);
    });

    await t.step("updates access times", async () => {
        const block = await manager.allocate(1024);
        const initialMetadata = await manager.getBlockMetadata(block.id);
        await new Promise(r => setTimeout(r, 10));
        await manager.access(block.id);
        const finalMetadata = await manager.getBlockMetadata(block.id);
        assertEquals(
            finalMetadata.lastAccess > initialMetadata.lastAccess,
            true
        );
    });
});

Deno.test("Memory Optimization", async (t) => {
    const manager = new MemoryManager({
        maxHeapSize: 1024 * 1024 * 20, // 20MB
        cleanupThreshold: 0.6,
        gcInterval: 200
    });

    await t.step("defragments memory", async () => {
        // Create fragmented memory state
        const blocks = await Promise.all([
            manager.allocate(1024),
            manager.allocate(2048),
            manager.allocate(1024)
        ]);

        await manager.release(blocks[1].id); // Release middle block

        const initialStats = await manager.getStats();
        await manager.defragment();
        const finalStats = await manager.getStats();

        assertEquals(
            finalStats.fragmentation < initialStats.fragmentation,
            true
        );
    });

    await t.step("handles concurrent operations", async () => {
        const operations = Array(10).fill(0).map(() => 
            Promise.all([
                manager.allocate(1024),
                manager.allocate(2048)
            ])
        );

        const blocks = await Promise.all(operations);
        assertEquals(blocks.length, 10);
        assertEquals(
            blocks.every(pair => 
                pair[0].size === 1024 && pair[1].size === 2048
            ),
            true
        );
    });

    await t.step("adapts to memory pressure", async () => {
        // Fill memory to trigger cleanup
        const initialStats = await manager.getStats();
        const blockSize = Math.floor(initialStats.available * 0.4);
        
        await Promise.all([
            manager.allocate(blockSize),
            manager.allocate(blockSize)
        ]);

        const finalStats = await manager.getStats();
        assertEquals(finalStats.pressure > initialStats.pressure, true);
        assertEquals(finalStats.cleanups > initialStats.cleanups, true);
    });
});
