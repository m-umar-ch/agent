import { z } from "zod";

const positiveInteger = (defaultValue: number) =>
  z.coerce.number().int().positive().default(defaultValue);

const envSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_MODEL: z.string().trim().min(1).max(200).default("gpt-5-mini"),
  HANDBOOK_API_KEY: z.string().min(24),
  PORT: positiveInteger(3000).pipe(z.number().max(65_535)),
  MAX_REQUEST_BYTES: positiveInteger(262_144),
  MAX_CHAT_MESSAGES: positiveInteger(30),
  MAX_MESSAGE_TEXT_CHARS: positiveInteger(12_000),
  MAX_CHAT_TEXT_CHARS: positiveInteger(36_000),
  RATE_LIMIT_PER_MINUTE: positiveInteger(30),
  AGENT_TIMEOUT_MS: positiveInteger(60_000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = Readonly<{
  openaiApiKey: string;
  openaiModel: string;
  handbookApiKey: string;
  port: number;
  maxRequestBytes: number;
  maxChatMessages: number;
  maxMessageTextChars: number;
  maxChatTextChars: number;
  rateLimitPerMinute: number;
  agentTimeoutMs: number;
  nodeEnv: "development" | "test" | "production";
}>;

let cachedEnv: AppEnv | undefined;

export function parseEnv(
  input: Record<string, string | undefined> = process.env,
): AppEnv {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }

  return Object.freeze({
    openaiApiKey: parsed.data.OPENAI_API_KEY,
    openaiModel: parsed.data.OPENAI_MODEL,
    handbookApiKey: parsed.data.HANDBOOK_API_KEY,
    port: parsed.data.PORT,
    maxRequestBytes: parsed.data.MAX_REQUEST_BYTES,
    maxChatMessages: parsed.data.MAX_CHAT_MESSAGES,
    maxMessageTextChars: parsed.data.MAX_MESSAGE_TEXT_CHARS,
    maxChatTextChars: parsed.data.MAX_CHAT_TEXT_CHARS,
    rateLimitPerMinute: parsed.data.RATE_LIMIT_PER_MINUTE,
    agentTimeoutMs: parsed.data.AGENT_TIMEOUT_MS,
    nodeEnv: parsed.data.NODE_ENV,
  });
}

export function getEnv(): AppEnv {
  cachedEnv ??= parseEnv();
  return cachedEnv;
}
