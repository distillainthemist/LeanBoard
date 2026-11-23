// Standard Documents — Dataverse IO for the library configuration rows
// (ben_ltkdoclibrary; plan Phase 1). One row per exposed library; the
// reserved "__app__" row carries the app-level docs config. Presentation
// state only — SharePoint columns are the record.

import { Ben_ltkdoclibrariesService } from "../generated/services/Ben_ltkdoclibrariesService";
import { allWhere, eq, firstWhere, upsertWhere } from "../store/dv";
import {
  APP_LIST_ID,
  RESERVED_LIST_IDS,
  AppDocsConfig,
  DictionaryConflict,
  LibraryConfig,
  LibraryType,
  buildSiteDictionary,
  parseAppDocsConfig,
  parseLibraryConfig,
  resolveLibraryConfig,
  serializeAppDocsConfig,
  serializeLibraryConfig,
  siteKey,
} from "./model";
import { setUatHidden, splitUatLibraries, uatTitle } from "./uatLibraries";
import { currentViewer } from "../runtime";

export interface DocLibrary {
  /** Dataverse row GUID (delete handle). */
  rowId: string;
  /** SharePoint list GUID — the stable identity. */
  listId: string;
  siteUrl: string;
  /** SharePoint title at expose time (display fallback). */
  name: string;
  libType: LibraryType;
  config: LibraryConfig;
}

const TYPES: LibraryType[] = ["standard", "record", "working", "revision", "template", "ingestion"];

// Session cache — library config changes only through the settings tab
// (which invalidates), so repeat #/docs navigation costs no Dataverse
// round-trips (performance contract: repeat navigation feels instant).
let cache: Promise<{
  app: AppDocsConfig;
  libraries: DocLibrary[];
  conflicts: Record<string, DictionaryConflict[]>;
}> | null = null;

export function invalidateDocsCache(): void {
  cache = null;
}

// ---- UAT mode (2026-11-23) ---------------------------------------------
// Who is shown a "UAT only" library: the people assigned to a RUNNING
// UAT run, and super admins. Asked once a session, and only when some
// library carries the tick. Fails CLOSED — a failed read hides the
// library rather than showing a trial library to everyone.
let uatMode: Promise<boolean> | null = null;
export function viewerInUatMode(): Promise<boolean> {
  uatMode ??= (async () => {
    const v = currentViewer();
    if (v === null) return false;
    try {
      const { viewerPerson } = await import("../store/people");
      const me = await viewerPerson(v.objectId).catch(() => null);
      if (me?.role === "superadmin") return true;
      const { myOpenRuns } = await import("../uat/store");
      return (await myOpenRuns(v.email !== "" ? v.email : (me?.email ?? ""))).length > 0;
    } catch {
      return false;
    }
  })();
  return uatMode;
}

/**
 * App config + exposed libraries in one cached read, with every library
 * resolved through its site's column dictionary.
 *
 * The resolution is READ-TIME and pure: a deployment that predates the
 * dictionary has one built from its own libraries on the way past
 * (majority wins, deterministically), so the Documents area behaves the
 * same before and after the upgrade with nothing written. The dictionary
 * is persisted only when an admin saves in Settings — ordinary users
 * need no write permission, and no migration runs behind anyone's back.
 */
export function docsConfig(): Promise<{
  app: AppDocsConfig;
  libraries: DocLibrary[];
  /** Per site: what the migration had to choose between. Surfaced by the
   *  Health section (C4) — a silent migration must still be auditable. */
  conflicts: Record<string, DictionaryConflict[]>;
}> {
  cache ??= (async () => {
    const rows = await allWhere(Ben_ltkdoclibrariesService.getAll);
    const appRow = rows.find((r) => r.ben_listid === APP_LIST_ID);
    const app = parseAppDocsConfig(appRow?.ben_configjson);
    const libraries = rows
      .filter(
        (r) => (r.ben_listid ?? "") !== "" && !RESERVED_LIST_IDS.has(r.ben_listid ?? "")
      )
      .map(mapRow);
    // the dictionary below is built from EVERY library, hidden or not —
    // what a column means must not depend on who is looking
    const everyLibrary = libraries;
    const conflicts: Record<string, DictionaryConflict[]> = {};

    // one dictionary per site — group first, so a second site never
    // borrows the first site's column mapping
    const sites = new Set(libraries.map((l) => siteKey(l.siteUrl || app.siteUrl)));
    for (const key of sites) {
      if (key === "") continue;
      const mine = libraries.filter((l) => siteKey(l.siteUrl || app.siteUrl) === key);
      let dict = app.sites[key];
      if (dict === undefined || dict.columns.length === 0) {
        const built = buildSiteDictionary(mine);
        dict = built.dictionary;
        conflicts[key] = built.conflicts;
        app.sites[key] = dict;
      }
      for (const lib of mine) lib.config = resolveLibraryConfig(lib.config, dict);
    }
    // UAT-only libraries: kept from everyone outside UAT mode, here at
    // the one read every Documents surface starts from; those who do
    // see one read "· UAT" on its name. (Settings reads the rows itself,
    // unfiltered and untagged — listDocLibraries.)
    if (everyLibrary.some((l) => l.config.uatOnly === true)) {
      const split = splitUatLibraries(everyLibrary, await viewerInUatMode());
      setUatHidden(split.hidden);
      for (const l of split.visible) {
        if (l.config.uatOnly === true) l.config = { ...l.config, title: uatTitle(l.config.title !== "" ? l.config.title : l.name) };
      }
      return { app, libraries: split.visible, conflicts };
    }
    setUatHidden([]);
    return { app, libraries, conflicts };
  })();
  cache.catch(() => (cache = null)); // a failed read must not stick
  return cache;
}

