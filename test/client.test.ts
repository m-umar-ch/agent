import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolActivity } from "../client/components/ActivityTimeline";
import { getChatErrorCopy } from "../client/features/chat/ChatErrorAlert";
import {
  getFriendlyToolName,
  getToolStatus,
  type HandbookToolPart,
} from "../client/components/chat-types";

function toolPart(
  state: string,
  additional: Record<string, unknown> = {},
): HandbookToolPart {
  return {
    type: "tool-get_leave_policy",
    toolCallId: "leave-call",
    state,
    ...additional,
  } as unknown as HandbookToolPart;
}

describe("client handbook activity utilities", () => {
  test("gives employees actionable HTTP error guidance", () => {
    expect(getChatErrorCopy(new Error("HTTP 401 unauthorized"))).toContain(
      "access key was rejected",
    );
    expect(getChatErrorCopy(new Error("HTTP 429 rate_limit_exceeded"))).toContain(
      "Too many requests",
    );
    expect(getChatErrorCopy(new Error("HTTP 413 request_too_large"))).toContain(
      "too long",
    );
    expect(getChatErrorCopy(new Error("request timeout"))).toContain(
      "took too long",
    );
  });

  test("maps AI SDK tool states to stable employee-facing statuses", () => {
    expect(getToolStatus(toolPart("input-streaming"))).toEqual({
      label: "Preparing",
      tone: "working",
    });
    expect(getToolStatus(toolPart("input-available"))).toEqual({
      label: "Checking policy",
      tone: "working",
    });
    expect(getToolStatus(toolPart("approval-requested"))).toEqual({
      label: "Awaiting approval",
      tone: "warning",
    });
    expect(
      getToolStatus(
        toolPart("approval-responded", {
          approval: { id: "approval", approved: false },
        }),
      ),
    ).toEqual({ label: "Not approved", tone: "muted" });
    expect(
      getToolStatus(toolPart("output-available", { preliminary: true })),
    ).toEqual({ label: "Reviewing", tone: "working" });
    expect(
      getToolStatus(toolPart("output-available", { output: {} })),
    ).toEqual({ label: "Reviewed", tone: "complete" });
    expect(getToolStatus(toolPart("output-error"))).toEqual({
      label: "Could not review",
      tone: "warning",
    });
    expect(getToolStatus(toolPart("output-denied"))).toEqual({
      label: "Access declined",
      tone: "muted",
    });
    expect(getFriendlyToolName(toolPart("input-available"))).toBe(
      "Leave policy",
    );
  });

  test("statically renders a compact tool status without tool output details", () => {
    expect(globalThis.document).toBeUndefined();
    const part = toolPart("output-available", {
      output: {
        policy: { title: "Leave Policy" },
        hr: { flags: [{ id: "one" }, { id: "two" }] },
      },
    });

    const html = renderToStaticMarkup(
      createElement(ToolActivity, { part }),
    );

    expect(html).toContain("Leave policy");
    expect(html).toContain("Reviewed");
    expect(html).not.toContain("HR confirmation");
    expect(html).not.toContain("2 items");
  });
});
