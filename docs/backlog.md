# LeanBoard backlog

The decisions of record for everything not yet built. Each item carries
its decision date and enough context to pick it up cold. The phase plans
(`leanboard-phase5-plan.md`, `leanboard-standard-documents-plan.md`)
stay the design detail; this is the queue.

## The working set (Ben, 2026-11-22)

Ben went through this whole file as a checklist and marked 50 items to
be worked on now. Their order, sizes and the questions each one waits
on are in `backlog-programme-2026-11-22.md`, in eight tranches
(roughly 190–270 hours; one item, hardened confidential actions, is
schema-carrying). The items stay listed in their sections below until
they are built. **Tranche 1 was RELEASED in v0.99.0 (2026-11-23)**:
thirteen small fixes — its "As built" section in the programme lists
them and Ben's test walk.

**Tranche 1A was RELEASED in v0.99.0 (2026-11-23)** — its "As built"
section is in `issues-plan-2026-11-23.md`. Ben's test walk (2026-11-23,
the plan's last section): A, B, D, F, G and H pass on dev; C, E, I and
J go to UAT unseen running. A walk finding fixed the same day: each
lifecycle command asks its own reason question.

**Tranche 2 is built and on dev (2026-11-24), not released.** Walked
with Ben item by item (the programme's "Walked with Ben" section): six
built — C1 (a cascaded priority's own actions and metrics count
upward), C6 (who pressed a sign-off), C8 (a removed metric takes its
readings), D10 (calendar year is the only period), E17 part 2 (gate
snapshots read reverted / superseded), G8 (a shared ritual seen, not
changed) — and five off the backlog with nothing built: C5, D7, D8, E5,
E17 part 1. As built: the programme's "Tranche 2" section. Next: Ben's
test walk of tranche 2, then tranche 3's walk.
What 1A was: the nine reports of the 2026-11-23 issue export
(`issues-plan-2026-11-23.md`): Teams group messages refused over a
colon in the chat topic, Replace content's false "landed wrong" on
Office files, a reviewer still offered "Review complete", Cancel
revision's comment, a clearer notice on a held check-out, the flag
dialog's image picker, the link picker's layout, the unused PDF
rendition folder, UAT-only libraries, and a controller's view scoped to
their site.

## Current state (2026-11-23, after v0.99.0)

Released through v0.99.0 (ledger: `leanboard-cascade-improvement-plan.md`;
release paragraphs: `../CLAUDE.md`). Production took v0.88.1 and the
v0.89.0/v0.90.0 managed solution; v0.91.0 and v0.93.0 are app-only,
v0.92.0 carries the Utilities app in the managed solution, v0.94.0
and v0.95.0 are SOLUTION-CARRYING — import the solution first — and
v0.96.0, v0.97.0, v0.98.0 and v0.99.0 are app-only. Lock older builds
from Settings once the new one runs.

**v0.99.0 (2026-11-23, app-only):** tranche 1 of the programme
(`backlog-programme-2026-11-22.md`) and tranche 1A, the 2026-11-23
issue export (`issues-plan-2026-11-23.md`). Owed from it:
- **Untested on dev, to UAT or production:** C4 required fields on the
  Documents forms (Ben, in production); Review complete (UAT-DOC-035 /
  036), a held check-out (UAT-DOC-031), UAT-only libraries
  (UAT-DOC-101), a controller's site (UAT-DOC-102).
- **Unproven:** the throttle retry, until SharePoint next throttles a
  run (UAT-DOC-100).
- **Known limits:** UAT-only and site scope are what the app shows,
  not SharePoint permissions; a link with no library recorded on it
  stays visible; a change of UAT standing lands on the next app open;
  a board card set to a UAT-only library says the library is not
  exposed; the kebab's flag count can show every site's count for a
  moment; a document tagged to two sites shows to both controllers.

**v0.98.0 (2026-11-22, app-only):** ingestion run hardening
(`ingestion-run-hardening-plan-2026-11-22.md`): outcomes saved as they
happen, one run at a time, an interrupted run told from a live one, a
run that always ends, nothing added or changed during a run, leftover
copies named before a run. Owed from it:
- **Known limits:** SharePoint itself still accepts a file dropped
  into a task's folder mid-run (it is not ingested, and the run says
  so); the leftover check sees only what the running account can see.

**v0.97.0 (2026-11-19, app-only):** the priorities proposal
(`priorities-proposal-2026-11-18.md`: the review, Ben's fifteen
decisions, the as-built record by tranche, his twelve-check test walk
on dev). Objectives as charts inside each tile with an "Objectives"
switch (UAT-PRI-001); the decision zone — Proposed, Cascaded to you,
Unplaced — answered in the priority's popup, a message offered after
each step (UAT-PRI-014); the sub-pillar year by year and "Follows" in
Settings (UAT-PRI-011); actions raised ON a priority (UAT-PRI-015);
metrics defined ON a priority with their full trend in the Objectives
tab (UAT-PRI-016). Owed from it:
- **Left as found:** phone and the executive summary's last step keep
  the old cascade list; a proposed pull put on hold shows afterwards
  under "Cascaded to you". (A priority's own actions and metrics now
  COUNT toward the priority it was cascaded from — programme C1, built
  2026-11-24; they still show only where they were raised.)
