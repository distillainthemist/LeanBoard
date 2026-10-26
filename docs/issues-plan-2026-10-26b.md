# Issue round 2026-10-26 (second export) — findings and plan

Source: the issues export of 2026-10-26 03:23 UTC (7 reports: Ellen
Black ×6, Rebecca Gamble ×1; two from the DMS UAT run) plus Ben's
observation that uploads keep failing on required properties that the
form never clearly marked. Analysed 2026-10-26 against v0.77.0.

| # | Report | Cause | Rectification | Effort | Status |
|---|---|---|---|---|---|
| 0 | Required properties not clearly indicated on upload (Ben) | Two things. (a) The form marks a required column only with a faint " *" after its label, and when one is empty the Add button simply goes grey — nothing names what is missing (the UAT case promises a line; there is none, `sync()` only disables). (b) SharePoint has TWO required flags: the list field's `Required`, which the form reads, and the content type's field link `Required`, set when a column is made required through the content type — the field then reports `Required: false`, the form neither marks nor validates it, and the check-in fails after the upload ("You must fill out all required properties"). v0.77.0's pre-flight reads the field flag only, so it does not catch (b) either. | A visible "Required" tag on the label instead of the asterisk; Add stays clickable and, when something is missing, names it in the line under the button ("Required before Add: Owner, Importance") and scrolls to the first; the library's content types' field links are read and unioned with the field flag (one extra call), so a content-type-required column is marked, validated and pre-flighted like any other; the ingestion grid's ✱ uses the same union. | 1.5 h |  Built — Required tag, click scrolls and names, content-type flag read |
| 1 | Linkage between risk rating and review date not clear (Ellen) | By design, but unexplained: the date model (2026-08-10) derives the review date — Importance → cadence months (site dictionary) → next review = effective date + months — and the edit form HIDES the system-managed dates, so a changed Importance moves a date the form never showed. | Edit properties: a live hint under Importance ("Sets the review cadence — High: every 12 months; next review 17 Aug 2027, from the effective date") and a read-only "Next review date" row marked derived; the details pane's review date gets the same "every N months from the effective date" hint. | 1 h |  Built — hint under Importance, derived row, pane hint |
| 2 | Org shows the department only (Ellen) | SharePoint stores the term's leaf label; the pane shows the value as stored. The full path is already in the app — the Organisation walk the Folders pane paints from. | The details pane shows the path for Organisation and Process area ("Bell Bay › Casting"), looked up from the cached walk by term id/label; the leaf alone when the walk has not loaded. | 0.5 h |  Built — whole path from the cached walk |
| 3 | UAT DOC-068: Message assignees did nothing (Rebecca) | The button sends the Teams card at once — no dialog — and writes the outcome to the status line BELOW the file grid, out of sight on a task with no files; when the viewer is the only assignee the outcome is "You are the assignee — no Teams message", which reads as nothing happening. The UAT step promises "send a note". | A dialog: the recipients (you excluded, with the reason), a note quoted under the card, Send; the outcome shows in the dialog. UAT-DOC-068 rewritten to match. | 1 h |  Built — dialog with recipients, note, outcome |
| 4 | Change records show only the number (Ellen) | The pane renders each MoC record as a chip carrying the ref, with title and date only in the hover title. | One row per record: ref (linking out) · title · date, in the pane; the chips stay in the register cell. | 0.5 h |  Built — one row per record |
| 5 | Linked docs: no way back (Ellen) | Opening a link SWITCHES the viewer to the target ("never stack") and forgets where it came from. | A trail: the register keeps the rows opened through links (bounded); the viewer header shows "‹ Back to <name>" when there is one; Esc still closes. | 1 h |  Built — trail with ‹ Back to |
| 6 | UAT DOC-030: cannot save two links, "limit of characters" (Ellen) | The screenshot carries SharePoint's exact refusal: "DMSLinkedDocuments: This field can have no more than 255 characters." — the single-line text validator, which a multiple-lines-of-text column never raises. Ben: the site column is multiple lines of text. So the LIBRARY's copy of the column on the UAT site still behaves as single-line (a site column changed after the library took it, without the change pushed to lists; or a library-level column created separately). Links are JSON, ~150–250 characters each: one fits in 255, two do not. | Site check (Ben): the column's type on the library itself, and whether two columns share the display name. In the app: Settings → Documents shows each mapped column's live type and warns when the linked-documents column is single-line; the links editor refuses before writing ("This library's Linked documents column is single-line text (255 characters) — one link at most; a document controller changes it to multiple lines of text"); the deploy guide names the type. | 1 h + site check |  Built — guard + warnings + deploy note; library column is Ben's check |
| 7 | Loading icon for Document tasks (Ellen) | The button paints "Document tasks" with no count until the tasks query resolves (fired at the mount tail, after the status vocabulary) — on production that is several calls, and the button looks final meanwhile. | The button shows "Document tasks · …" with the app's small spinner while the count is pending (title "Counting…"); the Ingestion tasks button likewise appears with the spinner when the remembered count was non-zero. | 0.5 h |  Built — counting spinner on the button |

## Order (proposed)

1. **Required properties** — 0 (Ben's), with the content-type flag.
2. **Links** — 6 (guard + warning + deploy note; the column change is a
   site step), 5 (Back).
3. **Explanations in the pane and the form** — 1, 2, 4.
4. **Ingestion message dialog** — 3.
5. **Loading state** — 7.

About 7.5 h. All app-only; no schema change.

## Built (2026-10-26)

All eight items are in the app build of 2026-10-26 (next release,
app-only). UAT cases touched: DOC-018, 023, 025, 027, 029, 030, 068
and the tasks button line. Ben: Add scrolls to the first missing
field; the UAT library's Linked documents column is his check.

## Questions for Ben

- 6: Ben reports the site column as multiple lines of text; the
  library's own column on the UAT site is what refused (single-line
  validator). Ben checks the library's column.
- 0: should Add stay disabled until the required fields are filled
  (as now, with the line naming them), or enabled with the click
  scrolling to the first missing field? Proposed: enabled.
