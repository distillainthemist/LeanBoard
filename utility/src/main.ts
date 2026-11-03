// LeanBoard Utilities — the second code app (docs/cadence-current-state-plan-2026-11.md).
// A hub of task-specific tools behind a hash router. Each tool is loaded
// by dynamic import so the hub paints at once and a tool's code arrives
// only when it is opened.

import "./style.css";
import { el, clear } from "./dom";

const root = document.getElementById("app")!;

interface Tool {
  route: string;
  title: string;
  blurb: string;
  mount: (host: HTMLElement, back: () => void) => Promise<void>;
}

const TOOLS: Tool[] = [
  {
    route: "cadence",
    title: "Cadence Current State",
    blurb: "Scan your Outlook calendar for a period, review every meeting, and export a summary of your meeting cadence for analysis.",
    mount: async (host, back) => (await import("./cadence/screen")).mountCadence(host, back),
  },
];

const goHome = (): void => {
  location.hash = "#/";
};

function paintHub(): void {
  clear(root);
  const page = el("main", "u-page");
  page.append(el("h1", "u-title", "LeanBoard Utilities"), el("p", "u-muted", "Tools for specific tasks."));
  const grid = el("div", "u-tiles");
  for (const t of TOOLS) {
    const b = el("button", "u-tile");
    b.append(el("strong", "", t.title), el("span", "u-muted", t.blurb));
    b.addEventListener("click", () => (location.hash = `#/${t.route}`));
    grid.append(b);
  }
  page.append(grid);
  const foot = el("p", "u-foot u-muted", `Build ${__APP_VERSION__} · `);
  const probe = el("button", "app-link", "Calendar probe");
  probe.addEventListener("click", () => (location.hash = "#/probe"));
  foot.append(probe);
  page.append(foot);
  root.append(page);
}

async function route(): Promise<void> {
  const r = location.hash.replace(/^#\/?/, "");
  const tool = TOOLS.find((t) => t.route === r);
  if (tool) {
    clear(root);
    await tool.mount(root, goHome);
    return;
  }
  if (r === "probe") {
    clear(root);
    (await import("./probeScreen")).mountProbe(root, goHome);
    return;
  }
  paintHub();
}

window.addEventListener("hashchange", () => void route());
void route();
