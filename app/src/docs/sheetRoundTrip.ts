// The spreadsheet round trip's pure parts (features-plan-2026-10-29,
// feature 2): the Files sheet (one row per file, one column per value)
// and the Values sheet (every valid value per constrained column) as a
// workbook spec, and the way back — an uploaded Files sheet read into
// write-ready values with a problem per cell that cannot be mapped.
// Ingestion-free so the register can reuse it later: the caller
// supplies the columns, the files and a directory resolver. No DOM,
// no SharePoint — tested in node.

import type { AddFieldValue } from "./model";
import { savedDisplay } from "./ingestionDraft";
import { CellValue, SheetSpec, Validation, excelSerialToIso } from "./xlsx";

/** Term paths read as the app writes them everywhere else. */
export const PATH_SEP = " › ";
export const MULTI_SEP = "; ";

export interface SheetOption {
  /** What the cell holds: a term's full path, a choice, "Name <email>". */
  text: string;
  /** taxonomy: the leaf label and the term id */
  label?: string;
  termId?: string;
  /** person: the pool member */
  email?: string;
  name?: string;
}

export interface SheetColumn {
  internal: string;
  label: string;
  kind: AddFieldValue["kind"];
  /** multi-value taxonomy or multi-person */
  multi: boolean;
  /** The Values sheet's list for this column ([] = free text). */
  options: SheetOption[];
  /** The role-bound people columns: the pool is the list and the law. */
  poolBound: boolean;
  required: boolean;
}

/** One file as the sheet shows it: the export strings per internal. */
export interface SheetFile {
  uniqueId: string;
  name: string;
  /** The file's sub-folder under the task folder ("" at the root) —
   *  shown in the sheet for reference, never read back (2026-11-01). */
  folder: string;
  cells: Record<string, string>;
}

export const ID_INTERNAL = "__id";
export const NAME_INTERNAL = "__name";
export const FOLDER_INTERNAL = "__folder";
/** File id (hidden) · Folder (locked) · Name on ingestion, then the
 *  task's columns. The folder leads (Ben, 2026-11-01): it is what the
 *  person reads to decide the metadata. */
const FIXED_COLS = 3;
const FOLDER_COL = 1;
export const FILES_SHEET = "Files";
export const VALUES_SHEET = "Values";
/** Row 0 labels, row 1 the guidance, row 2 (hidden) internals, files
 *  from row 3. The reader finds the internals row by its key, so an
 *  older export (no guidance row) still uploads. */
export const GUIDE_ROW = 1;
export const INTERNALS_ROW = 2;
export const FIRST_FILE_ROW = 3;

/** How to fill a column — the guidance row under the header (Ben,
 *  2026-10-30). */
export function columnGuidance(col: SheetColumn): string {
  const req = col.required ? "Required. " : "";
  if (col.kind === "date") return `${req}A date — type yyyy-mm-dd or pick a date; Excel refuses anything else.`;
  if (col.kind === "choice") return `${req}One of the listed choices — use the dropdown.`;
  if (col.kind === "taxonomy") return col.multi ? `${req}One or more terms as full paths, separated by "; " — the Values sheet lists them.` : `${req}One term as its full path — use the dropdown (the Values sheet lists them).`;
  if (col.kind === "person") return col.poolBound ? `${req}${col.multi ? "People" : "One person"} from the owners & approvers pool — use the dropdown${col.multi ? ', several separated by "; "' : ""}.` : `${req}${col.multi ? "Email addresses separated by \"; \"" : "An email address"} — checked against the directory on upload.`;
  return `${req}Free text.`;
}
/** The Values sheet: a note, a blank line, the labels, then the lists. */
export const VALUES_FIRST_ROW = 3;

const norm = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

// ---- export ------------------------------------------------------------------

/** The cell text for a saved register value: a taxonomy's leaf labels
 *  become full paths (the strict rule needs the path back), people
 *  become "Name <email>", dates their ISO twin. `values` is the
 *  register's FieldValuesAsText projection with its `#email` and `.`
 *  twins. */
export function exportCell(col: SheetColumn, values: Record<string, string>): string {
  if (col.kind === "taxonomy") {
    const labels = (values[col.internal] ?? "").split(";").map((x) => x.trim()).filter((x) => x !== "");
    return labels
      .map((l) => {
        const hit = col.options.find((o) => norm(o.label ?? "") === norm(l));
        return hit ? hit.text : l;
      })
      .join(MULTI_SEP);
  }
  if (col.kind === "person") {
    const names = (values[col.internal] ?? "").split(";").map((x) => x.trim());
    const emails = (values[`${col.internal}#email`] ?? "").split(";").map((x) => x.trim().toLowerCase());
    return emails
      .map((email, i) => (email === "" ? "" : personText(names[i] ?? "", email)))
      .filter((s) => s !== "")
      .join(MULTI_SEP);
  }
  return savedDisplay(values, col.internal, col.kind);
}

