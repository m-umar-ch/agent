import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique(),
});

/**
 * HR-authored guidance keyed by handbook tool name (see HANDBOOK_TOOL_NAMES).
 * One editable text blob per topic; merged into tool output at chat time.
 */
export const topicInstructionsTable = sqliteTable("topic_instructions", {
  toolName: text("tool_name").primaryKey(),
  content: text().notNull(),
  updatedAtMs: int("updated_at_ms").notNull(),
});
