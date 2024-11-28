/**
 * File manager tests
 * @module tests/utils
 */

import {
    assertEquals
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std/assert/assert_exists.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { FileManager } from "../../src/utils/file_manager.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("File Operations", async (t) => {
    const manager = new FileManager({
        maxOpenFiles: 10,
        cleanupInterval: 1000,
        maxIdleTime: 5000
    });

    await t.step("creates files", async () => {
        const file = await manager.create("test.txt");
        assertExists(file);
        assertEquals(await manager.exists("test.txt"), true);
    });

    await t.step("writes and reads files", async () => {
        const content = "Test content";
        await manager.write("test.txt", content);
        const read = await manager.read("test.txt");
        assertEquals(read, content);
    });

    await t.step("appends to files", async () => {
        const initial = "Initial content\n";
        const append = "Appended content";
        
        await manager.write("append.txt", initial);
        await manager.append("append.txt", append);
        
        const content = await manager.read("append.txt");
        assertEquals(content, initial + append);
    });

    await t.step("deletes files", async () => {
        await manager.create("delete.txt");
        assertEquals(await manager.exists("delete.txt"), true);
        
        await manager.delete("delete.txt");
        assertEquals(await manager.exists("delete.txt"), false);
    });
});

Deno.test("Directory Operations", async (t) => {
    const manager = new FileManager({
        maxOpenFiles: 10,
        cleanupInterval: 1000,
        maxIdleTime: 5000
    });

    await t.step("creates directories", async () => {
        await manager.createDir("test-dir");
        assertEquals(await manager.exists("test-dir"), true);
    });

    await t.step("lists directory contents", async () => {
        await manager.write("test-dir/file1.txt", "content1");
        await manager.write("test-dir/file2.txt", "content2");
        
        const contents = await manager.list("test-dir");
        assertEquals(contents.length, 2);
        assertEquals(contents.includes("file1.txt"), true);
        assertEquals(contents.includes("file2.txt"), true);
    });

    await t.step("removes directories", async () => {
        await manager.createDir("remove-dir");
        await manager.write("remove-dir/file.txt", "content");
        
        await manager.removeDir("remove-dir");
        assertEquals(await manager.exists("remove-dir"), false);
    });

    await t.step("handles nested directories", async () => {
        await manager.createDir("parent/child/grandchild");
        assertEquals(await manager.exists("parent/child/grandchild"), true);
        
        await manager.write("parent/child/grandchild/file.txt", "content");
        assertEquals(
            await manager.exists("parent/child/grandchild/file.txt"),
            true
        );
    });
});

Deno.test("File Limits", async (t) => {
    const manager = new FileManager({
        maxOpenFiles: 2,
        cleanupInterval: 1000,
        maxIdleTime: 5000
    });

    await t.step("enforces open file limits", async () => {
        await manager.open("file1.txt", "w");
        await manager.open("file2.txt", "w");
        
        await assertRejects(
            () => manager.open("file3.txt", "w"),
            ValidationError,
            "Too many open files"
        );
    });

    await t.step("closes idle files", async () => {
        const file = await manager.open("idle.txt", "w");
        await new Promise(r => setTimeout(r, 100));
        
        await manager.cleanup();
        await assertRejects(
            () => file.write(new TextEncoder().encode("test")),
            Error,
            "File already closed"
        );
    });

    await t.step("tracks file usage", async () => {
        const stats = await manager.getStats();
        assertExists(stats.openFiles);
        assertExists(stats.maxOpenFiles);
        assertEquals(stats.openFiles <= stats.maxOpenFiles, true);
    });
});

Deno.test("File Permissions", async (t) => {
    const manager = new FileManager({
        maxOpenFiles: 10,
        cleanupInterval: 1000,
        maxIdleTime: 5000
    });

    await t.step("enforces read permissions", async () => {
        await manager.write("readonly.txt", "content");
        await Deno.chmod("readonly.txt", 0o444);
        
        await assertRejects(
            () => manager.write("readonly.txt", "new content"),
            Error,
            "Permission denied"
        );
    });

    await t.step("enforces write permissions", async () => {
        await manager.write("writeonly.txt", "content");
        await Deno.chmod("writeonly.txt", 0o222);
        
        await assertRejects(
            () => manager.read("writeonly.txt"),
            Error,
            "Permission denied"
        );
    });

    await t.step("handles directory permissions", async () => {
        await manager.createDir("protected-dir");
        await Deno.chmod("protected-dir", 0o444);
        
        await assertRejects(
            () => manager.write("protected-dir/file.txt", "content"),
            Error,
            "Permission denied"
        );
    });
});

Deno.test("File Performance", async (t) => {
    const manager = new FileManager({
        maxOpenFiles: 10,
        cleanupInterval: 1000,
        maxIdleTime: 5000
    });

    await t.step("handles large files", async () => {
        const largeContent = "x".repeat(1024 * 1024); // 1MB
        await manager.write("large.txt", largeContent);
        
        const content = await manager.read("large.txt");
        assertEquals(content.length, largeContent.length);
    });

    await t.step("handles concurrent operations", async () => {
        const operations = Array(10).fill(0).map((_, i) => 
            manager.write(`concurrent${i}.txt`, `content${i}`)
        );
        
        await Promise.all(operations);
        
        const files = await manager.list(".");
        assertEquals(
            files.filter(f => f.startsWith("concurrent")).length,
            10
        );
    });

    await t.step("optimizes repeated access", async () => {
        const file = "cached.txt";
        await manager.write(file, "content");
        
        const start = performance.now();
        await manager.read(file);
        const firstRead = performance.now() - start;
        
        const start2 = performance.now();
        await manager.read(file);
        const secondRead = performance.now() - start2;
        
        assertEquals(secondRead <= firstRead, true);
    });
});