- **Metrics follow-ups:** "Metrics — open items" below.

**v0.96.0 (2026-11-18, app-only):** the review of the full 2026-11-17
issues export (45 reports) and its build — status of every report,
Ben's decisions and the as-built record in `issues-plan-2026-11-18.md`.
Owed from it:
- **Open with Ben:** a style for canvas labels (33: size, bold, colour;
  4–6 h) — Alicia asked for formatting, and only wrap was built; the
  four card dialogs that raise an action with an entry (5 Whys, fault
  tree, risk matrix, heatmap) enforce the required fields on the press,
  not by disabling their own Add button; whether the Documents forms'
  "Required" tag should become the action form's asterisk.
- **Not built, by decision (2026-11-18):** naming guidance on upload
  (1); the document ID catalogue (3, the register's own export is the
  answer given); the previous meeting on a Link card (31); prompts
  (32); owners and approvers landing on every status (23); the replayed
  work link (15); site admins editing their own featured terms; a
  ceiling on a cascade.

**v0.95.0 (2026-11-17):** the executive summary scope and the
2026-11-17 issue export — plan, decisions and the as-built record in
`issues-plan-2026-11-17.md`. It carries `ben_lastupdateat` on
`ben_ltkinitiative`, `ben_doneat` and a widened `ben_assigneesjson` on
`ben_ltkaction`, and the new `ben_ltkattachment` table. Owed from it:

- **Duplicate… on the other action-raising cards** (5 Whys, Agenda,
  Fishbone…): the dialog offers it only where the host passes
  `onDuplicate` — the Action card, My day and the Improvement Gantt's
  editor do.
- **Attachment captions cannot be edited**, and a file is added with
  none (remove and add again). No preview.
- **Escape in the message panel's search** does not close its list —
  the action dialog underneath swallows the key.
- **The action dialog's "Flag for support" button paints the default
  purple**, not the Flagged colour chosen in Settings → Priorities →
  Status (the shared dialog has no road to the app's settings yet).
- **"Flagged" is still the middle count's label** (the priority
  circles, the wall's key) while an initiative's own status reads
  "Support needed" — Ben has not asked for the counts to be renamed.
- **Any editor can press another person's sign-off box** in the
  action dialog — KEPT, and the press is now on record (programme C6,
  built 2026-11-24: "Signed off by <presser> for <person>, <date>").

Recent decisions of record:

- **Search pickers: where the type-ahead pattern is still owed**
  (survey 2026-11-16, read from the code; the pattern is
  `ui-standard.md` §2.x). Built: the action dialog's "Search everyone…"
  and "Linked to", `pickOwner` / `pickPeople`'s directory half. Owed,
  most valuable first: (1) document person fields
  (`docs/fieldEditors.ts` — Add, Edit properties, ingestion defaults
  and the cell popover; inline, fires from one letter) with Submit for
  review's "Add reviewers" and role reassign's "With" as the same
  builder; (2) Users register "Search directory & add"
  (`screens/settings.ts`, a button and an uncapped list; a pick opens a
  placement form); (3) the meeting wizard's owner and participants
  (`controls/MeetingWizard/editor.ts` — two boxes and a Search button,
  25 rows shown unasked); (4) Organisation owners `pickPerson`
  (`screens/settings.ts`, two boxes and a button, its own copy of the
  directory add that skips `people/directoryAdd.ts`); (5) the action
  dialog's Support search (inline grid, beside the reference box);
  (6) ingestion task assignees; (7) document group members add;
  (8) the two document searches (Supersede, Links editor — no stale
  guard; the Links editor has no catch); (9) the multi-value tags
  select; (10) the hub's person scope (a browser datalist); (11) the
  Agenda card's who-search (a drifted copy); (12) team import's root
  search (no debounce — a directory call per keystroke); (13) notify
  panel and the initiative form's priority menu (already float; keys
  and timing only); (14) low value: the register filter's people
  search (`docs/docsScreen.ts`), UAT testers (`uat/settingsTab.ts`) and
  issue merge (`issues/adminTab.ts`, no stale guard). Not started —
  Ben asked for the list to be kept here (2026-11-16). Left as they are: lists that ARE a modal's body
  (`pickOwner`, Pull from above, the driver link, the access group
  picker), cascading selects, and filters over a table on screen.
