// Settings → Priorities (cascade plan P0): the configuration the cascade
// needs before any priority exists.
//
//   Pillars            superadmin — pillars (filter chips above the
//                      matrix) and their sub-pillars (the matrix
//                      columns): name, colour, active, ▲▼ order
//   Period & roll-up   superadmin — the period definition (FY start /
//                      calendar / custom label) and the ratio-rule X%
//   Vision             superadmin, or a site admin for their site — the
//                      vision statement per company / site / department,
//                      shown as the band across the priorities matrix
//
// Owners are NOT here: the org editor's owners (Organisation tab) are the
// one source of truth for who governs an org (Ben, 2026-08-19).
//
// Lazy chunk (dynamic import from settings.ts); the settings screen's
// dirty/save contract.

import { el, clear } from "../../../shared/ui/dom";
import { settingsSection } from "../settingsSection";
import type { RosterPerson } from "../store/mappers";
import {
  companies,
  orgJson,
  prioritySettingsJson,
  savePrioritySettingsJson,
} from "../store/config";
import { deletePillar, listPillars, loadCascade, savePillar } from "../store/priorities";
import { promptChoice, promptConfirm } from "../prompts";
import {
  DEFAULT_PRIORITY_SETTINGS,
  parsePrioritySettings,
  periodFor,
  Pillar,
  serializePrioritySettings,
  periodsOnOffer,
  prevPeriod,
  comparePeriods,
  pillarUse,
  spanLiveIn,
} from "./model";
import { newId, todayIso } from "../../../shared/schema/id";

interface DirtyCtx {
  markDirty: () => void;
  markClean: () => void;
  registerSave: (fn: () => Promise<void>) => void;
  isDirty: () => boolean;
  saveCurrent: () => Promise<void>;
}



function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const f = el("div", "app-field");
  f.append(el("span", "app-field-label", label), control);
  if (hint) f.appendChild(el("span", "app-field-hint", hint));
  return f;
}

// the ONE section head (ui-standard §6) — the strip reads it
const sectionTitle = (text: string, note?: string): HTMLElement => settingsSection(text, note);

export async function renderPrioritiesSettings(
  body: HTMLElement,
  me: RosterPerson,
  ctx: DirtyCtx
): Promise<void> {
  clear(body);
  const isSuper = me.role === "superadmin";
  const saves: (() => Promise<void>)[] = [];
  ctx.registerSave(async () => {
    for (const fn of saves) await fn();
    ctx.markClean();
    await renderPrioritiesSettings(body, me, ctx);
  });

  // vision statements are edited where they are read — the band's ⋮ on
  // the Priorities tab (Ben, 2026-10-08; the settings list was removed)
  if (isSuper) {
    await renderPillars(body, ctx, saves);
    await renderPeriod(body, ctx, saves);
  }
}

