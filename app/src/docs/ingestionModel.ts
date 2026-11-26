// Document ingestion — the pure parts (document-ingestion-proposal-
// 2026-10.md, built 2026-10-08): the task shape and its Dataverse row
// mapping, who may see a task, a task's folder name, what a file is
// still missing before it may move, and how a run log reads. No DOM,
// no SharePoint, no SDK — tested in node.

import { AddFieldValue, sanitizeFileName } from "./model";

export type IngestionStatus = "open" | "running" | "closed";

export interface IngestionAssignee {
  email: string;
  name: string;
}

export interface RunLogEntry {
  /** The file's name in the task folder. */
  file: string;
  /** "started": a run's own mark as it begins — who and when, no file
   *  (2026-11-22; a screen tells whose run is live from the last one). */
  outcome: "moved" | "refused" | "started";
  /** Why it was refused, or where it landed (server-relative url). */
  detail: string;
  /** ISO time. */
  at: string;
  by: string;
}

export interface IngestionTask {
  rowId: string;
  name: string;
  siteUrl: string;
  sourceListId: string;
  /** The task's sub-folder, server-relative. */
  folder: string;
  destListId: string;
  status: IngestionStatus;
  assignees: IngestionAssignee[];
  /** The task defaults as WRITE-READY values (the add form's shape —
   *  taxonomy keeps its term id, people their claims), one per column;
   *  "Fill blanks from defaults" writes the ones a file lacks. */
  defaults: AddFieldValue[];
  log: RunLogEntry[];
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
  closedAt: string;
  /** The LeanBoard site the task is constrained to (Ben, 2026-10-29):
   *  the Organisation unit and Process area editors offer that site's
   *  branches only and the run refuses a file tagged outside them.
   *  "" = any site (every task made before this). */
  site: string;
  /** When the ROW was last written (Dataverse's own stamp; read-only,
   *  never sent back). A run saves at least every thirty seconds, so
   *  this is its heartbeat (2026-11-22). Absent = not read. */
  modifiedOn?: string;
}

/** The Dataverse row, as the generated service shapes it. */
export interface IngestionTaskRow {
  ben_ltkingestiontaskid?: string;
  ben_name?: string;
  ben_siteurl?: string;
  ben_sourcelistid?: string;
  ben_folder?: string;
  ben_destlistid?: string;
  ben_status?: string;
  ben_assigneesjson?: string;
  ben_defaultsjson?: string;
  ben_logjson?: string;
  ben_createdbyemail?: string;
  ben_createdbyname?: string;
  ben_createdat?: string;
  ben_closedat?: string;
  ben_site?: string;
  modifiedon?: string;
}

