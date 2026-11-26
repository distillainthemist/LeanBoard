// The Issues desk's CSV: the export of ticked issues and the import of
// their answers (2026-11-26, R3 — N1 of the 2026-11-25 round). Pure:
// reading a file, judging each row against what is stored, and saying
// which writes a row still needs. The dialog (importAnswers.ts) and the
// writes (answersApply.ts) sit on top.
//
// The layout is issue-review-prompt.md §4.5, keyed by IssueID = the
// Dataverse row id. Columns are matched BY NAME, in any order; a
// column this file does not know is ignored — which is what lets the
// export carry reference columns (Title, Reporter, CurrentStatus…)
// beside the answer columns.

import { CSV_STATUS_WORDS, RESOLUTION_TYPES, resolutionTypeFromCsv, statusFromCsv, statusWord } from "./status";

export const MESSAGE_MAX = 400;

// ---- reading and writing CSV text ---------------------------------------

/** RFC 4180 with the liberties a spreadsheet takes: quoted fields,
 *  doubled quotes, a line break inside quotes, CRLF or LF, and a
 *  delimiter of comma or semicolon. Blank lines are dropped. */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let any = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((f) => f.trim() !== "")) rows.push(row);
    row = [];
    any = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field.trim() === "") {
      quoted = true;
      field = "";
      any = true;
    } else if (c === delimiter) {
      endField();
      any = true;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += c;
      any = true;
    }
  }
  if (any || field !== "" || row.length > 0) endRow();
  return rows;
}

/** A file saved on a machine whose list separator is a semicolon has
 *  no commas in its header line. */
export function sniffDelimiter(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  return first.includes(";") && !first.includes(",") ? ";" : ",";
}

/** A file's bytes as text. A spreadsheet's plain "CSV" save is not
 *  UTF-8 (dashes and curly quotes turn to rubbish): bytes that are not
 *  valid UTF-8 are read as Windows-1252. The byte-order mark goes. */
export function decodeCsv(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.replace(/^﻿/, "");
}

