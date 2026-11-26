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
  appPalettes,
  companies,
  orgJson,
  prioritySettingsJson,
  savePrioritySettingsJson,
} from "../store/config";
import { deletePillar, listPillars, loadCascade, savePillar } from "../store/priorities";
import { DEFAULT_STATUS_SETTINGS, parseStatusSettings, STATE_LABELS, StatusState } from "../improvement/status";
import { promptConfirm } from "../prompts";
import {
  parsePrioritySettings,
  periodFor,
  Pillar,
  serializePrioritySettings,
  periodsOnOffer,
  prevPeriod,
  comparePeriods,
  pillarUse,
  spanLiveIn,
  nextPeriod,
  parseTopicMap,
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
    await renderPillars(body, ctx, saves, () => renderPrioritiesSettings(body, me, ctx));
    await renderPeriod(body, ctx, saves);
  }
}

async function renderPillars(body: HTMLElement, ctx: DirtyCtx, saves: (() => Promise<void>)[], rerender: () => Promise<void>) {
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
    const cur = periodFor(periodSettings, todayIso());
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
  const currentPeriod = periodFor(periodSettings, todayIso());
  let lens = currentPeriod;
  let showOthers = false;
  const inLens = (p: Pillar): boolean => lens === "" || spanLiveIn(periodSettings, { start: p.fromPeriod, end: p.toPeriod }, lens);
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
  // the change between two years is made in ONE place (issue review
  // 2026-11-25, report 1): the year in view, into the next
  const changeBtn = el("button", "app-btn app-pr-yearchange", "") as HTMLButtonElement;
  changeBtn.type = "button";
  changeBtn.addEventListener("click", () => {
    const to = nextPeriod(periodSettings, lens);
    if (lens === "" || to === "") return;
    if (ctx.isDirty()) {
      void promptConfirm({ title: "Save or discard your changes first", note: `The change from ${lens} to ${to} is worked out from what is saved.`, confirmLabel: "Close", hideCancel: true });
      return;
    }
    void import("./yearChangePanel").then(({ openYearChange }) =>
      openYearChange({
        settings: periodSettings,
        pillars,
        priorities,
        companies: companyList.length > 0 ? companyList : [...new Set(pillars.map((p) => p.company))],
        from: lens,
        to,
        currentPeriod,
        mintId: () => newId("pl"),
        rotatingCards: async () => {
          const [{ listBoards }, { parseManifest }] = await Promise.all([import("../store/boards"), import("../store/mappers")]);
          const out: { board: string; ids: string[] }[] = [];
          for (const b of await listBoards()) {
            for (const slot of parseManifest(b.manifestRaw).slots) {
              const raw = (slot.settings as Record<string, unknown> | undefined)?.prTopicMap;
              if (typeof raw !== "string" || raw === "") continue;
              const ids = [...new Set(Object.values(parseTopicMap(raw)).flat())];
              if (ids.length > 0) out.push({ board: b.name, ids });
            }
          }
          return out;
        },
        save: savePillar,
        remove: deletePillar,
        reload: async () => ({ pillars: await listPillars(), priorities: await loadCascade("").then((d) => d.priorities) }),
        onSaved: () => void rerender(),
      })
    );
  });
  lensRow.appendChild(changeBtn);
  const lensNote = el("span", "app-settings-note app-pr-lensnote");
  lensRow.appendChild(lensNote);
  box.appendChild(lensRow);

  const list = el("div", "app-pr-pillars");
  box.appendChild(list);


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

  /** The cursor goes to the row just added — found by WHICH pillar it
   *  is, never by its position: the last box in the list can be a row of
   *  another pillar, or of another year (report 2, 2026-11-25). */
  const focusRow = (id: string) => {
    for (const row of Array.from(list.querySelectorAll<HTMLElement>(".app-pr-pillar"))) {
      if (row.dataset.pillarId === id) {
        row.querySelector<HTMLInputElement>("input[type=text]")?.focus();
        return;
      }
    }
  };

  const paint = () => {
    clear(list);
    paintLens();
    lensNote.textContent =
      lens === ""
        ? "Every pillar, whatever years it covers."
        : `The pillars in force in ${lens}. What you add here starts in ${lens}.`;
    const toYear = lens !== "" ? nextPeriod(periodSettings, lens) : "";
    changeBtn.style.display = toYear !== "" ? "" : "none";
    changeBtn.textContent = `Change for ${toYear}…`;
    changeBtn.title = `What each pillar and sub-pillar of ${lens} becomes in ${toYear}: continues, becomes another, or ends`;
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
        focusRow(pillars[pillars.length - 1].id);
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
      focusRow(pillars[pillars.length - 1].id);
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
    row.dataset.pillarId = p.id;
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
    // (a rename here is the row's name for every year it covers; a new
    // name FROM a year is "Becomes" in the year-change panel)
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
          // for every year the row covers; a move FROM a year is made
          // in the year-change panel
          p.parentId = target.id;
          p.company = target.company;
          p.order = childrenOf(target).length + 1;
          touch();
          paint();
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
    dirtyPillars = false;
  });
}

