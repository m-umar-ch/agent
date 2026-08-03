import { rename, rm } from "node:fs/promises";
import { resolve } from "node:path";

await rm("dist", { recursive: true, force: true });

const client = await Bun.build({
  entrypoints: ["client/index.html"],
  outdir: "dist/client",
  root: "client",
  target: "browser",
  minify: true,
  splitting: true,
  publicPath: "/",
  naming: {
    entry: "[name]-[hash].[ext]",
    chunk: "[name]-[hash].[ext]",
    asset: "[name]-[hash].[ext]",
  },
});

if (!client.success) {
  for (const log of client.logs) {
    console.error(log);
  }
  throw new Error("Client build failed.");
}

const htmlOutput = client.outputs.find(output => output.path.endsWith(".html"));
if (htmlOutput === undefined) {
  throw new Error("Client build did not emit an HTML entry point.");
}
await rename(htmlOutput.path, resolve("dist/client/index.html"));

const server = await Bun.build({
  entrypoints: ["src/server.ts"],
  outdir: "dist",
  target: "bun",
  minify: true,
  naming: "server.js",
});

if (!server.success) {
  for (const log of server.logs) {
    console.error(log);
  }
  throw new Error("Server build failed.");
}

console.info(
  `Built ${client.outputs.length} client artifact(s) and ${server.outputs.length} server artifact(s).`,
);
