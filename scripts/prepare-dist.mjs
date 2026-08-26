import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/client", { recursive: true });
mkdirSync("dist/server", { recursive: true });
cpSync("out", "dist/client", { recursive: true });
writeFileSync("dist/server/index.js", `export default {
  async fetch(request, env) {
    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("Atmos is temporarily unavailable.", { status: 503 });
  }
};\n`);
