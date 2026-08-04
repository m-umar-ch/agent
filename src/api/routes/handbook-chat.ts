import {
  createAgentUIStreamResponse,
  safeValidateUIMessages,
  smoothStream,
} from "ai";
import type { RequestLogger } from "evlog";
import type { Handler } from "hono";
import { z } from "zod";
import type {
  HandbookAgent,
  HandbookUIMessage,
} from "../../agent/handbook-agent";
import type { AppEnv } from "../../config/env";
import { handbookTools } from "../../handbook/tools";
import type { ApiContext } from "../context";
import { errorResponse } from "../errors";

const chatRequestSchema = z
  .object({
    id: z.string().trim().min(1).max(200).optional(),
    messages: z.array(z.unknown()).min(1),
    trigger: z.string().max(100).optional(),
    messageId: z.string().max(200).optional(),
  })
  .strict();

function contentLength(request: Request): number | null {
  const value = request.headers.get("content-length");
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

class RequestBodyTooLargeError extends Error {}

async function readRequestBody(
  request: Request,
  maxBytes: number,
): Promise<string> {
  if (request.body === null) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return text + decoder.decode();
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    text += decoder.decode(value, { stream: true });
  }
}

class UnsafeMessageHistoryError extends Error {}
class MessageTextTooLongError extends Error {}
class ChatTextTooLongError extends Error {}

function logClientError(
  log: RequestLogger,
  code: string,
  status: number,
  metadata: Record<string, number | string | boolean> = {},
) {
  log.set({
    error: {
      category: "client",
      code,
      status,
      ...metadata,
    },
  });
}

function textOnlyHistory(
  messages: readonly HandbookUIMessage[],
  limits: {
    maxMessageTextChars: number;
    maxChatTextChars: number;
  },
): HandbookUIMessage[] {
  const sanitized: HandbookUIMessage[] = [];
  let totalTextChars = 0;
  let hasUserMessage = false;

  const enforceTextLimits = (parts: ReadonlyArray<{ text: string }>) => {
    const messageTextChars = parts.reduce(
      (total, part) => total + part.text.length,
      0,
    );
    if (messageTextChars > limits.maxMessageTextChars) {
      throw new MessageTextTooLongError();
    }
    totalTextChars += messageTextChars;
    if (totalTextChars > limits.maxChatTextChars) {
      throw new ChatTextTooLongError();
    }
  };

  for (const message of messages) {
    if (message.role === "system") {
      throw new UnsafeMessageHistoryError();
    }

    const parts = message.parts.flatMap(part =>
      part.type === "text" && part.text.trim().length > 0
        ? [{ type: "text" as const, text: part.text }]
        : [],
    );

    if (message.role === "user") {
      if (message.parts.some(part => part.type !== "text")) {
        throw new UnsafeMessageHistoryError();
      }
      if (parts.length === 0) {
        throw new UnsafeMessageHistoryError();
      }
      enforceTextLimits(parts);
      hasUserMessage = true;
      sanitized.push({ id: message.id, role: "user", parts });
      continue;
    }

    // Keep the assistant's visible answer so the model remembers what it
    // already told the employee, but drop tool, reasoning, and step parts so
    // clients cannot replay or forge grounding data.
    if (parts.length === 0) {
      continue;
    }
    enforceTextLimits(parts);
    sanitized.push({ id: message.id, role: "assistant", parts });
  }

  if (!hasUserMessage) {
    throw new UnsafeMessageHistoryError();
  }
  // The agent expects the current employee request to be the last message.
  while (sanitized[sanitized.length - 1]?.role === "assistant") {
    sanitized.pop();
  }
  return sanitized;
}

