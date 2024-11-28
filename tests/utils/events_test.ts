/**
 * Event system tests
 * @module tests/utils
 */

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std/testing/asserts.ts";
import { EventEmitter } from "../../src/utils/events.ts";
import { ValidationError } from "../../src/agent/errors.ts";

Deno.test("Event Emitter", async (t) => {
    const emitter = new EventEmitter();

    await t.step("registers event listeners", () => {
        let called = false;
        emitter.on("test", () => {
            called = true;
        });
        emitter.emit("test");
        assertEquals(called, true);
    });

    await t.step("handles multiple listeners", () => {
        let count = 0;
        emitter.on("multi", () => count++);
        emitter.on("multi", () => count++);
        emitter.emit("multi");
        assertEquals(count, 2);
    });

    await t.step("passes event data", () => {
        const data = { value: "test" };
        emitter.on("data", (received) => {
            assertEquals(received, data);
        });
        emitter.emit("data", data);
    });

    await t.step("removes listeners", () => {
        let count = 0;
        const handler = () => count++;
        emitter.on("remove", handler);
        emitter.emit("remove");
        emitter.off("remove", handler);
        emitter.emit("remove");
        assertEquals(count, 1);
    });
});

Deno.test("Event Patterns", async (t) => {
    const emitter = new EventEmitter();

    await t.step("handles wildcard patterns", () => {
        let count = 0;
        emitter.on("test.*", () => count++);
        emitter.emit("test.one");
        emitter.emit("test.two");
        assertEquals(count, 2);
    });

    await t.step("matches exact patterns", () => {
        let count = 0;
        emitter.on("exact.match", () => count++);
        emitter.emit("exact.match");
        emitter.emit("exact.nomatch");
        assertEquals(count, 1);
    });

    await t.step("supports nested patterns", () => {
        let count = 0;
        emitter.on("a.*.c", () => count++);
        emitter.emit("a.b.c");
        emitter.emit("a.x.c");
        emitter.emit("a.b.d");
        assertEquals(count, 2);
    });
});

Deno.test("Event Error Handling", async (t) => {
    const emitter = new EventEmitter();

    await t.step("handles listener errors", () => {
        emitter.on("error", (error) => {
            assertExists(error);
            assertEquals(error instanceof Error, true);
        });

        emitter.on("fail", () => {
            throw new Error("Test error");
        });

        emitter.emit("fail");
    });

    await t.step("validates event names", () => {
        assertRejects(
            () => emitter.on("", () => {}),
            ValidationError,
            "Invalid event name"
        );
    });

    await t.step("validates listeners", () => {
        assertRejects(
            // @ts-expect-error Testing invalid listener
            () => emitter.on("test", "not a function"),
            ValidationError,
            "Invalid listener"
        );
    });
});

Deno.test("Event Lifecycle", async (t) => {
    const emitter = new EventEmitter();

    await t.step("tracks listener count", () => {
        const handler = () => {};
        assertEquals(emitter.listenerCount("test"), 0);
        emitter.on("test", handler);
        assertEquals(emitter.listenerCount("test"), 1);
        emitter.off("test", handler);
        assertEquals(emitter.listenerCount("test"), 0);
    });

    await t.step("cleans up listeners", () => {
        const handler = () => {};
        emitter.on("cleanup", handler);
        emitter.removeAllListeners("cleanup");
        assertEquals(emitter.listenerCount("cleanup"), 0);
    });

    await t.step("handles once listeners", () => {
        let count = 0;
        emitter.once("once", () => count++);
        emitter.emit("once");
        emitter.emit("once");
        assertEquals(count, 1);
    });
});

Deno.test("Event Performance", async (t) => {
    const emitter = new EventEmitter();

    await t.step("handles high event rates", () => {
        let count = 0;
        emitter.on("high-rate", () => count++);
        
        for (let i = 0; i < 1000; i++) {
            emitter.emit("high-rate");
        }
        
        assertEquals(count, 1000);
    });

    await t.step("manages memory usage", () => {
        const handler = () => {};
        for (let i = 0; i < 1000; i++) {
            emitter.on(`temp-${i}`, handler);
        }
        for (let i = 0; i < 1000; i++) {
            emitter.off(`temp-${i}`, handler);
        }
        assertEquals(emitter.listenerCount("temp-0"), 0);
    });

    await t.step("handles concurrent events", async () => {
        let count = 0;
        emitter.on("concurrent", () => count++);
        
        await Promise.all(
            Array(100).fill(0).map(() => 
                Promise.resolve().then(() => 
                    emitter.emit("concurrent")
                )
            )
        );
        
        assertEquals(count, 100);
    });
});
