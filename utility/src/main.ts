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

// A task link (cadence/share.ts) opens the app with launch parameters.
// The player's fragment never reaches the app, so they arrive as the
// host's queryParams (or, on mobile, in the page URL). Read once at boot;
// kept for a 20 s grace window so a second mount still sees it, then
// spent so returning to the tool later is an ordinary visit.
type Task = import("./cadence/share").CadenceTask;
let pendingTask: Task | null = null;
let pendingTaskAt = 0;
const takeTask = (): Task | null => {
  if (pendingTask && Date.now() - pendingTaskAt < 20000) {
    const t = pendingTask;
    pendingTask = null;
    return t;
  }
  pendingTask = null;
  return null;
};

async function readLaunch(): Promise<string | null> {
  const { parseTask } = await import("./cadence/share");
  let params: Record<string, string> = {};
  try {
    const { getContext } = await import("@microsoft/power-apps/app");
    const ctx = await Promise.race([getContext(), new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 2500))]);
    params = ctx.app?.queryParams ?? {};
  } catch {
    /* dev server: the page query only */
  }
  const t = parseTask(params, location.search);
  if (!t) return null;
  pendingTask = t;
  pendingTaskAt = Date.now();
  return "cadence";
}

const TOOLS: Tool[] = [
  {
    route: "cadence",
    title: "Cadence Current State",
    blurb: "Scan your Outlook calendar for a period, review every meeting, and export a summary of your meeting cadence for analysis.",
    mount: async (host, back) => (await import("./cadence/screen")).mountCadence(host, back, { task: takeTask() }),
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
// paint at once; a task link then re-routes into its tool
void route();
void (async () => {
  const target = await readLaunch();
  if (!target) return;
  if (location.hash !== `#/${target}`) location.hash = `#/${target}`; // hashchange routes
  else void route();
})();
