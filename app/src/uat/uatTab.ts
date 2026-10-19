// The UAT tab (uat-proposal-2026-10.md §4): a tester's cases for the
// personas they were given, by journey, with Pass · Fail… · Blocked… ·
// Skip. A Fail ALWAYS raises an issue (decision 3) — the issue reporter
// opens prefilled with the case; the result is recorded once the issue
// is sent. Results are per tester (decision 1).

import { clear, el } from "../../../shared/ui/dom";
import { statusChip } from "../../../shared/ui/format";
import { currentViewer } from "../runtime";
import { promptConfirm, promptText } from "../prompts";
import { UAT_COMPONENTS, UAT_CONTEXT_KEYS, UatCase, UatResult, UatRun, UatRunCase, UatScripts, casesForTester, failIssueDescription, failIssueTitle, latestByCase, progressFor } from "./model";
import { clearResult, listResults, loadScripts, myOpenRuns, recordResult } from "./store";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export function mountUat(host: HTMLElement): () => void {
  const wrap = el("div", "app-uat");
  host.appendChild(wrap);
  let dead = false;
  const me = currentViewer();
  const myEmail = (me?.email ?? "").toLowerCase();
  const dialogHost = el("div", "app-dlghost");
  document.body.appendChild(dialogHost);

  void (async () => {
    wrap.appendChild(el("div", "app-loading-line", "Reading your UAT cases…"));
    let runs: UatRun[] = [];
    let scripts: UatScripts | null = null;
    try {
      [runs, scripts] = await Promise.all([myOpenRuns(myEmail), loadScripts()]);
    } catch (e) {
      clear(wrap);
      wrap.appendChild(el("div", "app-settings-note", `UAT could not load: ${String(e).slice(0, 160)}`));
      return;
    }
    if (dead) return;
    clear(wrap);
    if (runs.length === 0) {
      wrap.appendChild(el("div", "app-settings-note", "You are not on an open UAT run."));
      return;
    }
    const byId = new Map<string, UatCase & { component: string }>();
    for (const [key, comp] of Object.entries(scripts.components)) for (const j of comp.journeys) for (const c of j.cases) byId.set(c.id, { ...c, component: key });
    let run = runs[0];
    let results: UatResult[] = [];
    let openCase = "";

    const head = el("div", "app-uat-head");
    wrap.appendChild(head);
    const bodyEl = el("div", "app-uat-body");
    wrap.appendChild(bodyEl);

    const load = async () => {
      results = await listResults(run.rowId).catch(() => [] as UatResult[]);
      if (dead) return;
      paint();
    };

    const paint = () => {
      clear(head);
      clear(bodyEl);
      const mine = casesForTester(run, myEmail);
      const latest = latestByCase(results, myEmail);
      const p = progressFor(mine, results, myEmail);
      // the run picker, when several
      if (runs.length > 1) {
        const sel = el("select", "app-input app-uat-runsel") as HTMLSelectElement;
        for (const r of runs) sel.appendChild(new Option(r.name, r.rowId));
        sel.value = run.rowId;
        sel.addEventListener("change", () => {
          run = runs.find((r) => r.rowId === sel.value) ?? run;
          void load();
        });
        head.appendChild(sel);
      } else head.appendChild(el("div", "app-uat-runtitle", run.name));
      const meta = run.assignees.find((a) => a.email === myEmail);
      head.appendChild(el("div", "app-field-hint", `v${run.appVersion} · ${run.environment} · you test as ${meta?.personas.join(", ") || "every persona"} · ${p.total - p.untested} of ${p.total} recorded${p.fail > 0 ? ` · ${p.fail} fail` : ""}${p.blocked > 0 ? ` · ${p.blocked} blocked` : ""}`));
      const bar = el("div", "app-uat-barbar app-uat-barbar-wide");
      const seg = (n: number, cls: string) => {
        if (n === 0) return;
        const s = el("span", `app-uat-seg app-uat-seg-${cls}`);
        s.style.width = `${(100 * n) / Math.max(1, p.total)}%`;
        bar.appendChild(s);
      };
      seg(p.pass, "pass");
      seg(p.fail, "fail");
      seg(p.blocked, "blocked");
      seg(p.skipped, "skipped");
      head.appendChild(bar);
      const next = btn("Next untested ↓", "app-btn app-uat-next");
      next.disabled = p.untested === 0;
      next.addEventListener("click", () => {
        const first = mine.find((c) => !latest.has(c.id));
        if (first === undefined) return;
        openCase = first.id;
        paint();
        bodyEl.querySelector<HTMLElement>(`[data-case="${first.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      head.appendChild(next);
      if (mine.length === 0) {
        bodyEl.appendChild(el("div", "app-settings-note", "No cases for your personas on this run."));
        return;
      }
      let journey = "";
      for (const c of mine) {
        if (c.journey !== journey) {
          journey = c.journey;
          bodyEl.appendChild(el("div", "app-docs-tasksgroup", journey));
        }
        bodyEl.appendChild(caseCard(c, byId.get(c.id) ?? null, latest.get(c.id) ?? null));
      }
    };

    const caseCard = (c: UatRunCase, full: (UatCase & { component: string }) | null, r: UatResult | null): HTMLElement => {
      const card = el("div", "app-uat-case" + (r !== null ? ` app-uat-case-${r.outcome}` : ""));
      card.dataset.case = c.id;
      const top = el("div", "app-uat-casetop");
      top.appendChild(el("span", "app-uat-caseid", c.id));
      top.appendChild(el("span", "app-uat-casetitle", c.title));
      top.appendChild(el("span", "app-uat-persona", c.persona));
      if (r !== null) top.appendChild(statusChip(r.outcome === "pass" ? "✓ Pass" : r.outcome === "fail" ? "✗ Fail" : r.outcome === "blocked" ? "⊘ Blocked" : "– Skipped", r.outcome === "pass" ? "green" : r.outcome === "fail" ? "red" : r.outcome === "blocked" ? "amber" : "neutral"));
      card.appendChild(top);
      top.addEventListener("click", () => {
        openCase = openCase === c.id ? "" : c.id;
        paint();
      });
      if (openCase !== c.id) return card;
      const detail = el("div", "app-uat-casedetail");
      if (full === null) detail.appendChild(el("div", "app-field-hint", "This case is no longer in the shipped script — record it from what the run froze."));
      else {
        if (full.preconditions !== "") detail.appendChild(el("div", "app-uat-pre", `Preconditions: ${full.preconditions}`));
        const ol = el("ol", "app-uat-steps");
        for (const s of full.steps) ol.appendChild(el("li", undefined, s));
        detail.appendChild(ol);
        detail.appendChild(el("div", "app-uat-expected", `Expected: ${full.expected}`));
      }
      if (r !== null) detail.appendChild(el("div", "app-field-hint", `You recorded ${r.outcome} ${new Date(r.at).toLocaleString()}${r.note !== "" ? ` — ${r.note}` : ""}${r.issueId !== "" ? " · issue raised" : ""}`));
      const acts = el("div", "app-uat-caseacts");
      const st = el("div", "app-docs-addstatus");
      const record = async (outcome: UatResult["outcome"], note: string, issueId = "") => {
        st.textContent = "Recording…";
        try {
          const made = await recordResult(run.rowId, c, outcome, note, issueId);
          results.push(made);
          openCase = "";
          paint();
        } catch (e) {
          st.textContent = `Could not record: ${(e as Error).message}`;
        }
      };
      const pass = btn("✓ Pass", "app-btn app-uat-pass");
      pass.addEventListener("click", () => void record("pass", ""));
      const failB = btn("✗ Fail…", "app-btn app-uat-fail");
      failB.addEventListener("click", () => {
        // a fail IS an issue (decision 3): the reporter opens prefilled;
        // the result lands once the issue is sent
        void import("../issues/report").then(({ openReportDialog }) => {
          const comp = UAT_COMPONENTS.find((x) => x.key === c.component);
          openReportDialog({
            host: dialogHost,
            prefill: {
              kind: "bug",
              area: (comp?.issueArea ?? "other") as "documents",
              title: failIssueTitle(c),
              description: full !== null ? failIssueDescription(full) : `UAT ${c.id} — ${c.title}\n\nWhat happened:\n`,
              context: { [UAT_CONTEXT_KEYS.run]: run.rowId, [UAT_CONTEXT_KEYS.runName]: run.name, [UAT_CONTEXT_KEYS.case]: c.id },
            },
            onSent: (issueId) => void record("fail", "", issueId),
          });
        });
      });
      const blocked = btn("⊘ Blocked…");
      blocked.addEventListener("click", () => {
        void promptText({ title: `Blocked — ${c.id}`, note: "What stopped you testing it?", required: "Say what blocked it.", confirmLabel: "Record" }).then((n) => {
          if (n !== null) void record("blocked", n);
        });
      });
      const skip = btn("Skip");
      skip.addEventListener("click", () => void record("skipped", ""));
      acts.append(pass, failB, blocked, skip);
      if (r !== null) {
        const undo = btn("Take it back", "app-link");
        undo.addEventListener("click", () => {
          void promptConfirm({ title: `Take back your ${r.outcome} on ${c.id}?`, note: r.issueId !== "" ? "The issue you raised stays — close it from My reports if it was wrong." : "", confirmLabel: "Take it back" }).then(async (ok) => {
            if (!ok) return;
            await clearResult(results, c.id, myEmail);
            results = results.filter((x) => !(x.caseId === c.id && x.testerEmail === myEmail));
            paint();
          });
        });
        acts.appendChild(undo);
      }
      detail.append(acts, st);
      card.appendChild(detail);
      return card;
    };

    await load();
  })();

  return () => {
    dead = true;
    dialogHost.remove();
    wrap.remove();
  };
}
