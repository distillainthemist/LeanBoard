# The backlog programme — Ben's selection of 2026-11-22

Ben went through the whole backlog as a checklist. He marked 50 items
"work on now" and 23 "remove" (the removals are recorded in
`backlog.md` → Done / no longer tracked). This is the order and the
size for the 50. **Nothing here is built yet.**

Sizes are estimates from reading the code, not measurements. The whole
set is roughly **190–270 hours**. One item is schema-carrying (E12);
the rest are app-only as far as I can tell today.

The ids (C1, D4…) are the checklist's.

## Order

Small and certain first, so each tranche can reach dev and be checked
before the next. Decisions are asked one at a time, tranche by tranche,
not all up front.

### Tranche 1 — small fixes, nothing to decide but two words (22–30 h)

| Id | Item | Size |
|---|---|---|
| E3 | Escape in the message panel's search closes its list | 1 h |
| D6 | The values grid's note when opened from a priority | 0.5 h |
| E4 | "Flag for support" uses the colour chosen in Settings | 2 h |
| E7 | Rename the kanban column from "Verify" | 1 h |
| C7 | Rename the middle status count from "Flagged" | 1 h |
| C3 | The four card dialogs disable Add until the required fields are filled | 2–3 h |
| C4 | Documents forms: the "Required" tag becomes the red asterisk | 2–3 h |
| E9 | A per-column card cap on the tile kanban | 2 h |
| F8 | A "Closed" filter on the Ingestion tasks panel | 2 h |
| F7 | Ingestion: retry with back-off on throttled calls | 2–3 h |
| F9 | Ingestion: a renamed term opens its cell selected | 2–3 h |
| D4 | Batch the spec reads for a priority's own metrics | 1–2 h |
| D3 | Bound how far back metric readings are read | 2–3 h |
| D2 | The Metrics card chart opens on the page holding the latest reading | 2–3 h |

Decisions: the new word for "Verify" (E7); whether the count becomes
"Support needed" (C7).

### Tranche 2 — rules that need your answer, then small builds (18–28 h)

| Id | Item | Size |
|---|---|---|
| C1 | A priority's own actions roll up to the priority it was cascaded from | 2–3 h |
| C5 | Direct reports see confidential initiatives | 1–2 h |
| C6 | Who may press another person's sign-off box | 1–2 h |
| C8 | Removing a metric: keep its readings, or delete with a confirmation | 2–3 h |
| D7 | Flag a priority open more than a year with no planned end | 2 h |
| D8 | An initiative with no period label shows in every year | 2–3 h |
| D10 | Custom periods: keep the label list current | 2–3 h |
| E5 | The chosen action view follows the person across sessions | 2–3 h |
| E17 | Stage reverts: an approver, and old snapshots marked superseded | 4–6 h |
| G8 | Secondary organisations see a ritual in Settings | 2–3 h |

Every row here starts with a question to you.

### Tranche 3 — priorities and metrics (20–29 h)

| Id | Item | Size |
|---|---|---|
| D1 | A mark for a stale metric, and whether it counts toward status | 4–6 h |
| D5 | Link or promote a priority's own metric into the value driver tree | 4–6 h |
| D9 | Re-parenting a priority carries its cascades | 3–5 h |
| D11 | Phone and the executive summary's last step use the decision zone | 4–6 h |
| C2 | A style for canvas labels: size, bold, colour | 4–6 h |

### Tranche 4 — actions (25–36 h)

| Id | Item | Size |
|---|---|---|
| E1 | "Duplicate…" on the other action-raising cards | 2–3 h |
| E2 | Attachment captions editable, and a preview | 4–6 h |
| E6 | Styled PNG and SVG download in the Gantt view | 3–4 h |
| E8 | Tile pictures lagging one edit on non-live boards | 2–3 h |
| E10 | A count of due-date moves by reason, and per-site reasons | 4–6 h |
| E11 | Evidence attachments on actions | 6–8 h |
| E13 | Page the organisation-wide actions read | 4–6 h |

### Tranche 5 — type-ahead search pickers (25–34 h)

| Id | Item | Size |
|---|---|---|
| F1 | Document person fields (Add, Edit properties, ingestion, reviewers) | 6–8 h |
| F2 | Users register "Search directory and add" | 3–4 h |
| F3 | The meeting wizard's owner and participants | 4–5 h |
| F4 | Organisation owners | 2–3 h |
| F5 | The other ten places | 10–14 h |

### Tranche 6 — documents and cards (29–42 h)

| Id | Item | Size |
|---|---|---|
| F6 | Doc cards refresh (`leanboard-doc-cards-plan.md` parts A and B) | 16–24 h |
| F11 | A parent term in a filter includes everything beneath it | 3–4 h |
| G1 | Narrow four card tile layouts for phone | 6–8 h |
| G3 | Capture card inline add-row | 4–6 h |

### Tranche 7 — KPI depth (22–32 h)

| Id | Item | Size |
|---|---|---|
| E14 | Picklist option library, and a target-state row for picklist KPIs | 8–12 h |
| E15 | Standalone KPI cards as good / bad or picklist | 6–8 h |
| E16 | Simulate revived | 8–12 h |

### Tranche 8 — the two large ones (42–61 h)

| Id | Item | Size |
|---|---|---|
| C9 | Reporting (P10): a page of four tiles over drill lists, four ritual cards, period comparison, export | 30–45 h |
| E12 | Confidential actions in a separately secured table with per-record sharing | 12–16 h |

E12 is SCHEMA-CARRYING and its whole point is Dataverse security, which
only a second account in the hosted app can prove. It is the one item
I would ask you to confirm again before starting.

## How it runs

- One tranche at a time: build, gates, push to dev, a test list for
  you, then the next. A release whenever you say "Cut the release".
- Releases follow the corrected order (tag, push the tag's build to
  dev, then push the tag).
- Each item updates or adds its UAT case in the same commit.
- An item that turns out larger than sized is said before it is built,
  not after.

## Walked with Ben before building

Ben, 2026-11-22: every item of a tranche is stepped through with him,
one at a time, before any of it is built. His answers:

### Tranche 1

- **E7** — the kanban column "Verify" becomes **"Endorse"**.
- **C7** — "Flagged" becomes **"Support needed" everywhere** it names
  the initiative state: the summary's circle label, the tile tooltip,
  the wall's key, the Improvement filter pill ("⚑ Support needed
  only"), the colour's name in Settings, the flag dialog and its
  message subject. Documents' "Flagged for review" is untouched.
- **E3** — confirmed as proposed: Escape closes an open type-ahead
  list over a dialog (fixed at the cause, for every such list); the
  dialog itself still never closes on Escape.
- **D6** — the note on a priority's grid reads "<cadence> · <unit> ·
  this priority's readings. Targets and limits set here carry forward
  until changed." The initiative's and the driver's lines are unchanged.
- **E4** — BOTH the "Flag for support" button and the ⚑ on action rows
  take the colour chosen in Settings → Priorities → Status.
- **C3** — on the Risk matrix, Heatmap, 5 Whys and Fault tree entry
  dialogs: the entry's own required field carries the asterisk and
  Add / Save is disabled until it is filled (tooltip names what is
  needed); Who and Due gain the asterisk ONLY once an action is being
  typed, and Add then waits for them; the red marks and the "Required
  before Add" line go.
- **C4** — Documents forms (Add, Edit properties, ingestion defaults,
  the check-in and lifecycle comments): the "Required" tag becomes the
  red asterisk; the button is disabled until every required field is
  filled, tooltip "Still needed: …"; a section holding an empty
  required field opens by default; the "Required before Save" line
  goes. "Derived" and the ingestion grid's ✱ stay.
- **E9** — ALREADY BUILT (v0.96.0, `ActionBoard/tileFit.ts`: each
  column shows the cards that fit and "+N more"). The backlog line was
  stale. Nothing to build.
- **F8** — the Ingestion tasks panel gains a collapsed "Closed tasks ·
  n" heading under "Open tasks": newest first, name / destination /
  date ended, the first 20 with "Show all n"; a row opens the task's
  sheet and its log; the same visibility as open tasks; the badge still
  counts open ones only.
- **F7** — INGESTION RUNS ONLY: a call refused as throttled is retried
  up to three times (2 s, 5 s, 10 s); nothing else is retried; a run
  that has been throttled drops from eight files in flight to four; a
  file still throttled is refused "SharePoint is busy. Run again in a
  few minutes." The throttle's shape through the connector is unseen —
  an unrecognised one behaves as today and is logged.
- **F9** — the ingestion grid keeps each term's ID with its name: a
  cell opens with the right term selected by ID, and SHOWS the term's
  current name; a renamed term does not mark the file changed. To
  confirm on dev first: that the list feed returns the term ID beside
  the label (if not, Ben is told before anything else is built here).
- **D4** — confirmed: one request reads the values and the plan history
  of every priority metric; nothing visible changes.
