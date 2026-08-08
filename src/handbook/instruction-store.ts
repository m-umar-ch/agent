import { eq } from "drizzle-orm";
import { createDbClient, getDb, type DbClient } from "../db/client";
import { topicInstructionsTable } from "../db/schema";
import { isHandbookToolName, type HandbookToolName } from "./catalog";

export interface TopicInstruction {
  readonly toolName: HandbookToolName;
  readonly content: string;
  readonly updatedAt: Date;
}

export interface TopicInstructionStore {
  get(toolName: HandbookToolName): Promise<TopicInstruction | null>;
  list(): Promise<readonly TopicInstruction[]>;
  upsert(
    toolName: HandbookToolName,
    content: string,
  ): Promise<TopicInstruction>;
  delete(toolName: HandbookToolName): Promise<boolean>;
}

function toInstruction(row: {
  toolName: string;
  content: string;
  updatedAtMs: number;
}): TopicInstruction | null {
  if (!isHandbookToolName(row.toolName)) {
    return null;
  }

  return Object.freeze({
    toolName: row.toolName,
    content: row.content,
    updatedAt: new Date(row.updatedAtMs),
  });
}

export function createTopicInstructionStore(
  db: DbClient,
): TopicInstructionStore {
  return {
    async get(toolName) {
      const rows = await db
        .select()
        .from(topicInstructionsTable)
        .where(eq(topicInstructionsTable.toolName, toolName))
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : toInstruction(row);
    },

    async list() {
      const rows = await db.select().from(topicInstructionsTable);
      return Object.freeze(
        rows
          .map(toInstruction)
          .filter(
            (instruction): instruction is TopicInstruction =>
              instruction !== null,
          ),
      );
    },

    async upsert(toolName, content) {
      const updatedAtMs = Date.now();
      await db
        .insert(topicInstructionsTable)
        .values({ toolName, content, updatedAtMs })
        .onConflictDoUpdate({
          target: topicInstructionsTable.toolName,
          set: { content, updatedAtMs },
        });

      return Object.freeze({
        toolName,
        content,
        updatedAt: new Date(updatedAtMs),
      });
    },

    async delete(toolName) {
      const deleted = await db
        .delete(topicInstructionsTable)
        .where(eq(topicInstructionsTable.toolName, toolName))
        .returning({ toolName: topicInstructionsTable.toolName });
      return deleted.length > 0;
    },
  };
}

/** Creates a store backed by an isolated in-memory database (for tests). */
export function createInMemoryTopicInstructionStore(): TopicInstructionStore {
  return createTopicInstructionStore(createDbClient(":memory:"));
}

let defaultStore: TopicInstructionStore | undefined;

export function getTopicInstructionStore(): TopicInstructionStore {
  defaultStore ??= createTopicInstructionStore(getDb());
  return defaultStore;
}
