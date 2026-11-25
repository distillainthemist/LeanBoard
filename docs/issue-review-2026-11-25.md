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