- **D3** — readings are read in a window by cadence: shift or daily 6
  months, weekly 2 years, monthly 5 years, quarterly or yearly
  everything; a metric with nothing in its window gets one small
  request for its latest reading. Accepted edge: a rarely filled
  metric can draw fewer than 12 sparkline points.
- **D2** — the Metrics card chart shows the last 12 readings THROUGH TO
  TODAY (the gap after the last reading is drawn); when the last
  reading is more than 13 periods old it opens on the readings and the
  subtitle says "last reading <date>". "Update values" still opens the
  grid around today.

Ben, 2026-11-22: "build tranche 1".

### Tranche 2

The walk began 2026-11-23, paused for the v0.99.0 release, and resumed.

- **C1** — **status rolls up, actions stay put** (Ben, 2026-11-24). A
  late action on a cascaded priority makes the priority it came from
  off track; the tooltip names the place ("1 late priority action at
  Weipa"). The parent's Actions tab still lists only its own actions.
  **A priority's own metric that is off plan does the same** (Ben, the
  same answer). This changes half of decision 2 of 2026-11-18 (an
  action on a priority shows only at the org that raised it): it still
  SHOWS only there, but it now COUNTS upward, as initiatives do. Ben
  was told of the history before answering.
- **C5** — **no change; off the backlog** (Ben, 2026-11-24). A
  confidential initiative stays visible to its role holders, the owner
  of its org or an org above, super admins, and a site admin for their
  own site. The owner's direct reports manage the org's priorities but
  do not see its confidential initiatives; an owner who wants one of
  them in gives that person a role on the initiative. Nothing to build.
- **C6** — **anyone who can edit may still press it, and the press is
  recorded** (Ben, 2026-11-24). The part stores who pressed it; the
  box's tooltip reads "Signed off by <presser> for <person>, <date>"
  when someone else pressed it, and as today when the person did. No
  limit on who may press; no schema change (the part lives in
  `ben_assigneesjson`).
- **C8** — **delete, after a confirmation that counts them** (Ben,
  2026-11-24). "Remove <name> and its N readings? This cannot be
  undone." A metric with no readings goes without a prompt (CHANGED in
  his test walk, 2026-11-25: the × always asks). On an
  initiative and on a priority. A driver-linked metric never takes the
  driver's readings with it. Where the list saves from a Save bar the
  readings go at Save, not at the ✕, so Discard still undoes it.
- **D7** — **not built; off the backlog** (Ben, 2026-11-24). A
  priority with no planned end never flags. Offered twice (2026-10-02,
  2026-11-24) and declined twice; do not offer it again unprompted.
- **D8** — **not built; off the backlog** (Ben, 2026-11-24). He first
  chose the read rule (no label = starts in the period it was created
  in), then came back to the item and changed his mind: leave it. An
  initiative with no period label goes on showing in every year.