export function personText(name: string, email: string): string {
  const n = name.trim();
  return n !== "" && norm(n) !== norm(email) ? `${n} <${email}>` : email;
}

export interface SheetMeta {
  task: string;
  library: string;
  exportedAt: string;
}

/** The two sheets. Files: hidden column A carries the file id, hidden
 *  row 2 the internals; a strict column (a single-value taxonomy, a
 *  choice, a pool-bound single person) validates against its Values
 *  range so Excel offers a dropdown offline. Multi-value columns get
 *  the list as reference only — Excel cannot validate a ";" list. */
export function buildSheets(cols: SheetColumn[], files: SheetFile[], meta: SheetMeta): SheetSpec[] {
  const header: string[] = ["File id", "Folder", "Name on ingestion", ...cols.map((c) => c.label + (c.required ? " ✱" : ""))];
  const guidance: string[] = ["", "Where the file sits in the task's folder — for reference, locked. Every file lands flat in the destination.", "The file's name on ingestion, without its extension — a change renames the file. Leave column A and this row alone.", ...cols.map(columnGuidance)];
  const internals: string[] = [ID_INTERNAL, FOLDER_INTERNAL, NAME_INTERNAL, ...cols.map((c) => c.internal)];
  const rows: CellValue[][] = [header, guidance, internals];
  // a date travels as a real Excel date (shown yyyy-mm-dd, validated as a date)
  const cell = (c: SheetColumn, text: string): CellValue => (c.kind === "date" && text !== "" ? { date: text } : text);
  for (const f of files) rows.push([f.uniqueId, f.folder === "" ? "" : f.folder.split("/").join(PATH_SEP), f.cells[NAME_INTERNAL] ?? f.name, ...cols.map((c) => cell(c, f.cells[c.internal] ?? ""))]);
  // the Values sheet: one column per listed column, its label on top
  const listed = cols.filter((c) => c.options.length > 0);
  const vHeader = listed.map((c) => c.label);
  const vRows: (string | number | null)[][] = [vHeader];
  const tallest = Math.max(0, ...listed.map((c) => c.options.length));
  for (let i = 0; i < tallest; i++) vRows.push(listed.map((c) => c.options[i]?.text ?? ""));
  const validations: Validation[] = [];
  const lastRow = Math.max(FIRST_FILE_ROW, FIRST_FILE_ROW + files.length - 1 + 200); // room for rows added by hand
  cols.forEach((c, ci) => {
    if (c.kind === "date") validations.push({ kind: "date", col: FIXED_COLS + ci, fromRow: FIRST_FILE_ROW, toRow: lastRow });
  });
  listed.forEach((c, li) => {
    if (c.multi) return;
    validations.push({
      kind: "list",
      col: FIXED_COLS + cols.indexOf(c),
      fromRow: FIRST_FILE_ROW,
      toRow: lastRow,
      listSheet: VALUES_SHEET,
      listCol: li,
      listFromRow: VALUES_FIRST_ROW,
      listToRow: VALUES_FIRST_ROW + c.options.length - 1,
      error: c.kind === "taxonomy" ? "Use the term's full path from the dropdown (the Values sheet lists them)." : c.kind === "person" ? "Owners and approvers come from the owners & approvers pool — pick one from the dropdown." : "Pick one of the listed choices.",
    });
  });
  const note = `${meta.task} — exported ${meta.exportedAt} from ${meta.library}. Edit the Files sheet only; leave column A and row 2 as they are. A blank cell clears the value; multi-value cells separate entries with "; ".`;
  return [
    {
      name: FILES_SHEET,
      rows,
      colWidths: [12, 28, 40, ...cols.map((c) => (c.kind === "taxonomy" ? 36 : c.kind === "person" ? 32 : c.kind === "date" ? 14 : 24))],
      hiddenCols: [0],
      hiddenRows: [INTERNALS_ROW],
      boldRows: [0],
      noteRows: [GUIDE_ROW],
      rowHeights: { [GUIDE_ROW]: 58 },
      dateCols: cols.map((c, ci) => (c.kind === "date" ? FIXED_COLS + ci : -1)).filter((i) => i >= 0),
      freezeRows: FIRST_FILE_ROW,
      validations,
      // the id and the folder are read, never written: the sheet is
      // protected with every other cell unlocked
      lockedCols: [0, FOLDER_COL],
    },
    {
      name: VALUES_SHEET,
      rows: [[note], [], ...vRows],
      colWidths: listed.map((c) => (c.kind === "taxonomy" ? 44 : 32)),
      boldRows: [VALUES_FIRST_ROW - 1],
      freezeRows: VALUES_FIRST_ROW,
    },
  ];
}

