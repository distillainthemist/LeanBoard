# LeanBoard Issue Review — 2026-11-25

**The plan document (phase 3), written 2026-11-26.** Source:
`leanboard-issues-2026-11-25.pdf`, 30 reports, all filed against
v0.99.0. Reviewed by `issue-review-prompt.md`. Every decision below is
Ben's, made one at a time on 2026-11-26; the appendix holds the
findings and what was considered and not taken. Nothing in this
document has been built.

## Summary

**Received:** 30 issues — 17 from Ellen Black, 5 from Sue Vallance, 5
from Ben O'Brien, 2 from Marie Dugre, 1 from Holly Keyes. 24 are about
Documents, 5 about Priorities and boards, 1 about Settings.

**Decided:**

| Decision | Count | Issues |
|---|---|---|
| Build | 22 | 1, 2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 21, 22, 23, 24, 25, 28, and 5's fix |
| Duplicate, fixed with its primary | 2 | 15 (of 13), 26 (of 4) |
| Not a software issue | 4 | 7 (with a tooltip added), 19, 29, 30 |
| Deferred | 1 | 3, to tranche 5 |
| Declined | 1 | 27 |

**Three items of Ben's own**, with no issue id and so no row in the
resolution CSV unless filed:

- **N1** — a CSV import that answers and closes issues in bulk, and a
  CSV export to start from.
- **N2** — a version's comment shows under its row in the history.
- **N3** — bulk change of properties, for document controllers.

**Systemic causes found** (each fixed once, not per report):

1. A step that fails halfway leaves its check-out behind (16, part of
   14) — 15 places in 3 files.
2. Review completion was inferred from comments by a narrower read than
   the history's (13, 15).
3. Only one hand-over step told the next person by itself (15, 18).
4. A term was resolved by its NAME where two terms can share one (5).
5. A year change of the pillar structure is made row by row, cannot
   express a merge and can be left half done (1, 23).
6. An action carries two states set in different places (21).
7. A priority's metrics came from three sources by a hidden rule (20).
8. The register's view did not survive a library change, and a
   person's columns were never saved (4, 26).

**Not explained, carried open:** why Approve failed on the edit request
in 16; the Weipa 2027 page with no pillar row in 1 (not reproduced on
dev or in production on 2026-11-26); the cause of 11 (the fix is a
try); whether Cancel revision on a started-only revision restores the
OLDER approved version when a document has two (suspected from the
code, never run — R1 walk, item 9); which step refuses a PDF file's
preview in the hosted app (N4).

**Size:** about 38 working days in six tranches (below). **Schema:** one
column change, for 1. The next release is already schema-carrying
(tranche 4 of the backlog programme, built and unreleased).

**Plan approved by Ben, 2026-11-26. Two releases, as proposed:** the
first carries R1, R2 and R3 with the backlog programme's tranches 2, 3
and 4; the second carries R4, R5 and R6. The resolution CSV follows the
second release.

## Decision log

`#` is the export's number; the issue id is the Dataverse row id, the
resolution CSV's import key. Tranche names are defined under "Order of
work and release".

| # | Issue id | Title | Type | Decision | Option chosen | Reason | Tranche | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | 42db6c12-91e8-f111-84e9-7ced8da2c4f3 | Priority transition | Design gap | Build | Merge rule and a year-change panel, pillars and sub-pillars | A year change is row by row, cannot express a merge, and can be left half done | R2 | v0.100.0 — Resolved |
| 2 | a51354a0-8fe8-f111-84e9-7c1e528a7790 | Adding pillars | Defect | Build | The new row gets the cursor; the page stays put | The cursor went to the last sub-pillar in the whole list | R2 | v0.100.0 — Resolved |
| 3 | 9a809e66-88e8-f111-84e9-7c1e528a7790 | Ingestion task - use keyboard not mouse for data entry | Enhancement | Defer | Keyboard entry in the ingestion grid joins tranche 5 | Belongs with the type-ahead pickers; the spreadsheet round trip serves today | Tranche 5 | Answered — Deferred |
| 4 | ff668fcd-87e8-f111-84e9-7c1e528a7790 | Custom columms reset | Defect | Build | The chosen columns are the person's, kept across library changes and visits | A library change rebuilt the screen without the view; columns were never saved for the person | R6 | Planned |
| 5 | ee83abdd-86e8-f111-84e7-6045bdc41cd5 | Metal Delivery process areas incorrect | Not software? | Build + non-software | Terms read by id, never guessed by name; BSL tree repaired by Ben | The ingestion grid resolved a saved term by name alone; BSL's tree holds duplicates from the v0.83 copy | R1, then repair after R4 | v0.100.0 — Partially resolved |
| 6 | 2c7da473-86e8-f111-84e9-7c1e528a7790 | Larger arrows to expand filter menus | Enhancement | Build | Covered by 8: larger arrows, whole-row expand | Arrows are small text and only the arrow expands | R6 | Planned |
| 7 | 76457348-86e8-f111-84e9-7c1e528a7790 | Default select all three doc libraries | Design gap | Non-software + small build | A reply; a tooltip on a library's name | The app remembers the last selection; a click on a name selects that library alone | R6 | Planned |
| 8 | ced74718-86e8-f111-84e9-7ced8da2c4f3 | Filter pane is small | Design gap | Build | Full-height Filters pane, larger arrows, whole-row expand | The pane is a small pop-over | R6 | Planned |
| 9 | c3476cd8-85e8-f111-84e7-6045bdc41cd5 | Condense libraries panel | Enhancement | Build | The Libraries card folds to one line | Nothing folds the Libraries list alone | R6 | Planned |
| 10 | 8b7517b2-85e8-f111-84e7-6045bdc41cd5 | Document tasks dashboard | New | Build | Document tasks as a larger screen with quick actions that open the same dialogs | Ben's choice, against a recommendation to defer | R4 | Planned |
| 11 | 44bce45a-83e8-f111-84e9-7ced8da2c4f3 | Documents open at the bottom | Defect | Build (a try) | The preview asks the PDF viewer for page 1 | Cause not found; cheap to try | R1 | v0.100.0 — Resolved |
| 12 | e989517a-72e8-f111-84e9-6045bdc4133d | Evidence attachments for approvals on behalf | Enhancement | Build | "On behalf of" and "Attach evidence" in the Approve dialog | The record named the controller and held no proof | R4 | Planned |
| 13 | 89b02c2d-5ae8-f111-84e7-6045bdc41cd5 | Reviews not marking as complete | Defect | Build | The review check uses the history's three-place read | The review check read comments from one place; the history reads three | R1 | v0.100.0 — Resolved |
| 14 | 549f68b2-59e8-f111-84e7-6045bdc41cd5 | Completion of review | Design gap | Build | Any step refused by Word's lock says so | Word's lock on an open file, read as an app fault | R1 | v0.100.0 — Resolved |
| 15 | 442001a1-54e8-f111-84e9-7c1e528a7790 | Review status not updating | Defect | Duplicate of 13 | Follows 13; its message is the hand-over rule | Same fault, plus a message that waited for a second press | R1 | v0.100.0 — Duplicate |
| 16 | 2f2da526-54e8-f111-84e9-6045bdc4133d | I declined an edit request and now the document is checked out to me | Defect | Build | A failed step releases the check-out it took | A refused step stopped with the check-out held | R1 | v0.100.0 — Partially resolved |
| 17 | f74814d4-53e8-f111-84e7-6045bdc41cd5 | Tracked changes are not showing for the approver | Design gap | Build | A line and an "Open in Word" button on the review and approval card | The preview is a PDF with tracked changes applied | R1 | v0.100.0 — Resolved |
| 18 | ceda461a-53e8-f111-84e9-70a8a5567eb6 | Message not sent to reviewer | Defect | Build | Every hand-over step sends its Teams card at once; added reviewers included | The plan was empty when the document had no reviewers before the dialog | R1 | v0.100.0 — Resolved |
| 19 | 999d4611-47e8-f111-84e9-6045bdc4133d | UAT DOC-040: Cancel a revision | Defect? | Non-software | UAT-DOC-040 corrected; a reply | The app did the right thing; the script did not describe the case | R1 | v0.100.0 — Not a software issue |
| 20 | b7667d42-d0e7-f111-84e9-7c1e528a7790 | Priority-Level Metrics and Initiative Roll-Up | Enhancement | Build | One list of measures on a priority | Three sources decided a priority's metrics; duplicates were possible | R5 | Planned |
| 21 | e2732115-cfe7-f111-84e9-7ced8da2c4f3 | Action Phase Not Reflecting in Workflow Columns | Design gap | Build | The kanban column comes from the PDCA state; new actions start at Plan; a "By PDCA state" view | Two separate states on an action, set in different places | R5 | Planned |
| 22 | 961b76b8-cee7-f111-84e9-6045bdc4133d | Department Filtering Across Initiatives and Actions | Design gap | Build | The priority popup follows "Also shown in" | The popup listed every initiative whatever org was in view | R5 | Planned |
| 23 | 11725f58-c4e7-f111-84e9-7c1e528a789c | Rolling over priority initiative to continue into another year fault | Defect | Build | "Extend" and "Complete" on a tile past its planned end; the form fixed | No direct step; a changed start year blanked the sub-pillar | R2 | v0.100.0 — Resolved |
| 24 | e8853a1a-c1e7-f111-84e9-7ced8da2c4f3 | Metrics timeframe (dates selection) | Enhancement | **Held** (was Build) | Not built: the minimum span stays; Ben to discuss with Sue (2026-11-27) | The cause is the trend chart's minimum span, Ben's decision of 2026-10-28 — not the fixed page I named; starting at the first reading reverses it | — | Held |
| 25 | 8674251b-bee7-f111-84e9-7ced8da2c4f3 | Library column keeps appearing | Design gap | Build | Library is an ordinary column in the chooser | The register added it and the chooser could not remove it | R6 | Planned |
| 26 | 79d69ea6-bde7-f111-84e9-7c1e528a7790 | Custom columns disappear | Defect | Duplicate of 4 | Same fault, same fix | — | R6 | Planned |
| 27 | 8dafc340-94e7-f111-84e9-6045bdc4133d | Doc status update | Not software | Decline | Status changes go through the existing commands | Ben: use the existing workflows | — | Answered — Declined |
| 28 | 5bcf3b53-92e7-f111-84e7-6045bdc41cd5 | Updating doc properties | Design gap | Build | Controller commands: Rename, Correct approval date | No rename existed; a wrong approval date from ingestion had no remedy | R4 | Planned |
| 29 | 83cffed5-8ce7-f111-84e9-7c1e528a7790 | Can we have a link to directly open the Documents tab | Enhancement | Non-software | A reply: bookmark a view link | "Copy view link" already opens on Documents | — | Answered — Not a software issue |
| 30 | bd8489ab-8be7-f111-84e9-7c1e528a7790 | Status filter - remove Awaiting Owner Approval | Not software | Non-software | A reply: two different steps | The statuses are distinct by design | — | Answered — Not a software issue |
| N1 | none | CSV import and export for the Issues desk | New | Build | Import with three new statuses; one Teams card per person; preview then apply; export to CSV | Ben's item; this round's close-out needs it | R3 | Planned |
| N2 | none | A version's comment under its row | Enhancement | Build | The comment shows under each version row in place of the tooltip | Ben's item, from question 1 of cluster A | R1 | Planned |
| N3 | none | Bulk change of properties | New | Build | A controller changes one or more properties on a filtered or ticked set | Ben's item; a general need, and what makes the BSL repair practical | R4 | Planned |
| N4 | none | A PDF file's preview shows one page | Defect | Build, in two steps | Say so under the fallback picture and add a readout; then choose the fix once the refusal is seen | Found on R1's walk: the bytes fetch is refused in the hosted app and the fallback is silent | R1 | Planned |

## Clusters and systemic causes

| Cluster | Root cause | Issues it settles |
|---|---|---|
| A. The review step and check-out state | The review check read version comments from one place while the history reads three; a refused step stops with its check-out held; Word's lock reads as an app fault | 13, 14, 15, 16 |
| B. Teams message not sent | Only Submit for review sent by itself; its plan was empty when the reviewers were added in the dialog | 15, 18 |
| C. Columns and library selection | A library change rebuilds the screen carrying only the libraries; columns are not saved for the person; the Library column is outside the chooser | 4, 25, 26 (7 is the remembered selection) |
| D. The Documents screen on a laptop | A small pop-over; nothing folds the Libraries list | 6, 8, 9 (10 is its own build) |
| E. What Edit properties may change | Left out on purpose; no rename exists; a date wrong after ingestion had no remedy | 27 declined, 28 |
| F. Moving priorities into a new year | The follow link is one to one and set row by row; no direct "continue into next year" step | 1, 2, 23 |
| Terms by name | A saved term resolved by its last label; of two with one name the last in the walk wins | 5 |

## Order of work and release

About 38 working days. The year-change panel has a date: the pillar
structure for 2027 has to be set before January.

| Tranche | What | Items | Days |
|---|---|---|---|
| R1 | Documents: the review step, check-outs, messages, wrong tags | 13 (15) with reviewer seating, 14, 16, 18 with the hand-over rule, N2, 5's lookup fix, sweep and exact filter, 17, 11, N4 steps 1 and 2, 19's script | 9.5 (as walked) |
| R2 | The year change | 2, 23, 1 | 9 |
| R3 | The Issues desk | N1 | 4.5 |
| R4 | Controller tools | N3, 28, 12, 10 | 10.5 |
| R5 | Boards and priorities | 21, 22, 20, 24 | 6.5 |
| R6 | The Documents screen | 4 (26), 25, 7's tooltip, 8 (6), 9 | 2 |

Dependencies: 10 reuses the dialogs changed by 12, 14, 17 and the
hand-over rule, so it follows them. The BSL repair needs N3, and 5's
lookup fix goes in first so no new wrong tags are made meanwhile. N1
has to be in production before this round's resolution CSV can be
imported.

**The first release was cut on 2026-11-26 as v0.100.0**: R1, R2 and
R3 with programme tranches 2, 3 and 4. The second (R4, R5, R6) and the
resolution CSV follow.

**Each tranche is walked with Ben before it is built** (his standing
rule), then built, pushed to dev and test-walked, one test at a time.

**Release — approved by Ben, 2026-11-26:** two releases. The first
carries R1, R2 and R3 with the backlog programme's tranches 2, 3 and 4
already built, in time for the year change (about 20 working days of
build). The second carries R4, R5 and R6. The resolution CSV is
produced once every issue has its evidence: after the second release,
or after the first with the later issues listed as exceptions.

## Implementation briefs

Each brief is the agreed option. "Out of scope" lists what was
considered and not taken. A behaviour change updates or adds its UAT
case in the same commit; the case ids are assigned at build.

### [13] Review complete never marks complete (and [15])