export async function appDocsConfig(): Promise<AppDocsConfig> {
  const row = await firstWhere(
    Ben_ltkdoclibrariesService.getAll,
    eq("ben_listid", APP_LIST_ID)
  );
  return parseAppDocsConfig(row?.ben_configjson);
}

/** The fields the term SYNC owns (write-through, the owed flush, the
 *  alignment run): written by background code against a fresh read,
 *  so an editor's older in-memory copy must never save over them
 *  (Ben's production loop, 2026-10-13: a stale copy restored the
 *  unticked company-level box and the owed push, which then recreated
 *  the stray site terms on every open). */
export function adoptSyncFields(into: AppDocsConfig, from: AppDocsConfig): void {
  into.termBindings = from.termBindings;
  into.retiredTerms = from.retiredTerms;
  into.termWritesOwed = from.termWritesOwed;
  into.orgRenames = from.orgRenames;
  into.orgSetCompanyLevel = from.orgSetCompanyLevel;
}

/** An editor's save: its own fields from its copy, the sync-owned
 *  fields from the row as it stands now. */
export async function saveAppDocsConfigKeepingSync(cfg: AppDocsConfig): Promise<void> {
  const fresh = await appDocsConfig();
  adoptSyncFields(cfg, fresh);
  await saveAppDocsConfig(cfg);
  invalidateDocsCache();
}

/** A single-field write: read the row, change it, save it — never an
 *  older copy. Returns the row as saved. */
export async function patchAppDocsConfig(mutate: (cfg: AppDocsConfig) => void): Promise<AppDocsConfig> {
  const fresh = await appDocsConfig();
  mutate(fresh);
  await saveAppDocsConfig(fresh);
  invalidateDocsCache();
  return fresh;
}

export async function saveAppDocsConfig(cfg: AppDocsConfig): Promise<void> {
  await upsertWhere(
    Ben_ltkdoclibrariesService,
    eq("ben_listid", APP_LIST_ID),
    (row) => row.ben_ltkdoclibraryid,
    {
      ben_listid: APP_LIST_ID,
      ben_name: "Documents configuration",
      ben_siteurl: cfg.siteUrl,
      ben_configjson: serializeAppDocsConfig(cfg),
    }
  );
}

function mapRow(r: {
  ben_ltkdoclibraryid?: string;
  ben_listid?: string;
  ben_siteurl?: string;
  ben_name?: string;
  ben_libtype?: string;
  ben_configjson?: string;
}): DocLibrary {
  return {
    rowId: r.ben_ltkdoclibraryid ?? "",
    listId: r.ben_listid ?? "",
    siteUrl: r.ben_siteurl ?? "",
    name: r.ben_name ?? "",
    libType: TYPES.includes((r.ben_libtype ?? "") as LibraryType)
      ? ((r.ben_libtype ?? "") as LibraryType)
      : "standard",
    config: parseLibraryConfig(r.ben_configjson),
  };
}

export async function listDocLibraries(): Promise<DocLibrary[]> {
  const rows = await allWhere(Ben_ltkdoclibrariesService.getAll);
  return rows
    .filter(
      (r) => (r.ben_listid ?? "") !== "" && !RESERVED_LIST_IDS.has(r.ben_listid ?? "")
    )
    .map(mapRow);
}

export async function saveDocLibrary(lib: {
  listId: string;
  siteUrl: string;
  name: string;
  libType: LibraryType;
  config: LibraryConfig;
}): Promise<void> {
  await upsertWhere(
    Ben_ltkdoclibrariesService,
    eq("ben_listid", lib.listId),
    (row) => row.ben_ltkdoclibraryid,
    {
      ben_listid: lib.listId,
      ben_name: lib.name.slice(0, 200),
      ben_siteurl: lib.siteUrl,
      ben_libtype: lib.libType,
      ben_configjson: serializeLibraryConfig(lib.config),
    }
  );
}

/** Unexpose: the row is deleted outright — no orphans (plan proof). */
export async function deleteDocLibrary(rowId: string): Promise<void> {
  await Ben_ltkdoclibrariesService.delete(rowId);
}

/**
 * Warm the Documents caches in the background (Ben, 2026-08-03).
 *
 * The tab's slowest step is not the documents — it is the term walk
 * behind the folder tree and the filter pills, which costs a round trip
 * per level per set. Everything it touches is session-cached, so paying
 * for it while someone reads the hub makes opening Documents feel
 * instant, and paying twice costs nothing.
 *
 * Deliberately unobtrusive: it is called AFTER the first screen paints,
 * it never rejects (a warm-up that surfaced an error would be worse than
 * no warm-up), and it holds no UI. If the user opens Documents mid-flight
 * the screen simply awaits the same cached promises.
 */
export async function warmDocsCaches(): Promise<void> {
  try {
    const { app, libraries } = await docsConfig();
    if (app.siteUrl === "" || libraries.length === 0) return;
    const { fetchTermPaths } = await import("./sp");
    const sets = new Set<string>();
    if (app.orgSetId !== "") sets.add(app.orgSetId);
    for (const lib of libraries) {
      for (const c of lib.config.columns) {
        if (c.available && c.termSetId !== "") sets.add(c.termSetId);
      }
    }
    // same depth/request caps the screen uses, so these are the very
    // promises it will find waiting rather than a near-miss
    await Promise.all(
      [...sets].map((setId) => fetchTermPaths(app.siteUrl, setId, 6, 6000).catch(() => null))
    );
  } catch {
    /* a warm-up never fails loudly */
  }
}
