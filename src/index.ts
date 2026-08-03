import homepage from "../client/index.html";
import { createApiApp } from "./api/app";
import { getEnv } from "./config/env";

const env = getEnv();
const api = createApiApp({ env });

const server = Bun.serve({
  port: env.port,
  development: env.nodeEnv !== "production",
  routes: {
    "/": homepage,
  },
  fetch: api.fetch,
});

console.info(`Handbook assistant listening on ${server.url}`);
