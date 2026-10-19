# Issue round of 2026-10-18 — findings and decisions (2026-10-19)

Source: `leanboard-issues-2026-10-18.pdf` (38 issues, exported from
Settings → Issues on v0.73.1). Investigated against main at v0.73.2.
Decisions are Ben's, taken one issue at a time on 2026-10-19. Effort is
app work in hours; "SC" = the change carries schema (a solution-carrying
release).

## Status of each issue

| # | Issue | Finding | Decision | Effort |
|---|---|---|---|---|
| 1 | Health report: no next review date | BUG — `healthReport.ts:132` resolves role `"review"`; the role is `nextReviewDate`, so every library falls back to the site column. Same site-only weakness in the task sweep, mark-reviewed gate and date resolver. | Fix the key; pure, tested role resolver validated against COLUMN_ROLES; per-library resolution in the three other sites; "review date unreadable" as its own finding. | 3 |
| 2 | Unable to add tag | A9 single-select FIXED v0.65.0 (Ellen to retest). Remaining: proposal queue only in super-admin Settings; approve neither notifies nor applies; readers cannot propose; controller lookup fails closed silently; duplicate `tags` role. | Tell Ellen; "Tag proposals (n)" on the register's Action-needed menu for controllers; Teams card to the proposer on approve; "Suggest a tag…" in the overlay for readers; store list+item on the proposal and APPLY on approve (SC); surface the lookup failure; drop the duplicate role. | 14 SC |
| 3 | Visibility of linked/tagged documents | Person filters, "Has linked documents" and tag filters exist; "linked to THIS document" lives only in the overlay; no links count column. | Overlay "Show these in the register" (id filter + chip "Linked to: …") and a "Linked documents" count column. CSV report parked until asked. | 6 |
| 4 | Reviewer request confirmation; three drafts | "✓ Done." is ambiguous and notification optional; no stated or enforced review gate; three drafts are expected (one minor check-in per command / bracket write). | Stage-specific done lines; the sentence on the decision card; "Review complete" command for named reviewers; warn-and-confirm gate on Submit for approval until reviewers complete; Submit for review auto-sends the reviewers' card; "Check in and submit for review" in one step. | 12 |
| 5, 6 | Modify a view; show the active view | BUILT v0.65.0: Kebab → Saved views → Update "name"; the title shows the view. | Reply to Holly. Build: rename, ✓ on the active view, "edited" marker, "View ·" title prefix; AND shared site views curated by controllers (new store on the docs config). | 13 |
| 7, 15 | Version history error (403) | Permission: the versions endpoint needs View Versions; Bell Bay readers are on Restricted View (Ben confirmed). v0.65 message exists; no data fallback. | Read View Versions + Open Items bits for every register library up front; fallback "Current version vX · status · date · by" from the list feed (needs `_UIVersionString`, see 19); widen the refusal match. Site decision on Read vs Restricted View stays with Ben. | with 14 |
| 8 | Owner not in owners group | Health finding exists (controllers); Approve is still offered by email alone and fails at check-out. | Per-row "Add to group" + prefilled "Replace…"; overlay guard "named owner but not in the group — ask a controller"; CSV column. | 6 |
| 9 | Reviewer list | FIXED v0.65.0 (pool first, then directory). | Close; list controllers up front ("Document controller"); Replace a person uses the reviewer source for reviewer-only swaps. | 2 |
| 10 | Management of change column | URL column type unsupported (cookbook Recipe 3 wrong). | A "Management of change" ROLE on a JSON Note column, list of {ref, url, title?, date?}, editor like the links editor, chips in register/overlay; ingestion may REQUIRE it per destination type. Correct Recipe 3. | 5 |
| 11 | Roles leave the business | Health + Replace exist (C1). BUG: `directoryProfile` turns every error into "not found" → false "left" findings. | Three-state lookup (found/absent/error) with retry by email; per-row "Replace…"; reviewer source; raise/page the caps; controllers' Teams digest. | 8 |
| 12 | Department order in the Folders pane | API order; app order lives in Dataverse (site order number, departments/areas array order). | Rank siblings via `termBindings` → app path order (label fallback), unranked last; same order for the Organisation filter pills. No term-store write. | 4 |
| 13 | Filters return nothing for parent terms | Label-match CAML over the subtree the WALK reached; filter walks capped at 4 levels / 60 requests, truncated silently and CACHED; term filters sent to libraries lacking the column (refused). | Match by term id (hidden note field) or a single `<In>`; sync-sized chunked walk, budget in the cache key, never store a truncated walk, "vocabulary partially loaded"; per-feed carried check; term DESCRIPTIONS read in the walk and shown as tooltips (Ben adds criticality descriptions). Hosted probe of the CAML form. "Procedure" rename = Ben in the term manager. | 14 |
| 14 | Documents not opening (Bell Bay) | Restricted View lacks Open Items → every download road refused; no message. | ONE permission-aware change with 7/15: Office → SharePoint's Doc.aspx viewer, PDF → embed viewer (hosted check), hide Download as PDF, "view-only access" message, map the drive 403. | 11 (7/14/15) |
| 16 | Translation | None exists; ~4–5k strings. | PARKED (as told to Johanne); estimate recorded: scaffolding 12–16 h, extraction 80–120 h + translation. | — |
| 17 | Drill down in folders | Links card lists one level (sub-folders = links out); Documents Folders pane 276px, walk 4/60, labels ellipsed. | Card: expandable folder rows, indent, wrapping names. Pane: deeper walk with the sync budget, "deepest levels not loaded", DRAG-RESIZABLE width remembered in uiState, wrapped labels, smaller carets at depth. | 8 |
| 18 | One-click print | No print action; blob preview for PDFs, cross-origin transform for Office. | Print button in the overlay header: fetch rendition → hidden same-origin frame → print; fallback "open to print" in a new tab; hidden for view-only users. A4 stays a printer setting. Hosted check of the player frame. | 3 |
| 19 | Version number column | `_UIVersionString` excluded from the chooser AND dropped by the feed parser. | Built-in "Version" pseudo-column: chooser, always requested, allow-listed, "v3.0" cell, CSV, local sort. | 3 |
| 20 | Document ID before the title | Document column pinned first; no chooser entry. | Option (a): a movable "Document" entry in the chooser (default first); phone and CSV keep their order. | 4 |
| 21 | Exit Favourites | Only the nav row toggles out. | "← Back to libraries" button in the title row while in favourites. | 1.5 |
| 22 | Restrict non-approved visibility | Chip + pills open to everyone; links/views carry nonCurrent. | The old "Show only approved" TOGGLE back in the kebab, ticked by default for everyone: ticked = approved only, no status chip/pills; unticked = status filter available again; state rides with views and links. No open-road suppression, no permission break. | 4 |
| 23 | Flag documents for review | Nothing exists; a column-based design would need check-in. | A SEPARATE Dataverse table of document flags (SC): any reader flags from the overlay (level, comment, screenshot); ingestion sheet flags per file (re-pointed on landing); review LEVELS = app-managed list in Settings → Documents; OWNERS notified on each flag; open flags in Document tasks, overlay chip, register column/filter, health; controllers triage in Action-needed + Settings; Mark reviewed offers to close them. | 14 SC |
| 24 | Document traveller | Roles exist, ledger parked in Aug; no bot for card buttons → ack via deep link. | PARKED — needs design (minimum design recorded: ack ledger + distribution tables, distribute-on-approve, ack mode in the kiosk viewer, "Acknowledged x of y", reminders; 30–45 h SC). | — |
| 25 | Approval status column | Register: chooser offers it but `registerCells.ts:273` DROPS status under 560px. Ingestion: status excluded, run always Approved 1.0; BUG role key `"organisation"` (is `orgUnit`). | Register: never drop chosen columns — horizontal SCROLL with the Document column frozen (as the ingestion grid). Ingestion: per-file Status column, run honours Approved / Draft / Superseded / Obsolete (legacy history). Fix the role key. | 10 |
| 26 | Edit an ingestion task | BUG: `ingestionScreen.ts:466-478` reopens the sheet with the STALE task; Run/Close then save it back and REVERT the edits; create-without-id path; directory-only picker with no feedback. | Reopen with the saved task; Run/Close re-read by id; throw on create without id; refuse duplicate name/folder; picker = roster/pool first + directory, with searching/no-match/error states and a generation guard. Group chat stays. | 4 |
| 27 | Priorities default to Weipa | `lastOrg` persisted on EVERY render beats the person's site; exact-case site match; unvalidated lastOrg. | ALWAYS open at the person's site (card org / shared link still win); last org remembered within the session only, validated; case-insensitive site. | 2 |
| 28 | Template board "not created" until reload | BUG: `ensureTemplateBoard` upserts without `writing("boards")` → cached miss. | Route through `writing()`; designer retries once; test. | 1 |
| 29 | Documents card left off a new initiative | Mandatory-only copy (`boardLayout.ts:30-39`); unrelated to the working folder. | Option (i): copy EVERY template card; mandatory = cannot be deleted; reset follows. | 3 |
| 30 | "No initiatives running on this template" | BUG: `templateWizard.ts:157` `usage = 0` hard-coded; Delete checks nothing. | Count from `listInitiatives()` in the wizard and the list; REFUSE Delete while any initiative uses the template. | 1.5 |
| 31 | Changing my site needs a refresh | `upsertPerson` bypasses `writing("people")`; no event; hub cache, accent, roster cache stale. | `writing()`, a profile-changed event (hub cache clear, accent re-apply, roster topic), GO HOME after save. | 3 |
| 32 | Priority popup initiatives | Rows lack the kebab; Metrics mounted `readOnly: true`; CSS: left column without min-height 0 + fixed card height → clipped. | Shared row-menu module (same FIVE actions); Metrics mounted with the Commentary role check; grid/min-height fix, card fills, metric rows min height. | 7 |
| 33, 35 | Filter popover: "Has tags", spacing; search loses focus | All confirmed: role predicate; people-search style on the term search box; `paintPop()` rebuilds the body so the input dies and the refocus runs before the promise creates it. | Drop "Has tags" (group → "Linked documents"); own style for the term search box; repaint only the column's pills / the group; keep scroll. | 4 |
| 34 | Issue status change collapses the item | My 2026-10-12 `refreshList()` rebuilds the list; open state lives in the row. | Remember open ids; update the row and thread in place on status change; dim with "leaves this list on Refresh"; keep rows during rebuild; restore scroll. | 3 |
| 36 | Stage description | Not built; stages = id/name/pdca/weeks/gate; initiatives hold a copy. | Optional description per stage in the wizard; shown in the band tooltip AND under the current stage in Details, read live from the template with the copy as fallback. App-only. | 6 |
| 37 | Changing the year | Only in the kebab's Period section; header text not clickable. | Header control ‹ FY26 ▾ ›, accent pill, "current" badge / "Back to FY26"; ALWAYS open on the current year. | 3 |
| 38 | Issue merge messaging | Messages go to the primary reporter only; child followers not carried. | Audience = reporter + followers + merged-in reporters (dedup, minus the admin), chips in the compose row, "Send to reporters (n)"; ONE CARD PER REPORTER quoting their own report; Decline same; merge copies followers and re-points grandchildren. | 6 |

