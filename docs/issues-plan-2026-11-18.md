# Issues review — export of 2026-11-17 (45 issues)

Source: the full issues export of 2026-11-17 23:59 UTC (45 reports,
production, app v0.94.0-20-g4f95af2). Reviewed 2026-11-18 against
v0.95.0 plus the Documents paging fix (4d991d9, on dev, not released).

Method: every older report was matched to the plan row that answered
it (`issues-plan-2026-10-26.md`, `-26b`, `-26c`, `-26d`,
`-2026-10-28.md`, `-2026-10-19.md`), and the fix was then looked for in
today's code, not taken from the plan. Every new report was traced to
its cause in the code. Nothing here was checked in the hosted player;
where a hosted or site check is owed it says so.

## The count

| Group | Reports | Count |
|---|---|---|
| Already Done in the list | 35, 36, 37 | 3 |
| Built and released weeks ago, still "New" in the list | 6–14, 16–30 | 24 |
| Dropped by decision, still "New" in the list | 15 | 1 |
| "In progress", already met by v0.95.0 | 38 | 1 |
| New bugs, cause found, not built | 39–45 | 7 |
| Ideas, not built | 1–5, 31–34 | 9 |

The main finding on the older reports is not a code one. 24 of them
were fixed and shipped between v0.77.0 and v0.82.0 (26–29 October),
production has had the fixes for three weeks, and the list still shows
them as New with no message to the reporter (only report 7 has a
reply). Ellen, Kat and Rebecca have not been told to retest. Section 1
gives the status and a reply for each so they can be closed in one
sitting.

## 1. Built and released — reply and close

"Code" is where the fix sits today. All are in production (v0.94.0).

