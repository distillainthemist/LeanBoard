// The status rule (2026-11-17, "Scope for executive summary";
// docs/issues-plan-2026-11-17.md). ONE rule for every surface that colours
// an initiative or a priority — the executive summary, the Priorities
// tab, the priority popup, the Improvement register and tiles, the Gantt
// card, the A3 poster. It replaces the four-colour `initiativeRag` and
// the strict / ratio `rollup`.
//
// An initiative is ON TRACK, OFF TRACK or FLAGGED.
//   Off track when any of:
//     · an action is late, or it has no actions at all (all done is fine)
//     · a metric is outside its limits or short of plan
//     · no status update inside the recency window
//   Flagged when its people have raised the flag. Flagged is the PRIMARY
//   state — raising a hand is a good thing — and the underlying health
//   stays visible as "at risk" (otherwise on track) or "recovery needed"
//   (otherwise off track).
//   A new initiative has a grace of the recency window from its creation
//   for "no actions" and "no update"; late actions and metrics bite at
//   once.
// A priority takes the worst of its initiatives in the order flagged,
// off track, on track; with none it has no status.
//
// A status always says WHY (`reasons`): a red wall with no reasons reads
// as an accusation, not a to-do list. Pure — no DOM, no store.

import { actionBelongsTo } from "../../../shared/schema/actions";
import { daysBetween } from "./commentaryModel";

export type StatusState = "good" | "flagged" | "bad";
export type PriorityState = StatusState | "none";
export type Health = "good" | "bad";

export interface StatusSettings {
  /** No status update for this many days → off track; also the grace a
   *  new initiative gets, and the board band's stale notice. */
  recencyDays: number;
  /** State → a key of the site state palette (Settings → Branding). */
  colours: Record<StatusState, string>;
}

export const DEFAULT_RECENCY_DAYS = 35;
export const DEFAULT_STATUS_SETTINGS: StatusSettings = {
  recencyDays: DEFAULT_RECENCY_DAYS,
  colours: { good: "good", flagged: "flagged", bad: "issue" },
};

/** What a state paints with when the site's palette has no such key (a
 *  palette stored before "Flagged" joined the starter set). */
export const STATUS_FALLBACK: Record<PriorityState, string> = {
  good: "#107c10",
  flagged: "#7b3fa0",
  bad: "#d13438",
  none: "#9a948a",
};

export const STATE_LABELS: Record<PriorityState, string> = {
  good: "On track",
  flagged: "Flagged",
  bad: "Off track",
  none: "No initiatives",
};

/** The order states are LISTED in (attention first). */
export const STATE_ORDER: StatusState[] = ["flagged", "bad", "good"];
/** The order the three counts are SHOWN in (the mock-up's). */
export const COUNT_ORDER: StatusState[] = ["good", "flagged", "bad"];

export function parseStatusSettings(raw: unknown): StatusSettings {
  const d = DEFAULT_STATUS_SETTINGS;
  const o = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const c = o.colours !== null && typeof o.colours === "object" && !Array.isArray(o.colours) ? (o.colours as Record<string, unknown>) : {};
  const key = (k: StatusState): string => (typeof c[k] === "string" && (c[k] as string).trim() !== "" ? (c[k] as string).trim() : d.colours[k]);
  const days = typeof o.recencyDays === "number" && Number.isFinite(o.recencyDays) ? Math.round(o.recencyDays) : d.recencyDays;
  return {
    recencyDays: Math.max(1, Math.min(365, days)),
    colours: { good: key("good"), flagged: key("flagged"), bad: key("bad") },
  };
}

/** The status settings out of the stored priority-settings JSON — for a
 *  surface that needs nothing else from it (the board header, a card). */
export function statusSettingsFromJson(raw: string | null | undefined): StatusSettings {
  try {
    const o = JSON.parse((raw ?? "").trim() || "{}") as Record<string, unknown>;
    return parseStatusSettings(o.status);
  } catch {
    return parseStatusSettings(undefined);
  }
}

/** A state's colour through the site palette (key → hex). */
export function statusColour(state: PriorityState, settings: StatusSettings, palette: Record<string, string>): string {
  if (state === "none") return palette.neutral ?? STATUS_FALLBACK.none;
  return palette[settings.colours[state]] ?? STATUS_FALLBACK[state];
}

// ---- actions ----------------------------------------------------------------

