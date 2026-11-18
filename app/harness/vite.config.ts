import path from "node:path";
import { defineConfig } from "vite";
// the grid talks to the card-series store; the harness swaps in memory
export default defineConfig({
  resolve: {
    alias: [
      { find: /^(\.\.?\/)+(store\/)?series$/, replacement: path.resolve(__dirname, "seriesStub.ts") },
      // the Power Apps SDK itself (2026-11-18): an in-memory Dataverse and
      // a signed-in person, so a page can run the real stores and screens
      { find: /^@microsoft\/power-apps\/data$/, replacement: path.resolve(__dirname, "dataverseStub.ts") },
      { find: /^@microsoft\/power-apps\/app$/, replacement: path.resolve(__dirname, "appStub.ts") },
      // …and the attachments list to its store (2026-11-17)
      { find: /^(\.\.?\/)+store\/attachments$/, replacement: path.resolve(__dirname, "attachmentsStub.ts") },
    ],
  },
});
