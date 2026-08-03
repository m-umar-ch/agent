import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function errorResponse(
  context: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  requestId = crypto.randomUUID(),
) {
  context.header("Cache-Control", "no-store");
  context.header("X-Request-Id", requestId);
  return context.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    status,
  );
}
