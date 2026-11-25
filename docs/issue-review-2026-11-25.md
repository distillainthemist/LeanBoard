# LeanBoard Issue Review — 2026-11-25

**WORKING RECORD — phase 2 in progress.** Source: `leanboard-issues-2026-11-25.pdf`
(30 reports, all against v0.99.0), reviewed by `issue-review-prompt.md`.
This file is completed as the plan document in phase 3; until then it
holds the triage and each decision as Ben makes it, so nothing rests
on a conversation.

Ben added two items of his own to the round (no issue id, so no row in
the resolution CSV unless filed):

- **N1** — a CSV import that prepares responses and closes issues in bulk.
- **N2** — a version's comment shows under its row in the history, in
  place of the hover tooltip (2026-11-26, from question 1 of cluster A).

## Triage (phase 1, 2026-11-26)

`#` is the export's number. Ids are the Dataverse row ids, in full.

| # | Issue id | Title | Reporter | Module | Type | Cluster | Sev | Value |
|---|---|---|---|---|---|---|---|---|
| 1 | 42db6c12-91e8-f111-84e9-7ced8da2c4f3 | Priority transition | O'Brien, Ben | Priorities | Design gap | F | 2 | H |
| 2 | a51354a0-8fe8-f111-84e9-7c1e528a7790 | Adding pillars | O'Brien, Ben | Settings | Defect | F | 3 | M |
| 3 | 9a809e66-88e8-f111-84e9-7c1e528a7790 | Ingestion task - use keyboard not mouse for data entry | Black, Ellen | Documents | Enhancement | — | 3 | L |
| 4 | ff668fcd-87e8-f111-84e9-7c1e528a7790 | Custom columms reset | Black, Ellen | Documents | Defect | C | 3 | H |
| 5 | ee83abdd-86e8-f111-84e7-6045bdc41cd5 | Metal Delivery process areas incorrect | Black, Ellen | Documents | Not software? | — | 3 | M |
| 6 | 2c7da473-86e8-f111-84e9-7c1e528a7790 | Larger arrows to expand filter menus | Black, Ellen | Documents | Enhancement | D | 4 | L |
| 7 | 76457348-86e8-f111-84e9-7c1e528a7790 | Default select all three doc libraries | Black, Ellen | Documents | Design gap | C | 3 | M |
| 8 | ced74718-86e8-f111-84e9-7ced8da2c4f3 | Filter pane is small | Black, Ellen | Documents | Design gap | D | 3 | M |
| 9 | c3476cd8-85e8-f111-84e7-6045bdc41cd5 | Condense libraries panel | Black, Ellen | Documents | Enhancement | D | 4 | L |
| 10 | 8b7517b2-85e8-f111-84e7-6045bdc41cd5 | Document tasks dashboard | Black, Ellen | Documents | New | D | 4 | L |
| 11 | 44bce45a-83e8-f111-84e9-7ced8da2c4f3 | Documents open at the bottom | Black, Ellen | Documents | Defect | — | 3 | M |
| 12 | e989517a-72e8-f111-84e9-6045bdc4133d | Evidence attachments for approvals on behalf | O'Brien, Ben | Documents | Enhancement | — | 3 | M |
| 13 | 89b02c2d-5ae8-f111-84e7-6045bdc41cd5 | Reviews not marking as complete | O'Brien, Ben | Documents | Defect | A | 2 | H |
| 14 | 549f68b2-59e8-f111-84e7-6045bdc41cd5 | Completion of review | O'Brien, Ben | Documents | Design gap | A | 3 | H |
| 15 | 442001a1-54e8-f111-84e9-7c1e528a7790 | Review status not updating | Dugre, Marie | Documents | Defect | A, B | 2 | H |
| 16 | 2f2da526-54e8-f111-84e9-6045bdc4133d | I declined an edit request and now the document is checked out to me | Black, Ellen | Documents | Defect | A | 2 | H |
| 17 | f74814d4-53e8-f111-84e7-6045bdc41cd5 | Tracked changes are not showing for the approver | Dugre, Marie | Documents | Design gap | — | 3 | M |
| 18 | ceda461a-53e8-f111-84e9-70a8a5567eb6 | Message not sent to reviewer | Black, Ellen | Documents | Defect | B | 2 | H |
| 19 | 999d4611-47e8-f111-84e9-6045bdc4133d | UAT DOC-040: Cancel a revision | Keyes, Holly | Documents | Defect? | — | 3 | M |
| 20 | b7667d42-d0e7-f111-84e9-7c1e528a7790 | Priority-Level Metrics and Initiative Roll-Up | Vallance, Sue | Priorities | Enhancement | — | 4 | M |
| 21 | e2732115-cfe7-f111-84e9-7ced8da2c4f3 | Action Phase Not Reflecting in Workflow Columns | Vallance, Sue | Actions | Design gap | — | 3 | H |
| 22 | 961b76b8-cee7-f111-84e9-6045bdc4133d | Department Filtering Across Initiatives and Actions | Vallance, Sue | Priorities | Design gap | — | 3 | M |
| 23 | 11725f58-c4e7-f111-84e9-7c1e528a789c | Rolling over priority initiative to continue into another year fault | Vallance, Sue | Priorities | Defect | F | 2 | H |
| 24 | e8853a1a-c1e7-f111-84e9-7ced8da2c4f3 | Metrics timeframe (dates selection) | Vallance, Sue | Priorities | Enhancement | — | 4 | L |
| 25 | 8674251b-bee7-f111-84e9-7ced8da2c4f3 | Library column keeps appearing | Black, Ellen | Documents | Design gap | C | 4 | M |
| 26 | 79d69ea6-bde7-f111-84e9-7c1e528a7790 | Custom columns disappear | Black, Ellen | Documents | Defect | C | 3 | H |
| 27 | 8dafc340-94e7-f111-84e9-6045bdc4133d | Doc status update | Black, Ellen | Documents | Not software | E | 3 | M |
| 28 | 5bcf3b53-92e7-f111-84e7-6045bdc41cd5 | Updating doc properties | Black, Ellen | Documents | Design gap | E | 3 | M |
| 29 | 83cffed5-8ce7-f111-84e9-7c1e528a7790 | Can we have a link to directly open the Documents tab | Black, Ellen | Documents | Enhancement | — | 4 | M |
| 30 | bd8489ab-8be7-f111-84e9-7c1e528a7790 | Status filter - remove Awaiting Owner Approval | Black, Ellen | Documents | Not software | — | 4 | L |