| # | Report | What was built | Release | Code | Reply to the reporter |
|---|---|---|---|---|---|
| 6 | UAT DOC-025: uploaded document won't appear, no message to the owner (Ellen) | The upload had failed at check-in on a required column the form never showed, leaving a hidden checked-out file. The form now reads the library's required columns (list flag and content-type flag), tags them Required, names what is missing under Add and scrolls to it, and refuses before creating anything it cannot complete. After a good Add a line says the document is a draft. | v0.77.0, v0.78.0 | `docs/addDocument.ts:556`, `docs/libraryFields.ts`, `docs/docsScreen.ts:3016` | Fixed. Add now names any required field that is missing. Add creates a draft and does not message the owner; "Submit for review" on the document's menu is the step that notifies. Please retest DOC-025. |
| 8 | Org shows the department only (Ellen) | The details pane shows the whole path ("Bell Bay › Casting") for Organisation and Process area. | v0.78.0 | `docs/docsScreen.ts:4127` | Done. The Org field now shows site and department. |
| 9 | UAT DOC-068: Message assignees did nothing (Rebecca) | A dialog: who hears, a note, Send, and the outcome shown in the dialog. | v0.78.0 | `docs/ingestionScreen.ts:528` | Fixed. The button now opens a dialog. If you are the only assignee it says so, since Teams cannot message you about your own task. Please retest DOC-068. |
| 10 | Change records show only the number (Ellen) | One row per record in the pane: reference (linked), title, date. | v0.78.0 | `docs/viewer.ts:871` | Done. |
| 11 | Linked docs: no way back (Ellen) | "‹ Back to <name>" in the viewer header after opening a link. | v0.78.0 | `docs/viewer.ts:322` | Done. |
| 13 | Loading icon for Document tasks (Ellen) | The button reads "Document tasks · …" with a spinner until the count lands. | v0.78.0 | `docs/docsScreen.ts:1322` | Done. |
| 14, 27 | UAT DOC-031: comments and minor versions not captured (Ellen) | Two causes. The UAT library kept major versions only (corrected by Ben). And a publish on a moderated library wrote a major with no comment; publishing now goes through SharePoint's Approve with the lifecycle's sentence, and each version card says what it was published from. Settings warns on a library with minors off. | v0.79.0 | `docs/sp.ts:333`, `docs/viewer.ts:1261` | Fixed, and the UAT library's versioning was corrected. Please retest DOC-031. |
| 16 | Cannot flag to yourself (Kat) | When you are the only recipient the flag is raised without Teams and the line says where to find it. | v0.79.0 | `docs/flagDialog.ts:122` | Done. A flag to yourself is raised and sits in your Document tasks under Flags. Teams cannot send you a chat from yourself, so no message goes. |
| 18 | UAT DOC-034: "Check in & submit for review" not offered (Ellen) | Not a fault: her document was already In Review. The dialog now says why the button is absent, and the case names the stage. | v0.79.0 | `docs/docsScreen.ts:4866` | The button only shows for a Draft you own. Yours was already In Review. The dialog now says so. Please retest DOC-034 on a draft. |
| 19 | Flag for review: Teams error (Ellen) | Graph refused the apostrophe in the group-chat topic. The topic is now cleaned; the card's wording is untouched. | v0.79.0 | `docs/notifyModel.ts:201` | Fixed. |
| 20 | Mark reviewed creates a major, no comments (Ellen) | Same mechanism as 14. A major on Mark reviewed is by design on a library with content approval, because the review stamp must reach readers. The missing comment was the fault and is fixed. | v0.79.0 | as 14 | Mark reviewed publishes a new major by design. The comment now lands on it. |
| 21 | UAT DOC-040: Cancel revision hidden when checked out to someone else (Ellen) | The command is offered and refuses with the holder's name. | v0.79.0 | `docs/lifecycleCmds.ts:744` | Fixed. Please retest DOC-040. |
| 22 | UAT DOC-042: notify panel reads as already sent; cannot add a recipient (Ellen) | "Nothing has been sent yet" line, "Send on Teams" and "Send by email" buttons, "Add a person…" search. | v0.79.0 | `docs/notifyPanel.ts:44`, `:67` | Fixed. Please retest DOC-042. |
| 24 | UAT DOC-014: site views (Ben) | The blank screen was a code fault (a value read before it was declared) and is fixed, with an import-gate rule against a repeat. The title now leaves the view when the filters drift. | v0.80.0 | `docs/docsScreen.ts:5579`, `:3093` | Own report: retest DOC-014 and close. |
| 25 | UAT DOC-041: Supersede did not ask for the successor (Ben) | A required successor picker; "Superseded by" link and the inverse on the successor. | v0.80.0 | `docs/model.ts:2350` | Own report: retest DOC-041 and close. |
| 28 | UAT DOC-032: Replace content wiped the properties (Ellen) | The copy-over road deleted and recreated the item. It was withdrawn. Replace now writes the bytes in place through the connector, so the record, its id and its properties stay. | v0.80.0 | `docs/sp.ts:444`, `docs/docsScreen.ts:4988` | Fixed. Replace content now keeps the document's properties and history. Please retest DOC-032. Tell me if the orphaned test document still needs an owner set. |
| 29 | Check-in: say the comment is required (Ellen) | Required tag on the label and a line under the box. | v0.80.0 | `docs/docsScreen.ts:4846` | Done. |
| 30 | Tasks pane: request details only after Approve (Ellen) | A wider panel and a card per request: full name, who asked and when, the whole reason, Approve, Decline, Open document. | v0.82.0 | `style.css:2661` | Done. |

## 2. Built, but something is still owed

