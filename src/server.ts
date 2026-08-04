import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createApiApp } from "./api/app";
import { getEnv } from "./config/env";
import { requestIdleTimeoutSeconds } from "./server-timeout";

const env = getEnv();
const api = createApiApp({ env });
const ui = new Hono();

ui.use("*", async (context, next) => {
  context.header("X-Content-Type-Options", "nosniff");
  context.header("X-Frame-Options", "DENY");
  context.header("Referrer-Policy", "no-referrer");
  context.header(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'",
  );
  await next();
});
ui.use("*", serveStatic({ root: "./dist/client" }));
ui.get("/", serveStatic({ root: "./dist/client", path: "index.html" }));

const server = Bun.serve({
  port: env.port,
  development: false,
  fetch(request, bunServer) {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/api/")) {
      bunServer.timeout(request, requestIdleTimeoutSeconds(env.agentTimeoutMs));
      return api.fetch(request);
    }
    return ui.fetch(request);
  },
});

console.info(`Handbook assistant listening on ${server.url}`);
