# Site process hierarchies and the ingestion spreadsheet round trip — critical analysis (2026-10-29)

Two features Ben raised on 2026-10-29, analysed against the code as it
stands at v0.82.0. Status: questions answered (the Decisions section);
feature 2 BUILT 2026-10-29 (dev, unreleased); feature 1 BUILT
2026-10-29 (dev, unreleased, SOLUTION-CARRYING) — see "Built".

---

## Feature 1 — site-owned process hierarchies with a central comparison tree

### The ask

- Each SITE sets its own process hierarchy: the root is the site's
  name, then up to three levels below it. That tree is what the
  Process area term set carries.
- A CENTRAL hierarchy is still maintained. A site node soft-links to a
  central node so initiatives, documents and meetings can be compared
  across sites.
- Every picker (initiative, meeting, value driver, document) presents
  the site's own tree.

### What exists today (term-store-proposal §6, v0.70.0)

- `ben_ltkprocessnode`: one row per node; level 0 is a PROCESS TYPE
  (Mine, Refinery, Smelter), 1 area, 2 process, 3 sub-process. A site
  is assigned ONE type on its settings row (`ben_processtype`), so a
  site's tree is its type's tree, shared with every other site of that
  type.
- Per-site wording rides as `ben_aliasesjson` on the node ("Casthouse"
  at one site, "Casting" at large); `processLabel(node, site)` is the
  one display rule; the sync pushes aliases up as term SYNONYMS (added,
  never removed).
- References are a node id: `ben_processnodeid` on boards (rituals),
  initiatives and value drivers; documents are tagged through the
  Process area term set (`processSetId`) via the site column whose
  role is `processArea`.
- The picker (`shared/ui/processPicker.ts`) resolves `siteTypes[site]`
  to the type root and cascades area › process › sub-process under it.
  LeanHub's Cadence filter, the MeetingWizard, the Improvement tab, the
  VDT tabs and the initiative form all take the same `siteTypes` map.
- The sync (`docs/processSync.ts`) plans `type › area › process ›
  sub-process` general-name paths against the set with the binding on
  the node (`termId`), and Settings → Processes writes through on
  every edit (§8).

### Critical reading

**The ask inverts the current model, and the current model already
solves half of it.** Today the shared tree IS the comparison key (two
smelters share "Casthouse" because they share the Smelter type) and the
per-site difference is only wording. The new shape makes the site tree
primary and the shared tree a secondary index. That is a legitimate
choice: sites that run the same kind of plant do not organise it the
same way, and a wording alias cannot express "Bell Bay has no
anode-baking step" or "Boyne splits Casting into two processes". But it
costs the one thing the current design gives for free — a cross-site
filter that needs no mapping work. Under the new shape, cross-site
comparison is only as good as the links sites maintain, so the design
has to make an unlinked node cheap to spot and cheap to fix.

**Keep the central tree as the EXISTING rows.** The simplest reading of
"a central process hierarchy is still maintained" is: the type trees we
have (Mine › … , Smelter › …) become the central hierarchy. Nothing
about them changes except their role. The alternative — one central
tree with no types — would force a mine and a smelter into one
vocabulary; I would not do that unless Ben wants it.

**The soft link belongs on the site node, pointing at ONE central
node.** Many site nodes may point at the same central node (two sites'
"Casting"), a site node points at at most one. An unlinked node should
INHERIT its nearest linked ancestor's link, so linking "Casthouse" at
the area level covers its sub-processes until someone refines them.
Reports then read `centralOf(node)` through one pure rule, as
`processLabel` is one rule today.

**Deprecations this forces** (nothing deleted; columns stay for
Power BI and rollback):