| # | Report | State | Still owed |
|---|---|---|---|
| 7 | UAT DOC-026: duplicate document id allowed (Ellen) | Built in v0.77.0: Add and Edit properties look the id up across the standards libraries and refuse a clash (`docs/addDocument.ts:52`, `:568`, `docs/editProperties.ts:338`). Ben replied on 2026-11-10. | **A gap I found today.** The lookup ends in `.catch(() => ({ rows: [] }))`, so a lookup that FAILS counts as "no clash" and the duplicate goes through. A filter on an unindexed text column is refused by SharePoint once a library passes 5,000 items, which is exactly the size where duplicates matter. Fix: a failed lookup stops the Add with "The document ID could not be checked — try again", and the deploy guide says to index the Document ID column. 1 h, app-only. Also: the 26 October plan said the health report lists existing duplicates; I could not find that in `healthReport.ts`. Duplicates made before v0.77.0 are not surfaced anywhere (see idea 3). |
| 12, 26 | UAT DOC-030: two links refused, "255 characters" (Ellen) | The refusal is SharePoint's, from the LIBRARY's copy of the Linked documents column being single-line text. v0.78.0 added a guard in the editor and a warning with the column's live type in Settings → Documents (`docs/editProperties.ts:354`). | **Site step (Ben):** change the column on the UAT library to multiple lines of text, and read the same warning on each production library. Until then two links cannot be saved there; the app only says why. |
| 17 | Document task stays after approving; a Teams message each time (Kat) | v0.79.0: the grant on the document is the record, a second grant is refused, the ledger is repaired in the background (`docs/accessRequests.ts:388`, `:518`). | **Ben's check:** can Kat's Dataverse role write `ben_ltkdoclibrary`? If not, her repairs keep failing quietly and the row reads "granted — ledger catching up" for good. |
| 23 | "Show only approved" for general users only (Ellen) | v0.79.0 built option A: controllers and super admins land on every status (`docs/docsScreen.ts:6243`). | **Decision:** Ellen asked for owners and approvers too. They still land on approved only. Option B (anyone named owner, approver or reviewer on a document lands on every status) is one extra query at open, about 1 h. Recommend B: an owner with a draft in flight is the person most surprised by an approved-only list. |
| 15 | A template document opens every time the LeanBoard link is opened (Kat) | Cause known: her bookmark is a Teams "work" link that carries a document. A fix (act on a document link once per session, plus "Copy the plain LeanBoard link") was planned and **dropped by Ben on 2026-10-26**. Nothing was built; it still happens. | **Decision:** either reply and close ("your bookmark is a link to that document — bookmark LeanBoard from the Power Apps home page instead"), or build the 1 h fix. Recommend the reply now; build only if a second person reports it. |
| 38 | Document type pills in a set order for Casting (Ellen) | **Already possible since v0.95.0.** Ben's note ("need to implement … default order for each site") was written 11 hours after the tag. Settings → Documents → the ★ in the Document type row opens an editor whose "For" list holds Everyone, each site and each department; the reader takes the person's department list, else their site's, else everyone's (`docs/featuredEditor.ts:215`, `docs/filterModel.ts:59`). | **Config (super admin, 30 min):** ★ on Document type, For "BSL › Casting", add Ellen's seven terms in her order, Save. Check first that all seven exist as terms. The editor has never been seen in a browser (built against tests), so this is also its first real use: run UAT-DOC-093. Gaps found while reading, about 2–3 h together, app-only: (a) a vocabulary of 14 terms or fewer with a featured list shows only the featured pills, so the other terms cannot be picked; (b) opening Filters before the person's profile has loaded shows the Everyone list; (c) only super admins can edit; a site admin cannot set their own site's list. |

## 3. New bugs — cause and plan

All app-only. No schema change. Hours include tests and the UAT case.

### 44. Charter fields far too tall once one field is long (Damon) — 1 h

- **Cause (reproduced in the charter harness):**
  `controls/CanvasCard/styles.ts:38` gives the grid
  `grid-auto-rows: minmax(60px, 1fr)`. When the content is taller than
  the card, every `1fr` row takes the height of the neediest row. Forty
  lines in Scope In turned all eight rows from 60 px to 256 px, Title
  included.
- **Fix:** `minmax(60px, auto)`. Measured: only the rows the long field
  spans grow; a tall card with short content still shares the spare
  height as today.
- **Risk:** the rule is shared by the focused view, the popup charter
  and tiles. Low; the designer does not use it.

### 41. Charter tile text tiny on the initiative board (Sue) — 2 h with 44

- **Cause:** `CanvasEditor.fitTile` (`controls/CanvasCard/editor.ts:237`)
  scales the whole grid down to fit the tile, to a floor of 0.5. The
  height it measures is inflated by the 44 rule, so a charter with one
  long field lands on the floor: 14 px text at half size. It also
  measures once, before widening the grid, so it shrinks more than it
  needs to.
