import { Hono } from "hono";
import { initLogger, type DrainFn } from "evlog";
import { evlog } from "evlog/hono";
import {
  getHandbookAgent,
  type HandbookAgent,
} from "../agent/handbook-agent";
import { getEnv, type AppEnv } from "../config/env";
import type { ApiContext } from "./context";
import { errorResponse } from "./errors";
import {
  createApiKeyMiddleware,
  createRateLimitMiddleware,
} from "./middleware/api-key";
import { createHandbookChatHandler } from "./routes/handbook-chat";
import { createHrTopicsRouter } from "./routes/hr-topics";
import type { TopicInstructionStore } from "../handbook/instruction-store";

export function createApiApp(options: {
  env?: AppEnv;
  getAgent?: () => HandbookAgent;
  drain?: DrainFn;
  instructionStore?: TopicInstructionStore;
} = {}) {
  const env = options.env ?? getEnv();
  const getAgent = options.getAgent ?? getHandbookAgent;
  initLogger({
    env: {
      service: "handbook-agent",
      environment: env.nodeEnv,
    },
    pretty: env.nodeEnv === "development",
    silent: env.nodeEnv === "test",
    drain: env.nodeEnv === "test" ? () => {} : undefined,
    redact: true,
  });

  const app = new Hono<ApiContext>();

  app.use("/api/*", evlog({ drain: options.drain }));

  app.use("/api/*", async (context, next) => {
    const requestId = context.req.header("X-Request-Id") ?? crypto.randomUUID();
    context.set("requestId", requestId);
    context.header("X-Request-Id", requestId);
    context.get("log").set({ requestId });
    await next();
  });

  app.use("/api/*", async (context, next) => {
    context.header("X-Content-Type-Options", "nosniff");
    context.header("X-Frame-Options", "DENY");
    context.header("Referrer-Policy", "no-referrer");
    context.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    await next();
  });

  app.get("/api/health", context =>
    context.json({
      status: "ok",
      service: "handbook-agent",
    }),
  );

  app.use(
    "/api/handbook/*",
    createApiKeyMiddleware(env.handbookApiKey),
    createRateLimitMiddleware(env.rateLimitPerMinute),
  );

  app.post(
    "/api/handbook/chat",
    createHandbookChatHandler({ env, getAgent }),
  );

  app.use(
    "/api/hr/*",
    createApiKeyMiddleware(env.hrApiKey, {
      realm: "handbook-hr",
      message: "A valid HR API key is required.",
    }),
    createRateLimitMiddleware(env.rateLimitPerMinute),
  );

  app.route(
    "/api/hr",
    createHrTopicsRouter({ store: options.instructionStore }),
  );

  app.notFound(context =>
    errorResponse(
      context,
      404,
      "not_found",
      "The requested API route does not exist.",
    ),
  );

  app.onError((error, context) => {
    const requestId = context.get("requestId");
    context.get("log").set({
      error: {
        event: "api_error",
        type: error.constructor.name,
      },
    });
    return errorResponse(
      context,
      500,
      "internal_error",
      "The request could not be completed.",
      requestId,
    );
  });

  return app;
}

export type ApiApp = ReturnType<typeof createApiApp>;
