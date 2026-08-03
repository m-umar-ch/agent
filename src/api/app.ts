import { Hono } from "hono";
import {
  getHandbookAgent,
  type HandbookAgent,
} from "../agent/handbook-agent";
import { getEnv, type AppEnv } from "../config/env";
import { errorResponse } from "./errors";
import {
  createApiKeyMiddleware,
  createRateLimitMiddleware,
} from "./middleware/api-key";
import { createHandbookChatHandler } from "./routes/handbook-chat";

export function createApiApp(options: {
  env?: AppEnv;
  getAgent?: () => HandbookAgent;
} = {}) {
  const env = options.env ?? getEnv();
  const getAgent = options.getAgent ?? getHandbookAgent;
  const app = new Hono();

  app.use("/api/*", async (context, next) => {
    context.header("X-Content-Type-Options", "nosniff");
    context.header("X-Frame-Options", "DENY");
    context.header("Referrer-Policy", "no-referrer");
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

  app.notFound(context =>
    errorResponse(
      context,
      404,
      "not_found",
      "The requested API route does not exist.",
    ),
  );

  app.onError((error, context) => {
    const requestId = crypto.randomUUID();
    console.error(
      JSON.stringify({
        event: "api_error",
        requestId,
        errorType: error.constructor.name,
      }),
    );
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