- **Fix:** after 44, raise the floor to 0.75 and measure again after
  widening. Content past the floor clips at the tile edge, as every
  other tile does.
- **Note:** the report says `#/priorities`, but the screenshot is the
  initiative board's tile view. The fix covers both that and the popup.

### 39. Action Plan tile cannot be scrolled (Sue) — 3–4 h

- **Cause:** by design, not a fault. Every tile on every board is an
  inert picture: `shared/ui/baseCss.ts:606` turns off pointer events
  inside `.ltk-tile`, and the kanban body is `overflow: hidden`. The
  rule exists so a board on a shared screen cannot be typed into or
  dragged by accident. What IS wrong is that the tile is dishonest: it
  paints every action at full length, so five long titles run off the
  bottom with no sign that more exist.
- **Fix (recommended):** keep tiles inert. Clamp an action's text to
  three lines in a tile and put "+N more" at the foot of a column that
  does not fit, as the Links card already does.
- **Alternative:** let the kanban scroll inside a tile. 4–6 h and it
  breaks the inert-tile rule: wheel-trapping while scrolling the board,
  drag in edit mode, touch on the phone. Not recommended.
- **Already fixed in v0.95.0:** the "1 completed hidden" in her
  screenshot (issue 35).

### 45. Initiative card-to-card is slow (Ben) — 4–6 h

