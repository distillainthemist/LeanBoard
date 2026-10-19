// Settings → UAT (uat-proposal-2026-10.md §3, super admins): the runs,
// "New UAT run…" (components · scope · people with personas), progress
// by persona and tester, the fails, Close / Reopen / Re-run the fails /
// Edit people / Export PDF. Starting a run sends each assignee a Teams
// card with the link to their UAT tab.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { statusChip } from "../../../shared/ui/format";
import { settingsSection } from "../settingsSection";
import { promptConfirm, promptText } from "../prompts";
import { listPeople } from "../store/people";
import type { RosterPerson } from "../store/mappers";
import { appLinkUrl } from "../links";
import { UAT_COMPONENTS, UatAssignee, UatResult, UatRun, UatRunCase, UatScripts, casesFor, changedSince, failedCases, progressByPersona, progressByTester, snapshotCases } from "./model";
import { closeRun, createRun, listResults, listRuns, loadScripts, reopenRun, updateAssignees, updateDescription } from "./store";

const note = (text: string) => el("div", "app-settings-note", text);
const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};
const when = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString();
};

export async function renderUatSettings(body: HTMLElement): Promise<void> {
  clear(body);
  body.appendChild(el("div", "app-loading-line", "Reading UAT runs…"));
  let scripts: UatScripts;
  let roster: RosterPerson[];
  try {
    [scripts, roster] = await Promise.all([loadScripts(), listPeople()]);
  } catch (e) {
    clear(body);
    body.appendChild(note(`UAT needs the hosted app: ${String(e).slice(0, 160)}`));
    return;
  }
  clear(body);
  body.appendChild(settingsSection("UAT runs"));
  body.appendChild(
    note(
      "A run picks the components to test, the people and the personas each covers. Every assignee gets a UAT tab " +
        "with their cases; a Fail raises an issue. The cases are frozen when the run starts, so a later build cannot " +
        "change what a run tested. The scripts ship with the build from docs/uat."
    )
  );
  const bar = el("div", "app-uat-bar");
  const newBtn = btn("New UAT run…", "app-btn app-btn-primary");
  const refresh = btn("↻ Refresh");
  const status = el("div", "app-docs-addstatus");
  bar.append(newBtn, refresh, status);
  body.appendChild(bar);
  const counts = el("div", "app-field-hint");
  counts.textContent = UAT_COMPONENTS.map((c) => `${c.label}: ${casesFor(scripts, [c.key]).length} cases`).join(" · ");
  body.appendChild(counts);
  const list = el("div", "app-uat-runs");
  body.appendChild(list);

  const sendCards = async (run: UatRun, assignees: UatAssignee[]): Promise<string> => {
    const me = (await import("../runtime")).currentViewer();
    const myEmail = (me?.email ?? "").toLowerCase();
    try {
      const { sendNotifyTeams } = await import("../docs/notify");
      const failed: string[] = [];
      for (const a of assignees) {
        if (a.email === "" || a.email === myEmail) continue;
        const r = await sendNotifyTeams(
          [{ email: a.email, name: a.name || a.email }],
          `UAT: ${run.name}`,
          `You are on the UAT run “${run.name}” as ${a.personas.join(", ") || "every persona"} — open LeanBoard, the UAT tab lists your cases. Pass, Fail (it raises an issue) or Blocked each one.`,
          `${appLinkUrl()}#/uat`,
          run.description.trim() !== "" ? { label: "Instructions", text: run.description } : undefined
        );
        if (r.error !== "") failed.push(`${a.name}: ${r.error}`);
      }
      return failed.join("; ");
    } catch (e) {
      return (e as Error).message;
    }
  };

  const paint = async () => {
    clear(list);
    list.appendChild(el("div", "app-loading-line", "Reading runs…"));
    const runs = await listRuns().catch((e) => {
      status.textContent = String(e);
      return [] as UatRun[];
    });
    clear(list);
    if (runs.length === 0) {
      list.appendChild(note("No UAT runs yet."));
      return;
    }
    for (const run of runs) list.appendChild(runRow(run));
  };

  const runRow = (run: UatRun): HTMLElement => {
    const row = el("div", "app-uat-run");
    const head = el("div", "app-uat-runhead");
    head.appendChild(statusChip(run.status === "closed" ? "✓ Closed" : "● Running", run.status === "closed" ? "neutral" : "amber"));
    head.appendChild(el("span", "app-uat-runname", run.name));
    head.appendChild(el("span", "app-field-hint", `${run.components.map((k) => UAT_COMPONENTS.find((c) => c.key === k)?.label ?? k).join(", ")} · v${run.appVersion} · ${run.environment} · ${run.cases.length} cases · ${run.assignees.length} tester${run.assignees.length === 1 ? "" : "s"} · ${when(run.createdAt)}`));
    row.appendChild(head);
    const detail = el("div", "app-uat-rundetail");
    detail.hidden = true;
    row.appendChild(detail);
    head.addEventListener("click", () => {
      detail.hidden = !detail.hidden;
      if (!detail.hidden) void paintDetail(run, detail);
    });
    return row;
  };

  const bars = (title: string, items: { label: string; p: { total: number; pass: number; fail: number; blocked: number; skipped: number; untested: number } }[]) => {
    const box = el("div", "app-uat-bars");
    box.appendChild(el("div", "app-field-label", title));
    for (const it of items) {
      const line = el("div", "app-uat-barline");
      line.appendChild(el("span", "app-uat-barlabel", it.label));
      const bar = el("div", "app-uat-barbar");
      const seg = (n: number, cls: string, word: string) => {
        if (n === 0) return;
        const s = el("span", `app-uat-seg app-uat-seg-${cls}`);
        s.style.width = `${(100 * n) / Math.max(1, it.p.total)}%`;
        s.title = `${n} ${word}`;
        bar.appendChild(s);
      };
      seg(it.p.pass, "pass", "pass");
      seg(it.p.fail, "fail", "fail");
      seg(it.p.blocked, "blocked", "blocked");
      seg(it.p.skipped, "skipped", "skipped");
      line.appendChild(bar);
      line.appendChild(el("span", "app-field-hint", `${it.p.total - it.p.untested}/${it.p.total}${it.p.fail > 0 ? ` · ${it.p.fail} fail` : ""}${it.p.blocked > 0 ? ` · ${it.p.blocked} blocked` : ""}`));
      box.appendChild(line);
    }
    return box;
  };

  const paintDetail = async (run: UatRun, host: HTMLElement) => {
    clear(host);
    host.appendChild(el("div", "app-loading-line", "Reading results…"));
    const results = await listResults(run.rowId).catch(() => [] as UatResult[]);
    clear(host);
    host.appendChild(bars("By persona", progressByPersona(run, results).map((x) => ({ label: x.persona, p: x.progress }))));
    host.appendChild(bars("By tester", progressByTester(run, results).map((x) => ({ label: `${x.assignee.name} · ${x.assignee.personas.join(", ") || "all"}`, p: x.progress }))));
    const bad = failedCases(run, results);
    if (bad.length > 0) {
      host.appendChild(el("div", "app-field-label", `Fails and blocks (${bad.length})`));
      for (const c of bad) {
        const rs = results.filter((r) => r.caseId === c.id && (r.outcome === "fail" || r.outcome === "blocked"));
        const line = el("div", "app-uat-fail");
        line.appendChild(el("span", "app-uat-caseid", c.id));
        line.appendChild(el("span", undefined, c.title));
        line.appendChild(el("span", "app-field-hint", rs.map((r) => `${r.outcome} · ${r.testerName}${r.note !== "" ? ` — ${r.note}` : ""}${r.issueId !== "" ? " · issue raised" : ""}`).join("; ")));
        host.appendChild(line);
      }
      host.appendChild(el("div", "app-field-hint", "The issues raised from this run: Settings → Issues → origin “UAT: " + run.name + "”, tick and Export to PDF."));
    }
    if (run.closingNote !== "") host.appendChild(el("div", "app-field-hint", `Closed by ${run.closedByName} ${when(run.closedAt)} — ${run.closingNote}`));
    if (run.description.trim() !== "") host.appendChild(el("div", "app-uat-desc", run.description));
    const acts = el("div", "app-uat-acts");
    const descBtn = btn("Edit instructions…");
    descBtn.addEventListener("click", () => {
      void promptText({ title: `Instructions — ${run.name}`, note: "What the testers need to know: the environment, test accounts, where to focus. Shown on their UAT tab.", initial: run.description, multiline: true, confirmLabel: "Save" }).then(async (v) => {
        if (v === null) return;
        await updateDescription(run, v);
        run.description = v;
        status.textContent = "Instructions saved.";
        await paintDetail(run, host);
      });
    });
    acts.appendChild(descBtn);
    const people = btn("Edit people…");
    people.addEventListener("click", () => openPeople(run, async (assignees) => {
      await updateAssignees(run, assignees);
      const added = assignees.filter((a) => !run.assignees.some((b) => b.email === a.email));
      run.assignees = assignees;
      const warn = added.length > 0 ? await sendCards(run, added) : "";
      status.textContent = warn !== "" ? `People saved — the Teams card did not go: ${warn}` : "People saved.";
      await paint();
    }));
    acts.appendChild(people);
    if (run.status === "running") {
      const close = btn("Close run…");
      close.addEventListener("click", () => {
        void (async () => {
          const n = await promptText({ title: `Close “${run.name}”`, note: "A closing note — what the run concluded.", required: "A note is needed.", confirmLabel: "Close run" });
          if (n === null) return;
          await closeRun(run, n);
          status.textContent = `“${run.name}” closed.`;
          await paint();
        })();
      });
      acts.appendChild(close);
    } else {
      const reopen = btn("Reopen");
      reopen.addEventListener("click", () => {
        void reopenRun(run).then(() => paint());
      });
      acts.appendChild(reopen);
    }
    if (bad.length > 0) {
      const rerun = btn("Re-run the fails…");
      rerun.addEventListener("click", () => {
        void (async () => {
          const ok = await promptConfirm({ title: `Re-run ${bad.length} failed or blocked case${bad.length === 1 ? "" : "s"}?`, note: `A new run “${run.name} — re-run” with the same people and only those cases. The assignees get a Teams card.`, confirmLabel: "Start re-run" });
          if (!ok) return;
          const id = await createRun({ name: `${run.name} — re-run`, description: run.description, components: run.components, environment: run.environment, assignees: run.assignees, cases: bad, scope: `re-run of ${run.name}` });
          const made: UatRun = { ...run, rowId: id, name: `${run.name} — re-run`, cases: bad };
          const warn = await sendCards(made, run.assignees);
          status.textContent = warn !== "" ? `Re-run started — some Teams cards did not go: ${warn}` : "Re-run started — the testers have their cards.";
          await paint();
        })();
      });
      acts.appendChild(rerun);
    }
    const pdf = btn("Export PDF");
    pdf.addEventListener("click", () => {
      void import("./exportPdf").then(({ exportRunPdf }) => exportRunPdf(run, results));
    });
    acts.appendChild(pdf);
    host.appendChild(acts);
  };

  /** The people editor: search the roster, tick personas per person. */
  const openPeople = (run: { assignees: UatAssignee[]; components: string[] }, onDone: (a: UatAssignee[]) => Promise<void>) => {
    const dlgHost = el("div", "app-dlghost");
    body.appendChild(dlgHost);
    const chosen: UatAssignee[] = run.assignees.map((a) => ({ ...a, personas: [...a.personas] }));
    const personas = [...new Set(run.components.flatMap((k) => UAT_COMPONENTS.find((c) => c.key === k)?.personas ?? []))];
    const dlg = openDialog({
      host: dlgHost,
      title: "Testers and personas",
      maxWidth: 560,
      onClose: () => dlgHost.remove(),
      buttons: [
        { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
        { label: "Save", kind: "primary", onClick: () => void onDone(chosen).then(() => dlg.close()) },
      ],
    });
    const search = el("input", "app-input") as HTMLInputElement;
    search.placeholder = "Add a person from the roster…";
    const hits = el("div", "app-uat-hits");
    const chosenBox = el("div", "app-uat-chosen");
    dlg.body.append(el("div", "app-field-hint", "A person with no persona ticked tests every case."), search, hits, chosenBox);
    const paintChosen = () => {
      clear(chosenBox);
      for (const a of chosen) {
        const row = el("div", "app-uat-person");
        const top = el("div", "app-uat-persontop");
        top.appendChild(el("span", "app-uat-personname", a.name || a.email));
        const x = btn("×", "app-org-x");
        x.addEventListener("click", () => {
          chosen.splice(chosen.indexOf(a), 1);
          paintChosen();
        });
        top.appendChild(x);
        row.appendChild(top);
        const pills = el("div", "app-uat-personas");
        for (const p of personas) {
          const on = a.personas.includes(p);
          const pill = btn(p, "app-settings-pill" + (on ? " app-settings-pill-on" : ""));
          pill.addEventListener("click", () => {
            if (on) a.personas.splice(a.personas.indexOf(p), 1);
            else a.personas.push(p);
            paintChosen();
          });
          pills.appendChild(pill);
        }
        row.appendChild(pills);
        chosenBox.appendChild(row);
      }
      if (chosen.length === 0) chosenBox.appendChild(el("div", "app-field-hint", "Nobody yet."));
    };
    paintChosen();
    search.addEventListener("input", () => {
      clear(hits);
      const q = search.value.trim().toLowerCase();
      if (q === "") return;
      for (const p of roster.filter((r) => r.active && (r.who.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))).slice(0, 8)) {
        const b = btn(`${p.who} · ${p.email}`, "app-link app-uat-hit");
        b.disabled = chosen.some((a) => a.email === p.email.toLowerCase());
        b.addEventListener("click", () => {
          chosen.push({ whoId: p.whoId, email: p.email.toLowerCase(), name: p.who, personas: [] });
          search.value = "";
          clear(hits);
          paintChosen();
        });
        hits.appendChild(b);
      }
    });
  };

  const openNew = () => {
    const dlgHost = el("div", "app-dlghost");
    body.appendChild(dlgHost);
    const draft = { name: "", description: "", environment: window.location.host.includes("powerplatformusercontent") ? "production test site" : window.location.host, components: [] as string[], scope: "all", assignees: [] as UatAssignee[] };
    const dlg = openDialog({
      host: dlgHost,
      title: "New UAT run",
      maxWidth: 600,
      onClose: () => dlgHost.remove(),
      buttons: [
        { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
        { label: "Start run", kind: "primary", onClick: () => void start() },
      ],
    });
    const name = el("input", "app-input") as HTMLInputElement;
    name.placeholder = "e.g. Documents UAT — October 2026";
    const env = el("input", "app-input") as HTMLInputElement;
    env.value = draft.environment;
    const desc = el("textarea", "app-input") as HTMLTextAreaElement;
    desc.rows = 4;
    desc.placeholder = "What the testers need to know — the site, test accounts, what to focus on, how to report. Shown at the top of their UAT tab and in the Teams card.";
    const comps = el("div", "app-uat-comps");
    const scope = el("select", "app-input") as HTMLSelectElement;
    scope.appendChild(new Option("Every case", "all"));
    for (const r of scripts.releases.slice(0, 12)) scope.appendChild(new Option(`Only cases changed since ${r.tag} (${r.date})`, r.tag));
    const caseCount = el("div", "app-field-hint", "");
    const recount = () => {
      let cases = casesFor(scripts, draft.components);
      if (scope.value !== "all") cases = changedSince(cases, scripts, scope.value);
      caseCount.textContent = `${cases.length} case${cases.length === 1 ? "" : "s"} in this run`;
    };
    for (const c of UAT_COMPONENTS) {
      const n = casesFor(scripts, [c.key]).length;
      const lab = el("label", "app-uat-comp");
      const box = el("input", "app-docs-libcheck") as HTMLInputElement;
      box.type = "checkbox";
      box.disabled = n === 0;
      box.addEventListener("change", () => {
        draft.components = box.checked ? [...draft.components, c.key] : draft.components.filter((k) => k !== c.key);
        recount();
      });
      lab.append(box, el("span", undefined, `${c.label} `), el("span", "app-field-hint", n === 0 ? "no script yet" : `${n} cases`));
      comps.appendChild(lab);
    }
    scope.addEventListener("change", recount);
    const peopleBtn = btn("Testers and personas…");
    const peopleLine = el("div", "app-field-hint", "Nobody yet.");
    peopleBtn.addEventListener("click", () => {
      if (draft.components.length === 0) {
        st.textContent = "Pick the components first — they decide the personas.";
        return;
      }
      openPeople(draft, async (a) => {
        draft.assignees = a;
        peopleLine.textContent = a.length === 0 ? "Nobody yet." : a.map((x) => `${x.name} (${x.personas.join(", ") || "all"})`).join(" · ");
      });
    });
    const st = el("div", "app-docs-addstatus");
    const lab = (t: string) => el("div", "app-field-label", t);
    dlg.body.append(lab("Name"), name, lab("Environment"), env, lab("Instructions for the testers"), desc, lab("Components"), comps, lab("Scope"), scope, caseCount, lab("People"), peopleBtn, peopleLine, st);
    recount();
    let running = false;
    const start = async () => {
      if (running) return;
      draft.name = name.value.trim();
      draft.description = desc.value.trim();
      draft.environment = env.value.trim();
      if (draft.name === "") {
        st.textContent = "A name is needed.";
        return;
      }
      if (draft.components.length === 0) {
        st.textContent = "Pick at least one component.";
        return;
      }
      if (draft.assignees.length === 0) {
        st.textContent = "Add at least one tester.";
        return;
      }
      let cases = casesFor(scripts, draft.components);
      if (scope.value !== "all") cases = changedSince(cases, scripts, scope.value);
      if (cases.length === 0) {
        st.textContent = "No cases in that scope.";
        return;
      }
      running = true;
      st.textContent = "Starting…";
      try {
        const snap: UatRunCase[] = snapshotCases(cases);
        const id = await createRun({ name: draft.name, description: draft.description, components: draft.components, environment: draft.environment, assignees: draft.assignees, cases: snap, scope: scope.value === "all" ? "every case" : `changed since ${scope.value}` });
        st.textContent = "Telling the testers on Teams…";
        const made: UatRun = { rowId: id, name: draft.name, description: draft.description, status: "running", components: draft.components, appVersion: "", environment: draft.environment, assignees: draft.assignees, cases: snap, scope: "", createdByEmail: "", createdByName: "", createdAt: "", closedByName: "", closedAt: "", closingNote: "" };
        const warn = await sendCards(made, draft.assignees);
        dlg.close();
        status.textContent = warn !== "" ? `Run started — some Teams cards did not go: ${warn}` : `“${draft.name}” started — the testers have their cards.`;
        await paint();
      } catch (e) {
        st.textContent = `Could not start: ${(e as Error).message}`;
        running = false;
      }
    };
  };
  newBtn.addEventListener("click", openNew);
  refresh.addEventListener("click", () => void paint());
  await paint();
}
