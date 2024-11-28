/**
 * Base agent tests
 * @module tests/agent/base_test
 */

import { assertEquals } from "https://deno.land/std/assert/assert_equals.ts";
import { assertNotEquals } from "https://deno.land/std/assert/assert_not_equals.ts";
import { assert } from "https://deno.land/std/assert/assert.ts";
import { assertRejects } from "https://deno.land/std/assert/assert_rejects.ts";
import { BaseAgent } from "../../src/agent/base.ts";
import { ValidationError } from "../../src/types/error.ts";
import {
  createMockMessage,
  createMockAgentConfig,
} from "../utils/test_utils.ts";
import type { Message, AgentState } from "../../src/types/mod.ts";

class TestableAgent extends BaseAgent {
  private messageHistory: Message[] = [];

  public async receiveMessage(
    message: Message,
    sender: BaseAgent,
  ): Promise<Message> {
    if (this.state.status === "terminated") {
      throw new Error("Agent is terminated");
    }

    this.state.status = "busy";
    this.state.messageCount++;
    this.state.lastActivity = Date.now();
    this.messageHistory.push(message);

    try {
      let response: Message;
      switch (message.role) {
        case "system":
          response = await this.handleSystemMessage(message);
          break;
        case "user":
          response = await this.handleUserMessage(message);
          break;
        case "function":
          response = await this.handleFunctionMessage(message);
          break;
        case "tool":
          response = await this.handleToolMessage(message);
          break;
        default:
          throw new ValidationError("Invalid message role");
      }

      response.metadata.senderId = this.getId();
      response.metadata.recipientId = sender.getId();
      this.messageHistory.push(response);
      return response;
    } finally {
      this.state.status = "idle";
    }
  }

  protected async handleSystemMessage(message: Message): Promise<Message> {
    return createMockMessage({
      role: "assistant",
      content: "System message handled",
      metadata: {
        senderId: this.config.id,
        recipientId: message.metadata.senderId,
        conversationId: message.metadata.conversationId,
        timestamp: Date.now(),
      },
    });
  }

  protected async handleUserMessage(message: Message): Promise<Message> {
    return createMockMessage({
      role: "assistant",
      content: "User message handled",
      metadata: {
        senderId: this.config.id,
        recipientId: message.metadata.senderId,
        conversationId: message.metadata.conversationId,
        timestamp: Date.now(),
      },
    });
  }

  protected async handleFunctionMessage(message: Message): Promise<Message> {
    return createMockMessage({
      role: "assistant",
      content: "Function message handled",
      metadata: {
        senderId: this.config.id,
        recipientId: message.metadata.senderId,
        conversationId: message.metadata.conversationId,
        timestamp: Date.now(),
      },
    });
  }

  protected async handleToolMessage(message: Message): Promise<Message> {
    return createMockMessage({
      role: "assistant",
      content: "Tool message handled",
      metadata: {
        senderId: this.config.id,
        recipientId: message.metadata.senderId,
        conversationId: message.metadata.conversationId,
        timestamp: Date.now(),
      },
    });
  }

  public getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  public async clearMessageHistory(): Promise<void> {
    this.messageHistory = [];
  }

  public override getState(): AgentState {
    return {
      ...super.getState(),
      activeConversations: new Set(),
      registeredFunctions: new Set(),
    };
  }

  public async reset(): Promise<void> {
    this.state.messageCount = 0;
    this.state.status = "idle";
    this.state.lastActivity = Date.now();
    await this.clearMessageHistory();
  }

  public async terminate(): Promise<void> {
    this.state.status = "terminated";
  }
}

Deno.test("Agent - Configuration", async (t) => {
  await t.step("validates required config fields", async () => {
    await assertRejects(
      () =>
        Promise.resolve(
          new TestableAgent(createMockAgentConfig({ name: "" })),
        ),
      ValidationError,
      "Agent name is required",
    );
  });

  await t.step("generates unique ID if not provided", () => {
    const agent1 = new TestableAgent(createMockAgentConfig());
    const agent2 = new TestableAgent(createMockAgentConfig());
    assertNotEquals(agent1.getId(), agent2.getId());
  });

  await t.step("uses provided ID if available", () => {
    const id = crypto.randomUUID();
    const agent = new TestableAgent(createMockAgentConfig({ id }));
    assertEquals(agent.getId(), id);
  });
});