const parseJson = <T>(raw: string | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function taskFromRow(r: IngestionTaskRow): IngestionTask {
  const status = r.ben_status === "running" || r.ben_status === "closed" ? r.ben_status : "open";
  const assignees = parseJson<unknown>(r.ben_assigneesjson, []);
  const log = parseJson<unknown>(r.ben_logjson, []);
  const defaults = parseJson<unknown>(r.ben_defaultsjson, []);
  return {
    rowId: r.ben_ltkingestiontaskid ?? "",
    name: r.ben_name ?? "",
    siteUrl: r.ben_siteurl ?? "",
    sourceListId: (r.ben_sourcelistid ?? "").toLowerCase(),
    folder: r.ben_folder ?? "",
    destListId: (r.ben_destlistid ?? "").toLowerCase(),
    status,
    assignees: Array.isArray(assignees)
      ? assignees
          .filter((a): a is { email?: unknown; name?: unknown } => typeof a === "object" && a !== null)
          .map((a) => ({ email: String(a.email ?? "").toLowerCase(), name: String(a.name ?? "") }))
          .filter((a) => a.email !== "")
      : [],
    defaults: Array.isArray(defaults)
      ? defaults.filter((d): d is AddFieldValue => typeof d === "object" && d !== null && typeof (d as { internal?: unknown }).internal === "string" && typeof (d as { kind?: unknown }).kind === "string")
      : [],
    log: Array.isArray(log)
      ? log
          .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
          .map((e) => ({
            file: String(e.file ?? ""),
            outcome: e.outcome === "moved" ? ("moved" as const) : e.outcome === "started" ? ("started" as const) : ("refused" as const),
            detail: String(e.detail ?? ""),
            at: String(e.at ?? ""),
            by: String(e.by ?? ""),
          }))
      : [],
    createdByEmail: (r.ben_createdbyemail ?? "").toLowerCase(),
    createdByName: r.ben_createdbyname ?? "",
    createdAt: r.ben_createdat ?? "",
    closedAt: r.ben_closedat ?? "",
    site: (r.ben_site ?? "").trim(),
    ...(r.modifiedon ? { modifiedOn: r.modifiedon } : {}),
  };
}

export function rowFromTask(t: IngestionTask): IngestionTaskRow {
  return {
    ben_name: t.name,
    ben_siteurl: t.siteUrl,
    ben_sourcelistid: t.sourceListId,
    ben_folder: t.folder,
    ben_destlistid: t.destListId,
    ben_status: t.status,
    ben_assigneesjson: JSON.stringify(t.assignees),
    ben_defaultsjson: JSON.stringify(t.defaults),
    ben_logjson: JSON.stringify(t.log),
    ben_createdbyemail: t.createdByEmail,
    ben_createdbyname: t.createdByName,
    ben_createdat: t.createdAt,
    ben_closedat: t.closedAt,
    ben_site: t.site,
  };
}

/** A term root per column for a task constrained to a site: the
 *  site's own term in the Organisation set (by label — the shallowest
 *  match, so a department named like the site never wins) and the site
 *  root of the Process area set. Absent = the whole set. */
export function siteTermRoots(
  site: string,
  cols: { orgUnit: string; processArea: string },
  orgNodes: { id: string; labels: string[] }[],
  processRootTermId: string,
  processNodes: { id: string; labels: string[] }[] = []
): Record<string, string> {
  const out: Record<string, string> = {};
  const s = site.trim().toLowerCase();
  if (s === "") return out;
  if (cols.orgUnit !== "") {
    const hits = orgNodes.filter((n) => n.labels[n.labels.length - 1].trim().toLowerCase() === s).sort((a, b) => a.labels.length - b.labels.length);
    if (hits.length > 0) out[cols.orgUnit] = hits[0].id;
  }
  if (cols.processArea !== "") {
    // the site root node's binding first; else the set's top-level term
    // named after the site (the sync creates it before it binds — a task
    // opened between the two must still be scoped, 2026-10-30)
    const byLabel = processNodes.find((n) => n.labels.length === 1 && n.labels[0].trim().toLowerCase() === s);
    const root = processRootTermId !== "" && processNodes.some((n) => n.id.toLowerCase() === processRootTermId.toLowerCase()) ? processRootTermId : processRootTermId !== "" && processNodes.length === 0 ? processRootTermId : (byLabel?.id ?? "");
    if (root !== "") out[cols.processArea] = root;
  }
  return out;
}

/** The nodes of a set that sit under a root, the root included, with
 *  their label paths REBASED so the root is the one top-level node —
 *  what a constrained editor or Values sheet offers. */
export function subtreeUnder(nodes: { id: string; labels: string[] }[], rootId: string): { id: string; labels: string[] }[] {
  const root = nodes.find((n) => n.id.toLowerCase() === rootId.toLowerCase());
  if (!root) return nodes;
  const depth = root.labels.length;
  const key = (p: string[]) => p.map((x) => x.trim().toLowerCase()).join("¦");
  const prefix = key(root.labels);
  return nodes.filter((n) => n.labels.length >= depth && key(n.labels.slice(0, depth)) === prefix).map((n) => ({ ...n, labels: n.labels.slice(depth - 1) }));
}

/** A term column's saved value as TERMS (issue review 2026-11-25,
 *  report 5). The feed gives the names in `value` and, since v0.99.0,
 *  the ids beside them in `idsText` — the id is the term. Where there
 *  is no id, a name finds its term only when ONE term in the set has
 *  it: two areas called "General" are two terms, and the app never
 *  guesses which was meant (it used to take the last one the walk
 *  listed, and a file tagged Casthouse › General came back as Metal
 *  Delivery › General). `unsure`: the names it could not place. */
export function savedTerms(
  value: string,
  idsText: string,
  nodes: { id: string; labels: string[] }[]
): { terms: { label: string; termId: string }[]; unsure: string[] } {
  const labels = value.split(";").map((x) => x.trim()).filter((x) => x !== "");
  const ids = idsText.split(";").map((x) => x.trim()).filter((x) => x !== "");
  const last = (n: { labels: string[] }) => n.labels[n.labels.length - 1] ?? "";
  if (ids.length > 0 && ids.length === labels.length) {
    const byId = new Map(nodes.map((n) => [n.id.toLowerCase(), n]));
    return {
      // the term's CURRENT name where the walk knows it (a rename lags
      // on the item), else the name the item carries
      terms: ids.map((id, i) => ({ label: byId.has(id.toLowerCase()) ? last(byId.get(id.toLowerCase())!) : labels[i], termId: id })),
      unsure: [],
    };
  }
  const terms: { label: string; termId: string }[] = [];
  const unsure: string[] = [];
  for (const label of labels) {
    const hits = nodes.filter((n) => last(n).trim().toLowerCase() === label.toLowerCase());
    if (hits.length === 1) terms.push({ label, termId: hits[0].id });
    else unsure.push(label);
  }
  return { terms, unsure };
}

/** One term by the id the item carries, else by a name only ONE term
 *  has; null when it cannot be told (report 5's rule, for a single
 *  value such as Importance). */
export function savedTerm(value: string, idsText: string, nodes: { id: string; labels: string[] }[]): { label: string; termId: string } | null {
  const first = value.split(";")[0]?.trim() ?? "";
  if (first === "") return null;
  const firstId = idsText.split(";")[0]?.trim() ?? "";
  const got = savedTerms(first, firstId, nodes);
  return got.terms[0] ?? null;
}

/** The register labels of a file's value that are NOT under the root —
 *  the run's pre-flight for a site-constrained task. Judged by the
 *  term's ID where the item carries one (`idsText`); by name otherwise,
 *  and then a label the walk does not know is left alone (the walk may
 *  be partial), as is a name shared by a term under the root. */
export function labelsOutsideRoot(value: string, nodes: { id: string; labels: string[] }[], rootId: string, idsText = ""): string[] {
  const under = new Set(subtreeUnder(nodes, rootId).map((n) => n.id.toLowerCase()));
  if (under.size === 0) return [];
  const labels = value.split(";").map((x) => x.trim()).filter((x) => x !== "");
  const ids = idsText.split(";").map((x) => x.trim().toLowerCase()).filter((x) => x !== "");
  if (ids.length > 0 && ids.length === labels.length) {
    const known = new Set(nodes.map((n) => n.id.toLowerCase()));
    // an id the walk does not know is left alone, as an unknown label is
    return labels.filter((_, i) => known.has(ids[i]) && !under.has(ids[i]));
  }
  const out: string[] = [];
  for (const label of labels) {
    const hits = nodes.filter((n) => n.labels[n.labels.length - 1].trim().toLowerCase() === label.toLowerCase());
    if (hits.length > 0 && !hits.some((h) => under.has(h.id.toLowerCase()))) out.push(label);
  }
  return out;
}

/** The sub-folder a task gets: its name, made safe for SharePoint. */
export function taskFolderName(name: string): string {
  return sanitizeFileName(name).slice(0, 120);
}

/** Who sees a task: its assignees, its creator, and every controller. */
export function canSeeTask(t: IngestionTask, viewerEmail: string, isController: boolean): boolean {
  if (isController) return true;
  const me = viewerEmail.trim().toLowerCase();
  if (me === "") return false;
  return t.createdByEmail === me || t.assignees.some((a) => a.email === me);
}

/** The tasks a viewer's Document-tasks panel lists: open ones they can
 *  see, newest first. */
export function tasksForPanel(all: IngestionTask[], viewerEmail: string, isController: boolean): IngestionTask[] {
  return all.filter((t) => t.status !== "closed" && canSeeTask(t, viewerEmail, isController)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/** A file's term column as it reads NOW: the current name of each term
 *  it carries, found by id. SharePoint keeps a label on the item and
 *  updates it some time after a rename, so the stored label of a renamed
 *  term matches nothing in the picker (the cell opened unselected and
 *  the file looked untagged). Returns null — leave the stored label —
 *  when the feed gave no ids or any id is unknown to the set. */
export function currentTermLabels(values: Record<string, string>, internal: string, nameOf: (termId: string) => string | undefined): string | null {
  const ids = (values[`${internal}#termid`] ?? "").split(";").map((x) => x.trim().toLowerCase()).filter((x) => x !== "");
  if (ids.length === 0) return null;
  const names = ids.map((id) => nameOf(id) ?? "");
  return names.every((n) => n !== "") ? names.join("; ") : null;
}

/** How many closed tasks the panel lists before "Show all n". */
export const CLOSED_SHOWN = 20;

/** The CLOSED tasks a viewer may re-read (their run logs), by the same
 *  rule as the open ones, most recently ended first (2026-11-22: an
 *  ended task left the panel and its log could no longer be reached). */
export function closedTasksForPanel(all: IngestionTask[], viewerEmail: string, isController: boolean): IngestionTask[] {
  const ended = (t: IngestionTask): string => t.closedAt || t.createdAt;
  return all.filter((t) => t.status === "closed" && canSeeTask(t, viewerEmail, isController)).sort((a, b) => (ended(a) < ended(b) ? 1 : ended(a) > ended(b) ? -1 : 0));
}

/** What a file still lacks before it may move: the required internals
 *  whose register value is blank, by label. */
export function missingFor(values: Record<string, string>, required: { internal: string; label: string }[]): string[] {
  return required.filter((r) => (values[r.internal] ?? "").trim() === "").map((r) => r.label);
}

/** The defaults that would fill a file's blanks (what "Fill blanks from
 *  defaults" writes for one row): every default whose column the file
 *  has no value in. */
export function blanksToFill(values: Record<string, string>, defaults: AddFieldValue[]): AddFieldValue[] {
  return defaults.filter((d) => (values[d.internal] ?? "").trim() === "");
}

/** "12 moved · 3 refused" for a log; "" for none. */
export function logSummary(log: RunLogEntry[]): string {
  const moved = log.filter((e) => e.outcome === "moved").length;
  const refused = log.filter((e) => e.outcome === "refused").length;
  const parts: string[] = [];
  if (moved > 0) parts.push(`${moved} moved`);
  if (refused > 0) parts.push(`${refused} refused`);
  return parts.join(" · ");
}

/** The last outcome per file, newest wins — a re-run's refusal replaces
 *  the earlier one; a later "moved" closes the story. */
export function latestByFile(log: RunLogEntry[]): Map<string, RunLogEntry> {
  const out = new Map<string, RunLogEntry>();
  // a run's own "started" mark is no file's outcome
  for (const e of log) if (e.outcome !== "started") out.set(e.file, e);
  return out;
}

/** The check-in comment the audit view reads. */
export function ingestComment(taskName: string, by: string): string {
  return `Ingested — task "${taskName}" by ${by}`;
}

// ---- sub-folders (Ben, 2026-11-01) ------------------------------------------
// A task's folder may hold a tree. The listing walks it; every file lands
// FLAT in the destination; the path is shown, never edited.

/** The file's place under the task folder: "Policies/2024" for
 *  <folder>/Policies/2024/x.pdf; "" at the root or outside the folder. */
export function subFolderOf(serverUrl: string, taskFolder: string): string {
  const root = taskFolder.replace(/\/+$/, "");
  if (root === "" || !serverUrl.startsWith(`${root}/`)) return "";
  const rest = serverUrl.slice(root.length + 1);
  const cut = rest.lastIndexOf("/");
  return cut < 0 ? "" : rest.slice(0, cut);
}

/** The folder a file sits in (server-relative), "" when there is none. */
export function dirOf(serverUrl: string): string {
  const cut = serverUrl.lastIndexOf("/");
  return cut <= 0 ? "" : serverUrl.slice(0, cut);
}

/** "Policies/2024" → "Policies › 2024"; the root reads as the task folder. */
export const ROOT_GROUP_LABEL = "Task folder";
export function folderLabel(path: string): string {
  return path === "" ? ROOT_GROUP_LABEL : path.split("/").join(" › ");
}

/** Files that share a name (case-blind) anywhere in the task: on the flat
 *  landing they would collide, so both are held back until one is renamed. */
export function duplicateNames(files: { uniqueId: string; name: string }[]): Set<string> {
  const byName = new Map<string, string[]>();
  for (const f of files) {
    const k = f.name.trim().toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), f.uniqueId]);
  }
  const out = new Set<string>();
  for (const ids of byName.values()) if (ids.length > 1) for (const id of ids) out.add(id);
  return out;
}

