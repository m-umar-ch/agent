import { describe, expect, test } from "bun:test";
import type {
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { createHandbookAgent } from "../src/agent/handbook-agent";
import { HANDBOOK_TOOL_NAMES } from "../src/handbook/catalog";

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 5,
    text: 5,
    reasoning: 0,
  },
} satisfies LanguageModelV4GenerateResult["usage"];

function textResult(text: string): LanguageModelV4GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: "stop" },
    usage,
    warnings: [],
  };
}

describe("handbook agent with AI SDK v7 mock models", () => {
  test("requires a handbook tool on the first grounded step", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: textResult("mock completion"),
    });
    const agent = createHandbookAgent(model);

    await agent.generate({ prompt: "How many leave days do employees get?" });

    expect(model.doGenerateCalls).toHaveLength(1);
    const firstCall = model.doGenerateCalls[0]!;
    expect(firstCall.toolChoice).toEqual({ type: "required" });
    expect(firstCall.tools).toHaveLength(15);
    expect(
      firstCall.tools
        ?.filter(tool => tool.type === "function")
        .map(tool => tool.name)
        .sort(),
    ).toEqual([...HANDBOOK_TOOL_NAMES].sort());
    expect(firstCall.prompt[0]).toMatchObject({ role: "system" });
    expect(firstCall.prompt[1]).toMatchObject({ role: "user" });

    const systemInstructions = JSON.stringify(firstCall.prompt[0]);
    expect(systemInstructions).toContain(
      "only help with handbook and role-policy questions",
    );
    expect(systemInstructions).toContain(
      "Never select one conflicting interpretation",
    );
    expect(systemInstructions).toContain(
      "Do not request or repeat unnecessary personal",
    );
    expect(systemInstructions).toContain("salary, health, CNIC, client");
  });

  test("executes a handbook tool and feeds its result into the final answer step", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        {
          content: [
            {
              type: "tool-call",
              toolCallId: "leave-call",
              toolName: "get_leave_policy",
              input: "{}",
            },
          ],
          finishReason: { unified: "tool-calls", raw: "tool_calls" },
          usage,
          warnings: [],
        },
        textResult("Employees receive 28 paid leave days per year."),
      ],
    });
    const agent = createHandbookAgent(model);

    const result = await agent.generate({
      prompt: "How many leave days do employees get?",
    });

    expect(result.text).toBe(
      "Employees receive 28 paid leave days per year.",
    );
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.toolCalls).toHaveLength(1);
    expect(result.steps[0]?.toolResults).toHaveLength(1);
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(model.doGenerateCalls[0]?.toolChoice).toEqual({ type: "required" });
    expect(model.doGenerateCalls[1]?.toolChoice).toEqual({ type: "auto" });

    const secondPrompt = JSON.stringify(model.doGenerateCalls[1]?.prompt);
    expect(secondPrompt).toContain("get_leave_policy");
    expect(secondPrompt).toContain("handbook:get_leave_policy");
    expect(secondPrompt).toContain("Leave Policy");
    expect(secondPrompt).toContain("28 days");
  });

  test("executes two different handbook tools before producing final text", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        {
          content: [
            {
              type: "tool-call",
              toolCallId: "leave-call",
              toolName: "get_leave_policy",
              input: "{}",
            },
          ],
          finishReason: { unified: "tool-calls", raw: "tool_calls" },
          usage,
          warnings: [],
        },
        {
          content: [
            {
              type: "tool-call",
              toolCallId: "benefits-call",
              toolName: "get_employee_benefits",
              input: "{}",
            },
          ],
          finishReason: { unified: "tool-calls", raw: "tool_calls" },
          usage,
          warnings: [],
        },
        textResult("Leave and medical benefits come from separate policies."),
      ],
    });
    const agent = createHandbookAgent(model);

    const result = await agent.generate({
      prompt: "Explain paid leave and medical coverage.",
    });

    expect(result.text).toBe(
      "Leave and medical benefits come from separate policies.",
    );
    expect(result.steps).toHaveLength(3);
    expect(
      result.steps.flatMap(step =>
        step.toolCalls.map(toolCall => toolCall.toolName),
      ),
    ).toEqual(["get_leave_policy", "get_employee_benefits"]);
    expect(result.steps[0]?.toolResults).toHaveLength(1);
    expect(result.steps[1]?.toolResults).toHaveLength(1);
    expect(model.doGenerateCalls).toHaveLength(3);
    expect(model.doGenerateCalls[0]?.toolChoice).toEqual({ type: "required" });
    expect(model.doGenerateCalls[1]?.toolChoice).toEqual({ type: "auto" });
    expect(model.doGenerateCalls[2]?.toolChoice).toEqual({ type: "auto" });

    const finalPrompt = JSON.stringify(model.doGenerateCalls[2]?.prompt);
    expect(finalPrompt).toContain("handbook:get_leave_policy");
    expect(finalPrompt).toContain("handbook:get_employee_benefits");
    expect(finalPrompt).toContain("Leave Policy");
    expect(finalPrompt).toContain("Employee Benefits");
  });

  test("reserves the final bounded step for an employee-facing answer", async () => {
    const toolSteps: LanguageModelV4GenerateResult[] = Array.from(
      { length: 5 },
      (_, index) => ({
        content: [
          {
            type: "tool-call" as const,
            toolCallId: `leave-call-${index}`,
            toolName: "get_leave_policy",
            input: "{}",
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
        usage,
        warnings: [],
      }),
    );
    const model = new MockLanguageModelV4({
      doGenerate: [...toolSteps, textResult("The bounded final answer.")],
    });
    const agent = createHandbookAgent(model);

    const result = await agent.generate({ prompt: "Explain leave." });

    expect(result.text).toBe("The bounded final answer.");
    expect(result.steps).toHaveLength(6);
    expect(model.doGenerateCalls).toHaveLength(6);
    expect(model.doGenerateCalls[0]?.toolChoice).toEqual({ type: "required" });
    expect(model.doGenerateCalls[4]?.toolChoice).toEqual({ type: "auto" });
    expect(model.doGenerateCalls[5]?.toolChoice).toEqual({ type: "none" });
  });

  test("propagates an abort through a deterministic mock stream", async () => {
    let streamStarted!: () => void;
    const started = new Promise<void>(resolve => {
      streamStarted = resolve;
    });
    const model = new MockLanguageModelV4({
      doStream: async options => {
        const stream: LanguageModelV4StreamResult["stream"] =
          new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] });
              streamStarted();
              options.abortSignal?.addEventListener(
                "abort",
                () => controller.error(options.abortSignal?.reason),
                { once: true },
              );
            },
          });
        return { stream };
      },
    });
    const controller = new AbortController();
    const agent = createHandbookAgent(model);
    const result = await agent.stream({
      prompt: "Explain leave policy.",
      abortSignal: controller.signal,
    });
    const parts: Array<{ type: string }> = [];
    let thrown: unknown;
    const consumption = (async () => {
      try {
        for await (const part of result.fullStream) {
          parts.push(part);
        }
      } catch (error) {
        thrown = error;
      }
    })();

    await started;
    controller.abort(new DOMException("Test abort", "AbortError"));
    await consumption;

    expect(model.doStreamCalls).toHaveLength(1);
    expect(controller.signal.aborted).toBe(true);
    expect(
      parts.some(part => part.type === "abort") ||
        (thrown instanceof DOMException && thrown.name === "AbortError"),
    ).toBe(true);
  });
});