const csvField = (v: string): string => (/[",;\r\n]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v);
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

// ---- the export ----------------------------------------------------------

/** Reference columns first (the import ignores them), then the answer
 *  columns, blank. CurrentStatus is NOT called Status: that is the
 *  answer. The reporter's email is left out — the file leaves the app. */
export const EXPORT_COLUMNS = [
  "IssueID",
  "Title",
  "Kind",
  "Area",
  "Reporter",
  "Raised",
  "CurrentStatus",
  "Status",
  "ResolutionType",
  "ReporterMessage",
  "ReleaseVersion",
  "ResolvedDate",
  "DuplicateOfID",
  "InternalNote",
] as const;

export interface ExportIssue {
  id: string;
  title: string;
  kind: string;
  area: string;
  reporter: string;
  /** ISO date or date-time. */
  raised: string;
  status: string;
}

const oneLine = (s: string): string => s.replace(/\s*[\r\n]+\s*/g, " ").trim();

export function exportCsv(issues: ExportIssue[]): string {
  const rows: string[][] = [[...EXPORT_COLUMNS]];
  for (const i of issues) {
    rows.push([i.id, oneLine(i.title), i.kind, i.area, oneLine(i.reporter), i.raised.slice(0, 10), statusWord(i.status), "", "", "", "", "", "", ""]);
  }
  return toCsv(rows);
}

// ---- reading the answers --------------------------------------------------

export interface AnswerRow {
  /** The file's line, counting the header as 1. */
  line: number;
  id: string;
  /** As typed, and the stored status it names ("" = not a status). */
  statusWord: string;
  status: string;
  typeWord: string;
  type: string;
  /** One line, trimmed. The preview may edit it. */
  message: string;
  release: string;
  /** As typed, and as read: an ISO date, "" for blank, null for a date
   *  that could not be read. */
  dateText: string;
  date: string | null;
  parentId: string;
  note: string;
}

/** Ids are compared without case, braces or spaces. */
export const normId = (s: string): string => s.trim().replace(/^\{|\}$/g, "").toLowerCase();
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const looksLikeId = (s: string): boolean => GUID.test(normId(s));

const real = (y: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
};
const iso = (y: number, m: number, d: number): string => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** A date as the file has it → ISO; "" for blank; null when it is not
 *  a date. `2026-12-03` is the specification's form. A spreadsheet
 *  rewrites that as `3/12/2026` on save, so a slash (or dot, or dash)
 *  date is read DAY FIRST — the preview shows what was read in words,
 *  so a wrong reading is seen before anything is applied (Ben's choice
 *  in R3's walk). By calendar fields, never a Date parse. */
export function readDate(text: string): string | null {
  const s = text.trim();
  if (s === "") return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return real(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : null;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return real(y, +m[2], +m[1]) ? iso(y, +m[2], +m[1]) : null;
  }
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-12-03" → "3 Dec 2026". */
export function dateWords(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : isoDate;
}

const headKey = (s: string): string => s.replace(/[^a-z]/gi, "").toLowerCase();

/** The file as answer rows, or why it cannot be read as one. */
export function readAnswers(text: string): { error: string; rows: AnswerRow[] } {
  const clean = text.replace(/^﻿/, "");
  const table = parseCsv(clean, sniffDelimiter(clean));
  if (table.length === 0) return { error: "The file is empty.", rows: [] };
  const head = table[0].map(headKey);
  const col = (name: string): number => head.indexOf(headKey(name));
  const missing = ["IssueID", "Status", "ReporterMessage"].filter((n) => col(n) < 0);
  if (missing.length > 0) {
    return { error: `This is not an answers file: it has no ${missing.join(", ")} column. The first line must name the columns.`, rows: [] };
  }
  const at = (r: string[], name: string): string => {
    const i = col(name);
    return i < 0 ? "" : (r[i] ?? "");
  };
  const rows: AnswerRow[] = [];
  table.slice(1).forEach((r, n) => {
    const statusText = oneLine(at(r, "Status"));
    const typeText = oneLine(at(r, "ResolutionType"));
    const dateText = oneLine(at(r, "ResolvedDate"));
    rows.push({
      line: n + 2,
      id: normId(at(r, "IssueID")),
      statusWord: statusText,
      status: statusFromCsv(statusText),
      typeWord: typeText,
      type: resolutionTypeFromCsv(typeText),
      message: oneLine(at(r, "ReporterMessage")).replace(/\s+/g, " "),
      release: oneLine(at(r, "ReleaseVersion")),
      dateText,
      date: readDate(dateText),
      parentId: normId(at(r, "DuplicateOfID")),
      note: oneLine(at(r, "InternalNote")).replace(/\s+/g, " "),
    });
  });
  if (rows.length === 0) return { error: "The file has its column names and no rows.", rows: [] };
  return { error: "", rows };
}

// ---- judging a row --------------------------------------------------------

/** What is stored about an issue a row names (or a duplicate's parent). */
export interface KnownIssue {
  id: string;
  title: string;
  reporter: string;
  status: string;
  resolution: string;
  /** The issue it is merged into, "" when none. */
  parentId: string;
  /** Bodies already in its thread, by audience. */
  reporterMessages: string[];
  internalMessages: string[];
}

/** The reporter-visible resolution line. Resolved and Partially
 *  resolved: "Bug fix, released in 1.0.0 on 3 Dec 2026" with blank
 *  parts left out. Any other status: the type alone — and nothing for
 *  "No change" ("Resolution: No change" reads curtly beside a declined
 *  idea). "" = the row writes no line. */
export function resolutionLine(row: Pick<AnswerRow, "status" | "type" | "release" | "date">): string {
  const shipped = row.status === "done" || row.status === "partial";
  if (!shipped) return row.type === "" || row.type === "No change" ? "" : row.type;
  const when = [row.release !== "" ? `in ${row.release}` : "", (row.date ?? "") !== "" ? `on ${dateWords(row.date ?? "")}` : ""].filter((s) => s !== "").join(" ");
  if (when === "") return row.type === "No change" ? "" : row.type;
  return row.type === "" || row.type === "No change" ? `Released ${when}` : `${row.type}, released ${when}`;
}

export type Step =
  | { kind: "status"; to: string }
  | { kind: "merge"; parentId: string }
  | { kind: "resolution"; line: string }
  | { kind: "message"; text: string }
  | { kind: "note"; text: string };

/** The writes a row still needs — each one skipped when it is already
 *  done, which is what lets a half-applied row be applied again and
 *  makes a second run of the same file change nothing. In the order
 *  they run. */
export function stepsFor(row: AnswerRow, issue: KnownIssue): Step[] {
  const steps: Step[] = [];
  if (row.status === "merged") {
    if (!(issue.status === "merged" && issue.parentId === row.parentId)) steps.push({ kind: "merge", parentId: row.parentId });
  } else if (row.status !== "" && issue.status !== row.status) {
    steps.push({ kind: "status", to: row.status });
  }
  const line = resolutionLine(row);
  if (line !== "" && line !== issue.resolution.trim()) steps.push({ kind: "resolution", line });
  if (row.message !== "" && !issue.reporterMessages.includes(row.message)) steps.push({ kind: "message", text: row.message });
  if (row.note !== "" && !issue.internalMessages.includes(row.note)) steps.push({ kind: "note", text: row.note });
  return steps;
}

export type RowState =
  /** Nothing typed: no status and no message. Skipped quietly. */
  | "none"
  /** Every step is already done. */
  | "applied"
  /** Cannot be applied as it stands. */
  | "fault"
  /** The reporter withdrew it: a note, unticked, may be ticked. */
  | "withdrawn"
  | "ready";

export interface Judged {
  row: AnswerRow;
  issue: KnownIssue | null;
  state: RowState;
  faults: string[];
  /** Every fault is one the preview's message box can put right. */
  fixable: boolean;
  /** Things worth saying that stop nothing. */
  notes: string[];
  steps: Step[];
}

/** Judge every row against what is stored. `known` holds the issues the
 *  rows name AND the parents their duplicates name, by normalised id. */
export function judgeRows(rows: AnswerRow[], known: Map<string, KnownIssue>): Judged[] {
  const count = new Map<string, number>();
  for (const r of rows) if (r.id !== "") count.set(r.id, (count.get(r.id) ?? 0) + 1);
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  return rows.map((row) => judgeRow(row, known, count, rowOf));
}

export function judgeRow(row: AnswerRow, known: Map<string, KnownIssue>, count: Map<string, number>, rowOf: Map<string, AnswerRow>): Judged {
  const issue = known.get(row.id) ?? null;
  const base = { row, issue, notes: [] as string[], steps: [] as Step[] };
  if (row.statusWord === "" && row.message === "") return { ...base, state: "none", faults: [], fixable: false };

  const hard: string[] = [];
  const soft: string[] = [];
  if (row.id === "") hard.push("No IssueID.");
  else if (issue === null) hard.push("This id is not an issue in this environment.");
  if ((count.get(row.id) ?? 0) > 1) hard.push("This id is in the file more than once.");
  if (row.statusWord === "") hard.push("Status is blank.");
  else if (row.status === "") hard.push(`“${row.statusWord}” is not a status. Use one of: ${CSV_STATUS_WORDS.join(", ")}.`);
  if (row.typeWord !== "" && row.type === "") hard.push(`“${row.typeWord}” is not a resolution type. Use one of: ${RESOLUTION_TYPES.join(", ")}.`);
  if (row.date === null) hard.push(`“${row.dateText}” is not a date. Use 2026-12-03 or 3/12/2026.`);

  if (row.status === "merged") {
    const parent = known.get(row.parentId) ?? null;
    if (row.parentId === "") hard.push("A duplicate needs DuplicateOfID: the issue it is a duplicate of.");
    else if (row.parentId === row.id) hard.push("An issue cannot be a duplicate of itself.");
    else if (parent === null) hard.push("DuplicateOfID is not an issue in this environment.");
    else {
      const parentRow = rowOf.get(row.parentId);
      const parentIsDup = parentRow !== undefined ? parentRow.status === "merged" : parent.status === "merged";
      if (parentIsDup) hard.push(`Its parent “${parent.title}” is itself a duplicate. Name the issue that one is merged into.`);
    }
  }
  if (issue !== null && issue.status === "merged" && row.status !== "" && !(row.status === "merged" && row.parentId === issue.parentId)) {
    const into = known.get(issue.parentId)?.title ?? "";
    hard.push(`This issue is already merged${into !== "" ? ` into “${into}”` : " into another"}. The import does not undo a merge.`);
  }

  if (row.message === "") soft.push("ReporterMessage is missing.");
  else if (row.message.length > MESSAGE_MAX) soft.push(`The message is ${row.message.length} characters; the most is ${MESSAGE_MAX}.`);

  const faults = [...hard, ...soft];
  if (faults.length > 0 || issue === null) return { ...base, state: "fault", faults, fixable: hard.length === 0 };

  const steps = stepsFor(row, issue);
  const notes: string[] = [];
  const line = steps.find((s): s is Extract<Step, { kind: "resolution" }> => s.kind === "resolution");
  if (line !== undefined && issue.resolution.trim() !== "") notes.push(`Replaces the resolution line “${issue.resolution.trim()}”.`);
  if (steps.length === 0) return { ...base, state: "applied", faults: [], fixable: false, notes };
  if (issue.status === "withdrawn") {
    notes.unshift("Its reporter withdrew this report. Tick it to answer it anyway.");
    return { ...base, state: "withdrawn", faults: [], fixable: false, notes, steps };
  }
  return { ...base, state: "ready", faults: [], fixable: false, notes, steps };
}

/** "30 rows: 26 ready, 2 with faults, 1 no answer, 1 already applied". */
export function tallyLine(judged: Judged[]): string {
  const n = (s: RowState) => judged.filter((j) => j.state === s).length;
  const parts = [
    n("ready") > 0 ? `${n("ready")} ready` : "",
    n("fault") > 0 ? `${n("fault")} with faults` : "",
    n("withdrawn") > 0 ? `${n("withdrawn")} withdrawn by the reporter` : "",
    n("none") > 0 ? `${n("none")} no answer` : "",
    n("applied") > 0 ? `${n("applied")} already applied` : "",
  ].filter((s) => s !== "");
  return `${judged.length} row${judged.length === 1 ? "" : "s"}: ${parts.join(", ")}`;
}

/** Every row names an id and none of them is here: the file is from
 *  another environment (production's export loaded on dev). */
export function fromElsewhere(judged: Judged[]): boolean {
  const named = judged.filter((j) => j.row.id !== "" && j.state !== "none");
  return named.length > 0 && named.every((j) => j.issue === null);
}
