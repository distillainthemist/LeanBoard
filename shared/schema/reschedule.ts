// Moving an action's due date — ONE rule for every surface (Ben,
// 2026-11-16). Before this the action card asked "Why is this moving?"
// only where a card setting was on, the Gantt asked always, every other
// card never, and the four reasons were written out twice.
//
// The rule: every move of an existing due date is recorded on the
// action's history. A move LATER (or clearing the date) asks for a
// reason when the action is in scope — on an initiative, or anywhere
// when the organisation's policy is "all". A move earlier, or one out
// of scope, is recorded without a question.
//
// The reasons are the organisation's list (Settings → Improvement →
// Due date changes); "Other" is always offered and needs a note. A
// history entry stores the reason as TEXT, so renaming or removing a
// reason never rewrites the past.

import type { ActionHistoryEntry, LtkAction } from "./actions";

export type ReschedulePolicy = "initiatives" | "all";

export interface RescheduleSettings {
  /** Which actions ask for a reason when their due date moves later. */
  policy: ReschedulePolicy;
  /** The reasons offered, in order. "Other" is added by the prompt. */
  reasons: string[];
}

export const DEFAULT_RESCHEDULE_REASONS = ["Waiting on parts", "Resource unavailable", "Scope changed", "Blocked by another action"];
export const OTHER_REASON = "Other";

export const defaultRescheduleSettings = (): RescheduleSettings => ({ policy: "initiatives", reasons: [...DEFAULT_RESCHEDULE_REASONS] });

const sameLabel = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Trimmed, blanks and repeats dropped, "Other" left to the prompt. */
export function cleanReasons(list: unknown[]): string[] {
  const out: string[] = [];
  for (const r of list) {
    if (typeof r !== "string") continue;
    const label = r.trim();
    if (label === "" || sameLabel(label, OTHER_REASON) || out.some((x) => sameLabel(x, label))) continue;
    out.push(label);
  }
  return out;
}

/** The stored settings; anything missing falls back to the defaults. An
 *  EMPTY stored list is kept — the organisation removed every reason and
 *  the prompt offers "Other" alone. */
export function parseRescheduleSettings(raw: unknown): RescheduleSettings {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    policy: o.policy === "all" ? "all" : "initiatives",
    reasons: Array.isArray(o.reasons) ? cleanReasons(o.reasons) : [...DEFAULT_RESCHEDULE_REASONS],
  };
}

/** What the prompt offers: the organisation's reasons, then "Other". */
export function reasonChoices(s: Pick<RescheduleSettings, "reasons">): string[] {
  return [...cleanReasons(s.reasons), OTHER_REASON];
}

/** Is this action an initiative's? By its stamped id, or — for rows
 *  written before the id was stamped — by living on an initiative's
 *  board (instance key "init-…:card"). */
export function onInitiative(a: Pick<LtkAction, "initiativeId" | "instanceId">): boolean {
  if ((a.initiativeId ?? "") !== "") return true;
  return a.instanceId.includes(":") && a.instanceId.startsWith("init-");
}

/** "none" = nothing to say (no change, or a first due date);
 *  "record" = write the move to the history without asking;
 *  "ask" = a reason first — Cancel leaves the date where it was. */
export type DueMove = "none" | "record" | "ask";

export function isLaterMove(prevDue: string, nextDue: string): boolean {
  return prevDue !== "" && nextDue !== prevDue && (nextDue === "" || nextDue > prevDue);
}

export function dueMove(prevDue: string, nextDue: string, a: Pick<LtkAction, "initiativeId" | "instanceId">, policy: ReschedulePolicy): DueMove {
  if (nextDue === prevDue || prevDue === "") return "none";
  if (!isLaterMove(prevDue, nextDue)) return "record";
  return policy === "all" || onInitiative(a) ? "ask" : "record";
}

/** The text a history entry carries: the reason, with the note after it.
 *  null = not answerable yet ("Other" with no note, or nothing chosen). */
export function composeReason(choice: string, note: string): string | null {
  const c = choice.trim();
  const n = note.trim();
  if (c === "") return null;
  if (sameLabel(c, OTHER_REASON)) return n !== "" ? `${OTHER_REASON} — ${n}` : null;
  return n !== "" ? `${c} — ${n}` : c;
}

/** Write a due-date move onto the action's history ("" = no reason was
 *  asked for). The caller has already set the new due date. */
export function recordDueMove(a: LtkAction, prevDue: string, actor: { whoId: string; who: string } | null, reason: string, nowIso: string): void {
  if (prevDue === "" || a.due === prevDue) return;
  const entry: ActionHistoryEntry = {
    kind: "rescheduled",
    whoId: actor?.whoId ?? "",
    who: actor?.who ?? "",
    when: nowIso,
    from: prevDue,
    to: a.due,
    reason,
  };
  a.history = [...(a.history ?? []), entry];
}

/** The action's due-date moves, oldest first. */
export function dueMoves(a: Pick<LtkAction, "history">): ActionHistoryEntry[] {
  return (a.history ?? []).filter((h) => h.kind === "rescheduled");
}

/** How many times the due date moved LATER — the count a card shows. */
export function slipCount(a: Pick<LtkAction, "history">): number {
  return dueMoves(a).filter((h) => isLaterMove(h.from ?? "", h.to ?? "")).length;
}