- **Root cause:** `loadReviewState` and the submit warning in
  `runLifecycle` (`docs/docsScreen.ts`) read version comments with
  `itemVersions` alone; the history reads three places
  (`itemVersions({ fillComments })`). Ben's production check: the
  comment IS on the version.
- **Change:** the review check uses the history's read and matches a
  reviewer by who made the version (and the name in the comment). A
  press by someone who already finished this round is refused before
  any write. An unreadable history says so on the card in place of the
  button.
- **Out of scope:** recording the review in its own table (the
  fallback if this fails on dev).
- **Acceptance criteria:** Given a document in review with me as a
  named reviewer, when I press Review complete, then my card reads
  "✓ You completed your review on <date>" and no longer offers the
  button. Given I have completed, when I open the document again, then
  no second version can be made by me this round. Given the history
  cannot be read, then the card says so.
- **Affected components:** `docs/docsScreen.ts`, `docs/model.ts`
  (`reviewsOutstanding`, `reviewProgress`), `docs/data.ts`,
  `docs/lifecycleCmds.ts`.
- **Data / schema impact:** none.
- **Test cases:** the reported scenario — reviewers added at submit,
  one presses Review complete (Ben, production: "Ellen's test
  document"); a reviewer named on the document beforehand; two
  reviewers, one done; the owner's submit warning with one outstanding;
  a round after Request revision (the earlier completions do not
  count). **Tested on dev with one account before release.**
- **Risk & rollback:** two more reads when a major has no comment. If
  the read fails the card says so, as designed. Revert is the one read.

### [14] A step refused while the document is open in Word

- **Root cause:** Word holds a lock on a file open in another tab; the
  status write or the check-in is refused "The file … is locked for
  exclusive use by …" (Ben confirmed). The person's own check-out is
  accepted.
- **Change:** one rule for every step that writes inside a check-out:
  a refusal that names this lock reads "This document is open in Word.
  Close it there, then press again." and, if refused again at once, to
  wait a moment. The dialog stays ready.
- **Out of scope:** a warning before the step.
- **Acceptance criteria:** Given a document checked out to me and open
  in Word, when I press Review complete, then the message says it is
  open in Word and the dialog stays; when I close Word and press again,
  then the step lands.
- **Affected components:** `docs/lifecycleCmds.ts`, `docs/sp.ts`
  (`spErrorText`), `docs/editProperties.ts`, `docs/accessRequests.ts`.
- **Data / schema impact:** none.
- **Test cases:** the reported scenario; the same on Check in and
  Submit for approval; a lock held by ANOTHER person keeps its own
  message.
- **Risk & rollback:** wording only.

### [16] A failed step leaves the document checked out

- **Root cause:** every step that works inside a check-out stops at a
  refused write with "the document stays checked out". Decline never
  checks out; the failed Approve did.
- **Change:** a step that TOOK the check-out releases it when it
  fails, its half-made changes with it, and says nothing changed and
  why. A check-out the person already held is left alone. Lifecycle
  steps, edit requests, Edit properties.
- **Out of scope:** Add document (a release would delete the new
  file); the ingestion run; "Cancel revision" on a stray check-out;
  finding why Approve failed (open until seen again).
- **Acceptance criteria:** Given a document not checked out, when a
  step is refused after taking the check-out, then the document is not
  checked out afterwards and its properties are as before. Given I held
  the check-out beforehand, when a step is refused, then my check-out
  and my work in it remain.
- **Affected components:** `docs/lifecycleCmds.ts`,
  `docs/accessRequests.ts`, `docs/editProperties.ts`; one helper.
- **Data / schema impact:** none.
- **Test cases:** approve an edit request that is refused at the grant
  write (the reported scenario, forced on dev); a lifecycle step
  refused at the status write; the pre-held case.
- **Risk & rollback:** discarding a check-out discards what was written
  under it — guarded by "taken by this step". Revert is the helper.

### [18] and the hand-over rule (also [15])

- **Root cause:** `notifyPlanFor` returns nothing when the reviewers
  column was empty before the dialog, and `showNotifyPanel` stops
  before the people just added; the dialog then says "No reviewer is
  named". Only Submit for review sent by itself.
- **Change:** every hand-over step sends its Teams card as the step
  lands — Review complete, Submit for approval, Approve, Request
  revision — as Submit for review does; people added in the dialog are
  recipients like any other; the panel stays for a second send with
  edited words, or an email; a failed send shows as a warning.
- **Out of scope:** editing the words before the first send.
- **Acceptance criteria:** Given a document with no reviewers, when I
  add one in the Submit for review dialog and submit, then that person
  receives the card and the dialog says so. Given I press Review
  complete, then the owner's card is sent without a second press.
  Given the send fails, then a warning says the change is done and the
  message did not go.
- **Affected components:** `docs/notifyModel.ts`, `docs/notifyPanel.ts`,
  `docs/lifecycleCmds.ts`.
- **Data / schema impact:** none.
- **Test cases:** the reported scenario; each of the four steps; a
  step whose only recipient is the person acting (nothing sent, said
  so); a send refused by Teams.
- **Risk & rollback:** more messages than before, sent as the acting
  person. Reverses the 2026-10-26 "nothing sent until pressed" for
  these steps. Revert is `autoSend` per step.

### [N2] A version's comment under its row

- **Change:** in the version history each version row shows its
  comment beneath it, drafts included, in place of the hover tooltip.
- **Acceptance criteria:** Given a draft version with a comment, then
  the comment is readable without hovering; a version with none shows
  nothing extra.
- **Affected components:** `docs/viewer.ts`, `style.css`.
- **Risk & rollback:** a longer panel; none otherwise.

### [5] Terms read by id, never guessed by name

- **Root cause:** `termIdsFor` (`docs/ingestionScreen.ts`) maps a
  term's last label to its id; of two terms with one name the last in
  the walk wins. `valueOf` uses it when a cell's editor opens and when
  a value is dragged with the fill handle. The feed has carried the
  real id since v0.99.0 (`<col>#termid`).
- **Change:** a saved term is read by its id. With no id and a name
  shared by two terms, the cell opens with nothing selected and the
  fill handle refuses; it never guesses. Every other name-only lookup
  that leads to a WRITE is swept and treated the same; lookups that
  only filter or display are listed and left.
- **Out of scope:** the sync moving a term to another parent; the
  sync's inferred rename (backlog).
- **Acceptance criteria:** Given two areas named "General" under
  different parents and a file tagged with one, when I open its cell
  and apply without changing, then the file keeps the same term. When
  I drag that cell over other files, then they receive the same term,
  by id.
- **Affected components:** `docs/ingestionScreen.ts`,
  `docs/ingestionModel.ts`, and whatever the sweep finds
  (`docs/docsScreen.ts`, `docs/editProperties.ts`,
  `docs/fieldEditors.ts` to be read).
- **Data / schema impact:** none in the app. Existing wrong tags stay
  until the repair.
- **Test cases:** the reported scenario on dev with two same-named
  terms; a renamed term (still opens selected, by id); a file from
  before ids were kept, with a unique name (resolves) and with a shared
  name (opens unselected).
- **Risk & rollback:** a cell that used to open pre-selected by a
  guess now opens empty when it cannot be sure.

### [17] The approver cannot see tracked changes

- **Root cause:** the preview is SharePoint's PDF conversion, which
  shows tracked changes applied with no markup. Word shows them to an
  approver (Ben confirmed).
- **Change:** on a Word document awaiting review or approval, the
  decision card carries "Tracked changes do not show in this preview"
  with an "Open in Word" button.
- **Out of scope:** reading the file to say it only when true; the
  approved version side by side.
- **Acceptance criteria:** Given a .docx awaiting my approval, then
  the card shows the line and the button, and the button opens the
  document in Word. Given a PowerPoint or a PDF, then no line.
- **Affected components:** `docs/viewer.ts`, `docs/docsScreen.ts`.
- **Risk & rollback:** one line of chrome on those cards.

### [11] Documents open at the bottom

- **Root cause:** not found. Nothing in the viewer scrolls; where a PDF
  opens is the browser viewer's doing.
- **Change:** the preview's address asks for page 1, for converted
  files and for PDFs.
- **Acceptance criteria:** a document opens at the top of page 1 —
  **Ben's or Ellen's check in the hosted app; cannot be proved before
  release.**
- **Affected components:** `docs/viewer.ts`, `docs/rows.ts`.
- **Risk & rollback:** may do nothing. If documents still open at the
  bottom the report stays open.

### [2] Adding a pillar jumps to the bottom

- **Root cause:** after "＋ Add sub-pillar" the code focuses the last
  sub-pillar box in the whole list (`priorities/settingsTab.ts`).
- **Change:** the row just added gets the cursor and the page stays
  where it is; the same for "＋ Add pillar".
- **Acceptance criteria:** Given several pillars, when I add a
  sub-pillar under the first, then the cursor is in the new row and the
  page has not scrolled away from it.
- **Risk & rollback:** none.

### [23] Continuing a priority into next year

- **Root cause:** no direct step on a tile past its planned end; a
  changed START year carries the old sub-pillar id as it is
  (`priorities/dialogs.ts`) so the sub-pillar goes blank; a year with
  nothing to choose is an empty required field.
- **Change:** a tile past its planned end offers "Extend to <next
  year>" and "Complete" in its menu — Extend sets the planned end and
  asks nothing more unless the sub-pillar cannot carry into that year,
  then asks for one. A changed start year finds the sub-pillar in force
  that year. A year with no sub-pillars says so.
- **Out of scope:** a warning that moving the start year forward takes
  the priority off the earlier year.
- **Acceptance criteria:** Given a priority planned to end in 2026,
  viewed in 2027, when I choose Extend to 2027, then its planned end is
  2027 and the flag goes, in two clicks. Given a sub-pillar that
  follows into 2027, when I change the start year to 2027 in the form,
  then the sub-pillar shown is the 2027 one and Save is live.
- **Affected components:** `priorities/prioritiesScreen.ts`,
  `priorities/dialogs.ts`, `priorities/model.ts`.
- **Test cases:** the reported scenario (Sue: "Andoom: Optimise
  haulage…"); Extend where the sub-pillar ended with no follower; a
  year with no sub-pillars at all.
- **Risk & rollback:** Extend is offered to whoever may edit the
  priority today; no new permission.

### [1] Changing the pillar structure for a new year

- **Root cause:** a priority crosses a year only through the follow
  link (`pillarIdIn`, `succeedsId`); one old row per new one
  (`followCandidates`); "Follows" shows only after an old row was
  ended; the change is several separate saves.
- **Change — the rule:** several old sub-pillars, or pillars, may be
  followed by one new one.
- **Change — the panel:** Settings → Priorities, "Change from <year>
  to <next year>". The earlier year's structure as it is, each pillar
  with its sub-pillars. Each pillar and each sub-pillar answers
  continues / becomes another (new, or one already in the later year;
  several may become one) / ends. A sub-pillar also says which pillar
  it sits under, by default whatever its pillar becomes. New pillars
  and sub-pillars are added in the panel. Each row shows how many
  priorities it carries across all orgs. The footer lists priorities
  that would be left Unplaced, sub-pillars left with no pillar, and the
  pillar filters and card rotations affected. ONE Save applies it all.
- **Covered:** rename; merge; a pillar split (its sub-pillars shared
  out); a pillar ending; a new pillar; a NEW pillar whose NEW
  sub-pillars follow sub-pillars under an OLDER pillar.
- **Out of scope:** carrying priorities through a sub-pillar SPLIT
  (they must be placed, and are listed).
- **Acceptance criteria:** Given two 2026 sub-pillars set to become
  one 2027 sub-pillar, when I save, then in 2027 every priority that
  sat under either, at every org, sits under the new one, and in 2026
  each sits where it did. Given a sub-pillar set to end with priorities
  under it, then the footer lists them before I save. Given I close the
  panel without saving, then nothing has changed.
- **Affected components:** `priorities/model.ts` (`pillarVersions`,
  `followCandidates`, `subPillarPlan`), `priorities/settingsTab.ts`,
  a new panel module, `store/priorities.ts`.
- **Data / schema impact:** ONE COLUMN CHANGE on `ben_ltkpillar` — the
  follow link must hold several rows (today `ben_succeedsid`, one id).
  The shape (a list column beside the old one, read together) is
  settled at the tranche's walk. Existing links keep working.
- **Test cases:** Ben's case — new rows with one-to-one follows; a
  merge; the pillar-level cases above; the unexplained Weipa page (a
  site's 2027 view after a change made through the panel).
- **Risk & rollback:** the panel writes many pillar rows at once: all
  or nothing, with the plan shown before Save. An older build reads
  only the single link — "Lock every older build" after release.

### [N1] CSV import and export for the Issues desk

- **Change — statuses:** three new ones, plain text, no schema.
  **Deferred** (out of the open queue, its own filter), **Partially
  resolved** (stays in the open queue), **Not a software issue**
  (closed). Shown in the desk, its filters, the reporter's own list and
  the PDF.
- **Change — export:** "Export to CSV" beside "Export to PDF": the
  ticked issues in the import's layout — IssueID, then Title, Reporter
  and present Status for reference, then the answer columns blank.
- **Change — import:** a file is read into a preview: each issue's
  title, reporter, present status, new status and message. Rows can be
  unticked and messages edited. Faults are shown per row before
  anything runs: an unknown id, a status not in the list, a missing
  message, a message over 400 characters, a duplicate with no parent.
  Apply runs row by row through the desk's own actions — status (the
  thread records it), the reporter message to the thread, InternalNote
  as an internal thread message, Duplicate through the existing merge;
  type, release and date go into the resolution line as text. Columns
  the import does not know are ignored. A failed row does not stop the
  rest; each row's result is reported. The same file run twice changes
  nothing.
- **Change — how people hear:** ONE Teams card per person listing
  their reports and outcomes, with a link; each answer is also on its
  own issue's thread.
- **Out of scope:** stored drafts; columns for type, release and date;
  a filter by release.
- **Acceptance criteria:** Given 30 ticked issues, when I export, then
  the file holds 30 rows with their ids. Given that file filled in and
  loaded, then the preview shows 30 rows and names any fault. Given I
  apply, then each issue carries its new status and its message in its
  thread, and each reporter receives one card. Given I load the same
  file again, then the preview says nothing would change.
- **Affected components:** `issues/adminTab.ts`, a new pure module for
  parsing and checking the CSV, `issues/report.ts`, `issues/exportPdf.ts`,
  `issues/audience.ts`; `issue-review-prompt.md` §4.5 (the import
  ignores unknown columns).
- **Data / schema impact:** none. Three more values in `ben_status`.
- **Test cases:** this round's own resolution CSV on dev; a file with
  each fault; a duplicate pair; a reporter with many issues (one
  card); quoted commas and doubled quotes; a file saved by Excel.
- **Risk & rollback:** a bulk write to the Issues desk — nothing is
  written before the preview's Apply; issues are never deleted. An
  older build shows the new statuses as their raw words.

### [N3] Bulk change of properties

- **Change:** in Documents a controller filters to a set, or ticks
  rows, and chooses "Change properties": one or more properties, each
  with one new value, and a reason. A preview counts what will change
  and what will be skipped and why. The run reports each document and
  can be interrupted safely, as an ingestion run can.
- **Rules:** controllers only, a site's controller on their own site's
  documents. Changeable: tags, people, text. Not status, dates, the
  document id or the name. Skipped: checked out to someone; part-way
  through review or approval. Each document changed gets a new version
  with the reason as its comment — a new published one for an approved
  document. The review date is untouched.
- **Out of scope:** rename and approval-date correction (28, one
  document at a time).
- **Acceptance criteria:** Given 40 documents filtered by a process
  area, when I change that area to another with a reason, then the
  preview says 40 will change, and after the run each carries the new
  area, a new version with my reason, and its review date as before.
  Given 3 are checked out to others, then the preview names them as
  skipped and the run leaves them alone.
- **Affected components:** `docs/docsScreen.ts`, a new run module on
  the pattern of `docs/ingestionRun.ts`, `docs/editProperties.ts`
  (the write road), `docs/publish.ts`, `docs/siteScope.ts`.
- **Data / schema impact:** none planned (the run's record to be
  settled at the tranche's walk).
- **Test cases:** the BSL repair's shape on dev; a mixed set with
  skips; an interrupted run resumed; a throttled run; a site
  controller on another site's documents (refused).
- **Risk & rollback:** the widest write in the app. The preview, the
  skips and the per-document result are the guards; each change is a
  version, so each can be seen and undone one by one. About 70 edits a
  minute.

### [28] Rename, and Correct approval date

- **Change:** two commands in the document's menu for document
  controllers. **Rename:** the new name and a reason; the file type is
  kept; a name in use in that folder is refused. **Correct approval
  date:** the date and a reason; a future date is refused; the review
  date is counted again by the document's cadence. Each writes a new
  version whose comment says what changed, from what, to what, by whom
  and why.
- **Out of scope:** typing the cadence or the review date; either
  command for owners; either in the bulk change.
- **Acceptance criteria:** Given a document ingested with the wrong
  approval date, when a controller corrects it with a reason, then the
  approval date is the new one, the review date has moved to match, and
  the history shows both dates and the reason. Given a rename, then the
  register shows the new name and a link copied from the app before the
  rename still opens the document.
- **Affected components:** `docs/lifecycleCmds.ts` or a new command
  module, `docs/sp.ts`, `docs/docsScreen.ts`, `docs/model.ts` (the date
  model).
- **Data / schema impact:** none.
- **Risk & rollback:** reverses, for controllers and this one date,
  the 2026-08-10 "never typed" decision. A link copied from
  SharePoint's address bar before a rename stops working.

### [12] Approving on behalf, with evidence

- **Change:** when a controller approves a document they are not a
  named approver or owner of, the Approve dialog asks "On behalf of"
  (the document's named approvers and owner) and the comment reads
  "Approved by A on behalf of B". The dialog has "Attach evidence",
  one or more files, offered not required, kept in the app's
  attachment table with that approval. That version's card in the
  history shows "📎 Evidence"; anyone who can open the history can
  open the files.
- **Out of scope:** filing the evidence in SharePoint; evidence on
  other steps.
- **Acceptance criteria:** Given a controller approving for a named
  approver, when they choose that person and attach a PDF, then the
  version's comment names both and its card shows the evidence, which
  opens for a reader.
- **Affected components:** `docs/lifecycleCmds.ts`,
  `attachments/model.ts` (a third parent kind), `attachments/list.ts`,
  `store/attachments.ts`, `docs/viewer.ts`.
- **Data / schema impact:** none — the table's parent kind and id are
  text.
- **Risk & rollback:** app-level visibility; the table is readable in
  Dataverse. Evidence is often someone's email.

### [10] Document tasks with quick actions

- **Change:** the Document tasks button opens a larger screen, grouped
  as now. Rows gain their action: Awaiting your approval → Approve,
  Request revision; Awaiting your review → Review complete; Checked
  out to you → Check in, Discard; Review due → Mark reviewed;
  edit-access requests keep Approve and Decline. Each opens THE SAME
  DIALOG as on the document, over the list. Every row keeps "Open".
- **Out of scope:** one-click actions with no dialog.
- **Acceptance criteria:** Given three documents awaiting my approval,
  when I press Approve on the first row, then the Approve dialog opens
  with everything it has on the document (comment, on behalf of,
  evidence, the tracked-changes line for a Word file), and when it
  closes the row has left the list.
- **Affected components:** `docs/docsScreen.ts` (the tasks panel).
- **Risk & rollback:** an approval can be made without opening the
  document (told to Ben; his choice). The dialog says what has not been
  seen and offers the way to look.

### [21] The kanban and the PDCA state

- **Root cause:** the columns follow an action's status; the dialog
  sets its PDCA state; only a drag into Doing sets "in progress".
- **Change:** the column comes from the PDCA state — Plan = To do; Do,
  Check, Act = Doing; awaiting endorsement = Endorse; Closed = Done.
  The dialog moves the card; a drag sets the state (into To do = Plan,
  into Doing = Do; Check and Act keep their mark within Doing). A new
  action starts at PLAN. Existing cards stay in their column: an
  action at Do never dragged into Doing reads as Plan. On hold sits in
  To do with its pause mark. The grouping menu gains "By PDCA state" —
  Plan, Do, Check, Act, Closed, awaiting endorsement in Closed with its
  marker. Meeting boards follow the same rule on their three columns.
- **Out of scope:** PDCA columns as the default; Check as Endorse.
- **Acceptance criteria:** Given an action in To do, when I set Do in
  its dialog, then its card is in Doing. Given I drag a card to To do,
  then its mark is Plan. Given a new action, then it opens in To do at
  Plan. Given the board as it stands the day before release, then
  every card is in the same column the day after.
- **Affected components:** `controls/ActionBoard/editor.ts`,
  `shared/schema/actions.ts`, `shared/ui/actionUi.ts`,
  `store/actions.ts` (the backstop).
- **Data / schema impact:** none. "in-progress" is read as before and
  no longer written as the thing that decides.
- **Test cases:** the reported board (Sue: 21 cards at Do in To do);
  each drag; a shared action; an action awaiting endorsement; On hold;
  a meeting board.
- **Risk & rollback:** reverses "a new action starts at Do"
  (2026-08-31) and changes a mark some people set on purpose (told to
  Ben). Tell the sites before release.

### [22] A department's part of a shared priority

- **Change:** on an org's page a priority's popup lists an initiative
  filed under that org (or within it), or one whose "Also shown in"
  list names that org — the rule the Improvement tab and the Gantt card
  already use. A "Show all" switch with a count; each row names the org
  the initiative is filed under, in place of "This org". With nothing
  mapped the list is EMPTY ("0 of 5"). On the priority's own page
  nothing changes.
- **Out of scope:** splitting actions inside an initiative by
  department; any rule by owner, sponsor, team or action holder;
  scoping the tile's circles or status.
- **Acceptance criteria:** Given a site priority with five initiatives,
  two naming a department in "Also shown in", when that department
  opens the priority, then it lists those two with "2 of 5" and Show
  all lists five.
- **Affected components:** `priorities/prioritiesScreen.ts`
  (`initiativesFor`), `priorities/lifecycle.ts`,
  `improvement/initiativeModel.ts` (`orgsOf`).
- **Risk & rollback:** department pages open empty until initiatives
  are mapped — a setup job for initiative owners, to be told before
  release.

### [20] One list of measures on a priority

- **Root cause:** three sources by a hidden rule — the priority's own
  metrics; a starred primary's starred metrics, which take over;
  metrics ticked from its initiatives when there is no primary.
- **Change:** a single list, "Measures": what the tile shows and what
  leads the Objectives tab. "Add measure" = choose one from an
  initiative (a reference, never a copy) or create one on the priority
  (first showing similarly named metrics of its initiatives). An empty
  list shows "No measure set". Starring a primary, when the list is
  empty, offers once to add its key metrics as ordinary entries.
  Existing priorities are carried in as they stand on the day. A
  referenced metric its initiative deleted shows "No longer on its
  initiative" until removed.
- **Out of scope:** requiring a metric; a roll-up beside the value
  driver tree.
- **Acceptance criteria:** Given any priority the day before release,
  then the day after it shows the same measures. Given a priority with
  none, then "No measure set" shows with Objectives on. Given I choose
  a metric from an initiative, then its readings are the initiative's
  and are entered in one place.
- **Affected components:** `priorities/lifecycle.ts`,
  `priorities/ownMetricsTab.ts`, `priorities/model.ts`
  (`parseObjectives`), `priorities/prioritiesScreen.ts`, the executive
  summary.
- **Data / schema impact:** none — the list lives in the objectives
  column. A one-off conversion as each priority is first read.
- **Risk & rollback:** reverses the 2026-11-16 ticked objectives and
  "the primary's starred metrics take over". An older build misreads
  the list — "Lock every older build".

### [24] Where a chart's axis starts

- **Change:** the axis starts at the first reading, with one empty
  period before it; the Metrics card's chart and the tiles' small
  charts agree. A metric with twelve or more readings is unchanged.
- **Acceptance criteria:** Given a yearly metric with one reading in
  2026, then its axis starts at 2025, not 2022.
- **Affected components:** `improvement/readWindow.ts`
  (`chartWindow`), the trend chart.
- **Risk & rollback:** none.

### [4] The columns are the person's (and [26])

- **Root cause:** `switchTo` rebuilds the screen with only the ticked
  libraries; `DocUiPrefs` never held columns.
- **Change:** a library change and Favourites carry the open view
  (columns, filters, search, sort). The chosen columns are saved for
  the person; every visit opens with them until "Reset to default". A
  saved view or shared link shows its own columns while open. One set
  per person.
- **Acceptance criteria:** Given my chosen columns, when I untick a
  library, then they stay. When I close and reopen the app, then they
  are there. When I open a shared view, then I see its columns, and
  mine return when I leave it.
- **Affected components:** `docs/docsScreen.ts`, `docs/views.ts`,
  `docs/prefs.ts`.
- **Data / schema impact:** none (the person's preferences row).
- **Test cases:** the two reported scenarios (Ellen); Favourites; a
  column a library does not carry (blank cells).

### [25] The Library column

- **Change:** Library is an ordinary column in the chooser — shown
  with the default columns when several libraries are ticked, as now;
  with a chosen set, only if ticked.
- **Affected components:** `docs/docsScreen.ts`, `docs/registerCells.ts`.

### [7] A tooltip on a library's name

- **Change:** the name's tooltip reads "Show only this library".

### [8] and [6] The Filters pane

- **Change:** the pane grows to the height of the window; larger
  expand arrows; clicking anywhere on a branch's row expands it.
- **Out of scope:** a side panel; a pop-up window.
- **Affected components:** `docs/docsScreen.ts`, `style.css`.

### [9] The Libraries card folds

- **Change:** the card folds to one line, "Libraries, 3 of 4",
  remembered for the person.

### [19] UAT-DOC-040

- **Change (script only):** the case gains the revision that was only
  started: cancelling it returns the document to its last published
  version and leaves no version and no comment. No change in the app.

## Non-software actions

| ID | Action (training / process / config / data) | Owner | Due |
|---|---|---|---|
| 5 | Data: repair BSL's process tree — "Cooling Towers & Water Management" under Casthouse; the Metal Delivery copies of "Inspection, Homogenising & Sawing" and (if not a real area) "General" removed; affected documents re-tagged with N3; wrong entries archived, their terms retired | Ben | After N3 reaches production |
| 1 | Config: set the 2027 pillar structure through the year-change panel | Ben | Before January 2027 |
| 22 | Process: initiative owners add departments to "Also shown in"; a department that needs its own action set files its own initiative | Ben to tell the sites | At release |
| 21 | Training: a new action starts at Plan; cards in To do now read Plan; moving a card and setting its state are one thing | Ben to tell the sites | At release |
| 15, 18 | Training: every hand-over step now sends its Teams card by itself | Ben to tell document users | At release |
| 13 | Check: Review complete on dev, with one account, before release | Ben | Before release |
| 11 | Check: documents open at page 1 in the hosted app | Ben or Ellen | After release |
| 16 | Evidence: if Approve on an edit request fails again, the message, word for word | Ellen, via Ben | When seen |
| 7, 19, 27, 29, 30 | Replies with the guidance decided (in the resolution CSV) | Ben | At close-out |
| N4 | Config: add `blob:` to the code-app `frame-src` in PRODUCTION's environment (admin centre → Environments → Settings → Product → Privacy + Security → Content security policy → App); done on Dev 2026-11-26 | Ben | At the first release |
| all | After each release reaches an environment: "Lock every older build" | Ben | At release |

## Deferred and declined

| ID | Reason | Revisit trigger |
|---|---|---|
| 3 | Deferred: keyboard entry in the ingestion grid belongs with tranche 5's type-ahead pickers | Tranche 5's walk — WALKED AND BUILT 2026-11-27 on dev (the programme's "Tranche 5" as built; UAT-DOC-122), unreleased; TESTED by Ben on dev 2026-11-27, pass |
| 27 | Declined: status moves through the existing commands, never a form (Ben) | None |

**Considered within built items and not taken** (each is in its brief's
"Out of scope"). **To the backlog, observed and not requested:**

- The sync's inferred rename: one new name and one unmatched term under
  the same parent is treated as a rename, children carried
  (`orgSyncPlan`, `docs/model.ts`). Real; did not cause 5.
- The sync cannot move a term to another parent (`docs/orgSync.ts`).
- Moving a priority's start year forward takes it off the earlier
  year with no warning.
- "Cancel revision" is offered on an approved document with a stray
  check-out.
- Remembering the last tab (29), a site default for libraries (7), a
  "Show from" year per metric (24), the approved version side by side
  (17), a Filters side panel (8) — not chosen.

## Close-out (completed in phase 4)

| ID | Final status | Release | Tested (Y/N, how) | Deviation from plan |
|---|---|---|---|---|
| | | | | |

### First release answers (2026-11-26, v0.100.0)

At Ben's request, an answers file for the issues the first release
settles, ahead of the full close-out:
`issue-resolutions-2026-11-25-v0.100.0.csv` — sixteen rows, read clean
by the app's own import reader: the twelve the release settles and,
added at Ben's word the same day, four replies that need no build. The decision log's Status column
carries each outcome.

| # | Status in the file | Evidence |
|---|---|---|
| 1 | Resolved | The panel, R2 tests 3 to 6. The reported 2027 view was never reproduced — said in the reporter message |
| 2 | Resolved | R2 test 1 |
| 5 | Partially resolved | The lookup fix, R1 test 6. The BSL repair and re-tagging wait for N3 (R4) |
| 11 | Resolved | R1 test 7. Cause not found; to be checked in production |
| 13 | Resolved | R1 test 3. Reviewer seats to UAT |
| 14 | Resolved | R1 test 4 |
| 15 | Duplicate of 13 | R1 tests 3 and 5 |
| 16 | Partially resolved | The release of a taken check-out is unit-tested, not seen running; why Approve failed is unexplained |
| 17 | Resolved | R1 test 7 |
| 18 | Resolved | R1 tests 3 and 5 |
| 19 | Not a software issue | UAT-DOC-040 corrected in the release |
| 23 | Resolved | R2 tests 7 and 8 |
| 3 | Deferred | No build: tranche 5; the reply points to the spreadsheet round trip |
| 27 | Declined | No build: Ben's decision; the reply says where the commands are |
| 29 | Not a software issue | No build: "Copy link to this view" exists (`docs/docsScreen.ts`) |
| 30 | Not a software issue | No build: two steps by design |

Not in this file: the fourteen issues of R4, R5 and R6, among them 7,
whose reply waits for its tooltip in R6. The full `issue-resolutions-2026-11-25.csv`
follows the second release and repeats these sixteen, so that file run
after this one changes nothing for them.

## Tranche walks

Each tranche is walked with Ben, one item per message, before it is
built. What a walk changes in a brief is recorded here, and wins over
the brief above.

### R1 walk (began 2026-11-26)

**Item 1 — report 13, Review complete. THE BRIEF GREW.**

- Found on the walk: Marie's screenshot has no "Waiting on" line, so
  the history read failed for her; Ben: "General reviewers will not
  have visibility on minor versions." The reviewer picker lets ANYONE
  be named (`reviewerPeopleSource`, `docs/accessGates.ts`, the first
  feedback round's C2), but someone outside the Owners & Approvers
  group has Read only: they cannot open the draft, check out, or read
  minor versions. Naming them is a trap.
- **Decided (Ben's choice 2): a reviewer may still be anyone, and the
  app gives them access for the cycle.** A reviewer from outside the
  group is seated in the editors site group when the document is
  submitted for review, through the ledger the edit requests use, and
  released when the document is approved or the revision is cancelled
  (a person reviewing two documents keeps the seat until the second
  ends — `releaseGrants` already works that way).
- Ben: in his libraries the editors group has Contribute, the same
  level as owners and approvers, so a seated reviewer can open drafts.
  The cookbook says drafts show to approvers and authors only — TO
  CONFIRM with a second account on dev before release, and the
  cookbook corrected to what runs.
- **When the submitter cannot seat** (a Document Editor is a member of
  the group, not an owner): the seat becomes an ACCESS REQUEST to the
  owner, answered in Document tasks like an edit request; one press
  seats the reviewer, who is then told (Ben's choice 2). NOT done:
  letting members change the group's membership (any temporary editor
  or reviewer could then add or remove anyone, in SharePoint too);
  limiting an editor to reviewers who can already open drafts.
- With every reviewer able to read the history, Review complete is
  fixed by the better read, as first decided. No new table. Considered
  and withdrawn: recording reviews in the app.
- Adds about two and a half days to R1 (seating and release, the
  request road, a setting, the per-site check).

**Item 2 — report 14.** The rule goes beside `spErrorText`
(`docs/model.ts`), once, for every step. Wordings agreed: own lock —
"This document is open in Word. Close it there, then press again.";
someone else's — "<Name> has this document open in Word. Ask them to
close it, then press again."; refused again at once — the same line
plus "Word can hold a document for a moment after it is closed. Wait a
few seconds and press again." The holder shows by name where the app
can match the sign-in address, else the address.

**Item 3 — report 16.** As briefed. After a release the person reads
"Nothing was changed." and the reason. Edit properties keeps what was
typed; Start revision is not a failure; a refused release says "It is
still checked out to you. Use Check in or Discard from the document's
menu."; a refused check-in counts (the step is all or nothing).
Check-outs already stray in production are cleared by hand, once.

**Item 4 — the hand-over rule (18, 15).** Sends itself: Submit for
review, Review complete, Submit for approval, an approver's Approve,
Request revision. NOT sent by itself (Ben's choice 1): the final
Approve's courtesy note and the Supersede / Mark obsolete / Reinstate
notices — offered, waiting for a press, as now. The typed comment
travels with the card; nobody is messaged about their own step
("Nobody else to tell"); several recipients share one group chat; a
reviewer waiting for a seat is told when seated, not at submit.

**Item 5 — N2.** Draft rows only: the comment on a second line beneath
the row; none shows no second line; long ones wrap; the card still
shows two drafts and "Show more"; the tooltip goes. The explanatory
lines above the list stay (not asked to go).

**Item 6 — report 5, terms by id. THE BRIEF GREW.** The sweep of
name-only lookups: the ingestion grid's `valueOf` (the reported fault,
fixed); the Importance term found by name to choose the cadence, at
approval (`docs/docsScreen.ts`) and at ingestion landing (fixed the
same way); the ingestion run's site check `labelsOutsideRoot` (made
exact); Edit properties reads by id (`prefillFromItem`) and
`termPathOf` declines on a shared name — both already safe. **And the
register's term filter matches by NAME** on the listing road
(`termFiltersFor` sends labels; only the search road sends term ids):
a filter on "Metal Delivery, General" also returns "Casthouse,
General". So my advice that the filter would give the BSL re-tag list
was WRONG, and N3 on a filtered set would have re-tagged the correct
documents too. **Decided (Ben's choice 1): the filter is made exact in
R1** — SharePoint is still asked by name, the app keeps only rows whose
term id is among those picked (ids arrive since v0.99.0); a row with no
id is kept; the count is trimmed as rows arrive. About half a day.

**Item 7 — report 17.** The line shows on the decision card only to
the person it asks (a reviewer in review, an approver or owner awaiting
approval); Word files (.docx, .docm, .doc); the button opens what
"Open in new tab" opens; the wording "Tracked changes do not show in
this preview." The same line goes into the Approve and Review complete
dialogs in R4, with the quick actions.

**Item 8 — report 11, and a new item N4.**

- "Open at page 1" is added to the preview's address for converted
  files. It asks for the page and nothing else.
- **Found on the walk (Ben, dev and production, Edge on a Mac):** a
  file that is ALREADY A PDF shows page 1 only and will not scroll;
  Word files scroll. Cause in the code: for a PDF the app fetches the
  file's bytes and shows them from a blob (`cookieFreeSrc`,
  `docs/viewer.ts`); when the fetch is refused it falls back to a
  PICTURE of the first page (`pageImage`) and shows no reason
  (`previewWhy` is only painted on the placeholder). So in the hosted
  app nobody reads past page 1 of a PDF in the preview. Which step is
  refused, and by what, was NOT seen (the code's comments expect the
  player's content policy); how long it has been so is not known; it
  works in the harness. Report 11 may be this.
- **N4, added by Ben 2026-11-26 — a PDF file's preview shows one
  page.** In R1: (1) a line under the fallback picture, "This shows the
  first page only. Use Open in new tab for the whole document."; (2) a
  readout for super admins saying which step of the preview failed and
  why; Ben reads it on dev; (3) then the fix is chosen with him —
  allowing the fetch in each environment's settings (no build, only if
  the player then shows the result), or fetching the bytes through the
  SharePoint connector (about a day, no admin change).

**Item 9 — report 19, the UAT-DOC-040 script.** Written for what Ben
saw: cancelling a revision with nothing checked in returns the
document to its last published version and leaves no version and no
comment. **AN OPEN RISK, NOT RUN:** the code, after discarding the
check-out, reads the file's EARLIER versions, takes the highest major
and restores it (`openCancelRevision`, `docs/lifecycleCmds.ts`); on a
document with two approved versions that would bring the OLDER one
back as a new version. Ben's result (history unchanged) fits a
document with only ONE approved version, where the command stops at
"Nothing to restore". Which his document was is not known; asked
2026-11-26, skipped. The two-version case has never been run. To run
before the command is next touched, or sooner: on dev, a standard with
two approved versions of different content, Start revision, Cancel
revision, read the history and the dialog's last line.

**R1 as walked (2026-11-26).** Items: 13 with reviewer seating and the
request road; 14; 16; the hand-over rule (18, 15); N2; 5 with the
sweep and the exact filter; 17; 11 for converted files; N4 steps 1 and
2; 19's script. About 9.5 days, up from 6. No schema change. Needs a
SECOND ACCOUNT on dev to prove: a reviewer from outside the group
seated and able to open a draft; a Document Editor's submit raising
the seat as a request.

### R1 as built (2026-11-26, RELEASED in v0.100.0)

Built in seven commits; 140 test files, 1,513 app tests pass; no schema
change. NOTHING here has been seen running against SharePoint: the
rules are unit-tested, the screens are Ben's to check on dev.

| Item | What changed | Where |
|---|---|---|
| 14, 16 | One rule for every step that writes inside a check-out (lifecycle steps, Mark reviewed, edit requests' approve and revoke, Edit properties): a check-out the step took is discarded on a refusal and the line reads "Nothing was changed. <reason>"; one held beforehand is left ("It was already checked out, and still is."); a refused release says to Check in or Discard. Word's lock is worded as agreed, for every step and for a plain Check in. | `docs/bracket.ts`, `docs/refusal.ts`, `lifecycleCmds.ts`, `accessRequests.ts`, `editProperties.ts`, `docsScreen.ts` `commandFailed` |
| 18, 15 | `handsOver` names the five hand-over steps; their plan exists even with nobody in it; the panel sends as the step lands, then offers "Send again on Teams" and "Send by email"; "Nobody else to tell." where the person acting is the only one; the typed comment travels as "Comment:" (or "Reason given:" where the step asks for a reason). | `docs/notifyModel.ts`, `notifyPanel.ts`, `lifecycleCmds.ts` |
| N2 | A draft row's comment is a second line beneath it; the tooltip is gone. | `docs/viewer.ts`, `style.css` |
| 13 | The review check asks for a draft's words wherever SharePoint keeps them (`fillDrafts`); names are compared without regard to the apostrophe's shape or odd spaces (`nameKey`); a second Review complete in the same round is refused before any write; an unreadable record says so on the card and keeps the button. | `docs/data.ts`, `model.ts`, `docsScreen.ts`, `prompts.ts` |
| 13 (walk) | Reviewer seats: at Submit for review each reviewer outside the pool and the controllers is seated in the editors site group and recorded in the ledger (`kind: "reviewer"`); a refused seat is a request to the owner, who gets a card; Document tasks lists it under "Access requests" with "Let them in" and "Decline…"; the reviewer is told once let in; seats end at the final Approve and at Cancel revision. | `docs/reviewerSeats.ts`, `reviewerSeatsModel.ts`, `accessRequests.ts`, `lifecycleCmds.ts`, `docsScreen.ts` |
| 5 | `savedTerms` / `savedTerm`: the id the item carries, else a name only one term has; used by the ingestion grid's cell and fill handle, the Importance lookups at approval and landing, and the run's site check. The register's term filter keeps only rows whose term id it picked (`matchesTermFilters`), fetching a filtered column for its ids even when not shown; the export follows it. | `docs/ingestionModel.ts`, `ingestionScreen.ts`, `filterModel.ts`, `docsScreen.ts` |
| 17 | On a Word file, to the person asked to review or approve: "Tracked changes do not show in this preview." with "Open in Word ↗". | `docs/viewer.ts`, `docsScreen.ts` |
| 11 | A converted file's preview address ends `#page=1`. | `docs/viewer.ts` |
| N4, steps 1 and 2 | Under a first-page picture: "This shows the first page only. Use Open in new tab for the whole document."; for a super admin, "Why:" with the step, the host asked and what came back (never the signed address). | `docs/viewer.ts`, `style.css` |
| 19 | UAT-DOC-040 gains the revision that was only started. | `docs/uat/documents.md` |

UAT: UAT-DOC-040 and 042 updated; UAT-DOC-103 to 108 added.

**Limits and deviations, said plainly:**

- **17: "Open in Word" opens Word's own VIEW of the document**
  (`Doc.aspx?…&action=view`). On the walk I told Ben it would open
  what "Open in new tab" opens — WRONG: that button opens the PDF
  rendition, which is the very thing that hides the changes. SEEN by
  Ben on dev (test 7, 2026-11-26): the viewing mode shows the tracked
  changes.
- **Reviewer seats rest on two things not seen:** that the editors
  group's level lets a seated person open another's draft (Ben says it
  does in his libraries; the cookbook says drafts show to approvers and
  authors), and that a submitter who cannot seat is refused cleanly.
  Both need a second account. With the pool not linked or unreadable,
  nobody is seated (no guess). A DECLINED seat leaves the reviewer
  named on the document: the owner's card still waits on them.
- **13:** which of the three places holds the review comment in
  production is still not known; the check now reads all three.
- **5:** the exact filter needs the ids the feed has carried since
  v0.99.0; a row with none is kept by name, as before. A cell whose
  saved name two terms share opens unselected and the fill handle
  carries nothing, without a message.
- **11:** converted files only. PDF files never reach the PDF viewer
  in the hosted app (N4).
- **N4:** steps 1 and 2 only. The fix waits on the readout.
- **Hand-overs:** "Nobody else to tell." keeps the dialog open for one
  more press of Close.
- **Item 9's open risk stands** (Cancel revision with two approved
  versions, never run).

### R1 test walk (began 2026-11-26, dev `v0.99.0-94-gfe5c103`)

| # | Check | Result |
|---|---|---|
| 1 | N4 — the first-page note and the readout | Pass. The readout, on dev: "fetching the PDF's bytes from pecheydistillingcom.sharepoint.com. The browser refused before any answer (TypeError: Failed to fetch)" |

**N4's fix, decided on that readout (Ben's choice 1, 2026-11-26):**
read the bytes through the SharePoint connector (`connectorGetFileContent`
— the road Replace content reads back on, proven on dev by the write
probe on 2026-10-27) and show them from memory, capped at 25 MB. Tried
first is still the direct fetch, for an environment that allows it.
NOT KNOWN: whether the player lets a PDF held in memory be FRAMED (it
refused a picture held that way). The app listens for the browser's
policy-violation event; if the frame is refused the first-page picture
stands in and the readout names the rule — which is then what an
environment setting would need. Built the same day (`docs/viewer.ts`
`viaConnector`, `paintFallback`); unseen until Ben opens a PDF on dev.

| 2 | N4 — a PDF's full preview through the connector | FAILED first: "reading them through the SharePoint connector — it answered as string, not bytes". Cause, read in the SDK (`runtimeDataClient.js`, 1.2.7): a response that is neither JSON, an image nor octet-stream comes back as a string of one character per byte — lossless. The October probe read a `.bin` (octet-stream), so the string shape was never met. Fixed: `bytesFromConnector` (`docs/connectorBytes.ts`) turns the string back into bytes and checks the file begins `%PDF`. Re-test owed |
| 2 (again) | N4 — the same, on `v0.99.0-96-gc94636f` | The bytes ARRIVE; the display is refused, and the app detected it: "showing the PDF from memory in the preview frame. Refused by the policy rule "frame-src" (a blob: address is not allowed there)." So the connector road works, and the player's content policy (`frame-src`, `'self'` by default in a code app) will not frame a PDF held in memory. What is left: allow `blob:` in each environment's code-app `frame-src`, or draw the PDF inside the app with no frame |
| 2 (third) | N4 — with `blob:` added to the dev environment's code-app `frame-src` | PASS (Ben): the PDF shows in full. N4 is fixed by the connector road PLUS that one setting per environment |

**N4 closed as: build + a setting.** No PDF library is added. The
setting is in `deploy-to-new-org.md`; production needs it at release
(Ben), or its PDFs stay at the first-page picture with its line.
| 3, at its first step | Submit for review, naming himself and one other | TWO FINDINGS. (a) "DMSReviewers: You can only enter one name" — the dev library's Reviewers column held one person; a set-up matter (Ben changed it), and the new line "It was already checked out, and still is." read correctly, since he was revising. (b) After the submit landed: "Not sent: Could not open the chat: … Duplicate chat members is specified in the request body". Cause: the plans drop the person acting, but people ADDED in the dialog did not pass through them — he had added himself, and Teams seats the caller itself. Latent before R1 (a document with no reviewers sent nothing at all); R1 made the send happen. Fixed in ONE place every send passes: `sendNotifyTeams` and the panel use `withoutSelf` (`docs/notifyModel.ts`); the refusal's own sentence is shown, not its JSON; "You are the only reviewer named, so there is nobody else to tell." where that is so |
| 3, the submit again | Submit for review on `v0.99.0-99-g4f38025` | The card went: "Sent by Teams card to 1 person", his own name not among the recipients, "Send again on Teams" offered. Ben: "Why is top bit add comment / reviewers still left open?" — once a step has landed the dialog kept its reviewers, Add reviewers box and Comment box, looking as if they still took input (so before R1 too). Changed: when the step lands the dialog shows only the result line and the message panel |
| 3 | Report 13 and N2 — a completed review is known; draft comments under their rows (`v0.99.0-100-gf055133`) | Pass |
| 4 | Report 14 — a step refused while the document is open in Word | Pass. (The release of a check-out the step took could not be forced on purpose; it is unit-tested and waits for UAT.) |
| 5 | Reports 15 and 18 — every hand-over tells the next person | Pass (which roles the document carried was not stated, so which steps truly sent a card and which read "Nobody else to tell." is not recorded) |
| 6 | Report 5 — two terms with one name stay two terms (the filter; the ingestion grid) | Pass (whether Part B, the ingestion grid, was run was not stated) |
| 7 | Reports 17 and 11 — the tracked-changes line, Open in Word, page 1 | Pass, all four steps: Word's VIEWING mode shows the tracked changes to the person asked, so the address stays `action=view`; the converted preview opens at page 1 |
| 8 | Report 13 (walk) — a reviewer from outside the group is let in; the request road | TO UAT (Ben): no suitable second account on dev. NOT tested: that a seated reviewer can open another's draft, that seats are released at approval, that a Document Editor's submit raises the seat as a request and "Let them in" works |

**R1's test walk ended 2026-11-26 on `v0.99.0-100-gf055133`:** seven
pass, one to UAT. Found and fixed in it: N4's connector answer as a
string; the sender named as a chat member; the form left open after a
step landed. Changed outside the app: `blob:` in dev's code-app
`frame-src`; the dev library's Reviewers column set to take several
people. R1 stands tested on dev, apart from reviewer seats.

### R2 walk (2026-11-26)

**Item 1 — report 2, the cursor.** The fault reaches further than the
report: both "＋ Add sub-pillar" and "＋ Add pillar" take the LAST box
of their kind in the whole list, which includes the "Other years"
section when it is open — a new name could be typed over a row from a
past year. Fixed by identity: the row just created gets the cursor.

**Item 2 — report 23, Extend.** "Complete…" is already in the tile's ⋮
menu (with Archive…), so the menu gains ONE item. **Offered only on a
flagged tile (Ben's choice 1)** — past its planned end in the year in
view — and it extends TO THE YEAR IN VIEW ("Extend to 2027"). The
sub-pillar: carries (nothing asked); ended with nothing following (one
question — which of that year's sub-pillars from then on; earlier years
keep their home); no sub-pillars for that year at all (extends, and
says it is Unplaced until they are set). Offered to whoever may edit
the priority, on the owning org; written to the priority's History.
The two form fixes stand.

**Item 3 — report 1, the year-change panel.**

- Shape shown to Ben as a mock-up: each pillar and sub-pillar of the
  earlier year on a row, with its priority count across every org of
  the company, and ONE answer — Continues (the default: opening and
  saving changes nothing), Becomes <a target in the later year>, Ends.
  Two rows naming one target is a merge. A sub-pillar stays under
  whatever its pillar becomes unless moved. New pillars and sub-pillars
  are added in the panel and become targets. The footer lists what
  would be lost.
- **Corrected from the plan:** "all or nothing" cannot be promised —
  rows are written one at a time. The writes are ORDERED so a failure
  leaves the earlier year as it was (new rows, then links, then the
  ending of old rows), a second Save finishes, and the panel says so
  if a save stops part-way. "Filters affected" cannot be listed (a
  pillar filter is personal and lasts a session).
- **Follows leaves the list (choice 1):** the panel is the one way to
  change the structure between two years. The list keeps in-year
  edits; a rename there applies to the row for every year it covers
  ("from 2027 only" is "Becomes" in the panel).
- **Years (choice 1):** the year in view, into the next — so an
  earlier change can be opened and put right. The panel reads what is
  stored; a priority placed by hand for that year keeps its place.
  Opened for an earlier year it warns that later years' mappings stay
  as they are.
- **Board cards (Ben's choice 1, against my recommendation of a plain
  warning):** when a row is set to Ends, the footer NAMES each board
  whose Priorities card rotates on it (`prTopicMap`); the panel reads
  every board's card settings to do so. About half a day.
- The link is stored as a list on the new row, in a new column beside
  the old single one (which is still read and still written with the
  first, for older builds).

**R2 as walked:** about 10 days. One column on `ben_ltkpillar`.

### R2 as built (2026-11-26, RELEASED in v0.100.0)

**Schema, deployed to dev:** `ben_succeedsjson` on `ben_ltkpillar` —
every row a pillar or sub-pillar follows, as a JSON list of ids. The
old single column `ben_succeedsid` is still read (a row saved by an
older build) and still written with the FIRST of the list, so an older
build keeps reading a one-to-one change; it does not see a merge.

**Report 2, the cursor.** "＋ Add pillar" and "＋ Add sub-pillar" give
the cursor to the row just created, by its id
(`settingsTab.ts` `focusRow`). UAT-SET-018.

**Report 23, Extend.** The ⋮ menu of a tile past its planned end gains
"Extend to <the year in view>" (`prioritiesScreen.ts`
`extendPriority`): the planned end moves; then nothing more when its
sub-pillar carries, "Place under a sub-pillar" when it does not, or a
notice when that year has none set. History reads "extended to <year>
— planned end was <year>". The form: a changed start year keeps the
sub-pillar in force that year, and a year with none says so instead of
an empty required select. UAT-PRI-021, UAT-PRI-022.

**Report 1, the year-change panel.** Settings → Priorities → Strategic
pillars → "Change for <next year>…" (`priorities/yearChange.ts`, pure
and tested; `priorities/yearChangePanel.ts`). One row per pillar and
sub-pillar of the year in view with its priority count across every
org of the company; Continues, Becomes, Ends; new pillars and
sub-pillars added in the panel; the footer says what would be lost.
The "Follows" select and the two "From <year> / Every year" questions
are gone from the list. UAT-SET-017, UAT-SET-014 rewritten.

**Limits, said plainly:**

- **The save is ordered, not atomic.** New rows, then links, then the
  ending of old rows, then removals. A save that stops part-way leaves
  the earlier year as it was and says "Saved N of M … Press Save again
  to finish"; the later year may be half-built until then.
- **One company at a time** — the panel works on the pillars of the
  company the list is showing.
- **A sub-pillar that continues under a pillar that changes** is
  carried on a new row that follows it (the pillar a row sits under
  is not a per-year field). The panel reads that back as "Continues";
  "Other years" in the list shows the earlier row with its span.
- **A rename or a move in the list is for every year the row covers.**
  A new name from a year on is "Becomes" in the panel. This reverses
  the 2026-11-16 choice of asking "From <year> / Every year" at the
  rename (walk item 3, choice 1).
- **A priority placed by hand for the later year keeps its place**; the
  panel does not move it.
- **The board-card line reads every board's card settings** when a row
  is set to Ends; on a tenant with many boards it shows "Checking the
  boards…" first.
- **An earlier change re-opened** restates its own two years only;
  the mappings of later years stay as they are (the panel says so).
- **Seen in the harness only**: opening, a merge, a pillar "Becomes"
  with its sub-pillars carried, a new pillar, the saved state read
  back identically, Extend in its three outcomes. The hosted app and
  the stored column are Ben's check in the R2 test walk.
- **Report 1's own fault is still unexplained** (the Weipa 2027 view
  with no pillar row; not reproduced, and working again in production
  the same day). The panel removes the hand-set link it was blamed on;
  it is not evidence the fault is fixed.

### R2 test walk (2026-11-26, dev `v0.99.0-109-g99212e6`)

Eight tests, one per message, all run by Ben in the hosted app on dev.
**All eight pass; nothing was changed in the walk.**

| # | Test | Result |
|---|---|---|
| 1 | The cursor stays in an added pillar or sub-pillar row (report 2) | Pass |
| 2 | The list: no Follows control, a rename or move asks nothing and applies to every year | Pass |
| 3 | The panel opens reading the stored state; Cancel changes nothing | Pass |
| 4 | A merge of two sub-pillars into a new one; priorities follow at every org | Pass |
| 5 | A new pillar that an old one becomes; sub-pillars carried; one moved in from another pillar; "continues but its pillar ends" refused | Pass |
| 6 | Ends: the footer's unplaced count and the board named; taken back; an earlier change warns | Pass |
| 7 | Extend to the year in view: carries, asks, History line (report 23) | Pass |
| 8 | The form: a changed start year keeps the sub-pillar; a year with none says so (report 23) | Pass |

Not run: a save that stops part-way (it cannot be provoked by hand),
and Extend into a year with no sub-pillars at all. Report 1's own
fault stays unexplained.

### R3 walk (began 2026-11-26)

**Item 1 — the statuses and their words.** Found in the code: the
desk's seven statuses share one word with the CSV's six ("Declined");
"Resolved" is the desk's "Done", "Duplicate" is its "Merged". The words
are written out three times and the open list four times — made one
list in this build. **Ben's choice 1: the label "Done" becomes
"Resolved"** (stored value unchanged, nothing migrates), so the CSV,
the desk and the reporter read one vocabulary. "Merged" stays (the
import's "Duplicate" runs the merge). The three new statuses as the
plan has them: Partially resolved is open (the Open filter, the
"already reported in this area" list, a merge target); Deferred and
Not a software issue each have a filter. **Added in the walk, not
objected to:** a Deferred issue stays in the "already reported in this
area" list a reporter sees, marked Deferred, so the same idea is
followed rather than reported again.

**Item 2 — the new statuses set by hand.** Today only Declined asks
for a message (the August rule: a decline is never silent); every
other change writes its line to the thread and sends nothing. **Ben's
choice 1:** Deferred and Not a software issue open the same dialog as
Declined, each with its own prefilled message, edited before it goes
(thread + one Teams card per person). Partially resolved is a plain
change, like Resolved. About a quarter of a day.

**Item 3 — Export to CSV.** Layout agreed by Ben: IssueID · Title ·
Kind · Area · Reporter (name, NO email — the file leaves the app) ·
Raised · CurrentStatus, then the answer columns blank (Status ·
ResolutionType · ReporterMessage · ReleaseVersion · ResolvedDate ·
DuplicateOfID · InternalNote). Changed from the plan: the reference
column is CurrentStatus, not Status; Kind, Area and Raised added so a
person filling it in by hand can tell issues apart. The ticked issues
in the order shown; reports merged into a ticked issue get no row of
their own; UTF-8 with the byte-order mark Excel needs;
`leanboard-issues-YYYY-MM-DD.csv`.

**Item 4 — reading the file and the preview.** "Import answers…" in
the selection bar, no ticks needed; nothing is written before Apply.
Columns matched by name in any order, case ignored; unknown columns
ignored; a file without IssueID, Status or ReporterMessage is refused.
Reading copes with Excel: a file that is not UTF-8 is read as
Windows-1252, commas or semicolons, a line break inside a message
becomes a space, status and type words forgiven for case and spaces.
Row states: "No answer" (no status and no message — skipped quietly),
"Already applied" (the status is set and the message is in the
thread), ready, or a fault. **Faults added in the walk** to the plan's
five: the same id twice; a duplicate whose parent is unknown, itself,
or itself a duplicate; an issue already merged answered as anything
but Duplicate of the same parent. An issue its reporter withdrew is a
note, unticked, and may be ticked. Every id unknown = "this file looks
like it came from another environment". A blank ResolutionType is
allowed; a word not in the list is a fault. Only a missing or too-long
message can be put right in the preview; the rest need the file.
**Dates (Ben's choice 1):** ISO and slash dates are both read, slash
dates day first, and the preview shows the date read in words
("3 Dec 2026") — a loosening of §4.5's ISO-only rule, because Excel
rewrites the date on save.

**Item 5 — what Apply writes.** Per ticked row, in order: the status
(with its thread line, as the desk does) or, for Duplicate, the desk's
own merge; the resolution line; the reporter message to the thread;
the internal note as an internal message. Found: the merge dialog
offers only OPEN parents, and a resolution file's parent is usually
resolved in the same file — the import merges into a parent of any
status. Each step is skipped when already done, so a half-applied row
can be applied again and a second run of the file changes nothing.
Rows run one after another in file order ("Applying 7 of 26…", a Stop
that finishes the current row); each ends Applied or Failed with its
reason; failed rows stay ticked; a failure does not stop the rest.
Thread messages carry the importer's name and the import's time.
**The resolution line's wording (not objected to):** Resolved and
Partially resolved read "Bug fix, released in 1.0.0 on 3 Dec 2026",
blank parts left out; any other status carries the type alone, and
nothing when the type is "No change". **An existing line (Ben's choice
1):** the import replaces it and the preview shows the old line and
that it will be replaced.

**Item 6 — how people hear, and the rest.** After the rows are
applied, ONE Teams card per person (reporter, reporter of a merged-in
report, follower) listing their reports in the file: title, outcome
word, message, a link. Rules found in the walk: only rows whose
message was written in THIS run go on a card (an "Already applied" row
never sends again); a person whose duplicate report has its own row
gets that row and not the parent's line as well; more than twenty
answers split into cards marked "1 of 2"; whoever runs the import gets
no card for their own reports (Teams refuses a chat with yourself);
the results list each person as sent or failed with "Send again".
**Limit:** "Send again" lasts while the dialog is open — after that a
failed card is made up by hand from the desk. **Ben's choice 1:** a
"Tell people on Teams" tick, on by default; unticked, the import
writes statuses and threads and sends nothing. `issue-review-prompt.md`
§4.5 gains the id, unknown columns, both date forms and the status
mapping.

**R3 as walked:** about 5.5 days (plan 4.5). No schema.

### R3 as built (2026-11-26, RELEASED in v0.100.0)

**No schema.** Three more values in `ben_status` (`partial`,
`deferred`, `notsoftware`); the label of `done` is "Resolved".

- **One status list** — `issues/status.ts`; the desk, the reporter's
  list and the PDF read it. Partially resolved is open; a Deferred
  issue stays in the reporter's "Already reported in this area" list,
  marked. UAT-ISS-004.
- **Deferred and Not a software issue ask for a message**, in the
  dialog Declined uses. Built beyond the walk: Not a software issue
  will not send its prefilled opening as it stands — it asks for what
  the reporter should do instead. UAT-ISS-005.
- **Export to CSV** — the ticked issues in the agreed layout.
  UAT-ISS-006.
- **Import answers…** — the preview, its faults, Apply with Stop,
  apply again, the duplicate pair. UAT-ISS-007, UAT-ISS-008.
- **One Teams card per person**, the "Tell people on Teams" tick, and
  "Send again". UAT-ISS-009.
- `issue-review-prompt.md` §4.5 says how the import reads the file.

**Limits, said plainly:**

- **A message edited in the preview is not the file's message.** The
  edited text is what is written. Loading the same file again then
  shows that row as Ready, because the FILE's message is not in the
  thread — applying it would add a second message. Put the edit in the
  file too.
- **"Send again" lasts while the dialog is open** (from the walk).
- **A merge that fails part-way** (the status landed, the followers
  did not move) is run again by Apply in the same dialog; after the
  dialog is closed the row reads as already merged and the rest is
  made up at the desk.
- **Reading is one request per issue, six at a time**, plus one for
  its thread: a file of 30 opens in a few seconds, a file of several
  hundred in a minute or so. There is no cap.
- **The import checks each row against the issues as they were when
  the file was loaded.** A change made by someone else while the
  preview is open is not seen until the file is chosen again.
- **An older build shows the new statuses as their raw stored words**
  (`partial`, `deferred`, `notsoftware`) and leaves a partially
  resolved issue out of its Open list. Lock older builds at release.
- **Seen in the harness only** (`issuesdesk.html`, in-memory
  Dataverse): the status words, both message dialogs, the preview and
  each fault, apply, apply again, the withdrawn row, the card grouping
  (five people, the duplicate's reporter, a follower, my own report).
  Teams is not in the harness, so a card that is actually delivered,
  the file picker and the CSV download in the hosted app, and a file
  saved by a spreadsheet program are Ben's check in the test walk.

### R3 test walk (2026-11-26, dev `v0.99.0-112-gaad8991`)

Six tests, one per message, run by Ben in the hosted app on dev.
**Five pass; one goes to UAT. Nothing was changed in the walk.**

| # | Test | Result |
|---|---|---|
| 1 | The status words: the filter, the chips, the Status select, My reports; "Done" reads "Resolved" | Pass |
| 2 | Deferred and Not a software issue ask for a message; the deferred report in "Already reported in this area" | Pass |
| 3 | Export to CSV: the file, its columns, no email, opened in Excel | Pass |
| 4 | The preview of a file SAVED BY EXCEL: each fault named, the date read day first and shown in words, a message put right in the box, nothing written on Close | Pass |
| 5 | Apply with the Teams tick off, the duplicate pair into a parent resolved in the same file, the same file again changes nothing | Pass |
| 6 | One Teams card per person | **To UAT** — dev has no reports raised by a second person |

**Owed in UAT** (with R1's reviewer seats): one card per person with
several answers; the sender's own report getting no card; a duplicate's
reporter getting their own row and not the parent's; a follower's
card; "Send again". These were seen in the harness only, where Teams
does not exist. Not run anywhere: Stop part-way through an apply, and
a row whose step is refused.

### R4 walk (began 2026-11-27)

**Item 1 — N3, choosing the documents.** Found: the register has no
row ticks and loads as it scrolls; "Export register (CSV)" already
gathers every document the filters match. **Ben's choice 1: the
filters choose and the preview trims** — "Change properties…" in the
Documents ⋮ menu takes everything the current filters match, and the
preview lists each document with a tick. No tick column in the
register (the plan's "or ticks rows" is dropped; about a day and a
half not spent). Controllers and super admins; Controlled standards
and Working documents; a site's controller on their own site's
documents, another site's listed as skipped (`docs/siteScope.ts`).

**Item 2 — N3, which properties and how.** The properties Edit
properties offers (terms, people, choices, text), minus the document
id and the name; never status, the system dates, linked documents or
management of change; a value is never cleared, as in the form; owner
and approvers from the pool; several properties in one run. **Found:**
the plan's "one new value" on a property that holds SEVERAL (tags,
approvers, reviewers, a multi-value term column) would wipe the
others, and the BSL repair is a swap, not a set. **Ben's choice 1:
four operations on a several-valued property** — Set to (replaces
everything), Add, Remove, Replace one with another (touches only
documents that have it); a single-valued property offers Set to. About
a day more than the plan.

**Item 3 — N3 and Importance.** Found: in Edit properties a changed
Importance rewrites the cadence from the mapping and counts the review
date again from the stored effective date (the August date model),
which collides with Ben's "would not affect a review date". **Ben's
choice 2, with a condition:** Importance IS offered in bulk; cadence
and review date follow, as in Edit properties; the preview shows each
document's old and new review date. **His condition: the last
reviewed date does not change** — that is the Effective date column
(stamped at Approve and at Mark reviewed), and the rule never writes
it: the new review date is that date plus the new cadence. This is the
ONE exception to "a bulk change never moves a review date"; no other
property touches a date. A document whose new review date is already
past becomes due for review at once; the preview marks those.

**Item 4 — N3, what happens to each document.** Each goes through
Edit properties' own four steps (check out, write, minor check-in with
the comment, publish when the document is approved, superseded or
obsolete — so an approved document goes 3.0 → 3.1 → 4.0, as it does
today for one). The version comment says what changed and why. A
refused step gives back the check-out it took (R1's rule). Skipped,
and listed in the preview with the reason: checked out to anyone,
the person running it included; in review, awaiting approval or
awaiting owner approval; another site's documents; documents that
already have the new value. **Found:** a Draft is either never
approved or an approved document under revision, and a change to it
is part of the draft — lost if the revision is cancelled. **Ben's
choice 1: drafts are changed and it is said** — the preview marks each
"being revised: this change is lost if the revision is cancelled" and
the report lists them again.

**Item 5 — N3, the run.** The preview: one line per document (name,
library, stage, present value → new value, a tick; old and new review
date for an Importance change), the skipped below with reasons, a
reason required, "Change 37 documents". The run: one document after
another, each Changed or Failed with its reason, a failure not
stopping the rest; Stop finishes the current document; throttling
waited out (`retryThrottled`); the tab stays open; no cap, an estimate
shown. **Corrected from the plan:** "about 70 edits a minute" has no
basis — each document is five or six calls in a row; expected 15 to 25
documents a minute, to be MEASURED on dev and the figure put in the
preview. Interrupted: what was done stays done; the same filter and
change run again picks up the rest (documents that already have the
value are skipped); one document may be left checked out to the
person, and the next preview says so. No undo command — the opposite
change cannot tell which documents had the old value. **Ben's choice
1: a downloaded report and no stored record** — a CSV of each
document, old value, new value, result and reason; no schema; the app
keeps no list of past bulk changes. **Asked by Ben, confirmed:**
several properties in one run — each with its own operation and
value, ONE version per document carrying all of them, one reason for
the run; a document is skipped only when none of the changes applies
to it.

**Item 6 — report 28, Rename.** Controllers, one document, from its
menu: the new name and a reason; the file type fixed. Refused before
any write: a name already in the folder, the same name, characters
SharePoint refuses, a checked-out document, one in review or awaiting
approval. Recorded as a version ("Renamed from A to B by <name>.
Reason: …"); an approved document is published again. Where the Title
column holds the old name it is updated, because the register's
search reads Title too (`docs/rows.ts`). Found: the app's links, Linked
documents and "Superseded by" go by id — a rename breaks none; the
ingestion grid already renames by a move in the same folder
(`moveFileByPath`), but that library has no check-out rule and no
content approval. **Not promised:** a rename inside a controlled
library has never been run — probed on dev before the dialog is built;
the fallback is rename first, then a version that carries the comment.
A link copied from SharePoint's address bar stops working. **Found: a
"Prior names" column role that nothing reads or writes. Ben's choice
1:** Rename adds the old name to it, in a library that maps the
column, and the viewer's details show it. Search by a prior name is
not included.

**Item 7 — report 28, the date.** Found: ONE column holds this date
(role "Effective date"), stamped with today at the owner's Approve AND
at Mark reviewed; there is no separate approval date and last-reviewed
date. Correcting a document approved in 2022 and marked reviewed in
2025 back to 2022 undoes the review, and it comes up due. Built as:
the present date, the correct one, a reason, and the resulting review
date shown before the save, with "due for review at once" when it is
already past; refused for a future date, a checked-out document and
one in circulation; offered on approved, superseded and obsolete
documents, not on a draft; any past date allowed (an ingested document
was approved before it arrived); a version whose comment gives both
dates, the new review date, who and why; published again; the cadence
still from Importance, never typed. Reverses the 2026-08-10 "never
typed" decision for controllers and this one date (flagged at the
plan). **Ben's choice 1: the command takes the column's own title** —
"Correct effective date…" where the library calls it that — not
"Correct approval date" always.

**Item 8 — report 12, approving on behalf.** Found in the code:
approval is two steps (approvers endorse, the owner's Approve is the
major); at the approvers' step ONE endorsement moves the document on;
a controller may press Approve at either step (`lifecycleCommandsFor`,
the deadlock-breaker) and the comment names only the controller. Built
as: a controller NOT named on the document gets "On behalf of" in the
Approve dialog — the named approvers at the approvers' step (several
may be ticked), the owner at the owner's step — and choosing is
REQUIRED (not objected to); the comment reads "Approved by A on behalf
of B"; "Attach evidence", one or more files up to 30 MB, offered not
required, kept in the attachment table against the document and
version (parent kind and id are text — no schema); the version's row
in the history shows "📎 Evidence", open to whoever can open the
history; a controller who IS named sees none of it. Limits: app-level
visibility (evidence is often someone's email); files are saved AFTER
the approval lands (the version does not exist before), so a failed
save leaves the approval standing and the dialog offers to attach
again. **Found: the person approved for is never told. Ben's choice
1:** B gets a Teams card, "A approved <document> on your behalf", with
the comment and a link, sent with the hand-over message.

**Item 9 — report 10, Document tasks.** Found: the button opens a
drop-down 380 wide and at most 480 high; access requests are cards
with buttons, every other row only opens the document; the commands'
dialogs can already be opened from a row (`runLifecycle`). Built as:
Awaiting your approval → Approve, Request revision, Open; Awaiting
your review → Review complete, Open; Checked out to you → Check in,
Discard, Open; Review due → Mark reviewed, Open; Flagged for review →
Open only; the two request groups as now. Each button opens THE SAME
dialog over the list; the list reads again when it closes; one
document at a time. The guard from the plan: an Approve or Review
complete dialog opened from the list says "You have not opened this
document here." with "Open document", and for a Word file the
tracked-changes line and "Open in Word". **Not possible from the
list:** hiding Review complete from someone who has finished (the
history is not read there) — R1's rule refuses the second press.
**Ben's choice 1: one large panel replaces the drop-down** (about 900
wide, most of the screen high, full screen on a phone).

**R4 as walked:** about 11.5 days (plan 10.5). No schema.

### R4 as built (2026-11-27, on dev, NOT released)

**No schema.** A third attachment parent kind, `docapproval`, is text
in a column that already exists.

| Item | What was built | Where |
|---|---|---|
| N3 | "Change properties…" in the Documents ⋮ menu, for controllers and super admins: define the changes, preview, run, download the report | `docs/bulkChangeModel.ts` (pure), `docs/bulkChange.ts`, `docsScreen.ts` (`gatherFiltered`, `openBulkChangeMenu`) |
| 28 | "Rename…" and "Correct <the column's title>…" in a document's menu, controllers only | `docs/controllerCmdsModel.ts` (pure), `docs/controllerCmds.ts`, `docsScreen.ts` |
| 12 | "On behalf of" and "Attach evidence…" in the Approve dialog; "📎 Evidence" on the version in the history; a card to the person approved for | `docs/onBehalfModel.ts` (pure), `docs/lifecycleCmds.ts`, `docs/viewer.ts`, `store/attachments.ts`, `attachments/model.ts` |
| 10 | Document tasks as one large panel with quick actions; a dialog opened from it says the document has not been opened | `docsScreen.ts`, `docs/taskRows.ts`, `docs/lifecycleCmds.ts` |

UAT: UAT-DOC-044 and 046 corrected; UAT-DOC-109 to 115 added (239
cases). Harness page `doccontrol.html` runs the bulk change, Rename
and the date correction against a FAKED SharePoint
(`__harnessExecute` in `harness/dataverseStub.ts`).

**Deviations from the walk, said plainly:**

- **Rename was not probed first, as I said it would be.** I cannot
  run SharePoint calls myself. It is built on the road the cookbook
  MEASURED against the controlled library on 2026-10-08 (a move keeps
  the item, its versions and its approval): move onto the new name,
  THEN the bracket that records the version. So the order is the
  walk's "fallback", made the only road. If the bracket is refused the
  rename has still happened and the dialog says so. A same-folder
  rename in a controlled library is Ben's first test.
- **A name already in the folder is refused by SharePoint at the
  move**, not by a listing beforehand — "Nothing was changed. “<name>”
  is already in this folder."
- **Prior names shows in the properties pane** where the library
  lists that column; nothing new was added to the viewer for it.
- **A change that would empty a required property skips the whole
  document**, the other changes of that run with it.

### R4 test walk (began 2026-11-27, dev `v0.100.0-7-ga13c55f`)

| # | Test | Result |
|---|---|---|
| 1 | Rename — the refusals, the rename, the version and its comment | Pass. The move-then-bracket road WORKS in a controlled library (the probe that was owed) |
| 2 | Correct the effective date | Pass |
| 3 | Change properties — the preview, nothing written | Pass |
| 4 | Change properties — the run and the report | Pass (the run's measured rate was not reported back) |
| 5 | Several properties and Importance | FOUND at its first step — Ben: "Why is there a property image tags?" The list offered every dictionary column the library has, where the walk said "the properties Edit properties offers": the form shows only what the Document Columns manager shows for the library's type (`dialogSections`), and bulk change did not apply that. Fixed the same day: `offeredFor(lib)`; a column the manager hides is neither offered nor written |
| 5 (again) | The same, on `v0.100.0-8-g0242ded` | Pass: the list is the form's; both changes in one version; the review date moved, the effective date did not |
| 6 | Report 12 — approving on behalf, evidence, the card | **To UAT** (Ben): dev has no document that can be set up for it. UAT-DOC-114 is its script. NOT seen anywhere: the evidence landing on the right version, the card to the approver, a named controller getting no "On behalf of" |
| 7 | Report 10 — Document tasks, acting from the list | Pass |

**R4's test walk ended 2026-11-27 on `v0.100.0-8-g0242ded`:** six
pass, one to UAT. Found and fixed in it: bulk change offered columns
the form hides. Not reported back: the bulk run's documents a minute
(the summary line states it; the estimate still starts from 15).

**Limits:**

- **N3 reads at most 2,000 documents into a preview** and says so
  when it stops there.
- **N3's rate is not known.** The estimate starts from 15 documents a
  minute and the run replaces it with its own measured rate after
  three documents; the summary states the rate it achieved. The plan's
  "70 a minute" stays unsupported.
- **N3's refusal words are the single-document dialog's** ("…then
  press again"): in a batch that means run the change again.
- **N3 with a multi-value term editor offers "＋ Add a tag…"** (the
  form's tag proposal) inside the value picker; it is the form's own
  editor, reused.
- **12: evidence is saved after the approval lands.** A failed save
  leaves the approval standing; "Attach again" lasts while the dialog
  is open. After that, evidence can only be attached by a second
  approval.
- **12: the person approved for is told by a card of their own**, sent
  as the step lands, not through the hand-over panel.
- **10: the list cannot know a reviewer has finished** (from the
  walk). It also re-reads the whole list after each step — one
  SharePoint read per group.
- **Seen in the harness only, on a faked SharePoint:** the bulk
  change's property list, the four operations, the preview and each
  skip reason, the Importance review dates, a run with a document that
  fails and gives back its check-out, the order of the writes; Rename
  and the date correction's forms, refusals and writes. **Seen
  nowhere:** approving on behalf, the evidence chips, the card to the
  approver, and the Document tasks panel — they need the Documents
  screen, which the harness cannot mount. All of R4 against real
  SharePoint is Ben's test walk.

### R5 walk (began 2026-11-27)

**Item 1 — report 21, the kanban follows the PDCA state.** Found in
the code: the columns follow STATUS; only a drag writes "in-progress"
(`controls/ActionBoard/editor.ts` — nothing else in the app does); the
dialog sets PDCA and touches status only on closing or reopening; a
new action starts at Do, so nearly every card in To do reads Do (Sue's
21). The plan's rule stands — Plan = To do; Do, Check, Act = Doing;
awaiting endorsement = Endorse; Closed = Done; an old card at Do never
dragged into Doing reads Plan — held by ONE rule that keeps status and
PDCA in step at every write (dialog, drag, a tick in a list, a
reopen); a card dragged into Doing whose mark said Plan reads Do.
**Found:** Do is the default and cannot be told from a chosen Do, but
Check and Act are never defaults. **Ben's choice 1:** an old card at
Check or Act still in To do MOVES to Doing and keeps its mark — the
one exception to "every card is in the same column the day after".

**Item 2 — report 21, where an action starts and where a reopened one
goes.** A new action starts at PLAN wherever it is raised (the plan's
reversal of 2026-08-31, already flagged); one raised from the Doing
column's own "＋" starts at Do, as now. On hold sits in To do with its
pause mark; a card in Doing put on hold moves there. Found: reopening
sets Do in three places (a tick taken off in a list, one person of a
shared action reopening their part, the dialog) and under the new rule
that is a column, not only a mark. **Ben's choice 1:** a reopened
action goes to Do, in Doing — what the code sets today. A drag out of
Done takes the state of the column it is dropped in.

**Item 3 — report 21, the "By PDCA state" view.** The grouping menu
gains "By PDCA state": Plan, Do, Check, Act, Closed; awaiting
endorsement in Closed with its marker; On hold in Plan with its pause
mark (a drop elsewhere takes it off hold). A drop sets the state and
status follows; a drop in Closed closes by the rules a close already
has (a shared action with parts outstanding is refused; a
non-endorser's close waits); a column's "＋" raises at that state; the
card settings offer it as a default; the Gantt groups the same way.
Not the default; Check is not merged with Endorse (the plan). **Found:
two sets of column names** — initiative boards read To do, Doing,
Endorse, Done; meeting boards Open, In progress, Done. **Ben's choice
1:** meeting boards read To do, Doing, Done — one vocabulary for one
rule.

**Item 4 — report 22, a department's part of a shared priority.**
Found: the popup lists every initiative of the priority and its child
priorities whatever page it is opened from (`initiativesFor`,
`prioritiesScreen.ts`); the Improvement tab already has the settled
rule (`orgsOf(i).some(inScope)`: filed under the org or within it, or
"Also shown in" names it or something within it); there is a precedent
for scoping by the org in view (an action raised on an adopted
priority, 2026-11-18). Built as: on a page that is NOT the priority's
owner's, the Initiatives tab lists only what passes that rule; "2 of
5" with a "Show all" switch for the session; each row names the org
its initiative is filed under; an empty list says why; the priority's
own page is unchanged. Said plainly: the mapping must name the level
or below (a department named does not show on an area's page); the
TILE is not scoped (the plan), so it can say five where the list shows
two of five. **Found: the executive summary's expanded card uses the
same list. Ben's choice 1:** it follows the same rule, with the same
line and switch.

**Item 5 — report 20, one list of measures.** Found: three sources by
a rule the tab needs a paragraph to explain (`objectiveValues`,
`priorities/model.ts`; the "metrics" tab, `lifecycle.ts`) — the
priority's own metrics first; with a live primary its starred metrics,
which take over; with none, the ticked ones — and with a primary the
tab mounts that initiative's whole metrics card. Built as decided in
phase 2: ONE list, "Measures", own entries and references in one
order, stored in the objectives column as now (no schema); a
referenced row names its initiative and links to it; "No measure set"
when empty. Said plainly: a referenced measure's readings are entered
on its initiative (the primary's card leaves the tab, so they can no
longer be entered in the popup); a primary's unstarred metrics no
longer show there unless added. **Found: "carried in as they stand on
the day" needs a write** — the old rule is derived at every read.
**Ben's choice 1:** a one-off "Convert measures" in Settings →
Priorities, pressed once by a super admin after release (the
"Re-stamp actions" pattern); until it is pressed a priority follows
the old rule.

**Item 6 — report 20, adding, ordering, removing; and two limits of
Ben's.** "Add measure": from an initiative (a picker over the
initiatives under the priority and its child priorities, the listed
ones greyed, confidential ones not offered) or new on this priority
(typing a name shows similarly named metrics of its initiatives with
"Use this one"). The list keeps its order; Move up / Move down in each
row's ⋮; the tile and the executive summary follow it. Removing a
reference leaves the metric on its initiative; removing an own measure
deletes it and its readings, as now. A reference that has gone says
why ("No longer on its initiative" / "Its initiative is no longer
under this priority") — today it vanishes silently. Starring a primary
with an EMPTY list: the confirmation gains a tick, on, "Add its key
metrics as measures". Whoever manages the priority's org may change
the list.
**The limit — Ben's own rule, in place of my two options
(2026-11-27):** a priority holds AT MOST FOUR measures, own and
referenced together (the list IS what is featured — his choice 1; no
second tier), and an initiative holds AT MOST EIGHT metrics. Found:
the executive summary already shows four then "+n"
(`SUMMARY_METRIC_CAP`); a priority's own metrics were capped at eight
(`OWN_METRIC_CAP`) with a primary's stars on top; an initiative had no
limit. What follows, not objected to: a priority over four today is
carried in WHOLE by "Convert measures" (which reports how many are
over), shows its first four and "+n", and cannot be added to until
trimmed; an initiative over eight keeps its metrics and cannot be
added to; the own-metric cap of eight goes; templates carrying more
than eight are checked at the build. The initiative limit is not in
the plan or any report — Ben's item, about a quarter of a day.

**Item 7 — report 24, where a chart's axis starts.** Found: the
Metrics card's chart reads from the twelfth-last reading or the entry
grid's page start, whichever is EARLIER (`chartWindow`,
`improvement/readWindow.ts`), so a yearly metric with one reading in
2026 opens from 2022. Built as decided: one empty period before the
first reading; twelve or more readings unchanged; no readings keeps
the page; the same for a metric whose last reading is old.
**Corrected from the plan:** the tiles' small charts need no change —
they draw the last readings with no time axis. **Found:** the rule
counts ACTUAL readings, and plan values entered for earlier periods
would be cut off the chart. **Ben's choice 1:** the axis starts at the
first ENTERED value, actual or plan.

**R5 as walked:** about 7.5 days (plan 6.5). No schema.

### R5 as built (2026-11-27, on dev, NOT released)

**No schema.** One new kind of entry in a priority's objectives column
(`{ list: 1 }`).

| Item | What was built | Where |
|---|---|---|
| 21 | ONE rule keeps an action's status and PDCA state in step at every write and once at every read (`alignPdca`); a new action starts at Plan; a reopened one goes into Do (`reopenAction`); "By PDCA state" in the grouping menu and the card settings; meeting boards read To do · Doing · Done | `shared/schema/actions.ts`, `shared/schema/actionEndorsement.ts`, `shared/ui/actionUi.ts`, `controls/ActionBoard/editor.ts`, `controls/CardSettings/registry.ts` |
| 22 | On a page that is not the priority's owner's, the popup's initiatives and the executive summary's list are that org's part, with "n of m are <org>’s" and Show all | `priorities/orgPart.ts` (pure), `prioritiesScreen.ts`, `lifecycle.ts`, `walk.ts` |
| 20 | One list of measures: stored in order with a `{ list: 1 }` mark; the Objectives tab for a listed priority; Add measure; Move up / Move down / Remove; a reference that has gone says why; a primary's key metrics offered when the list is empty; the tile shows four then "+n"; "Convert measures" in Settings → Priorities | `priorities/measures.ts` (pure), `measuresTab.ts`, `convertMeasuresRun.ts`, `model.ts`, `lifecycle.ts`, `ownMetricsTab.ts`, `settingsTab.ts`, `improvement/metricsList.ts`, `improvement/initiativeRow.ts`, `store/priorities.ts` |
| Ben's limits | A priority holds at most four measures; an initiative at most eight metrics | `priorities/model.ts` `MEASURE_CAP`, `priorities/measures.ts` `INITIATIVE_METRIC_CAP`, `improvement/initiativeForm.ts` |
| 24 | **NOT BUILT — see below** | — |

UAT: UAT-RIT-013 corrected; UAT-PRI-007, 008 and 016 marked as the
cases of a priority not yet converted; UAT-ACT-017, UAT-PRI-023,
UAT-PRI-024, UAT-SET-019 and UAT-IMP-019 added (244 cases).

**Report 24 was taken back out at the build, on Ben's word.** I gave
the wrong cause in phase 2 and again on the walk. The empty years are
not the entry grid's page (`chartWindow`, which only decides what is
READ): they are the trend chart's MINIMUM SPAN — five years, twelve
months, thirteen weeks, twenty-eight days (`TREND_FLOOR`,
`shared/schema/buckets.ts`), **Ben's own decision of 2026-10-28**, and
the same chart draws the KPI cards on meeting boards. Starting the
axis at the first value reverses that decision. The harness showed it:
the rule I had built changed nothing on screen. Asked on 2026-11-27,
Ben chose to **keep the minimum span and discuss it with Sue**; the
change was reverted (`readWindow.ts` is as it was). Report 24 is OPEN,
held on that conversation; if it comes back, the scoped option is the
Metrics card alone, leaving meeting-board KPI cards on the floor.

**Deviations from the walk, said plainly:**

- **20 — an unconverted priority keeps the OLD Objectives tab** (the
  tick list, the primary's card) until "Convert measures" is run; the
  one list shows only on a converted priority or one made since. So
  straight after install, old priorities look and behave as before.
- **20 — the primary's key metrics are offered by a second question**
  ("Add its key metrics as measures?" — Add them / Not now) after the
  usual confirmation, not by a tick inside it: the app's confirmation
  has no tick.
- **20 — an own measure is created in the editor that exists**
  ("＋ Add metric" / "＋ From the value driver tree" under "This
  priority's own measures"); "Add measure → A measure of this
  priority's own" opens it. The similar-name question is asked when a
  typed metric is saved, not as the name is typed. A measure taken
  from the value driver tree is not checked for a similar name.
- **20 — removing an own measure from the list presses the editor's
  own ×**, so the question with the number of readings is the existing
  one.
- **20 — a referenced measure's chart is not drawn on the tab**, only
  its row (light, plan, actual) and the link to its initiative; own
  measures keep their full charts there. The tile draws both.
- **21 — an action put back after a wrongful close keeps a Check or
  Act mark** (it is not reset to Do); only one that said nothing but
  Closed reopens into Do.
- **Templates:** they carry a metric RULE, not metrics (since
  2026-09-03), so none starts an initiative over eight.

### R5 test walk (began 2026-11-27, dev `v0.100.0-15-g183d6bd`)

| # | Test | Result |
|---|---|---|
| 1 | Report 21 — old cards, the column names, the dialog moving a card | Pass |
| 2 | Report 21 — drags, a new action at Plan, a reopened one into Do | Pass |
| 3 | Report 21 — the "By PDCA state" view, its drags, the Gantt, the settings | Pass |
| 4 | Report 22 — a department's part of a shared priority, popup and executive summary | Pass. **Asked in it (Ben):** the grouping had to be chosen on the kanban before switching to the Gantt — "the grouping selector should also be available on the gantt tab". Built the same day: the select shows on the Gantt view too, reading "Not grouped" where the kanban reads "By status" (by status the Gantt is one flat list); one choice for both views. Seen in the harness |
| 5 | Report 20 — "Convert measures": every tile as before, the one list, stars no longer taking over (on `v0.100.0-16-g6ff1ad0`) | Pass (the run's counts were not reported back) |
| 6 | Report 20 — the list: add from an initiative, four at most, move, remove, an own measure with the similar-name question; an initiative's eight | Pass |

**R5's test walk ended 2026-11-27 on `v0.100.0-16-g6ff1ad0`:** all six
pass. Built in it at Ben's word: the grouping select on the Gantt
view. Report 24 stays Held. Dev's priorities are now converted.

**Limits:**

- **21 — an OLDER build still writes status and state apart.** A Do
  chosen in an older build's dialog is read as Plan by this one. Lock
  older builds at release.
- **21 — every old card at Do reads Plan after release**, including
  any whose Do was chosen. That is the walk's decision; the sites
  should be told.
- **22 — the tile, the tab's count ("Initiatives 5") and the other
  tabs are not scoped.** Only the Initiatives list and the summary's
  list are.
- **20 — an older build drops the list mark when it saves a
  priority**, which puts it back on the old rule. Lock older builds.
- **20 — "Convert measures" converts every company's priorities in one
  run**, one save each; a failure leaves that priority on the old rule
  and the button takes it next time.
- **Seen in the harness:** the kanban's column names and the "By PDCA
  state" view on seeded actions; the one list on a priority with an own
  measure (the head, the row, its menu, the add panel, the own editor
  beneath); "Convert measures" on one seeded priority. **Seen
  nowhere:** a drag in either view, the dialog moving a card, old
  cards being re-read; a REFERENCED measure (the harness has no
  initiatives with metrics), the similar-name question, the offer at
  starring, a reference that has gone, a priority over four; a
  department's part of a priority (the harness has one org's page);
  the initiative limit. Ben's test walk on dev is the first real run
  of each.

### R6 walk (began 2026-11-27)

**Item 1 — reports 4 and 26, the columns are the person's.** As
decided: a library change keeps the columns, filters, search and sort;
entering Favourites keeps the columns (filters are hidden there and
return on leaving); "Apply" in the chooser saves the columns for the
person and "Reset to default" clears them; a library that does not
carry a chosen column shows blank cells. Found in the code: the SORT
is not part of a view (`currentView`, `docs/docsScreen.ts`) — carried
across a library change, saved views and links left as they are; a
view names ONE library or ALL (`DocView.listId`), so opening a saved
view sets the libraries to its own and the person's ticks return when
it is closed. **Ben's choice 1:** choosing columns while a NAMED view
is open changes the screen only — the person's own set is untouched
and returns when the view is closed ("Update view" changes the view).
On a shared link (unnamed) Apply saves them as the person's.

**Item 2 — report 25, the Library column.** Found: the register adds
it itself beside Document whenever more than one library is in view
(`libraryLabel`, `docs/registerCells.ts`), outside the chooser. Built
as decided: "Library" is a row in the chooser, ticked and dragged like
the others; with the DEFAULT columns nothing changes; with a chosen
set it shows only if ticked, wherever it is put — also with one
library ticked, because it was asked for. The phone's line under the
name and the CSV export's Library column are unchanged. **Found:**
saved views and shared links with a chosen set do not name Library (it
could not be chosen), and nothing dates a view. **Ben's choice 1:**
they open WITHOUT the Library column; whoever wants it ticks it and
presses "Update view". No one-off migration.

**Item 3 — report 7's tooltip, and report 9.** **Report 7: NOTHING TO
BUILD.** The plan listed a tooltip, "Show only this library", on a
library's name; the code already has it (`name.title`,
`docs/docsScreen.ts`), with an "Only" button on hover that does the
same. I listed it as a build without checking — my mistake. Report 7
is answered by its reply alone. (Showing "Only" all the time was
mentioned and not proposed; Ben did not ask for it.) **Report 9:** the
Libraries card's heading becomes a toggle; folded it is one line;
"Select all" hides while folded; the fold is remembered for the person
(`DocUiPrefs`); it starts open for everyone; the browse tree takes the
room. **Ben's choice 1:** the folded line is a count, "Libraries · 3
of 4", the names in its tooltip.

**Item 4 — reports 8 and 6, the Filters pane.** Found: a pop-over 400
wide whose scrolling part is at most 480 high (or 70% of the window);
a term row is a 24-wide arrow with a 12-point glyph, then a tick box
with the name; only the arrow opens a branch, and **a click on the
NAME ticks it as a filter**. Built as: the pane reaches from under the
Filters button to the bottom of the window; 480 wide where there is
room; arrows 32 by 32 with a larger glyph. **Corrected from the plan:**
"clicking anywhere on a branch's row expands it" was written without
reading the row — it would have taken away the click that picks a
filter. **Ben's choice 1:** the name keeps ticking; only the arrow
grows; "whole row expands" is dropped.

**R6 as walked:** about 2 days (plan 2). Report 7's tooltip comes out
(already there); the sort carry-over goes in. No schema.

### R6 as built (2026-11-27, on dev, NOT released)

**No schema.** Two more fields in a person's Documents preferences
(`cols`, `lf` in `ben_docuijson`).

| Item | What was built | Where |
|---|---|---|
| 4, 26 | A library change and Favourites carry the view (columns, filters, search) and the sort; the chosen columns are saved for the person; a named view's columns change the screen only, and the person's own return when it is closed | `docs/views.ts` (`columnsToShow`, `DocUiPrefs.columns`), `docs/docsScreen.ts` (`carryView`, `favCarry`, the chooser, "Close view") |
| 25 | "Library" is a row in the chooser (`LIBRARY_SLOT`); by itself beside Document only with the default columns | `docs/rows.ts`, `docs/registerCells.ts`, `docs/docsScreen.ts` |
| 9 | The Libraries card folds to "Libraries · n of m", remembered | `docs/docsScreen.ts`, `docs/views.ts` (`libsFolded`), `style.css` |
| 8, 6 | The Filters pane reaches the bottom of the window and is 480 wide; arrows 32 by 32 | `docs/docsScreen.ts`, `style.css` |
| 7 | Nothing built: the tooltip was already there | — |

UAT: UAT-DOC-011 corrected; UAT-DOC-116 to 119 added (248 cases).

**Built beyond the walk, said plainly:**

- **Closing a named view rebuilds the register with the person's own
  columns.** "Close view" used only to clear the title; the view's
  columns would otherwise have stayed on screen until the next visit.
  The filters, search, sort and libraries stay.
- **Choosing columns no longer resets the libraries.** A view names
  one library or all, so pressing Apply with two of three libraries
  ticked used to bring back all three. The ticks are carried now.
- **With the default columns the chooser shows Library ticked** when
  several libraries are in view, so that Apply keeps it unless it is
  unticked.

### R6 test walk (2026-11-27, dev `v0.100.0-19-geffffa9`)

| # | Test | Result |
|---|---|---|
| 1 | Reports 4 and 26 — the columns hold through a library change, Favourites and a reopen; Reset to default | Pass |
| 2 | Report 25 — Library in the chooser | Pass |
| 3 | Report 9 — the Libraries card folds and is remembered | Pass |
| 4 | Reports 8 and 6 — the Filters pane's height and the larger arrows | **To UAT** (Ben). UAT-DOC-119 is its script. Not seen anywhere: the pane's height in a short window, the foot buttons under a long list, the arrows three levels deep |

**R6's test walk ended 2026-11-27:** three pass, one to UAT. Nothing
was changed in it.

**Limits:**

- **The sort is carried across a library change, not saved.** A new
  visit opens on Modified, newest first; saved views and links still
  do not carry a sort.
- **One set of columns per person**, whatever libraries are ticked.
- **A saved view made before this build opens without Library** (the
  walk's decision).
- **NOTHING of R6 has been seen running.** The Documents screen needs
  SharePoint and cannot be mounted in the harness. The preferences and
  the column rule are unit-tested; every screen behaviour here is
  Ben's test walk.

---

## Appendix — the review record (phases 1 and 2, as it was made)

Kept as the evidence behind the plan: each finding with where it was read, each question with Ben's answer, each decision with what was considered and not taken.

### Triage (phase 1, 2026-11-26)

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

### Findings and decisions, in the order they were made

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

### Cluster F — reviewed 2026-11-26

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

### Cluster C — reviewed 2026-11-26

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

### Reports 21 and 22 — reviewed 2026-11-26

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

### Report 5 — reviewed 2026-11-26

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

### Reports 17 and 11, the document preview — reviewed 2026-11-26

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

### Report 19, UAT-DOC-040 Cancel revision — reviewed 2026-11-26

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

| # | Decision | Option chosen |
|---|---|---|
| 19 | Not a software issue (Ben, 2026-11-26) | The app did what Ben expects: cancelling a revision with nothing checked in returns the document to its last published version. NO record of an aborted start is wanted, and no message is added. The test script UAT-DOC-040 is corrected to describe that case with its own expected result; Holly gets a reply |

### Report 12 — reviewed and decided 2026-11-26

Findings (code read): there is no "on behalf" step — a controller may
press Approve on any document as an admin, and the version's comment
reads "Approved by <the controller>" plus whatever is typed, so the
record names the wrong person unless the controller writes otherwise.
Nothing can be attached to a document's approval: attachments exist
for initiatives and actions only (`attachments/model.ts`); the table's
parent kind and id are text, so a document's evidence needs no schema
change.

| # | Decision | Option chosen |
|---|---|---|
| 12 | Build (Ben's choice 1) | When a controller approves a document they are not a named approver or owner of, the Approve dialog asks "On behalf of" (the document's named approvers and owner) and the comment reads "Approved by A on behalf of B" — MY addition, accepted by Ben. The same dialog has "Attach evidence", one or more files, OFFERED not required, kept in the app's attachment table with that approval (Ben: in the app, not in SharePoint). That version's card in the history shows "📎 Evidence"; ANYONE who can open the history can open the files (Ben's choice 2). App-level: the table is readable in Dataverse. Approvals only; not Review complete or other steps |

### Cluster D — reviewed and decided 2026-11-26 (the lighter review)

Findings (code read): the Filters pane is a pop-over 400 px wide and at
most 480 px high (`.app-docs-filterpop`, `style.css`), its arrows are
small text characters and only the arrow expands a branch; "Hide
panel" hides the whole left side and nothing folds the Libraries list
alone; the Document tasks panel already groups tasks by type and each
row opens its document.

| # | Decision | Option chosen |
|---|---|---|
| 8 | Build (choice 1) | The Filters pane grows to the height of the window; larger expand arrows; clicking anywhere on a branch's row expands it. Not built: a side panel, a pop-up window |
| 6 | Duplicate of 8 in effect | Covered by 8's larger arrows and whole-row expand |
| 9 | Build (choice 1) | The Libraries card folds to one line, "Libraries, 3 of 4", remembered for the person |
| 10 | Build — BEN'S CHOICE 3, against my recommendation to defer | The Document tasks button opens a larger screen, grouped by type, with QUICK ACTIONS on each task without opening the document: Approve, Review complete, Check in. I told Ben this lets someone approve a document they have not opened, the thing report 17 was decided to prevent; he chose it. Shape still to settle with him |
| 10 | How a quick action runs (Ben's choice 1) | Each quick action opens THE SAME DIALOG as on the document, over the list — so the comment, "On behalf of", "Attach evidence", the Word-lock message and, for a Word file, the "tracked changes do not show" line with "Open in Word" all hold in both places. Rows: Awaiting your approval → Approve, Request revision; Awaiting your review → Review complete; Checked out to you → Check in, Discard; Review due → Mark reviewed; edit-access requests keep their Approve and Decline. Every row keeps "Open". About three days |

### The single items, lighter review — 2026-11-26

| # | Decision | Option chosen |
|---|---|---|
| 3 | Deferred to tranche 5 (Ben's choice 2) | Keyboard entry in the ingestion grid joins tranche 5, beside the type-ahead pickers it shares a pattern with: arrow keys and Tab move between cells, Enter opens a cell, typing narrows the list, arrows choose, Enter applies and moves on. About two days, added to that tranche. The reply points to the spreadsheet round trip as the keyboard-first way that exists today. Finding: by design — a cell opens on a click and the grid has no keyboard road (`docs/ingestionScreen.ts`) |
| 20 | Build — a redesign Ben asked for in place of my four options | **One list of measures on a priority, one way to add to it.** Today three sources decide a priority's metrics (its own; a starred primary initiative's starred metrics, which take over; metrics ticked from its initiatives when there is no primary) and the tab needs a paragraph to explain it (`priorities/lifecycle.ts`, the "metrics" tab). Decided: a single list, "Measures" — what the tile shows and what leads the Objectives tab. "Add measure" = choose one from an initiative (a REFERENCE, never a copy: one set of readings, entered in one place) or create one on this priority (first showing the initiatives' similarly named metrics, so a duplicate is a choice). An empty list shows "No measure set" (Sue's first point). **Starring a primary** no longer takes over: when the list is empty it OFFERS, once, to add the primary's key metrics as ordinary entries (Ben's choice 2); it still gives the Charter and Commentary tabs. **Existing priorities** are carried in as they stand on the day (Ben's choice 1): own metrics unchanged, ticked ones as references, a primary's starred metrics as ordinary entries — after that a change of stars on the initiative does not change the priority. A referenced metric its initiative later deletes shows "No longer on its initiative" until removed. Reverses the 2026-11-16 ticked objectives and "the primary's starred metrics take over". No schema change. Two to three days. NOT built: requiring a metric to save a priority; a separate roll-up beside the value driver tree |
| 24 | Build (choice 1) | The chart's axis starts at the first reading, with one empty period before it; no setting. Applies to the Metrics card's trend chart and the small charts in tiles. Finding: the chart opens on a fixed span for its cadence (five periods for a yearly metric) and never starts later than that (`chartWindow`, `improvement/readWindow.ts`). Not built: a "Show from" year per metric |
| 29 | Not a software issue (Ben's choice 1) | A reply: in Documents, ⋮ → "Copy view link" gives a link that opens the app on the Documents tab with that view; bookmark it. Finding: the app opens on its first tab and does not remember the last one (`screens/hub.ts`). NOT built: remembering the last tab (my recommendation, not taken); a plain tab link |
| 30 | Not a software issue (Ben's choice 1) | A reply: the two statuses are different steps. "Awaiting Approval" = with the named approvers, who endorse first; "Awaiting Owner Approval" = the owner's final sign-off (`docs/model.ts`, Ben's decision of 2026-08-04). NOT done: renaming the first status in the term set; merging the two |