- **D10** — **replaced: calendar year is the ONLY period** (Ben,
  2026-11-24: "Can we simplify to just calendar year as the only
  option?"). The mode select, the financial-year start month, the
  prefix, the custom current label and the label list leave Settings →
  Priorities; the fy and custom branches leave `priorities/model.ts`
  with their tests. A period is the calendar year, written "2026". Ben
  confirmed dev and production are both already calendar year with no
  prefix, so this is a removal: no stored label changes. Build detail:
  a stored mode other than calendar is read as calendar, and labels go
  on comparing by their digits. 2–3 h, no schema.
- **E5** — **not built; off the backlog** (Ben, 2026-11-24). The view
  a person chooses on an action card (List | Kanban | Gantt) stays for
  the session only; the card's configured view is where it opens.
- **E17** — two parts (Ben, 2026-11-24). **Part 1, an approver: not
  built.** A revert still needs no approval (his call of 2026-09-29
  stands) and no message to the endorsers is added. **Part 2,
  snapshots: mark them.** A snapshot of a gate that a revert undid
  reads "Reverted" with the date; once that gate is passed again the
  older snapshot reads "Superseded" and folds under the newer one.
  Nothing is deleted. About 2 h.
- **G8** — **see it, not change it** (Ben, 2026-11-24). A site admin
  at a secondary site sees the ritual in Settings › Rituals with a note
  naming the primary site; it opens, but Edit and Archive are not
  offered. Ben was told this gives rituals a different rule from
  initiatives (a site admin has admin over an initiative that also
  spans their site) and chose it for safety.

**To build (six):** C1, C6, C8, D10 (calendar year only), E17 part 2,
G8. **Off the backlog, nothing built (five):** C5, D7, D8, E5, E17
part 1. Ben, 2026-11-24: "Second option, build tranche 2."

### Tranche 3

The walk began 2026-11-25, after tranche 2's test walk.

- **D1** — **a mark only, on Ben's own rule** (Ben, 2026-11-25: "go
  stale when it is more than 5 working days (M–F) after the end of its
  last period … a mark only"). As I read it, and told him: a metric is
  stale when a period of its cadence ENDED more than five working days
  ago and there is no reading in that period or since. So a monthly
  metric has five working days into the new month to get last month's
  reading in; a weekly one has the following Monday to Friday. The mark
  reads "No reading for <span>" wherever the metric's value shows.
  Status is unchanged: stale does not make anything off track. A metric
  that has never had a reading is left as it is today. Public holidays
  are not known to the app; only Saturdays and Sundays are skipped.
- **D5** — **both Link… and Promote…, as on an initiative** (Ben,
  2026-11-25). A priority's own metric can be joined to an existing
  driver or promoted into a new one (the same role check); its readings
  are carried into the driver's series, the driver's value kept where
  both have one. Not on a company-level priority (no site, no tree).
  The merge cannot be undone, so it ASKS FIRST, naming how many
  readings move.
- **D9** — **a re-parented priority ALWAYS takes its new parent's
  sub-pillar** (Ben, 2026-11-25, in his own words; the "Also take the
  parent's sub-pillar" tick goes). As told to him and not corrected: it
  follows down to every priority made from the linked one (the dialog
  says how many move); it applies from the year in view, earlier years
  keeping their column; Change parent follows the same rule, Unlink
  leaves the column alone; a parent with no sub-pillar moves nothing.
  **And a message is offered** after a link to the owners of the orgs
  below (his answer "First option"). The parent's Cascade tab stays one
  level (two levels at most, 2026-11-18). About 3 h.
- **D11** — **both** (Ben, 2026-11-25). The phone shows the decision
  zone's three rows (Proposed, Cascaded to you, Unplaced) under its
  priorities, the "N awaiting a decision" chip jumping to them; the
  executive summary's last step becomes "Awaiting a decision" with all
  three kinds. Every item opens its priority's popup. The old cascade
  review list retires. The feel on a real phone is Ben's check.
- **C2** — **not built; off the backlog** (Ben, 2026-11-25). Canvas
  labels wrap and carry no style of their own: the 2026-11-18 decision
  ("Labels wrap. No label styles.") stands. Ben was told C2 would have
  reversed it.

**To build (four):** D1 (the stale mark), D5 (Link… / Promote… on a
priority's own metric), D9 (a re-parented priority takes its parent's
sub-pillar, carried down, with a message), D11 (the decision zone on
the phone and in the executive summary). **Off the backlog:** C2.

### Tranche 4

The walk began 2026-11-25, after tranche 3's test walk.

- **E1** — **not built; off the backlog** (Ben, 2026-11-25).
  "Duplicate…" stays where it is: the Action card, My day and the
  Improvement Gantt. The other action-raising cards do not offer it.
- **E2** — **both parts, first options** (Ben, 2026-11-25).
  **Captions:** a Rename link on each row turns the caption into a text
  box (Enter saves); a file with none can be given one; whoever may
  remove an attachment may rename it. **Preview:** images only (JPG,
  PNG, GIF, WebP), on click, in a viewer inside the app with Download
  beside it; every other file downloads as today. No thumbnails in the
  list (a file can be 30 MB); HEIC downloads. PDFs were offered as an
  unproven extra and not chosen.
- **E6** — **the chosen range, every row, styled** (Ben, 2026-11-25).
  "Download PNG / SVG" in the Gantt view gives the range picked (26w /
  52w / All) with every row in it, not only the rows on screen, in the
  Gantt's own styles. To confirm when building: the stored tile
  picture (meeting close, gate approval) of an Action card left in
  Gantt view is made by the same code and is expected to be unstyled
  too; the same fix should cover it.
- **E8** — **draw the picture as the card is left** (Ben, 2026-11-25).
  A card closed with a change pending has its tile picture drawn there
  and then, and the save carries it; the wait is capped at about half a
  second, after which the save goes with what it has. Told to Ben: this
  is the record's picture too — a closed meeting and a gate snapshot
  stamp the same stored pictures.
- **E10** — two parts (Ben, 2026-11-25). **A count by reason: a panel
  on the Improvement tab.** The tab's ⋮ gets "Due-date moves…": for the
  org and year in view, one row per reason with its count (most common
  first), then the initiatives with the most moves. Later moves only;
  moves with no reason in a row of their own, "No reason given". No
  extra reads (the tab already holds the actions). **Per-site reasons:
  not built** — one organisation-wide list stays, so counts compare
  across sites; "Other" with a note covers the local case.
- **E11** — **already built; one small addition** (Ben, 2026-11-25).
  Evidence on an action IS its attachments and links (v0.95,
  `ben_ltkattachment`, which superseded the never-used
  `ben_ltkactionfile`). The backlog line predated v0.95 and was never
  struck, and the programme sized it at 6–8 h without checking — said
  to Ben. To build: **show it to the endorser** — the endorse review
  list shows "📎 n" on each waiting action, and opening it lands on its
  attachments. Requiring evidence to close was offered and not chosen.
  The old table stays in the solution.
- **E13** — **the org goes on the action row** (Ben, 2026-11-25: "we
  need to assume there are going to be 1000s of actions"; he asked why
  the read could not be filtered in the query, then how a cross-org
  action and a removed org are handled, and answered "Yes to all
  three"). SCHEMA-CARRYING: two text columns on `ben_ltkaction`.
  - **Where its assignees sit** — a stamp written on every save, so the
    organisation scope asks the server for the org in view. The scope
    keeps its meaning: "assigned to people who sit here"; an action
    shared across orgs carries each.
  - **Where it was raised** — the org of the board, initiative or
    priority it belongs to. The raising org's scope shows these as a
    group of their own, **"Raised here, assigned elsewhere"**.
  - **Existing actions** have no stamp: the scope also reads open
    actions with an empty stamp and matches those the old way, so
    nothing is missing before the backfill. A super admin's **"Re-stamp
    actions"** button in Settings stamps them, and repairs a drifted
    stamp at any time.
  - **A person who moves org**: their open actions are re-stamped.
    **A rename** (site, department, area) re-stamps the open actions of
    the people it rewrites — a site rename can run for minutes, with a
    count. **A removed department**: its people keep the old name until
    reassigned; their actions show at site level. **An archived site**:
    nothing is deleted; its actions stay on its boards, in each
    person's list and — Ben's answer — in the whole-company scope.
  - **The whole-company scope** is every open action whatever the
    filter: it paints as the pages arrive, with a count.
  - Lock older builds after the release: an older bundle saves an
    action without updating the stamp.

**To build (six):** E2, E6, E8, E10, E11 (the endorser's "📎 n"), E13.
**Off the backlog:** E1. Ben, 2026-11-25: "Yes to all three, build
tranche 4".

**Raised in the walk, for the backlog (not built):** the Priorities
page, the Improvement tab and the hub each read EVERY action of every
initiative, open and closed (`actionsForInitiatives`), to work out
statuses and counts. With thousands of actions that is the heavier
read, on pages opened daily. Closed actions feed the Done counts, so
narrowing it is a rule question to walk with Ben.

### Tranche 5

The walk began 2026-11-27, after the 2026-11-25 issue round's six
tranches were built and walked (R4, R5 and R6 on dev, unreleased).
Six items: F1, F2, F3, F4, F5 (nine places since tranche 1A took one),
and keyboard entry in the ingestion grid — report 3 of that round,
deferred here.

- **F1** — **one builder; pool fields list the group on focus** (Ben,
  2026-11-27, choice 1). Found: FOUR copies of the older inline people
  search — the document person fields (`docs/fieldEditors.ts`: Add,
  Edit properties, ingestion, and now bulk change), "Add reviewers" in
  Submit for review (`docs/lifecycleCmds.ts`), "With" in role reassign
  (`docs/roleReassign.ts`) and the people filter in the Filters pane
  (`docs/docsScreen.ts`): results drawn in the form, pushing it down,
  no arrow keys, Enter and Escape dead. Built as: one people
  type-ahead to `ui-standard.md` §2.x for all four — held matches at
  once, the directory after 350 ms and three letters with "Searching…"
  under its own heading; in a several-person field a pick clears the
  box and keeps the cursor. Owner and approver fields (the Owners &
  Approvers group only) LIST THE GROUP when clicked into; reviewers
  and ordinary person fields stay empty until typed in. Chips, pool
  rules and what is saved are unchanged.
- **F2** — **the button stays; the list is fixed** (Ben, 2026-11-27,
  choice 1 — my recommendation against the survey that listed it).
  Found: the Users register's ONE box filters the roster as it is
  typed in, and "Search directory & add" sends the same text to the
  directory — Ben's own decision of 2026-10-08. That box is a FILTER
  over a table on screen (the standard leaves those alone), and adding
  is a second, rarer intent: a type-ahead would fire a directory call
  whenever an admin filtered the roster. Built as: the directory is
  searched only at the button; its matches are capped at twelve with a
  line asking for more of the name; Enter in the box presses the
  button. About an hour against the three to four planned.
- **F3** — **one box each; nothing listed until typed** (Ben,
  2026-11-27, choice 1). Found in `controls/MeetingWizard/editor.ts`:
  the Owner box searches roster then directory but draws its results
  in the form, with no keys; Participants has TWO searches — "Add from
  the roster", which lists 25 people before anything is typed, and
  "Add from the directory" with a Search button. Built as: Owner is
  the standard people type-ahead (roster at once, directory under its
  own heading, "new to the app" marked); Participants has ONE box that
  searches both, a pick adding to the list above and keeping the
  cursor; the Search button and the unasked list of 25 go. The chosen
  list with its crew select is unchanged. A shared control, so it uses
  `shared/ui`'s builder, not the Documents one.
- **F4** — **the priority owner picker, and a new person lands at
  the org they will own** (Ben, 2026-11-27, choice 1). Found:
  Settings → Organisation's "Choose an owner" (`pickPerson`,
  `screens/settings.ts`) is a private copy with two searches and a
  Search button, and a private directory add that skips
  `people/directoryAdd.ts`. TWO FAULTS in it: a person added from the
  directory gets NO site; and a REVOKED person picked here is quietly
  restored with their site cleared and their role reset — the fault
  the shared rule fixed everywhere else on 2026-11-16. Built as:
  Organisation owners use `pickOwner` (`priorities/dialogs.ts`) with
  the shared directory road; "Clear owner" stays; the private copy is
  deleted. A new person is placed at the org they are made owner of
  (its site, and its department where it has one); a company owner
  still gets no site.
- **F5** — **all nine places** (Ben, 2026-11-27: "All 9" — taken as
  the nine of the table, without the tags select; said back to him).
  Checked against the code that day: of the ten places left on the
  2026-11-16 list, the action dialog's Support search was done on
  2026-11-18 (the one people search) and the two document searches in
  tranche 1A; the Filters pane's people search is F1's fourth copy.
  The nine: team import's "Add another starting person" (a directory
  call per keystroke — a fault); issue merge (a late answer can be
  drawn over a newer one — a fault); ingestion task assignees;
  document group members' Add; the hub's person scope (a browser
  datalist); the Agenda card's who-search; the notify panel's "Add a
  person" and the initiative form's priority menu (already float: keys
  and timing only); UAT testers. **Left out, my recommendation:** the
  tags select in the document forms — a drop-down of a term set, not a
  search; it belongs with F11 in tranche 6 if long tag lists become a
  problem. About 11 hours.
- **Keyboard entry in the ingestion grid (report 3 of the
  2026-11-25 round)** — **finish the road that is there** (Ben,
  2026-11-27, choice 1). **Corrected:** in the review I said the grid
  had no keyboard road and priced spreadsheet movement at two days; I
  had not read the cells. Text, choice and date cells are live boxes —
  Tab moves between them, Enter goes down a row, Escape reverts; term,
  person and long-text cells are buttons that open a small editor with
  Enter or Space. What is missing is INSIDE that editor: Enter does
  not apply, and after Set, Cancel or Escape the cursor is lost.
  Built as: in the editor Enter applies and moves down a row, Escape
  cancels, and either way the cursor returns to the grid; Shift+Enter
  moves up a row everywhere; Tab and Shift+Tab stay the way across.
  About half a day. Arrow-key cell movement was offered (two to three
  days, and it would change the grid for mouse users) and not chosen.

**Tranche 5 as walked:** about 24 hours (plan 25–34). No schema.

### Tranche 6

The walk began 2026-11-27, straight after tranche 5's test walk. Four
items: F6, F11, G1, G3.

- **F6** — **already built; level the cards with the register** (Ben,
  2026-11-27, choice 1). **Corrected:** parts A and B of
  `leanboard-doc-cards-plan.md` were built on 2026-08-08 (`b0d8fe5`
  B1, `bbb91bc` A + B2, `9e1a807` B3 + B4); the backlog entry still
  read "NEXT", Ben ticked it on 2026-11-22, and I priced it at 16–24
  hours without reading `docs/docsCards.ts`. Found instead: four
  things the register has learned since that the cards have not, each
  of which makes a card show MORE than its pasted view — a term
  filter matched by name only (the register keeps the exact term ids
  since R1, report 5 of the 2026-11-25 round); people filters
  (`view.people`) ignored; "has linked documents" (`view.present`)
  ignored; a custom Modified range (`modifiedFrom` / `modifiedTo`)
  ignored. Built as: the cards apply the same four rules through the
  register's own functions, so the two cannot drift again; anything in
  a view a card still cannot honour is said on the card. About five
  hours.
- **F11** — found ALREADY BUILT while preparing the walk (2026-11-27).
  The entry came from the 2026-10-06 feedback round (report 36,
  "logged, not built"). The 2026-10-18 issue round built it as item 13,
  "Filters reach every level", released in v0.74.0 and passed by Ben on
  2026-10-19: `filterFromPicks` (`docs/docsScreen.ts`) unions every
  picked term's subtree, ids and names; R1's exact-id pass keeps the
  subtree ids; the Default filters tree and the doc cards expand the
  same way. UAT-DOC case "pick a parent term" covers it. The backlog
  line was never struck. **Struck as built** (Ben, 2026-11-27).
- **G1** — found LARGELY BUILT while preparing the walk (2026-11-27).
  The entry is M2's leftover of 2026-10-07 (SQDPC, RiskMatrix, RACI,
  Fishbone). The card responsiveness round of 2026-10-30
  (`card-responsiveness-review-2026-10-30.md`, R3 and its follow-up,
  released in v0.85.0) narrowed them: SQDPC picks the largest tile
  over one to three wrap rows; RiskMatrix wraps its register under the
  matrix, sizes square cells from the room it has and hides the
  register in a phone tile; RACI flips to a stacked form under 480 px;
  Fishbone lost its 420 px floor. LEFT by that round: Fishbone's
  vertical spine (its R5, with FiveWhys and FaultTree, one to two
  days), which Ben decided on 2026-10-30 "waits for the phone pass".
  The phone pass itself has not been done.
  **Ben, 2026-11-27: "Look first"** (choice 1). Looked the same day in
  a new harness page (`harness/phonecards.html`: the real board grid
  and the real tile mount at 375 px, where the grid lists the cards
  one per row on a 341 × 227 stage; `?focus=` opens one as the
  focused card). Seen:
  - **SQDPC, tile: BROKEN.** Five letters wrap to two rows that need
    262 px of a 227 px stage — the second row (P, C) is cut in half —
    and the legend is drawn over the letters. Opened, it is right.
  - **RiskMatrix, tile: the consequence labels are cut** at the bottom
    edge ("Very low", "Very high" lose their second line). Opened, it
    is right, register under the matrix. At every size two markers in
    one cell overlap and spill out of it.
  - **RACI: right**, tile and opened. A tile shows the first two
    deliverables and clips the rest.
  - **Fishbone: whole, and unreadable.** The diagram shrinks to the
    width: cause text is about 4 px in a tile and about 6 px opened,
    where it sits in a third of the pane with empty space above and
    below.
  **Decided: fix the three faults, and Fishbone reads as a list on
  the phone** (Ben, 2026-11-27, choice 1). Built as: SQDPC's tile size
  is chosen within the stage's HEIGHT too and its legend never sits
  over the letters; the risk matrix keeps its consequence labels in a
  phone tile, and two markers in one cell sit side by side inside it;
  on the phone tier Fishbone reads as the problem, then each bone as a
  heading with its causes under it — the diagram stays on wider
  screens. The list replaces the vertical spine of the 2026-10-30
  plan (my suggestion: a list is readable at 340 px, a drawn spine
  with ten causes is still tight); that plan's "waits for the phone
  pass" is answered by this look for these four cards. FiveWhys and
  FaultTree are not in it. About six hours.
