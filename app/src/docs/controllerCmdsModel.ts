// Two commands for document controllers (2026-11-27, R4 of the
// 2026-11-25 round, report 28): Rename, and the correction of the
// effective date. Pure: what is refused before any write, and the
// words each leaves in the document's history. The dialogs and the
// writes are controllerCmds.ts.
//
// The effective date is ONE column — stamped with today at the owner's
// Approve and at Mark reviewed (the 2026-08-10 date model). Typing it
// was ruled out then; this command reverses that for controllers and
// for this one date. The cadence is still never typed.

import { addMonthsYmd } from "./model";

/** "Report.final.docx" → { stem: "Report.final", ext: ".docx" }. */
export function splitName(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { stem: name.slice(0, dot), ext: name.slice(dot) } : { stem: name, ext: "" };
}

/** The characters SharePoint refuses in a file name. */
const ILLEGAL = /["*:<>?/\\|]/;

/** Why a document cannot take this name; "" = it can. `taken` = the
 *  names already in its folder. The file type is not the person's to
 *  change: `stem` is the name without it. */
export function renameProblem(stem: string, oldName: string, taken: Iterable<string> = []): string {
  const { ext } = splitName(oldName);
  const s = stem;
  if (s.trim() === "") return "Give the new name.";
  const bad = ILLEGAL.exec(s);
  if (bad !== null) return `A name cannot hold ${bad[0]}`;
  if (s !== s.trim()) return "A name cannot start or end with a space.";
  if (s.startsWith(".") || s.endsWith(".")) return "A name cannot start or end with a full stop.";
  const next = `${s}${ext}`;
  if (next.length > 255) return "That name is too long.";
  if (next === oldName) return "That is the name it has.";
  const low = next.toLowerCase();
  // a change of capitals only is a rename, not a clash with itself
  for (const t of taken) if (t.toLowerCase() === low && t.toLowerCase() !== oldName.toLowerCase()) return `“${next}” is already in this folder.`;
  return "";
}

const by = (actor: string): string => (actor.trim() !== "" ? ` by ${actor.trim()}` : "");
const cap = (text: string): string => (text.length <= 1000 ? text : `${text.slice(0, 999)}…`);

export function renameComment(oldName: string, newName: string, actor: string, reason: string): string {
  return cap(`Renamed from “${oldName}” to “${newName}”${by(actor)}. Reason: ${reason.trim()}`);
}

/** The Prior names column after a rename: the old name added, newest
 *  first, never twice; cut to what a single line of text holds when
 *  the column is one (`max`), dropping the oldest. */
export function priorNamesAfter(existing: string, oldName: string, max = 0): string {
  const have = existing.split(/\s*;\s*|\r?\n/).map((x) => x.trim()).filter((x) => x !== "");
  const list = [oldName, ...have.filter((x) => x.toLowerCase() !== oldName.toLowerCase())];
  if (max <= 0) return list.join("; ");
  const kept: string[] = [];
  for (const n of list) {
    if ([...kept, n].join("; ").length > max) break;
    kept.push(n);
  }
  return kept.join("; ");
}

/** Where the Title held the old name (with or without its file type)
 *  it follows the rename; anything else is somebody's own title and is
 *  left. "" = leave the Title alone. */
export function titleAfter(title: string, oldName: string, newName: string): string {
  const t = title.trim().toLowerCase();
  if (t === "") return "";
  if (t === oldName.toLowerCase()) return newName;
  if (t === splitName(oldName).stem.toLowerCase()) return splitName(newName).stem;
  return "";
}

const real = (ymd: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (m === null) return false;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
};

/** Why the date cannot be corrected to this; "" = it can. Any past
 *  date is allowed: an ingested document was approved before it
 *  arrived. */
export function dateProblem(ymd: string, presentYmd: string, today: string): string {
  if (ymd.trim() === "") return "Give the correct date.";
  if (!real(ymd)) return "That is not a date.";
  if (ymd > today) return "The date cannot be in the future.";
  if (ymd === presentYmd) return "That is the date it has.";
  return "";
}

export interface DateOutcome {
  /** The review date that results: the corrected date plus the cadence. */
  review: string;
  months: number;
  /** It is already past: the document is due for review at once. */
  due: boolean;
}
export function dateOutcome(ymd: string, months: number, today: string): DateOutcome {
  const review = addMonthsYmd(ymd, months);
  return { review, months, due: review !== "" && review < today };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2022-03-01" → "1 Mar 2022"; anything else as it is. */
export function dayWords(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m === null ? ymd : `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

/** `label` is the column's own title, lower-cased by the caller where
 *  it reads inside a sentence. */
export function dateComment(label: string, fromYmd: string, toYmd: string, reviewYmd: string, actor: string, reason: string): string {
  const from = fromYmd !== "" ? ` from ${dayWords(fromYmd)}` : "";
  const review = reviewYmd !== "" ? ` Review date now ${dayWords(reviewYmd)}.` : "";
  return cap(`${label} corrected${from} to ${dayWords(toYmd)}${by(actor)}.${review} Reason: ${reason.trim()}`);
}
