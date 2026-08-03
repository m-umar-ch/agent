import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createApiApp } from "./api/app";
import { getEnv } from "./config/env";

const env = getEnv();
const api = createApiApp({ env });
const ui = new Hono();

ui.use("*", async (context, next) => {
  context.header("X-Content-Type-Options", "nosniff");
  context.header("X-Frame-Options", "DENY");
  context.header("Referrer-Policy", "no-referrer");
  await next();
});
ui.use("*", serveStatic({ root: "./dist/client" }));
ui.get("/", serveStatic({ root: "./dist/client", path: "index.html" }));

const server = Bun.serve({
  port: env.port,
  development: false,
  fetch(request) {
    const pathname = new URL(request.url).pathname;
    return pathname.startsWith("/api/") ? api.fetch(request) : ui.fetch(request);
  },
});

console.info(`Handbook assistant listening on ${server.url}`);