- **G3** — **type into the table** (Ben, 2026-11-27, choice 2, against
  my recommendation of "Add and next" in the dialog). Found: not
  built — "＋ Add row" and a click on a row both open the row dialog
  (`controls/CaptureCard/editor.ts` `editRow`). The backlog entry was
  conditional ("only if testers find the row dialog slow"); no issue
  export or feedback round carries such a report — said to Ben.
  **This REVERSES decision 8 of `leanboard-canvas-card-plan.md`**
  ("capture keeps its dialog") for ADDING a row; said to Ben before he
  chose. Built as: on a card with free rows, a blank row sits at the
  foot of the table in place of the "＋ Add row" button. Tab moves
  across its cells, Enter adds the row and starts the next with the
  cursor in the first cell, Escape empties it. Text, number, decimal,
  date and date-time cells are typed in place; yes/no and flag are a
  tick; a list is a select (several values: the dialog's own picker
  opened from the cell); a person cell is the standing type-ahead. A
  row with nothing in it is never added. Editing an existing row stays
  the dialog (a click on the row), and so does a card with fixed row
  headers, which has no rows to add. Nothing shows in a tile or a
  read-only card. About six hours.

**Tranche 6 as walked:** about 17 hours (plan 29–42): F6 five, F11
none, G1 six, G3 six. No schema.

### Tranche 7

The walk began 2026-11-27, after tranche 6's test walk. All three
entries were checked against the code first (the lesson of tranche 6):
none is already built. E14 not at all; E15 half exists (the KPI card
draws states when linked to a value driver — `setTracking` — and a
standalone card has no setting for it); E16 parked since 2026-09-09,
code kept (`improvement/vdt/simulate.ts`), button hidden. E14 is two
separate things and is walked as two items.

