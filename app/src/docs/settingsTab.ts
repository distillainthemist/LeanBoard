// Standard Documents — the Settings → Documents tab (plan Phase 1).
// Super-admin surface: connect a SharePoint site, choose which document
// libraries LeanBoard exposes, configure each library's presentation
// (display names, view columns, document-management column roles, status
// colours from the app state palette, rendition location), pick the term
// group / Organisation set, and run the org drift report — which since
// 5F is also the sync plan: Apply pushes the app's org tree into the
// term set (create + in-place rename only, never delete).
//
// Loaded ONLY by dynamic import from the settings screen — the import
// gate (rule C) fails the build if a static chain ever reaches the
// SharePoint service from outside src/docs/.

import { appPalettes } from "../store/config";
import { settingsSection } from "../settingsSection";
import * as levelsModel from "./docFlagsModel";
import { el, clear } from "../../../shared/ui/dom";
import { statusGlyph } from "../../../shared/ui/format";
import { draggableRow } from "../../../shared/ui/dragList";
import {
  AppDocsConfig,
  COLUMN_ROLES,
  ColumnConfig,
  ColumnTypeState,
  ConfigurableLibType,
  deriveTypeStates,
  DictionaryConflict,
  mirrorCellsToConfig,
  HealthFinding,
  LIBRARY_TYPES,
  LIFECYCLE_STAGES,
  LifecycleStage,
  lifecycleHealth,
  suggestStageForLabel,
  LibraryConfig,
  LibrarySchema,
  LibraryType,
  SiteColumn,
  SiteDictionary,
  SpField,
  SpLibrary,
  TaxProbe,
  TermPalette,
  buildSiteDictionary,
  colourableSets,
  emptySiteDictionary,
  fieldsFromResponse,
  isDateColumn,
  librariesFromLists,
  mergeColumns,
  dictionaryHealth,
  orgTreePaths,
  paletteKeyFor,
  rekeyPaletteToTerms,
  resolveLibraryConfig,
  orgSyncPlan,
  pathKey,
  seedDefaultColumns,
  siteKey,
  syncSiteDictionary,
} from "./model";
import { executeOrgSync } from "./orgSync";
import { SetAdapter, alignSet, orgAdapter, partialWalk, processAdapter, renderOrphanDecisions } from "./termAlign";
import { flushOwedTermWrites } from "./termWrite";
import { OrphanDecision, createsAfterPairings, decisionCounts } from "./termAlignModel";
import type { TermNode } from "./sp";
import { promptConfirm } from "../prompts";
import {
  deleteTerm,
  fetchFields,
  fetchListRules,
  fetchLibraries,
  fetchTermGroups,
  fetchTermPaths,
  fetchTermSets,
  fetchTermsInSet,
  invalidateTermPaths,
  patchTermLabels,
  fetchTermStoreLanguage,
} from "./sp";
import {
  DocLibrary,
  adoptSyncFields,
  appDocsConfig,
  patchAppDocsConfig,
  saveAppDocsConfigKeepingSync,
  deleteDocLibrary,
  invalidateDocsCache,
  listDocLibraries,
  saveAppDocsConfig,
  saveDocLibrary,
} from "./docsStore";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { companies, orgJson } from "../store/config";
import { renderListPage, searchPage } from "./data";
import { openDialog } from "../../../shared/ui/dialog";
import { buildRenderViewXml, taxonomySearchProperty } from "./rows";

interface Ctx {
  markDirty: () => void;
  markClean: () => void;
  registerSave: (fn: () => Promise<void>) => void;
}

const note = (text: string) => el("div", "app-settings-note", text);
const section = (text: string) => settingsSection(text); // the ONE section head

function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const f = el("div", "app-field");
  f.append(el("span", "app-field-label", label), control);
  if (hint) f.appendChild(el("span", "app-field-hint", hint));
  return f;
}

