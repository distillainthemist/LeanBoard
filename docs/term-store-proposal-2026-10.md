# Term store management (proposal — critical review, 2026-10-12)

Ben: "a more user friendly interface to manage the term store. We
already align the organisation with the Organisation term set. First,
how will this handle an Organisation renamed in the app — can it
update the term without creating a new term? Second, a user-friendly
interface to view each term set through its hierarchy and manage its
translations and synonyms — ideally a popup when a term set is
selected. Other term sets will need synchronisation like the
organisation (most likely the process area term set)."

## 1. What exists today

- **Reads**: the term store's v2.1 endpoints through the SharePoint
  connector (`sp.ts`): groups, sets, a set's terms (`id, labels`),
  children level by level (`cachedTermPaths` — a depth- and
  request-capped walk, cached in localStorage for screens), one term
  with its full label collection, the store's default language.
- **Writes**: `createTerm` (one default label, the store's language),
  `patchTermLabels` (replace the label collection — the in-place
  rename, GUID kept), used by the Organisation sync and by tag
  minting / renaming (Settings → Documents → Tags). Nothing deletes.
- **Organisation sync** (`orgSyncPlan` in model.ts, `executeOrgSync`):
  Settings → Documents → Term store binds ONE set as the Organisation
  set (optionally company-rooted); "Load drift report" walks the set,
  compares it with the app's organisation BY LABEL PATH, and the
  report is the plan: creates (parent-first), renames, orphans (left
  alone, listed). Apply runs it; nothing is ever deleted.
- **Settings → Documents → Term sets & colours**: one palette card per
  term set a column uses (status, importance…) — colours by term id.

## 2. Question 1 — a renamed organisation node

**Today it is handled, but only by inference.** Matching is by label,
so a renamed node is "missing" on the app side and "spare" on the term
side. The planner pairs them as a RENAME (the term keeps its GUID and
every tagged document keeps its term) only when, within one parent,
exactly one app node is unmatched and exactly one term is spare. That
covers the common case — rename one site, one department, one area,
then sync. It fails honestly in the others: two siblings renamed before
a sync, or a rename plus a new sibling, become a CREATE and an ORPHAN,
and the old term lingers with its tags. There is no identity between an
app node and its term beyond the label.

**The fix is identity, not better guessing.** Two complementary parts:

1. **A rename journal.** When the app renames a site, department or
   area (`renameSiteRow`, the department / area renames in the
   Organisation editor), it also records `{ from path, to path, at }`
   in the app's docs configuration (JSON — no schema). The next drift
   report consumes the journal as EVIDENCE: a journaled rename is an
   exact rename of the term found at `from`, whatever else moved; the
   journal clears when its entries are applied or no longer match
   anything. Two siblings renamed, a rename beside a create — all
   exact.
2. **A term binding.** Once a sync has matched, created or renamed a
   term, the app remembers `path → term id` for the set
   (`termBindings[setId]`, JSON in the same config). From then on the
   comparison is by ID first, label second: a bound node whose label
   differs from its term's default label is a rename by definition. The
   journal covers the time between a rename and the first sync that
   binds; the binding covers everything after.

Push at the moment of the rename ("live") is possible — the term store
write is one call — but the Organisation editor is on the board path
and the term store is docs-only (the import gate), the person renaming
may lack term-set rights, and a failed live write would need the
journal anyway. Recommendation: journal + binding, with a one-line
"Organisation changed since the last sync — Sync now" prompt in
Settings → Documents so the sync is never forgotten.

### Status — BUILT 2026-10-12 (dev, unreleased)

- `AppDocsConfig.orgRenames` (the journal) and `termBindings[setId]`
  (path key → term id), parsed and serialised; `pathKey` is the one
  key.
- `docs/orgJournal.ts` `journalOrgRenames`: the Organisation editor
  calls it (dynamic import) after a site rename and after the save
  that commits department / area renames; a second rename of the same
  node collapses onto the first (the term is still at the original
  label until a sync).
- `orgSyncPlan(…, evidence)`: bindings first (a bound node whose term
  still exists matches by id; a different label is an exact rename,
  children re-keyed), then the journal (the term at FROM renamed to
  TO), then the label inference for the rest; `plan.matches` lists
  what matched by id or label. Tested: two siblings renamed at once —
  blind = two creates and two orphans; journaled = two exact renames;
  bound = one exact rename with the child re-keyed.
- `executeOrgSync` returns `{ failed, bindings }`; the drift report
  writes them into `termBindings`, drops the journal entries that
  landed, and saves the configuration at once. The Term store section
  shows a warning line while renames wait: "The organisation changed
  since the last sync — n renames recorded (Casting → Casthouse)…".
- **Colours moved into the manager** (Ben, 2026-10-12: "better
  integrated"): the term panel carries Colour (the site state palette)
  and Glyph, written to the set's palette entries and saved with the
  Settings bar like every palette change; the tree shows a dot in the
  term's colour. A term set's card in "Term sets & colours" is now one
  line — name, "n values coloured", "Manage terms & colours…" — while
  Choice columns (no terms) keep their value rows.

## 3. Question 2 — the term-set manager (the popup)

### What the API allows (web-checked 2026-10-12)

- A term's `labels` are `{ name, languageTag, isDefault }`: the
  default label per language, synonyms as further labels in the same
  language with `isDefault: false`, TRANSLATIONS as labels in other
  language tags. PATCH on the term replaces the collection — read,
  modify, write (as the sync already does, which is why synonyms
  survive a rename).
- A term carries localized `descriptions` and `properties` too.
- Create = POST children under the set or a term. DELETE exists.
- **There is no move / re-parent.** Moving a term means create under
  the new parent, recreate its children, re-tag documents, delete the
  old — a different thing from a move, and not something the manager
  should pretend to offer.
- The store's working languages are a store-level setting
  (`languageTags`); the manager reads them and offers a column per
  language, never invents one.
- Rights: the signed-in user needs term-set contributor / group
  manager rights; a refusal surfaces per action, as the sync's log
  does.

### The surface

A full-screen sheet (the ingestion sheet's idiom), opened from a
"Manage terms…" link on each card in Term sets & colours and from the
Term store section for the Organisation set:

- **Left: the tree.** Collapsible rows (the Organisation page's
  26px row idiom), indented by depth, a search box that filters and
  expands to the hits, a count per set. A click selects a term; "＋
  Add child" on a row and "＋ Add top-level term" at the head.
- **Right: the term.** A row per working language: the default
  label (editable), the synonyms as chips with an adder; the
  description; the term id (copyable — colours and filters key on
  it); where it is used (a count from SharePoint search on the term
  id, with a "Show in register" link). Rename = edit the default
  label (in place, GUID kept). Delete only when the usage count reads
  0, with a confirm that says a tag applied in the meantime would
  lose its term. No move (the API has none; say so in a hint).
- **Save model**: per term, one PATCH on "Save term" (the label
  collection is one write); the tree repaints from the response and
  the localStorage walk cache is invalidated so every screen sees it.
- **Synced sets read-only where the app is the master**: on the
  Organisation set the manager shows the tree and allows synonyms,
  translations and descriptions (which the app does not hold) but
  not renames, adds or deletes of the structure — those belong to the
  Organisation editor and the sync, or the two sources would fight.

### Status — the manager BUILT 2026-10-12 (dev, unreleased)

`docs/termManager.ts` (the sheet), `docs/termManagerModel.ts` (pure,
tested: `labelsByLanguage`, `composeLabels`, `buildTree`,
`visibleIds`), `sp.ts` (`fetchTermStoreLanguages`, `fetchTermDetail`,
`patchTerm`, `deleteTerm`). Opened from "Manage terms…" under each
card in Settings → Documents → Term sets & colours and beside the
Organisation term set in the Term store section (structure locked
there). Tree: top level open, chevrons, a collapsed row's child count,
a search that shows hits in their branch. Term: a card per working
language (default label — the rename, kept on the GUID — and synonym
chips with an Enter-to-add box), the default-language description, the
id with Copy, "Count usage" (search over the columns reading the set,
bounded to the exposed libraries), Save term (one PATCH of labels +
descriptions; the walk cache invalidated; the tree re-labelled down
the branch), ＋ Add child / ＋ Add top-level term (a prompt, created in
the default language), Delete… (enabled only with no children and a
counted usage of zero; the confirm names the index's lag). Ben's
check: open a set, rename a term, add a synonym, save; see the register
filter read the new label after a reload.

### Which sets sync, and which the manager owns

Sync applies only where the app holds a master list: the
organisation today. The "process area" question is which way the truth
runs: if the app gains a process-area master (the way it has an
organisation tree), the same journal + binding + plan machinery covers
it (`syncedSets: [{ setId, source }]` in the docs config instead of
one `orgSetId`); if the term set IS the master, the manager is the
whole answer and nothing syncs. Today the app has no process-area
model — the "Management process" column is a term-backed column like
any other — so the manager is the road unless a process model is
planned.

## 4. Effort

- Journal + binding + ID-first planner + "Sync now" prompt: about a
  day (pure, tested — `orgSyncPlan` gains a bindings argument).
- The manager sheet: tree, term panel with languages / synonyms /
  description, add, rename, usage count, guarded delete, cache
  invalidation: about three days.
- `syncedSets` generalisation: half a day, only when a second
  app-master set exists.

## 5. Decisions — with Ben (2026-10-12)

1. **Renames: journal + binding, with a "Sync now" prompt** — no live
   push from the Organisation editor.
2. **Languages: the term store's working languages** — a row per
   language the store is configured with; none invented.
3. **Delete: only a term with zero usage** (a search count on the term
   id), with a confirm; otherwise the manager renames, adds and
   annotates.
4. **Process area: the app WILL hold a process-area model** that syncs
   to its term set with the same journal + binding + plan machinery
   (`syncedSets`). The shape of that model, where it is edited and
   what else in the app reads it are the next decisions (§6).

## 6. The process model (Ben's shape, 2026-10-12)

Ben: three levels — area › process › sub-process; its own Settings
tab, "Processes"; PROCESS TYPES (Mine, Refinery, Smelter…) managed
there, and on the Organisation page a process type is assigned; read
by the register's filters and views, rituals, initiatives and value
drivers, the association always optional; "process area" is separate
from the existing "Management process" column.

### The model

- **A process type is a named hierarchy.** Mine, Refinery, Smelter —
  each carries its own tree of area › process › sub-process. A SITE is
  assigned one type (assumption: per site, on the Organisation site
  card beside its hub tabs and cascade settings; a department-level
  override only if a site ever runs two kinds of plant). A site's
  processes are its type's tree.
- **Storage: one table, `ben_ltkprocessnode`** — a row per node at
  every level, `ben_nodeid` (stable id), `ben_parentid`, `ben_level`
  (0 type · 1 area · 2 process · 3 sub-process), `ben_name`,
  `ben_order`, `ben_termid` (the binding), `ben_isarchived`. Archive,
  never delete, once anything references a node. Queryable for Power
  BI, stable ids for references, no JSON blob to outgrow.
- **References**: `ben_processnodeid` (text, the node id) on boards
  (rituals), initiatives and value drivers; `ben_processtype` on the
  site row. All optional. Solution-carrying release.
- **One picker** (`processPicker`): type (fixed by the site) › area ›
  process › sub-process as cascading selects, any level may be the
  leaf ("Production" alone is a valid association), "—" clears.
- **Settings → Processes** (super admins): a type strip (＋ New type,
  rename, archive) and the tree editor in the Organisation page's
  collapsible-row idiom: add, rename, reorder, archive at each level;
  a rename journals (§2) for the sync.
- **The term set**: a NEW "Process area" set (bound in Settings →
  Documents → Term store beside the Organisation set — `syncedSets`
  replaces the single `orgSetId`), four levels mirroring type › area ›
  process › sub-process; a new site column "Process area" (role
  `processArea`) on the controlled libraries, distinct from Management
  process. Journal + binding + plan as for the organisation.
- **Consumers**: the register's Process area filter understands the
  hierarchy (a parent includes its children — the B1 subtree rule);
  Cadence filters rituals by process; the Improvement tab filters and
  groups initiatives by process; the value driver tree offers a
  by-process view. Each surface adds one optional field and one
  filter; nothing is required anywhere.

### Site-specific names (Ben, 2026-10-12: "Casting" at large, "Casthouse" at one site)

The term store cannot say WHICH site calls a process what: a synonym is
a non-default label on the term, global to the store. So the site
scoping is the app's, and the term store receives the consequence:

- **A node carries local names per site**: `ben_aliasesjson` on the
  process node — `{ "<site>": "Casthouse" }` — edited in Settings →
  Processes ("Local names…" on a node: a text box per site that is
  assigned this process type). No extra table.
- **One display rule, `processLabel(node, site)`**: the site's local
  name when the surface has a site in scope (a ritual, an initiative,
  a value driver, a document, the picker on that site), the general
  name otherwise (cross-site filters, the Processes tab itself), and
  the other name as the hover — "Casthouse (Casting)". Pure, tested,
  used by every consumer; no surface carries its own copy.
- **The sync pushes every local name as a SYNONYM** of the term
  (labels with `isDefault: false` in the store's language), so the
  SharePoint picker suggests "Casthouse", search finds it, and the
  register's filter matches it; the default label stays the general
  name. The planner diffs the synonym set as it diffs labels — adds
  and removes only the app's own aliases, never a synonym someone
  typed in the term store by hand (the binding records which synonyms
  the app owns).
- **The register's Process area column** shows the general name (the
  term's default label is what SharePoint returns); in a single-site
  view the cell adds the local name beside it, from the model.
- **Renaming a local name is not a term rename**: it is one synonym
  out, one in; the journal is for default labels only.

### Status — the model BUILT 2026-10-12 (dev, unreleased; SOLUTION-CARRYING)

- **Schema** (deployed to dev with a refreshed token — no new sign-in):
  `ben_ltkprocessnode` (`ben_nodeid` key, `ben_parentid`, `ben_level`,
  `ben_order`, `ben_termid`, `ben_aliasesjson`, `ben_isarchived`);
  `ben_processtype` on the site row; `ben_processnodeid` on boards,
  initiatives and value drivers (optional — step 4 wires them). Five
  services regenerated.
- **Model** `processes/model.ts` (pure, tested): rows ↔ nodes,
  `buildProcessTree`, `liveChildren`, `processPath` / `typeOf` /
  `processPathLabel`, `nextOrder`, `reorder`, and THE display rule
  `processLabel(node, site)` / `processLabelWithGeneral`.
- **Store** `store/processes.ts`: cached list, upsert by node id
  through `writing()`, the site's type.
- **Settings → Processes** (super admins, `processes/settingsTab.ts`):
  the type strip (chip per type, hover lists its sites, ＋ New type…),
  the selected type's tree in the Organisation page's collapsible-row
  idiom — ＋ Add area / process / sub-process, Rename, ↑ ↓, Local
  names… (a text box per site assigned to the type, else every site;
  blank or equal to the general name = none), × Archive (never delete;
  children go with it). Writes land at once.
- **Organisation → site card**: "Process type" select beside Hub tabs
  and Cascade customisation, saved on change.
- **Step 4 BUILT 2026-10-12 (dev)** — the model moved to
  `shared/schema/process.ts` (the controls read it; the app re-exports
  from `processes/model.ts`) with `inSubtree` and `flatProcessOptions`;
  the ONE picker `shared/ui/processPicker.ts` (area › process ›
  sub-process under the site's type, rebuilt in place, "— any … —"
  clears to the parent, an archived chosen node still shows).
  - **Rituals**: `meeting.processNodeId` on the blob (`MeetingInfo`,
    the wizard draft), mirrored to `ben_processnodeid` on save; the
    MeetingWizard's Organisation step shows "Process" under the area
    when the site has a type (`setProcesses`); the review line names
    it. **Cadence**: a "Process" select after the organisation cascade
    (the scope site's type, indented; a pick includes its subtree) on
    the calendar and the Rituals directory; the hub feeds the model.
  - **Initiatives**: `processNodeId` on the model and row; a "Process"
    row in the header form's Organisation group (create and edit), the
    picker following the site; the Improvement tab's Filters gain
    "Process" (the scope site's areas and processes) and the row meta
    line / tile owner line read the process path in the site's words.
  - **Value drivers**: `processNodeId` on the driver and row; a
    "Process" field in the structure editor (a new child inherits its
    parent's); a "Process" select on the Value drivers settings and
    the hub tab that DIMS the drivers outside the chosen process
    (`TreeOpts.dim`) — the tree stays whole, the links hold.
  - Everywhere the label is `processLabel` / `processPathLabel` with
    the surface's site, so "Casthouse" reads at Bell Bay and
    "Casting" elsewhere.
- **Step 5 BUILT 2026-10-12 (dev)** — the Process area term set.
  `AppDocsConfig.processSetId / processSetName` (chosen in Settings →
  Documents → Term store beside the Organisation set, with "Manage
  terms…" — structure locked there); the column role "Process area"
  (`processArea`) for the site column that tags documents.
  `docs/processSync.ts`: `planProcessSync` = `orgSyncPlan` over the
  live nodes' general-name paths (`processTermPaths`), with the
  BINDING ON THE NODE (`termId`) as the evidence — no journal needed:
  after the first sync every node compares by id, so a rename in
  Settings → Processes is an exact rename of its term;
  `executeProcessSync` runs the shared `executeOrgSync`, writes the
  term ids back onto the nodes, then pushes each node's local names as
  SYNONYMS (`synonymsToAdd`: the store's language, case-insensitive,
  never the general name, added not removed — the manager removes).
  The "Process area sync" block under the Term store section lists
  creates / renames in place / orphans and applies, with a synonyms-
  only push when the trees already agree. The register's filter on a
  Process area column needs nothing new: a taxonomy filter already
  includes a pick's subtree.
  Deploy step for prod: create the "Process area" term set under the
  DMS group, bind it here, add a site column reading it to the
  controlled libraries, map the column's role to Process area in
  Document columns, then run the sync.

### Order and effort

1. **The term manager** (§3) — three days; independent of the model,
   and useful at once for every existing set.
2. **Renames** (§2: journal + binding + ID-first planner + Sync now) —
   one day; the same machinery the process set will use.
3. **The process model** — schema, Settings → Processes with local
   names, the site's type, the picker and `processLabel`: two and a
   half days.
4. **Process on rituals, initiatives, value drivers, and their
   filters** — two days.
5. **The Process area term set**: `syncedSets`, the site column, the
   register filter: one and a half days.

About ten days in all, in two or three releases; steps 3–5
are one solution-carrying release.

## 7. A full alignment — proposals (Ben, 2026-10-12)

The two sync roads (Organisation sync, Process area sync) are
ADDITIVE by design: they create what is missing, rename in place on
evidence or the one unambiguous case, bind, and list the rest as
"in the term set only (left alone)". That is right for a set that
started from the app. It is not a FULL alignment for a set that
existed first (production's hand-made terms), nor after a node is
re-parented, nor for documents still tagged with a term the app no
longer has. Four proposals, in the order worth building:

### 7.1 Reconcile the orphans (the real "force")

The drift report's "left alone" list becomes a decision per orphan:

- **"This is …"** — pair the orphan with an app node that the plan
  would otherwise CREATE. The term is renamed in place (GUID kept,
  tags and stage mappings survive), bound, and the create drops out
  of the plan. This is the admin resolving what the planner refuses
  to guess (two siblings renamed at once; a set made by hand).
- **"Retire"** — deprecate the term (to probe: `isDeprecated` on the
  v2.1 term, as the move probe was done; the fallback is a
  "(retired)" suffix). A deprecated term keeps existing tags readable
  and stops new tagging; nothing is deleted while a document carries
  it.
- **"Leave"** — today's behaviour, explicit.

Pairings are remembered as bindings, so the next report is clean.
A re-parented node cannot be moved (the API has no move, §3): the
report says so and offers "This is …" against the NEW path, which
renames the term's label but leaves it under the old parent — the
honest limit — or Retire + create, with 7.2 to carry the documents.
Effort: one and a half days (plan + UI + bindings + the probe).

**Status — BUILT 2026-10-12 (dev, unreleased).** `docs/termAlignModel.ts`
(pure: `pairableCreates` = siblings only, `createsAfterPairings`,
`decisionCounts`, `verdictFor`) and `docs/termAlign.ts` (`SetAdapter`
per set, `retireTerm` = PATCH `isDeprecated` then the "(retired)"
suffix where the road refuses, `renderOrphanDecisions`, `alignSet` =
decisions → re-plan → sync → fresh walk → verdict). The plan gained
`orphanTerms` (with ids) and `retiredTerms`; the evidence gained
`retired`; the config gained `retiredTerms[setId][termId] = {label,
at, how}`. A pairing IS a binding the admin asserted — the planner's
ID-first step turns it into the in-place rename, and the create drops
out. Both drift reports now show the decision rows in place of "left
alone" and apply through the same run.

### 7.2 Carry the documents

A "Documents tagged with retired terms" sweep per library: the
register's own feed filtered by the retired term's label, each hit
re-tagged with the paired term through the bracketed write the
ingestion run uses (one bracket per file, eight in flight, the
progress bar). Without this, Retire is a label; with it, the
alignment reaches the documents. Effort: one day; reuses
`writeValues` and the ingestion pool.

### 7.3 Verify, then align in one click

Settings → Documents gets **"Align term sets"**: runs the Organisation
plan, then the Process area plan, applies both, re-walks both sets
and reports "aligned" or lists exactly what still differs (an orphan
awaiting a 7.1 decision, a failed write). The Term store warning line
("the organisation changed since the last sync") grows a second
trigger: a process node renamed or archived. Half a day. This is the
"force a full sync" button; 7.1 is what makes it finish clean.

**Status — BUILT 2026-10-12 (dev, unreleased).** Settings → Documents
→ Term store → **Alignment → "Align term sets"**: both configured sets
through `alignSet` with no decisions, a card per set with its log and
verdict lines, then one line for the whole. The warning-line trigger
for process edits is §8's, not built yet.

### 7.4 Rebuild a set (onboarding only)

For a site with NO tagged documents (a new production site before
go-live), a guarded "Rebuild from the app" — delete every term, then
create the full tree and bind — is the fastest exact alignment. The
guard counts tagged documents through the register's feed and refuses
above zero, because a rebuild orphans every tag. Half a day. Not a
day-two tool; worth having for the next site.

### Not proposed

- **Deleting orphans** on sync — a term carrying tags must not go;
  Retire covers it.
- **Pushing the app's ORDER** as the set's custom sort — the store
  sorts alphabetically unless told otherwise and no one reads the term
  picker's order; skip unless the register's filter pane needs it.
- **The app reading the term set as master** — the direction is fixed
  (§1): the app owns names; the set mirrors.

### Recommendation

Build 7.3 and 7.1 together (two days): the one-click align with the
orphan decisions it needs to finish clean. Add 7.2 when the first
Retire is wanted on a site with documents. Keep 7.4 for the next
site's go-live. Open with Ben: whether Retire should deprecate (probe
first) or suffix; whether 7.2 should run unattended or show each
document.

## 8. One-way sync as the rule (Ben, 2026-10-12)

If the app is the only writer of the synced sets — no one adds a term
in the term store directly, as a rule — then §7's reconcile becomes a
one-time cutover and the steady state is simpler than drift reports:

### The operating model

1. **Write-through.** Every app edit of a synced node pushes at once:
   add → create + bind; rename → patch labels in place; local name →
   synonym; archive → retire. The drift report stops being the way
   terms get made and becomes a VERIFIER (§7.3): "aligned", or what
   differs and why.
2. **A push that cannot land is queued, never lost.** The sync writes
   as the signed-in user, who needs term-set contributor rights; a
   site admin renaming their department has none. The rename journal
   is already that queue — extend it to adds, archives and local
   names (`pendingTermWrites`), and the existing warning line in
   Settings → Documents → Term store ("the organisation changed since
   the last sync") flushes it when a super admin opens the tab, or
   on the one-click align.
3. **An unbound term is a fault, not a feature.** Under the rule,
   anything in the set with no binding was added outside the app (or
   predates it). The verifier lists it with two choices, nothing
   silent: **Adopt** (create the app node to match — the only reverse
   step, for a term someone made in good faith) or **Retire**. After
   the cutover, "left alone" goes away.
4. **Re-parenting is create + retire + carry.** The API cannot move a
   term (§3). Moving a node in the app creates the term under its new
   parent, rebinds, retires the old term, and queues the document
   carry (§7.2) so tags follow. The Organisation editor and the
   Process tab say so at the moment of the move ("n documents will be
   re-tagged").
5. **Close the door.** The manager already locks the structure of a
   synced set (`structureLocked`: no add / delete; labels, synonyms
   and colours only). Two more latches: the set's open-for-tagging
   flag off, so the SharePoint tag picker cannot create terms at
   tagging time (to probe on v2.1: the set's `isOpen`; otherwise it is
   a one-time admin setting in the term store, documented in the
   deploy guide); and the term-set contributor group reduced to the
   app's super admins.
6. **Never delete a term that carries a tag.** Retire is deprecation;
   delete stays a zero-usage action in the manager, as today.

### Cutover for a site that already has terms

One pass of §7.1: pair every orphan or retire it, bind everything.
Then the verifier reads "aligned" and write-through keeps it so.
Production's hand-made sets are exactly this case.

### What this replaces

The drift report's Apply as the way terms are made; the "left alone"
list; the second guessing in `orgSyncPlan`'s inference, which stays
only as the cutover's helper. The bindings, the journal, the
read-modify-write rename, and `processSync`'s synonyms all stay.

### Effort

Write-through on the Organisation editor and the Process tab, the
queue, the verifier with Adopt / Retire, and the move-as-recreate
with the carry: about three days, on top of §7.1's one and a half.
Order: cutover tools first (§7.1 + the verifier), then write-through,
then the carry.