Clusters: A the review step and check-out state (13, 14, 15, 16); B
Teams message not sent (15, 18); C columns and library selection (4, 7,
25, 26); D the Documents screen on a laptop (6, 8, 9, 10); E what Edit
properties may change (27, 28); F moving priorities into 2027 (1, 2, 23).

Review order agreed 2026-11-26 ("as recommended", one cluster per
message; then each clarifying question, then each decision, one per
message): A+B; F; N1; C; 21 and 22; 5. Then 17, 19, 27, 28, 11, 12.
Lighter at the end: D with 3, 10, 20, 24, 29, 30.

## Decisions so far

### Cluster A and B — reviewed and decided 2026-11-26

Findings (code read; nothing run):

- **13** — the review comment IS on the version (Ben hovered v10.5 in
  production: "Review complete by…"; v10.2 "Submitted for review").
  The history panel finds it because it reads comments from three
  places (`itemVersions({ fillComments })`); the review check
  (`loadReviewState`, and the submit warning in `runLifecycle`, both
  `docs/docsScreen.ts`) reads one. Which place holds it in production
  is not known. The v0.99.0 fix was never seen running.
- **14** — Word's lock, confirmed by Ben: with the document open in
  another tab the step is refused "The file … is locked for exclusive
  use by …"; closed, it works. His own check-out is accepted.
- **15** — Marie pressed Review complete (Ben, 2026-11-26): the same
  fault as 13, plus a message that waits for a second press.
- **16** — Decline never checks out (`declineRequest`). The failed
  Approve took the check-out and stopped at a refused step. Which step,
  and why, is NOT known (question skipped): open until seen again.
- **18** — confirmed: `notifyPlanFor` returns nothing when the
  reviewers column was empty before the dialog, and `showNotifyPanel`
  stops before it looks at the people just added; the dialog then says
  "No reviewer is named on this document".

