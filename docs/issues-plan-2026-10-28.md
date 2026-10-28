# Issue round 2026-10-28 — findings and plan

Source: the issues export of 2026-10-28 23:38 UTC (6 reports: Ben ×2,
Ellen ×4). Analysed 2026-10-29 against v0.81.0 with the five embedded
screenshots. Ellen's first report was filed on the v0.77 build; the
rest on v0.80.

| # | Report | Cause | Rectification | Effort | Status |
|---|---|---|---|---|---|
| 1 | Document tasks: the request's details only show after pressing Approve; open into a larger pane (Ellen) | The edit-access request row is built for a 380 px popover: the document name is one ellipsised line, the requester and reason are one small hint line beside two buttons — "Ellen UAT t…" / "Stojakovic, Kat (RTA) · hey". The full reason first appears in the Approve dialog. | The panel widens to 520 px while it holds requests. A request row becomes a small card: the document name wrapped in full, "<who> asked <when>" on its own line, the reason in full (wrapped), the libraries' name, then Approve… / Decline… and "Open document" beneath — nothing is read for the first time inside a decision dialog. The other task groups keep their one-line rows. | 0.8 h | Built — request cards, 520 px panel, Open document |
| 2 | Metrics trend: a monthly metric should show a full year as a minimum; scale the other cadences appropriately (Ben) | The KPI trend chart places readings by INDEX, evenly spaced from the first to the last: two monthly points fill the whole width ("10 01 … 11 01" in the screenshot), and gaps between readings do not show. | The x axis becomes time: the window floor follows the card's cadence — daily 4 weeks, weekly 13 weeks, monthly 12 months, annually 5 years (today's `windowDaysForCadence` values, annual raised from 1000 days) — ending at the later of the last reading and the current period, starting at the earlier of the first reading and the window's start. Readings sit at their dates (a missed month shows as a gap), ticks are the cadence's periods (month initials for monthly, week starts for weekly, years for annual), and plan / forecast / limit labels keep their place at the right edge. The category (state) trend gets the same axis. A card with more history than the floor shows all of it, as now. | 2 h | Built — `trendWindow` / `trendTickLabel` in shared/schema/buckets.ts, both charts on the time axis |
| 3 | In-app management of document controllers and owners & approvers: super admins add to the controllers group (which also makes them an owner of the owners & approvers group); controllers add/remove owners & approvers (Ben) | Today both groups are picked in Settings → Documents → Access control and their membership is managed in Entra. The Graph road exists already: the access-control group's roster sync and the health report's "Add X to the group" write members and owners through the Office 365 Groups connector under the signed-in person's delegated rights — a group OWNER may manage its membership with no directory role. | Each group row in Settings → Documents → Access control gains "Members…": a dialog listing the group's user members (name, mail), "Add from the directory…" (the directory search, as the site admins' add), and Remove on each row (`confirmRemoval`). Rights: Document controllers — super admins only; Owners & approvers — super admins and document controllers. Adding to the controllers group also makes the person an OWNER of the owners & approvers group (so they can manage it); removing from the controllers group takes that ownership away, with the last-owner guard. The signed-in person must OWN the group in Entra for Graph to accept the write — the dialog checks `isGroupOwner` first and, when not, says so and names the group ("You are not an owner of this group in Entra — an owner adds you, or a super admin adds you to Document controllers"). The gates' caches are invalidated on every change so pickers and the health report see it at once. | 3 h | Built — `docs/groupMembers.ts`; Members… on both rows in Settings → Access control (super admins), "Owners & approvers group…" in the register kebab (controllers); a controller added is member AND owner of the pool (Ben) |
| 4 | Ingestion grid: changing Status from Draft fails with "This library has no editable columns configured." (Ellen) | A regression from v0.79.0's "status is not a form field" rule: `buildFieldEditors` now skips the status column unless asked (`includeStatus`), and the ingestion screen's three editors — the grid cell, "Set for selected…" and the task defaults — were not asked. The grid still shows the Status column (issue 25, 2026-10-19: a legacy batch lands as Superseded / Approved / Draft), but its editor builds empty. | The three ingestion editors pass `includeStatus: true` — ingestion is the one place a status is set by hand, because the documents arrive with their history. An import-gate rule keeps it: every `buildFieldEditors` call in `ingestionScreen.ts` must carry `includeStatus: true`. | 0.3 h | Built — `includeStatus: true` ×3, import-gate rule D |
| 5 | Ingestion task set-up: no way to set the Status in Task defaults (Ellen) | The same regression as 4: the "Status" section heading paints (the destination type's sections) but the status editor under it was skipped, so the heading sits alone above Approval date. | Fixed by 4. | 0 | Built (with 4) |
| 6 | Rename the ingestion sheet's "Close task…" — Ellen nearly closed the task when she meant to close the window (Ellen) | "Close task…" sits in the header beside Run ingestion… and the ✕; "close" reads as "close this window". (It does confirm first, with the file count, so a click could not have ended the task — but the word is wrong.) | The button reads "End task…" (tooltip "The batch is complete: the folder goes, the task keeps its log and leaves Ingestion tasks"); the confirm reads "End the task “…”?" / "End task"; the run-finished line says "End task when the batch is complete"; the ✕ tooltip reads "Close this window — the task stays open". "Cancel" is not used: the action completes the task, it does not abandon it. | 0.3 h | Built — "End task…" (Ben) |

## Order (proposed)

1. **Ingestion status** — 4, 5 (a regression; blocks Ellen's batch).
2. **End task wording** — 6.
3. **Document tasks request cards** — 1.
4. **Metric trend axis** — 2 (`controls/` touched → root typecheck).
5. **Group membership in the app** — 3 (the largest; its own UAT cases).

About 6.5 h. All app-only; no schema change. UAT: DOC-062/063/065
(status in the grid and defaults, End task), DOC-048 (the request
card), a new Settings case for Members…, and a Priorities case for
the axis window.

## Built (2026-10-29)

Ben's answers: the floors as proposed; a controller becomes a member
AND an owner of the owners & approvers group; "End task…". UAT:
DOC-044, DOC-062, DOC-063, DOC-068 updated; DOC-086, SET-002 and
RIT-001 (a new `docs/uat/rituals.md`) added.

## Questions for Ben (answered 2026-10-29)

- 2: the floors — daily 4 weeks, weekly 13 weeks, monthly 12 months,
  annually 5 years. Any other?
- 3: should a person added to Document controllers ALSO be added as
  a MEMBER of the owners & approvers group (so they can be named
  owner/approver), or owner of it only?
- 6: "End task…" — or another word?