// ---- import -------------------------------------------------------------------

export interface SheetProblem {
  /** The sheet row as Excel numbers it. */
  row: number;
  file: string;
  column: string;
  value: string;
  reason: string;
}

export interface SheetChange {
  uniqueId: string;
  value: AddFieldValue;
}

export interface ParsedSheet {
  changes: SheetChange[];
  problems: SheetProblem[];
  /** Rows whose file id is no longer in the folder. */
  unknownFiles: string[];
  /** Files in the sheet that are in the folder. */
  filesSeen: number;
  /** A sheet that is not this task's export — nothing else is read. */
  error: string;
}

export type PersonResolver = (query: string) => Promise<{ email: string; name: string }[]>;

const parseDate = (text: string): string => {
  const t = text.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(`${t.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t.slice(0, 10) ? "" : t.slice(0, 10);
  }
  if (/^\d+(\.\d+)?$/.test(t)) return excelSerialToIso(Number(t));
  return "";
};

/** "Name <email>" | "email" | "Name" → the parts. */
export function parsePersonText(text: string): { email: string; name: string } {
  const m = /^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/.exec(text.trim());
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  const t = text.trim();
  if (/^[^\s<>]+@[^\s<>]+$/.test(t)) return { name: "", email: t.toLowerCase() };
  return { name: t, email: "" };
}

/** Reads an uploaded Files sheet against the task's columns and files.
 *  A cell equal to what was exported is no change; a blank cell on a
 *  file that had a value is a CLEAR (Ben, 2026-10-29); anything else
 *  maps by kind, strictly — a term is its full path, a choice one of
 *  the choices, a pool-bound person a pool member. */
export async function parseSheet(grid: string[][], cols: SheetColumn[], files: SheetFile[], resolvePerson: PersonResolver): Promise<ParsedSheet> {
  const out: ParsedSheet = { changes: [], problems: [], unknownFiles: [], filesSeen: 0, error: "" };
  // the key row: wherever it sits in the first rows (older exports had
  // it on row 2, with no guidance row)
  const internalsRow = grid.findIndex((r, i) => i < 4 && (r[0] ?? "").trim() === ID_INTERNAL);
  if (internalsRow < 0) {
    out.error = "This is not an export of an ingestion task — the hidden row with the column keys is missing. Export the sheet from the task first.";
    return out;
  }
  const internals = grid[internalsRow];
  const colAt = new Map<string, number>();
  internals.forEach((k, i) => {
    if (k.trim() !== "") colAt.set(k.trim(), i);
  });
  const byId = new Map(files.map((f) => [f.uniqueId.toLowerCase(), f]));
  const problem = (row: number, file: string, column: string, value: string, reason: string) => out.problems.push({ row, file, column, value, reason });
  for (let r = internalsRow + 1; r < grid.length; r++) {
    const line = grid[r] ?? [];
    const id = (line[colAt.get(ID_INTERNAL) ?? 0] ?? "").trim().toLowerCase();
    const nameCell = (line[colAt.get(NAME_INTERNAL) ?? 1] ?? "").trim();
    if (id === "" && line.every((c) => c.trim() === "")) continue;
    const file = byId.get(id);
    if (!file) {
      out.unknownFiles.push(nameCell || `row ${r + 1}`);
      continue;
    }
    out.filesSeen++;
    const excelRow = r + 1;
    // the name: a change renames the file on Save; blank is no change
    const nameIdx = colAt.get(NAME_INTERNAL);
    if (nameIdx !== undefined && nameCell !== "" && nameCell !== (file.cells[NAME_INTERNAL] ?? file.name)) {
      out.changes.push({ uniqueId: file.uniqueId, value: { internal: NAME_INTERNAL, kind: "text", text: nameCell } });
    }
    for (const col of cols) {
      const idx = colAt.get(col.internal);
      if (idx === undefined) continue; // a column the sheet does not carry is untouched
      const raw = (line[idx] ?? "").trim();
      // a date cell reads back as Excel's serial — compare as the date
      const text = col.kind === "date" && raw !== "" ? parseDate(raw) || raw : raw;
      const was = (file.cells[col.internal] ?? "").trim();
      if (text === was) continue;
      if (text === "") {
        if (was !== "") out.changes.push({ uniqueId: file.uniqueId, value: { internal: col.internal, kind: col.kind, clear: true } });
        continue;
      }
      const v = await mapCell(col, text, resolvePerson);
      if (typeof v === "string") problem(excelRow, file.name, col.label, text, v);
      else out.changes.push({ uniqueId: file.uniqueId, value: v });
    }
  }
  return out;
}

/** One cell's text as a write-ready value, or the reason it is not. */
export async function mapCell(col: SheetColumn, text: string, resolvePerson: PersonResolver): Promise<AddFieldValue | string> {
  const { internal, kind } = col;
  if (kind === "text") return { internal, kind, text };
  if (kind === "date") {
    const iso = parseDate(text);
    return iso === "" ? "Not a date — use yyyy-mm-dd." : { internal, kind, text: iso };
  }
  if (kind === "choice") {
    const hit = col.options.find((o) => norm(o.text) === norm(text));
    return hit ? { internal, kind, text: hit.text } : `Not one of the choices (${col.options.map((o) => o.text).join(", ")}).`;
  }
  if (kind === "taxonomy") {
    const parts = col.multi ? text.split(";").map((x) => x.trim()).filter((x) => x !== "") : [text];
    const terms: { label: string; termId: string }[] = [];
    for (const p of parts) {
      const hit = col.options.find((o) => norm(o.text) === norm(p));
      if (!hit || (hit.termId ?? "") === "") {
        const leafHits = col.options.filter((o) => norm(o.label ?? "") === norm(p));
        return leafHits.length > 0 ? `"${p}" is a term's label, not its path — use the full path from the Values sheet${leafHits.length === 1 ? ` (${leafHits[0].text})` : ""}.` : `"${p}" is not a term in this set — use a full path from the Values sheet.`;
      }
      if (!terms.some((t) => t.termId === hit.termId)) terms.push({ label: hit.label ?? p, termId: hit.termId ?? "" });
    }
    if (terms.length === 0) return "No term given.";
    if (!col.multi && parts.length > 1) return "This column takes one term.";
    return col.multi ? { internal, kind, multi: true, terms, label: terms[0].label, termId: terms[0].termId } : { internal, kind, label: terms[0].label, termId: terms[0].termId };
  }
  if (kind === "person") {
    const parts = text.split(";").map((x) => x.trim()).filter((x) => x !== "");
    if (!col.multi && parts.length > 1) return "This column takes one person.";
    const people: { email: string; name: string }[] = [];
    for (const p of parts) {
      const parsed = parsePersonText(p);
      if (col.poolBound) {
        const hit = parsed.email !== "" ? col.options.find((o) => (o.email ?? "").toLowerCase() === parsed.email) : col.options.filter((o) => norm(o.name ?? "") === norm(parsed.name));
        const one = Array.isArray(hit) ? (hit.length === 1 ? hit[0] : undefined) : hit;
        if (!one) return Array.isArray(hit) && hit.length > 1 ? `"${p}" matches several people in the owners & approvers pool — use the email.` : `"${p}" is not in the owners & approvers pool.`;
        people.push({ email: one.email ?? "", name: one.name ?? "" });
        continue;
      }
      if (parsed.email !== "") {
        const hits = await resolvePerson(parsed.email).catch(() => []);
        const exact = hits.find((h) => h.email.toLowerCase() === parsed.email);
        people.push(exact ?? { email: parsed.email, name: parsed.name || parsed.email });
        continue;
      }
      const hits = await resolvePerson(parsed.name).catch(() => []);
      if (hits.length === 1) people.push(hits[0]);
      else return hits.length === 0 ? `"${p}" was not found in the directory — use the email.` : `"${p}" matches several people — use the email.`;
    }
    if (people.length === 0) return "No person given.";
    const seen = new Set<string>();
    return { internal, kind, people: people.filter((x) => (seen.has(x.email) ? false : (seen.add(x.email), true))) };
  }
  return "Unsupported column.";
}

/** "3 cells on 2 files to change · 1 problem" */
export function parseSummary(p: ParsedSheet): string {
  if (p.error !== "") return p.error;
  const files = new Set(p.changes.map((c) => c.uniqueId)).size;
  const parts = [`${p.changes.length} cell${p.changes.length === 1 ? "" : "s"} on ${files} file${files === 1 ? "" : "s"} to change`];
  if (p.problems.length > 0) parts.push(`${p.problems.length} problem${p.problems.length === 1 ? "" : "s"}`);
  if (p.unknownFiles.length > 0) parts.push(`${p.unknownFiles.length} row${p.unknownFiles.length === 1 ? "" : "s"} for files no longer in the folder`);
  return parts.join(" · ");
}
