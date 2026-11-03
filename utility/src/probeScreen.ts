// The Phase 0 calendar probe, kept behind the hub's footer link as a
// diagnostic: status-only output, safe to paste into a chat.
import { runCalendarProbe } from "./probe";
import { el, clear } from "./dom";

export function mountProbe(root: HTMLElement, back: () => void): void {
  clear(root);
  const page = el("main", "u-page");
  const head = el("div", "u-head");
  const backBtn = el("button", "app-link", "‹ Tools");
  backBtn.addEventListener("click", back);
  head.append(backBtn);
  page.append(
    head,
    el("h1", "u-title", "Calendar probe"),
    el("p", "u-muted", `Build ${__APP_VERSION__}`),
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
      const range = document.createRange();
      range.selectNodeContents(log);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      copy.textContent = "Selected — press Ctrl/Cmd+C";
    }
    setTimeout(() => (copy.textContent = "Copy log"), 2500);
  });
}