export function createHandbookChatHandler(options: {
  env: AppEnv;
  getAgent: () => HandbookAgent;
}): Handler<ApiContext> {
  return async context => {
    const requestId = context.get("requestId");
    const log = context.get("log");
    const validationStartedAt = performance.now();
    const declaredLength = contentLength(context.req.raw);
    if (
      declaredLength !== null &&
      declaredLength > options.env.maxRequestBytes
    ) {
      logClientError(log, "request_too_large", 413, { declaredLength });
      return errorResponse(
        context,
        413,
        "request_too_large",
        "The chat request is too large.",
        requestId,
      );
    }

    let rawBody: string;
    const bodyReadStartedAt = performance.now();
    try {
      rawBody = await readRequestBody(
        context.req.raw,
        options.env.maxRequestBytes,
      );
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        logClientError(log, "request_too_large", 413);
        return errorResponse(
          context,
          413,
          "request_too_large",
          "The chat request is too large.",
          requestId,
        );
      }
      logClientError(log, "invalid_request", 400);
      return errorResponse(
        context,
        400,
        "invalid_request",
        "The request body could not be read.",
        requestId,
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      logClientError(log, "invalid_json", 400, {
        bodyChars: rawBody.length,
      });
      return errorResponse(
        context,
        400,
        "invalid_json",
        "The request body must be valid JSON.",
        requestId,
      );
    }

    const request = chatRequestSchema.safeParse(json);
    if (!request.success) {
      logClientError(log, "invalid_request", 400, {
        issueCount: request.error.issues.length,
      });
      return errorResponse(
        context,
        400,
        "invalid_request",
        "The request must contain a valid messages array.",
        requestId,
      );
    }

    if (request.data.messages.length > options.env.maxChatMessages) {
      logClientError(log, "too_many_messages", 413, {
        messageCount: request.data.messages.length,
      });
      return errorResponse(
        context,
        413,
        "too_many_messages",
        `A chat may contain at most ${options.env.maxChatMessages} messages.`,
        requestId,
      );
    }

    const validated = await safeValidateUIMessages<HandbookUIMessage>({
      messages: request.data.messages,
      tools: handbookTools,
    });
    if (!validated.success) {
      logClientError(log, "invalid_messages", 400);
      return errorResponse(
        context,
        400,
        "invalid_messages",
        "The messages are not valid AI SDK UI messages.",
        requestId,
      );
    }

    let uiMessages: HandbookUIMessage[];
    try {
      uiMessages = textOnlyHistory(validated.data, options.env);
    } catch (error) {
      const errorCode =
        error instanceof MessageTextTooLongError
          ? "message_text_too_large"
          : error instanceof ChatTextTooLongError
            ? "chat_text_too_large"
            : "unsafe_message_history";
      const message =
        errorCode === "message_text_too_large"
          ? `Each message may contain at most ${options.env.maxMessageTextChars} characters of text.`
          : errorCode === "chat_text_too_large"
            ? `A chat may contain at most ${options.env.maxChatTextChars} characters of message text.`
            : "Only employee and assistant text messages are accepted as conversation history.";
      logClientError(
        log,
        errorCode,
        errorCode === "unsafe_message_history" ? 400 : 413,
      );
      return errorResponse(
        context,
        errorCode === "unsafe_message_history" ? 400 : 413,
        errorCode,
        message,
        requestId,
      );
    }

    log.set({
      handbookChat: {
        id: request.data.id,
        messageCount: uiMessages.length,
        bodyReadMs: Math.round(performance.now() - bodyReadStartedAt),
        validationMs: Math.round(performance.now() - validationStartedAt),
        model: options.env.openaiModel,
      },
    });

    const agentStartedAt = performance.now();
    const steps: Array<{
      elapsedMs: number;
      finishReason: string;
      tools: string[];
      inputTokens: number | undefined;
      outputTokens: number | undefined;
    }> = [];
    const response = await createAgentUIStreamResponse({
      agent: options.getAgent(),
      uiMessages,
      abortSignal: context.req.raw.signal,
      timeout: { totalMs: options.env.agentTimeoutMs },
      sendReasoning: true,
      sendSources: false,
      experimental_transform: smoothStream({ chunking: "word" }),
      headers: {
        "Cache-Control": "no-cache, no-store",
        "X-Accel-Buffering": "no",
        "X-Request-Id": requestId,
      },
      onStepEnd: event => {
        steps.push({
          elapsedMs: Math.round(performance.now() - agentStartedAt),
          finishReason: event.finishReason,
          tools: event.toolCalls.map(toolCall => toolCall.toolName),
          inputTokens: event.usage.inputTokens,
          outputTokens: event.usage.outputTokens,
        });
        log.set({
          handbookAgent: {
            outcome:
              event.finishReason === "stop" ? "completed" : "in_progress",
            stepCount: steps.length,
            steps,
            totalInputTokens: steps.reduce(
              (total, step) => total + (step.inputTokens ?? 0),
              0,
            ),
            totalOutputTokens: steps.reduce(
              (total, step) => total + (step.outputTokens ?? 0),
              0,
            ),
            durationMs: Math.round(performance.now() - agentStartedAt),
          },
        });
      },
      onError: error => {
        const aborted = context.req.raw.signal.aborted;
        log.set({
          handbookAgent: {
            outcome: aborted ? "aborted" : "error",
            stepCount: steps.length,
            errorType:
              error instanceof Error ? error.constructor.name : "UnknownError",
          },
        });
        return "The handbook assistant could not complete this request.";
      },
    });

    return response;
  };
}