- **E14, the picklist option library** — **left** (Ben, 2026-11-27,
  choice 3). Found: a status picklist's options are typed by hand in a
  value driver's settings and in a metric's form, each starting from
  the same three (On track, At risk, Off track); nothing saves a list
  for reuse. The backlog entry is conditional ("if the same lists keep
  being retyped") and no issue export or feedback round carries that
  complaint — said to Ben. Offered: saved lists copied in (4 h), saved
  lists linked (8 h, with the risk that renaming an option orphans
  past readings, which are stored by name). It stays in the backlog
  with its condition.
- **E14, a target state for picklist KPIs** — **left** (Ben,
  2026-11-27, choice 1, my recommendation). Found: a picklist metric
  is on or off plan by the colour of the option it reads; it has no
  plan, so it cannot be "short of plan". The entry is conditional and
  no report asks for it. It would need a new rule — the ORDER of a
  picklist's options as its progression — and about seven hours. It
  stays in the backlog with its condition.
- **E15** — **build it as planned** (Ben, 2026-11-27, choice 1).
  Found: a meeting board's KPI card takes numbers only — its settings
  have a target, limits and a unit, nothing for a state. The SAME card
  already draws a state trend (a band per option in its colour, a line
  through the readings) and is entered by a pick per period, but only
  when it is linked to a good / bad or picklist value driver
  (`KpiTrendEditor.setTracking`, fed from `stateLink()` in
  `cardRegistry.ts`). Built as: the card's settings gain "Tracking" —
  value against target, good / bad, or a status picklist with its
  options and the state each means; a standalone state card shows the
  trend it already draws for a linked driver and is entered the same
  way, its readings stored under the card; a card linked to a value
  driver keeps taking its tracking from the driver. Switching a card
  with number readings to a state kind deletes nothing: the numbers
  stay stored, are not drawn while it is a state card, and return if
  it is switched back. About seven hours. No schema.
- **E16, Simulate** — **left parked** (Ben, 2026-11-27, choice 3).
  Looked first, in a new harness page (`harness/simulate.html`): the
  parked code STILL RUNS — the tree and the "What if" panel draw, a
  ticked initiative recomputes at once (a 350 kL change read EBITDA
  +$1.91m against plan, the path marked), Save scenario, Reset to plan
  and Adopt as forecast are there. What stands between it and a
  feature: the button is hidden by one line; BASELINE has no entry
  surface but the finance-pack paste, so a default change (target less
  baseline) exists only for pasted drivers and is typed otherwise; it
  has not been run in the player since 2026-09-09, across the calendar
  year becoming the only period and metrics on priorities; Adopt's
  write was not seen; the panel overflowed the right edge at one
  width; it lists initiatives only, not a priority's linked metric.
  Offered: revive with a Baseline row in the values grid (6 h), revive
  as it is (2 h). The backlog entry now says how small the revival is.

**Tranche 7 as walked:** about 7 hours (plan 22–32): E15 alone. E14's
two halves stay in the backlog with their conditions; E16 stays
parked. No schema.

### Tranche 8

The walk began 2026-11-28, after tranche 7's test. Both entries were
checked against the code first: neither is built.

- **E12** — **left** (Ben, 2026-11-28, choice 1, my recommendation;
  it was the item to re-confirm before starting). Found: a confidential
  action is hidden by the app (`visible()` in `store/actions.ts`); its
  row sits in `ben_ltkaction` with every other action, and every
  LeanBoard table is ORGANISATION-OWNED with the one role granted at
  Global depth (`data/deploy-schema.mjs`), so Dataverse cannot secure
  single rows — all or none. Hardening means a new USER-owned table
  (ownership cannot be changed on an existing one), a role at User
  depth, and a share per person per action. Why it is larger than
  12–16 hours: the rule is wide (raiser, assignees, their leaders,
  super admins — leaders change with the org chart, so shares go
  stale); the sharing call (GrantAccess, a Dataverse ACTION) is
  unproven from a code app — the SDK's `executeAsync` is private, and
  it may need a flow or a plug-in; existing confidential actions
  migrate and every action read and write gains a second source, with
  comments, attachments and moves; proof needs two accounts in the
  hosted app; and it covers actions only — confidential initiatives
  and meetings stay app-level. The entry is conditional ("if app-level
  hiding ever proves insufficient") and no report says it has. Offered:
  a four-hour spike on dev to prove the sharing call and size the
  build. It stays in the backlog with its condition, and the entry now
  carries these findings.

## As built

### Tranche 1 (built 2026-11-22, RELEASED in v0.99.0 on 2026-11-23)

Thirteen items built; E9 was already built. App-only, no schema.

- **E7 / C7 — words.** The kanban column and its setting read
  "Endorse". `STATE_LABELS.flagged` is "Support needed", which carries
  to the count circles, tooltips, the wall's key and the status chip;
  the filter pill, the Settings colour, the flag dialog and its message
  subject follow. A side effect: an initiative's chip now reads
  "Support needed · recovery needed" / "· at risk" where it read
  "Flagged · …".
- **E3 — Escape.** `shared/ui/dialog.ts` swallows Escape at the
  document, before the key reaches ANY field, so no type-ahead inside
  or over a dialog ever heard it. The dialog now relays the key to the
  focused field (`ESCAPE_RELAY`), and `onEscape` (`shared/ui/dom.ts`)
  hears both roads: the people search, "Linked to", the person
  type-ahead and the message panel all close their lists.
- **D6 — the grid's note.** `GridDialogOpts.ownerWords`; a priority's
  grid says "this priority's readings".
- **E4 — the flag colour.** `app/src/flagColour.ts` sets `--ltk-flag`
  on the document root from the status settings, at boot and after a
  save of the status colours or the palette. The button already read
  that variable; the row's ⚑ now does too.
- **C3 — entry dialogs.** `buildActionForm(…, { optional: true })`:
  nothing asked while the Action box is empty; Who and Due starred and
  required once it has words. `holdEntryDialog` stars the entry's own
  field(s) and holds the primary button. Risk matrix needs "Hazard or
  Risk" (both starred, either will do). The separate Edit cause dialogs
  on 5 Whys and Fault tree hold Save too — an edited cause can no
  longer be saved empty.
- **C4 — Documents forms.** `requiredMark()`, `stillNeeded()` in
  `docs/fieldEditors.ts`. Add and Save are disabled while a required
  field is empty. The check-in dialog's SECOND button ("Check in &
  submit for review") is held too — it used to do nothing when pressed
  without a comment. Its helper sentence became the label's tooltip.
  **Two things Ben should know:** (1) these forms' sections are plain
  headings, not collapsible — what I said when walking this item was
  wrong, so there was nothing to "open by default"; (2) on 2026-10-26
  he chose the word tag and an ENABLED button that scrolled to the
  first missing field ("uploads kept failing on required properties
  nobody saw marked"). Today's choice replaces that. With a disabled
  button nothing scrolls to the missing field; its tooltip names it.
- **F8 — closed tasks.** `closedTasksForPanel`; the button stays (with
  no count) while only closed tasks remain.
- **F7 — throttle retry.** `retryThrottled`, `isThrottled`,
  `IN_FLIGHT_THROTTLED` in `docs/ingestionRun.ts`; every SharePoint
  call of a run goes through it. A refusal AFTER the copy keeps its
  own words (they say where the draft is). The throttle's wording
  through the connector is still unseen.
- **F9 — term ids.** `termIdsOf` (`docs/rows.ts`) keeps a term
  column's ids under `<col>#termid`, as a person column keeps
  `<col>#email`; `currentTermLabels` gives the grid each term's current
  name at every read of the folder. CONFIRMED on dev by Ben's test 9
  (2026-11-23): the feed returns `TermID` beside `Label`.
- **D3 — read windows.** `improvement/readWindow.ts` `readFrom`;
  `latestSeriesCell` for a metric with nothing in its window.
- **D4 — one read.** `listBoardSeries` + `listBoardSpec` for board
  `"priority"`, sorted out by `sortOwnCells`.
- **D2 — the chart's span.** `chartWindow`; the chart's own time axis
  already ran to today, so handing it the last twelve readings was
  enough; `KpiTrendEditor.setTrendAsOf` ends the axis at the last
  reading when it is more than thirteen periods old.
- **Checked in the harness:** the entry dialogs (new page
  `harness/entrydlg.html`), the wall's key, a priority's own metric
  through the batched read, a nine-weeks-stale metric's chart (all
  eleven readings, then the gap). **Not seen anywhere:** every
  Documents change (the harness cannot reach SharePoint), the flag
  colour from real settings, Escape in the hosted dialog.
- **Ben's checks on dev:** UAT-RIT-015, UAT-ACT-013, UAT-IMP-012,
  UAT-DOC-098, 099, 100, and the changed steps of the Add document,
  Edit properties and check-in cases.

#### Ben's test walk of tranche 1 on dev (2026-11-23, `v0.98.0 +8`)

| # | Check | Result |
|---|---|---|
| 1 | E7 — the "Endorse" column | Pass |
| 2 | C7 — "Support needed" in place of "Flagged" | Pass |
| 3 | E3 — Escape in a search list | Pass |
| 4 | E4 — the flag's colour | Pass |
| 5 | D6 — the values grid's note on a priority | Pass |
| 6 | C3 — the four entry dialogs | Pass |
| 7 | C4 — required fields on the Documents forms | Not tested on dev: Ben will test in production (after a release) |
| 8 | F8 — closed ingestion tasks | Pass |
| 9 | F9 — a term renamed after a file was tagged | Pass — which confirms on dev that the list feed returns the term ID beside the label |
| 10 | F7 — a throttled ingestion run | Skipped: cannot be forced. Unproven until SharePoint next throttles a run; a throttle-looking refusal that is NOT "SharePoint is busy…" means the wording needs adding to `isThrottled` |
| 11 | D2 — a metric's chart when readings are old | Pass |
| 12 | D3 / D4 — nothing else moved | Pass |

Tranche 1 stands tested on dev except C4 (production, after a release)
and F7 (cannot be forced).

### Tranche 2 (built 2026-11-24, RELEASED in v0.100.0 on 2026-11-26)

Six items built, five off the backlog with nothing built (C5, D7, D8,
E5, E17 part 1). App-only, no schema.

- **C1 — what a cascaded priority carries counts upward.**
  `priorities/ownBelow.ts` `ownBelow` gathers, per place, the actions
  and own metrics of every counted child row, and the actions raised on
  the SAME row at an org below the one in view (adopted as-is).
  `priorityStatus(states, mine, below)` (`improvement/status.ts`) adds a
  reason per place: "N late priority action(s) at <place>", "<metric>
  short of plan at <place>". Nothing rolls down or sideways. The
  actions still show only where they were raised. UAT-PRI-017.
- **C6 — who pressed a sign-off.** `Assignee.doneBy` (in
  `ben_assigneesjson`, no schema), written by `mergeAssignees` (opts
  `by`) when a part becomes done for someone other than the person
  saving — a press on their box, or closing the action from the dialog.
  A part already done keeps its record; an undone part and a person's
  own tick carry none. The box's tooltip: `signedOffWords` — "Signed off
  by Ben for Kat, 24 Nov". A part closed from a BOARD (a drag to Done)
  records no presser. UAT-ACT-014.
- **C8 — a removed metric takes its readings.**
  `improvement/metricRemoval.ts` (which metrics have readings of their
  own, the question, what a save removed for good);
  `store/series.ts` `countReadings`, `deleteSeriesAt`. The × counts and
  asks ("Remove <name> and its N readings? This cannot be undone."); a
  count that FAILS still asks, without the number. An initiative's
  Edit details deletes at Save (Cancel undoes it); a priority's own
  metrics save at once, so the readings go at once. A value driver's
  series is never touched. UAT-IMP-013, UAT-PRI-016 step 11.
  **From Ben's test walk (2026-11-25):** the × on a metric that IS a
  value driver went without a word and read as a delete. It now asks
  too — "Remove <name> from this initiative?", "Its readings belong to
  the value driver and are kept." (`removeDriverMetricWords`). Then an
  own metric with NO readings went silently too ("Test metric yall" on
  "LiF Plan on a Page"), so the × now ALWAYS asks on an existing
  initiative or priority: with none, "Remove <name>?", "It has no
  readings." This replaces the walk's "a metric with no readings goes
  without a prompt". Ben then read the question on that metric ("It has
  no readings") and passed the test: the count was right, the metric
  simply had none.
- **D10 — calendar year is the only period.** `PeriodSettings` is
  `{ mode: "calendar" }`; `periodFor` is the date's year; the fy and
  custom branches, the start month, the prefix and the label list are
  gone from `priorities/model.ts` and from Settings → Priorities. A
  stored mode other than calendar is read as calendar. An older label
  ("FY26") is still read by its digits and stepped in its own shape.
  UAT-SET-016.
- **E17 part 2 — which gate snapshot stands.**
  `improvement/gateSnapshots.ts` `markGateSnapshots`: per stage the
  newest snapshot leads, "reverted <date>" when a later revert went
  back to that stage or before it; earlier ones are "superseded" and
  fold under it ("▸ N superseded") in the board's Live menu; the
  viewing banner says the same. The reverts come from the initiative's
  stage-move events (`InitiativePaneHandle.gateHistory`). UAT-IMP-014.
- **G8 — a ritual shared with a site.** `screens/ritualScope.ts`
  `ritualStanding`: manage / view / none. A site admin SEES a ritual
  from another site that is also shown at theirs ("Also at your site,
  from <site>"), with Open and Copy link only. The wizard asks the same
  rule as a backstop. **A tightening Ben should know:** until now any
  site admin could open the edit wizard for ANY site's ritual by its
  address; now only for their own site's, or one they own. An owner who
  is a site admin elsewhere now also sees their ritual in the list.
  UAT-RIT-016.
- **Seen in the harness:** Settings → Priorities' Period section with
  nothing to choose and the year pickers in order; the Priorities page
  on the in-memory data; the × on a priority's own metric asking
  "Remove Respect index and its 3 readings?" and deleting them. **Not
  seen anywhere:** C1 on real cascades, C6's tooltip, E17's menu and
  G8's list (pure rules tested; the surfaces need the hosted app).

#### Ben's test walk of tranche 2 on dev (2026-11-25, `v0.99.0-20-g5ce4709`)

| # | Check | Result |
|---|---|---|
| 1 | D10 — the period is the calendar year | Pass |
| 2 | C8 — removing a metric | Pass, after two changes made in the walk: the × asks on a value-driver metric too, and on a metric with no readings (it always asks on an existing initiative or priority) |
| 3 | C6 — a sign-off pressed for someone else | Pass |
| 4 | C1 — a cascaded priority counts upward | Pass (Ben linked a site priority under a company one from its Cascade tab first) |
| 5 | E17 part 2 — which gate snapshot stands | Pass |
| 6 | G8 — a ritual shared with another site | Pass |

Tranche 2 stands tested on dev.

### Tranche 3 (built 2026-11-25, RELEASED in v0.100.0 on 2026-11-26)

Four items built; C2 off the backlog. App-only, no schema.

- **D1 — a stale metric is marked.** `improvement/staleMetric.ts`:
  `overduePeriod(cadence, today)` is the newest period that ended more
  than five working days ago (`workingDaysAfter`, Monday to Friday, by
  calendar fields); a metric whose newest reading is before that
  period's start is stale; `staleWords` → "No reading for 9 weeks".
  `MetricValue.stale` (computed in `metricValueOf` from the newest
  reading's date and the cadence its readings are kept at —
  `DriverLast.cadence`). Shown: a faded chart and a ◷ leading the
  caption on a tile, with the words in the tooltip (the tile carries no
  words); "· ◷ no reading for …" on the Improvement tile's metric
  line; "◷ No reading for …" on the popup's Objectives rows; a neutral
  tag in the lower left of the Metrics card's chart. NO status effect.
  A metric never read is not stale. An older in-card KPI document
  (readings with no dates) is not judged. UAT-IMP-015.
  **From Ben's test walk (2026-11-25):** the "◷" character rendered
  tiny ("mark works, but is too small"). The mark is now a DRAWN clock
  (`improvement/staleMark.ts`, an SVG at 1.3em in the text's colour),
  on the tile and before the words everywhere else.
- **D5 — Link… and Promote… on a priority's own metric.**
  `priorities/ownMetricsTab.ts` drops `noRelink` for a priority with a
  site, asks the initiative's role question for Promote
  (`mayPromote`), and MOVES the readings: `beforeMerge` counts them and
  asks ("Move N readings into <driver>?", `moveReadingsWords`), then
  `mergeCardSeriesIntoDriver` and `deleteSeriesAt` on the priority's own
  location, so nothing is left to come back. A link that only LEADS a
  driver moves nothing and asks nothing. Not on a company-level
  priority. An INITIATIVE's link is as it was: it tells after, and
  leaves its own readings where they were. UAT-PRI-018.
  **From Ben's test walk (2026-11-25):** he linked a metric as LEADS
  (Drives was greyed: the driver was computed, or its unit differed)
  and its chart went empty — "now it is missing". The Metrics card
  treated ANY linked driver as the metric's series and read the
  driver's key at the metric's own location. `seriesDriver`
  (`improvement/metricLocation.ts`) is now the one answer: the driver
  only when the metric IS it. The readings were never touched. The
  same fault sat on an initiative's Metrics card for a Leads link.
  Ben then looked for the metric in the tree: Link… does not add a
  node (Promote… does), and a linked row offered only ×. He chose
  **"Change link…" and "Unlink" on a linked metric's row**
  (`metricsList.ts` `unlink`, `linkOwn` with the current link;
  `leaveDriverWords`), on priorities and initiatives alike: a Leads
  link unlinks with nothing lost and no question; a metric that WAS
  the driver is asked first, and its readings stay with the driver.
  NOT built (offered, option 2): listing priorities on the tree's
  Simulate view — it would change what the simulation counts and
  needs a walk first.
- **D9 — a re-parented priority takes its parent's sub-pillar.**
  `priorities/relinkPillar.ts` `relinkPillarPlan`: the parent's
  sub-pillar in the year in view; the linked priority and every
  priority made from it move from that year (`moveFrom`), earlier years
  kept. The dialog's tick is gone; a line says what moves. After the
  link a message is offered (step "linked") to the parent's owner and
  the owners below. `LifecycleCtx.viewYear`. UAT-PRI-019.
- **D11 — the decision zone everywhere.** `renderZoneStack`
  (`prioritiesScreen.ts`): Proposed, Cascaded to you and Unplaced as a
  stack of the matrix's own cards. The phone shows it under the walk,
  with the same "N awaiting a decision" chip; the executive summary's
  last step is "Awaiting a decision · N" (`WalkOpts.zone`).
  `cascadeReview` and `renderReviewList` — the pop-up list with its
  own Accept / Hold / Decline buttons — are DELETED. UAT-PRI-020.
- **Seen in the harness:** the phone layout with the chip and the
  three groups under the walk; the executive summary's last step; Link…
  and Promote… on a priority's own metric row. **Not seen anywhere:**
  the stale mark on real readings, a link's merge, the sub-pillar move
  on a real family (rules tested; the surfaces need the hosted app and
  a real phone).

#### Ben's test walk of tranche 3 on dev (2026-11-25, `v0.99.0-35-g130a6d8`)

| # | Check | Result |
|---|---|---|
| 1 | D1 — the stale mark | Pass, after the mark was redrawn: the "◷" character was too small, so it is a drawn clock sized to the text |
| 2 | D5 — Link… and Promote… on a priority's own metric | Pass, after two changes: a metric linked as Leads charted empty (fixed, `seriesDriver`), and a linked row now offers Change link… and Unlink |
| 3 | D9 — re-parenting takes the parent's sub-pillar | Pass |
| 4 | D11 — the decision zone on the phone and in the executive summary | Pass |

Tranche 3 stands tested on dev.

### Tranche 4 (built 2026-11-25, RELEASED in v0.100.0 on 2026-11-26) — SCHEMA-CARRYING

Six items built; E1 off the backlog. Two columns on `ben_ltkaction`
(E13), deployed to dev on 2026-11-25 with Ben's sign-in.

- **E2 — attachments.** `renameAttachment` (`store/attachments.ts`);
  a Rename link edits the caption in place (Enter saves, Escape
  leaves; `cleanCaption`). An image a browser can draw (`previewable`:
  JPG, PNG, GIF, WebP) opens in a viewer inside the app
  (`attachments/list.ts` `showImage`), with Download and Close; the
  bytes are read once (`attachmentBlob`). UAT-IMP-016.
- **E6 — the Gantt's picture.** `cssForSubtree` (`shared/export/png.ts`)
  gathers the PAGE's rules for the classes a card's content uses — the
  app's Gantt is styled by the page, not the control — and the Action
  card adds them in the Gantt view (`pictureCss`). A download there is
  FULL (`snapshot(..., full)`): every scrolling box is opened out while
  it is measured and cloned, so the picture holds every row and the
  whole range. CONFIRMED in the harness: the stored tile used the same
  bare styles, and is styled now. UAT-ACT-015.
- **E8 — the picture as a card is left.** Drawing is SYNCHRONOUS, so no
  wait and no cap were needed (the walk said half a second):
  `flushPendingSnapshots` draws every waiting picture, and
  `flushPendingSaves` (`saver.ts`) calls it first. Fishbone and Process
  map had timers of their own and now use the shared
  `SnapshotScheduler`. UAT-RIT-017.
- **E10 — due-date moves by reason.** `improvement/moveReport.ts`;
  the Improvement tab's header gains a ⋮ (it had none) with "Due-date
  moves…": by reason, then the initiatives with the most; later moves
  only, the year and org in view; a row opens its initiative.
  UAT-IMP-018.
- **E11 — the endorser sees the evidence.** The endorse review shows
  "📎 n" on a waiting action and opens its attachments in place,
  read-only (`improvement/endorseReview.ts`). UAT-IMP-017.
- **E13 — the org on the action row.** `actions/orgStamp.ts` (pure:
  tokens, stamps, the scope's needle, a rename), `store/actionOrgs.ts`
  (a row's stamps; the bulk passes), stamped in `upsertActions`.
  `openActionsInOrg(token)` reads assigned, raised and unstamped; the
  hub (`screens/hub.ts`) merges them, the LeanHub control shows
  **"Raised here, assigned elsewhere"**. The whole-company scope pages
  at 500 and paints as it reads. `upsertPerson` queues a re-stamp when
  a placement changes (`queueRestampPerson`, one at a time); a rename
  moves stamps text for text (`renameOrgStamps`) under a progress note;
  Settings → Organisation has **"Re-stamp actions"** for super admins.
  The new filters were probed READ-ONLY against dev and answer 200
  (dev held 7 open actions, all unstamped). UAT-ACT-016.
  **Limits, said plainly:** nothing here has run in the hosted app; a
  stamp is NAMES, so a rename touches every open action of that org; an
  initiative's own org is not renamed by a site rename (as before), so
  the raised stamp is moved as text and "Re-stamp actions" would put a
  renamed site's initiative actions back under the OLD name — to look
  at before a real site rename; closed actions are not stamped afresh
  (the scope reads open ones; a reopened action is stamped at its
  save).
- **Seen in the harness:** the full Gantt picture (styled, every row).
  **Not seen anywhere:** the image viewer on a real file, the endorser's
  chip, the moves panel on real history, and all of E13.

#### Ben's test walk of tranche 4 on dev (2026-11-26, `v0.99.0-51-g5c3f799`)

| # | Check | Result |
|---|---|---|
| 1 | E2 — attachment captions and the image viewer | Pass, after one fix: the viewer showed a broken picture, because the player refuses a `blob:` address as a picture's source in the browser too; the picture now rides a `data:` address, and one that will not draw says so |
| 2 | E11 — the endorser's "📎 n" | Pass |
| 3 | E6 — the Gantt's picture | Pass |
| 4 | E8 — a card left straight after an edit | Pass |
| 5 | E10 — due-date moves by reason | Pass |
| 6 | E13 — the organisation scope on actions | Pass |

Tranche 4 stands tested on dev. **Tranche 5 is held:** on 2026-11-26
Ben put the 2026-11-25 issue export (30 reports) ahead of it, under the
new review process in `issue-review-prompt.md`, with one item of his
own added to the round: a CSV import that prepares responses and
closes issues in bulk.

### Tranche 5 (built 2026-11-27, on dev, UNRELEASED) — no schema

Six items, as walked. One new shared module carries all of it.

- **The builder.** `shared/ui/typeAhead.ts` `buildTypeAhead` is the
  standing search-picker as ONE piece: held matches (`local`) at once,
  a slow source (`remote`) asked after 350 ms and three letters with
  "Searching…" and its own heading, a stale answer dropped by a
  sequence number, ↑ ↓ Enter Escape (`onEscape`, so it works over a
  dialog), `mousedown` kept from taking the focus, the box emptied
  after a pick with the cursor left in it. An option may carry a
  second line, a mark (`tag`), be shown but not pickable (`disabled`),
  and return a promise: it is busy until the promise settles, and a
  refusal is said under it. `remotePhase`, `typeAheadNote` and
  `nextActive` are its pure rules. **The list is laid over the page**
  (`position: fixed`, placed from the box, opening upward when there
  is no room below, following a scroll): a short dialog cut the old
  absolute list off at its footer — seen in the harness. A scaled card
  or a contained dialog body traps a fixed box, so the placement is
  measured and such a host falls back to the stylesheet's place under
  the box. `listKeys` gives ↑ ↓ Enter to a list a host draws itself.
  The four older hand copies (the action dialog's two, the capture
  card's person column, `docs/docSearch.ts`) are left as they are.
- **F1.** `docs/peopleField.ts` `docPeopleBox` over the builder, for
  the four Documents copies: `fieldEditors.ts` (Add, Edit properties,
  ingestion, bulk change), "Add reviewers" (`lifecycleCmds.ts`), the
  hand-over's "With" (`roleReassign.ts`, whose source follows its role
  ticks) and the Filters pane (`docsScreen.ts`). `PeopleSource`
  (`accessGates.ts`) now gives `held` (the people in memory) and
  `directory` (null when the picker is bound to the group) in place of
  one `search`; `directoryPeopleSource` is the unbound one. Owner and
  approver fields and the hand-over's "With" list the group on a
  click (`listOnFocus`, up to 50, then "n more. Type more of the
  name."). UAT-DOC-120, 121.
- **F2.** `capDirectoryMatches` (`people/directoryAdd.ts`): twelve at
  most, then "Showing the first 12. Type more of the name and search
  again." Enter in the Users search box presses "Search directory &
  add". The connector itself answers with fifteen at most, so the line
  appears for an answer of thirteen to fifteen. UAT-SET-020.
- **F3.** The meeting wizard's Owner is the builder (roster, then "In
  the directory" with "new to the app"); Participants has ONE box for
  both, and the Search button, the second search and the unasked list
  of 25 are gone (`directoryRemote` in the wizard). "Add by name" is
  unchanged. UAT-RIT-018.
- **F4.** Settings → Organisation's owner chips open `pickOwner` with
  `directoryRoad(me, at, roster)`; `pickPerson` and its private add
  are deleted (about 150 lines). `at` is the org the chip belongs to:
  a site's owner lands at the site, a department's or an area's at the
  site and department, a company's with no site. A revoked person is
  offered nowhere in the picker. `OwnerPickerExtras.note` words the
  line under the title. UAT-SET-021.
- **F5, nine places.** Team import's starting person (one call after
  the pause, "already a start" greyed); issue merge (the builder's
  sequence guard; the pick reads "Merging into …" and enables Merge);
  ingestion task assignees (roster at once, directory behind);
  document group members' Add (a member greyed as "a member", the add
  as the option's promise); the hub's person box (the datalist is
  gone; an emptied box is everyone, an unknown name snaps back); the
  Agenda card's "Search everyone…"; the notify panel's "Add a person";
  UAT testers; and the initiative form's "Link a priority" menu, which
  keeps its own grouped list and takes `listKeys` and Escape.
  UAT-DOC-123, UAT-SET-022, UAT-RIT-019, UAT-ISS-010, UAT-IMP-020.
- **The ingestion grid's keys.** `editorKey` and `stepRow`
  (`docs/ingestionDraft.ts`, pure): in the cell editor Enter sets and
  moves down a row, Shift+Enter sets and moves up; Escape and Cancel
  put the cursor back on the cell; Set by the mouse leaves it on the
  cell. A notes box keeps Enter for a new line (Ctrl or ⌘ with Enter
  sets); a search with its list open keeps Enter for its pick; a
  button keeps Enter for its own press. Shift+Enter moves up from a
  text, choice or date cell and from a cell's button. UAT-DOC-122.

**Seen in the harness** (`harness/typeahead.html`, new): the group
listed on a click; held matches at once and the directory under its
heading; a pick by ↓ and Enter with the cursor kept; a greyed member
and a refused add; inside a dialog, Escape closing only the list,
Enter not pressing Save, and the list drawn over the footer. And in
`harness/initform.html`: ↓ ↓ Enter linking a priority. **Not seen
running:** everything that needs the directory, SharePoint or the
player — the Documents forms, the Filters pane, the ingestion grid's
editor, the meeting wizard, the hub's person box, Settings →
Organisation, group members. Those are Ben's test walk.

**Limits.** The directory road returns fifteen people at most. A list
inside a scaled board tile falls back to the old place under its box
and can still be cut off by the tile. Arrow-key movement between grid
cells was offered and not chosen.

#### Ben's test walk of tranche 5 on dev (2026-11-27, `v0.100.0-22-g6435737`)

| # | Check | Result |
|---|---|---|
| 1 | F1 — a document's person fields (UAT-DOC-120) | Pass. Ben asked whether the list filters by site: it does not — an owner or approver field lists the one owners & approvers group, every site, and the person he missed was not in the group. Three ways to put the document's site first were offered; none wanted |
| 2 | F1 — Add reviewers, the hand-over, the Filters pane (UAT-DOC-121) | Pass |
| 3 | F2 — the Users directory search (UAT-SET-020) | TO UAT, unseen |
| 4 | F3 — the meeting wizard (UAT-RIT-018) | Pass |
| 5 | F4 — an organisation owner (UAT-SET-021) | Pass, once the player was reopened: the window first showed the old "Choose an owner" dialog because it was still on the earlier build |
| 6 | F5 — the nine smaller searches | Pass |
| 7 | The ingestion grid's keys (UAT-DOC-122) — report 3 of the 2026-11-25 round | Pass |

**A caution on tests 1, 2 and 4.** At test 5 Ben found his window had
not taken the new build. Tests 1, 2 and 4 were passed before that. I
said so and named how to tell (on the old build an Owner field lists
nothing on a click, and the wizard's Participants has a Search
button); Ben did not ask for a rerun. Their UAT cases stand either
way.

Tranche 5 stands tested on dev, with F2 owed in UAT. Next: tranche 6's
walk.

### Tranche 6 (built 2026-11-27, on dev, UNRELEASED) — no schema

Three items built; F11 struck as already built.

- **F6 — the doc cards level with the register.** `docs/viewFeed.ts`
  (pure) holds what a view asks of one library's feed: `modifiedBounds`
  (a custom range leads, else the last N days), `termFiltersCarried`
  (null when a library lacks a filtered column), `viewQueryFor` (words,
  term filters, date windows, people, "has a value", the Modified
  window), `termFilterFields`, `filtersByColumn`. The register calls
  the first two in place of its own copies; `docs/docsCards.ts` builds
  both cards' queries from `viewQueryFor` and then keeps rows by term
  id (`matchesTermFilters`). FIVE gaps closed, one more than walked:
  same-named terms, people filters, "has linked documents", a custom
  Modified range — and **several terms ticked on one column**, found
  while building: a card ANDed them, so a view of two statuses showed
  nothing; they are one filter now (`filtersByColumn`), as on the
  register. A term filter asks for up to three times the card's rows
  (60 at most), since the exact pass can drop a few. Document health
  now honours the view's words, people, dates and Modified window too
  — it took only the term filters before. `CARD_VIEW_PARTS` names what
  a card does with EVERY part of a view, and a test fails when
  `DocView` gains a part it does not name. A view that searches inside
  documents says so on the card (`cardViewLimits`). The design-time
  line names the new filters (`viewFilterWords`). UAT-DOC-124.
- **G1 — four cards on a phone.** SQDPC: a tile's letters may go under
  the old 12 px floor (5 at least), so five letters sit in one row
  inside a 341 × 227 stage with the legend under them. Risk matrix: a
  tile's cells may go down to 22 px (`ltk-rm-tight` under 34 px sets
  the consequence labels at 7.5 px); a cell's markers are gathered
  first, sized from the cell (`--rm-chip`), two or more at half its
  width, and past four the cell shows three and "+n" (`chipsShown`).
  Fishbone: `renderOutline` builds the same model as a list beside the
  diagram, and the stylesheet shows the list on the phone tier and the
  diagram elsewhere — a tap on a cause, on "＋ Add cause" or on the
  problem opens the diagram's own dialogs. RACI unchanged.
  **Found while looking:** three "hide this in a phone tile" rules
  never matched (`[data-ltk-tier="phone"] .ltk-tile …` — the board
  stamps the tier ON the tile's own host): the risk matrix's register,
  the heatmap's list and the embed's commentary showed in phone tiles
  since v0.85.0. All three match now. UAT-RIT-020, 021;
  `harness/phonecards.html`.
- **G3 — the capture card's add row.** `controls/CaptureCard/addRow.ts`:
  `buildInlineCell` per column type (text, number, date, a tick, a
  select — one that adds chips for a several-values list — and the
  standing type-ahead for a person, where a name nobody has is kept as
  typed), sharing the dialog's `FieldEditor` shape so
  `wireDependentFields` and `readFields` serve both; `hasContent`
  decides a row is worth adding. The row lives in a sticky `tfoot`,
  is built once and kept across repaints, and is rebuilt when used,
  emptied, or its columns change. Enter adds (not when a search has
  spent it, not on a button), Escape empties, and a "＋" in the last
  cell adds for a mouse or a thumb. An empty card's prompt opens the
  blank row. **A fault met and fixed in the harness:** lifting the row
  out of the card for the moment a picture is taken took the cursor
  out of it two seconds after every add; pictures now carry a rule
  that hides the `tfoot` (`PICTURE_CSS`) and the live card is not
  touched. Editing a row is still the dialog. UAT-RIT-022.

**Seen in the harness:** the four cards at 375 px before and after;
Fishbone's list as a tile and opened; the capture card's add row —
typing, a person picked with Enter, a row added with the cursor kept
through the snapshot, Escape, Enter on an empty row. **Not seen
running:** the doc cards (they need SharePoint); every card inside the
player and on a real phone; a capture card with list and date columns.

**Limits.** A term filter on a card asks for at most 60 rows a library
before the exact pass. SQDPC's letters are small in a phone tile
(7 px squares): the slot is 227 px tall. Fishbone's list shows on any
host under 480 px wide, a narrow split pane included. The add row has
no undo: a row added by mistake is deleted from its dialog.

#### Ben's test walk of tranche 6 on dev (2026-11-27, `v0.100.0-26-gf1e3a7d`)

| # | Check | Result |
|---|---|---|
| 1 | G3 — a capture card's row is added in the table (UAT-RIT-022) | Pass |
| 2 | F6 — the doc cards show what their view shows (UAT-DOC-124) | TO UAT, unseen |
| 3 | G1 — SQDPC and the risk matrix on a phone (UAT-RIT-020) | TO UAT, unseen |
| 4 | G1 — Fishbone reads as a list on a phone (UAT-RIT-021) | TO UAT, unseen |

One of four seen running by Ben. F6 and G1 stand on the harness
pictures and the tests alone until UAT: the doc cards have never been
seen against SharePoint since this change, and no card has been seen
on a real phone. Next: tranche 7, each item checked against the code
before it is walked.

### Tranche 7 (built 2026-11-27, on dev, UNRELEASED) — no schema

One item built; E14's two halves left in the backlog; E16 left parked.

- **E15 — a standalone KPI card as good / bad or a status picklist.**
  `controls/KpiTrendCard/tracking.ts` (pure, clear of the improvement
  chunk since the board path mounts the card): `parseCardTracking`
  from the card's settings (null = a number card; good / bad has its
  fixed pair; a picklist with no usable option takes On track, At
  risk, Off track), `optionIndexOf`, `statePointsFromCells`,
  `removedStatePoints`. Settings: "Tracking" and "Picklist options" on
  the KPI trend card; an object-list column may now be a drop-down
  (`ObjectField` kind `enum`) for the option's "Means". The mounter
  (`cardRegistry.ts`) gives an unlinked card its own tracking: the
  editor's existing state trend (`setTracking`), the values grid in
  its existing state mode (`tracking` on `openValueGridDialog`), the
  readings stored under the card by label. A linked card still takes
  the driver's. A reading that is none of the options — a number from
  before the switch, an option since removed — is LEFT OUT of the
  trend, never drawn as the first option; the numbers stay stored and
  return when the card is switched back. The card itself only ever
  REMOVES a state reading: it never writes a point's plotted number
  (an option's place in the list) over the reading's label. The grid's
  note no longer speaks of a unit, targets and limits for a state.
  UAT-RIT-023; `harness/kpistate.html`.

**Seen in the harness:** a picklist card, a good / bad card (readings
stored as words and as 1 / 0) and a card switched from numbers, all
through the real mounter; the grid opening in state mode with the
readings in their periods; a state picked there and written. **Not
seen running:** the settings form with the new drop-down column; the
card in the player; a state card's tile on a board.

**Limits.** A state reading entered in the grid sits on its period's
first day, and the grid shows a state only there (true of value
drivers too). The target, limits and unit settings are ignored by a
state card but still show in its settings. The kebab's "Link to a
value driver" still offers itself on a state card; linking hands the
tracking to the driver.

#### Ben's test walk of tranche 7 on dev (2026-11-28, `v0.100.0-29-gb256a9c`)

| # | Check | Result |
|---|---|---|
| 1 | E15 — a KPI card as good / bad, then as a picklist, then back to numbers (UAT-RIT-023) | Pass |

Tranche 7 stands tested on dev. Next: tranche 8, checked against the
code first; E12 is re-confirmed with Ben before any of it starts.

## Tranche 1A — the 2026-11-23 issue export (inserted by Ben, 2026-11-23)

Nine reports from the DMS UAT re-run, reviewed in
`issues-plan-2026-11-23.md`: ten items, about 27–39 hours, app-only,
all Documents. It runs BEFORE tranche 2, and is walked with Ben item by
item first. Item G (linking a document) takes one of F5's ten type-ahead
places off tranche 5.

**Built and on dev 2026-11-23, not released.** As built, with its
limits, in `issues-plan-2026-11-23.md`. F5 in tranche 5 is now nine
places: "Link a document" and "Superseded by" share `docs/docSearch.ts`.