Total about 190 hours of app work. Two items carry schema (2, 23) and
should share ONE solution-carrying release.

## Progress

- **Tranche A — BUILT 2026-10-19 (dev, unreleased):** 1 (`libRoleInternal`
  in model.ts, tested; the health report, the review-due sweep,
  `canMarkReviewedRow` and `resolveDatesFor` resolve per library;
  `reviewUnreadable` info finding), 28 (`writing("boards")`), 30 (real
  count; Delete refused with a count), 26 (sheet reopens on the saved
  task, `adoptFresh()` before Run / Close, `getIngestionTask`, a create
  without an id throws, duplicate open-task names refused, picker =
  roster first + directory with searching / no-match / error states and
  a generation guard), 27 (`startOrg = card ?? link ?? mySite ?? first`,
  `lastOrg` no longer persisted, case-insensitive site), 31
  (`upsertPerson` through `writing("people")`, `ltk-profile-changed`
  event → hub cache cleared, accent re-applied, priorities roster
  topic; a changed site goes to `#/`), 34 (`openIds`, `statusLanded`
  in place, dimmed "leaves this list on ↻ Refresh", rows kept during a
  rebuild, scroll restored), 33/35 (`paintPills` per column, Has tags
  gone, `.app-docs-fsearch`), 32c (`.app-cp-ov-left { min-height: 0 }`,
  desk rows, `.app-cp-ov-chartercard-scroll` with 240px chart rows), 25
  (every chosen column at every width — `minColumnPx` on the list, the
  header inside the scroller sticky top, the Document column sticky
  left; role key `orgUnit`), 11's lookup bug (`DirectoryProfile.state`
  found / absent / error, retry by email search, "Not checked: n
  lookups failed"), 9 (`controllerMembers()` listed first in
  `reviewerPeopleSource`; `roleReassign` uses it for reviewer-only
  swaps).

