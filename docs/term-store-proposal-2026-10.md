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

## 6. The process-area model — open

What the organisation tree is to sites, departments and areas, the
process-area model is to the management system: a hierarchy the app
owns, edited in Settings, synced to the "Management process" term set,
and read by whatever surfaces classify work by process. To be decided:
the levels (one, two or three), the settings home, and the consumers
beyond document tagging (rituals, initiatives, value drivers, the
register's filters).