| Today | Under feature 1 |
|---|---|
| `ben_processtype` on the site row (the site's type) | no longer read; a site's tree is found by `ben_site` on the root node. Keep the column; the Organisation site card loses its "Process type" select. |
| `ben_aliasesjson`, "Local names…" dialog, `processLabel(node, site)`, `synonymsToAdd`, the synonym push in `executeProcessSync` | retired — a site's names ARE its tree. `processLabel` stays exported but returns the name (the controls keep compiling). Synonyms already in the term store are left as they are (the manager can remove them). |
| `LEVEL_LABELS[0]` = "Process type" | "Process type" for central roots, "Site" for site roots. |
| `siteTypes: Record<site, typeId>` passed to the picker, LeanHub, MeetingWizard, Improvement, VDT | `siteRoots: Record<site, rootNodeId>` — same shape, same callers, one rename. |
| The type strip in Settings → Processes | a SITE selector (site admins see their own site; super admins every site) plus a "Central" tab holding today's editor. |
| Process area term set shape `Type › Area › Process › Sub-process` | `Site › L1 › L2 › L3` (four levels; SharePoint allows seven). The existing `Type › …` terms become ORPHANS in the drift report — listed, never deleted; retire them with the cutover tool once no document carries them. |

**Schema (solution-carrying release):** two text columns on
`ben_ltkprocessnode` — `ben_site` ("" = central) and
`ben_centralnodeid` (the soft link; "" = inherit). No new table. The
consumers' `ben_processnodeid` columns do not change: they simply start
holding site-node ids. Power BI gets the central id by joining the
node table on itself.

**The term set:** the planner (`orgSyncPlan`) already handles several
top-level roots at offset 0, so `processTermPaths` only needs to walk
site roots instead of type roots. The root term's label is the site's
name as Settings → Organisation spells it; a site rename renames the
root node (the Organisation editor already journals site renames for
the Organisation set — the same hook renames the process root). The
central tree does NOT sync.

**Cross-site surfaces** that today show nothing at company scope:

- Improvement tab filter at company/all-sites scope: a CENTRAL picker;
  an initiative matches when `centralOf(its node)` is in the picked
  central subtree.
- LeanHub Cadence at company scope: the same.
- Documents register: a central filter expands to the term ids of
  every site node linked under it (plus their subtrees) — the taxonomy
  filter already takes a list of ids (`defaultOrgFilter` precedent).
- Value drivers: the dim rule reads `centralOf` when the site filter is
  "all".

**Migration of what exists:** every site that has a type today gets a
starter tree CLONED from the type's tree, with the site's local names
applied as the node names and each clone linked to its source node.
References on boards / initiatives / value drivers that point at a type
node are re-pointed to the clone for that row's site (a one-shot tool
under Settings → Processes, logged, idempotent). Documents tagged with
old terms need re-tagging through the cutover tool (a term cannot be
MOVED under a new parent through the APIs the app uses). Whether any of
this matters in prod is question 5.

**Who edits:** today Settings → Processes is super-admin only. The
point of site trees is that sites own them, so site admins should edit
their own site's tree. The central tree and (probably) the links stay
with super admins — question 3.

**Effort:** about six days — schema and model with tests (1), Settings
→ Processes rework with the site selector, central tab and link picker
(1.5), picker and consumers including the two controls (1), sync and
migration tool (1), cross-site filters (1), UAT and records (0.5). One
solution-carrying release; the migration tool runs once per
environment after the import.

### Questions — feature 1

1. **Central shape.** Keep today's type trees (Mine / Refinery /
   Smelter) as the central hierarchy, unchanged? Or one central tree
   with no types?