| # | Decision | Option chosen |
|---|---|---|
| 13 | Build | Fix the read: the review check uses the history's three-place read and matches a reviewer by who made the version; a second press in the same round is refused before any write; an unreadable history says so. Tested on dev with one account before release; if it fails there, back to Ben with "record the review" |
| 15 | Duplicate of 13 | Follows 13; its message is covered by the hand-over rule below |
| 14 | Build | Any step refused by Word's lock says the document is open in Word, to close it and press again (and to wait a moment if refused once more). One place, every step. No warning beforehand |
| 16 | Build | A step that took the check-out itself releases it when it fails, its half-made changes with it; a check-out the person already held is left alone. Lifecycle steps, edit requests, Edit properties (15 places, 3 files). Adding a new document is LEFT OUT (releasing would delete the file). "Cancel revision" on a stray check-out left as it is |
| 18 | Build | Covered by the hand-over rule: people added in the dialog are messaged like any other reviewer; the false line goes |
| 15, 18 | Build (Ben's choice 2) | EVERY hand-over step sends its Teams card at once — Review complete, Submit for approval, Approve, Request revision, as Submit for review does. The panel stays for a second send with edited words, or an email. A failed send shows as a warning. This reverses, for these steps, the 2026-10-26 decision that nothing is sent until the button is pressed (UAT DOC-042) |
| N2 | Build | A version's comment shows under its row in the history |

### Cluster F — reviewed 2026-11-26, NOT yet decided

Findings (code read; one harness run):

- **2** — confirmed: after "＋ Add sub-pillar" the code focuses the
  LAST sub-pillar box in the whole list, not the new one
  (`priorities/settingsTab.ts`, the `addSub` handler); the browser
  scrolls to it, and the cursor is in the wrong row unless the pillar
  is the last.
- **23** — confirmed: nothing on a tile past its planned end offers to
  extend it; and a changed START year carries the old sub-pillar id
  across as it is (`priorities/dialogs.ts`, the `period` change
  handler) without finding the version in force that year, so the
  sub-pillar goes blank even when a follower exists. Moving the start
  also takes the priority off the earlier year's record. The "greyed
  out department" is the priority's own org in the Cascade list.
  Whether Sue's sub-pillar list was empty is not known (Ben not sure).
- **1** — the model's limits are confirmed: a priority crosses a year
  only through the follow link (`pillarIdIn`, `succeedsId`); one old
  sub-pillar per new one, so a merge cannot be expressed
  (`followCandidates`); "Follows" shows only on a row that starts in a
  year, after an old one was ended the year before. Ben needs at least
  one many-to-one for 2027.
- **1 — AN UNEXPLAINED FAULT.** Ben (2026-11-26): the 2027 sub-pillars
  were NEW rows WITH a follow link, one to one ("Safety" follows
  "Continuous Improvement Safety"), and "as soon as we introduced the
  new sub-pillars and follow link, it broke it": at Weipa in 2027 the
  page has NO pillar row at all and every priority is Unplaced, while
  the company's 2027 view shows the pillars. Sue's screenshot of the
  day before shows the same page. The code always draws the pillar row,
  and the same set-up WORKS in the local harness on the current build
  (`harness/priorities.html`, Weipa, 2027: the row is there and a
  priority follows "Asset Reliability" into "Asset Health"). Not
  explained. Leads: production runs v0.99.0 and the year code has
  changed since (tranche 2 made the calendar year the only period);
  the harness rows are seeded by code, not made through Settings.
- **1 — the fault was NOT reproduced (Ben, 2026-11-26).** The same
  steps worked on dev (current build) and now work in production
  (v0.99.0) too. Cause unknown. Two innocent states could look like
  part of it — the old sub-pillars ended and saved before the new rows
  with their follow links were saved; the Priorities page serving its
  60-second copy of the pillars after a Settings save (`memo`,
  `prioritiesScreen.ts`, the cascade entry follows no change topic) —
  but neither explains a site with no pillar row while the company
  showed one. Carried as "not reproducible; reopen if seen again".

| # | Decision | Option chosen |
|---|---|---|
| 1 | Build (Ben's choice 2, 2026-11-26) | The merge rule AND a year-change panel, at BOTH levels. Rule: several old sub-pillars (or pillars) may be followed by one new one — a column change. Panel, Settings → Priorities, "Change from 2026 to 2027": the earlier year's structure as it is, each pillar with its sub-pillars; each pillar and each sub-pillar answers continues / becomes another (new, or one already in the later year; several may become one) / ends; a sub-pillar also says which pillar it sits under, by default whatever its pillar becomes; new pillars and sub-pillars are added in the panel; each row shows how many priorities it carries across all orgs; the footer lists priorities that would be left Unplaced and sub-pillars left with no pillar; ONE Save applies it all. Covered: rename, merge, pillar split (its sub-pillars are shared out), pillar end, new pillar, and a NEW pillar whose NEW sub-pillars follow sub-pillars under an OLDER pillar (Ben's case). Not automatic: a sub-pillar split — its priorities must be placed, and are listed |
| 23 | Build (Ben's choice 1, 2026-11-26) | A tile past its planned end offers "Extend to <next year>" and "Complete" in its menu — Extend sets the planned end and asks nothing more unless the sub-pillar cannot carry into that year, then asks for one; offered to whoever may edit the priority today. A changed START year finds the sub-pillar in force that year. A year with no sub-pillars to choose says so, in place of an empty required field. NOT in this round: a warning that moving the start year forward takes the priority off the earlier year |
| 2 | Build (2026-11-26) | The row just added gets the cursor and the page stays where it is; the same check for "＋ Add pillar" |

### N1, the CSV import — reviewed and decided 2026-11-26

Findings (code read): the desk already does, one issue at a time,
everything an import needs — status (seven values, a change writes
itself into the thread), a reporter message saved to the thread and
sent as a Teams card to reporter, merged reporters and followers,
a reporter-VISIBLE resolution line (`ben_resolution`), internal thread
messages, and Merge into (`issues/adminTab.ts`). A status is plain
text: a new one changes no schema. The CSV has three outcomes the app
has no status for (Deferred, Partially resolved, Not a software issue)
and three fields with no place (type, release, date).

| # | Decision | Option chosen |
|---|---|---|
| N1 | Build (Ben's choice 2) | An import that runs the desk's own actions per row, with THREE NEW STATUSES: **Deferred** (out of the open queue, its own filter), **Partially resolved** (STAYS in the open queue — Ben's answer), **Not a software issue** (closed, worded as an answer). Type, release and date ride in the resolution line as text; no new columns. InternalNote becomes an internal thread message, never the resolution line (reporters see that). Duplicate uses the existing merge |
| N1 | How people hear (choice 2) | ONE Teams card per person listing their reports and outcomes, with a link; every answer still saved on its own issue's thread. Not one card per issue (this round: 17 for one reporter) |
| N1 | "Prepare" (choice 1) | Preview, then apply, in one sitting: rows can be unticked and messages edited in the preview; nothing is stored until Apply. No stored drafts |
| N1 | The starting file (choice 1) | "Export to CSV" beside "Export to PDF": the ticked issues in the import's layout, ids filled in, with title, reporter and present status as reference columns the import ignores. `issue-review-prompt.md` §4.5 to say the import ignores columns it does not know |
| N1 | Common rules | Faults shown per row before anything runs (unknown id, status not in the list, missing message, message over 400 characters, a duplicate with no parent); Apply runs row by row and reports each; a failed row does not stop the rest; the same file run twice changes nothing |

### Cluster C — reviewed 2026-11-26, NOT yet decided

Findings (code read; nothing run):

- **4, 26** — confirmed for a library change: `switchTo`
  (`docs/docsScreen.ts`) stashes only the ticked libraries and
  remounts; the new mount has no view, so `chosenColumns` is empty and
  the default columns return. The Favourites toggle does the same.
  The chosen columns live only in the open view: `DocUiPrefs`
  (`docs/views.ts`) remembers a person's libraries and panel, never
  their columns, so reopening the app loses them too unless they were
  saved as a named view. 26's "a new filter" is NOT confirmed: a
  filter change does not remount. 4 and 26 are one fault reported
  twice. A library change also drops the search text, filters and sort.
- **25** — by design: the register adds the Library column itself
  whenever more than one library is in view (`libraryLabel` in
  `buildColumns`); it is not in the column chooser, so it cannot be
  left out.
- **7** — no fault found: someone who has never chosen gets EVERY
  library; after that the app opens with the libraries last ticked
  (`uiState.libraries`, saved per person by `persistUi`). Clicking a
  library's NAME selects only that one, and that becomes the remembered
  selection. The hub opens Documents with no library forced.
- Ben checked (2026-11-26): columns hold through filter and folder
  changes — only a library change clears them. And all three libraries
  stay ticked across a reopen, so 7 is the remembered selection.

| # | Decision | Option chosen |
|---|---|---|
| 4 | Build (Ben's choice 2) | The columns are the person's: a library change and Favourites carry the open view (columns, filters, search, sort); the chosen columns are SAVED for the person and every visit opens with them until "Reset to default"; a saved view or shared link shows its own columns while it is open. One set per person, whatever libraries are ticked |
| 26 | Duplicate of 4 | Same fault, same fix |
| 25 | Build (choice 1) | Library is an ordinary column in the chooser: shown with the default columns when several libraries are ticked, as now; with a chosen set, only if ticked |
| 7 | Not a software issue + one small build | A reply: tick the three and they stay; clicking a name selects that library alone. Ben added: a tooltip on a library's name, "Show only this library" |

### Reports 21 and 22 — reviewed 2026-11-26, NOT yet decided

Findings (code read; nothing run):

- **21** — confirmed: the kanban's columns follow an action's STATUS
  (`controls/ActionBoard/editor.ts` `columns`); the PDCA state is a
  second field (`shared/schema/actions.ts`, "a parallel axis"). The
  dialog sets only PDCA. The status "in-progress" is set by ONE thing
  in the whole app: dragging a card into Doing. A new action is stored
  open + Do, so it sits in To do wearing the Do mark (21 of the 22 in
  Sue's screenshot). A drag between open columns does not change a
  PDCA state already set. Check and Act have no column.
- **22** — confirmed: a priority's popup lists every initiative linked
  to it and to its counted descendants (`initiativesFor`,
  `priorities/prioritiesScreen.ts`), whatever org is in view; the tile's
  circles count the same. "This org" on a row means "linked to this
  priority itself", not the org being viewed. So a department that
  adopted a site priority sees the whole site's initiatives and
  actions. The Actions hub's organisation scope is tranche 4's E13
  (built, tested, unreleased), which stamps each action with where its
  assignees sit.

| # | Decision | Option chosen |
|---|---|---|
| 21 | Build (2026-11-26) | The kanban column comes from the PDCA state: Plan = To do; Do, Check, Act = Doing; awaiting endorsement = Endorse; Closed = Done. Setting the state in the dialog moves the card; dragging sets the state (into To do = Plan, into Doing = Do; a card at Check or Act keeps its mark within Doing). The separate "in progress" status decides nothing. **A new action starts at PLAN** (reverses Ben's 2026-08-31 "starts at Do"). **Existing cards stay in their column**: an action at Do never dragged into Doing stays in To do and reads as Plan from then on (Ben told this rewrites a mark that was sometimes a choice; he chose it). **On hold sits in To do** with its pause mark (Plan in the PDCA view). The grouping menu gains **"By PDCA state"** — Plan, Do, Check, Act, Closed; awaiting endorsement sits in Closed with its marker — the default stays four columns (Ben's choice 3; PDCA columns as the default, with Check as Endorse, considered and not taken). Meeting boards follow the same rule on their three columns |
| 22 | Build, narrowed by Ben | The priority popup follows the app's existing rule for where an initiative shows: on an org's page it lists an initiative filed under that org (or within it), or one whose "Also shown in" list names that org — the rule the Improvement tab and Gantt card already use. A "Show all" switch with a count ("Showing X, 2 of 5 initiatives"); each row names the org the initiative is filed under, in place of "This org"; on the priority's own page nothing changes. **Before any setup the list is EMPTY** ("0 of 5", then Show all) — Ben's choice 2, no fallback to all. NOT built: splitting actions inside a shared initiative by department (a department that needs its own action set files its own initiative — Ben); any rule by owner, sponsor, team or action holder (considered, dropped as complexity); scoping the tile's circles or status |

### Report 5 — reviewed 2026-11-26, NOT yet decided

Findings (code read; production's term store NOT seen):

- The Filters tree is the Process area term set as the store holds it;
  the set is written by the sync from each site's tree in Settings →
  Processes (`docs/processSync.ts`, `orgSyncPlan` in `docs/model.ts`).
- **A mechanism that produces exactly this picture exists.** The
  planner INFERS a rename: at each depth, under each parent, when
  exactly one app path is missing and exactly one store term is
  unmatched, the unmatched term is renamed to the missing label and its
  children come with it (`rekeyUnder`). So if "Metal Delivery" was once
  the one new name under Casting while another area's term stood
  unmatched there, that term became "Metal Delivery" with the other
  area's children under it; the app's own Metal Delivery children were
  then created beside them, and the first area's children were created
  afresh under their true parent — leaving three strays. Hypothesis,
  Medium: it fits the screenshot; the store's history was not seen.
- The other reading: the areas were entered under Metal Delivery in
  Settings → Processes (data, no fault in the app).
- **What Ben found (2026-11-26):** in Settings → Processes, BSL's own
  tree has "General" and "Inspection, Homogenising & Sawing" under BOTH
  Casthouse and Metal Delivery, and "Cooling Towers & Water Management"
  under Metal Delivery only. So the Filters pane shows the master
  faithfully; the sync's guess did NOT cause this. The rows were all
  created at the same time: they came across in the v0.83 copy of the
  site's tree (`processes/migrate.ts`), from the old type's tree or by
  the copy itself — not looked at.
- **A move in Processes would not reach SharePoint:** the sync renames
  a term's label and never moves it to another parent
  (`executeOrgSync`, `docs/orgSync.ts`).
- **AN INGESTION DEFECT, confirmed in the code after Ben asked.** Ben
  saw a file whose task value was correctly under Casting land tagged
  with the Metal Delivery copy. Ingestion cannot change the tree, but
  its grid turns a file's SAVED term value back into a term by NAME
  alone: `termIdsFor` (`docs/ingestionScreen.ts`) builds a map from a
  term's last label to its id, so of two terms with one name the last
  in the walk wins. `valueOf` uses it when a cell's editor opens and
  when a value is dragged down with the fill handle; either can then
  write the wrong term. The feed has carried the real term id since
  v0.99.0 (`<col>#termid`, `docs/rows.ts`) and this lookup does not use
  it. I had first told Ben ingestion could not be at fault; that was
  wrong for the tag, right for the tree. Other name-only lookups exist
  in Documents and were not all checked.

| # | Decision | Option chosen |
|---|---|---|
| 5 | Build + a data repair (Ben's choice 1, 2026-11-26) | **Build:** the ingestion grid reads a saved term by its ID (`<col>#termid`); with no id and a name shared by two terms the cell opens with nothing selected and the fill handle refuses — it never guesses; every other name-only lookup that leads to a WRITE is swept and treated the same. **Repair (non-software, owner to be named):** BSL's tree in Settings → Processes — "Cooling Towers & Water Management" belongs under Casthouse; the Metal Delivery copies of "Inspection, Homogenising & Sawing" and (if not a real area) "General" go; affected documents are re-tagged (the list: filter by each Metal Delivery copy), wrong entries archived, their terms retired. NOT built: the sync moving a term to another parent. **Backlog:** the sync's inferred rename (one new name + one unmatched term under a parent = a rename, children carried) — real, did not cause this |
| N3 | Build — Ben's own item, added 2026-11-26 | **Bulk change of properties, for document controllers**: filter to a set (or tick rows), choose one or more properties and the new common value for each, give a reason; a preview counts what will change and what will be skipped; the run reports each document. "A general need going forward" (Ben) — an owner leaving with fifty documents is the same job — and it is what makes the BSL repair practical. The review date is untouched (already the rule for a property edit). Told to Ben and accepted: each document changed gets a NEW VERSION with the reason as its comment, a new published one for an approved document, as a controller's single edit makes today. Planned shape: skips stated up front (checked out to someone; part-way through review or approval); a limit and a pace (about 70 edits a minute), safe to interrupt as an ingestion run is; controllers only, a site's controller on their own site's documents; a fixed list of what can change — tags, people, text; not status, dates, document id or name. About 4–5 days |

The BSL repair's owner: **Ben** (2026-11-26). It waits for N3; the lookup fix goes in first so no new wrong tags are made meanwhile.

### Cluster E — reviewed and decided 2026-11-26

Findings (code read): everything Ellen could not change is left out of
Edit properties ON PURPOSE. Status left the forms in v0.79
(`docs/fieldEditors.ts`); the approval date, cadence and review date
are system-managed (`SYSTEM_DATE_ROLES`, Ben's decision of 2026-08-10)
and typed only at ingestion. The app has NO rename of a document
anywhere. Ben: Ellen knew the Supersede command; "title" means the
document's name; the approval date was wrong after ingestion.

| # | Decision | Option chosen |
|---|---|---|
| 27 | Declined (Ben) | Status changes go through the existing commands in the document's menu. Nothing is added to the form — not even a pointer. The reply says where the commands are |
| 28 | Build (Ben's choice 1) | Two commands in the document's menu, for DOCUMENT CONTROLLERS only. **Rename**: new name and a reason; the file type is kept; a name already in use in that folder is refused. **Correct approval date**: the date and a reason; a future date is refused; the review date is counted again from it by the document's cadence. Each writes a new version whose comment says what changed, from what, to what, by whom and why. Reverses, for controllers and for this one date, the 2026-08-10 "never typed" decision; cadence and review date stay calculated. Neither is in N3's bulk change |

### Reports 17 and 11, the document preview — reviewed 2026-11-26, NOT yet decided

Findings (code read; nothing run):

- The preview of a Word, Excel or PowerPoint file is SharePoint's own
  PDF conversion of it, shown in the browser's PDF viewer inside a
  frame (`cookieFreeSrc`, `transformPdfUrl`, `docs/viewer.ts`,
  `docs/rows.ts`). The app passes no options to the conversion.
- **17** — the conversion shows the text with tracked changes applied
  and no markup (Marie's screenshot: the new sentence reads as plain
  text). So an approver sees the result, not what changed. Whether the
  conversion can be asked for markup is not known; whether "Open in new
  tab" shows tracked changes to someone who can only read was not
  checked.
- **11** — nothing in the viewer scrolls the document or the panel (no
  scroll call, no page fragment on the address). Where a PDF opens is
  the browser's PDF viewer's doing. Not explained; the report does not
  say which file type, which browser, or whether "the bottom" is the
  document's last page or the details panel.
- Ben (2026-11-26): an approver DOES see the tracked changes once the
  document is opened in Word. For 11: it is the document shown as a PDF
  that opens scrolled to the bottom.

| # | Decision | Option chosen |
|---|---|---|
| 17 | Build (Ben's choice 1) | On a Word document awaiting review or approval, the decision card carries one line — "Tracked changes do not show in this preview" — with an "Open in Word" button beside it; on every such card, tracked or not. Word files only. Not built: reading the file to say it only when true; the approved version side by side |
| 11 | Build, as a try (Ben) | The preview's address asks the PDF viewer for page 1, for converted files and for PDFs. The cause was NOT found and the fault was not reproduced, so this cannot be proved before it ships: Ben's or Ellen's check in the hosted app decides whether the report closes |

### Report 19, UAT-DOC-040 Cancel revision — reviewed 2026-11-26, NOT yet decided

Findings (code read; nothing run):

- Holly's screenshot shows v2.0 published and current, v1.0
  superseded, and NO drafts and NO restored major. So either no
  revision had been checked in on that document, or the cancel did not
  run to its end. The report does not say which step she was on.
- A revision that was only STARTED is nothing but a check-out: Start
  revision writes the draft status inside the check-out and stops
  (`staysCheckedOut`, `docs/lifecycleCmds.ts`). Cancelling it discards
  the check-out, so nothing is left to show — no version, no comment.
  UAT-DOC-040's expected result describes only a revision with drafts.
- **A suspected fault in that same case, NOT confirmed.** After
  discarding the check-out, `openCancelRevision` goes on: it reads the
  file's version list, takes the highest major, restores it and checks
  in a new major. SharePoint's file version list holds PAST versions
  only (the app's own history read fetches the current one separately,
  `itemVersions` in `docs/data.ts`). So with no draft checked in, the
  highest major in that list is the one BEFORE the current approved
  version — and the cancel would restore that, publishing the previous
  approved content as a new major. Holly's document shows no such
  version, which this does not explain. Needs one run on dev.
- **Ben's run on dev (2026-11-26): NO rollback.** Start revision on an
  approved document, then Cancel revision with nothing checked in: the
  history is unchanged and the last published version is still the
  current one. The suspected fault is NOT real in that case. Why the
  command does not go on to restore there was not worked out from the
  code — to be understood before the command is touched, so the right
  outcome is not an accident.
