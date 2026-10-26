# Issue round 2026-10-26 (fourth export) — findings and plan

Source: the issues export of 2026-10-26 19:57 UTC (6 reports: Ben ×2,
Ellen ×4; five from the DMS UAT run) plus Ben's request for a full
UAT report export. Analysed 2026-10-27 against v0.79.0 with the five
embedded screenshots. Three of Ellen's reports were filed on the
v0.77 build before the fixes they describe shipped.

| # | Report | Cause | Rectification | Effort | Status |
|---|---|---|---|---|---|
| 1 | UAT DOC-014: site views still fail; the view title stays once loaded, whatever is cleared or clicked (Ben) | Two things. (a) The screenshot shows v0.77's fallback catching the real fault: "Cannot access 'Uo' before initialization" — a temporal dead zone. The title painter asks "has the view drifted?" which calls `currentView()`, a `const` declared thousands of lines later; with no view the branch never runs, with a booted view the first paint hits it before the declaration executes, every time. (b) By the B4 design (2026-10-06) a saved view IS the title and stays so, with "· edited" once the filters drift — which reads as the title never changing. | (a) `currentView` becomes a hoisted function; a boot-with-view smoke test guards the module against the next one (a static check in the import gate: no `const` arrow used by the title painter is declared after it). (b) When the filters or scope drift from the saved view, the title returns to the scope ("UAT Library", "Casting — UAT Library") and the crumb reads "from the view “X” · edited"; the Views menu still offers "Update “X”" and "Close “X”". | 1.5 h |  Built — currentView hoisted, drift guarded; the title follows the scope on drift (Ben: "view names the title only") |
| 2 | UAT DOC-041: Supersede did not ask for the successor (Ben) | By design in v1 of retirement: "the reason names the successor" — a typed reason, no link, and the UAT case expects a link. | Supersede gains a successor picker (the links editor's search across the standards libraries, required): the superseded document gets a "Superseded by" link (new relationship `supersededBy`, inverse voice "supersedes this" on the successor's pane) written in the same check-out bracket as the status, and the comment reads "Superseded by “<name>”". | 1.5 h |  Built — successor picker, "Superseded by" link + inverse "Supersedes" |
| 3 | UAT DOC-030: character limit with two links (Ellen, v0.77 build) | The same refusal as before (`DMSLinkedDocuments: This field can have no more than 255 characters`), filed before v0.78's warning and guard shipped. The library's own column is still answering as single-line text. | No new code. Retest on v0.79: Settings → Documents → Document columns shows the live type of the Linked documents column on that library; the editor warns and refuses before writing. Ben checks the library column. | 0 |  Retest on v0.79+ — Settings shows the column type |
| 4 | UAT DOC-031: minor versions and comments not captured (Ellen, v0.77 build) | Filed before the UAT library's versioning was corrected (majors only) and before v0.79's comment-carrying publish. The screenshot is the all-majors history. | No new code. Retest on v0.79 with the corrected library. | 0 |  Retest on v0.79+ with the corrected library |
| 5 | UAT DOC-032: Replace content wiped the properties, including the owner (Ellen) | Worse than a blanking. The replace was a server-side copy OVER the held file, and BOTH copy roads the app can drive (the legacy copyto with overwrite and the modern MoveCopyUtil.CopyFileByPath with overwrite) DELETE and RECREATE the list item: new id, new uniqueId, every property blanked, and the file no longer answering at its path ("Item does not exist", "File Not Found" — Ben's runs, 2026-10-27). Every link, favourite, flag and request anchored to the document would be orphaned. File bytes cannot cross the connector (the 4A probes), so no in-place content write exists for the app. | The copy-based replace is WITHDRAWN. "Replace content…" becomes a guided step through SharePoint's own upload-and-replace, which keeps the record and adds a version: the dialog opens the document's folder, says to upload the file with the same name and choose Replace, then "Done — refresh the document" and Check in with a comment. | 1 h | Built — IN PLACE through the connector's Update file (bytes declared binary; the 4A verdict corrected — `docs/replace-content-review-2026-10-27.md`); the copy roads withdrawn; SharePoint's own replace as the second road |
| 6 | Check-in: say the comment is not optional (Ellen) | The Comment label is plain; the button simply stays grey until something is typed. | The label carries the "Required" tag (the forms' word since v0.78) and a line under the box: "A comment is required — it is the version's audit entry." | 0.2 h |  Built — Required tag + line |
| 7 | A full UAT report export (Ben) | Today's "Export PDF" is a summary: the run's facts, progress by persona and tester, the fails and blocks with issue ids, and one line per case. | A second export, "Export full report": the summary first, then every case in journey order with its FULL script (persona, preconditions, steps, expected), every result recorded for it by every tester (not only the latest), each tester's note, and the issues raised from it with their title, kind, area and CURRENT status — so a closed run reads end to end. A case whose script changed since the run snapshot says so. | 1.5 h |  Built — "Export full report" with scripts, every result, issues with thread and attachments (Ben: carry both) |

## Order (proposed)

1. **Views** — 1 (the dead zone and the title).
2. **Replace content** — 5 (data loss).
3. **Supersede** — 2.
4. **Check-in label** — 6.
5. **UAT full report** — 7.
6. **Retests** — 3, 4 (no code).

About 6 h. All app-only; no schema change.

## Built (2026-10-27)

Ben's answers: the view names the title only while the register
matches it; the full report carries each issue's thread and
attachments. Also added at Ben's request: Journey 13 in
`docs/uat/documents.md` — four END-TO-END cases run by several people
(persona "team"): a reader's revision from request to publication,
a revision sent back and approved, a reader's flag acted on by the
owner, and a supersede with a successor seen by everyone.

## Questions for Ben

- 1(b): the title leaving the view on drift is the opposite of the
  2026-10-06 decision (a saved view IS the title). Confirm the new
  rule: the view names the title only while the register still
  matches it.
- 7: anything else the full report should carry — the thread of each
  issue, or attachments? (Both are in the issues export already; the
  report would reference the issue ids.)
