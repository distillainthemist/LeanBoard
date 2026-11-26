// Issue statuses — the ONE list (2026-11-26, R3 of the 2026-11-25
// round). The words were written out three times and the open list
// four; the desk, the reporter's list, the PDF and the CSV all read
// this file. Pure.
//
// A status is plain text in `ben_status`: a new one changes no schema.
// The three added here (partial · deferred · notsoftware) are the
// outcomes the resolution CSV has that the desk had no word for; an
// older build shows them as their raw stored value.

export const ISSUE_STATUSES = [
  "new",
  "triaged",
  "inprogress",
  "partial",
  "done",
  "deferred",
  "declined",
  "notsoftware",
  "merged",
  "withdrawn",
] as const;

/** "done" reads "Resolved" since 2026-11-26 (Ben's choice in R3's
 *  walk): one vocabulary across the CSV, the desk and what a reporter
 *  reads. The stored value is unchanged. */
export const STATUS_WORDS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  inprogress: "In progress",
  partial: "Partially resolved",
  done: "Resolved",
  deferred: "Deferred",
  declined: "Declined",
  notsoftware: "Not a software issue",
  merged: "Merged",
  withdrawn: "Withdrawn",
};

export const statusWord = (s: string | undefined | null): string => STATUS_WORDS[s ?? ""] ?? s ?? "";

/** Still in the queue. Partially resolved stays open: part of it is
 *  still owed. */
export const OPEN_STATUSES: readonly string[] = ["new", "triaged", "inprogress", "partial"];
export const isOpenStatus = (s: string | undefined | null): boolean => OPEN_STATUSES.includes(s ?? "");

const orOf = (list: readonly string[]): string => `(${list.map((s) => `ben_status eq '${s}'`).join(" or ")})`;
/** The OData test for "open". */
export const openFilter = (): string => orOf(OPEN_STATUSES);

/** What a reporter is shown as "already reported in this area": the
 *  open ones AND the deferred ones — a deferred idea is exactly the one
 *  the next person reports again instead of following. */
export const KNOWN_STATUSES: readonly string[] = [...OPEN_STATUSES, "deferred"];
export const knownFilter = (): string => orOf(KNOWN_STATUSES);

/** The desk's Status select: everything but Merged (its own command)
 *  and Withdrawn (the reporter's). */
export const PICKABLE_STATUSES: readonly string[] = ["new", "triaged", "inprogress", "partial", "done", "deferred", "declined", "notsoftware"];

/** The desk's status filter, in order. */
export const STATUS_FILTERS: readonly (readonly [string, string])[] = [
  ["open", "Open (new · triaged · in progress · partially resolved)"],
  ["new", "New"],
  ["triaged", "Triaged"],
  ["inprogress", "In progress"],
  ["partial", "Partially resolved"],
  ["done", "Resolved"],
  ["deferred", "Deferred"],
  ["declined", "Declined"],
  ["notsoftware", "Not a software issue"],
  ["merged", "Merged"],
  ["withdrawn", "Withdrawn"],
  ["all", "Everything"],
];

/** The statuses that are an ANSWER the reporter did not ask for: set by
 *  hand they go through a message, never silently (Declined since
 *  2026-08-12; Deferred and Not a software issue since R3's walk). */
export interface AnswerStatus {
  /** The dialog's title verb and its button. */
  title: string;
  button: string;
  hint: string;
  prefill: string;
  /** While it runs, and when it could not. */
  doing: string;
  failed: string;
  /** "Declined and saved to the thread — Teams delivery did not go" */
  landed: string;
  /** The prefill is only an opening: it cannot go as it stands, and
   *  this says what is still to add. */
  mustAdd?: string;
}
export const ANSWER_STATUSES: Record<string, AnswerStatus> = {
  declined: {
    title: "Decline",
    button: "Decline & send",
    hint: "Declining always tells the reporter why — edit the message before it goes.",
    prefill:
      "Thanks for reporting this — we've decided not to take it further right now. " +
      "It stays on record, and we may revisit it as the app evolves.",
    doing: "Declining…",
    failed: "Could not decline",
    landed: "Declined",
  },
  deferred: {
    title: "Defer",
    button: "Defer & send",
    hint: "Deferring always tells the reporter — say that it is logged and what would bring it forward.",
    prefill:
      "Thanks for raising this. We've logged it for a later release rather than this one, " +
      "and will look at it again as more teams ask for it.",
    doing: "Deferring…",
    failed: "Could not defer",
    landed: "Deferred",
  },
  notsoftware: {
    title: "Not a software issue",
    button: "Close & send",
    hint: "Closing it this way always tells the reporter what to do instead — who to contact, or how to do it.",
    prefill: "Thanks for reporting this. It is not something a change to the app would fix. ",
    mustAdd: "Add what the reporter should do instead: who to contact, or how to do it.",
    doing: "Closing…",
    failed: "Could not close it",
    landed: "Closed",
  },
};

// ---- the resolution CSV's words (issue-review-prompt.md §4.5) -----------

const key = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

/** A CSV Status word → the stored status; "" when it is not one. Case
 *  and stray spaces are forgiven. The desk's own words are read too. */
export function statusFromCsv(word: string): string {
  const k = key(word);
  const csv: Record<string, string> = {
    resolved: "done",
    "partially resolved": "partial",
    deferred: "deferred",
    declined: "declined",
    duplicate: "merged",
    "not a software issue": "notsoftware",
    // the desk's words for the same six
    done: "done",
    merged: "merged",
  };
  return csv[k] ?? "";
}
/** The six words an answer may carry, as the CSV spells them. */
export const CSV_STATUS_WORDS: readonly string[] = ["Resolved", "Partially resolved", "Deferred", "Declined", "Duplicate", "Not a software issue"];

export const RESOLUTION_TYPES: readonly string[] = ["Bug fix", "Design change", "Enhancement", "New feature", "Configuration", "Training / guidance", "No change"];
/** A CSV ResolutionType word → its listed spelling; "" when it is not
 *  one. "Training/guidance" and "Training / guidance" are one word. */
export function resolutionTypeFromCsv(word: string): string {
  const k = key(word).replace(/\s*\/\s*/g, "/");
  return RESOLUTION_TYPES.find((t) => key(t).replace(/\s*\/\s*/g, "/") === k) ?? "";
}