- **Cause (read, not timed):** meetings and initiatives use the same
  walk (`app/src/screens/cardEditor.ts:171`), with no remount. But on
  an `init-` board every card switch first awaits
  `makeInitiativeBinding` and `initiativeAssignees`
  (`cardEditor.ts:205–211`). In `improvement/binding.ts` those run one
  after another and mostly uncached: all initiatives, the full roster
  (bypassing the walk's own cached roster), the improvement settings
  twice, the template twice, and the whole priority cascade when the
  initiative has a primary. That is about ten reads in a row against
  two for a meeting, and it runs for every card though only the Charter
  uses the result. It has been so since 2026-10-08; v0.95.0 did not
  cause it.
- **Fix:** read settings, template and roster together and once;
  cache settings and template behind `memoRead` with their writers
  through `writing()`; load the cascade only when a field shows the
  priority; build the binding only for a canvas card; run it beside the
  card's own reads, not before them.
- **Proof:** boards have no timing readout. Add one for super admins
  (the Documents one, moved out of `src/docs/`) so the before and after
  can be read in the player. 1–2 h, included above.
- **Risk:** a stale charter field if a writer misses `writing()`.

### 40. Who finds a person, Support does not (Sue) — 3–4 h

- **Cause:** both search the same people list, but only Who also
  searches the directory (for admins). Support is roster-only
  (`shared/ui/actionUi.ts:491`). The likely case: Sue is an admin and
  searched someone not yet in LeanBoard, so Who found them in the
  directory and Support could not. v0.95.0 did not change this; Support is also still the old
  two-column result grid, not the standing type-ahead.
- **Second fault:** a person an admin adds through Who is not added to
  the dialog's people list, so Support cannot find them even then.
- **Fix:** one search source for both (chips, roster, then the
  directory for admins) and Support drawn with the same type-ahead.
  The admins-only rule for directory adds stands.

### 43. Cascade: pills against rectangles; two levels at most (Ben) — 5–7 h

- **Format (2–3 h).** People with no tick box in the grid are drawn as
  pills on purpose ("a hundred tick boxes would bury the form",
  `actionUi.ts:151`). That holds for a hundred, not for four. Draw
  them as the same sign-off boxes in the same grid, keeping the fold
  at 12 and "Remove all".
- **Levels (3–4 h).** Today the choice is "Direct reports" or
  "Everyone below", and "everyone" walks eight levels to 1,000 people
  (`app/src/actions/team.ts:17`). Change to "Direct reports" and
  "Direct reports and their reports", and add a ceiling on one cascade
  (proposed 50) that refuses with the count.
- **Fault found on the way:** every depth-limited cascade says "The
  directory answered only in part", because stopping at the depth
  asked for is counted as a cut-off
  (`app/src/store/directoryWalk.ts:118`). Fixed in the same change.
- **Question:** the ceiling. 50?

### 42. Default filters offers company-level entries only (Ben) — 3 h

- **Cause:** a regression from the company model. The tick list offers
  ONE depth of the Organisation set, chosen by a rule from 2026-08-14:
  sites at depth 2 only when the set has exactly one top-level term
  (`app/src/docs/settingsTab.ts:2460`). The screenshot shows two
  (RTAL PacOps, Training), so the list fell back to depth 1 and shows
  companies. The reader side already handles any depth.
- **Second fault:** the reader leads with the member's own site only
  if it is ticked (`docsScreen.ts:2532`). With only a company ticked,
  the default filter is the whole company, which is not what the hint
  says ("their own plus…").
- **Fix:** an indented tick tree, companies with their sites beneath,
  and the reader always leads with the member's own site.
- **Effect on saved rows:** "Operational Excellence → RTAL PacOps"
  changes from a whole-company default to own site first with the
  company still visible. That is the documented intent.
- **Question:** sites only (as decided in August), or departments too?
  Departments is 1–2 h more and reverses that decision.

### Also on dev, waiting for a release

- Documents register stopped at 20 on a tall window: fixed in 4d991d9.

## 4. Ideas — where each stands

| # | Idea | Today | Smallest build | Hours | Needs from Ben |
|---|---|---|---|---|---|
| 1 | Naming guidance on upload (Holly, August) | Nothing. Ben's resolution: "to be developed". | A naming rule in Settings → Documents (free text shown under the file name on Add and Replace) plus soft warnings for accents, special characters and extra dots. Warn, never refuse. | 2–3 | The rule's wording; warn or refuse. |
| 2 | Translation (Johanne) | Parked, told to the reporter. About 4–5k strings; scaffolding 12–16 h, extraction 80–120 h. | — | — | Leave Triaged. |
| 3 | Catalogue of document IDs including obsolete and superseded (Marianne) | Mostly there: untick "Show only approved", add the Document ID column, Export register (CSV). Gaps: the ID column sorts only the rows already loaded, and no report lists duplicates or the highest number in use. Reusing a retired number is refused by the duplicate check, by design. | "Document ID catalogue" in the register kebab: every status, every standards library, sorted by ID, duplicates marked, CSV. Also covers the duplicates gap in report 7. | 3–4 | Confirm that retired numbers are never reused. |
| 4 | Document traveller (Ben, Marianne) | Parked: needs its own design (acknowledgement ledger, distribute on approve; 30–45 h, a schema release). | — | — | Leave Triaged until picked up. |
| 5 | Actions "By person"; Gantt grouped by kanban category (Ben) | The Gantt half exists: with Kanban grouping "By issue" the Gantt groups by those columns (`controls/ActionBoard/editor.ts:613`). No person grouping anywhere, only a filter. | "By person" as a third kanban grouping (status, issue, person), which the Gantt then follows. A shared action shows under each of its people with that person's part. | 6–9 | Does dragging a card between people reassign it? Proposed: yes for a single-owner action, refused for a shared one. |
| 31 | Show a card's content from the previous meeting on another card (Alicia) | A Link card shows another card read-only, but always its LATEST content (`app/src/store/policies.ts:108`). | A Link card setting "Show: latest / the previous meeting". | 5–7 | Is a read-only tile beside the discussion card enough? Inside the card is 12–16 h more. |
| 32 | Prompts: show or hide, position, formatting (Alicia) | Three kinds, all plain text: card prompts (behind the ⓘ and as the empty state), a canvas field's hint (shown only while empty), an agenda item's prompt (always shown). | On canvas fields: show "while empty / always", and rich text for the hint using the existing editor. | 7–9 | Which prompt she means. Her screenshot points at the canvas field hint. |
| 33 | Rich text headings in canvas cards (Alicia) | Her screenshot is a field LABEL: 11 px, one line, cut off with "…" (`controls/CanvasCard/styles.ts:71`). Her question is longer than the box. | Labels wrap, and a per-field label style (size, bold, colour). Not free HTML: rollups match columns by label text. | 4–6 | Is wrap plus size, bold and colour enough? Wrap alone is 1 h and fixes what the screenshot shows. |
| 34 | People picker in capture cards (Alicia) | Capture has no person column. The Canvas card has Person and People fields today, which is a workaround. | A "person" column type using the shared type-ahead. | 6–8 | Names only, or must the people be notified or reportable? Names only is the cheap one. |

## 5. Proposed order

1. **Close-out, no code (Ben, about an hour).** Send the section 1
   replies and set those 19 reports Done. Section 2: fix the UAT library's
   Linked documents column (12, 26), check Kat's role (17), set
   Casting's featured document types (38), reply to Kat on 15.
2. **v0.95.1, app-only, about 8 h.** The paging fix already on dev,
   then 44 and 41 (charter), 7 (duplicate check fails closed), 23
   option B if agreed, 39 (honest tiles).
3. **Next round, app-only, about 17–23 h.** 45 (initiative speed with
   the timing readout), 40 and 43 (one people search, cascade format
   and levels), 42 (default filter tree), 38's three gaps.
4. **Ideas, by decision.** Cheapest first: 33 wrap only (1 h), 1 (2–3 h),
   3 (3–4 h), 31 (5–7 h), 5, 34, 32.

## Decisions of record (Ben, 2026-11-18)

Ben worked through every question. These replace sections 5 and 6
where they differ.

| # | Decision |
|---|---|
| 23 | **Leave as it is.** Controllers and super admins land on every status; owners and approvers untick the toggle. Reply to Ellen and close. |
| 15 | **Reply and close.** No build. Kat bookmarks LeanBoard from the Power Apps home page. |
| 39 | **Honest inert tiles.** Three-line clamp and "+N more" per column. Tiles stay inert. |
| 42 | **Companies and sites.** An indented tick tree, no departments (the August decision stands). The member's own site always leads. |
| 43 | **Two levels, no ceiling.** "Direct reports" or "Direct reports and their reports". No count limit on a cascade: two levels is the limit. The action's own cap of 500 people stays. Cascaded people are the same sign-off boxes in the same grid. |
| 40 | **One search for Who and Support**, directory included for admins. |
| 45 | **Fix only.** No timing readout. |
| 7 | **A failed lookup stops the Add.** |
| 38 | **Two gaps fixed:** the other terms stay reachable on a small term set; the pills wait for the person's profile. Site admins editing their own lists: not now. |
| 1 | Naming guidance: **not now.** |
| 3 | Catalogue: **reply with the workaround** (untick Show only approved, add the Document ID column, export CSV). No build. |
| 5 | **By person as a third kanban grouping**; the Gantt follows. A single-owner card dragged to another person is reassigned; a shared action refuses the drag. |
| 33 | **Labels wrap.** No label styles. |
| 31 | Previous meeting on a Link card: **not now.** |
| 32 | Prompts: **not now.** |
| 34 | **Person column in capture cards, with identity.** Older builds must be locked out, since they would corrupt the cells on save. |

**Delivery: three tranches to dev**, each pushed when its gates pass;
Ben cuts releases.

1. 44, 41, 7, 39, 33 (with the paging fix already on dev).
2. 45, 40, 43, 42, and the two 38 gaps.
3. 5 and 34.

## As built — tranche 1 (2026-11-18, on dev, NOT released)

- **44** `controls/CanvasCard/styles.ts`: reading rows are
  `minmax(60px, auto)`. Harness (`charter.html?long=1`): forty lines in
  Scope give rows 60 / 256 / 256 / 256 / 60 / 60 / 60 / 60, where every
  row was 256.
- **41** `controls/CanvasCard/fit.ts` (`fitScale`, tested) and
  `editor.fitTile`: the floor is 0.75 and the scale is searched for,
  not taken from one measurement. Harness (`?tile=1`): a short charter
  0.917; with forty lines 0.75 and clipped.
- **33** labels wrap in a reading canvas (the designer keeps one
  line). **Correction to section 4:** Alicia's screenshot does NOT show
  a cut-off label. The label there is whole; the cut-off line under it
  is the designer's preview of the field's value. Her words ask for
  FORMATTING of the label (a question used as a heading reads as 11 px
  grey text). Wrap is right for narrow fields but does not answer that.
  The label style (size, bold, colour; 4–6 h) is still open with Ben.
- **7** `documentIdInUse` (`docs/addDocument.ts`): the hole was wider
  than the `.catch`. The feed answers a REFUSAL as no rows plus an
  error, which read as "no clash" with no exception at all. Now a
  lookup that cannot be made throws `DocIdUnchecked`; Add, Edit
  properties and the ingestion run stop and say so. One exception,
  my call: a library the person may not READ is skipped, since
  refusing there would stop them adding any document at all. The
  deploy guide says to index the Document ID column.
- **39** `controls/ActionBoard/tileFit.ts` (`tileShown`, tested) and
  `editor.fitTile`: in a tile an action's words stop at three lines,
  and a kanban column or a list that does not fit shows whole cards
  and "+N more". Harness (`actionboard.html?tile=1`): 3 of 11 shown,
  "+8 more". Tiles stay inert.
- UAT: IMP-010 and ACT-011 added, DOC-026 extended.

## As built — tranche 2 (2026-11-18, on dev, NOT released)

- **45** `improvement/binding.ts`, `screens/cardEditor.ts`,
  `store/priorities.ts`. An initiative card switch now reads the
  initiative's row, the settings and the template ONCE (the last two
  together), keeps them for the walk (any write to an initiative drops
  them), builds the charter binding only for a canvas card, reads the
  primary priority as ONE row and only when the card shows it (it was
  the whole cascade), asks for the roster only when a role picker
  opens, and all of it travels BESIDE the card's own row and actions
  instead of in front of them. Counted in `initiativeBinding.test.ts`:
  three reads for the first card, none more for a later canvas card.
  The settings and template were NOT put behind a cache of their own:
  their writers do not go through `writing()`, and a stale charter was
  the 2026-10-01 fault. No timing readout (Ben). **Not timed anywhere;
  the hosted player is the proof.**