Deno.test("Agent - Message Handling", async (t) => {
  const agent = new TestableAgent(createMockAgentConfig());
  const sender = new TestableAgent(createMockAgentConfig());

  await t.step("handles system messages", async () => {
    const message = createMockMessage({ role: "system" });
    const response = await agent.receiveMessage(message, sender);
    assertEquals(response.content, "System message handled");
    assertEquals(response.metadata.recipientId, sender.getId());
  });

  await t.step("handles user messages", async () => {
    const message = createMockMessage({ role: "user" });
    const response = await agent.receiveMessage(message, sender);
    assertEquals(response.content, "User message handled");
    assertEquals(response.metadata.recipientId, sender.getId());
  });

  await t.step("handles function messages", async () => {
    const message = createMockMessage({ role: "function" });
    const response = await agent.receiveMessage(message, sender);
    assertEquals(response.content, "Function message handled");
    assertEquals(response.metadata.recipientId, sender.getId());
  });

  await t.step("handles tool messages", async () => {
    const message = createMockMessage({ role: "tool" });
    const response = await agent.receiveMessage(message, sender);
    assertEquals(response.content, "Tool message handled");
    assertEquals(response.metadata.recipientId, sender.getId());
  });

  await t.step("rejects invalid messages", async () => {
    const invalidMessage = createMockMessage({ role: "invalid" as any });
    await assertRejects(
      () => agent.receiveMessage(invalidMessage, sender),
      ValidationError,
      "Invalid message role",
    );
  });
});

Deno.test("Agent - Message History", async (t) => {
  const agent = new TestableAgent(createMockAgentConfig());
  const sender = new TestableAgent(createMockAgentConfig());

  await t.step("maintains message history", async () => {
    const message = createMockMessage();
    await agent.receiveMessage(message, sender);
    const history = agent.getMessageHistory();
    assertEquals(history.length, 2); // Original message + response
    assertEquals(history[0]?.id, message.id);
  });

  await t.step("clears message history", async () => {
    await agent.receiveMessage(createMockMessage(), sender);
    await agent.clearMessageHistory();
    const history = agent.getMessageHistory();
    assertEquals(history.length, 0);
  });
});

Deno.test("Agent - State Management", async (t) => {
  const agent = new TestableAgent(createMockAgentConfig());
  const sender = new TestableAgent(createMockAgentConfig());

  await t.step("tracks message count", async () => {
    const initialCount = agent.getState().messageCount;
    await agent.receiveMessage(createMockMessage(), sender);
    assertEquals(agent.getState().messageCount, initialCount + 1);
  });

  await t.step("updates last activity", async () => {
    const beforeTime = Date.now();
    await agent.receiveMessage(createMockMessage(), sender);
    const state = agent.getState();
    assert(state.lastActivity >= beforeTime);
  });

  await t.step("resets state", async () => {
    await agent.receiveMessage(createMockMessage(), sender);
    await agent.reset();
    const state = agent.getState();
    assertEquals(state.messageCount, 0);
    assertEquals(state.status, "idle");
  });
});

Deno.test("Agent - Lifecycle", async (t) => {
  const agent = new TestableAgent(createMockAgentConfig());
  const sender = new TestableAgent(createMockAgentConfig());

  await t.step("starts in idle state", () => {
    assertEquals(agent.getState().status, "idle");
  });

  await t.step("becomes busy during processing", async () => {
    const messagePromise = agent.receiveMessage(
      createMockMessage(),
      sender,
    );
    assertEquals(agent.getState().status, "busy");
    await messagePromise;
  });

  await t.step("returns to idle after processing", async () => {
    await agent.receiveMessage(createMockMessage(), sender);
    assertEquals(agent.getState().status, "idle");
  });

  await t.step("terminates properly", async () => {
    await agent.terminate();
    assertEquals(agent.getState().status, "terminated");
    await assertRejects(
      () => agent.receiveMessage(createMockMessage(), sender),
      Error,
      "Agent is terminated",
    );
  });
});