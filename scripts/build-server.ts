export {};

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

console.info(`Built ${server.outputs.length} server artifact(s).`);