- **40** `shared/ui/actionUi.ts`: one `peopleSearchBox` for Who and
  Support (the app's people, then the directory for admins). A person
  added through either is found by the other. Harness: Support found
  and added a directory person; Who then listed them.
- **43** people added by a cascade, and assignees from outside the
  grid, are boxes in the same grid (`extra`), folded past twelve behind
  "+n more", with "Remove all". The choice is "Direct reports" or
  "Direct reports and their reports" (`reports(leader, 1 | 2)`); no
  ceiling on the count beyond the action's own 500. The note no longer
  says "answered only in part" for stopping at the depth asked for
  (`walkReports` now returns `capped`). Harness: 16 added as boxes,
  "+4 more", no pills.
- **42** `docs/filterModel.ts` (`defaultFilterRows`,
  `defaultBranchRoots`, `firstVisitFolds`, tested), Settings and the
  register. The tick list is a tree of companies with their sites; the
  member's own site always leads; a mapped company that holds the
  member's site is not folded over it. **Saved rows change meaning:**
  "Operational Excellence → RTAL PacOps" now opens on Operational
  Excellence alone with the company's other sites folded beside it,
  where it opened on the whole company. **The Settings section has not
  been seen in a browser** (no harness page for Settings).
- **38** short vocabularies get "Show all n" (their other terms had no
  way in), and the Filters pane waits for the person's profile before
  it paints pills.
- UAT: IMP-011 added; ACT-006, ACT-009, DOC-076, DOC-093 extended.

## 6. Questions for Ben

1. 23: owners, approvers and reviewers land on every status too?
2. 15: reply and close, or build the once-per-session fix?
3. 39: honest inert tiles (recommended), or scrolling inside a tile?
4. 43: the ceiling for one cascade. 50?
5. 42: sites only, or departments as well?
6. Ideas 1, 3, 5, 31–34: which go ahead, and the answer in each row's
   last column.

## Sources of the findings

Older reports: read against today's code by hand (file and line in
each row). New reports and ideas: five read-only investigations, each
key claim then re-read in the code. Reproduced in a harness: 44 and
41. Read only, not timed: 45. Not seen in the hosted player: all of it.
