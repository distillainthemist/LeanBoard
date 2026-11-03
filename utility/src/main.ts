// LeanBoard Utilities — the second code app (docs/cadence-current-state-plan-2026-11.md).
// Phase 0 is a probe only: it measures the calendar roads through the
// Office 365 Outlook and Office 365 Users connectors in the hosted player
// before any feature code rides them. The tool itself comes in Phase 3.

import "./style.css";
import { runCalendarProbe } from "./probe";

const root = document.getElementById("app")!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const page = el("main", "u-page");
page.append(
  el("h1", "u-title", "LeanBoard Utilities"),
  el("p", "u-muted", `Calendar probe · build ${__APP_VERSION__}`),
  el(
    "p",
    "",
    "This reads one week of your own calendar through the Office 365 Outlook connector and reports which fields and options " +
      "the connector returns. It stores nothing. The log shows counts, field names and status codes only — never subjects, " +
      "bodies, names or addresses — so it is safe to copy into a chat."
  )
);

const bar = el("div", "u-bar");
const run = el("button", "app-btn app-btn-primary", "Run calendar probe");
const copy = el("button", "app-btn", "Copy log");
copy.disabled = true;
bar.append(run, copy);
const log = el("pre", "u-log");
page.append(bar, log);
root.append(page);

const lines: string[] = [];
const write = (line: string): void => {
  lines.push(line);
  log.textContent = lines.join("\n");
};

run.addEventListener("click", async () => {
  run.disabled = true;
  copy.disabled = true;
  lines.length = 0;
  write(`Build ${__APP_VERSION__} · started ${new Date().toISOString()}`);
  try {
    await runCalendarProbe(write);
  } catch (e) {
    write(`FAIL — the probe threw: ${String(e).slice(0, 300)}`);
  }
  write("— done —");
  run.disabled = false;
  copy.disabled = false;
});

copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    copy.textContent = "Copied";
  } catch {
    // the player may refuse clipboard access: select the text instead
    const range = document.createRange();
    range.selectNodeContents(log);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    copy.textContent = "Selected — press Ctrl/Cmd+C";
  }
  setTimeout(() => (copy.textContent = "Copy log"), 2500);
});
