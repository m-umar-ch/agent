import { createHash, timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { errorResponse } from "../errors";

function apiKeysMatch(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

function bearerToken(value: string | undefined): string | null {
  if (value === undefined || !value.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice("Bearer ".length);
  return token.length > 0 ? token : null;
}

export function createApiKeyMiddleware(expectedApiKey: string) {
  return createMiddleware(async (context, next) => {
    const candidate = bearerToken(context.req.header("Authorization"));
    if (candidate === null || !apiKeysMatch(candidate, expectedApiKey)) {
      context.header("WWW-Authenticate", 'Bearer realm="handbook"');
      return errorResponse(
        context,
        401,
        "unauthorized",
        "A valid handbook API key is required.",
      );
    }

    await next();
  });
}

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export function createRateLimitMiddleware(
  limit: number,
  windowMs = 60_000,
) {
  let window: RateLimitWindow | undefined;

  return createMiddleware(async (context, next) => {
    const now = Date.now();
    window =
      window === undefined || window.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : window;

    if (window.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((window.resetAt - now) / 1_000),
      );
      context.header("Retry-After", String(retryAfterSeconds));
      return errorResponse(
        context,
        429,
        "rate_limit_exceeded",
        "Too many handbook requests. Please try again shortly.",
      );
    }

    window.count += 1;

    context.header("X-RateLimit-Limit", String(limit));
    context.header("X-RateLimit-Remaining", String(Math.max(0, limit - window.count)));
    context.header("X-RateLimit-Reset", String(Math.ceil(window.resetAt / 1_000)));
    await next();
  });
}