async function renderPillars(body: HTMLElement, ctx: DirtyCtx, saves: (() => Promise<void>)[]) {
  const box = sectionTitle(
    "Strategic pillars",
    "Pillars appear as filter chips above the priorities matrix; their sub-pillars are the matrix columns. Company-wide; typically change every few years. Order here is the order on screen. From / to set the periods a pillar is in force — the year picker shows the pillars live in the viewed year, so a strategy refresh adds the new ones and ends the old without losing either."
  );
  body.appendChild(box);
  const companyList = await companies();
  const pillars = await listPillars();
  // the periods a from / to select offers: three back from today's, through
  // to the next, plus whatever the pillars already hold
  const periodSettings = parsePrioritySettings(await prioritySettingsJson()).period;
  const periodChoices = (): string[] => {
    const cur = periodFor(periodSettings, todayIso()) || periodSettings.currentPeriod;
    const back: string[] = [];
    let b = cur;
    for (let n = 0; n < 3; n++) {
      b = prevPeriod(periodSettings, b);
      if (b === "") break;
      back.push(b);
    }
    return periodsOnOffer(periodSettings, cur, [...back.map((x) => ({ start: x, end: "" })), ...pillars.map((p) => ({ start: p.fromPeriod, end: p.toPeriod }))]);
  };
  const removed: Pillar[] = [];
  let dirtyPillars = false;

  // ---- the year in view (issue 4, 2026-11-16) --------------------------
  // A year keeps its own set: the list shows the pillars in force in the
  // chosen year; what is added here starts that year; a rename or a move
  // can apply from that year on; and a pillar priorities sit under is
  // ended, never deleted. The spans already did this — as two small
  // selects per row nobody found.
  const currentPeriod = periodFor(periodSettings, todayIso()) || periodSettings.currentPeriod;
  let lens = currentPeriod;
  let showOthers = false;
  const inLens = (p: Pillar): boolean => lens === "" || spanLiveIn(periodSettings, { start: p.fromPeriod, end: p.toPeriod }, lens);
  /** In force before the year in view: it has earlier years to keep. */
  const hasEarlier = (p: Pillar): boolean => lens !== "" && p.rowId !== undefined && (p.fromPeriod === "" || comparePeriods(periodSettings, p.fromPeriod, lens) < 0) && prevPeriod(periodSettings, lens) !== "";
  const savedNames = new Map(pillars.map((p) => [p.id, p.name]));
  // the priorities that sit under each pillar, in any year (a failed read
  // counts none — the guard then never blocks a delete it cannot justify)
  const priorities = await loadCascade("")
    .then((d) => d.priorities)
    .catch(() => []);
  const useOf = (p: Pillar): number => pillarUse(p.id, priorities) + (p.level === 1 ? pillars.filter((c) => c.parentId === p.id).reduce((n, c) => n + pillarUse(c.id, priorities), 0) : 0);

  const lensRow = el("div", "app-pr-row app-pr-lens");
  lensRow.appendChild(el("span", "app-pr-floor-site", "Year in view"));
  const lensSel = el("select", "app-input app-pr-short") as HTMLSelectElement;
  const paintLens = () => {
    clear(lensSel);
    for (const per of periodChoices()) {
      const o = el("option", "", per === currentPeriod ? `${per} (this year)` : per) as HTMLOptionElement;
      o.value = per;
      lensSel.appendChild(o);
    }
    const all = el("option", "", "All years") as HTMLOptionElement;
    all.value = "";
    lensSel.appendChild(all);
    lensSel.value = lens;
  };
  lensSel.addEventListener("change", () => {
    lens = lensSel.value;
    showOthers = false;
    paint();
  });
  lensRow.appendChild(lensSel);
  const lensNote = el("span", "app-settings-note app-pr-lensnote");
  lensRow.appendChild(lensNote);
  box.appendChild(lensRow);

  const list = el("div", "app-pr-pillars");
  box.appendChild(list);

  /** `p` continues from the year in view as a NEW row with `changes`;
   *  the old row ends the year before and keeps its years as they were.
   *  A pillar takes its live sub-pillars with it (each succeeds its own). */
  const succeed = (p: Pillar, changes: Partial<Pillar>): Pillar => {
    const before = prevPeriod(periodSettings, lens);
    const next: Pillar = { ...p, ...changes, rowId: undefined, id: newId("pl"), fromPeriod: lens, toPeriod: p.toPeriod, succeedsId: p.id };
    const kids = p.level === 1 ? pillars.filter((c) => c.level === 2 && c.parentId === p.id && inLens(c)) : [];
    p.toPeriod = before;
    pillars.push(next);
    for (const c of kids) {
      pillars.push({ ...c, rowId: undefined, id: newId("pl"), parentId: next.id, company: next.company, fromPeriod: lens, toPeriod: c.toPeriod, succeedsId: c.id });
      c.toPeriod = before;
    }
    return next;
  };

  const l1sOrdered = () =>
    pillars.filter((p) => p.level === 1).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const childrenOf = (l1: Pillar) =>
    pillars.filter((p) => p.level === 2 && p.parentId === l1.id).sort((a, b) => a.order - b.order);
  /** Renumber a sibling set 1..n after a move/add/remove. */
  const renumber = (siblings: Pillar[]) => siblings.forEach((p, i) => (p.order = i + 1));
  const touch = () => {
    dirtyPillars = true;
    ctx.markDirty();
  };

  const move = (p: Pillar, siblings: Pillar[], delta: -1 | 1) => {
    const i = siblings.indexOf(p);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
    renumber(siblings);
    touch();
    paint();
  };

  const paint = () => {
    clear(list);
    paintLens();
    lensNote.textContent =
      lens === ""
        ? "Every pillar, whatever years it covers."
        : `The pillars in force in ${lens}. What you add here starts in ${lens}; renaming or moving one asks whether it applies from ${lens} or to every year.`;
    const l1s = l1sOrdered().filter(inLens);
    if (l1s.length === 0) {
      list.appendChild(el("div", "app-settings-note", pillars.length === 0 ? "No pillars yet — add one to start." : `No pillars are in force in ${lens}.`));
    }
    for (const l1 of l1s) {
      list.appendChild(pillarRow(l1, null, l1s));
      const children = childrenOf(l1).filter(inLens);
      if (l1.name.trim() === "" && children.length > 0) {
        // a nameless pillar is never saved — and neither are its sub-pillars
        // (an orphan reached Dataverse this way once, 2026-10-08)
        list.appendChild(el("div", "app-settings-note app-pr-warn", "Name this pillar — its sub-pillars are not saved until it has a name."));
      }
      for (const c of children) list.appendChild(pillarRow(c, l1, children));
      const addSub = el("button", "app-pr-addlink", "＋ Add sub-pillar") as HTMLButtonElement;
      addSub.type = "button";
      addSub.addEventListener("click", () => {
        pillars.push({
          id: newId("pl"),
          name: "",
          level: 2,
          parentId: l1.id,
          color: l1.color,
          order: children.length + 1,
          active: true,
          company: l1.company,
          // added in a year's view: it starts that year, and does not
          // appear on the years before
          fromPeriod: lens !== "" ? lens : l1.fromPeriod,
          toPeriod: l1.toPeriod,
        });
        touch();
        paint();
        const rows = list.querySelectorAll<HTMLInputElement>(".app-pr-pillar-l2 input[type=text]");
        rows[rows.length - 1]?.focus();
      });
      list.appendChild(addSub);
    }
    // orphans (2026-10-08): sub-pillars whose pillar is gone from the list
    // — shown here so they can be moved under a pillar or removed, rather
    // than sitting under the matrix's "—" span
    const everyL1 = l1sOrdered();
    const orphans = pillars.filter((p) => p.level === 2 && !everyL1.some((l) => l.id === p.parentId));
    if (orphans.length > 0) {
      list.appendChild(el("div", "app-pr-orgname", "Sub-pillars without a pillar"));
      list.appendChild(el("div", "app-settings-note", "Their pillar no longer exists. Move each under a pillar, or remove it."));
      for (const o of orphans) {
        const row = el("div", "app-pr-row app-pr-orphan");
        row.appendChild(el("span", "app-pr-floor-site", o.name.trim() !== "" ? o.name : "(unnamed)"));
        const sel = el("select", "app-input app-pr-short") as HTMLSelectElement;
        const none = el("option", "", "Move under…") as HTMLOptionElement;
        none.value = "";
        sel.appendChild(none);
        for (const l1 of l1s) {
          const opt = el("option", "", l1.name.trim() !== "" ? l1.name : "(unnamed pillar)") as HTMLOptionElement;
          opt.value = l1.id;
          sel.appendChild(opt);
        }
        sel.addEventListener("change", () => {
          const target = l1s.find((l) => l.id === sel.value);
          if (!target) return;
          o.parentId = target.id;
          o.company = target.company;
          o.order = childrenOf(target).length;
          touch();
          paint();
        });
        const x = el("button", "app-btn app-palette-x", "×") as HTMLButtonElement;
        x.type = "button";
        x.title = "Remove this sub-pillar";
        x.addEventListener("click", () => {
          const i = pillars.indexOf(o);
          if (i >= 0) pillars.splice(i, 1);
          if (o.rowId) removed.push(o);
          touch();
          paint();
        });
        row.append(sel, x);
        list.appendChild(row);
      }
    }
    const addL1 = el("button", "app-btn", "＋ Add pillar") as HTMLButtonElement;
    addL1.type = "button";
    addL1.addEventListener("click", () => {
      pillars.push({
        id: newId("pl"),
        name: "",
        level: 1,
        parentId: "",
        color: "#2563eb",
        order: l1s.length + 1,
        active: true,
        company: companyList[0] ?? "",
        fromPeriod: lens,
        toPeriod: "",
      });
      touch();
      paint();
      const rows = list.querySelectorAll<HTMLInputElement>(".app-pr-pillar:not(.app-pr-pillar-l2) input[type=text]");
      rows[rows.length - 1]?.focus();
    });
    list.appendChild(addL1);
    // the rest of the record: pillars that ended before the year in view
    // or start after it
    const others = pillars.filter((p) => !inLens(p) && (p.level === 1 || everyL1.some((l) => l.id === p.parentId)));
    if (lens !== "" && others.length > 0) {
      const toggle = el("button", "app-pr-addlink", `${showOthers ? "▾" : "▸"} Other years · ${others.length}`) as HTMLButtonElement;
      toggle.type = "button";
      toggle.title = `Pillars and sub-pillars not in force in ${lens}`;
      toggle.addEventListener("click", () => {
        showOthers = !showOthers;
        paint();
      });
      list.appendChild(toggle);
      if (showOthers) {
        const sorted = [...others].sort((a, b) => a.level - b.level || a.order - b.order || a.name.localeCompare(b.name));
        for (const o of sorted) {
          const parent = o.level === 2 ? (everyL1.find((l) => l.id === o.parentId) ?? null) : null;
          list.appendChild(pillarRow(o, parent, [o]));
        }
      }
    }
  };

  const pillarRow = (p: Pillar, parent: Pillar | null, siblings: Pillar[]): HTMLElement => {
    const row = el("div", "app-pr-pillar" + (parent ? " app-pr-pillar-l2" : ""));
    const arrows = el("span", "app-pr-arrows");
    const up = el("button", "app-pr-arrow", "▲") as HTMLButtonElement;
    up.type = "button";
    up.title = "Move up";
    up.disabled = siblings.indexOf(p) === 0;
    up.addEventListener("click", () => move(p, siblings, -1));
    const down = el("button", "app-pr-arrow", "▼") as HTMLButtonElement;
    down.type = "button";
    down.title = "Move down";
    down.disabled = siblings.indexOf(p) === siblings.length - 1;
    down.addEventListener("click", () => move(p, siblings, 1));
    arrows.append(up, down);

    const swatch = el("input", "app-palette-swatch") as HTMLInputElement;
    swatch.type = "color";
    swatch.value = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : "#2563eb";
    swatch.addEventListener("input", () => {
      p.color = swatch.value;
      touch();
    });
    const name = el("input", "app-input") as HTMLInputElement;
    name.type = "text";
    name.value = p.name;
    name.placeholder = parent ? "Sub-pillar" : "Pillar";
    name.addEventListener("input", () => {
      p.name = name.value;
      touch();
    });
    // a rename of a pillar that was in force in earlier years: from the
    // year in view (the earlier years keep the old name), or everywhere?
    name.addEventListener("change", () => {
      const was = savedNames.get(p.id) ?? "";
      const now = name.value.trim();
      if (!hasEarlier(p) || was === "" || now === "" || now === was) return;
      void promptChoice({
        title: `Rename to “${now}” from ${lens}, or for every year?`,
        note: `“${was}” was in force before ${lens}. “From ${lens}” keeps the old name on the earlier years, as a record${p.level === 1 ? " — its sub-pillars continue under the new name" : ""}; priorities under it follow. “Every year” corrects the name wherever it shows.`,
        choices: [
          { key: "all", label: "Every year" },
          { key: "from", label: `From ${lens}`, primary: true },
        ],
      }).then((how) => {
        if (how === null) {
          p.name = was;
        } else if (how === "from") {
          p.name = was;
          succeed(p, { name: now });
        } else {
          savedNames.set(p.id, now);
        }
        touch();
        paint();
      });
    });
    const active = el("label", "app-check") as HTMLLabelElement;
    const box = el("input") as HTMLInputElement;
    box.type = "checkbox";
    box.checked = p.active;
    box.addEventListener("change", () => {
      p.active = box.checked;
      touch();
    });
    active.append(box, document.createTextNode(" Active"));
    const span = (key: "fromPeriod" | "toPeriod", blank: string): HTMLSelectElement => {
      const sel = el("select", "app-input app-pr-span") as HTMLSelectElement;
      sel.title = key === "fromPeriod" ? "In force from this period (blank = always)" : "In force up to this period (blank = still in force)";
      const none = el("option", "", blank) as HTMLOptionElement;
      none.value = "";
      sel.appendChild(none);
      for (const per of periodChoices()) {
        const o = el("option", "", per) as HTMLOptionElement;
        o.value = per;
        if (per === p[key]) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener("change", () => {
        p[key] = sel.value;
        touch();
      });
      return sel;
    };
    const from = span("fromPeriod", "From: always");
    const to = span("toPeriod", "To: open");
    // a sub-pillar can sit under another pillar — from the year in view
    // (the earlier years keep it where it was), or for every year
    let under: HTMLSelectElement | null = null;
    if (parent) {
      const tops = l1sOrdered().filter((l) => inLens(l) || l.id === p.parentId);
      if (tops.length > 1) {
        const sel = el("select", "app-input app-pr-short app-pr-under") as HTMLSelectElement;
        sel.title = "The pillar this sub-pillar sits under";
        for (const l of tops) {
          const o = el("option", "", `Under: ${l.name.trim() !== "" ? l.name : "(unnamed pillar)"}`) as HTMLOptionElement;
          o.value = l.id;
          sel.appendChild(o);
        }
        sel.value = p.parentId;
        sel.addEventListener("change", () => {
          const target = tops.find((l) => l.id === sel.value);
          if (!target || target.id === p.parentId) return;
          const apply = (how: "from" | "all") => {
            if (how === "from") succeed(p, { parentId: target.id, company: target.company, order: childrenOf(target).length + 1 });
            else {
              p.parentId = target.id;
              p.company = target.company;
              p.order = childrenOf(target).length + 1;
            }
            touch();
            paint();
          };
          if (!hasEarlier(p)) return apply("all");
          void promptChoice({
            title: `Move “${p.name}” under “${target.name}” from ${lens}, or for every year?`,
            note: `It sat under “${parent.name}” before ${lens}. “From ${lens}” keeps it there on the earlier years, as a record; priorities under it follow. “Every year” moves it wherever it shows.`,
            choices: [
              { key: "all", label: "Every year" },
              { key: "from", label: `From ${lens}`, primary: true },
            ],
          }).then((how) => {
            if (how === null) sel.value = p.parentId;
            else apply(how);
          });
        });
        under = sel;
      }
    }
    const x = el("button", "app-btn app-palette-x", "×") as HTMLButtonElement;
    x.type = "button";
    const uses = p.rowId ? useOf(p) : 0;
    x.title = uses > 0 ? `${uses} priorit${uses === 1 ? "y sits" : "ies sit"} under it — it is ended, not deleted` : parent ? "Remove sub-pillar" : "Remove pillar (and its sub-pillars)";
    x.addEventListener("click", () => {
      if (uses > 0) {
        // priorities sit under it (now or in an earlier year): ending it
        // keeps their place on the years it covered; deleting would not
        const year = lens !== "" ? lens : currentPeriod;
        const before = prevPeriod(periodSettings, year);
        if (before === "") {
          void promptConfirm({ title: `“${p.name}” cannot be removed`, note: `${uses} priorit${uses === 1 ? "y sits" : "ies sit"} under it and there is no earlier year to end it after. Move those priorities to another sub-pillar first.`, confirmLabel: "OK" });
          return;
        }
        void promptConfirm({
          title: `End “${p.name}” after ${before}?`,
          note: `${uses} priorit${uses === 1 ? "y sits" : "ies sit"} under it, so it is ended rather than deleted: it leaves ${year} and the years after, and the earlier years keep it as a record.${parent ? "" : " Its sub-pillars end with it."} Priorities still under it in ${year} will show as needing a sub-pillar.`,
          confirmLabel: `End after ${before}`,
        }).then((ok) => {
          if (!ok) return;
          for (const d of parent ? [p] : [p, ...pillars.filter((c) => c.parentId === p.id)]) {
            if (d.toPeriod === "" || comparePeriods(periodSettings, d.toPeriod, before) > 0) d.toPeriod = before;
          }
          touch();
          paint();
        });
        return;
      }
      const doomed = parent ? [p] : [p, ...childrenOf(p)];
      for (const d of doomed) {
        const i = pillars.indexOf(d);
        if (i >= 0) pillars.splice(i, 1);
        if (d.rowId) removed.push(d);
      }
      renumber(parent ? childrenOf(parent) : l1sOrdered());
      touch();
      paint();
    });
    if (companyList.length > 1 && !parent) {
      const co = el("select", "app-input app-pr-co") as HTMLSelectElement;
      for (const c of companyList) {
        const o = el("option", "", c) as HTMLOptionElement;
        o.value = c;
        if (c === p.company) o.selected = true;
        co.appendChild(o);
      }
      co.addEventListener("change", () => {
        p.company = co.value;
        for (const c of pillars) if (c.parentId === p.id) c.company = co.value;
        touch();
      });
      row.append(arrows, swatch, name, co, from, to, active, x);
    } else if (under) {
      row.append(arrows, swatch, name, under, from, to, active, x);
    } else {
      row.append(arrows, swatch, name, from, to, active, x);
    }
    return row;
  };
  paint();

  saves.push(async () => {
    if (!dirtyPillars) return;
    // parents first so children can bind to their row GUIDs
    const savedL1 = new Set<string>();
    for (const p of pillars.filter((p) => p.level === 1)) {
      if (p.name.trim() === "") continue;
      p.rowId = await savePillar(p, pillars);
      savedL1.add(p.id);
    }
    for (const p of pillars.filter((p) => p.level === 2)) {
      // never a sub-pillar whose pillar was not saved (the orphan road)
      if (p.name.trim() === "" || !savedL1.has(p.parentId)) continue;
      p.rowId = await savePillar(p, pillars);
    }
    for (const d of removed) if (d.rowId) await deletePillar(d.rowId);
    for (const p of pillars) savedNames.set(p.id, p.name);
    dirtyPillars = false;
  });
}

// ---- period + roll-up ratio -------------------------------------------------

async function renderPeriod(body: HTMLElement, ctx: DirtyCtx, saves: (() => Promise<void>)[]) {
  const box = sectionTitle(
    "Period & roll-up rule",
    "A priority runs from a start period until it closes; the year picker on the views shows what was live in that year and defaults to the current one. The ratio rule turns a priority red when more than X% of its initiatives are red (the strict rule — any red — is the other toggle on the view)."
  );
  body.appendChild(box);
  const s = parsePrioritySettings(await prioritySettingsJson());
  let dirty = false;

  const mode = el("select", "app-input") as HTMLSelectElement;
  for (const [v, l] of [
    ["fy", "Financial year"],
    ["calendar", "Calendar year"],
    ["custom", "Custom label"],
  ] as const) {
    const o = el("option", "", l) as HTMLOptionElement;
    o.value = v;
    if (v === s.period.mode) o.selected = true;
    mode.appendChild(o);
  }
  const start = el("select", "app-input") as HTMLSelectElement;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  MONTHS.forEach((m, i) => {
    const o = el("option", "", m) as HTMLOptionElement;
    o.value = String(i + 1);
    if (i + 1 === s.period.startMonth) o.selected = true;
    start.appendChild(o);
  });
  const prefix = el("input", "app-input app-pr-short") as HTMLInputElement;
  prefix.value = s.period.prefix;
  prefix.placeholder = "FY";
  const custom = el("input", "app-input app-pr-short") as HTMLInputElement;
  custom.value = s.period.currentPeriod;
  custom.placeholder = "e.g. H2 2026";
  // custom labels have no natural order — the list IS the order (spans
  // compare by it, 2026-10-02)
  const labels = el("textarea", "app-input") as HTMLTextAreaElement;
  labels.rows = 4;
  labels.value = s.period.labels.join("\n");
  labels.placeholder = "H1 2026\nH2 2026\nH1 2027";
  const ratio = el("input", "app-input app-pr-short") as HTMLInputElement;
  ratio.type = "number";
  ratio.min = "0";
  ratio.max = "100";
  ratio.value = String(s.ragRatioPct);
  const preview = el("span", "app-field-hint", "");

  const sync = () => {
    s.period.mode = mode.value === "calendar" || mode.value === "custom" ? mode.value : "fy";
    s.period.startMonth = Number(start.value) || 7;
    s.period.prefix = prefix.value;
    s.period.currentPeriod = custom.value;
    s.period.labels = labels.value.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");
    s.ragRatioPct = Math.max(0, Math.min(100, Number(ratio.value) || 0));
    startField.style.display = s.period.mode === "fy" ? "" : "none";
    customField.style.display = s.period.mode === "custom" ? "" : "none";
    labelsField.style.display = s.period.mode === "custom" ? "" : "none";
    prefixField.style.display = s.period.mode === "custom" ? "none" : "";
    preview.textContent = `Today falls in “${periodFor(s.period, todayIso())}”`;
  };
  for (const c of [mode, start, prefix, custom, labels, ratio]) {
    c.addEventListener("input", () => {
      sync();
      dirty = true;
      ctx.markDirty();
    });
    c.addEventListener("change", () => {
      sync();
      dirty = true;
      ctx.markDirty();
    });
  }
  const startField = field("Financial year starts in", start);
  const prefixField = field("Label prefix", prefix, "FY → “FY26”; blank → “2026”");
  const customField = field("Current period label", custom);
  const labelsField = field("Period labels, in order", labels, "One per line, earliest first — the picker and every span follow this order.");
  const row = el("div", "app-settings-row");
  row.append(field("Period", mode), startField, prefixField, customField, preview);
  box.appendChild(row);
  box.appendChild(labelsField);
  box.appendChild(field("Ratio rule — red above (%)", ratio, `Default ${DEFAULT_PRIORITY_SETTINGS.ragRatioPct}%.`));
  sync();

  saves.push(async () => {
    if (!dirty) return;
    await savePrioritySettingsJson(serializePrioritySettings(s));
    dirty = false;
  });
}

// ---- vision per company / site / department ---------------------------------
