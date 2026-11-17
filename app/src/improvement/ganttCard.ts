// The Actions Gantt ritual card (P8). Board org (or explicit gxSite /
// gxDepartment) scopes the initiatives; the window centres on the
// meeting's week. Editing follows the card's readOnly flag — a live
// ritual can reschedule from the wall, a snapshot cannot.

import type { CardMount } from "../cardRegistry";
import { mountGantt } from "./gantt";
import { listInitiatives } from "../store/initiatives";
import { actionsForInitiatives } from "../store/actions";
import { getBoard } from "../store/boards";
import { appPalettes } from "../store/config";
import { paletteMap } from "../../../shared/palette";
import { statusOf } from "./initiativeModel";
import { statusColour } from "./status";
import { statusMetricsOf } from "./metricValues";
import { todayIso } from "../../../shared/schema/id";
import { currentViewer } from "../runtime";

function cfg(opts: CardMount, key: string): string {
  const c = opts.settings.config;
  const v = c && typeof c === "object" ? (c as Record<string, unknown>)[key] : "";
  return typeof v === "string" ? v : "";
}

export function mountGanttCard(opts: CardMount): () => void {
  let dead = false;
  let teardown: (() => void) | null = null;
  void (async () => {
    let site = cfg(opts, "gxSite");
    let department = cfg(opts, "gxDepartment");
    if (site === "") {
      try {
        const b = await getBoard(opts.boardId);
        site = b?.site ?? "";
        if (department === "") department = b?.department ?? "";
      } catch {
        /* org filter stays open */
      }
    }
    const [initiatives, actions, palettes] = await Promise.all([
      listInitiatives().catch(() => []),
      actionsForInitiatives().catch(() => []),
      appPalettes(),
    ]);
    if (dead) return;
    const palette = paletteMap(palettes.states);
    const scoped = initiatives.filter(
      (i) =>
        i.status === "active" &&
        !i.confidential &&
        [i.org, ...(i.alsoOrgs ?? [])].some((o) => (site === "" || o.site === site) && (department === "" || o.department === department))
    );
    const rawWeeks = cfg(opts, "gxWeeks");
    const weeks = rawWeeks === "all" ? ("all" as const) : Number(rawWeeks) || 4;
    const today = todayIso();
    // the status rule's inputs (metric states, settings) — a failed read
    // leaves the metrics out, never the card
    const { metricState, settings: statusSettings } = await import("./statusLoad").then((m) => m.loadStatusInputs(scoped));
    if (dead) return;
    teardown = mountGantt({
      host: opts.host,
      scopes: [{ key: "org", label: site || "All sites" }],
      initiatives: scoped,
      actions,
      palette,
      // the status rule's colour — the same one the Improvement tab and
      // the Priorities screen paint this initiative with
      edgeColour: (i) => statusColour(statusOf(i, actions, statusMetricsOf(metricState.get(i.id)), statusSettings, today).state, statusSettings, palette),
      canEdit: !opts.readOnly,
      actor: { whoId: currentViewer()?.objectId ?? "", who: currentViewer()?.name ?? "" },
      onChanged: () => {},
      centerIso: opts.instanceWhen !== "" ? opts.instanceWhen.slice(0, 10) : undefined,
      windowWeeks: weeks,
    });
  })();
  return () => {
    dead = true;
    teardown?.();
  };
}