2. **Link rule.** A site node links to ONE central node, many site
   nodes may share one, an unlinked node inherits its nearest linked
   ancestor's link. May a site node link to a central node at any
   level (a site's area to a central process)?
3. **Who edits.** Site admins edit their own site's tree; super admins
   edit every site's tree, the central tree and the links? Or may site
   admins set their own links too?
4. **Level names.** Keep Area / Process / Sub-process as the three
   level names below the site, or generic "Level 1–3"?
5. **What is live.** Does any site have a real process tree or Process
   area tags on documents in PROD today? (Dev is disposable.) This
   decides whether the migration tool and the re-tag road are built
   now or later.
6. **Site root label.** The root term is the site's name exactly as
   Settings → Organisation spells it, and renaming the site renames
   the term. Fine?
7. **Cross-site views at launch.** Improvement tab, Cadence and the
   register — all three in the first release, or the register first?
8. **Local names.** Confirm `aliases` and the synonym push retire;
   synonyms already in the term store stay.

---

## Feature 2 — ingestion task export / edit offline / re-upload

### The ask

- Export an Excel file from an ingestion task: sheet 1 = the grid (one
  row per file, one column per value); sheet 2 = the full list of
  valid values per constrained column.
- Edit offline, re-upload, bulk-update the ingestion, with a check
  that every value entered is valid.

### What exists today

- The grid (`ingestionScreen.ts`): `__name` (Name on ingestion) plus
  every column the destination type offers in dictionary order — text,
  choice, date, taxonomy (single and multi), person, the MoC records
  editor — status included, the two derived dates excluded. Up to 500
  files (the folder render's `rowLimit`).
- Edits land in a DRAFT (`ingestionDraft.ts`: uniqueId → internal →
  `AddFieldValue`); "Save changes" writes each dirty file once in one
  bracket; "Set for selected" and "Fill blanks from defaults" are
  bulk writes INTO the draft. A blank value never clears (the forms'
  v1 rule).
- Values are the register's own strings: taxonomy by term id with the
  label beside it, people by email, dates yyyy-mm-dd, multi-values
  ";"-joined. Taxonomy options come from `fetchTermPaths(site, setId)`;
  choices from the field; the status vocabulary from the status set.
- Exports in the app are CSV (register, health report, audit) and
  hand-built PDF (issues, UAT). No spreadsheet library is installed.
  File INPUT is a browser `<input type=file>` read locally — bytes
  never cross a connector for this, so no DLP or connector question.

### Critical reading

**Land the upload in the draft, not in SharePoint.** The upload should
produce exactly what "Set for selected" produces: draft cells. The user
then sees the changed cells highlighted in the grid, the problems
listed, and presses the SAME "Save changes" that writes today. One
write path, one bracket, one refresh, the existing Discard; no new
failure modes in the SharePoint layer. It also means the check is
free: a value that cannot be mapped to a write-ready value is listed
as a problem and its cell is left alone.

**Excel dropdowns are the feature.** A second sheet of valid values is
only half useful if the user has to copy-paste from it. Excel's
list-type data validation can point each Files-sheet column at the
matching range on the Values sheet, so the user gets a dropdown
offline and typos are caught before upload. SheetJS Community Edition
(the obvious library) does not WRITE data validations — that is in its
paid tier — and it is ~800 kB. An .xlsx is a zip of small XML files;
the app already builds PDFs by hand, and a writer with stored (uncom-
pressed) zip entries, inline strings, two sheets and a
`<dataValidations>` block is about 300 lines of pure, testable code.
Reading is the same in reverse: `DecompressionStream("deflate-raw")`
is native in the player's Chromium, so no inflate library either; the
cell-to-value mapping is pure and vitest-able, with the XML parse in a
thin DOM layer. I recommend the hand-rolled road. SheetJS is the
fallback if the writer runs over a day, at the cost of the dropdowns.

**Matching rows.** A hidden first column carries the file's uniqueId;
Name on ingestion is the visible key and may itself be edited (it
renames the file, as in the grid). A row whose id is not in the folder
any more is reported and skipped; a folder file absent from the sheet
is untouched. Column headers are the dictionary labels; the internal
name rides in a hidden header row so a relabelled column still maps.

**Mapping per kind at upload** (the "check"):

| Kind | Sheet value | Resolves to | Problem when |
|---|---|---|---|
| text | as typed | text | never (length only) |
| choice | one of the field's choices (case-insensitive) | the choice as spelled | not a choice |
| date | yyyy-mm-dd or an Excel serial | yyyy-mm-dd | unparseable |
| taxonomy, single | the term's full path "A › B › C" or its leaf label when unique | `{label, termId}` from `fetchTermPaths` | unknown, or a leaf label that matches two terms (the message says to use the path) |
| taxonomy, multi | ";"-separated paths or leaf labels | the term list | any part unknown |
| person | emails ";"-separated (names accepted when one directory match) | `{email, name}` resolved through the directory; role columns (owner / approver / reviewer) also checked against the pool | no match, several matches, not in the pool |
| status | a status term | the term | not a status term |
| MoC records | NOT exported (JSON records) | — | — |

Blank cell = no change, the same as the grid today (question 2 asks
whether "clear" is wanted). A value equal to the current effective
value is a no-op, so an untouched sheet uploads as "0 changes".

**Values sheet.** One column per constrained field: taxonomy columns
list every term as its full path (and a second column with the leaf
label for reading); choice columns their choices; the status column
its terms; people columns a note ("email addresses; owners and
approvers must be in the pool") rather than a list — the pool can be
listed too if Ben wants (question 4). The Files sheet's validations
point at these ranges; multi-value columns get the list as a HINT
(Excel validation cannot check ";"-separated lists) and are checked at
upload.

**Scope and permissions:** the export and the upload sit in the task
window's action row beside Set for selected, for anyone who can open
the task (assignees, the creator, controllers), since they are only
another way into the draft. Export carries the EFFECTIVE values (saved
plus unsaved draft) so a half-done grid session is not lost;
the file name is `ingestion-<task>-<date>.xlsx`. A closed task exports
read-only (no upload button).

**Not affected:** no schema, no connector, no deprecation. The grid's
hint text gains a sentence. UAT: new DOC cases in Journey 9 for
export, a clean upload, and an upload with problems.

**Effort:** about three and a half days — the xlsx writer and reader
with tests (1.5), the mapping and problem report (1), the dialog,
grid integration and UAT (1). App-only release.

### Questions — feature 2

1. **Which values export** — saved plus unsaved draft (recommended),
   or saved only?
2. **Blank cells.** "No change" like the grid (recommended for v1), or
   should an emptied cell CLEAR the value? Clearing is a new write kind
   the forms do not have today.
3. **Hierarchical labels.** Full path in the dropdown ("Smelter ›
   Reduction › Potrooms") with leaf labels accepted on upload when
   unique — agreed?
4. **People columns.** List the owners & approvers pool on the Values
   sheet as a dropdown for the role columns, or leave people as
   free-typed emails checked at upload?
5. **Dropdowns matter?** If yes, the hand-rolled writer (recommended);
   if plain cells are enough, SheetJS gets it done faster.
6. **Beyond ingestion.** Should the same round trip later serve the
   register (bulk edit of live documents)? Not in scope now, but the
   writer/reader would be built as a docs-side module so it can.

---

## Order

Feature 2 first: app-only, self-contained, no migration, and the
testers can use it on the next build. Feature 1 second: it is
solution-carrying, touches every process consumer, and needs the
answers above before a line is written.

---

## Decisions (Ben, 2026-10-29)

Feature 1 — site process hierarchies

1. The central hierarchy is today's type trees (Mine / Refinery /
   Smelter), unchanged in content.
2. A site node links to at most one central node; many may share one;
   an unlinked node inherits its nearest linked ancestor's link;
   levels need not match.
3. Site admins edit their own site's tree; super admins edit every
   tree, the central tree and the links.
4. The levels below the site keep the names Area / Process /
   Sub-process.
5. Prod has typed sites and process references on rows but NO document
   tags: build the clone-and-re-point migration tool; no document
   re-tag road.
6. The root term is the site's name as Settings → Organisation spells
   it; a site rename renames the root node and the term in place.
7. Cross-site (central) filters in the first release: the Improvement
   tab and the Documents register. Cadence and value drivers follow.
8. Aliases retire. The Process area sync REMOVES the synonyms the app
   added: at migration each central node's alias values are the app's
   synonyms on its bound term — the migration records them and the
   sync strips those non-default labels, never a hand-typed one.

Feature 2 — ingestion spreadsheet round trip

1. The export carries SAVED values only, and is refused while the
   grid has unsaved changes ("Save or discard your changes first").
2. An emptied cell CLEARS the value (re-asked, Ben 2026-10-29): a cell
   that was non-blank on export and blank on upload clears the file's
   value — a new "clear" write for taxonomy, people, dates, choices
   and text, which the grid gains as well.
3. Hierarchical terms read as the FULL PATH only, strictly: a cell
   must match a path on the Values sheet; a bare leaf label is a
   problem.
4. Owner / approver / reviewer columns get the owners & approvers
   pool as a dropdown ("Name <email>"); other people columns are
   free-typed emails checked against the directory on upload.
5. Hand-rolled .xlsx writer and reader with Excel data validations;
   no library.
6. The module is docs-side and ingestion-free so the register can
   reuse it later; only the ingestion buttons ship now.

Order: feature 2 first (app-only), then feature 1 (solution-carrying).

---

## Built (2026-10-29) — feature 2

- `docs/xlsx.ts` (pure, tested): the .xlsx writer — stored zip entries,
  inline strings, hidden columns and rows, bold header, frozen panes,
  list data validations pointing at another sheet — and the reader:
  central directory, stored or deflated entries through an injected
  inflate (`browserInflate` = `DecompressionStream("deflate-raw")`;
  node's zlib in the tests), shared strings with rich runs, inline
  strings, numbers, booleans; `excelSerialToIso` for a typed date.
- `docs/sheetRoundTrip.ts` (pure, tested, ingestion-free): `exportCell`
  (term paths, "Name <email>", ISO dates), `buildSheets` (the Files
  sheet with the hidden id column and internals row, the Values sheet
  with a note, every listed column's values, validations on the
  single-value listed columns), `parseSheet` / `mapCell` (strict by
  kind; a cell equal to its export is no change; an emptied cell over a
  value is a CLEAR; problems carry the Excel row, file, column, value
  and reason), `parseSummary`.
- `AddFieldValue.clear` and `splitAddWrites`: "" through the validator
  for text, choice and taxonomy, "[]" for people, null through the
  patch for a date. **Dev check owed**: a taxonomy clear through
  ValidateUpdateListItem with "" — if SharePoint refuses it, the
  fallback is the connector patch with null for that column.
- The draft (`ingestionDraft.ts`): a clear is a dirty cell reading ""
  while the saved value is non-blank; a plain blank still drops the
  cell (the forms' rule).
- The grid: an emptied text / choice / date cell over a saved value is
  a clear; the term / people / note popover offers Clear; the name
  column never clears.
- Ingestion task window: "Export sheet" (refused while the grid has
  unsaved changes; saved values only; MoC column left out; reviewers
  are free-typed, owner / approver columns list the pool) and "Upload
  sheet…" (drop zone, report with the problem list, "Apply to grid"
  into the draft, Save changes writes). Both lazy-load the modules.
- Tests: `xlsx.test.ts` (11), `sheetRoundTrip.test.ts`, clear cases in
  `ingestionDraft.test.ts` and `docsModel.test.ts` — 930 in all. UAT:
  DOC-063 (clearing in the grid), DOC-087 (export), DOC-088 (upload).

---

## Built (2026-10-29) — feature 1

- **Schema** (dev-deployed 2026-10-29; solution-carrying): `ben_site`
  and `ben_centralnodeid` on `ben_ltkprocessnode`. `ben_processtype`
  on the site row and `ben_aliasesjson` stay as columns, retired.
- **Model** `shared/schema/process.ts`: `site` / `centralId` on the
  node; `siteRoots` on the tree, `siteRootOf` (case-blind),
  `allSiteRoots`; `centralOf` (own link, else inherited, a central node
  its own), `inCentralSubtree`, `siteNodesUnderCentral`, `rootLabel`;
  `processTermPaths` walks site roots only; `processLabel` is the name
  (aliases retired), `processLabelWithCentral`; `synonymsToRemove`
  replaces `synonymsToAdd`; the migration's `cloneTypeForSite`,
  `processNameFor`, `repointedNodeId`. Tests rewritten.
- **Store** `store/processes.ts`: `allSiteProcessRoots` (the map every
  consumer takes — `siteTypes` → `siteRoots`, one rename across the
  picker, LeanHub, MeetingWizard, Improvement, VDT, hub, wizard);
  `allSiteProcessTypes` kept for the migration readout;
  `clearSiteProcessType`; `renameSiteProcessRoot` (called by the
  Organisation page's site rename).
- **Migration** `processes/migrate.ts`: `sitesAwaitingMigration`;
  `migrateSiteFromType` clones, re-points rituals (column + blob,
  `repointBoardProcess`), initiatives and value drivers of that site,
  clears the retired type. Run per site from Settings → Processes
  ("Clone this type", the retired type preselected).
- **Settings → Processes** rewritten: a strip of sites (site admins
  their own) plus "Central hierarchy" (super admins); a site with no
  tree starts empty or clones a type; the tree editor as before minus
  Local names; every site node shows "↔ <central path>" / "(inherited)"
  / "not linked" — super admins open the link dialog (`mountCentralPicker`:
  type, then the cascading picker; Inherit clears); central nodes show
  "↔ n site nodes"; the site card on the Organisation page lost its
  "Process type" select.
- **Sync** `docs/processSync.ts`: site paths; the synonym step now
  STRIPS the app's synonyms from central nodes that still carry
  aliases and clears them. Settings → Documents wording follows.
- **Cross-site filters**: the Improvement tab at company scope offers
  "Process (across sites)" (central picker; `inCentralSubtree`); the
  register's Process area column offers "Compare across sites" (the
  central pick expands to the linked site nodes' terms through
  `filterFromPicks`). Cadence and value drivers: later (decision 7).
- **UAT**: SET-003/004/005 (Journey 3 — Processes), DOC-072 reworded,
  DOC-089 (register across sites).
