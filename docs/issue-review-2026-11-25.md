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
| 1 | 42db6c12-91e8-f111-84e9-7ced8da2c4f3 | Priority transition | Design gap | Build | Merge rule and a year-change panel, pillars and sub-pillars | A year change is row by row, cannot express a merge, and can be left half done | R2 | Planned |
| 2 | a51354a0-8fe8-f111-84e9-7c1e528a7790 | Adding pillars | Defect | Build | The new row gets the cursor; the page stays put | The cursor went to the last sub-pillar in the whole list | R2 | Planned |
| 3 | 9a809e66-88e8-f111-84e9-7c1e528a7790 | Ingestion task - use keyboard not mouse for data entry | Enhancement | Defer | Keyboard entry in the ingestion grid joins tranche 5 | Belongs with the type-ahead pickers; the spreadsheet round trip serves today | Tranche 5 | Planned |
| 4 | ff668fcd-87e8-f111-84e9-7c1e528a7790 | Custom columms reset | Defect | Build | The chosen columns are the person's, kept across library changes and visits | A library change rebuilt the screen without the view; columns were never saved for the person | R6 | Planned |
| 5 | ee83abdd-86e8-f111-84e7-6045bdc41cd5 | Metal Delivery process areas incorrect | Not software? | Build + non-software | Terms read by id, never guessed by name; BSL tree repaired by Ben | The ingestion grid resolved a saved term by name alone; BSL's tree holds duplicates from the v0.83 copy | R1, then repair after R4 | Planned |
| 6 | 2c7da473-86e8-f111-84e9-7c1e528a7790 | Larger arrows to expand filter menus | Enhancement | Build | Covered by 8: larger arrows, whole-row expand | Arrows are small text and only the arrow expands | R6 | Planned |
| 7 | 76457348-86e8-f111-84e9-7c1e528a7790 | Default select all three doc libraries | Design gap | Non-software + small build | A reply; a tooltip on a library's name | The app remembers the last selection; a click on a name selects that library alone | R6 | Planned |
| 8 | ced74718-86e8-f111-84e9-7ced8da2c4f3 | Filter pane is small | Design gap | Build | Full-height Filters pane, larger arrows, whole-row expand | The pane is a small pop-over | R6 | Planned |
| 9 | c3476cd8-85e8-f111-84e7-6045bdc41cd5 | Condense libraries panel | Enhancement | Build | The Libraries card folds to one line | Nothing folds the Libraries list alone | R6 | Planned |
| 10 | 8b7517b2-85e8-f111-84e7-6045bdc41cd5 | Document tasks dashboard | New | Build | Document tasks as a larger screen with quick actions that open the same dialogs | Ben's choice, against a recommendation to defer | R4 | Planned |
| 11 | 44bce45a-83e8-f111-84e9-7ced8da2c4f3 | Documents open at the bottom | Defect | Build (a try) | The preview asks the PDF viewer for page 1 | Cause not found; cheap to try | R1 | Planned |
| 12 | e989517a-72e8-f111-84e9-6045bdc4133d | Evidence attachments for approvals on behalf | Enhancement | Build | "On behalf of" and "Attach evidence" in the Approve dialog | The record named the controller and held no proof | R4 | Planned |
| 13 | 89b02c2d-5ae8-f111-84e7-6045bdc41cd5 | Reviews not marking as complete | Defect | Build | The review check uses the history's three-place read | The review check read comments from one place; the history reads three | R1 | Planned |
| 14 | 549f68b2-59e8-f111-84e7-6045bdc41cd5 | Completion of review | Design gap | Build | Any step refused by Word's lock says so | Word's lock on an open file, read as an app fault | R1 | Planned |
| 15 | 442001a1-54e8-f111-84e9-7c1e528a7790 | Review status not updating | Defect | Duplicate of 13 | Follows 13; its message is the hand-over rule | Same fault, plus a message that waited for a second press | R1 | Planned |
| 16 | 2f2da526-54e8-f111-84e9-6045bdc4133d | I declined an edit request and now the document is checked out to me | Defect | Build | A failed step releases the check-out it took | A refused step stopped with the check-out held | R1 | Planned |
| 17 | f74814d4-53e8-f111-84e7-6045bdc41cd5 | Tracked changes are not showing for the approver | Design gap | Build | A line and an "Open in Word" button on the review and approval card | The preview is a PDF with tracked changes applied | R1 | Planned |
| 18 | ceda461a-53e8-f111-84e9-70a8a5567eb6 | Message not sent to reviewer | Defect | Build | Every hand-over step sends its Teams card at once; added reviewers included | The plan was empty when the document had no reviewers before the dialog | R1 | Planned |
| 19 | 999d4611-47e8-f111-84e9-6045bdc4133d | UAT DOC-040: Cancel a revision | Defect? | Non-software | UAT-DOC-040 corrected; a reply | The app did the right thing; the script did not describe the case | R1 | Planned |
| 20 | b7667d42-d0e7-f111-84e9-7c1e528a7790 | Priority-Level Metrics and Initiative Roll-Up | Enhancement | Build | One list of measures on a priority | Three sources decided a priority's metrics; duplicates were possible | R5 | Planned |
| 21 | e2732115-cfe7-f111-84e9-7ced8da2c4f3 | Action Phase Not Reflecting in Workflow Columns | Design gap | Build | The kanban column comes from the PDCA state; new actions start at Plan; a "By PDCA state" view | Two separate states on an action, set in different places | R5 | Planned |
| 22 | 961b76b8-cee7-f111-84e9-6045bdc4133d | Department Filtering Across Initiatives and Actions | Design gap | Build | The priority popup follows "Also shown in" | The popup listed every initiative whatever org was in view | R5 | Planned |
| 23 | 11725f58-c4e7-f111-84e9-7c1e528a789c | Rolling over priority initiative to continue into another year fault | Defect | Build | "Extend" and "Complete" on a tile past its planned end; the form fixed | No direct step; a changed start year blanked the sub-pillar | R2 | Planned |
| 24 | e8853a1a-c1e7-f111-84e9-7ced8da2c4f3 | Metrics timeframe (dates selection) | Enhancement | Build | The chart's axis starts at the first reading | The chart opened on a fixed span | R5 | Planned |
| 25 | 8674251b-bee7-f111-84e9-7ced8da2c4f3 | Library column keeps appearing | Design gap | Build | Library is an ordinary column in the chooser | The register added it and the chooser could not remove it | R6 | Planned |
| 26 | 79d69ea6-bde7-f111-84e9-7c1e528a7790 | Custom columns disappear | Defect | Duplicate of 4 | Same fault, same fix | — | R6 | Planned |
| 27 | 8dafc340-94e7-f111-84e9-6045bdc4133d | Doc status update | Not software | Decline | Status changes go through the existing commands | Ben: use the existing workflows | — | Planned |
| 28 | 5bcf3b53-92e7-f111-84e7-6045bdc41cd5 | Updating doc properties | Design gap | Build | Controller commands: Rename, Correct approval date | No rename existed; a wrong approval date from ingestion had no remedy | R4 | Planned |
| 29 | 83cffed5-8ce7-f111-84e9-7c1e528a7790 | Can we have a link to directly open the Documents tab | Enhancement | Non-software | A reply: bookmark a view link | "Copy view link" already opens on Documents | — | Planned |
| 30 | bd8489ab-8be7-f111-84e9-7c1e528a7790 | Status filter - remove Awaiting Owner Approval | Not software | Non-software | A reply: two different steps | The statuses are distinct by design | — | Planned |
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
| 3 | Deferred: keyboard entry in the ingestion grid belongs with tranche 5's type-ahead pickers | Tranche 5's walk |
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

### R1 as built (2026-11-26, on dev, NOT released)

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
  rendition, which is the very thing that hides the changes. Whether
  Word's viewing mode shows tracked markup to an approver has not been
  seen; if it does not, the address changes to Word's editing view.
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
