import { Hono } from "hono";
import { z } from "zod";
import {
  HANDBOOK_CATALOG,
  HANDBOOK_TOOL_NAMES,
  isHandbookToolName,
  type HandbookToolName,
} from "../../handbook/catalog";
import {
  getTopicInstructionStore,
  type TopicInstruction,
  type TopicInstructionStore,
} from "../../handbook/instruction-store";
import { loadHandbookDocument } from "../../handbook/loader";
import type { ApiContext } from "../context";
import { errorResponse } from "../errors";

export const MAX_INSTRUCTION_CHARS = 8_000;

const upsertInstructionSchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_INSTRUCTION_CHARS),
  })
  .strict();

function serializeInstruction(instruction: TopicInstruction) {
  return {
    toolName: instruction.toolName,
    content: instruction.content,
    updatedAt: instruction.updatedAt.toISOString(),
  };
}

export function createHrTopicsRouter(
  options: { store?: TopicInstructionStore } = {},
) {
  // Resolved lazily so building the app never opens the database.
  const resolveStore = () => options.store ?? getTopicInstructionStore();
  const router = new Hono<ApiContext>();

  router.get("/topics", async context => {
    const instructions = await resolveStore().list();
    const instructionsByTool = new Map(
      instructions.map(instruction => [instruction.toolName, instruction]),
    );

    const topics = await Promise.all(
      HANDBOOK_TOOL_NAMES.map(async toolName => {
        const document = await loadHandbookDocument(toolName);
        const instruction = instructionsByTool.get(toolName) ?? null;
        return {
          toolName,
          title: document.title,
          summary: document.summary,
          kind: HANDBOOK_CATALOG[toolName].routing.kind,
          instruction:
            instruction === null ? null : serializeInstruction(instruction),
        };
      }),
    );

    context.get("log").set({
      hrTopics: { action: "list", instructionCount: instructions.length },
    });
    return context.json({ topics });
  });

  router.put("/topics/:toolName", async context => {
    const toolName = context.req.param("toolName");
    if (!isHandbookToolName(toolName)) {
      return unknownTopic(context);
    }

    let payload: unknown;
    try {
      payload = await context.req.json();
    } catch {
      return errorResponse(
        context,
        400,
        "invalid_json",
        "The request body must be valid JSON.",
      );
    }

    const parsed = upsertInstructionSchema.safeParse(payload);
    if (!parsed.success) {
      return errorResponse(
        context,
        400,
        "invalid_request",
        `The body must contain a non-empty "content" string of at most ${MAX_INSTRUCTION_CHARS} characters.`,
      );
    }

    const instruction = await resolveStore().upsert(
      toolName,
      parsed.data.content,
    );
    context.get("log").set({
      hrTopics: {
        action: "upsert",
        toolName,
        contentChars: instruction.content.length,
      },
    });
    return context.json({ instruction: serializeInstruction(instruction) });
  });

  router.delete("/topics/:toolName", async context => {
    const toolName = context.req.param("toolName");
    if (!isHandbookToolName(toolName)) {
      return unknownTopic(context);
    }

    const deleted = await resolveStore().delete(toolName);
    context.get("log").set({
      hrTopics: { action: "delete", toolName, deleted },
    });
    return context.json({ toolName, deleted });
  });

  return router;
}

function unknownTopic(context: Parameters<typeof errorResponse>[0]) {
  return errorResponse(
    context,
    404,
    "unknown_topic",
    "The requested handbook topic does not exist.",
  );
}

export type SerializedTopicInstruction = ReturnType<
  typeof serializeInstruction
>;

export type HrTopicSummary = {
  toolName: HandbookToolName;
  title: string;
  summary: string;
  kind: "policy" | "role";
  instruction: SerializedTopicInstruction | null;
};
