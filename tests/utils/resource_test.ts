/**
 * Resource management tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { ResourceManager } from "../../src/utils/resource_manager.ts";
import { MemoryManager } from "../../src/utils/memory_manager.ts";
import { FileManager } from "../../src/utils/file_manager.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Resource Manager", async (t) => {
    const manager = new ResourceManager();

    await t.step("registers resources", async () => {
        await manager.register({
            id: "test-resource",
            type: "memory",
            size: 1024
        });
        const resource = await manager.get("test-resource");
        assertExists(resource);
    });

    await t.step("tracks resource usage", async () => {
        await manager.updateUsage("test-resource", 512);
        const usage = await manager.getUsage("test-resource");
        assertEquals(usage, 512);
    });

    await t.step("enforces resource limits", async () => {
        await assertRejects(
            () => manager.updateUsage("test-resource", 2048),
            ValidationError,
            "Resource limit exceeded"
        );
    });

    await t.step("cleans up resources", async () => {
        await manager.cleanup("test-resource");
        const resource = await manager.get("test-resource");
        assertEquals(resource, undefined);
    });
});

Deno.test("Memory Manager", async (t) => {
    const manager = new MemoryManager({
        maxMemory: 1024 * 1024,
        cleanupThreshold: 0.8
    });

    await t.step("allocates memory", async () => {
        const block = await manager.allocate(1024);
        assertExists(block);
        assertEquals(block.size, 1024);
    });

    await t.step("tracks memory usage", async () => {
        const stats = await manager.getStats();
        assertEquals(stats.used > 0, true);
        assertEquals(stats.free > 0, true);
    });

    await t.step("triggers cleanup", async () => {
        // Fill memory to trigger cleanup
        for (let i = 0; i < 100; i++) {
            await manager.allocate(1024);
        }
        const stats = await manager.getStats();
        assertEquals(stats.used < stats.total, true);
    });

    await t.step("handles out of memory", async () => {
        await assertRejects(
            () => manager.allocate(2 * 1024 * 1024),
            ValidationError,
            "Out of memory"
        );
    });
});

Deno.test("File Manager", async (t) => {
    const manager = new FileManager({
        maxOpenFiles: 10,
        cleanupInterval: 1000
    });

    await t.step("opens files", async () => {
        const file = await manager.open("test.txt", "w");
        assertExists(file);
    });

    await t.step("writes files", async () => {
        await manager.write("test.txt", "test content");
        const content = await manager.read("test.txt");
        assertEquals(content, "test content");
    });

    await t.step("enforces file limits", async () => {
        // Open max files
        for (let i = 0; i < 10; i++) {
            await manager.open(`test${i}.txt`, "w");
        }
        await assertRejects(
            () => manager.open("toomany.txt", "w"),
            ValidationError,
            "Too many open files"
        );
    });

    await t.step("cleans up files", async () => {
        await manager.cleanup();
        const stats = await manager.getStats();
        assertEquals(stats.openFiles, 0);
    });
});

Deno.test("Resource Optimization", async (t) => {
    const resourceManager = new ResourceManager();
    const memoryManager = new MemoryManager({
        maxMemory: 1024 * 1024,
        cleanupThreshold: 0.8
    });
    const fileManager = new FileManager({
        maxOpenFiles: 10,
        cleanupInterval: 1000
    });

    await t.step("coordinates resource usage", async () => {
        // Allocate memory
        const memory = await memoryManager.allocate(1024);
        // Open file
        const file = await fileManager.open("test.txt", "w");
        // Register both resources
        await resourceManager.register({
            id: "memory-block",
            type: "memory",
            size: memory.size,
            resource: memory
        });
        await resourceManager.register({
            id: "file-handle",
            type: "file",
            resource: file
        });

        const resources = await resourceManager.list();
        assertEquals(resources.length, 2);
    });

    await t.step("handles cleanup coordination", async () => {
        await resourceManager.cleanup();
        const memStats = await memoryManager.getStats();
        const fileStats = await fileManager.getStats();
        
        assertEquals(memStats.used, 0);
        assertEquals(fileStats.openFiles, 0);
    });

    await t.step("tracks resource dependencies", async () => {
        const memory = await memoryManager.allocate(1024);
        const file = await fileManager.open("test.txt", "w");
        
        await resourceManager.register({
            id: "parent",
            type: "memory",
            size: memory.size,
            resource: memory
        });
        await resourceManager.register({
            id: "child",
            type: "file",
            resource: file,
            dependencies: ["parent"]
        });

        await resourceManager.cleanup("parent");
        const resources = await resourceManager.list();
        assertEquals(resources.length, 0);
    });
});