- **Tranche B — BUILT 2026-10-19 (dev, unreleased):** 19 (`KEPT_SYSTEM_FIELDS`
  / `VERSION_FIELD` / `versionLabel` in rows.ts; the feed always
  carries `_UIVersionString`, `_ModerationStatus`, `_CheckinComment`;
  chooser entry "Version"; the cell "v3.0", minors muted; CSV), 7/14/15
  (`BasePermissions.open` 0x20 and `.viewVersions` 0x40; perms read for
  EVERY register library; `ViewerOpts.perms`; a view-only reader: Open
  in viewer ↗ = `viewerPageUrl` (Doc.aspx) for Office, embed for PDF,
  page-image preview with the reason, no Download, the kebab's Open
  PDF → Open in viewer; without View Versions no call is made —
  "Current version vX · status · date" from the row, the same on a
  403), 20 (`NAME_SLOT` "__name" draggable in the chooser, always on;
  `buildRegisterColumns` places the Document column at its slot with
  Library beside it), 21 (← Back to libraries in the title row), 22
  (`onlyApproved` is a `let` again: kebab "✓ Show only approved",
  ticked by default; `approvedFilterFor` CAML + suspended under the
  task scope; the status column leaves `filterColumns` while ticked;
  `nonCurrent: !onlyApproved` in views / links; the seeded status chip
  is gone; `approvedLabels` from the lifecycle mapping first), 18
  (18 TRIED AND WITHDRAWN 2026-10-19: inside the player the Office
  rendition's bytes cannot be fetched (CSP), and a PDF blob in a hidden
  frame DOWNLOADS instead of printing; the Print button went and "Open
  in new tab ↗" carries "print from there with Ctrl+P"),
  25 ingestion (status column in the grid, `landing(row)` = grid value
  else Approved; approved / superseded / obsolete = major check-in +
  publish, other stages minor and unpublished; the confirm counts per
  stage; status allowed as a task default).

- **Tranche C — BUILT 2026-10-19 (dev, unreleased):** 13 (the id-match
  CAML was NOT built — unverifiable on this tenant; the label road is
  kept and its real faults fixed: every filter walk uses depth 6 /
  budget 6000 with the budget in both cache keys, a truncated or
  part-failed walk is never stored, the popover and the pane say
  "loaded only partly", `termFiltersFor(carried)` cuts each filter to
  the columns a library carries on the feed, the count and the export
  and SKIPS a library that cannot match (`canMatch`), and the walk
  reads term `descriptions` (retrying without them on a refusal) shown
  as pill tooltips), 12 (`termTreeOrder(nodes, cmp)`; `orgTermCompare`
  ranks by `termBindings` then label path from `orgTreePaths[WithCompany]`,
  for the Folders pane and the Organisation pills), 17 (links card
  sub-folders expand in place with a caret, names wrap; the Documents
  panel has a drag grip, `navWidth` 220–640 in DocUiPrefs, tree labels
  wrap), 3 (viewer "Show these in the register" → `scopeToLinks`:
  uids → item ids via `itemDetails`, the task-scope map with
  `scopeLabel` "Linked to: X"; the links column renders "n links" via
  `linkCount`).

## Order (proposed)

1. **Tranche A — bugs, app-only (≈25 h):** 1, 28, 30, 26, 27, 31, 34, 33/35,
   32c, 25's role key and status drop, 11's lookup bug, 9.
2. **Tranche B — permissions and the register (≈30 h):** 7/14/15 as one
   change, 19, 20, 25 (scroll + ingestion statuses), 22, 21, 18.
3. **Tranche C — filters and panes (≈26 h):** 13, 12, 17, 3.
4. **Tranche D — lifecycle and people (≈45 h):** 4, 8, 11 (digest),
   5/6 (remainder + shared site views), 2 (with its schema), 10.
5. **Tranche E — new function (≈40 h):** 23 (schema, with 2's), 29, 32a/b,
   36, 37, 38.
6. **Parked:** 16 (translation), 24 (document traveller).

## Hosted checks Ben owns

- 13: the CAML form SharePoint accepts for a term-id match on a
  multi-value taxonomy column, and whether a library lacking the column
  refuses the query.
- 14: whether a Restricted View account renders PDFs in the embed
  viewer; the Read vs Restricted View decision for Bell Bay readers.
- 18: whether the player frame allows a print dialog.
- 26: an edited task keeps its assignees through a run.
- 38 and 23: the Teams sends.