export interface ActionCounts {
  /** Every action that is not cancelled. */
  total: number;
  /** Done, or done and waiting for an endorser. */
  done: number;
  /** Open and not late (on hold counts here). */
  future: number;
  late: number;
  /** Open actions marked Support required. */
  support: number;
}

export const NO_ACTIONS: ActionCounts = { total: 0, done: 0, future: 0, late: 0, support: 0 };

interface ActionLike {
  initiativeId?: string;
  instanceId?: string;
  status: string;
  pdca?: string;
  due: string;
  escalated?: boolean;
}

/** Done / future / late over a set of actions — the ONE count the
 *  summary, the popup and the register share. Late = today's overdue
 *  rule: past due, open, not on hold, not waiting for an endorser. */
export function actionCounts(actions: ActionLike[], today: string): ActionCounts {
  const c: ActionCounts = { total: 0, done: 0, future: 0, late: 0, support: 0 };
  for (const a of actions) {
    if (a.status === "cancelled") continue;
    c.total++;
    if (a.status === "done" || a.status === "verify") {
      c.done++;
      continue;
    }
    if (a.escalated === true) c.support++;
    if (a.due !== "" && a.due < today && a.pdca !== "hold") c.late++;
    else c.future++;
  }
  return c;
}

/** One initiative's counts from the whole action list. */
export function actionCountsFor(i: { id: string; boardId: string }, actions: ActionLike[], today: string): ActionCounts {
  return actionCounts(
    actions.filter((a) => actionBelongsTo(i, { initiativeId: a.initiativeId, instanceId: a.instanceId ?? "" })),
    today
  );
}

// ---- an initiative's status ---------------------------------------------------

export interface StatusMetric {
  name: string;
  /** red = outside limits, amber = short of plan, green = on plan,
   *  null = no reading or no target (ignored). */
  rag: "green" | "amber" | "red" | null;
}

export interface StatusInput {
  flagged: boolean;
  /** ISO moment the initiative was created; "" = unknown (no grace). */
  createdAt: string;
  /** ISO moment of the latest status update; "" = none yet. */
  lastUpdateAt: string;
  actions: ActionCounts;
  metrics: StatusMetric[];
}

export type ReasonKind = "late" | "noactions" | "metric" | "noupdate";

export interface StatusReason {
  kind: ReasonKind;
  text: string;
}

