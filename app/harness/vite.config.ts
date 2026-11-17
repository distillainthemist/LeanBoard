import path from "node:path";
import { defineConfig } from "vite";
// the grid talks to the card-series store; the harness swaps in memory
export default defineConfig({
  resolve: {
    alias: [
      { find: /^(\.\.?\/)+(store\/)?series$/, replacement: path.resolve(__dirname, "seriesStub.ts") },
      // …and the attachments list to its store (2026-11-17)
      { find: /^(\.\.?\/)+store\/attachments$/, replacement: path.resolve(__dirname, "attachmentsStub.ts") },
    ],
  },
});
