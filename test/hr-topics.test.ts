import { describe, expect, test } from "bun:test";
import { createApiApp } from "../src/api/app";
import type { AppEnv } from "../src/config/env";
import { HANDBOOK_TOOL_NAMES } from "../src/handbook/catalog";
import {
  createInMemoryTopicInstructionStore,
} from "../src/handbook/instruction-store";
import { loadHandbookDocument } from "../src/handbook/loader";
import { buildHandbookToolModelPayload } from "../src/handbook/tools";

const API_KEY = "test-handbook-key-1234567890";
const HR_API_KEY = "test-handbook-hr-key-1234567890";

const SAFE_ENV: AppEnv = Object.freeze({
  openaiApiKey: "not-used-in-tests",
  openaiModel: "gpt-test-model",
  handbookApiKey: API_KEY,
  hrApiKey: HR_API_KEY,
  port: 3000,
  maxRequestBytes: 262_144,
  maxChatMessages: 30,
  maxMessageTextChars: 12_000,
  maxChatTextChars: 36_000,
  rateLimitPerMinute: 100,
  agentTimeoutMs: 1_000,
  nodeEnv: "test",
});

function hrHeaders(key = HR_API_KEY): HeadersInit {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function createHrApp() {
  const store = createInMemoryTopicInstructionStore();
  const app = createApiApp({
    env: SAFE_ENV,
    getAgent: () => {
      throw new Error("The agent must not run for HR topic routes.");
    },
    instructionStore: store,
  });
  return { app, store };
}

async function errorCode(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

describe("topic instruction store", () => {
  test("supports the get, list, upsert, and delete round-trip", async () => {
    const store = createInMemoryTopicInstructionStore();

    expect(await store.get("get_eobi_policy")).toBeNull();
    expect(await store.list()).toHaveLength(0);

    const created = await store.upsert(
      "get_eobi_policy",
      "Employees now contribute 2%.",
    );
    expect(created.toolName).toBe("get_eobi_policy");
    expect(created.content).toBe("Employees now contribute 2%.");

    const updated = await store.upsert(
      "get_eobi_policy",
      "Employees now contribute 3%.",
    );
    expect(updated.content).toBe("Employees now contribute 3%.");
    expect(await store.list()).toHaveLength(1);
    expect((await store.get("get_eobi_policy"))?.content).toBe(
      "Employees now contribute 3%.",
    );

    expect(await store.delete("get_eobi_policy")).toBe(true);
    expect(await store.delete("get_eobi_policy")).toBe(false);
    expect(await store.get("get_eobi_policy")).toBeNull();
  });
});

describe("handbook tool model payload", () => {
  test("is unchanged except a null marker when no HR instruction exists", async () => {
    const document = await loadHandbookDocument("get_eobi_policy");
    const payload = buildHandbookToolModelPayload(document, null);

    expect(payload.hrTopicInstructions).toBeNull();
    expect(payload.policy.content).toBe(document.body);
  });

  test("appends the HR instruction with a precedence note after the policy", async () => {
    const document = await loadHandbookDocument("get_eobi_policy");
    const instruction = Object.freeze({
      toolName: "get_eobi_policy" as const,
      content: "The employee share is now 2%. Use this figure.",
      updatedAt: new Date("2026-08-01T10:00:00.000Z"),
    });

    const payload = buildHandbookToolModelPayload(document, instruction);

    expect(payload.policy.content).toBe(document.body);
    expect(payload.hrTopicInstructions).toMatchObject({
      issuedBy: "HR",
      content: "The employee share is now 2%. Use this figure.",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });
    expect(payload.hrTopicInstructions?.precedence).toContain(
      "takes precedence",
    );

    const serialized = JSON.stringify(payload);
    expect(serialized.indexOf("hrTopicInstructions")).toBeGreaterThan(
      serialized.indexOf("policy"),
    );
  });
});

describe("HR topics API", () => {
  test("rejects missing keys and the employee key with the HR realm", async () => {
    const { app } = createHrApp();

    const missingKey = await app.request("/api/hr/topics");
    expect(missingKey.status).toBe(401);
    expect(await errorCode(missingKey)).toBe("unauthorized");
    expect(missingKey.headers.get("www-authenticate")).toBe(
      'Bearer realm="handbook-hr"',
    );

    const employeeKey = await app.request("/api/hr/topics", {
      headers: hrHeaders(API_KEY),
    });
    expect(employeeKey.status).toBe(401);
  });

  test("rejects the HR key on the employee chat route", async () => {
    const { app } = createHrApp();

    const response = await app.request("/api/handbook/chat", {
      method: "POST",
      headers: hrHeaders(HR_API_KEY),
      body: JSON.stringify({ messages: [] }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer realm="handbook"',
    );
  });

  test("lists every catalog topic with titles and no instructions initially", async () => {
    const { app } = createHrApp();

    const response = await app.request("/api/hr/topics", {
      headers: hrHeaders(),
    });
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      topics: {
        toolName: string;
        title: string;
        summary: string;
        kind: string;
        instruction: unknown;
      }[];
    };
    expect(body.topics).toHaveLength(HANDBOOK_TOOL_NAMES.length);
    const toolNames: readonly string[] = HANDBOOK_TOOL_NAMES;
    for (const topic of body.topics) {
      expect(toolNames).toContain(topic.toolName);
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.summary.length).toBeGreaterThan(0);
      expect(["policy", "role"]).toContain(topic.kind);
      expect(topic.instruction).toBeNull();
    }
  });

  test("upserts, lists, and deletes an instruction end to end", async () => {
    const { app, store } = createHrApp();

    const put = await app.request("/api/hr/topics/get_eobi_policy", {
      method: "PUT",
      headers: hrHeaders(),
      body: JSON.stringify({ content: "Employees now contribute 2%." }),
    });
    expect(put.status).toBe(200);
    const saved = (await put.json()) as {
      instruction: { toolName: string; content: string; updatedAt: string };
    };
    expect(saved.instruction.toolName).toBe("get_eobi_policy");
    expect(saved.instruction.content).toBe("Employees now contribute 2%.");
    expect(Date.parse(saved.instruction.updatedAt)).not.toBeNaN();

    expect((await store.get("get_eobi_policy"))?.content).toBe(
      "Employees now contribute 2%.",
    );

    const list = await app.request("/api/hr/topics", {
      headers: hrHeaders(),
    });
    const listed = (await list.json()) as {
      topics: { toolName: string; instruction: { content: string } | null }[];
    };
    const eobi = listed.topics.find(
      topic => topic.toolName === "get_eobi_policy",
    );
    expect(eobi?.instruction?.content).toBe("Employees now contribute 2%.");

    const remove = await app.request("/api/hr/topics/get_eobi_policy", {
      method: "DELETE",
      headers: hrHeaders(),
    });
    expect(remove.status).toBe(200);
    expect(await remove.json()).toEqual({
      toolName: "get_eobi_policy",
      deleted: true,
    });

    const removeAgain = await app.request("/api/hr/topics/get_eobi_policy", {
      method: "DELETE",
      headers: hrHeaders(),
    });
    expect(await removeAgain.json()).toEqual({
      toolName: "get_eobi_policy",
      deleted: false,
    });
    expect(await store.get("get_eobi_policy")).toBeNull();
  });

  test("rejects unknown topics, invalid bodies, and malformed JSON", async () => {
    const { app, store } = createHrApp();

    const unknownTopic = await app.request("/api/hr/topics/get_unknown_topic", {
      method: "PUT",
      headers: hrHeaders(),
      body: JSON.stringify({ content: "irrelevant" }),
    });
    expect(unknownTopic.status).toBe(404);
    expect(await errorCode(unknownTopic)).toBe("unknown_topic");

    const unknownDelete = await app.request(
      "/api/hr/topics/get_unknown_topic",
      { method: "DELETE", headers: hrHeaders() },
    );
    expect(unknownDelete.status).toBe(404);

    for (const body of [
      JSON.stringify({}),
      JSON.stringify({ content: "" }),
      JSON.stringify({ content: "   " }),
      JSON.stringify({ content: "x".repeat(8_001) }),
      JSON.stringify({ content: "valid", extra: true }),
    ]) {
      const response = await app.request("/api/hr/topics/get_eobi_policy", {
        method: "PUT",
        headers: hrHeaders(),
        body,
      });
      expect(response.status).toBe(400);
      expect(await errorCode(response)).toBe("invalid_request");
    }

    const malformed = await app.request("/api/hr/topics/get_eobi_policy", {
      method: "PUT",
      headers: hrHeaders(),
      body: "{",
    });
    expect(malformed.status).toBe(400);
    expect(await errorCode(malformed)).toBe("invalid_json");

    expect(await store.list()).toHaveLength(0);
  });
});