export async function renderDocsSettings(body: HTMLElement, ctx: Ctx): Promise<void> {
  clear(body);
  body.appendChild(el("div", "app-loading-line", "Loading documents configuration…"));

  let app: AppDocsConfig;
  let exposed: DocLibrary[];
  let palettes: Awaited<ReturnType<typeof appPalettes>>;
  try {
    [app, exposed, palettes] = await Promise.all([
      appDocsConfig(),
      listDocLibraries(),
      appPalettes(),
    ]);
  } catch (e) {
    clear(body);
    body.appendChild(
      note(
        "Documents configuration needs the hosted app (Dataverse and the SharePoint " +
          `connection are host-side). ${String(e).slice(0, 160)}`
      )
    );
    return;
  }
  clear(body);

  // ---- buffered state (written on Save) --------------------------------
  const removedRowIds: string[] = [];
  let discovered: SpLibrary[] = [];
  const fieldsByList = new Map<string, SpField[]>();

  const save = async () => {
    // the manager's cells are authoritative; the per-library flags are
    // their dormant mirror, kept true for the remaining readers
    // (fetch-field lists, dict-less fallbacks). Template libraries and
    // typeless columns pass through untouched.
    const dict = app.sites[siteKey(app.siteUrl)];
    if (dict !== undefined) {
      for (const lib of exposed) {
        lib.config = mirrorCellsToConfig(dict, lib.libType, lib.config);
      }
    }
    await saveAppDocsConfigKeepingSync(app);
    for (const lib of exposed) {
      await saveDocLibrary(lib);
    }
    for (const rowId of removedRowIds.splice(0)) {
      if (rowId !== "") await deleteDocLibrary(rowId);
    }
    // re-read so row GUIDs exist for later deletes
    exposed = await listDocLibraries();
    invalidateDocsCache(); // the #/docs area re-reads on next entry
    invalidateTermPaths(); // a changed group/set must not serve the old tree
    ctx.markClean();
    paintLibraries();
    void paintDictionary();
  };
  ctx.registerSave(save);

  // ---- connection section ----------------------------------------------
  body.appendChild(section("SharePoint connection"));
  body.appendChild(
    note(
      "One site serves all controlled-document libraries. Everything runs as the " +
        "signed-in user — people only ever see what SharePoint already lets them see."
    )
  );
  const siteInput = el("input", "app-input") as HTMLInputElement;
  siteInput.placeholder = "https://<tenant>.sharepoint.com/sites/<site>";
  siteInput.value = app.siteUrl;
  siteInput.addEventListener("input", () => {
    app.siteUrl = siteInput.value.trim().replace(/\/$/, "");
    ctx.markDirty();
  });
  const loadLibs = el("button", "app-btn", "Load libraries") as HTMLButtonElement;
  const siteRow = el("div", "app-docs-siterow");
  siteRow.append(siteInput, loadLibs);
  body.appendChild(field("Site URL", siteRow));

  // ---- section order (Part II S1): LIBRARIES come first — expose, type
  // and title are the first decisions — then the one column manager.
  // Hosts keep the code where it has always lived while the DOM carries
  // the new order; later sections keep appending to body below these.
  const libsHost = el("div", "");
  const colsHost = el("div", "");
  body.append(libsHost, colsHost);

  // ---- document columns: the ONE manager (Part II S1) -------------------
  // Site columns, managed once: what a column is called and means (C1),
  // the order everything reads it in, its dialog sub-heading, and its
  // standing per library TYPE — the merged three-state cell. The old
  // per-library ticks and C5 templates are superseded; until S2/S3
  // finish the cutover, save() mirrors the cells into the per-library
  // configs so every consumer already answers from ONE source.
  colsHost.appendChild(section("Document columns"));
  colsHost.appendChild(
    note(
      "Every library draws on the same site columns — managed once, here. Drag rows " +
        "to set the order properties read in everywhere; group them under sub-headings " +
        "(they become sections in the add and edit dialogs — the register uses the " +
        "order alone). Each type cell says whether the column is hidden there (—), " +
        "available (✓), or in the default view (★). Revision libraries mirror " +
        "standards; template libraries stay fixed."
    )
  );
  const dictBox = el("div", "");
  colsHost.appendChild(dictBox);

  const dictKey = () => siteKey(app.siteUrl);
  const dictionary = (): SiteDictionary =>
    (app.sites[dictKey()] ??= emptySiteDictionary());
  /** What the silent migration had to choose between, for the badges. */
  let migrated: DictionaryConflict[] = [];
  /** internal → the libraries carrying it, from the last dictionary pass. */
  let lastCarriers = new Map<string, string[]>();

  /** Set by the Write access section far below, which only exists once
   *  the whole tab is built — the dictionary paints before then. */
  let fillWriteSel: () => void = () => {};
  let fillMoveSels: () => void = () => {};

  const paintDictionary = async () => {
    clear(dictBox);
    fillWriteSel();
    fillMoveSels();
    if (app.siteUrl === "" || exposed.length === 0) {
      dictBox.appendChild(
        note("Expose a library below first — its columns are what there is to map.")
      );
      return;
    }
    dictBox.appendChild(el("div", "app-loading-line", "Reading columns from every library…"));
    const schemas: LibrarySchema[] = await Promise.all(
      exposed.map(async (lib) => ({
        listId: lib.listId,
        name: lib.config.title !== "" ? lib.config.title : lib.name,
        fields: await loadFields(lib),
      }))
    );
    clear(dictBox);

    const key = dictKey();
    let dict = app.sites[key] ?? emptySiteDictionary();
    if (dict.columns.length === 0) {
      // first open since the upgrade: adopt what the libraries already
      // say, majority winning, and remember every disagreement so the
      // silent migration is still answerable for its choices
      const built = buildSiteDictionary(exposed);
      dict = built.dictionary;
      migrated = built.conflicts;
    }
    // Part II: columns that predate the type cells get them from the
    // per-library past (union — widens, never narrows); persisted when
    // the admin saves, per Part I's silent-migration rules
    const { dictionary: synced0, carriers } = syncSiteDictionary(dict, schemas);
    const synced = deriveTypeStates(synced0, exposed);
    app.sites[key] = synced;
    lastCarriers = carriers;
    // the palettes section needs the live schema to tell a Choice column
    // from a taxonomy one, and repaints whenever the dictionary does
    liveByInternal.clear();
    for (const sc of schemas) for (const f of sc.fields) liveByInternal.set(f.internal, f);

    if (migrated.length > 0) {
      dictBox.appendChild(
        note(
          `${migrated.length} column${migrated.length === 1 ? "" : "s"} were mapped ` +
            "differently in different libraries. The most common answer was kept — " +
            "the ones marked below are worth a look."
        )
      );
    }

    const gridHost = el("div", "");
    dictBox.appendChild(gridHost);

    // the manager's display list: listed groups, orphan groups, then
    // the ungrouped tail (under a pseudo-header once any group exists,
    // so a drop can land there). dict.columns keeps its order within
    // each group; the FLATTENED display order IS the dictionary order.
    type Entry =
      | { kind: "header"; name: string; pseudo: boolean }
      | { kind: "col"; col: SiteColumn };
    const buildEntries = (): Entry[] => {
      const order = [...synced.groups];
      for (const c of synced.columns) {
        if (c.group !== "" && !order.includes(c.group)) order.push(c.group);
      }
      const out: Entry[] = [];
      for (const g of order) {
        out.push({ kind: "header", name: g, pseudo: false });
        for (const c of synced.columns.filter((x) => x.group === g)) {
          out.push({ kind: "col", col: c });
        }
      }
      const loose = synced.columns.filter((x) => x.group === "");
      if (order.length > 0 && loose.length > 0) {
        out.push({ kind: "header", name: "", pseudo: true });
      }
      for (const c of loose) out.push({ kind: "col", col: c });
      return out;
    };
    /** After a drop, the display order becomes THE order: membership
     *  from position under the headers, groups from header sequence,
     *  dict.columns rebuilt flattened. */
    const normalize = (entries: Entry[]) => {
      const groups: string[] = [];
      const cols: SiteColumn[] = [];
      let current = "";
      for (const e of entries) {
        if (e.kind === "header") {
          current = e.name;
          if (e.name !== "" && !groups.includes(e.name)) groups.push(e.name);
        } else {
          e.col.group = current;
          cols.push(e.col);
        }
      }
      synced.groups = groups;
      synced.columns = cols;
      ctx.markDirty();
      paintManager();
    };

    // rebuilt in place on any reorder — no refetch of library fields
    const paintManager = () => {
      clear(gridHost);
      const entries = buildEntries();
      const headCell = (text: string, title: string) => {
        const s = el("span", "app-docs-colhead app-docs-colhead-c", text);
        s.title = title;
        return s;
      };
      const head = el("div", "app-docs-mgrhead");
      head.append(
        el("span", "app-docs-colhead", ""),
        el("span", "app-docs-colhead", "SharePoint column"),
        el("span", "app-docs-colhead", "Display as"),
        el("span", "app-docs-colhead", "Role"),
        headCell("Filter", "Offered in the register's Filters pane"),
        headCell("Std", "Controlled standards — revision libraries mirror this cell"),
        headCell("Rec", "Controlled records"),
        headCell("Wrk", "Working documents"),
        el("span", "app-docs-colhead", "In libraries")
      );
      gridHost.appendChild(head);

      const groupRow = (entry: Entry & { kind: "header" }, index: number) => {
        const row = el("div", "app-docs-mgrgroup");
        // a drop target, never a drag source: the handle is never in
        // the DOM, so the header cannot start a drag of its own
        draggableRow(row, el("span", ""), "dict-cols", index, entries, () => normalize(entries));
        if (entry.pseudo) {
          // the same word the dialogs use for the ungrouped tail
          row.appendChild(el("span", "app-docs-mgrgroupname app-field-hint", "Other"));
          return row;
        }
        const at = () => synced.groups.indexOf(entry.name);
        const moveGroup = (dir: -1 | 1, glyph: string) => {
          const b = el("button", "app-docs-movebtn", glyph) as HTMLButtonElement;
          const a = at();
          b.disabled = dir === -1 ? a <= 0 : a === synced.groups.length - 1 || a < 0;
          b.setAttribute("aria-label", `Move group ${entry.name} ${dir === -1 ? "up" : "down"}`);
          b.addEventListener("click", () => {
            const from = at();
            const to = from + dir;
            if (from < 0 || to < 0 || to >= synced.groups.length) return;
            synced.groups.splice(from, 1);
            synced.groups.splice(to, 0, entry.name);
            ctx.markDirty();
            paintManager();
          });
          return b;
        };
        const nameIn = el("input", "app-input app-docs-mgrgroupinput") as HTMLInputElement;
        nameIn.value = entry.name;
        nameIn.addEventListener("change", () => {
          const next = nameIn.value.trim();
          if (next === "" || next === entry.name || synced.groups.includes(next)) {
            nameIn.value = entry.name;
            return;
          }
          const a = at();
          if (a >= 0) synced.groups[a] = next;
          for (const c of synced.columns) if (c.group === entry.name) c.group = next;
          ctx.markDirty();
          paintManager();
        });
        const del = el("button", "app-docs-movebtn", "✕") as HTMLButtonElement;
        del.title = "Remove the group — its columns keep their places, ungrouped";
        del.addEventListener("click", () => {
          for (const c of synced.columns) if (c.group === entry.name) c.group = "";
          synced.groups = synced.groups.filter((g) => g !== entry.name);
          ctx.markDirty();
          paintManager();
        });
        row.append(moveGroup(-1, "▲"), moveGroup(1, "▼"), nameIn, del);
        return row;
      };

      const colRow = (col: SiteColumn, index: number) => {
        const live = schemas.flatMap((s) => s.fields).find((f) => f.internal === col.internal);
        const clash = migrated.filter((m) => m.internal === col.internal);
        if (clash.length > 0) {
          gridHost.appendChild(
            el(
              "div",
              "app-docs-dictwarn",
              clash
                .map(
                  (m) =>
                    `${col.internal}: libraries disagreed on ${m.field} (` +
                    m.values.map((v) => `${v.value === "" ? "—" : v.value} ×${v.count}`).join(", ") +
                    `) — kept “${m.chosen === "" ? "—" : m.chosen}”`
                )
                .join(" · ")
            )
          );
        }
        const row = el("div", "app-docs-mgrrow");
        // row order = how properties read, in the add form and the
        // viewer's properties pane alike (Ben, 2026-08-04); the drag
        // carries a row anywhere, including under another sub-heading
        const grip = el("span", "app-docs-grip", "⠿");
        grip.title = "Drag to reorder or regroup";
        draggableRow(row, grip, "dict-cols", index, entries, () => normalize(entries));
        row.appendChild(grip);
        const colName = el("span", "app-docs-colname", `${live?.title ?? col.internal} · ${col.internal}`);
        // the links column must be multiple lines of text — a single
        // line (255 characters) holds one link (UAT DOC-030, 2026-10-26)
        if (col.role === "linkedDocuments" && live?.type === "Text") {
          colName.appendChild(
            el("span", "app-field-hint app-docs-colwarn", " · single line of text (255 characters): one link at most — change it to multiple lines of text in the library's settings")
          );
        }
        row.appendChild(colName);
        const label = el("input", "app-input") as HTMLInputElement;
        label.placeholder = live?.title ?? col.internal;
        label.value = col.label;
        label.addEventListener("input", () => {
          col.label = label.value.trim();
          ctx.markDirty();
        });
        row.appendChild(label);
        const role = el("select", "app-input") as HTMLSelectElement;
        for (const r of COLUMN_ROLES) {
          const o = el("option", "", r.label) as HTMLOptionElement;
          o.value = r.key;
          role.appendChild(o);
        }
        role.value = COLUMN_ROLES.some((r) => r.key === col.role) ? col.role : "";
        role.addEventListener("change", () => {
          col.role = role.value;
          ctx.markDirty();
        });
        row.appendChild(role);
        // only a column that CAN filter is worth offering as one: a
        // term set to pick from, or a date to bound (Ben, 2026-08-03)
        const canFilter = col.termSetId !== "" || isDateColumn(col);
        const filt = el("input", "") as HTMLInputElement;
        filt.type = "checkbox";
        filt.checked = canFilter && col.filterable;
        filt.disabled = !canFilter;
        filt.title = canFilter
          ? "Offered in the register's Filters pane"
          : "Only managed-metadata and date columns can filter";
        filt.addEventListener("change", () => {
          col.filterable = filt.checked;
          ctx.markDirty();
        });
        row.appendChild(filt);
        // the merged three-state cell (Part II): hidden — · available ✓
        // · in the default view ★, cycled by click
        const typeCell = (t: ConfigurableLibType, titleName: string) => {
          const cycle: (ColumnTypeState | undefined)[] = [undefined, "on", "default"];
          const b = el("button", "app-docs-typecell") as HTMLButtonElement;
          const paint = () => {
            const s = col.types?.[t];
            b.textContent = s === "default" ? "★" : s === "on" ? "✓" : "—";
            b.className = `app-docs-typecell${
              s === "default" ? " app-docs-typecell-def" : s === "on" ? " app-docs-typecell-on" : ""
            }`;
            b.title = `${titleName}: ${
              s === "default" ? "in the default view" : s === "on" ? "available" : "hidden"
            } — click to change`;
          };
          b.addEventListener("click", () => {
            const cur = col.types?.[t];
            const types = { ...(col.types ?? {}) };
            const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
            if (next === undefined) delete types[t];
            else types[t] = next;
            col.types = types;
            // the legacy flag follows the cells until S2 re-points
            // its readers — hidden everywhere = unavailable
            col.available = Object.keys(types).length > 0;
            ctx.markDirty();
            paint();
          });
          paint();
          return b;
        };
        row.append(
          typeCell("standard", "Standards"),
          typeCell("record", "Records"),
          typeCell("working", "Working documents")
        );
        // which libraries actually carry it — a column missing from one
        // library is the quiet kind of drift, so it is stated plainly
        const who = carriers.get(col.internal) ?? [];
        const where = el(
          "span",
          `app-docs-colwhere${who.length < exposed.length ? " app-docs-colwhere-part" : ""}`,
          who.length === exposed.length ? `All ${who.length}` : `${who.length} of ${exposed.length}`
        );
        where.title = who.length > 0 ? who.join(", ") : "No library carries this column";
        row.appendChild(where);
        return row;
      };

      entries.forEach((entry, i) => {
        gridHost.appendChild(entry.kind === "header" ? groupRow(entry, i) : colRow(entry.col, i));
      });

      const addGroup = el("button", "app-btn", "＋ Add group") as HTMLButtonElement;
      addGroup.addEventListener("click", () => {
        let name = "New group";
        let n = 2;
        while (synced.groups.includes(name)) name = `New group ${n++}`;
        synced.groups.push(name);
        ctx.markDirty();
        paintManager();
      });
      gridHost.appendChild(addGroup);
    };
    paintManager();
    paintPalettes();
    paintLifecycle();
    paintCadence();
    paintHealth();
    // repaints itself when it lands — nothing waits on it
    void runTaxProbe();
  };

  // ---- term sets & colours (C2) ----------------------------------------
  // One palette per TERM SET, not per library: the same set used by three
  // libraries had three colour maps free to disagree, and they were keyed
  // by label, so renaming a term detached its colour silently.
  // the term-set tiles live INSIDE the Term store section (Ben,
  // 2026-10-12: one section — the store, the synced sets, then the sets)
  const palNote = note(
    "Each set's terms, synonyms, translations and colours are managed in its tile. Colours come from Branding's state palette, so a document status and a board status of the same name look alike; the glyph carries as much as the colour."
  );
  const palBox = el("div", "");

  /** Live schema by internal name, filled by the dictionary pass — it is
   *  what tells a Choice column from a taxonomy one. */
  const liveByInternal = new Map<string, SpField>();
  /** Term values per set, read once each per settings visit. */
  const termsBySet = new Map<string, Promise<{ id: string; label: string }[]>>();

  const termsInSet = (setId: string): Promise<{ id: string; label: string }[]> => {
    let hit = termsBySet.get(setId);
    if (hit === undefined) {
      hit = fetchTermsInSet(app.siteUrl, setId).then((r) => {
        const rows = Array.isArray((r.data as { value?: unknown[] })?.value)
          ? ((r.data as { value: unknown[] }).value as Record<string, unknown>[])
          : [];
        return rows
          .map((t) => {
            const labels = t.labels as { name?: string; isDefault?: boolean }[] | undefined;
            const def = Array.isArray(labels)
              ? (labels.find((l) => l.isDefault) ?? labels[0])
              : undefined;
            return { id: typeof t.id === "string" ? t.id : "", label: (def?.name ?? "").trim() };
          })
          .filter((t) => t.id !== "" && t.label !== "");
      });
      hit.catch(() => termsBySet.delete(setId));
      termsBySet.set(setId, hit);
    }
    return hit;
  };

  /** The stored palette for a key, created on first colour. */
  const paletteAt = (key: string): TermPalette => {
    const d = dictionary();
    let p = d.palettes.find((x) => x.setId === key);
    if (p === undefined) {
      p = { setId: key, setName: "", entries: {} };
      d.palettes.push(p);
    }
    return p;
  };

  /** Open the term manager for a set: the columns reading it feed the
   *  usage count; the exposed libraries bound the search. */
  const openManager = async (setId: string, setName: string, paletteKey = setId) => {
    const { openTermManager } = await import("./termManager");
    const pal = paletteKey !== "" ? paletteAt(paletteKey) : null;
    openTermManager({
      site: app.siteUrl,
      setId,
      setName,
      structureLocked: setId !== "" && (setId === app.orgSetId || setId === app.processSetId),
      columnsUsingSet: dictionary().columns.filter((c) => c.termSetId === setId).map((c) => c.internal),
      listIds: exposed.filter((l) => l.libType !== "template" && l.libType !== "ingestion").map((l) => l.listId),
      onChanged: () => {
        termsBySet.delete(setId);
      },
      // colours: the site state palette, this set's entries, saved with
      // the settings bar like every palette change
      palette: pal
        ? {
            states: palettes.states.map((p) => ({ key: p.key, label: p.label, color: p.color })),
            entries: pal.entries,
            glyphFor: statusGlyph,
            // a colour set in the manager is SAVED at once (Ben, 2026-10-12:
            // "I can see us missing this step") — a short debounce, so a
            // glyph typed letter by letter is one write
            onChange: (termId, label, entry) => {
              if (entry === null) delete pal.entries[termId];
              else pal.entries[termId] = { color: entry.color, glyph: entry.glyph, label };
              repaintPaletteCounts();
              if (paletteSaveTimer) clearTimeout(paletteSaveTimer);
              return new Promise<void>((resolve, reject) => {
                paletteSaveTimer = setTimeout(() => {
                  saveAppDocsConfigKeepingSync(app)
                    .then(() => {
                      invalidateDocsCache();
                      resolve();
                    })
                    .catch(reject);
                }, 400);
              });
            },
          }
        : undefined,
    });
  };
  /** The one-line cards re-read their "n values coloured" after the
   *  manager changes a colour. */
  let repaintPaletteCounts: () => void = () => {};
  let paletteSaveTimer: ReturnType<typeof setTimeout> | null = null;
  const paletteCard = (key: string, setId: string, cols: SiteColumn[], setName = ""): HTMLElement => {
    const box = el("div", "app-docs-palcard");
    const head = el("button", "app-docs-palhead") as HTMLButtonElement;
    const colNames = cols
      .map((c) => (c.label !== "" ? c.label : (liveByInternal.get(c.internal)?.title ?? c.internal)))
      .join(", ");
    const name = setName !== "" ? setName : colNames;
    const caret = el("span", "app-docs-palcaret", "▸");
    const count = el("span", "app-field-hint", "");
    const paintCount = () => {
      const n = Object.keys(paletteAt(key).entries).length;
      count.textContent = n === 0 ? "no colours set" : `${n} value${n === 1 ? "" : "s"} coloured`;
    };
    paintCount();
    const prevRepaint = repaintPaletteCounts;
    repaintPaletteCounts = () => {
      prevRepaint();
      paintCount();
    };
    head.append(caret, el("span", "app-docs-palname", name), count);
    const rows = el("div", "app-docs-palbody");
    rows.style.display = "none";
    let filled = false;
    head.addEventListener("click", () => {
      const open = rows.style.display === "none";
      rows.style.display = open ? "" : "none";
      caret.textContent = open ? "▾" : "▸";
      if (open && !filled) {
        filled = true;
        void fill();
      }
    });

    /** One value's colour + glyph. `entryKey` is the term GUID where
     *  there is one, so a renamed term keeps its colour. */
    const drawRow = (entryKey: string, label: string) => {
      const row = el("div", "app-docs-statusrow");
      row.appendChild(el("span", "app-docs-statusval", label));
      const pal = paletteAt(key);
      const pick = el("select", "app-input") as HTMLSelectElement;
      const none = el("option", "", "— no colour —") as HTMLOptionElement;
      none.value = "";
      pick.appendChild(none);
      for (const p of palettes.states) {
        const o = el("option", "", p.label) as HTMLOptionElement;
        o.value = p.key;
        pick.appendChild(o);
      }
      pick.value = pal.entries[entryKey]?.color ?? "";
      const swatch = el("span", "app-docs-statusswatch");
      const paintSwatch = () => {
        const hit = palettes.states.find((p) => p.key === pick.value);
        swatch.style.background = hit?.color ?? "transparent";
      };
      paintSwatch();
      const glyph = el("input", "app-input app-docs-palglyph") as HTMLInputElement;
      glyph.maxLength = 2;
      // the placeholder shows what the built-in vocabulary would use, so
      // a site only types a glyph where it wants a different one
      glyph.placeholder = statusGlyph(label) || "—";
      glyph.value = pal.entries[entryKey]?.glyph ?? "";
      glyph.title = "Shown before the value; blank uses the built-in match";
      const write = () => {
        const p = paletteAt(key);
        if (pick.value === "" && glyph.value.trim() === "") delete p.entries[entryKey];
        else p.entries[entryKey] = { color: pick.value, glyph: glyph.value.trim(), label };
        paintSwatch();
        paintCount();
        ctx.markDirty();
      };
      pick.addEventListener("change", write);
      glyph.addEventListener("input", write);
      row.append(pick, swatch, glyph);
      rows.appendChild(row);
    };

    const fill = async () => {
      clear(rows);
      rows.appendChild(el("div", "app-field-hint", "Reading values…"));
      let values: { key: string; label: string }[];
      if (setId !== "") {
        const terms = await termsInSet(setId);
        // colours migrated from the old per-library maps are keyed by
        // label; now that the term store has answered, key them properly
        const fixed = rekeyPaletteToTerms(paletteAt(key), terms);
        const d = dictionary();
        d.palettes = d.palettes.map((p) => (p.setId === key ? fixed : p));
        values = terms.map((t) => ({ key: t.id, label: t.label }));
      } else {
        // a Choice column has no GUIDs — its own text is the key
        const choices = cols.flatMap((c) => liveByInternal.get(c.internal)?.choices ?? []);
        values = [...new Set(choices)].map((v) => ({ key: v, label: v }));
      }
      clear(rows);
      if (values.length === 0) {
        rows.appendChild(note("No values could be read for this column."));
        return;
      }
      for (const v of values) drawRow(v.key, v.label);
      // a colour against a value the column no longer offers is invisible
      // and un-removable; C4 reports these, and this clears them
      const known = new Set(values.map((v) => v.key));
      const stale = Object.entries(paletteAt(key).entries).filter(([k]) => !known.has(k));
      if (stale.length > 0) {
        const warn = note(
          `Not offered by this column any more: ${stale
            .map(([k, e]) => (e.label !== "" ? e.label : k))
            .join(", ")}`
        );
        const drop = el("button", "app-btn", "Remove") as HTMLButtonElement;
        drop.addEventListener("click", () => {
          const p = paletteAt(key);
          for (const [k] of stale) delete p.entries[k];
          ctx.markDirty();
          paintCount();
          void fill();
        });
        warn.appendChild(drop);
        rows.appendChild(warn);
      }
    };

    // the term manager (2026-10-12): the set's terms, synonyms and
    // translations, a sheet of its own; the Organisation set's structure
    // is locked there (the sync owns it)
    const manage = el("button", "app-link app-docs-palmanage", "Manage terms & colours…") as HTMLButtonElement;
    manage.type = "button";
    manage.title = "The hierarchy, labels, synonyms, translations, descriptions — and each term's colour";
    manage.addEventListener("click", (e) => {
      e.stopPropagation();
      void openManager(setId, name, key);
    });
    // a term set is a TILE (Ben, 2026-10-12: "a simple tile with a little
    // edit symbol"): its name and ✎, the whole tile opening the manager,
    // where its terms and colours live. Choice columns have no terms,
    // so their value rows stay as cards below.
    if (setId !== "") {
      const tile = el("button", "app-docs-settile") as HTMLButtonElement;
      tile.type = "button";
      tile.title = `Manage ${name}: terms, synonyms, translations, colours`;
      const text = el("span", "app-docs-settile-text");
      text.appendChild(el("span", "app-docs-settile-name", name));
      // which column reads the set — the Organisation / Process area
      // bindings say so too; a set nothing reads yet says that honestly
      const role = setId === app.orgSetId ? "Organisation set" : setId === app.processSetId ? "Process area set" : "";
      const sub = [role, colNames !== "" && colNames !== name ? `read by ${colNames}` : colNames === "" ? "no column reads it yet" : ""].filter((x) => x !== "").join(" · ");
      if (sub !== "") text.appendChild(el("span", "app-docs-settile-sub", sub));
      tile.append(text, el("span", "app-docs-settile-edit", "✎"));
      tile.addEventListener("click", () => void openManager(setId, name, key));
      return tile;
    }
    box.append(head, manage, rows);
    return box;
  };

  /** The term group's sets as the term store names them — so the tiles
   *  list EVERY set in the group, not only the ones a column reads
   *  (Ben, 2026-10-12: "Process not available?"). Filled by loadSets. */
  let groupSets: { id: string; name: string }[] = [];
  const paintPalettes = () => {
    clear(palBox);
    const dict = dictionary();
    const sets = colourableSets(dict);
    // Choice columns are colourable too, and only the live schema knows
    // which columns those are
    const choiceCols = dict.columns.filter(
      (c) =>
        c.available &&
        c.termSetId === "" &&
        (liveByInternal.get(c.internal)?.choices.length ?? 0) > 0
    );
    if (sets.length === 0 && choiceCols.length === 0 && groupSets.length === 0) {
      palBox.appendChild(
        note("Nothing to colour yet — this appears once the libraries above have loaded.")
      );
      return;
    }
    const tiles = el("div", "app-docs-settiles");
    const bySet = new Map(sets.map((s) => [s.setId, s]));
    // the group's sets first, in the term store's order; a set no column
    // reads yet (the new Process area set) still has its tile; then any
    // column-read set outside the group
    for (const g of groupSets) {
      const s = bySet.get(g.id);
      tiles.appendChild(paletteCard(s?.key ?? g.id, g.id, s?.columns ?? [], g.name));
      bySet.delete(g.id);
    }
    for (const s of bySet.values()) tiles.appendChild(paletteCard(s.key, s.setId, s.columns));
    palBox.appendChild(tiles);
    for (const c of choiceCols) {
      palBox.appendChild(paletteCard(paletteKeyFor("", c.internal), "", [c]));
    }
  };

  // The C5 "View templates" section stood here — RETIRED (Part II S3):
  // the manager's per-type cells are what a library of each type opens
  // with, so the templates were a second answer to the same question.
  // dict.templates stays stored (never destroyed): deriveTypeStates
  // still reads it when migrating a pre-Part-II dictionary.

  // ---- libraries section (rendered FIRST — Part II S1) ------------------
  libsHost.appendChild(section("Libraries"));
  const libsNote = note(
    "Tick a library to expose it in LeanBoard, then configure how it presents. " +
      "Unticking removes its configuration row entirely."
  );
  libsHost.appendChild(libsNote);
  const libsBox = el("div", "app-dept-list");
  libsHost.appendChild(libsBox);

  const typeLabel = (t: LibraryType) =>
    LIBRARY_TYPES.find((x) => x.key === t)?.label ?? t;

  const loadFields = async (lib: { listId: string; siteUrl: string }): Promise<SpField[]> => {
    const cached = fieldsByList.get(lib.listId);
    if (cached) return cached;
    const r = await fetchFields(lib.siteUrl, lib.listId);
    const fields = r.ok ? fieldsFromResponse(r.data) : [];
    fieldsByList.set(lib.listId, fields);
    return fields;
  };

  const configPanel = async (lib: DocLibrary, host: HTMLElement) => {
    clear(host);
    host.appendChild(el("div", "app-loading-line", "Loading columns…"));
    const live = await loadFields(lib);
    clear(host);
    if (live.length === 0) {
      host.appendChild(note("Columns could not be loaded (see the site URL, or try again in the hosted app)."));
    }
    // the versioning rule the lifecycle leans on (2026-10-26, UAT
    // DOC-031: the UAT library kept major versions only, so every
    // check-in published and no draft could exist)
    if (lib.libType === "standard") {
      void fetchListRules(lib.siteUrl, lib.listId).then((r) => {
        const d = (r.data ?? {}) as { EnableVersioning?: unknown; EnableMinorVersions?: unknown; EnableModeration?: unknown };
        if (!r.ok || !host.isConnected) return;
        const lines: string[] = [];
        if (d.EnableVersioning !== true) lines.push("Versioning is OFF — no history, no drafts.");
        else if (d.EnableMinorVersions !== true) lines.push("Major versions only — every check-in publishes a major and a draft revision cannot exist. Turn on \"Create major and minor (draft) versions\" in the library's versioning settings.");
        if (d.EnableModeration !== true) lines.push("Content approval is OFF — readers see drafts as soon as they are checked in.");
        if (lines.length > 0) {
          const warn = note(lines.join(" "));
          warn.classList.add("app-docs-colwarn");
          host.insertBefore(warn, host.firstChild);
        }
      });
    }
    // merge the live schema, then let the site dictionary say what each
    // column IS (label, role, availability); this library decides only
    // which of them its own register shows
    lib.config.columns = mergeColumns(lib.config.columns, live);
    lib.config = resolveLibraryConfig(lib.config, dictionary());
    // the type's cells seed the flags when a dictionary exists (Part II
    // S3); the C5 seeder only serves a site with no dictionary yet
    lib.config =
      dictionary().columns.length > 0
        ? mirrorCellsToConfig(dictionary(), lib.libType, lib.config)
        : seedDefaultColumns(lib.config, lib.libType);
    const liveByName = new Map(live.map((f) => [f.internal, f]));

    const title = el("input", "app-input") as HTMLInputElement;
    title.placeholder = lib.name;
    title.value = lib.config.title;
    title.addEventListener("input", () => {
      lib.config.title = title.value.trim();
      ctx.markDirty();
    });
    host.appendChild(field("Display name", title, "Shown in LeanBoard; blank keeps the SharePoint name."));

    const type = el("select", "app-input") as HTMLSelectElement;
    for (const t of LIBRARY_TYPES) {
      const o = el("option", "", t.label) as HTMLOptionElement;
      o.value = t.key;
      type.appendChild(o);
    }
    type.value = lib.libType;
    type.addEventListener("change", () => {
      lib.libType = type.value as LibraryType;
      // the type's cells become this library's column truth (Part II
      // S3) — the mirror keeps the dormant per-library flags honest
      lib.config = mirrorCellsToConfig(dictionary(), lib.libType, lib.config);
      ctx.markDirty();
    });
    host.appendChild(
      field(
        "Library type",
        type,
        "Sets the document-management behaviour this library gets (records never revise; working documents check out)."
      )
    );

    const rendition = el("input", "app-input") as HTMLInputElement;
    rendition.placeholder = "e.g. Renditions";
    rendition.value = lib.config.renditionPath;
    rendition.addEventListener("input", () => {
      lib.config.renditionPath = rendition.value.trim();
      ctx.markDirty();
    });
    host.appendChild(
      field(
        "PDF rendition folder",
        rendition,
        "Where approved, watermarked PDF copies live (used once approvals arrive)."
      )
    );

    // The per-library "View columns" grid stood here — RETIRED (Part II
    // S3): which columns a library shows is its TYPE's answer now, set
    // in the Document columns manager's cells. The panel keeps only
    // what is genuinely this library's own: type, title, rendition.
    host.appendChild(
      note(
        "Columns, order and the default view are managed once under Document columns " +
          "— this library follows its type's cells there."
      )
    );
  };

  const paintLibraries = () => {
    clear(libsBox);
    const byId = new Map(exposed.map((l) => [l.listId, l]));
    const all: { id: string; title: string; itemCount: number | null }[] = [];
    for (const d of discovered) all.push({ id: d.id, title: d.title, itemCount: d.itemCount });
    for (const l of exposed) {
      if (!discovered.some((d) => d.id === l.listId)) {
        all.push({ id: l.listId, title: l.name, itemCount: null });
      }
    }
    if (all.length === 0) {
      libsBox.appendChild(note("No libraries yet — set the site URL and Load libraries."));
      return;
    }
    for (const item of all) {
      const row = el("div", "app-docs-librow");
      const head = el("div", "app-docs-libhead");
      const tick = el("input", "") as HTMLInputElement;
      tick.type = "checkbox";
      tick.checked = byId.has(item.id);
      const name = el("span", "app-docs-libname", item.title);
      const meta = el(
        "span",
        "app-field-hint",
        byId.has(item.id)
          ? typeLabel(byId.get(item.id)!.libType)
          : item.itemCount === null
            ? "not on this site?"
            : `${item.itemCount} item(s)`
      );
      head.append(tick, name, meta);
      row.appendChild(head);
      const panel = el("div", "app-docs-libpanel");
      row.appendChild(panel);

      const openPanel = () => {
        const lib = byId.get(item.id);
        if (lib) void configPanel(lib, panel);
        else clear(panel);
      };

      tick.addEventListener("change", () => {
        if (tick.checked) {
          const lib: DocLibrary = {
            rowId: "",
            listId: item.id,
            siteUrl: app.siteUrl,
            name: item.title,
            libType: "standard",
            config: { title: "", columns: [], statusColors: {}, renditionPath: "" },
          };
          exposed.push(lib);
          byId.set(item.id, lib);
        } else {
          const lib = byId.get(item.id);
          if (lib) {
            if (lib.rowId !== "") removedRowIds.push(lib.rowId);
            exposed = exposed.filter((l) => l !== lib);
            byId.delete(item.id);
          }
        }
        ctx.markDirty();
        meta.textContent = tick.checked ? typeLabel("standard") : "";
        openPanel();
      });
      head.addEventListener("click", (e) => {
        if (e.target === tick) return;
        if (byId.has(item.id)) {
          panel.classList.toggle("app-docs-libpanel-open");
          if (panel.childElementCount === 0) openPanel();
        }
      });
      libsBox.appendChild(row);
    }
  };

  loadLibs.addEventListener("click", () => {
    void (async () => {
      loadLibs.disabled = true;
      loadLibs.textContent = "Loading…";
      const r = await fetchLibraries(app.siteUrl);
      loadLibs.disabled = false;
      loadLibs.textContent = "Load libraries";
      if (!r.ok) {
        libsNote.textContent = `Could not list libraries: ${r.status}`;
        return;
      }
      discovered = librariesFromLists(r.data);
      libsNote.textContent =
        "Tick a library to expose it in LeanBoard, then configure how it presents. " +
        "Unticking removes its configuration row entirely.";
      paintLibraries();
    })();
  });
  paintLibraries();
  // the dictionary is built from what the exposed libraries carry, so it
  // paints after them and repaints whenever that set changes
  void paintDictionary();

  // ---- term store section ----------------------------------------------
  body.appendChild(section("Term store"));
  body.appendChild(
    note(
      "Managed columns read their values from term sets under one group. The sets " +
        "LeanBoard mirrors from its own data (the organisation; the process areas to come) " +
        "are chosen here and synced below; every set is managed from its tile."
    )
  );
  const termStoreHost = el("div", "app-docs-termstore");
  body.appendChild(termStoreHost);
  const groupSel = el("select", "app-input") as HTMLSelectElement;
  const setSel = el("select", "app-input") as HTMLSelectElement;
  const seedOption = (sel: HTMLSelectElement, id: string, name: string) => {
    clear(sel);
    const o = el("option", "", name === "" ? "—" : name) as HTMLOptionElement;
    o.value = id;
    sel.appendChild(o);
  };
  seedOption(groupSel, app.termGroupId, app.termGroupName);
  seedOption(setSel, app.orgSetId, app.orgSetName);
  // the Process area set (term-store-proposal §6, step 5): mirrors the
  // app's process model the way the Organisation set mirrors the org
  const procSetSel = el("select", "app-input") as HTMLSelectElement;
  seedOption(procSetSel, app.processSetId, app.processSetName);

  /**
   * Fill the set dropdown for the current group. This ran ONLY inside
   * the group-change handler before, so with a SAVED group the sets
   * never loaded and the dropdown sat on "—" forever (Ben's screenshot).
   * Now it also runs after Load groups and on opening the tab with a
   * saved group. A leading "—" keeps "no set chosen" an explicit state —
   * nothing is auto-assigned behind the maker's back.
   */
  const loadSets = async () => {
    if (app.termGroupId === "") return;
    const r = await fetchTermSets(app.siteUrl, app.termGroupId);
    const sets = Array.isArray((r.data as { value?: unknown[] })?.value)
      ? ((r.data as { value: unknown[] }).value as {
          id?: string;
          localizedNames?: { name?: string }[];
        }[])
      : [];
    if (!r.ok) return; // keep whatever is seeded rather than blanking
    groupSets = sets.map((s) => ({ id: s.id ?? "", name: s.localizedNames?.[0]?.name ?? "" })).filter((s) => s.id !== "");
    paintPalettes();
    clear(setSel);
    const dash = el("option", "", "—") as HTMLOptionElement;
    dash.value = "";
    setSel.appendChild(dash);
    for (const s of sets) {
      const o = el("option", "", s.localizedNames?.[0]?.name ?? "") as HTMLOptionElement;
      o.value = s.id ?? "";
      setSel.appendChild(o);
    }
    setSel.value = sets.some((s) => s.id === app.orgSetId) ? app.orgSetId : "";
    clear(procSetSel);
    const dash2 = el("option", "", "—") as HTMLOptionElement;
    dash2.value = "";
    procSetSel.appendChild(dash2);
    for (const s of sets) {
      const o = el("option", "", s.localizedNames?.[0]?.name ?? "") as HTMLOptionElement;
      o.value = s.id ?? "";
      procSetSel.appendChild(o);
    }
    procSetSel.value = sets.some((s) => s.id === app.processSetId) ? app.processSetId : "";
  };
  if (app.termGroupId !== "") void loadSets();

  const loadGroups = el("button", "app-btn", "Load groups") as HTMLButtonElement;
  loadGroups.addEventListener("click", () => {
    void (async () => {
      const r = await fetchTermGroups(app.siteUrl);
      const groups = Array.isArray((r.data as { value?: unknown[] })?.value)
        ? ((r.data as { value: unknown[] }).value as { id?: string; name?: string }[])
        : [];
      if (!r.ok || groups.length === 0) {
        loadGroups.textContent = r.ok ? "No groups found" : "Failed — try again";
        return;
      }
      clear(groupSel);
      // "—" first when nothing is saved, so the display never claims a
      // selection the config does not hold
      if (!groups.some((g) => g.id === app.termGroupId)) {
        const dash = el("option", "", "—") as HTMLOptionElement;
        dash.value = "";
        groupSel.appendChild(dash);
      }
      for (const g of groups) {
        const o = el("option", "", g.name ?? "") as HTMLOptionElement;
        o.value = g.id ?? "";
        groupSel.appendChild(o);
      }
      if (groups.some((g) => g.id === app.termGroupId)) {
        groupSel.value = app.termGroupId;
        void loadSets();
      }
      loadGroups.textContent = "Load groups";
    })();
  });
  groupSel.addEventListener("change", () => {
    app.termGroupId = groupSel.value;
    app.termGroupName =
      groupSel.value === "" ? "" : (groupSel.selectedOptions[0]?.textContent ?? "");
    // a different group invalidates the saved set — explicit re-pick
    app.orgSetId = "";
    app.orgSetName = "";
    seedOption(setSel, "", "");
    app.processSetId = "";
    app.processSetName = "";
    seedOption(procSetSel, "", "");
    ctx.markDirty();
    void loadSets();
  });
  procSetSel.addEventListener("change", () => {
    app.processSetId = procSetSel.value;
    app.processSetName = procSetSel.value === "" ? "" : (procSetSel.selectedOptions[0]?.textContent ?? "");
    ctx.markDirty();
  });
  setSel.addEventListener("change", () => {
    app.orgSetId = setSel.value;
    app.orgSetName =
      setSel.value === "" ? "" : (setSel.selectedOptions[0]?.textContent ?? "");
    ctx.markDirty();
  });
  // write-through's debt (term-store-proposal §8): a push that could not
  // land is flushed here, where a super admin can see the outcome
  const owedSets = Object.entries(app.termWritesOwed);
  if (owedSets.length > 0) {
    const owedBox = el("div", "app-docs-health app-docs-health-warn app-docs-syncnow", `${owedSets.length === 1 ? "A term-set push is" : `${owedSets.length} term-set pushes are`} owed (${owedSets.map(([id, o]) => `${id === app.orgSetId ? "Organisation" : id === app.processSetId ? "Process area" : id.slice(0, 8)}: ${o.reason || "could not land"}${o.retire.length > 0 ? `, ${o.retire.length} retirement${o.retire.length === 1 ? "" : "s"}` : ""}`).join("; ")}). Pushing now…`);
    termStoreHost.appendChild(owedBox);
    void flushOwedTermWrites().then(async (outs) => {
      // the flush wrote bindings and settled the debt on a fresh copy —
      // this tab's copy adopts them before anything here saves
      adoptSyncFields(app, await appDocsConfig().catch(() => app));
      companyLevel.checked = app.orgSetCompanyLevel;
      const still = outs.filter((o) => o.owed);
      owedBox.textContent = still.length === 0 ? `✓ ${outs.map((o) => o.summary).join(" · ")}` : still.map((o) => o.summary).join(" · ") + " — the signed-in account needs contributor rights on the set; Align term sets retries.";
      if (still.length === 0) owedBox.classList.remove("app-docs-health-warn");
    });
  }
  // the journal's prompt (term-store-proposal §2): renames saved in the
  // Organisation editor wait here for a sync
  if (app.orgRenames.length > 0) {
    const n = app.orgRenames.length;
    termStoreHost.appendChild(
      el("div", "app-docs-health app-docs-health-warn app-docs-syncnow", `The organisation changed since the last sync — ${n} rename${n === 1 ? "" : "s"} recorded (${app.orgRenames.map((r) => `${r.from[r.from.length - 1]} → ${r.to[r.to.length - 1]}`).join(", ")}). Load the drift report and apply: the terms are renamed in place, tags survive.`)
    );
  }
  const groupRow = el("div", "app-docs-siterow");
  groupRow.append(groupSel, loadGroups);
  termStoreHost.appendChild(field("Term group", groupRow));
  const orgSetRow = el("div", "app-docs-siterow");
  const manageOrg = el("button", "app-btn", "Manage terms…") as HTMLButtonElement;
  manageOrg.type = "button";
  manageOrg.title = "Synonyms, translations and descriptions of the organisation's terms (the structure comes from Settings → Organisation and the sync)";
  manageOrg.addEventListener("click", () => {
    if (app.orgSetId === "") return;
    void openManager(app.orgSetId, app.orgSetName || "Organisation");
  });
  orgSetRow.append(setSel, manageOrg);
  termStoreHost.appendChild(field("Organisation term set", orgSetRow));
  const procSetRow = el("div", "app-docs-siterow");
  const manageProc = el("button", "app-btn", "Manage terms…") as HTMLButtonElement;
  manageProc.type = "button";
  manageProc.title = "Synonyms, translations and descriptions of the process terms (the structure comes from Settings → Processes and the sync)";
  manageProc.addEventListener("click", () => {
    if (app.processSetId === "") return;
    void openManager(app.processSetId, app.processSetName || "Process area");
  });
  procSetRow.append(procSetSel, manageProc);
  termStoreHost.appendChild(field("Process area term set", procSetRow, "Mirrors Settings → Processes: each site's tree — site › area › process › sub-process. Map a site column to the \"Process area\" role to tag documents with it."));
  // the sets themselves, as tiles
  termStoreHost.append(el("div", "app-section", "Term sets"), palNote, palBox);

  const companyLevel = el("input", "") as HTMLInputElement;
  companyLevel.type = "checkbox";
  // persisted (write-through compares the same way the report does)
  companyLevel.checked = app.orgSetCompanyLevel;
  companyLevel.addEventListener("change", () => {
    app.orgSetCompanyLevel = companyLevel.checked;
    void patchAppDocsConfig((c) => {
      c.orgSetCompanyLevel = companyLevel.checked;
    })
      .then((fresh) => adoptSyncFields(app, fresh))
      .catch(() => undefined);
  });
  const companyWrap = el("label", "app-docs-check");
  companyWrap.append(
    companyLevel,
    document.createTextNode(" The term set starts at company level (Company › Site › Department › Area — each company the sites name becomes a top-level term)")
  );
  // ---- lifecycle (Phase 5A) --------------------------------------------
  // The approval engine's vocabulary. EXPLICIT (Ben, 2026-08-04): the
  // stored mapping is the law, name-based suggestions only prefill it,
  // and it is keyed by term ID so a rename cannot detach a stage.
  body.appendChild(section("Lifecycle"));
  body.appendChild(
    note(
      "Which status term means draft, in review, approved, superseded, obsolete — " +
        "the approval commands move documents between these stages. Mapped once per " +
        "site, stored by term id."
    )
  );

  {
    // the group linkage moved to Settings → Access control (Ben,
    // 2026-08-06) — all four groups in one place, searched by keyword
    const moved = el("div", "app-settings-note");
    moved.append(
      app.controllersGroupName !== ""
        ? `Document controllers group: ${app.controllersGroupName}. Manage the document control groups under `
        : "The document control groups (controllers, owners & approvers, temporary editors) are linked under ",
      Object.assign(el("a", "", "Settings → Access control"), { href: "#/settings/access" }),
      "."
    );
    body.appendChild(moved);
  }

  const lifeBox = el("div", "");
  body.appendChild(lifeBox);

  // ---- review cadence (the date model, Ben 2026-08-10) -----------------
  body.appendChild(section("Review cadence"));
  body.appendChild(
    note(
      "Months between reviews, per importance. Setting a document's importance sets " +
        "its cadence; the review date is always the effective date plus the cadence, " +
        "and the effective date stamps itself at approval and at Mark reviewed — " +
        "none of the three is typed by hand. Unmapped importance keeps the " +
        "document's own cadence, or 12 months."
    )
  );
  const cadenceBox = el("div", "");
  body.appendChild(cadenceBox);
  const paintCadence = () => {
    void (async () => {
      clear(cadenceBox);
      const dict = dictionary();
      const impCol = dict.columns.find((c) => c.role === "importance" && c.termSetId !== "");
      if (impCol === undefined) {
        cadenceBox.appendChild(
          note("Map a managed-metadata column to the Importance role first — its terms are what carry a cadence.")
        );
        return;
      }
      cadenceBox.appendChild(el("div", "app-loading-line", "Reading the importance terms…"));
      const walk = await fetchTermPaths(app.siteUrl, impCol.termSetId);
      clear(cadenceBox);
      if (walk.error !== "" || walk.nodes.length === 0) {
        cadenceBox.appendChild(note(`Could not read the importance term set: ${walk.error || "no terms"}`));
        return;
      }
      const grid = el("div", "app-docs-cadgrid");
      for (const n of walk.nodes) {
        const label = n.labels[n.labels.length - 1];
        grid.appendChild(el("span", "app-docs-colname", label));
        const months = el("input", "app-input app-docs-cadmonths") as HTMLInputElement;
        months.type = "number";
        months.min = "1";
        months.placeholder = "—";
        const key = n.id.toLowerCase();
        const cur = (dict.cadence ?? {})[key];
        months.value = cur !== undefined ? String(cur) : "";
        months.addEventListener("input", () => {
          const d = dictionary();
          const cad = { ...(d.cadence ?? {}) };
          const v = Number(months.value);
          if (Number.isFinite(v) && v > 0) cad[key] = Math.floor(v);
          else delete cad[key];
          d.cadence = cad;
          ctx.markDirty();
        });
        grid.appendChild(months);
        grid.appendChild(el("span", "app-field-hint", "months"));
      }
      cadenceBox.appendChild(grid);
    })();
  };
  /** Fed into Health by paintHealth — recomputed whenever the mapping
   *  changes, because an unmapped term is a command that cannot run. */
  let lifecycleFindings: HealthFinding[] = [];
  /** The 5G4 drift report: seats vs grants, both directions, both
   *  groups. Filled once per render (fresh reads inside). */
  let grantFindings: HealthFinding[] = [];
  void import("./accessRequests").then(({ grantHealth }) =>
    grantHealth().then(
      (f) => {
        grantFindings = f;
        paintHealth();
      },
      () => {}
    )
  );

  const paintLifecycle = () => {
    void (async () => {
      clear(lifeBox);
      const dict = dictionary();
      const statusCol = dict.columns.find((c) => c.role === "status" && c.termSetId !== "");
      if (statusCol === undefined) {
        lifeBox.appendChild(
          note("Map a managed-metadata column to the Status role first — its term set is what gets staged.")
        );
        lifecycleFindings = [];
        return;
      }
      lifeBox.appendChild(el("div", "app-loading-line", "Reading the status terms…"));
      const terms = await termsInSet(statusCol.termSetId);
      clear(lifeBox);
      if (terms.length === 0) {
        lifeBox.appendChild(note("The status term set has no terms (or could not be read)."));
        lifecycleFindings = [];
        return;
      }
      const life = (dict.lifecycle ??= {});
      const recompute = () => {
        lifecycleFindings = lifecycleHealth(dict, terms);
        paintHealth();
      };
      const grid = el("div", "app-docs-lifegrid");
      grid.append(
        el("span", "app-docs-colhead", "Status term"),
        el("span", "app-docs-colhead", "Lifecycle stage")
      );
      for (const t of terms) {
        const key = t.id.trim().toLowerCase();
        grid.appendChild(el("span", "app-docs-colname", t.label));
        const sel = el("select", "app-input") as HTMLSelectElement;
        const none = el("option", "", "—") as HTMLOptionElement;
        none.value = "";
        sel.appendChild(none);
        for (const s of LIFECYCLE_STAGES) {
          const o = el("option", "", s.label) as HTMLOptionElement;
          o.value = s.key;
          sel.appendChild(o);
        }
        sel.value = life[key] ?? "";
        sel.addEventListener("change", () => {
          if (sel.value === "") delete life[key];
          else life[key] = sel.value as LifecycleStage;
          ctx.markDirty();
          recompute();
        });
        grid.appendChild(sel);
      }
      lifeBox.appendChild(grid);
      // explicit, not silent: suggestions fill only the EMPTY rows, on
      // request — the same vocabulary the approval filter matches, so
      // the prefill and the register can never disagree
      const suggest = el("button", "app-btn", "Suggest stages from names") as HTMLButtonElement;
      suggest.addEventListener("click", () => {
        let changed = 0;
        for (const t of terms) {
          const key = t.id.trim().toLowerCase();
          if (life[key] !== undefined) continue;
          const s = suggestStageForLabel(t.label);
          if (s !== "") {
            life[key] = s;
            changed++;
          }
        }
        if (changed > 0) {
          ctx.markDirty();
          paintLifecycle();
        }
      });
      lifeBox.appendChild(suggest);
      recompute();
    })();
  };

  // ---- health (C4) -----------------------------------------------------
  // Consolidating the mapping makes divergence findable; this is the
  // thing that looks. The org drift report and the search-filter
  // diagnostic move in here too — they were always health checks sitting
  // in the term store section because that is where they were written.
  // ---- document flags (issue 23) -----------------------------------------
  body.appendChild(section("Review levels"));
  body.appendChild(
    note(
      "The levels a reader picks when flagging a document for review (the overlay's " +
        "\u201cFlag this document\u2026\u201d, and the \u2691 on each file in an ingestion task). " +
        "An app-managed list \u2014 nothing in SharePoint carries it. Empty = the app's defaults."
    )
  );
  const levelsBox = el("div", "app-docs-levels");
  body.appendChild(levelsBox);
  const paintLevels = () => {
    clear(levelsBox);
    const { DEFAULT_REVIEW_LEVELS } = levelsModel;
    const own = app.reviewLevels;
    const shown = own.length > 0 ? own : DEFAULT_REVIEW_LEVELS;
    for (const [i, lvl] of shown.entries()) {
      const r = el("div", "app-org-row");
      r.appendChild(el("span", "app-docs-colname", lvl));
      if (own.length === 0) r.appendChild(el("span", "app-field-hint", "default"));
      else {
        const x = el("button", "app-org-x", "\u00d7") as HTMLButtonElement;
        x.type = "button";
        x.title = "Remove this level";
        x.addEventListener("click", () => {
          app.reviewLevels.splice(i, 1);
          ctx.markDirty();
          paintLevels();
        });
        r.appendChild(x);
      }
      levelsBox.appendChild(r);
    }
    const add = el("div", "app-org-row");
    const input = el("input", "app-input") as HTMLInputElement;
    input.placeholder = own.length === 0 ? "Add a level (replaces the defaults)" : "Add a level";
    const plus = el("button", "app-btn", "\uFF0B") as HTMLButtonElement;
    plus.type = "button";
    const commit = () => {
      const v = input.value.trim();
      if (v === "" || app.reviewLevels.some((l) => l.toLowerCase() === v.toLowerCase())) return;
      app.reviewLevels.push(v);
      input.value = "";
      ctx.markDirty();
      paintLevels();
    };
    plus.addEventListener("click", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    });
    add.append(input, plus);
    levelsBox.appendChild(add);
  };
  paintLevels();
  const flagsBtn = el("button", "app-btn", "Document flags\u2026") as HTMLButtonElement;
  flagsBtn.type = "button";
  flagsBtn.title = "Every open flag on this site's documents \u2014 the same queue the controllers see";
  flagsBtn.addEventListener("click", () => {
    void import("./flagQueue").then(({ openFlagQueue }) =>
      openFlagQueue({
        host: body,
        title: "Document flags",
        flags: () => import("./docFlags").then((m) => m.listOpenFlags(app.siteUrl)),
        canClose: () => true,
        onChanged: () => undefined,
      })
    );
  });
  body.appendChild(field("Open flags", flagsBtn, "Read the flags, close them with a note. Opening a document from here is the register's job (kebab \u2192 Document flags)."));

  body.appendChild(section("Health"));
  body.appendChild(
    note(
      "What is inconsistent across this site's libraries, and what the app decided " +
        "on its own. Nothing here changes anything — it points at where to look."
    )
  );
  const healthBox = el("div", "");
  body.appendChild(healthBox);

  // What the taxonomy columns actually HOLD. Everything else in Health
  // is answerable from configuration; this one needs to look at the
  // documents, because the failure it catches — a column rendering the
  // whole term path — is invisible in the settings and fatal to the
  // folders pane (a production tenant lost its folders to it,
  // 2026-08-03). One page per library, once per settings visit.
  const PROBE_ROWS = 40;
  let taxProbe = new Map<string, TaxProbe>();
  let probedFor = "";

  const runTaxProbe = async () => {
    const dict = dictionary();
    const cols = dict.columns.filter((c) => c.termSetId !== "" && c.available);
    const key = `${dictKey()}|${exposed.map((l) => l.listId).join(",")}|${cols
      .map((c) => c.internal)
      .join(",")}`;
    if (key === probedFor || cols.length === 0 || exposed.length === 0) return;
    probedFor = key;
    const xml = buildRenderViewXml({
      fields: cols.map((c) => c.internal),
      rowLimit: PROBE_ROWS,
    });
    const [pages, walks] = await Promise.all([
      Promise.all(exposed.map((l) => renderListPage(app.siteUrl, l.listId, xml))),
      Promise.all(cols.map((c) => fetchTermPaths(app.siteUrl, c.termSetId))),
    ]);
    const next = new Map<string, TaxProbe>();
    cols.forEach((c, i) => {
      const walk = walks[i];
      if (walk.error !== "" || walk.nodes.length === 0) return;
      const samples = pages
        .flatMap((p) => p.rows.map((r) => r.values[c.internal] ?? ""))
        .filter((v) => v !== "");
      next.set(c.internal, {
        samples,
        // every level's label, not just the leaves: a document can be
        // tagged at any depth
        labels: [...new Set(walk.nodes.flatMap((n) => n.labels))],
        partial: walk.truncated,
      });
    });
    taxProbe = next;
    paintHealth();
  };

  const paintHealth = () => {
    clear(healthBox);
    const dict = dictionary();
    if (dict.columns.length === 0) {
      healthBox.appendChild(note("Nothing to check yet — load the libraries above."));
      return;
    }
    const findings = dictionaryHealth({
      dict,
      conflicts: migrated,
      carriers: lastCarriers,
      libraries: exposed.map((l) => ({
        name: l.config.title !== "" ? l.config.title : l.name,
        columns: l.config.columns,
        libType: l.libType,
      })),
      choicesBy: new Map([...liveByInternal].map(([k, f]) => [k, f.choices])),
      taxProbe,
    });
    findings.push(...lifecycleFindings);
    findings.push(...grantFindings);
    if (findings.length === 0) {
      healthBox.appendChild(note("✓ Nothing to report — the libraries agree."));
      return;
    }
    const list = el("div", "app-dept-list");
    for (const f of findings) {
      const row = el("div", `app-docs-health app-docs-health-${f.level}`);
      row.append(
        el("span", "app-docs-healthmark", f.level === "warn" ? "⚠" : "•"),
        el("span", "app-docs-healthtitle", f.title),
        el("span", "app-field-hint", f.detail)
      );
      list.appendChild(row);
    }
    healthBox.appendChild(list);
  };

  // ---- the cutover tools (term-store-proposal §7.1 / §7.3) -------------
  // One adapter per synced set; the drift reports and "Align term sets"
  // all run through alignSet, so a set is aligned the same way
  // whichever button asked.
  // every run starts from the row's sync fields, not this tab's copy
  const makeOrgAdapter = async (offset: number): Promise<SetAdapter> => {
    adoptSyncFields(app, await appDocsConfig().catch(() => app));
    return orgAdapter(app, offset);
  };
  const makeProcessAdapter = async () => {
    adoptSyncFields(app, await appDocsConfig().catch(() => app));
    return processAdapter(app);
  };
  /** The Apply road shared by both drift reports: decisions, sync,
   *  verdict — the button names what it will do as the decisions change. */
  const wireApply = (box: HTMLElement, adapter: SetAdapter, planNow: ReturnType<typeof orgSyncPlan>, nodes: TermNode[], decisions: Map<string, OrphanDecision>, extraWork: number, decisionsHost: HTMLElement) => {
    const applyBtn = el("button", "app-btn", "") as HTMLButtonElement;
    const relabel = () => {
      const c = decisionCounts(decisions);
      const work = createsAfterPairings(planNow, decisions).length + planNow.renames.length + c.pair + extraWork;
      const bits: string[] = [];
      if (work > 0) bits.push(`${work} change${work === 1 ? "" : "s"}`);
      if (c.retire > 0) bits.push(`${c.retire} retirement${c.retire === 1 ? "" : "s"}`);
      applyBtn.disabled = bits.length === 0;
      applyBtn.textContent = bits.length === 0 ? "Nothing to apply" : `Apply to term set (${bits.join(", ")})`;
    };
    renderOrphanDecisions(decisionsHost, planNow, decisions, relabel);
    relabel();
    box.appendChild(applyBtn);
    const logBox = el("div", "");
    box.appendChild(logBox);
    applyBtn.addEventListener("click", () => {
      void (async () => {
        applyBtn.disabled = true;
        applyBtn.textContent = "Syncing…";
        clear(logBox);
        const r = await alignSet(adapter, decisions, (line) => logBox.appendChild(el("div", "app-field-hint", line)), { plan: planNow, nodes });
        applyBtn.textContent = r.failed === 0 ? "Applied" : "Reload the report to retry";
        for (const line of r.verdict.lines) logBox.appendChild(note(line));
        if (r.failed > 0) logBox.appendChild(note("Nothing was deleted. The usual cause is term-store rights: the signed-in account needs to be a contributor or group manager on the set."));
      })();
    });
    return applyBtn;
  };
  // ---- Align term sets: both sets, one click, a verdict each ----------
  termStoreHost.appendChild(el("div", "app-section", "Alignment"));
  termStoreHost.appendChild(note("Pushes the app's organisation and process model into their term sets and confirms the result with a fresh walk: creates what is missing, renames bound terms in place, never deletes. A term the app does not know is reported — decide it in the drift reports below (pair it with an app node, or retire it)."));
  const alignBtn = el("button", "app-btn app-btn-primary", "Align term sets") as HTMLButtonElement;
  const alignRow = el("div", "app-docs-siterow");
  alignRow.appendChild(alignBtn);
  termStoreHost.appendChild(alignRow);
  const alignBox = el("div", "");
  termStoreHost.appendChild(alignBox);
  alignBtn.addEventListener("click", () => {
    void (async () => {
      clear(alignBox);
      if (app.orgSetId === "" && app.processSetId === "") {
        alignBox.appendChild(note("Choose the Organisation term set (and the Process area term set) above first."));
        return;
      }
      alignBtn.disabled = true;
      alignBtn.textContent = "Aligning…";
      const adapters: SetAdapter[] = [];
      if (app.orgSetId !== "") adapters.push(await makeOrgAdapter(companyLevel.checked ? 1 : 0));
      if (app.processSetId !== "") adapters.push(await makeProcessAdapter());
      let allAligned = true;
      for (const a of adapters) {
        const card = el("div", "app-docs-alignset");
        card.appendChild(el("div", "app-field-label", `${a.name} set`));
        const logBox = el("div", "");
        card.appendChild(logBox);
        alignBox.appendChild(card);
        const r = await alignSet(a, new Map(), (line) => logBox.appendChild(el("div", "app-field-hint", line)));
        for (const line of r.verdict.lines) card.appendChild(note(line));
        if (!r.verdict.aligned) allAligned = false;
      }
      alignBox.appendChild(note(allAligned ? "✓ Every synced set is aligned with the app." : "Not yet aligned — the lines above say what is left; the drift reports below take the decisions."));
      alignBtn.disabled = false;
      alignBtn.textContent = "Align term sets";
    })();
  });

  termStoreHost.append(el("div", "app-section", "Organisation sync"), companyWrap);

  const driftBtn = el("button", "app-btn", "Load drift report") as HTMLButtonElement;
  // Does search filtering by organisation term WORK in this tenant?
  // Answers per top-level term with a live document count. All zeros
  // distinguishes the three honest possibilities in its hint — this is
  // the check a new deployment runs instead of guessing (dev tenants
  // auto-expose owstaxId<Column>; a locked-down tenant may need a
  // RefinableString mapping from a tenant admin).
  const diagBtn = el("button", "app-btn", "Test search filtering") as HTMLButtonElement;
  const btnRow = el("div", "app-docs-siterow");
  btnRow.append(driftBtn, diagBtn);
  termStoreHost.appendChild(btnRow);
  const driftBox = el("div", "");
  termStoreHost.appendChild(driftBox);

  // ---- Process area sync (step 5): the process model is the master ----
  termStoreHost.appendChild(el("div", "app-section", "Process area sync"));
  termStoreHost.appendChild(note("Compares each site's tree in Settings → Processes with the Process area term set: creates what is missing (parents first), renames bound terms in place, removes the synonyms the retired local names once pushed, and never deletes — an archived node's term and the old type-rooted terms are listed and left alone (retire them below)."));
  const procDriftBtn = el("button", "app-btn", "Load process drift report") as HTMLButtonElement;
  const procDriftRow = el("div", "app-docs-siterow");
  procDriftRow.appendChild(procDriftBtn);
  termStoreHost.appendChild(procDriftRow);
  const procDriftBox = el("div", "");
  termStoreHost.appendChild(procDriftBox);
  procDriftBtn.addEventListener("click", () => {
    void (async () => {
      clear(procDriftBox);
      if (app.processSetId === "") {
        procDriftBox.appendChild(note("Choose the Process area term set above first."));
        return;
      }
      procDriftBtn.disabled = true;
      procDriftBtn.textContent = "Comparing…";
      const adapter = await makeProcessAdapter();
      const procWalk = await adapter.walk();
      const { nodes: termNodes, error } = procWalk;
      const truncated = partialWalk(procWalk) !== "";
      procDriftBtn.disabled = false;
      procDriftBtn.textContent = "Load process drift report";
      if (error !== "") {
        procDriftBox.appendChild(note(`Term walk failed: ${error}`));
        return;
      }
      const plan = await adapter.plan(termNodes);
      if (plan.error !== "") {
        procDriftBox.appendChild(note(`Cannot compare: ${plan.error}.`));
        return;
      }
      const list = (title: string, items: string[]) => {
        procDriftBox.appendChild(el("div", "app-field-label", `${title} (${items.length})`));
        if (items.length === 0) {
          procDriftBox.appendChild(el("div", "app-field-hint", "none"));
          return;
        }
        const ul = el("ul", "app-docs-driftlist");
        for (const it of items) ul.appendChild(el("li", "", it));
        procDriftBox.appendChild(ul);
      };
      procDriftBox.appendChild(note(`${plan.matched} matched${adapter.bound > 0 ? ` (${adapter.bound} bound by id)` : ""}. Bound nodes compare by id; the rest by name.`));
      list("To create in the term set", plan.creates.map((p) => p.join(" › ")));
      list("To rename in place (the term keeps its id)", plan.renames.map((r) => `${r.from.join(" › ")} → ${r.to[r.to.length - 1]}`));
      const decisionsHost = el("div", "");
      procDriftBox.appendChild(decisionsHost);
      if (truncated) {
        procDriftBox.appendChild(note(`${partialWalk(procWalk)} — syncing against a partial view could recreate terms it did not see. Sync disabled; reload in a minute.`));
        renderOrphanDecisions(decisionsHost, plan, new Map(), () => undefined);
        return;
      }
      if (plan.creates.length + plan.renames.length + plan.orphanTerms.length === 0 && adapter.withAliases === 0) {
        renderOrphanDecisions(decisionsHost, plan, new Map(), () => undefined);
        procDriftBox.appendChild(note("✓ Nothing to sync — the trees agree."));
        return;
      }
      // retired local names ride every apply (their synonyms come off)
      wireApply(procDriftBox, adapter, plan, termNodes, new Map<string, OrphanDecision>(), adapter.withAliases > 0 ? 1 : 0, decisionsHost);
    })();
  });
  diagBtn.addEventListener("click", () => {
    void (async () => {
      clear(driftBox);
      const props = [
        ...new Set(
          exposed.flatMap((l) =>
            l.config.columns.filter((c) => c.role === "orgUnit").map((c) => c.internal)
          )
        ),
      ].map(taxonomySearchProperty);
      const listIds = exposed.map((l) => l.listId);
      if (props.length === 0 || listIds.length === 0 || app.orgSetId === "") {
        driftBox.appendChild(
          note(
            "Needs an exposed library with a column mapped to the Organisation unit " +
              "role, and an Organisation term set selected above."
          )
        );
        return;
      }
      diagBtn.disabled = true;
      diagBtn.textContent = "Testing…";
      const { nodes, error } = await fetchTermPaths(app.siteUrl, app.orgSetId, 3, 40);
      if (error !== "" || nodes.length === 0) {
        driftBox.appendChild(note(`Could not read the term set: ${error || "no terms"}`));
      } else {
        const lines: string[] = [];
        let hits = 0;
        for (const top of nodes.filter((n) => n.labels.length === 1).slice(0, 6)) {
          const ids = nodes.filter((n) => n.labels[0] === top.labels[0]).map((n) => n.id);
          const res = await searchPage(app.siteUrl, "", {
            listIds,
            rowLimit: 1,
            termFilters: [{ properties: props, termIds: ids }],
          });
          hits += res.total;
          lines.push(
            `${top.labels[0]}: ${res.error !== "" ? `error — ${res.error.slice(0, 80)}` : `${res.total} document(s)`}`
          );
        }
        driftBox.appendChild(note(`Via ${props.join(", ")} — ${lines.join(" · ")}`));
        if (hits === 0) {
          driftBox.appendChild(
            note(
              "All zero. Either nothing is tagged yet, the search index has not " +
                "crawled the tags (minutes to hours), or this tenant needs a " +
                "RefinableString mapping from a tenant admin."
            )
          );
        }
      }
      diagBtn.disabled = false;
      diagBtn.textContent = "Test search filtering";
    })();
  });
  driftBtn.addEventListener("click", () => {
    void (async () => {
      driftBtn.disabled = true;
      driftBtn.textContent = "Comparing…";
      clear(driftBox);
      const offset = companyLevel.checked ? 1 : 0;
      const adapter = await makeOrgAdapter(offset);
      const [orgWalk, orgRaw] = await Promise.all([adapter.walk(), orgJson()]);
      const { nodes, error } = orgWalk;
      const truncated = partialWalk(orgWalk) !== "";
      driftBtn.disabled = false;
      driftBtn.textContent = "Load drift report";
      if (error !== "") {
        driftBox.appendChild(note(`Term walk failed: ${error}`));
        return;
      }
      // the report IS the sync plan (5F): what a sync would create and
      // rename, and what it deliberately leaves alone — or, since the
      // cutover tools, what the admin decides about
      const plan = await adapter.plan(nodes);
      if (plan.error !== "") {
        driftBox.appendChild(note(`Cannot compare: ${plan.error}.`));
        // stray top-level terms (a sync run with the box unticked created
        // the sites beside the company — Ben's production set,
        // 2026-10-13): offered for removal once a usage count says no
        // document is tagged with any of them
        const coNames = new Set((await companies().catch(() => [] as string[])).map((c) => c.trim().toLowerCase()));
        const siteNames = new Set(parseOrgTree(orgRaw).map((s) => s.site.trim().toLowerCase()));
        const strays = nodes.filter((n) => n.labels.length === 1 && !coNames.has(n.labels[0].trim().toLowerCase()) && siteNames.has(n.labels[0].trim().toLowerCase()));
        const hasCompanyTop = nodes.some((n) => n.labels.length === 1 && coNames.has(n.labels[0].trim().toLowerCase()));
        // offered whichever way the box is set: a top level that mixes the
        // company with sites is wrong either way
        if (strays.length > 0 && (offset === 1 || hasCompanyTop)) {
          const under = (top: TermNode) => nodes.filter((n) => n.labels[0] === top.labels[0]);
          const all = strays.flatMap(under);
          const box = el("div", "app-docs-alignset");
          box.appendChild(el("div", "app-field-label", `Stray top-level site terms (${strays.length}, ${all.length} terms in all)`));
          box.appendChild(note(`${strays.map((s) => s.labels[0]).join(", ")} sit at the set's top level beside the company — created by a sync run with the box unticked. Count their usage; when no document is tagged with any of them they can be removed, and the next sync creates them under the company.`));
          const props = [...new Set(exposed.flatMap((l) => l.config.columns.filter((c) => c.role === "orgUnit").map((c) => c.internal)))].map(taxonomySearchProperty);
          const listIds = exposed.map((l) => l.listId);
          const countBtn = el("button", "app-btn", "Count usage") as HTMLButtonElement;
          const removeBtn = el("button", "app-btn", `Remove ${all.length} term${all.length === 1 ? "" : "s"}`) as HTMLButtonElement;
          removeBtn.disabled = true;
          const row = el("div", "app-docs-siterow");
          row.append(countBtn, removeBtn);
          box.append(row);
          const out = el("div", "");
          box.appendChild(out);
          driftBox.appendChild(box);
          let usage: number | null = null;
          countBtn.addEventListener("click", () => {
            void (async () => {
              countBtn.disabled = true;
              if (props.length === 0 || listIds.length === 0) {
                usage = 0;
                out.appendChild(note("No exposed library reads an Organisation column — nothing can be tagged with these terms."));
              } else {
                const r = await searchPage(app.siteUrl, "", { listIds, rowLimit: 1, termFilters: [{ properties: props, termIds: all.map((n) => n.id) }] });
                usage = r.error === "" ? r.total : null;
                out.appendChild(note(r.error !== "" ? `The usage count failed: ${r.error.slice(0, 120)}` : `${r.total} document${r.total === 1 ? "" : "s"} tagged with these terms${r.total === 0 ? " (or not yet crawled — the terms are new)" : ""}.`));
              }
              removeBtn.disabled = usage !== 0;
              countBtn.disabled = false;
            })();
          });
          removeBtn.addEventListener("click", () => {
            void (async () => {
              const yes = await promptConfirm({ title: `Remove ${all.length} stray term${all.length === 1 ? "" : "s"}?`, note: `${strays.map((s) => s.labels[0]).join(", ")} and everything under them leave the term set. No document is tagged with them (the count said 0). The next sync creates them under the company.`, confirmLabel: "Remove", danger: true });
              if (!yes) return;
              removeBtn.disabled = true;
              removeBtn.textContent = "Removing…";
              // deepest first: a term with children cannot be deleted
              const ordered = [...all].sort((a, b) => b.labels.length - a.labels.length);
              let failed = 0;
              const gone = new Set<string>();
              for (const n of ordered) {
                const r = await deleteTerm(app.siteUrl, app.orgSetId, n.id);
                if (r.ok) gone.add(n.id);
                else {
                  failed++;
                  out.appendChild(el("div", "app-field-hint", `FAIL — ${n.labels.join(" › ")}: ${r.status.slice(0, 160)}`));
                }
              }
              // bindings that pointed at them are spent
              await patchAppDocsConfig((c) => {
                const b = c.termBindings[app.orgSetId] ?? {};
                for (const [k, id] of Object.entries(b)) if (gone.has(id)) delete b[k];
              })
                .then((fresh) => adoptSyncFields(app, fresh))
                .catch(() => undefined);
              invalidateTermPaths();
              removeBtn.textContent = failed === 0 ? "Removed" : "Reload and retry";
              out.appendChild(note(failed === 0 ? `✓ ${gone.size} term${gone.size === 1 ? "" : "s"} removed. Tick "The term set starts at company level", reload the drift report, and apply.` : `${failed} could not be removed — the rest are gone. Reload the report.`));
            })();
          });
        }
        return;
      }
      // the ampersand guard (2026-08-11, the Shipping & Logistics case):
      // the term store FORCES & into ＆ (U+FF06), and the phone player's
      // bridge truncates any response carrying that character — so an
      // ampersand in an org unit name makes every document tagged to it
      // unreadable on phones. Named here, at the only gate it enters by.
      const ampPaths = orgTreePaths(parseOrgTree(orgRaw))
        .filter((p) => p[p.length - 1].includes("&"))
        .map((p) => p.join(" › "));
      const ff06Terms = nodes
        .filter((n) => n.labels[n.labels.length - 1].includes("＆"))
        .map((n) => n.labels.join(" › ").replace(/＆/g, "&"));
      // one folded note, not one per unit (Ben, 2026-10-13: sixty lines)
      const ampAll = [...new Set([...ampPaths, ...ff06Terms.map((t) => t.split(" › ").slice(-Math.max(1, t.split(" › ").length - 1)).join(" › "))])].sort();
      if (ampPaths.length + ff06Terms.length > 0) {
        const det = el("details", "app-docs-ampfold");
        det.appendChild(
          el(
            "summary",
            "app-settings-note",
            `⚠ ${ampAll.length} unit${ampAll.length === 1 ? "" : "s"} carry an ampersand (${ampPaths.length} in the organisation, ${ff06Terms.length} term${ff06Terms.length === 1 ? "" : "s"} stored as ＆). The sync matches and writes them that way, but the phone player cannot read documents tagged to a ＆ term — rename a unit to "and" and sync to fix it in place, tags follow. Show them`
          )
        );
        const ul = el("ul", "app-docs-driftlist");
        for (const p of ampAll.slice(0, 120)) ul.appendChild(el("li", "", p));
        if (ampAll.length > 120) ul.appendChild(el("li", "", `… and ${ampAll.length - 120} more`));
        det.appendChild(ul);
        driftBox.appendChild(det);
      }
      const list = (title: string, items: string[]) => {
        driftBox.appendChild(el("div", "app-field-label", `${title} (${items.length})`));
        if (items.length === 0) {
          driftBox.appendChild(el("div", "app-field-hint", "none"));
          return;
        }
        const ul = el("ul", "app-docs-driftlist");
        for (const p of items.slice(0, 50)) ul.appendChild(el("li", "", p));
        if (items.length > 50) ul.appendChild(el("li", "", `… and ${items.length - 50} more`));
        driftBox.appendChild(ul);
      };
      const bound = Object.keys(app.termBindings[app.orgSetId] ?? {}).length;
      driftBox.appendChild(
        note(
          `${plan.matched} matched${bound > 0 ? ` (${bound} bound by id from earlier syncs)` : ""}. ` +
            `Recorded renames and bound terms are exact; otherwise alignment is by name and a rename is proposed only when it is unambiguous. The sync NEVER deletes terms.`
        )
      );
      list("To create in the term set", plan.creates.map((p) => p.join(" › ")));
      list(
        "To rename in place (the term keeps its id — tags survive)",
        plan.renames.map((r) => `${r.from.join(" › ")} → ${r.to[r.to.length - 1]}`)
      );
      const decisionsHost = el("div", "");
      driftBox.appendChild(decisionsHost);
      if (truncated) {
        driftBox.appendChild(
          note(
            `${partialWalk(orgWalk)}, so this comparison is partial — ` +
              "syncing against a partial view could recreate terms it did not see. Sync disabled; reload in a minute."
          )
        );
        renderOrphanDecisions(decisionsHost, plan, new Map(), () => undefined);
        return;
      }
      if (plan.creates.length + plan.renames.length + plan.orphanTerms.length === 0) {
        renderOrphanDecisions(decisionsHost, plan, new Map(), () => undefined);
        driftBox.appendChild(note("✓ Nothing to sync — the trees agree."));
        return;
      }
      // the plan above is the confirmation step — the button says exactly
      // how many changes it will make, and none of them are deletions
      wireApply(driftBox, adapter, plan, nodes, new Map<string, OrphanDecision>(), 0, decisionsHost);
    })();
  });

  // ---- write access (Phase 4A) -----------------------------------------
  // Phase 4 is the first phase that writes, and one path in it is
  // unproven: a file's bytes through a connector that serialises its
  // body as a string. This asks the tenant instead of guessing, and it
  // is explicit about what it does — it creates files and recycles them,
  // in a library the admin picks, never in a controlled one.
  // ---- governed hashtags (relationships plan H1, 2026-08-13) -----------
  body.appendChild(section("Tags"));
  body.appendChild(
    note(
      "A closed vocabulary: anyone proposes from the tagging editor; document " +
        "controllers decide here. Approving MINTS the term; declining sends the " +
        "proposer a message — never silent. Map a column (with a term set) to the " +
        "Tags role to switch this on."
    )
  );
  const tagBox = el("div", "");
  body.appendChild(tagBox);
  const paintTags = () => {
    void (async () => {
      clear(tagBox);
      const dict = dictionary();
      const tagCol = dict.columns.find((c) => c.role === "tags" && c.termSetId !== "");
      if (tagCol === undefined) {
        tagBox.appendChild(note("No column is mapped to the Tags role yet."));
        return;
      }
      tagBox.appendChild(el("div", "app-loading-line", "Reading the proposal queue…"));
      const { listProposals, approveProposal, declineProposal, mintTag, docInRevision, statusStageReader } = await import("./tagProposals");
      const stageReader = await statusStageReader(app.siteUrl, dict).catch(() => ({ statusInternal: "", stageOf: () => "" as const }));
      const [pending, walk] = await Promise.all([listProposals("pending"), fetchTermPaths(app.siteUrl, tagCol.termSetId)]);
      clear(tagBox);
      const fail = (m: string) => {
        const w = el("div", "app-docs-addstatus app-docs-addstatus-warn", m);
        tagBox.prepend(w);
      };
      // C3 (feedback round 1): the tags in use — add one directly, rename
      // in place (the GUID stays, so every tagged document follows)
      const inUse = el("div", "app-docs-tagsinuse");
      inUse.appendChild(el("div", "app-field-label", `Tags in use (${walk.nodes.length})`));
      if (walk.error !== "") inUse.appendChild(note(`Could not read the tag set: ${walk.error}`));
      const chips = el("div", "app-docs-fpills");
      for (const n of [...walk.nodes].sort((a, b) => a.labels[a.labels.length - 1].localeCompare(b.labels[b.labels.length - 1]))) {
        const label = n.labels[n.labels.length - 1];
        const chip = el("button", "app-docs-fpill", label) as HTMLButtonElement;
        chip.title = "Rename this tag (every document tagged with it follows)";
        chip.addEventListener("click", () => {
          void (async () => {
            const { promptText } = await import("../prompts");
            const next = await promptText({ title: `Rename “${label}”`, initial: label, required: "A name is needed.", confirmLabel: "Rename" });
            if (next === null || next.trim() === "" || next.trim() === label) return;
            const langRes = await fetchTermStoreLanguage(app.siteUrl);
            const lang = ((langRes.data ?? {}) as { defaultLanguageTag?: string }).defaultLanguageTag ?? "en-US";
            const r = await patchTermLabels(app.siteUrl, tagCol.termSetId, n.id, [{ languageTag: lang, name: next.trim(), isDefault: true }]);
            if (!r.ok) fail(`Could not rename “${label}”: ${r.status.slice(0, 160)}`);
            else {
              invalidateTermPaths();
              paintTags();
            }
          })();
        });
        chips.appendChild(chip);
      }
      if (walk.nodes.length === 0 && walk.error === "") chips.appendChild(el("span", "app-field-hint", "No tags yet."));
      inUse.appendChild(chips);
      const addRow = el("div", "app-docs-fdates");
      const addIn = el("input", "app-input app-docs-fperson") as HTMLInputElement;
      addIn.placeholder = "New tag, e.g. Crane Ops";
      const addBtn = el("button", "app-btn", "＋ Add tag") as HTMLButtonElement;
      addBtn.addEventListener("click", () => {
        void (async () => {
          addBtn.disabled = true;
          const made = await mintTag(app.siteUrl, tagCol.termSetId, addIn.value);
          addBtn.disabled = false;
          if (made.error !== "") fail(`Could not add “${addIn.value.trim()}”: ${made.error}`);
          else {
            addIn.value = "";
            paintTags();
          }
        })();
      });
      addIn.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addBtn.click();
      });
      addRow.append(addIn, addBtn);
      inUse.appendChild(addRow);
      tagBox.appendChild(inUse);
      tagBox.appendChild(el("div", "app-field-label", `Proposals waiting (${pending.length})`));
      if (pending.length === 0) {
        tagBox.appendChild(el("div", "app-field-hint", "No proposals waiting."));
      }
      for (const prop of pending) {
        const rowEl = el("div", "app-docs-tagqrow");
        const text = el("div", "app-docs-tagqtext");
        text.append(
          el("div", "app-docs-tagqlabel", prop.label),
          el(
            "div",
            "app-field-hint",
            [prop.proposerName || prop.proposerEmail, prop.note].filter((x) => x !== "").join(" — ")
          )
        );
        const ok = el("button", "app-btn", "Approve") as HTMLButtonElement;
        ok.addEventListener("click", () => {
          void (async () => {
            ok.disabled = true;
            const r = await approveProposal(prop, app.siteUrl, tagCol.termSetId, tagCol.internal, () => docInRevision(prop, stageReader.statusInternal, stageReader.stageOf));
            if (r.error !== "") {
              fail(`Could not approve "${prop.label}": ${r.error}`);
              ok.disabled = false;
            } else {
              if (r.warn !== "") fail(`Approved "${prop.label}" — ${r.warn}`);
              paintTags();
            }
          })();
        });
        const no = el("button", "app-btn", "Decline…") as HTMLButtonElement;
        no.addEventListener("click", () => {
          const dlgHost = el("div", "app-dlghost");
          body.appendChild(dlgHost);
          let running = false;
          const dlg = openDialog({
            host: dlgHost,
            title: `Decline — ${prop.label}`,
            maxWidth: 460,
            onClose: () => dlgHost.remove(),
            buttons: [
              { label: "Cancel", kind: "secondary", onClick: () => { if (!running) dlg.close(); } },
              { label: "Decline & send", kind: "primary", onClick: () => void go() },
            ],
          });
          dlg.body.appendChild(
            el("div", "app-field-hint", "The proposer always hears why — edit before it goes.")
          );
          const msg = el("textarea", "app-input") as HTMLTextAreaElement;
          msg.rows = 3;
          msg.value =
            `Thanks for proposing "${prop.label}" — we've decided not to add it to the ` +
            `vocabulary right now. Tags work best when a handful cover many documents.`;
          dlg.body.appendChild(msg);
          const st = el("div", "app-docs-addstatus");
          dlg.body.appendChild(st);
          const go = async () => {
            if (running || msg.value.trim() === "") return;
            running = true;
            st.textContent = "Declining…";
            const r = await declineProposal(prop, msg.value.trim());
            if (r.error !== "") {
              st.textContent = `Could not decline: ${r.error}`;
              st.classList.add("app-docs-addstatus-warn");
              running = false;
              return;
            }
            if (r.warn !== "") {
              st.textContent = `Declined — the Teams message did not go: ${r.warn}`;
              st.classList.add("app-docs-addstatus-warn");
              const c = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement | null;
              if (c !== null) c.textContent = "Close";
              (dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement).style.display = "none";
              running = false;
              paintTags();
              return;
            }
            dlg.close();
            paintTags();
          };
        });
        rowEl.append(text, ok, no);
        tagBox.appendChild(rowEl);
      }
      // usage, on demand — a lean one-column sweep, capped and stated
      const useBtn = el("button", "app-btn", "Count tag usage") as HTMLButtonElement;
      const useBox = el("div", "");
      tagBox.append(useBtn, useBox);
      useBtn.addEventListener("click", () => {
        void (async () => {
          useBtn.disabled = true;
          clear(useBox);
          useBox.appendChild(el("div", "app-loading-line", "Counting…"));
          const counts = new Map<string, number>();
          let scanned = 0;
          let capped = false;
          for (const lib of exposed.filter((l) => l.libType !== "template" && l.libType !== "ingestion")) {
            const xml = buildRenderViewXml({ fields: [tagCol.internal], rowLimit: 200 });
            let next = "";
            for (;;) {
              const page = await renderListPage(app.siteUrl, lib.listId, xml, next);
              if (page.error !== "") break;
              for (const r of page.rows) {
                scanned++;
                if (scanned > 2000) {
                  capped = true;
                  break;
                }
                for (const lab of (r.values[tagCol.internal] ?? "").split(";")) {
                  const t = lab.trim();
                  if (t !== "") counts.set(t, (counts.get(t) ?? 0) + 1);
                }
              }
              next = page.next;
              if (next === "" || capped) break;
            }
            if (capped) break;
          }
          clear(useBox);
          const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
          if (rows.length === 0) {
            useBox.appendChild(el("div", "app-field-hint", "No documents carry a tag yet."));
          }
          for (const [labelText, n] of rows) {
            useBox.appendChild(el("div", "app-field-hint", `${labelText} — ${n}`));
          }
          if (capped) {
            useBox.appendChild(el("div", "app-field-hint", "Counted the first 2,000 documents."));
          }
          useBtn.disabled = false;
        })();
      });
    })();
  };
  paintTags();

  // ---- F2: per-site default org filters (Ben, 2026-08-14) --------------
  body.appendChild(section("Default filters"));
  body.appendChild(
    note(
      "Which SITES a site's members see in the folders pane: their own plus the " +
        "corporate/functional sites ticked here — sites only, never departments; the " +
        "pane's expansion handles the levels below. Only their OWN site is filtered by " +
        "default; the rest sit collapsed, and Show-other-sites reveals everything else. " +
        "Pick the site from the organisation's defined sites; an unmapped site falls back " +
        "to name-matching its org branch."
    )
  );
  const dofBox = el("div", "");
  body.appendChild(dofBox);
  const paintDof = () => {
    void (async () => {
      clear(dofBox);
      if (app.orgSetId === "" || app.siteUrl === "") {
        dofBox.appendChild(note("Link the organisation term set first."));
        return;
      }
      dofBox.appendChild(el("div", "app-loading-line", "Reading the organisation tree…"));
      // live walk — an admin mapping branches must see fresh terms; the
      // SITE list comes from the organisation settings, not typed (Ben,
      // 2026-10-07)
      const [walk, orgRaw] = await Promise.all([fetchTermPaths(app.siteUrl, app.orgSetId), orgJson().catch(() => "")]);
      const orgSites = parseOrgTree(orgRaw).map((n) => n.site).filter((x) => x !== "");
      clear(dofBox);
      if (walk.error !== "") {
        dofBox.appendChild(note(`Term walk failed: ${walk.error}`));
        return;
      }
      const labelOfId = (id: string) =>
        walk.nodes.find((n) => n.id.toLowerCase() === id.toLowerCase())?.labels.join(" › ") ??
        `(missing term ${id.slice(0, 8)}…)`;

      const siteIn = el("select", "app-input") as HTMLSelectElement;
      {
        const none = el("option", "", "Choose a site…") as HTMLOptionElement;
        none.value = "";
        siteIn.appendChild(none);
        for (const name of orgSites) {
          const o = el("option", "", name) as HTMLOptionElement;
          o.value = name;
          siteIn.appendChild(o);
        }
      }
      if (orgSites.length === 0) dofBox.appendChild(note("No sites are defined under Settings → Organisation yet."));
      const boxes = new Map<string, HTMLInputElement>();
      const tree = el("div", "app-docs-doftree");
      // SITES only (Ben, 2026-08-14): depth 1, or depth 2 under a
      // single company-level root — departments are an expansion
      // concern, not a mapping one
      const siteDepth =
        walk.nodes.filter((n) => n.labels.length === 1).length === 1 &&
        walk.nodes.some((n) => n.labels.length === 2)
          ? 2
          : 1;
      for (const n of walk.nodes.filter((x) => x.labels.length === siteDepth)) {
        const row = el("label", "app-docs-dofrow");
        const cb = el("input", "") as HTMLInputElement;
        cb.type = "checkbox";
        boxes.set(n.id, cb);
        row.append(cb, el("span", "", n.labels[n.labels.length - 1]));
        tree.appendChild(row);
      }
      const saveBtn = el("button", "app-btn", "Save site default") as HTMLButtonElement;
      const st = el("div", "app-docs-addstatus");
      saveBtn.addEventListener("click", () => {
        void (async () => {
          const typed = siteIn.value.trim().toLowerCase();
          // key by the site's TERM id when the name resolves — a later
          // rename (sync keeps the GUID) then never orphans the mapping
          const siteTerm = walk.nodes.find(
            (n) => n.labels[n.labels.length - 1].toLowerCase() === typed
          );
          const key = siteTerm !== undefined ? siteTerm.id.toLowerCase() : typed;
          if (typed === "") {
            st.textContent = "Choose the site first.";
            st.classList.add("app-docs-addstatus-warn");
            return;
          }
          saveBtn.disabled = true;
          st.classList.remove("app-docs-addstatus-warn");
          st.textContent = "Saving…";
          const picked = [...boxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
          const next = { ...app.defaultOrgFilter };
          if (picked.length > 0) next[key] = picked;
          else delete next[key];
          app.defaultOrgFilter = next;
          try {
            await saveAppDocsConfigKeepingSync(app);
            paintDof();
          } catch (e) {
            st.textContent = `The save was refused: ${String(e).slice(0, 160)}`;
            st.classList.add("app-docs-addstatus-warn");
            saveBtn.disabled = false;
          }
        })();
      });

      // existing mappings first — edit prefills the form, remove saves
      if (Object.keys(app.defaultOrgFilter).length === 0) {
        dofBox.appendChild(el("div", "app-field-hint", "No site defaults mapped yet."));
      }
      for (const [site, ids] of Object.entries(app.defaultOrgFilter)) {
        const keyed = walk.nodes.find((n) => n.id.toLowerCase() === site.toLowerCase());
        const siteName = keyed !== undefined ? keyed.labels[keyed.labels.length - 1] : site;
        const row = el("div", "app-docs-dofmap");
        row.append(
          el("span", "app-docs-dofsite", siteName),
          el("span", "app-field-hint", ids.map(labelOfId).join(" · "))
        );
        const edit = el("button", "app-btn", "Edit") as HTMLButtonElement;
        edit.addEventListener("click", () => {
          // a mapping for a site that no longer exists in the org still edits
          if (![...siteIn.options].some((o) => o.value === siteName)) {
            const o = el("option", "", siteName) as HTMLOptionElement;
            o.value = siteName;
            siteIn.appendChild(o);
          }
          siteIn.value = siteName;
          for (const [id, cb] of boxes) {
            cb.checked = ids.some((x) => x.toLowerCase() === id.toLowerCase());
          }
          siteIn.focus();
        });
        const rm = el("button", "app-btn", "Remove") as HTMLButtonElement;
        rm.addEventListener("click", () => {
          void (async () => {
            rm.disabled = true;
            const next = { ...app.defaultOrgFilter };
            delete next[site];
            app.defaultOrgFilter = next;
            await saveAppDocsConfigKeepingSync(app).catch(() => undefined);
            paintDof();
          })();
        });
        row.append(edit, rm);
        dofBox.appendChild(row);
      }
      dofBox.append(siteIn, tree, saveBtn, st);
    })();
  };
  paintDof();

  body.appendChild(section("Write access"));
  body.appendChild(
    note(
      "Runs the whole write surface — create, metadata, check-out, check-in, discard, " +
        "server-side copy and a raw-byte upload — against a probe file it creates and " +
        "then recycles. Working and revision libraries only: nothing controlled is touched."
    )
  );
  const writeSel = el("select", "app-input") as HTMLSelectElement;
  const writeBtn = el("button", "app-btn", "Test write access") as HTMLButtonElement;
  const writeRow = el("div", "app-docs-siterow");
  writeRow.append(writeSel, writeBtn);
  body.appendChild(writeRow);
  const writeBox = el("div", "");
  body.appendChild(writeBox);

  fillWriteSel = () => {
    const writable = exposed.filter(
      (l) => l.libType === "working" || l.libType === "revision"
    );
    clear(writeSel);
    for (const l of writable) {
      const o = el(
        "option",
        "",
        l.config.title !== "" ? l.config.title : l.name
      ) as HTMLOptionElement;
      o.value = l.listId;
      writeSel.appendChild(o);
    }
    if (writable.length === 0) {
      writeSel.appendChild(el("option", "", "No working or revision library exposed"));
    }
    writeSel.disabled = writable.length === 0;
    writeBtn.disabled = writable.length === 0;
  };
  fillWriteSel();

  writeBtn.addEventListener("click", () => {
    void (async () => {
      const listId = writeSel.value;
      if (listId === "" || app.siteUrl === "") return;
      writeBtn.disabled = true;
      writeBtn.textContent = "Testing…";
      clear(writeBox);
      const list = el("div", "app-dept-list");
      writeBox.appendChild(list);
      // A term this column DEMONSTRABLY uses: a label already present in
      // its documents that also exists in its term set. Then a rejection
      // can only be about the format — the first runs tested a term that
      // may simply not have belonged to the column, which proves nothing
      // either way.
      let taxCol: SiteColumn | undefined;
      let term: TermNode | undefined;
      for (const c of dictionary().columns.filter((x) => x.termSetId !== "")) {
        const walk = await fetchTermPaths(app.siteUrl, c.termSetId);
        if (walk.error !== "" || walk.nodes.length === 0) continue;
        const seen = new Set(
          (taxProbe.get(c.internal)?.samples ?? [])
            .flatMap((s) => s.split(";"))
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s !== "")
        );
        const used = walk.nodes.find((n) =>
          seen.has((n.labels[n.labels.length - 1] ?? "").trim().toLowerCase())
        );
        if (used !== undefined) {
          taxCol = c;
          term = used;
          break;
        }
        // fall back to any real term from the first readable set
        if (taxCol === undefined) {
          taxCol = c;
          term = walk.nodes[walk.nodes.length - 1];
        }
      }
      const { runWriteProbe } = await import("./writeProbe");
      await runWriteProbe(
        {
          site: app.siteUrl,
          listId,
          taxColumn:
            taxCol === undefined || term === undefined
              ? undefined
              : {
                  internal: taxCol.internal,
                  label: term.labels[term.labels.length - 1],
                  termId: term.id,
                },
        },
        (s) => {
          const row = el("div", `app-docs-health app-docs-health-${s.ok ? "info" : "warn"}`);
          row.append(
            el("span", "app-docs-healthmark", s.ok ? "✓" : "⚠"),
            el("span", "app-docs-healthtitle", s.name),
            el("span", "app-field-hint", s.detail)
          );
          list.appendChild(row);
        }
      );
      writeBtn.disabled = false;
      writeBtn.textContent = "Test write access";
    })();
  });

  // ---- the move-road probe (document ingestion, 2026-10-08) -----------
  // What a file carries when it MOVES between two libraries of this
  // site, the state it lands in, and whether the approve bracket then
  // takes it to an approved major — document-ingestion-proposal §5 step 1.
  body.appendChild(section("Move road (ingestion)"));
  body.appendChild(
    note(
      "Creates a text file with a Title and two versions in the SOURCE library, moves it to " +
        "the DESTINATION, reads back what survived (Title, versions, check-out and moderation " +
        "state), runs the approve bracket on it, repeats with a copy, and recycles every file " +
        "it made. The source is a working or revision library; the destination can be ANY " +
        "library but templates — ingestion's real targets are the controlled ones, and a moved " +
        "probe file there is a draft readers never see (content approval) before it is recycled. " +
        "Run it on the dev site."
    )
  );
  const moveSrc = el("select", "app-input") as HTMLSelectElement;
  const moveDst = el("select", "app-input") as HTMLSelectElement;
  const moveBtn = el("button", "app-btn", "Test move road") as HTMLButtonElement;
  const moveRow = el("div", "app-docs-siterow");
  moveRow.append(moveSrc, moveDst, moveBtn);
  body.appendChild(moveRow);
  const moveBox = el("div", "");
  body.appendChild(moveBox);
  fillMoveSels = () => {
    const sources = exposed.filter((l) => l.libType === "working" || l.libType === "revision");
    const targets = exposed.filter((l) => l.libType !== "template" && l.libType !== "ingestion");
    const fill = (sel: HTMLSelectElement, libs: typeof exposed, empty: string) => {
      clear(sel);
      for (const l of libs) {
        const o = el("option", "", `${l.config.title !== "" ? l.config.title : l.name} (${l.libType})`) as HTMLOptionElement;
        o.value = l.listId;
        sel.appendChild(o);
      }
      if (libs.length === 0) sel.appendChild(el("option", "", empty));
      sel.disabled = libs.length === 0;
    };
    fill(moveSrc, sources, "No working or revision library exposed");
    fill(moveDst, targets, "No library exposed");
    // default the destination to the first library that is not the source
    const other = targets.findIndex((l) => l.listId !== moveSrc.value);
    if (other >= 0) moveDst.selectedIndex = other;
    moveBtn.disabled = sources.length === 0 || targets.length === 0;
  };
  fillMoveSels();
  moveBtn.addEventListener("click", () => {
    void (async () => {
      if (moveSrc.value === "" || moveDst.value === "" || app.siteUrl === "") return;
      if (moveSrc.value === moveDst.value) {
        clear(moveBox);
        moveBox.appendChild(el("div", "app-cp-err", "Pick two different libraries."));
        return;
      }
      moveBtn.disabled = true;
      moveBtn.textContent = "Testing…";
      clear(moveBox);
      const list = el("div", "app-dept-list");
      moveBox.appendChild(list);
      const { runMoveProbe } = await import("./moveProbe");
      await runMoveProbe({ site: app.siteUrl, sourceListId: moveSrc.value, destListId: moveDst.value }, (s) => {
        const row = el("div", `app-docs-health app-docs-health-${s.ok ? "info" : "warn"}`);
        row.append(el("span", "app-docs-healthmark", s.ok ? "✓" : "⚠"), el("span", "app-docs-healthtitle", s.name), el("span", "app-field-hint", s.detail));
        list.appendChild(row);
      });
      moveBtn.disabled = false;
      moveBtn.textContent = "Test move road";
    })();
  });

  // ---- U0: the Dataverse file-column relay probe (doc-cards plan C) --
  // A different door than the carriages above: the SDK's own
  // uploadFileToRecord on ben_ltkupload.ben_file. Needs no site or
  // library — Dataverse only — so it runs even where SharePoint is
  // not configured.
  body.appendChild(
    el(
      "div",
      "app-field-hint",
      "Dataverse relay (U0): round-trips 64KB and 4MB through the LeanBoard Upload file column — the native-upload road's transport."
    )
  );
  const upBtn = el("button", "app-btn", "Test Dataverse upload") as HTMLButtonElement;
  const upRow = el("div", "app-docs-siterow");
  upRow.append(upBtn);
  body.appendChild(upRow);
  const upBox = el("div", "");
  body.appendChild(upBox);
  upBtn.addEventListener("click", () => {
    void (async () => {
      upBtn.disabled = true;
      upBtn.textContent = "Testing…";
      clear(upBox);
      const list = el("div", "app-dept-list");
      upBox.appendChild(list);
      const { runUploadProbe } = await import("./writeProbe");
      await runUploadProbe((s) => {
        const row = el("div", `app-docs-health app-docs-health-${s.ok ? "info" : "warn"}`);
        row.append(
          el("span", "app-docs-healthmark", s.ok ? "✓" : "⚠"),
          el("span", "app-docs-healthtitle", s.name),
          el("span", "app-field-hint", s.detail)
        );
        list.appendChild(row);
      });
      upBtn.disabled = false;
      upBtn.textContent = "Test Dataverse upload";
    })();
  });

  // ---- the feed probe (mobile truncation, 2026-08-11) ------------------
  // Read-only: maps the phone bridge's response failures on the device
  // they happen on — a size ladder, a per-document scan with the kiosk's
  // field set, and a field drill that names a poisoned column.
  body.appendChild(
    el(
      "div",
      "app-field-hint",
      "Document feed (mobile): read-only probe for the phone's \"unterminated string\" " +
        "failures — run it ON the failing phone. It sizes pages, scans documents one by " +
        "one, and names the document and column that break the feed."
    )
  );
  const feedSel = el("select", "app-input") as HTMLSelectElement;
  const feedBtn = el("button", "app-btn", "Test document feed") as HTMLButtonElement;
  const feedRow = el("div", "app-docs-siterow");
  feedRow.append(feedSel, feedBtn);
  body.appendChild(feedRow);
  const feedBox = el("div", "");
  body.appendChild(feedBox);
  for (const l of exposed) {
    const o = el("option", "", l.config.title !== "" ? l.config.title : l.name) as HTMLOptionElement;
    o.value = l.listId;
    feedSel.appendChild(o);
  }
  feedSel.disabled = exposed.length === 0;
  feedBtn.disabled = exposed.length === 0;
  feedBtn.addEventListener("click", () => {
    void (async () => {
      const lib = exposed.find((l) => l.listId === feedSel.value);
      if (lib === undefined || app.siteUrl === "") return;
      feedBtn.disabled = true;
      feedBtn.textContent = "Probing…";
      clear(feedBox);
      const list = el("div", "app-dept-list");
      feedBox.appendChild(list);
      const { runFeedProbe } = await import("./feedProbe");
      await runFeedProbe(
        {
          site: app.siteUrl,
          listId: lib.listId,
          fields: lib.config.columns.filter((c) => c.available).map((c) => c.internal),
        },
        (s) => {
          const row = el("div", `app-docs-health app-docs-health-${s.ok ? "info" : "warn"}`);
          row.append(
            el("span", "app-docs-healthmark", s.ok ? "✓" : "⚠"),
            el("span", "app-docs-healthtitle", s.name),
            el("span", "app-field-hint", s.detail)
          );
          list.appendChild(row);
        }
      );
      feedBtn.disabled = false;
      feedBtn.textContent = "Test document feed";
    })();
  });

  // ---- the character-class probe (mobile truncation, 2026-08-11) -------
  // One button, three runs: desktop creates five probe files (one UTF-8
  // class each, in the NAME), the phone reads them for the per-class
  // verdict, a later desktop run recycles them.
  body.appendChild(
    el(
      "div",
      "app-field-hint",
      "Character classes: validates WHICH characters the phone bridge drops. Run once on " +
        "a desktop (creates five tiny probe files in the picked working library), then on " +
        "the phone (the verdict), then on a desktop again (recycles the files)."
    )
  );
  const charSel = el("select", "app-input") as HTMLSelectElement;
  const charBtn = el("button", "app-btn", "Test character classes") as HTMLButtonElement;
  const charRow = el("div", "app-docs-siterow");
  charRow.append(charSel, charBtn);
  body.appendChild(charRow);
  const charBox = el("div", "");
  body.appendChild(charBox);
  const charLibs = exposed.filter((l) => l.libType === "working" || l.libType === "revision");
  for (const l of charLibs) {
    const o = el("option", "", l.config.title !== "" ? l.config.title : l.name) as HTMLOptionElement;
    o.value = l.listId;
    charSel.appendChild(o);
  }
  if (charLibs.length === 0) {
    charSel.appendChild(el("option", "", "No working or revision library exposed"));
  }
  charSel.disabled = charLibs.length === 0;
  charBtn.disabled = charLibs.length === 0;
  charBtn.addEventListener("click", () => {
    void (async () => {
      const listId = charSel.value;
      if (listId === "" || app.siteUrl === "") return;
      charBtn.disabled = true;
      charBtn.textContent = "Probing…";
      clear(charBox);
      const list = el("div", "app-dept-list");
      charBox.appendChild(list);
      const { runCharClassProbe } = await import("./feedProbe");
      await runCharClassProbe({ site: app.siteUrl, listId }, (s) => {
        const row = el("div", `app-docs-health app-docs-health-${s.ok ? "info" : "warn"}`);
        row.append(
          el("span", "app-docs-healthmark", s.ok ? "✓" : "⚠"),
          el("span", "app-docs-healthtitle", s.name),
          el("span", "app-field-hint", s.detail)
        );
        list.appendChild(row);
      });
      charBtn.disabled = false;
      charBtn.textContent = "Test character classes";
    })();
  });
}
