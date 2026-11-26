// The priority popup's Objectives tab for a priority that has its ONE
// list of measures (2026-11-27, R5 of the 2026-11-25 round, report 20).
// The rules are measures.ts (pure, tested); this file draws the list —
// each measure, where it comes from, Move up / Move down / Remove —
// and "Add measure". The priority's OWN measures are still defined,
// filled in and charted by the editor that has done so since
// 2026-11-18 (ownMetricsTab.ts), mounted beneath the list.
//
// A referenced measure is never a copy: its readings are its
// initiative's, entered there. The row links to it.

import { clear, el } from "../../../shared/ui/dom";
import type { MetricValue } from "../improvement/metricValues";
import type { Initiative } from "../improvement/initiativeModel";
import { staleTag } from "../improvement/staleMark";
import { promptChoice, promptConfirm } from "../prompts";
import { GONE_WORDS, hasMeasure, measureRows, moveMeasure, roomFor, setMeasures, similarMetrics, syncOwn } from "./measures";
import { MEASURE_CAP, Measure, Priority, isOwnMeasure, ragPaletteKey } from "./model";

export interface MeasureChoice {
  initiativeId: string;
  title: string;
  inheritedFrom: string;
  metrics: { key: string; name: string; objective: string; plan: string; actual: string; rag: "green" | "amber" | "red" | null; stale?: string }[];
}

export interface MeasuresOpts {
  host: HTMLElement;
  /** The live priority; `measures` is defined. */
  priority: Priority;
  /** Manages the owning org: may change the list. */
  canManage: boolean;
  /** May define and fill in the priority's own measures. */
  canEditOwn: boolean;
  ownValues: () => MetricValue[];
  /** The metrics that can be referenced: the initiatives under the
   *  priority (and its child priorities) that carry any. */
  choices: () => MeasureChoice[];
  /** Every initiative under the priority, confidential ones included. */
  linkedIds: () => Set<string>;
  initiativeById: (id: string) => Initiative | null;
  palette: Record<string, string>;
  /** Write the priority, then repaint the screen behind. */
  save: () => Promise<void>;
  refreshOwn: () => Promise<void>;
  /** Open an initiative's board (the popup closes). */
  openInitiative: (boardId: string) => void;
}