- **The 2026-11-16 issue tranche** (13 issues, released as v0.94.0,
  SOLUTION-CARRYING — `issues-plan-2026-11-16.md` holds Ben's decisions
  and an "As built" section): initiative boards always live; comment
  edits for a day; supporters on an action; the action card in the
  priority popup; the primary initiative that counts (archived drops,
  completed stays) and picked objectives without one; every owner
  named; a session's site and year shared by Priorities and
  Improvement; proposed priorities (direct reports propose, the owner
  or an admin accepts); pillars per year (year view, from-year renames
  and moves, a priority's sub-pillar per year, ended not deleted);
  directory add in every picker, admins only. Schema on dev:
  `ben_supportersjson`, `ben_objectivesjson`, `ben_placementsjson`,
  `ben_succeedsid`. After the import: lock older builds (Settings →
  the release policy).
- **Due-date moves: one rule** (2026-11-16, released as v0.94.0):
  Ben's three choices — a Settings switch (Improvement → Due date
  changes) between "Initiative actions only" (the default) and "All
  actions"; ONE organisation-wide reasons list (add, rename, reorder,
  remove; "Other" always offered and needs a note); only a move LATER
  asks, an earlier date is recorded silently. Every move of an existing
  due date is now on the action's history whoever asked or did not; the
  action dialog lists the moves and cards carry "↷ n". The per-card
  "Reschedule reasons" setting is retired and the Gantt no longer asks
  on every move. Stored in the app row's improvement settings JSON
  (`reschedule`), no schema. Not built: a count of moves by reason in the
  initiative report; per-site reasons.
- **The 2026-11-11/12 rounds** (released as v0.93.0): a re-exposed
  document library keeps its columns (levelled with SharePoint at every
  Save and every open of Settings → Documents; unused mappings shelved,
  not pruned); the tile kanban keeps its cards whole and Add action sits
  at the top right of the action card; the Gantt's range controls share
  that row, with 26w, 52w, All and ‹ › paging. The per-column "+N more" on the tile kanban followed in
  v0.96.0.

- **The 2026-11-06 issue round** (`issues-plan-2026-11-06.md`): managing
  an org is its owner or the owner's direct reports; initiatives link only
  to priorities at an org the person manages — upward linking ended, pull
  first (existing links kept); a pull is adopted as-is or customised, an
  adopted priority can be customised or dropped. The open question —
  should direct reports also see confidential initiatives — was
  ANSWERED NO by Ben on 2026-11-24 (programme C5): ownership, roles and
  admins only; a direct report is let in by a role on the initiative.

- **The release gate first fired at v0.88.1** (2026-11-02): until then
  every build stamped itself `-dirty` through the generated UAT file and
  no build could record itself as current (`release-gate-2026-10-31.md`
  "Found 2026-11-02"). A running client gets the
  banner only, so no edit is ever thrown away.
- **Controller standing keeps the group listing** (2026-11-01,
  `membership-roads-2026-11-01.md`): measured faster than the one-user
  filter query and live rather than eventually consistent; the path
  road rejected (its 404 names the group). The register paints the
  remembered standing at once. Switch roads only if a group ever pages.
- **Roster reads page** (`allWhere`, 2026-11-01) and **admin over an
  initiative is one scoped rule** (site admins over their own site).
- **Ingestion grid ticks sync in place** (Ellen Black, 2026-11-02);
  every other repaint restores the scroll offsets.
- **LeanBoard Utilities** (2026-11-03/05): Outlook-only connections; the
  result emailed, Teams dropped (a chat cannot carry a file without
  OneDrive); task links never send by themselves.
- **Notice given in Cadence** (2026-11-09, released as v0.92.0): hours from the
  invite (or a series' creation, or a move) to the start, flagged under
  24 h; a one-off the person organised counts from the draft, a
  forwarded invite from when it reached this calendar.
- **Date arithmetic by calendar fields** (2026-11-06): the weekly bucket
  walked by milliseconds and lost a day across a daylight-saving change
  once the machine sat in a DST zone — two tests green in Brisbane, red
  in Auckland. `addDays` in `shared/schema/buckets.ts` is the rule.

## Near-term (ordered — Ben, 2026-08-07)

1. ~~**Document-control notifications.**~~ **BUILT 2026-08-08
   (v0.37.0)** — N0 probe → work link (`ltkmode=work`) → the notify
   panel on every lifecycle done-state → 5G access-request moments.
   Teams chat preferred, Outlook alternative, sent at-action by the
   actor; design of record in `leanboard-notifications-plan.md`.
   At-action only — reminder push stays a cookbook add-on.
2. ~~**Full UI design review** (Ben) + resulting tweaks.~~ **DONE
   2026-08-08 (v0.37.0)** — the D6 R1–R10 slate from
   `documents-integration-plan.md` plus field-reported fixes.
3. ~~**Document Control Health report.**~~ **BUILT 2026-08-08** —
   register kebab, gated on docAdmin (controllers + app admins).
   Checks are grounded in MAPPED ROLES, because the app can only judge
   what it has been told means something: no recognised approval
   status, no owner, review overdue, no review date, untagged (warn);
   no document type, no document ID, checked out right now (info). A
   check whose role is unmapped is REPORTED AS SKIPPED, never silently
   passed. Scans EVERY library except templates (Ben, 2026-08-08) and
   except the upload staging library (files mid-handoff are meant to be
   transient) — deliberately NOT the nav's selection, or the report
   would describe a filtered view as if it were the corpus — capped at
   2000 with the cap stated. Lifecycle checks (status, reviews) apply
   to CONTROLLED documents only: a working draft owes no approval
   status, and flagging every one would bury the real findings; the
   report states that split on screen. Findings
   collapse to counts, expand to documents, and a document click opens
   its overlay to fix it; overdue/missing reviews carry a by-owner
   tally; Export CSV for the full list. Pure `controlHealth` +
   `tallyByOwner` in model.ts, 7 tests.
4. ~~**Hub board card: documents needing review.**~~ **DECIDED +
   BUILT 2026-08-08 as a tab count**, not a card. The design review
   found two blockers for a real card: LeanHub's API has no
   "extra section" hook (only setMeetings/setActions/setBoards/
   setExtraTabs…), so a card needs a CONTROL change and a solution
   deploy, not `pac code push`; and a card that queries SharePoint on
   the landing path works against the import gate and the startup
   budget. Ben chose the tab count. Shipped: "Documents · 3" on the hub
   tab, fed by the Documents screen's OWN task selector (R7's single
   source — never a second count), remembered per viewer in
   localStorage (src/taskBadge.ts, 6 tests) so it shows on the next
   launch, and re-labelled live when the count changes (LeanHub caches
   extra-tab hosts, so re-labelling does NOT remount the register).
   Aged out after a week rather than asserting a stale number.
   **Known boundary, by design:** the badge reminds you of a backlog
   you have already seen; it cannot discover work that arrived since
   your last visit — the Teams/Outlook notifications do that, better.
   If the badge proves too quiet in practice, the next step is
   extracting the task engine out of docsScreen so the hub can sweep
   independently (~250 lines, the app's most-used panel — deferred
   until there is evidence it is needed).
