import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiContext } from "./context";

export function errorResponse(
  context: Context<ApiContext>,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  requestId = context.get("requestId"),
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