// ---- period + roll-up ratio -------------------------------------------------

async function renderPeriod(body: HTMLElement, ctx: DirtyCtx, saves: (() => Promise<void>)[]) {
  const box = sectionTitle(
    "Period",
    "The period is the calendar year. A priority runs from a start year until it closes; the year picker on the views shows what was live in that year and defaults to the current one."
  );
  body.appendChild(box);
  const s = parsePrioritySettings(await prioritySettingsJson());
  let dirty = false;

  // Period (2026-11-24, Ben): calendar year is the only period, so
  // there is nothing to choose here — the mode, the start month, the
  // prefix and the custom label list are gone.
  // ---- Status (2026-11-17): the status rule's settings. The ratio
  // roll-up's percentage lived here until then.
  const recency = el("input", "app-input app-pr-short") as HTMLInputElement;
  recency.type = "number";
  recency.min = "1";
  recency.max = "365";
  recency.value = String(s.status.recencyDays);
  const stateEntries = await appPalettes().then((p) => p.states).catch(() => []);
  const colourPick = (state: StatusState): HTMLSelectElement => {
    const sel = el("select", "app-input") as HTMLSelectElement;
    const current = s.status.colours[state];
    if (!stateEntries.some((e) => e.key === current)) {
      const o = el("option", "", `Default ${STATE_LABELS[state].toLowerCase()} colour (not in the palette)`) as HTMLOptionElement;
      o.value = current;
      o.selected = true;
      sel.appendChild(o);
    }
    for (const e of stateEntries) {
      const o = el("option", "", e.label) as HTMLOptionElement;
      o.value = e.key;
      if (e.key === current) o.selected = true;
      sel.appendChild(o);
    }
    return sel;
  };
  const colourSels: Record<StatusState, HTMLSelectElement> = { good: colourPick("good"), flagged: colourPick("flagged"), bad: colourPick("bad") };
  const sync = () => {
    s.status = parseStatusSettings({
      recencyDays: Number(recency.value) || DEFAULT_STATUS_SETTINGS.recencyDays,
      colours: { good: colourSels.good.value, flagged: colourSels.flagged.value, bad: colourSels.bad.value },
    });
  };
  for (const c of [recency, colourSels.good, colourSels.flagged, colourSels.bad]) {
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
  const statusBox = sectionTitle(
    "Status",
    "An initiative is on track, off track or marked Support needed. It is off track with a late action or no actions at all, with any metric outside its limits or short of plan, or with no status update inside the window below. A new initiative has the same window before “no actions” and “no update” count. Flagged is its own state: the initiative's people have asked for support. A priority is flagged if any of its initiatives is, else off track if any is, else on track."
  );
  body.appendChild(statusBox);
  statusBox.appendChild(field("No status update for (days)", recency, `Default ${DEFAULT_STATUS_SETTINGS.recencyDays} days (5 weeks). The initiative board's “no update” notice uses the same number.`));
  const colourRow = el("div", "app-settings-row");
  colourRow.append(field("On track colour", colourSels.good), field("Support needed colour", colourSels.flagged), field("Off track colour", colourSels.bad));
  statusBox.appendChild(colourRow);
  statusBox.appendChild(el("div", "app-field-hint", "Colours are entries of the state palette (Settings → Branding). Add or recolour an entry there, then pick it here."));
  sync();

  saves.push(async () => {
    if (!dirty) return;
    await savePrioritySettingsJson(serializePrioritySettings(s));
    void import("../flagColour").then((m) => m.applyFlagColour()).catch(() => undefined);
    dirty = false;
  });
}

// ---- vision per company / site / department ---------------------------------
