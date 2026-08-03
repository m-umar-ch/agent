import {
  createAgentUIStreamResponse,
  safeValidateUIMessages,
  smoothStream,
} from "ai";
import type { Handler } from "hono";
import { z } from "zod";
import type {
  HandbookAgent,
  HandbookUIMessage,
} from "../../agent/handbook-agent";
import type { AppEnv } from "../../config/env";
import { handbookTools } from "../../handbook/tools";
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

function userOnlyHistory(
  messages: readonly HandbookUIMessage[],
): HandbookUIMessage[] {
  const sanitized: HandbookUIMessage[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      throw new UnsafeMessageHistoryError();
    }
    if (message.role !== "user") {
      continue;
    }
    if (message.parts.some(part => part.type !== "text")) {
      throw new UnsafeMessageHistoryError();
    }

    const parts = message.parts.flatMap(part =>
      part.type === "text" && part.text.trim().length > 0
        ? [{ type: "text" as const, text: part.text }]
        : [],
    );
    if (parts.length === 0) {
      throw new UnsafeMessageHistoryError();
    }

    sanitized.push({
      id: message.id,
      role: "user",
      parts,
    });
  }

  if (sanitized.length === 0) {
    throw new UnsafeMessageHistoryError();
  }
  return sanitized;
}

export function createHandbookChatHandler(options: {
  env: AppEnv;
  getAgent: () => HandbookAgent;
}): Handler {
  return async context => {
    const requestId = crypto.randomUUID();
    const declaredLength = contentLength(context.req.raw);
    if (
      declaredLength !== null &&
      declaredLength > options.env.maxRequestBytes
    ) {
      return errorResponse(
        context,
        413,
        "request_too_large",
        "The chat request is too large.",
        requestId,
      );
    }

    let rawBody: string;
    try {
      rawBody = await readRequestBody(
        context.req.raw,
        options.env.maxRequestBytes,
      );
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return errorResponse(
          context,
          413,
          "request_too_large",
          "The chat request is too large.",
          requestId,
        );
      }
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
      return errorResponse(
        context,
        400,
        "invalid_request",
        "The request must contain a valid messages array.",
        requestId,
      );
    }

    if (request.data.messages.length > options.env.maxChatMessages) {
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
      uiMessages = userOnlyHistory(validated.data);
    } catch {
      return errorResponse(
        context,
        400,
        "unsafe_message_history",
        "Only employee text messages are accepted as conversation history.",
        requestId,
      );
    }

    const startedAt = performance.now();
    const response = await createAgentUIStreamResponse({
      agent: options.getAgent(),
      uiMessages,
      abortSignal: context.req.raw.signal,
      timeout: { totalMs: options.env.agentTimeoutMs },
      sendReasoning: false,
      sendSources: false,
      experimental_transform: smoothStream({ chunking: "word" }),
      headers: {
        "Cache-Control": "no-cache, no-store",
        "X-Accel-Buffering": "no",
        "X-Request-Id": requestId,
      },
      onStepEnd: event => {
        console.info(
          JSON.stringify({
            event: "handbook_agent_step",
            requestId,
            elapsedMs: Math.round(performance.now() - startedAt),
            finishReason: event.finishReason,
            tools: event.toolCalls.map(toolCall => toolCall.toolName),
            inputTokens: event.usage.inputTokens,
            outputTokens: event.usage.outputTokens,
          }),
        );
      },
      onError: error => {
        console.error(
          JSON.stringify({
            event: "handbook_agent_error",
            requestId,
            errorType:
              error instanceof Error ? error.constructor.name : "UnknownError",
          }),
        );
        return "The handbook assistant could not complete this request.";
      },
    });

    return response;
  };
}
