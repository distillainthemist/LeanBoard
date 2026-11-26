// The year-change panel (issue review 2026-11-25, report 1): Settings →
// Priorities → "Change for <year>…". The rule is yearChange.ts; this is
// the surface — the earlier year's pillars and sub-pillars, one answer
// each, what it would cost in the footer, and one Save.
//
// Rows are written one at a time (Dataverse gives the app no way to make
// several writes succeed or fail together), IN ORDER: new rows, then
// links and moves, then the rows that end. A failure part-way leaves the
// earlier year as it was; Save again finishes.

import { clear, el } from "../../../shared/ui/dom";
import { PeriodSettings, Pillar, Priority, comparePeriods, orgName, pillarUse } from "./model";
import { YcChoice, YcKind, YcNew, YearChange, cardsOnEnded, carriedCounts, imageOf, planYearChange, readYearChange, targetsFor, yearChangeOutcome, yearChangeProblems, yearRows } from "./yearChange";

export interface YearChangeOpts {
  settings: PeriodSettings;
  /** Every pillar row, as stored. */
  pillars: Pillar[];
  priorities: Priority[];
  companies: string[];
  from: string;
  to: string;
  /** The current year: an EARLIER change is warned about. */
  currentPeriod: string;
  mintId: () => string;
  /** Each board card that rotates on pillars: its board and their ids. */
  rotatingCards: () => Promise<{ board: string; ids: string[] }[]>;
  save: (p: Pillar, all: Pillar[]) => Promise<string>;
  remove: (rowId: string) => Promise<void>;
  reload: () => Promise<{ pillars: Pillar[]; priorities: Priority[] }>;
  onSaved: () => void;
}

const KIND_WORDS: Record<YcKind, string> = { continues: "Continues", becomes: "Becomes", ends: "Ends" };

