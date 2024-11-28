/**
 * Event system tests
 * @module tests/utils
 */

import {
    assertEquals
} from "https://deno.land/std/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std/assert/assert_exists.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { EventEmitter } from "../../src/utils/events.ts";
import { ValidationError } from "../../src/types/error.ts";
import type { Message } from "../../src/types/message.ts";
import { createMockMessage } from "./test_utils.ts";

Deno.test("Event Emitter", async (t) => {
    const emitter = new EventEmitter();

    await t.step("registers event listeners", () => {
        let called = false;
        emitter.on("test", () => {
            called = true;
        });
        emitter.emit("test", createMockMessage());
        assertEquals(called, true);
    });

    await t.step("handles multiple listeners", () => {
        let count = 0;
        emitter.on("multi", () => { count++; });
        emitter.on("multi", () => { count++; });
        emitter.emit("multi", createMockMessage());
        assertEquals(count, 2);
    });

    await t.step("passes event data", () => {
        const message = createMockMessage();
        emitter.on<Message>("data", (received) => {
            assertEquals(received, message);
        });
        emitter.emit("data", message);
    });

    await t.step("removes listeners", () => {
        let count = 0;
        const handler = () => { count++; };
        emitter.on("remove", handler);
        emitter.emit("remove", createMockMessage());
        emitter.off("remove", handler);
        emitter.emit("remove", createMockMessage());
        assertEquals(count, 1);
    });
});

Deno.test("Event Patterns", async (t) => {
    const emitter = new EventEmitter();

    await t.step("handles wildcard patterns", () => {
        let count = 0;
        emitter.on("test.*", () => { count++; });
        emitter.emit("test.one", createMockMessage());
        emitter.emit("test.two", createMockMessage());
        assertEquals(count, 2);
    });

    await t.step("matches exact patterns", () => {
        let count = 0;
        emitter.on("exact.match", () => { count++; });
        emitter.emit("exact.match", createMockMessage());
        emitter.emit("exact.nomatch", createMockMessage());
        assertEquals(count, 1);
    });

    await t.step("supports nested patterns", () => {
        let count = 0;
        emitter.on("a.*.c", () => { count++; });
        emitter.emit("a.b.c", createMockMessage());
        emitter.emit("a.x.c", createMockMessage());
        emitter.emit("a.b.d", createMockMessage());
        assertEquals(count, 2);
    });
});

Deno.test("Event Error Handling", async (t) => {
    const emitter = new EventEmitter();

    await t.step("handles listener errors", () => {
        emitter.on("error", (error: Error) => {
            assertExists(error);
            assertEquals(error instanceof Error, true);
        });

        emitter.on("fail", () => {
            throw new Error("Test error");
        });

        emitter.emit("fail", createMockMessage());
    });

    await t.step("validates event names", () => {
        assertRejects(
            async () => {
                emitter.on("", () => {});
            },
            ValidationError,
            "Invalid event name"
        );
    });

    await t.step("validates listeners", () => {
        assertRejects(
            async () => {
                // @ts-expect-error Testing invalid listener
                emitter.on("test", "not a function");
            },
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
        emitter.off("cleanup", handler);
        assertEquals(emitter.listenerCount("cleanup"), 0);
    });

    await t.step("handles single-use listeners", () => {
        let count = 0;
        const handler = () => {
            count++;
            emitter.off("single", handler);
        };
        emitter.on("single", handler);
        emitter.emit("single", createMockMessage());
        emitter.emit("single", createMockMessage());
        assertEquals(count, 1);
    });
});

Deno.test("Event Performance", async (t) => {
    const emitter = new EventEmitter();

    await t.step("handles high event rates", () => {
        let count = 0;
        emitter.on("high-rate", () => { count++; });
        
        for (let i = 0; i < 1000; i++) {
            emitter.emit("high-rate", createMockMessage());
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
        emitter.on("concurrent", () => { count++; });
        
        await Promise.all(
            Array(100).fill(0).map(() => 
                Promise.resolve().then(() => 
                    emitter.emit("concurrent", createMockMessage())
                )
            )
        );
        
        assertEquals(count, 100);
    });
});