5. ~~**Favourites left-nav entry.**~~ **BUILT 2026-08-08** — a
   "☆ Favourites · N" row above the Libraries card, filled accent when
   it IS the scope (rule 1: filled = location). It needed no new
   machinery: `favMode` had been waiting since the flat-2.0 pass cut
   the entry point. Signed-in only (favourites are per-person). In
   favourites mode the Folders tree HIDES rather than sitting inert —
   favourite rows carry no field values, so a folder click would look
   like a filter and do nothing — and the empty state names the ⋮ menu
   item that fills it. The libraries below are the way back out.
6. ~~**Phase 6 deployment cookbook** + stale-docs cleanup.~~ **DONE
   2026-08-08** — `deployment-cookbook.md`: the contract (columns only,
   five rules — never write status, never hold a check-out, never touch
   staging, honest identity, notify-don't-duplicate) plus four recipes:
   review-due reminder push (with the work-link shape and retention/
   escalation variants), content-approval hardening (Approve Items cost
   stated; unmeasured against the write bracket — trial on a test
   library), stored watermarked renditions (into the per-library
   rendition folder — the app's read path stays the live PDF), and the
   native-upload relay (declined for Pechey, documented as the road).
   Linked from `deploy-to-new-org.md`. Stale docs swept:
   `master-leanboard.md`'s phase table closed (3–5 shipped as the code
   app), the standard-documents plan's Phase 6 section closed, and this
   queue's items 1–2 struck.

7. **Doc cards refresh (NEXT).** The Standard documents card renders
   register-true rows (extracted cells: status chip, owner avatar,
   file-type chip, checkout lock); Document health renders R5 task
   rows; both configured by PASTING a filtered view's Copy link from
   the register (`docsView` — the encoded DocView, rename-proof term
   ids, one source of filter truth), legacy text configs honoured when
   blank. DocsCard also moves off the pre-C3b search feed onto the
   register's RLDAS road, approved-only by default. Plan of record:
   `leanboard-doc-cards-plan.md` parts A/B (Ben, 2026-08-08).
8. **Native upload relay.** U0 **GREEN (Ben's hosted run,
   2026-08-08)**: bytes cross the SDK's file door intact — 64KB up in
   1.1s, 4MB up in 10.4s / down in 0.9s, byte-identical both sizes
   (≈0.4 MB/s up: a size cap and a visible progress state are U2
   requirements, not niceties). The SDK door is `uploadFileToRecord`
   on the DataClient (1.2.7); `ben_ltkupload` deployed to DEV via
   `data/deploy-schema.mjs`, which now grants role privileges
   declaratively (`role: {delete}` — the 2026-08-05 stale-role trap
   closed at the tool). The probe stays as "Test Dataverse upload" in
   Test write access. **U1/U2 PARKED (Ben, 2026-08-08)** — the shipped
   staging handoff stays the upload road; the relay is measured OPEN
   and fully specified (cookbook recipe 2 + plan part C, including the
   alternatives analysis), so picking it up later is authoring one
   flow and building the dialog UI (`u-<stamp>-<name>` staging watch,
   size cap, progress — required at the measured ~0.4 MB/s). The
   table, probe and schema stay: NEXT RELEASE IS STILL
   SCHEMA-CARRYING (prod needs the managed solution re-imported, not
   just an app push).
9. ~~**Content-approval trial — CA0.**~~ **DONE + ADOPTED
   2026-08-08/09.** The bracket held, drafts were walled; the one gap
   (owner's Approve left the item PENDING) became CA1: lifecycle
   commands now publish (`_ModerationStatus = 0`) on every
   reader-facing transition, warned-not-fatal when refused. Ben
   granted Owners & Approvers the Approve Items permission — one-step
   approval confirmed working. Verdict + requirements recorded in
   cookbook recipe 1 and the deploy runbook's permission table. The
   quick-edit niggle CLOSED same day (Ben's call): a property edit on
   a READER-FACING document publishes as part of the save — a
   mid-circulation draft's edit still pends, its moderation wall
   holds, and the plain Check in… deliberately stays unpublished
   (content changes belong to the revision workflow). Same session:
   draft-with-no-reviewers now offers BOTH submits in the decision
   card, "Submit for owner approval" when that is where it lands
   (Ben's flow finding).

Removed by decision (Ben, 2026-08-08): the cookbook's reminder-push
recipe (reviews run on rituals & reporting — no inbox push) and the
stored-watermarked-renditions recipe (a field in the document template,
bound to the status column beside the template's own "uncontrolled if
printed" wording, does the watermark's job — no flow, no stored
artefact).

10. ~~**Settings consolidation Part II.**~~ **BUILT 2026-08-10**
    (S0–S3, unreleased): the one Document Columns manager — drag rows
    across sub-heading groups, —/✓/★ per-type cells — with Libraries
    first; every surface (register, docs card, chooser, filters, add
    form, edit properties, properties pane) answers from the cells;
    dialogs sectioned by the groups; C5 templates + per-library grid
    retired from the UI (data dormant, mirror keeps flags true);
    Health names type-relevance drift. Saved views untouched. Ben's
    hosted checks pending; design of record in
    `leanboard-docs-settings-consolidation-plan.md` Part II.

## Cards & embed tranche — carried forward (2026-08-18)

Shipped v0.45.0–v0.46.0 (all app-only): Capture Flag column, Capture
rollup, Canvas card + studio design mode, Canvas rollup, universal
＋ Action in the focused editor, kebab into the title bar, Embed
Present-in-window + ⧉ chip + "Not showing?" hint. Open items:

- **Power BI embed on Windows (browser platform).** Diagnosis of record
  in `deployment-cookbook.md` → Power BI embed prerequisites. TO DO
  (Ben/IT): raise the Microsoft/Chromium report (player frame lacks
  `allow="local-network-access"`; Teams precedent #2919); verify the
  Chrome `CloudAPAuthEnabled` lever on one machine before any device-
  group policy; decide meeting-room device policy. **Embed-token relay
  (Dataverse Custom API + service principal + Power BI GenerateToken,
  needs capacity) — ON HOLD (Ben, 2026-08-18)**; specified in the
  cookbook section and the 2026-08-18 conversation: SP setup, tenant
  setting, workspace access, GenerateToken with effective identity for
  RLS, powerbi-client SDK mode on the Embed card, token refresh.
- **Canvas rollup status/choice filter** — fast-follow if portfolios
  grow (logged in the canvas plan).
- **Capture card inline add-row** — only if testers find the row dialog
  slow (decision 8 in the canvas plan: capture keeps its dialog).
- **Design-review findings** (the ⚐ Report queue) — triage drives the
  next tranche.

## Future (formally logged, no date)

- **SOP review & sign-off card (was 5E).** Redesigned 2026-08-07: not a
  DMS command but a **LeanBoard card** where crews review and sign off
  SOP updates as part of their board ritual. Would still need the
  acknowledgement schema (`ben_ltkdocack` — the first schema release
  since v0.25.0) but the surface is the board, not the register.
  Replaces the parked "5E acknowledgement ledger" design.
- **Chatbot link-out.** Parked until Pechey chooses a chatbot — build
  the button when there is something real to link to. (Original Phase 6
  deferral, re-affirmed 2026-08-07.)
- **Native file upload — DONE 2026-10-27.** Bytes cross the connector
  when the body is declared `format: "binary"` (the 2026-08-03
  carriages never declared it). Add document uploads from the device;
  Replace content writes in place through Update file. STANDING RULE
  (kept): any commit that bumps @microsoft/power-apps re-runs the
  write-access probe, whose binary steps must stay green.
- **Live-tiles cost bounding.** Watch item (re-affirmed 2026-08-07) —
  act only if refresh cost shows up in practice.

## BBA requirements backlog (Ben's disposition, 2026-08-13)

From `bba-dms-gap-analysis.md` — the items dispositioned to backlog
(the NEXT tranche — governed hashtags, generic document linking +
management-system filters, audit trail — is tracked in its own plan
when written):


- **Workflow depth (FR-WF-003/007/009/011 MUST; WF-004/008/010,
  TM-002/003).** Regulator-approved gate, approval timeframes,
  delegation, formal on-behalf records, simple content revisions,
  change requests, DocuSign, template self-lifecycle, co-authoring.
- **Acknowledgement (FR-DI-001/002, RP ack KPIs).** The 5E sign-off
  card design stands; needs the ben_ltkdocack schema (road proven).
- **Retention & disposal (FR-VR-004/005/011).** retainUntil stays
  inert until this is picked up; Purview labels + owner disposal
  review.
- **Reporting completeness (FR-RP-001/002/008 tails).** % on-time
  review compliance KPI, acknowledgement KPIs (after 5E), PDF register
  export.

**Decisions of record from the same disposition:**
- Document numbering (FR-LC-002/006): PARKED (Ben, 2026-08-15) —
  the document ID stays a MANUAL field carrying legacy numbering; no
  auto-generation is built. Health already flags controlled documents
  missing an ID, which is the whole guard a manual scheme needs.
- PDF/reader layer (FR-DI-005/006/007, LC-003): handled IN the
  documents — a status stamp field bound to the status column; no
  app-side rendering. Too difficult to implement reliably.
- Push notifications (FR-NT-002/003/004): DECIDED AGAINST — rituals
  and pull surfaces are the mechanism; at-action notify panel only.
- Per-document confidentiality (FR-AC-005): REJECTED as too risky —
  library-level confidentiality controls only.
- Guest/auditor access (FR-AC-007): parked indefinitely.
- Bulk curated ingestion (FR-IM-002/006): ~~met by the existing
  spreadsheet process outside the app~~ — BUILT in the app 2026-10-08/09
  (document-ingestion-proposal-2026-10.md); see "Document ingestion"
  below for what stays open.
- AI assistant (FR-AI-*): a future project iteration.

## Actions card — open items (2026-09-30)

- The view a person chooses (List | Kanban | Gantt) is kept for the
  session only — LEFT AS IT IS (Ben, 2026-11-24, programme E5).
- "Download PNG / SVG" from the card's menu draws the control's own
  styles; with the app's Gantt in the Gantt view the download is not
  styled. Use the Gantt's own Export CSV, or switch view to download.
- The kanban column is still named "Verify" (it is also used on
  meeting boards without endorsement) while everything else says
  "endorsement".
- Tile pictures (used when a board is switched away from Live) can
  lag one edit when a card is left within ~½ s of typing: the
  picture is drawn on a delay and the flushed save carries whatever
  picture it has. Live boards, the default, are unaffected.

## Feedback round 1 — open items (2026-10-07)

Plan and status: user-feedback-plan-2026-10.md; walkthrough outcome:
user-feedback-test-script-2026-10.md. Released v0.65.0 / v0.65.1.

- **Tranche D — the limited phone register**: RELEASED in v0.66.0
  (2026-10-07; search, four selects incl. library, one-column list,
  full-bleed viewer; folders and the column set stay desktop).
- **Phone layout of the other tabs**: reviewed 2026-10-07
  (docs/mobile-review-2026-10.md) — M1 frame (top bar, tab strip,
  action rows), M2 ritual board, M3 priorities walk, M4 initiative
  screen, M5 cadence day view; value drivers / settings desktop-only.
  M1–M5 ALL BUILT and RELEASED in v0.66.0 (2026-10-07; M2 leaves four
  card tile layouts to narrow per card: SQDPC, RiskMatrix, RACI,
  Fishbone).
- **Settings after v0.67.0 (2026-10-08)**: site admins no longer see a
  Ritual categories list (it moved to the super-admin Branding tab);
  the Priorities settings
  tab is super-admin only now that only pillars and the period rule
  remain. The priorities poster scales a crowded view down rather than
  paginating — a floor on the scale (and a second page) only if a site
  ever has too many columns to read.
- **Hierarchy in filters** (report 36): a parent term such as SMELTER
  including every term beneath it when ticked — logged, not built
  (B1 kept "a pick includes its subtree" as before).
- **Waiting on people**: report 2 (what Marie clicked — the message
  is Power Apps' own package validation); reports 38 / 40 (Ben checks
  a failing preview file for a sensitivity label); report 12 (Ellen
  confirms named views hold on v0.63+).
- **Translation** (report 48): a strategy question, parked.

## Term store & processes — the plan (2026-10-12)

- **One-way sync as the rule** (proposal §8): write-through and the
  owed-push queue BUILT 2026-10-12. Left: the verifier's Adopt
  (reverse import of a good-faith term), move as create + retire +
  carry (needs §7.2, carry the documents), the set's open-for-tagging
  flag off (probe `isOpen` on v2.1), the contributor group reduced to
  super admins (deploy-guide note). Then §7.4 (rebuild, onboarding
  only).

term-store-proposal-2026-10.md. Steps 1 (the term manager, with
colours), 2 (the rename journal + term binding + ID-first planner +
the sync warning) and 3 (the process model — schema, Settings →
Processes, the site's type, local names; SOLUTION-CARRYING) BUILT
2026-10-12, and 4 (the picker; process on rituals, Cadence, initiatives
with filter and chip, value drivers with by-process dimming) BUILT
2026-10-12, and 5 (the Process area term set — bound beside the
Organisation set, synced from the process model with the binding on
the node, local names as synonyms, the "Process area" column role)
BUILT 2026-10-12. The plan is complete; open: a generic `syncedSets`
list only if a third app-master set appears; synonyms the app pushed
are never removed by the sync (the manager does).

## Document ingestion — open items (2026-10-09, released v0.69.0)

- **Run hardening — RELEASED in v0.98.0 (2026-11-22), unseen running**
  (`ingestion-run-hardening-plan-2026-11-22.md`): refusal reasons saved
  as they happen, one run at a time with an interrupted run told apart
  from a live one, a run that cannot lock its screen, and leftover
  copies named before a run. App-only. The UAT cases are UAT-DOC-095,
  096 (two controllers) and 097.

Released as v0.69.0 (SOLUTION-CARRYING, `ben_ltkingestiontask`); since
then: the spreadsheet round trip (v0.83.0), a task constrained to one
site (v0.84.0), sub-folders walked with read-only paths and a flat
landing (v0.86.0, `ingestion-subfolders-proposal-2026-11-01.md`), ticks
that keep the scroll (v0.88.1).

- **Excel round-trip** (decision 1): phase two only if SharePoint's
  grid view and the app's grid fail users in practice.
- **Throttling guard**: eight files in flight sits under the
  connector's ~600 calls a minute; a throttled call fails the file
  (its glyph says so). If it shows up, drop `IN_FLIGHT` to six or add
  a retry with back-off on 429s.
- **A term renamed since a file was tagged** opens its cell's popover
  unselected (the label no longer resolves to an id) — set it again.
- **Closed tasks** are reachable only through the sheet that closes
  them; a "Closed" filter on the Ingestion tasks panel if controllers
  want to re-read old logs.
- **Re-ingesting an existing document** is refused by design (name /
  document-ID collision); the road is the document's own lifecycle.
- **Register load timing** (Ben, 2026-10-12: "the document tab has
  become slower"): no change touched the list load path, so the
  register's status line (SUPER ADMINS only) now ends with a timing
  readout per load — "loaded in 2.1 s · feed 1.8 s ×2 · count 120 ms",
  the visit's first load clocked from the tab opening ("3.4 s after
  opening · feed … · app data …") so the config read and the pre-list
  work show (hover for the call-by-call list; a throttled call reads
  "refused"). Dev readouts (2026-10-12): under 600 ms to rows. The
  PRODUCTION tooltip (v0.71.0) found it: "Load 1 (next page, scroll,
  started 0.1 s after opening)" — the list's near-end sentinel fired
  on the empty list and paged a full unfiltered 50 rows (8 feed calls,
  10 s of SharePoint) while the real first load waited as a replayed
  reset at 4.2 s; the status-vocabulary read (2.1 s) gated that first
  load too. FIXED after v0.71.0: paging only follows a reset
  (`generation === 0` guard), and last visit's status vocabulary opens
  the register at once (localStorage `ltk-docsstatus|site|set`, live
  read refreshes behind). Feed notes now read "kept/returned rows of N
  asked" — one production library needed seven pages for 50 rows,
  which that note will explain (folders dropped client-side?). Read
  the readout on a
  slow load before chasing a cause: a long feed with few calls is
  SharePoint (library growth or a throttle after an ingestion burst);
  a term walk is the filter pane after a term-store edit emptied the
  cache, once per session.

## Initiative links — open items (2026-10-08)

- **Card tile layouts to narrow** per card: SQDPC, RiskMatrix, RACI,
  Fishbone (left from M2).

## Issues — open items (2026-10-06, updated 2026-10-12)

- 2026-10-12: a status change repaints the LIST (a resolved issue
  left the Open list at once instead of on the next visit); a ↻
  Refresh on the filter row; every reporter-facing Teams card quotes
  the reporter's own description under the message ("Your report").

- **The hub's "my part" tick on a multi-assignee action** completes
  the action only when the last part is ticked; there is no "mark the
  whole action done" on the hub — that is the dialog's Closed.

## Priorities — open items (2026-10-02)

- **Forgotten open priorities: DECLINED** (Ben, 2026-11-24, programme
  D7; first "start without it" on 2026-10-02). A priority with no
  planned end never flags, and that is the rule.
- **An initiative's span is label-based.** Its start is the period
  label on its details; the end is stamped on completion / archive.
  An initiative whose label was never set shows in every year — LEFT
  AS IT IS (Ben, 2026-11-24, programme D8).
- **Re-parenting is single-level.** Linking a child under a parent
  does not re-send the child's own cascades; the child's children keep
  their links. A re-parented priority keeps its owner and order.
- **Custom periods: REMOVED 2026-11-24** (programme D10). Calendar
  year is the only period; financial year and custom labels are gone
  from Settings and the model. Dev and production were already
  calendar year with no prefix.

## Metrics — open items (2026-11-19)

Raised while Ben tested the priorities build on dev (a tile's sparkline
did not look like the same metric's chart). Nothing here is built.

- **One span for a metric's pictures.** The sparkline (priority tile,
  initiative row, executive summary) draws the last 12 READINGS,
  evenly spaced, whatever their age. The Metrics card chart draws the
  13-week page around today. Same series, different spans: the Yield
  driver on dev showed an 11-point climb on the tile and two points on
  the card. **Decided (Ben, 2026-11-19): leave it** — the sparkline
  stays the last 12 readings. Kept here as the explanation, not as work.
- **A stale metric looks current.** The status rule judges the LAST
  reading whatever its age, and the sparkline shows no gap. A metric
  not filled in for nine weeks still reads on track. Offered: a "no
  reading for N periods" mark on the metric, and whether that counts
  toward the initiative's or priority's status. The periods would
  follow the metric's cadence.
- **The Metrics card chart opens around today.** A metric last filled
  in weeks ago opens almost empty, though its history is there.
  Offered: open on the page that holds the latest reading, or show a
  "latest reading: <date>" link that jumps to it.
- **Readings are read from the beginning of time.** To find a metric's
  last value and its tail, the page reads every reading the metric has
  ever had (`loadMetricLasts`, `loadOwnMetricLasts`: 1900 to 2999).
  Fine today. Bound it to a window, or read the last N, before a daily
  or shiftly metric has a year of history.
- **A priority's own metrics: two reads each at page load** (readings
  and spec). The readings coalesce into one query; the spec reads do
  not. Batch them if priorities come to carry many metrics.
- **Removing a metric leaves its readings: BUILT 2026-11-24**
  (programme C8) — the × counts them and asks, and they are deleted.
- **A priority's own metric stays own.** No Link… or Promote… into the
  value driver tree, because its readings would not move with it. To
  build: carry the series across, as an initiative's metric does.
- **The values grid's note says "this card's own readings"** when it
  is opened from a priority. Wording only.
- **Short of plan and outside the limits read the same on a priority.**
  Both turn the edge to the off-track colour (the initiative rule,
  applied to a priority's own metrics). Ben has seen it and not asked
  for a change; listed so the rule is on record.

## Initiative stages — open items (2026-09-29)

- A revert needs no approval (Ben's call, 2026-09-29; CONFIRMED
  2026-11-24, programme E17 part 1 — no approver, no message to the
  endorsers).
- Gate snapshots taken before a revert are kept; BUILT 2026-11-24
  (programme E17 part 2): they read "reverted <date>" or "superseded",
  older ones folded under the newest of their stage.

## Improvement / KPI tranche — open items (2026-09-24)

Everything through v0.55.0 is built; these are the decisions and
deferrals still open (details in leanboard-cascade-improvement-plan.md).

- **P10 Reporting** — designed (plan §4), not built. Awaiting Ben's go.
- **Simulate** — parked 2026-09-09 (button hidden, code kept). Reviving
  it needs a home for BASELINE again (its entry surface went with the
  period tiles).
- **Endorsement** — built 2026-09-30 (see "Actions card" above for the
  Verify column's name). The endorser is not messaged — a count in
  the app only, Ben's call.
- **Evidence attach on actions** — table exists (`ben_ltkactionfile`),
  no UI.
- **Confidential actions, hardened** — a separately secured table with
  per-record sharing if app-level hiding ever proves insufficient.
- **Organisation-scope Actions read** — one query of all open actions,
  filtered in the app; page by board once open rows pass a few
  thousand.
- **Picklist option library** (site-level reusable option sets) and a
  **target-state row** for picklist KPIs — if the same lists keep being
  retyped / a "short of plan" state is wanted.
- **Standalone KPI cards as good/bad or picklist** — drivers and own
  initiative metrics have it; standalone meeting-board cards are numeric.
- **Secondary organisations on a ritual: BUILT 2026-11-24** (programme
  G8) — a site admin there sees it in Settings › Rituals and opens it;
  Edit, Replicate and Archive stay with the site that runs it.
- **Metrics card on hand-deleted boards** returns only on the next Edit
  details save (or Reset board to template).

## Done / no longer tracked

- **Removed by Ben, 2026-11-22** (the backlog checklist): everything
  listed as owed by him with no code — re-running the v0.98.0 release
  workflow and re-importing, clearing dev's test data, the issue
  replies, the UAT library's Linked documents column, Kat's Dataverse
  role, Casting's featured types, Ellen's seven document types, the
  governance guidance question for Holly, telling leaders before the
  status rule — and every "released but not yet checked" entry
  (v0.93.0 to v0.98.0, his pending passes, the Utilities checks, the
  pilot users' seven confirmations). The release ledger and
  `../CLAUDE.md` still record v0.98.0 as released unseen running. Also
  removed as work: folder contents for "/:f:/g/" sharing links, the
  issues export's non-image attachments and split by size, computed
  canvas fields, a dismissible prompt beside the release banner, a
  read-only Ritual categories view for site admins.

- Folder counts REMOVED (Ben, 2026-08-08, UI design review): they cost
  one id-and-org query per library after every register reload, and
  same-named departments merged their numbers. The tree is pure
  navigation; the walk now also serves from a localStorage cache
  (screen trees only — drift/sync always walk live). This DISSOLVED the
  "duplicate-label term counts" investigation.

- Table display-name renames ("LTK …" → "LeanBoard …") — done by hand
  in the portal (Ben, 2026-08-07).
- "Effective Dae" column label, marketing@'s leftover Entra ownership,
  Dev-role check (`ben_ltkdoclibrary` + Delete privilege) — all fixed
  by Ben in the portals (2026-08-07).