export function openYearChange(o: YearChangeOpts): void {
  let pillars = o.pillars;
  let priorities = o.priorities;
  let company = o.companies[0] ?? "";
  let change: YearChange = readYearChange(o.settings, pillars, company, o.from, o.to);
  let cards: { board: string; ids: string[] }[] | null = null;
  let saving = false;

  const overlay = el("div", "app-modal-overlay app-modal-top");
  const box = el("div", "app-modal app-yc-box");
  const head = el("div", "app-yc-head");
  head.appendChild(el("div", "app-modal-title", `Change from ${o.from} to ${o.to}`));
  const companySel = el("select", "app-input app-yc-company") as HTMLSelectElement;
  for (const c of o.companies) {
    const opt = el("option", "", c) as HTMLOptionElement;
    opt.value = c;
    companySel.appendChild(opt);
  }
  companySel.value = company;
  companySel.setAttribute("aria-label", "Company");
  if (o.companies.length > 1) head.appendChild(companySel);
  box.appendChild(head);
  const body = el("div", "app-yc-body");
  box.appendChild(body);
  const foot = el("div", "app-modal-footer app-yc-foot");
  const status = el("div", "app-yc-status");
  const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
  cancel.type = "button";
  const saveBtn = el("button", "app-btn app-btn-primary", `Save ${o.to} structure`) as HTMLButtonElement;
  saveBtn.type = "button";
  foot.append(status, cancel, saveBtn);
  box.appendChild(foot);
  overlay.appendChild(box);

  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || saving) return;
    // Escape in a field leaves the field first
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "SELECT" || t.tagName === "INPUT")) return;
    e.stopPropagation();
    close();
  };
  document.addEventListener("keydown", onKey, true);
  cancel.addEventListener("click", () => {
    if (!saving) close();
  });

  const nameOf = (id: string): string => {
    const added = change.added.find((n) => n.id === id);
    if (added) return added.name.trim() !== "" ? added.name.trim() : added.level === 1 ? "(new pillar)" : "(new sub-pillar)";
    const p = pillars.find((x) => x.id === id);
    return p ? (p.name.trim() !== "" ? p.name.trim() : "(unnamed)") : "(gone)";
  };
  const choiceOf = (id: string): YcChoice => change.choices[id] ?? { kind: "continues" };
  const setChoice = (id: string, c: YcChoice) => {
    change = { ...change, choices: { ...change.choices, [id]: c } };
    paint();
  };
  const plan = () => {
    const used = new Set(pillars.filter((p) => pillarUse(p.id, priorities) > 0).map((p) => p.id));
    return planYearChange(o.settings, pillars, change, used, o.mintId);
  };
  /** The pillars of the LATER year a sub-pillar may sit under. */
  const laterPillars = (): { id: string; name: string }[] => {
    const out: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    const add = (id: string | null) => {
      if (id === null || id === "" || seen.has(id)) return;
      seen.add(id);
      out.push({ id, name: nameOf(id) });
    };
    for (const { pillar } of yearRows(o.settings, pillars, company, o.from)) add(imageOf(change, pillar.id));
    for (const p of pillars) if (p.level === 1 && p.active && (company === "" || p.company === company) && p.fromPeriod === o.to) add(p.id);
    for (const n of change.added) if (n.level === 1) add(n.id);
    return out;
  };

  const kindSelect = (id: string): HTMLSelectElement => {
    const sel = el("select", "app-input app-yc-kind") as HTMLSelectElement;
    for (const k of ["continues", "becomes", "ends"] as YcKind[]) {
      const opt = el("option", "", KIND_WORDS[k]) as HTMLOptionElement;
      opt.value = k;
      sel.appendChild(opt);
    }
    sel.value = choiceOf(id).kind;
    sel.setAttribute("aria-label", `What ${nameOf(id)} is in ${o.to}`);
    sel.addEventListener("change", () => setChoice(id, { kind: sel.value as YcKind }));
    return sel;
  };
  const targetSelect = (row: Pillar): HTMLSelectElement => {
    const sel = el("select", "app-input app-yc-target") as HTMLSelectElement;
    const none = el("option", "", "Choose…") as HTMLOptionElement;
    none.value = "";
    sel.appendChild(none);
    for (const t of targetsFor(o.settings, pillars, change, row)) {
      const opt = el("option", "", t.isNew ? `${t.name.trim() !== "" ? t.name : "(unnamed)"} · new` : t.name) as HTMLOptionElement;
      opt.value = t.id;
      sel.appendChild(opt);
    }
    sel.value = choiceOf(row.id).target ?? "";
    sel.setAttribute("aria-label", `What ${nameOf(row.id)} becomes`);
    sel.addEventListener("change", () => setChoice(row.id, { kind: "becomes", target: sel.value }));
    return sel;
  };
  /** A continuing sub-pillar's pillar in the later year. */
  const underSelect = (row: Pillar, ownPillar: Pillar): HTMLSelectElement => {
    const sel = el("select", "app-input app-yc-target") as HTMLSelectElement;
    const natural = imageOf(change, ownPillar.id);
    const stay = el("option", "", natural !== null ? `Under ${nameOf(natural)}` : "Choose a pillar…") as HTMLOptionElement;
    stay.value = "";
    sel.appendChild(stay);
    for (const p of laterPillars()) {
      if (p.id === natural) continue;
      const opt = el("option", "", `Move under ${p.name}`) as HTMLOptionElement;
      opt.value = p.id;
      sel.appendChild(opt);
    }
    sel.value = choiceOf(row.id).under ?? "";
    sel.setAttribute("aria-label", `The pillar ${nameOf(row.id)} sits under in ${o.to}`);
    sel.addEventListener("change", () => setChoice(row.id, sel.value !== "" ? { kind: "continues", under: sel.value } : { kind: "continues" }));
    return sel;
  };

  const paint = () => {
    clear(body);
    const counts = carriedCounts(o.settings, pillars, priorities, { company, from: o.from, to: o.to });
    const rows = yearRows(o.settings, pillars, company, o.from);
    if (comparePeriods(o.settings, o.to, o.currentPeriod) <= 0) {
      body.appendChild(el("div", "app-yc-note", `This is an earlier change. What was set for the years after ${o.to} stays as it is: check it still makes sense once this is saved.`));
    }
    const grid = el("div", "app-yc-grid");
    grid.append(el("div", "app-yc-colhead", `In ${o.from}`), el("div", "app-yc-colhead app-yc-num", "Priorities"), el("div", "app-yc-colhead", `In ${o.to}`));
    if (rows.length === 0) body.appendChild(el("div", "app-settings-note", `No pillars are in force in ${o.from}.`));
    for (const { pillar, subs } of rows) {
      const line = (row: Pillar, own: Pillar | null) => {
        const c = choiceOf(row.id);
        grid.appendChild(el("div", own ? "app-yc-name app-yc-sub" : "app-yc-name app-yc-top", nameOf(row.id)));
        grid.appendChild(el("div", "app-yc-num", String(counts.get(row.id) ?? 0)));
        const cell = el("div", "app-yc-choice");
        cell.appendChild(kindSelect(row.id));
        if (c.kind === "becomes") cell.appendChild(targetSelect(row));
        else if (c.kind === "continues" && own !== null) cell.appendChild(underSelect(row, own));
        grid.appendChild(cell);
      };
      line(pillar, null);
      for (const s of subs) line(s, pillar);
    }
    body.appendChild(grid);

    // ---- what is new in the later year
    const stored = pillars.filter((p) => p.active && (company === "" || p.company === company) && p.fromPeriod === o.to && !plan().deletes.some((d) => d.id === p.id));
    const targetIds = new Set(rows.flatMap((r) => [r.pillar, ...r.subs]).flatMap((r) => targetsFor(o.settings, pillars, change, r).map((t) => t.id)));
    const listed = stored.filter((p) => targetIds.has(p.id));
    if (listed.length > 0 || change.added.length > 0) body.appendChild(el("div", "app-yc-colhead app-yc-newhead", `New in ${o.to}`));
    for (const p of listed) {
      const r = el("div", "app-yc-new");
      r.appendChild(el("span", "app-yc-newkind", p.level === 1 ? "Pillar" : "Sub-pillar"));
      r.appendChild(el("span", "app-yc-newname", `${nameOf(p.id)}${p.level === 2 ? ` · under ${nameOf(p.parentId)}` : ""}`));
      body.appendChild(r);
    }
    for (const n of change.added) {
      const r = el("div", "app-yc-new");
      r.appendChild(el("span", "app-yc-newkind", n.level === 1 ? "Pillar" : "Sub-pillar"));
      const name = el("input", "app-input app-yc-newinput") as HTMLInputElement;
      name.type = "text";
      name.value = n.name;
      name.placeholder = n.level === 1 ? "Pillar" : "Sub-pillar";
      name.setAttribute("aria-label", n.level === 1 ? "New pillar's name" : "New sub-pillar's name");
      name.dataset.ycNew = n.id;
      name.addEventListener("input", () => {
        n.name = name.value;
      });
      // the name shows in the targets and the footer once it is typed
      name.addEventListener("change", () => paint());
      r.appendChild(name);
      if (n.level === 1) {
        const swatch = el("input", "app-palette-swatch") as HTMLInputElement;
        swatch.type = "color";
        swatch.value = /^#[0-9a-fA-F]{6}$/.test(n.color) ? n.color : "#2563eb";
        swatch.setAttribute("aria-label", "New pillar's colour");
        swatch.addEventListener("input", () => {
          n.color = swatch.value;
        });
        r.appendChild(swatch);
      } else {
        const under = el("select", "app-input app-yc-target") as HTMLSelectElement;
        const none = el("option", "", "Under which pillar…") as HTMLOptionElement;
        none.value = "";
        under.appendChild(none);
        for (const p of laterPillars()) {
          const opt = el("option", "", `Under ${p.name}`) as HTMLOptionElement;
          opt.value = p.id;
          under.appendChild(opt);
        }
        under.value = n.under ?? "";
        under.setAttribute("aria-label", "New sub-pillar's pillar");
        under.addEventListener("change", () => {
          n.under = under.value;
          paint();
        });
        r.appendChild(under);
      }
      const x = el("button", "app-link app-yc-x", "✕") as HTMLButtonElement;
      x.type = "button";
      x.title = "Remove";
      x.setAttribute("aria-label", `Remove ${n.name.trim() !== "" ? n.name : "the new row"}`);
      x.addEventListener("click", () => {
        const choices: Record<string, YcChoice> = {};
        // anything pointed at it goes back to "choose"
        for (const [id, c] of Object.entries(change.choices)) choices[id] = c.target === n.id ? { kind: "becomes" } : c.under === n.id ? { kind: "continues" } : c;
        change = { ...change, choices, added: change.added.filter((a) => a !== n).map((a) => (a.under === n.id ? { ...a, under: "" } : a)) };
        paint();
      });
      r.appendChild(x);
      body.appendChild(r);
    }
    const adds = el("div", "app-yc-adds");
    const add = (level: 1 | 2, label: string) => {
      const b = el("button", "app-btn", label) as HTMLButtonElement;
      b.type = "button";
      b.addEventListener("click", () => {
        const n: YcNew = { id: o.mintId(), name: "", level, color: "#2563eb" };
        change = { ...change, added: [...change.added, n] };
        paint();
        // the row just added gets the cursor — by identity, not position
        body.querySelector<HTMLInputElement>(`input[data-yc-new="${n.id}"]`)?.focus();
      });
      adds.appendChild(b);
    };
    add(1, `＋ Pillar for ${o.to}`);
    add(2, `＋ Sub-pillar for ${o.to}`);
    body.appendChild(adds);

    // ---- what it would cost
    const problems = yearChangeProblems(o.settings, pillars, change);
    const p = plan();
    const out = yearChangeOutcome(o.settings, pillars, p, priorities, change);
    const cost = el("div", "app-yc-cost");
    for (const line of problems) cost.appendChild(el("div", "app-yc-warn app-yc-block", line));
    if (out.unplaced.length > 0) {
      const by = new Map<string, Map<string, number>>();
      for (const pr of out.unplaced) {
        const home = pillars.find((x) => x.id === pr.pillarId)?.name ?? "";
        const key = home !== "" ? home : "(no sub-pillar)";
        const orgs = by.get(key) ?? new Map<string, number>();
        const org = orgName(pr.org);
        orgs.set(org, (orgs.get(org) ?? 0) + 1);
        by.set(key, orgs);
      }
      const parts = [...by.entries()].map(([home, orgs]) => `under ${home}: ${[...orgs.entries()].map(([org, n]) => `${org} (${n})`).join(", ")}`);
      cost.appendChild(el("div", "app-yc-warn", `${out.unplaced.length} priorit${out.unplaced.length === 1 ? "y" : "ies"} would be left unplaced in ${o.to} — ${parts.join("; ")}.`));
    }
    if (out.orphanSubs.length > 0) {
      cost.appendChild(el("div", "app-yc-warn", `Left with no pillar in ${o.to}: ${out.orphanSubs.map((s) => nameOf(s.id)).join(", ")}.`));
    }
    if (out.endedIds.length > 0) {
      if (cards === null) cost.appendChild(el("div", "app-yc-note", "Checking the boards whose card rotates on a pillar…"));
      else {
        for (const c of cardsOnEnded(cards, out.endedIds, nameOf)) {
          cost.appendChild(el("div", "app-yc-warn", `${c.boards.length} board card${c.boards.length === 1 ? "" : "s"} rotate${c.boards.length === 1 ? "s" : ""} on ${c.name}, and will be empty for that topic: ${c.boards.join(", ")}.`));
        }
      }
    }
    const writes = p.creates.length + p.updates.length + p.ends.length + p.deletes.length;
    if (cost.children.length === 0) cost.appendChild(el("div", "app-yc-note", writes === 0 ? `Nothing changes between ${o.from} and ${o.to}.` : `Every priority keeps a place in ${o.to}.`));
    body.appendChild(cost);

    saveBtn.disabled = saving || problems.length > 0 || writes === 0;
    saveBtn.title = problems.length > 0 ? `Still needed: ${problems.join(" ")}` : writes === 0 ? "Nothing to save" : "";
  };

  companySel.addEventListener("change", () => {
    company = companySel.value;
    change = readYearChange(o.settings, pillars, company, o.from, o.to);
    paint();
  });

  saveBtn.addEventListener("click", () => {
    if (saving) return;
    const problems = yearChangeProblems(o.settings, pillars, change);
    if (problems.length > 0) return;
    saving = true;
    saveBtn.disabled = true;
    cancel.disabled = true;
    status.classList.remove("app-yc-status-warn");
    void (async () => {
      const p = plan();
      const steps = [...p.creates, ...p.updates, ...p.ends];
      const total = steps.length + p.deletes.length;
      let done = 0;
      // the working list: a row just created is found by the rows after
      // it (a sub-pillar binds to its pillar's row)
      const all = p.pillars.map((x) => ({ ...x }));
      const inAll = (id: string) => all.find((x) => x.id === id);
      try {
        for (const row of steps) {
          status.textContent = `Saving… ${done + 1} of ${total}`;
          const live = inAll(row.id) ?? row;
          const rowId = await o.save(live, all);
          if (live.rowId === undefined && rowId !== "") live.rowId = rowId;
          done++;
        }
        for (const d of p.deletes) {
          status.textContent = `Saving… ${done + 1} of ${total}`;
          if (d.rowId) await o.remove(d.rowId);
          done++;
        }
        close();
        o.onSaved();
      } catch (e) {
        // the old rows end LAST: stopped here, the earlier year is as it was
        const fresh = await o.reload().catch(() => null);
        if (fresh) {
          pillars = fresh.pillars;
          priorities = fresh.priorities;
          // a row the stopped save did create is a stored row now
          change = { ...change, added: change.added.filter((n) => !pillars.some((x) => x.id === n.id)) };
        }
        saving = false;
        cancel.disabled = false;
        status.textContent = `Saved ${done} of ${total}, then stopped: ${e instanceof Error ? e.message : String(e)}. ${o.from} is as it was. Press Save again to finish.`;
        status.classList.add("app-yc-status-warn");
        paint();
      }
    })();
  });

  paint();
  document.body.appendChild(overlay);
  void o
    .rotatingCards()
    .then((c) => (cards = c))
    .catch(() => (cards = []))
    .then(() => {
      if (overlay.isConnected && !saving) paint();
    });
}
