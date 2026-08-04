import { log } from "evlog";
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

log.info("server", `Server running in "${env.nodeEnv}" mode on port ${env.port}`);