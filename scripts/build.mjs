import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}

await rm("dist", { recursive: true, force: true });
run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
run("bun", ["scripts/build-server.ts"]);