export interface FolderGroup<T> {
  path: string;
  label: string;
  items: T[];
}

/** The files grouped by sub-folder, in order of first appearance (callers
 *  sort by folder then name first); the root group leads when present. */
export function folderGroups<T extends { serverUrl: string }>(files: T[], taskFolder: string): FolderGroup<T>[] {
  const groups = new Map<string, FolderGroup<T>>();
  for (const f of files) {
    const path = subFolderOf(f.serverUrl, taskFolder);
    let g = groups.get(path);
    if (!g) {
      g = { path, label: folderLabel(path), items: [] };
      groups.set(path, g);
    }
    g.items.push(f);
  }
  const all = [...groups.values()];
  const root = all.find((g) => g.path === "");
  return root ? [root, ...all.filter((g) => g !== root)] : all;
}

/** Folder first (the root before any sub-folder), then the name — the
 *  grid's and the sheet's default order. */
export function compareByFolderThenName(a: { serverUrl: string; name: string }, b: { serverUrl: string; name: string }, taskFolder: string): number {
  const fa = subFolderOf(a.serverUrl, taskFolder);
  const fb = subFolderOf(b.serverUrl, taskFolder);
  if (fa !== fb) {
    if (fa === "") return -1;
    if (fb === "") return 1;
    return fa.localeCompare(fb, undefined, { numeric: true, sensitivity: "base" });
  }
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}