const btn = (label: string, cls: string): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export function mountMeasures(o: MeasuresOpts): void {
  const p = o.priority;
  const list = (): Measure[] => p.measures ?? [];
  const err = el("div", "app-cp-err", "");
  const head = el("div", "app-ms-head");
  const rowsBox = el("div", "app-ms-rows");
  const addBox = el("div", "app-ms-add");
  const ownHead = el("div", "app-cp-ov-group");
  const ownHost = el("div", "app-cp-ov-ownmetrics");
  o.host.append(head, rowsBox, addBox, err, ownHead, ownHost);
  let adding = false;
  let busy = false;

  /** Put a new list on the priority and save it. */
  const commit = async (next: Measure[]) => {
    if (busy) return;
    busy = true;
    err.textContent = "";
    const was = list();
    setMeasures(p, next);
    try {
      await o.save();
    } catch (e) {
      setMeasures(p, was);
      err.textContent = "The measures could not be saved. Check the connection and try again.";
      console.warn("measures: save failed", e);
    }
    busy = false;
    if (o.host.isConnected) paint();
  };

  const closeMenus = () => rowsBox.querySelectorAll(".app-ms-menu").forEach((m) => m.remove());
  document.addEventListener("pointerdown", (e) => {
    if (!(e.target instanceof Element) || e.target.closest(".app-ms-menu, .app-ms-kebab") === null) closeMenus();
  });

  const paint = () => {
    const measures = list();
    const room = roomFor(measures);
    // ---- the head: the count and the one way to add --------------------
    clear(head);
    head.appendChild(el("span", "app-ms-title", "Measures"));
    head.appendChild(el("span", "app-ms-count", `${measures.length} of ${MEASURE_CAP}`));
    if (o.canManage) {
      const add = btn("Add measure", "app-btn");
      add.disabled = room === 0;
      add.title = room === 0 ? `A priority holds at most ${MEASURE_CAP} measures. Remove one to add another.` : "";
      add.addEventListener("click", () => {
        adding = !adding;
        paintAdd();
      });
      head.appendChild(add);
    }
    // ---- the list ---------------------------------------------------------
    clear(rowsBox);
    if (measures.length === 0) rowsBox.appendChild(el("div", "app-cp-muted", "No measure set"));
    const own = o.ownValues();
    const choices = o.choices();
    const linked = o.linkedIds();
    const rows = measureRows(
      measures,
      (key) => (p.ownMetrics ?? []).find((m) => m.key === key)?.name ?? null,
      (id) => {
        const i = o.initiativeById(id);
        if (i === null && !linked.has(id)) return null;
        return {
          title: i?.title ?? choices.find((c) => c.initiativeId === id)?.title ?? "An initiative",
          linked: linked.has(id),
          metricName: (key) => i?.metrics.find((m) => m.key === key)?.name ?? choices.find((c) => c.initiativeId === id)?.metrics.find((m) => m.key === key)?.name ?? null,
        };
      }
    );
    rows.forEach((r, index) => {
      const row = el("div", `app-cp-ov-objrow app-ms-row${r.state !== "ok" ? " app-ms-row-gone" : ""}${index >= MEASURE_CAP ? " app-ms-row-over" : ""}`);
      const m = r.measure;
      const ownV = isOwnMeasure(m) ? own.find((v) => v.key === m.own) : undefined;
      const refV = !isOwnMeasure(m) ? choices.find((c) => c.initiativeId === m.initiativeId)?.metrics.find((x) => x.key === m.metricKey) : undefined;
      const rag = ownV?.rag ?? refV?.rag ?? null;
      const light = el("span", "app-cp-objective-light");
      light.style.background = rag ? (o.palette[ragPaletteKey(rag)] ?? "#9a948a") : "#d9d3c8";
      const text = el("span", "app-cp-ov-objtext");
      const objective = isOwnMeasure(m) ? ((p.ownMetrics ?? []).find((x) => x.key === m.own)?.objective ?? "") : (refV?.objective ?? "");
      text.appendChild(el("span", "app-cp-ov-objname", objective !== "" ? `${r.name}: ${objective}` : r.name));
      if (r.state !== "ok") {
        text.appendChild(el("span", "app-ms-gone", `${GONE_WORDS[r.state]} (${r.source})`));
      } else {
        const plan = ownV ? (ownV.target !== null ? `${ownV.target}${ownV.unit}` : "") : (refV?.plan ?? "");
        const actual = ownV ? ownV.display : (refV?.actual ?? "");
        text.appendChild(el("span", "app-cp-ov-objnums", `Plan ${plan !== "" ? plan : "—"} · Actual ${actual !== "" ? actual : "—"}`));
        const stale = ownV?.stale ?? refV?.stale ?? "";
        if (stale !== "") text.appendChild(staleTag(stale, "app-cp-ov-objstale"));
      }
      // where it comes from: a referenced measure's readings are its
      // initiative's, entered there
      const src = el("span", "app-ms-source");
      const init = !isOwnMeasure(m) ? o.initiativeById(m.initiativeId) : null;
      if (r.kind === "ref" && r.state === "ok" && init !== null) {
        const open = btn(`${r.source} ↗`, "app-link");
        open.title = "Its readings are entered on this initiative. Open it.";
        open.addEventListener("click", () => o.openInitiative(init.boardId));
        src.appendChild(open);
      } else if (r.state === "ok") src.textContent = r.source;
      row.append(light, text, src);
      if (index === MEASURE_CAP) row.title = `Over the limit of ${MEASURE_CAP}: this one and those below it do not show on the tile.`;
      if (o.canManage) {
        const kebab = btn("⋮", "app-cp-kebab app-ms-kebab");
        kebab.title = "Move up · Move down · Remove";
        kebab.setAttribute("aria-label", `More for ${r.name}`);
        kebab.addEventListener("click", (e) => {
          e.stopPropagation();
          const open = row.querySelector(".app-ms-menu") !== null;
          closeMenus();
          if (open) return;
          const menu = el("div", "app-ms-menu");
          const item = (label: string, enabled: boolean, act: () => void) => {
            const b = btn(label, "app-ms-menuitem");
            b.disabled = !enabled || busy;
            b.addEventListener("click", () => {
              closeMenus();
              act();
            });
            menu.appendChild(b);
          };
          item("Move up", index > 0, () => void commit(moveMeasure(measures, index, -1)));
          item("Move down", index < measures.length - 1, () => void commit(moveMeasure(measures, index, 1)));
          item("Remove", true, () => void remove(index, r.name, r.kind));
          row.appendChild(menu);
        });
        row.appendChild(kebab);
      }
      rowsBox.appendChild(row);
    });
    if (measures.length > MEASURE_CAP) {
      rowsBox.appendChild(el("div", "app-ms-over", `This priority has ${measures.length} measures from before the limit of ${MEASURE_CAP}. The tile shows the first ${MEASURE_CAP}. None can be added until it is trimmed.`));
    }
    paintAdd();
    // the own editor's adders open and close with the room left
    ownEditor?.refresh();
  };

  /** Remove one measure. A reference just leaves the list; an own
   *  measure is deleted with its readings — in the editor below, which
   *  asks with the count. */
  const remove = async (index: number, name: string, kind: "own" | "ref") => {
    if (kind === "own") {
      // an own measure is deleted with its readings: the editor below
      // does that, asking first with the number of readings — this is
      // its own ×, pressed for the person
      const m = list()[index];
      const at = isOwnMeasure(m) ? (p.ownMetrics ?? []).findIndex((x) => x.key === m.own) : -1;
      const x = Array.from(ownHost.querySelectorAll<HTMLButtonElement>(".app-im-metricslist .app-im-link-x"))[at];
      if (x) x.click();
      else {
        await promptConfirm({ title: `Remove “${name}” below`, note: "It is this priority's own measure: use the × on its row under “This priority's own measures”.", confirmLabel: "OK", hideCancel: true });
        ownHost.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      return;
    }
    await commit(list().filter((_, i) => i !== index));
  };

  // ---- Add measure: from an initiative, or new on this priority ----------
  const paintAdd = () => {
    clear(addBox);
    if (!adding || !o.canManage || roomFor(list()) === 0) {
      adding = false;
      return;
    }
    const measures = list();
    const choices = o.choices();
    addBox.appendChild(el("div", "app-cp-ov-group", "From an initiative"));
    if (choices.length === 0) addBox.appendChild(el("div", "app-cp-muted", "None of this priority's initiatives carries a metric yet."));
    for (const c of choices) {
      addBox.appendChild(el("div", "app-ms-choicehead", c.inheritedFrom !== "" ? `${c.title} · via ${c.inheritedFrom}` : c.title));
      for (const m of c.metrics) {
        const taken = hasMeasure(measures, { initiativeId: c.initiativeId, metricKey: m.key });
        const pick = btn(m.objective !== "" ? `${m.name}: ${m.objective}` : m.name, "app-ms-choice");
        pick.disabled = taken || busy;
        pick.title = taken ? "Already a measure of this priority" : "Add as a measure. Its readings stay on the initiative.";
        pick.addEventListener("click", () => {
          adding = false;
          void commit([...list(), { initiativeId: c.initiativeId, metricKey: m.key }]);
        });
        addBox.appendChild(pick);
      }
    }
    if (o.canEditOwn) {
      addBox.appendChild(el("div", "app-cp-ov-group", "New on this priority"));
      const mine = btn("＋ A measure of this priority's own", "app-btn");
      mine.title = "Defined and filled in here. If one of its initiatives already has a metric like it, you are offered that one first.";
      mine.addEventListener("click", () => {
        adding = false;
        paintAdd();
        // the editor below is where an own measure is made: its own adder
        const adder = Array.from(ownHost.querySelectorAll<HTMLButtonElement>(".app-im-metricadders button")).pop();
        ownHost.scrollIntoView({ block: "nearest", behavior: "smooth" });
        adder?.click();
      });
      addBox.appendChild(mine);
    }
  };

  /** Before the editor creates an own measure: is there one like it on
   *  an initiative? A duplicate is then a choice, not an accident. */
  const beforeAdd = async (name: string): Promise<boolean> => {
    const flat = o.choices().flatMap((c) => c.metrics.map((m) => ({ name: m.name, key: m.key, initiativeId: c.initiativeId, title: c.title })));
    const like = similarMetrics(name, flat).filter((x) => !hasMeasure(list(), { initiativeId: x.initiativeId, metricKey: x.key })).slice(0, 4);
    if (like.length === 0) return true;
    const picked = await promptChoice({
      title: `Is “${name}” already measured?`,
      note: `${like.length === 1 ? "An initiative under this priority has a metric" : "Initiatives under this priority have metrics"} with a similar name. Using one keeps a single set of readings, entered on its initiative.`,
      choices: [...like.map((x, i) => ({ key: `use${i}`, label: `Use “${x.name}” from ${x.title}` })), { key: "new", label: "Create a new measure", primary: true }],
    });
    if (picked === null) return false;
    if (picked === "new") return true;
    const x = like[Number(picked.slice(3))];
    if (x) await commit([...list(), { initiativeId: x.initiativeId, metricKey: x.key }]);
    return false;
  };

  // ---- the priority's own measures: defined, filled in and charted --------
  const ownCount = () => (p.ownMetrics ?? []).length;
  let ownEditor: { refresh: () => void } | null = null;
  if (o.canEditOwn || ownCount() > 0) {
    ownHead.appendChild(el("span", undefined, "This priority's own measures"));
    void import("./ownMetricsTab").then((m) => {
      if (!ownHost.isConnected) return;
      ownEditor = m.mountOwnMetrics({
        host: ownHost,
        priority: p,
        canEdit: o.canEditOwn,
        values: o.ownValues,
        palette: o.palette,
        // an own measure counts toward the four with the references
        max: () => ownCount() + roomFor(list()),
        beforeAdd,
        // the definitions changed: the list follows before the save
        onDefinitions: () => setMeasures(p, syncOwn(list(), (p.ownMetrics ?? []).map((x) => x.key))),
        save: async () => {
          await o.save();
          if (o.host.isConnected) paint();
        },
        valuesChanged: async () => {
          await o.refreshOwn();
          if (o.host.isConnected) paint();
        },
      });
    });
  } else ownHead.remove();

  paint();
}
