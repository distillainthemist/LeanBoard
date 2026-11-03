import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
// the same stamp LeanBoard uses (git describe, dirty only for tracked source)
import { buildStamp } from "../app/tools/build-stamp.mjs";

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(buildStamp(fileURLToPath(new URL(".", import.meta.url)))) },
  // relative base is REQUIRED for code apps (the player serves the bundle
  // from a deep path; absolute /assets URLs 404 — LeanBoard Phase 0 spike)
  base: "./",
  server: {
    port: Number(process.env.PORT ?? "") || 5181,
    strictPort: true,
    fs: { allow: [".."] },
  },
});