export interface StatusResult {
  state: StatusState;
  /** What it would be without the flag. */
  health: Health;
  /** "On track" / "Off track" / "Flagged". */
  label: string;
  /** A flagged one's second word: "At risk" / "Recovery needed"; else "". */
  sub: string;
  /** Why it is off track (also listed under a flag); empty when healthy. */
  reasons: StatusReason[];
  /** Inside the new-initiative grace. */
  inGrace: boolean;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "5 weeks" / "12 days" for a day count. */
export function spanWords(days: number): string {
  return days >= 14 ? plural(Math.floor(days / 7), "week", "weeks") : plural(days, "day", "days");
}

export function initiativeStatus(input: StatusInput, settings: StatusSettings, today: string): StatusResult {
  const window = settings.recencyDays;
  const inGrace = input.createdAt !== "" && daysBetween(input.createdAt, today) < window;
  const reasons: StatusReason[] = [];
  if (input.actions.late > 0) reasons.push({ kind: "late", text: plural(input.actions.late, "late action", "late actions") });
  if (input.actions.total === 0 && !inGrace) reasons.push({ kind: "noactions", text: "No actions defined" });
  for (const m of input.metrics) {
    if (m.rag === "red") reasons.push({ kind: "metric", text: `${m.name} outside its limits` });
    else if (m.rag === "amber") reasons.push({ kind: "metric", text: `${m.name} short of plan` });
  }
  if (input.lastUpdateAt !== "") {
    const d = daysBetween(input.lastUpdateAt, today);
    if (d >= window) reasons.push({ kind: "noupdate", text: `No update for ${spanWords(d)}` });
  } else if (!inGrace) {
    reasons.push({ kind: "noupdate", text: "No status update yet" });
  }
  const health: Health = reasons.length > 0 ? "bad" : "good";
  const state: StatusState = input.flagged ? "flagged" : health;
  return {
    state,
    health,
    label: STATE_LABELS[state],
    sub: input.flagged ? (health === "good" ? "At risk" : "Recovery needed") : "",
    reasons,
    inGrace,
  };
}

/** The status as ONE short tag above an initiative's name (Ben,
 *  2026-11-17): "Support needed" for a flagged one — said plainly, with
 *  a flag beside it — else "Off track" / "On track". What lies under a
 *  flag, and the reasons, are a tap away (`whyLines`). */
export function statusTag(s: Pick<StatusResult, "state">): string {
  return s.state === "flagged" ? "Support needed" : STATE_LABELS[s.state];
}

/** Why an initiative is where it is, a line each — behind the small i
 *  beside its status. A flagged one says what was asked for, then what
 *  lies under the flag; an off-track one lists its reasons; an on-track
 *  one has nothing to explain. */
export function whyLines(s: Pick<StatusResult, "state" | "health" | "reasons">, flagNote = ""): string[] {
  const reasons = s.reasons.map((r) => r.text);
  if (s.state === "flagged") {
    const ask = flagNote.trim() !== "" ? `Support needed: ${flagNote.trim()}` : "Support needed — no note written";
    return s.health === "bad" ? [ask, "Recovery needed — it is also off track:", ...reasons] : [ask, "Otherwise on track"];
  }
  return reasons;
}

/** "Flagged · recovery needed" / "Off track" — the words beside a name. */
export function statusWords(s: Pick<StatusResult, "label" | "sub">): string {
  return s.sub !== "" ? `${s.label} · ${s.sub.toLowerCase()}` : s.label;
}

/** The reasons as one line ("3 late actions · No update for 6 weeks"). */
export function reasonsLine(s: Pick<StatusResult, "reasons">, max = 4): string {
  const texts = s.reasons.map((r) => r.text);
  return texts.length <= max ? texts.join(" · ") : `${texts.slice(0, max).join(" · ")} · +${texts.length - max} more`;
}

// ---- a priority's status ------------------------------------------------------

export interface PriorityStatus {
  state: PriorityState;
  /** Its INITIATIVES, by state — the three circles. */
  counts: Record<StatusState, number>;
  total: number;
  /** Why the priority ITSELF is off track (2026-11-18): a late action
   *  raised on it, a metric of its own short of plan or outside its
   *  limits. Empty when nothing of its own is wrong. */
  own: StatusReason[];
}

/** What a priority carries of its own, apart from its initiatives: the
 *  actions raised directly on it (at the org in view) and the metrics
 *  defined on it. Both count toward its status (Ben, 2026-11-18). */
export interface PriorityOwn {
  actions: ActionCounts;
  metrics: StatusMetric[];
}

/** Flagged wins, then off track, then on track; nothing counted → none.
 *  Off track: any initiative is, or something of the priority's own is —
 *  a late action, a metric short of plan or outside its limits. A
 *  priority with no initiatives is on track on its own actions and
 *  metrics once it has any. */
export function priorityStatus(states: StatusState[], mine?: PriorityOwn): PriorityStatus {
  const counts: Record<StatusState, number> = { good: 0, flagged: 0, bad: 0 };
  for (const s of states) counts[s]++;
  const own: StatusReason[] = [];
  if (mine) {
    if (mine.actions.late > 0) own.push({ kind: "late", text: `${mine.actions.late} late priority action${mine.actions.late === 1 ? "" : "s"}` });
    for (const m of mine.metrics) {
      if (m.rag === "red") own.push({ kind: "metric", text: `${m.name} outside its limits` });
      else if (m.rag === "amber") own.push({ kind: "metric", text: `${m.name} short of plan` });
    }
  }
  const hasOwn = mine !== undefined && (mine.actions.total > 0 || mine.metrics.some((m) => m.rag !== null));
  const state: PriorityState = counts.flagged > 0 ? "flagged" : counts.bad > 0 || own.length > 0 ? "bad" : counts.good > 0 || hasOwn ? "good" : "none";
  return { state, counts, total: states.length, own };
}

/** "2 on track · 1 flagged · 1 off track" — for a tooltip or a line. */
export function countsWords(p: PriorityStatus): string {
  const base = p.total === 0 ? STATE_LABELS.none : COUNT_ORDER.map((s) => `${p.counts[s]} ${STATE_LABELS[s].toLowerCase()}`).join(" · ");
  // what the priority itself is off track for, after its initiatives
  return p.own.length > 0 ? `${base} · ${p.own.map((r) => r.text).join(" · ")}` : base;
}
