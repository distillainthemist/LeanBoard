# Plan — executive summary scope + 2026-11-17 export (11 issues, v0.94.0)

Sources: `Scope for executive summary.pdf` (Ben, two slides: the status
rules and the mock-up) and `leanboard-issues-2026-11-17.pdf` (Sue
Vallance, Ellen Black and Ben, filed 2026-11-16/17 against v0.93.0 and
v0.94.0). Analysis read from the code at 6f8c219 (v0.94.0); nothing here
was reproduced in the player. Decisions are Ben's, taken one by one on
2026-11-17.

Status: BUILT on dev 2026-11-17 in five tranches after Ben's "Good to
proceed" (643d1f9 schema, 895b074 tranches 1 and 2, 09ce3c8 tranche 3,
76dd17c tranche 4, 977ce0d tranche 5); schema deployed to dev.
RELEASED as v0.95.0 on 2026-11-17 (solution-carrying). See "As built" at the foot for where the build differs from
the plan below.

## Decisions of record

| # | Question | Decision |
|---|----------|----------|
| Scope | A priority with both a flagged and an off-track initiative | Flagged wins. Order: flagged, off track, on track (the mock-up, and the initiative rule). The three counts still show the off-track one. |
| Scope, 3 | The two flag levels (Flag / Escalate to sponsor) | MERGED into one Flag, with an optional "notify the sponsor" tick. "Escalated" disappears as a level and as a colour. |
| Scope | A brand-new initiative (no actions, no update) | Grace from creation: on track until the recency window (default 5 weeks) has passed. One setting, both clocks. |
| Scope | What resets "no recent updates" | A status update only (Highs / Lows / Next / Support needed). The board's stale notice follows the same setting. |
| Scope | Which metrics can turn it off track | Every metric. One with no reading or no target is ignored, not counted bad. |
| Scope | Reach of the new status | Everywhere, one rule: executive summary, Priorities tab, popup, Improvement register and tiles, Gantt card, A3 poster. The old four colours and the ratio roll-up go. |
| 4 | "Support required" on an action | RENAME the Escalated tick to "Support required", with a flag symbol. No new field. |
| 5 | Attachments | One Dataverse table for initiatives AND actions, a file or a link each. The unused action-file table is retired into it. |
| 10, 11 | Several people ticked on an action | Always ONE shared action with a part each. Replication is a Duplicate command on an action that already exists. |
| 10 | Who may tick a part or close for all | Anyone who can edit the action, as today, no question asked. |
| 10 | Cascade to reports not in LeanBoard | Skip them and list the names. The admin-only directory rule stands. |
| 7 | Who decides the leading filter pills | An admin, per department with a site fallback. The viewer sees their own department's list. |
| — | Packaging | Everything in ONE solution-carrying release. |

Assumptions I made where no question was asked — veto any of them:

- Words on screen: **On track / Flagged / Off track**. A flagged
  initiative reads "Flagged · at risk" when it would otherwise be on
  track and "Flagged · recovery needed" when it would otherwise be off
  track.
- Late = today's overdue rule: past due, not done, not on hold, not
  waiting for endorsement. One action one day late is enough. No
  tolerance setting.
- "No actions defined" = no action that is not cancelled. All done is
  fine. Late actions and bad metrics bite INSIDE the grace period too;
  the grace covers only "no actions" and "no update".
- Short of plan and outside limits are both off track (today amber and
  red). A good / bad or picklist metric in its amber or red state is
  off track.
- Completed and archived initiatives are not counted, as today. A
  priority with no counted initiative is neutral ("No initiatives").
- Confidential initiatives count in a priority's numbers and their rows
  stay hidden from people who may not see them ("1 confidential not
  shown"), as today.
- Who may flag: whoever may today (the initiative's own people and its
  admins), not the owner alone.
- An existing "escalated" initiative reads as flagged; its note stays.
- The key metrics on a collapsed priority card are the priority's
  OBJECTIVES (the primary's starred metrics, or the picked ones).
- The "Future" action count paints in the neutral colour, not the
  flagged purple of the mock-up: purple must mean one thing.
- The Escalation viewer card keeps its name and its behaviour; only the
  action's own wording changes to "Support required".
- A message sent about an action leaves a one-line comment on it
  ("Messaged A, B by Teams").
- Messaging may search the whole directory for a recipient (nobody is
  added to LeanBoard by it), as the document notify panel does today.
- Recently completed (issue 2) defaults to 7 days on every action card,
  including the priority popup's Actions tab; 0 switches it off.
- Document filter order (issue 9) is fixed for the first three (Status,
  Document type, Process area); the rest follow the site's column order.
- A shared action is capped at 500 people.

## Critical review — what the scope changes that it does not say

1. **Two rules are replaced, not one screen.** `initiativeRag`
   (`priorities/model.ts`: red / amber / green / grey) and `rollup`
   (strict or ratio, `ragRatioPct` in Settings → Priorities) both go.
   Eight files read them.
2. **It is much harsher.** Today a late action or a metric short of
   plan is amber. Under the scope both are off track, and so is "no
   actions". On the priority in Sue's screenshot six of seven
   initiatives have no open actions. Expect most of the portfolio to
   open off track on release day. That is honest, and it needs saying
   to leaders BEFORE the release, not after.
3. **A status must say why.** The mock-up shows counts but no reasons.
   Every status carries its reasons ("3 late actions", "Scrap rate short
   of plan", "no update for 6 weeks") and every surface can show them.
   Without this a red wall reads as an accusation, not a to-do list.
4. **"No recent updates" needs data the Priorities screen does not
   load.** Update dates live in the event trail, one read per
   initiative. The last update date is stamped on the initiative row
   instead (schema below).
5. **The board's stale notice** uses a fixed 14 days
   (`commentaryModel.ts` `STALE_DAYS`). It moves to the new setting, so
   the band and the status can never disagree.
6. **Flag semantics invert.** Today flag = amber and escalated = red.
   Flagging becomes its own state and "a good thing"; the underlying
   health is still shown as the sub-label so a flag never hides trouble.
7. **Sparklines cost nothing extra.** `loadMetricLasts` already reads
   every point of every metric and keeps the last one. It keeps the tail
   instead.
8. **Issue 10 is half built.** The model already holds several
   assignees with a `done` each and closes the action when all are done
   (`settleFromParts`); the hub already has "my part". The dialog is the
   gap: it picks ONE person and, on save, REPLACES the list with that
   one (`actionUi.ts` apply). Cards show `assignees[0]` only.
9. **Issue 7 cannot be hard-coded.** The seven types Ellen lists are not
   in the two top levels the pills show, and may not be in the Document
   type term set at all (her counts come from a legacy register). If
   they are missing they are added in the term manager first. Check with
   Ellen before the build.
10. **Dataverse file storage is metered**, has no versioning and no
    in-browser preview. Attachments are for evidence that must live with
    the initiative; working documents stay in the working folder.

## Schema (deployed to dev first — Ben signs in for the device code)

| Table | Column | For |
|-------|--------|-----|
| `ben_ltkinitiative` | `ben_lastupdateat` text(30) | Scope: the recency clock without an event read |
| `ben_ltkaction` | `ben_doneat` datetime | 2: recently completed |
| `ben_ltkaction` | `ben_assigneesjson` widened memo(10000) → memo(100000) | 10: a shared action for a whole department |
| `ben_ltkattachment` (NEW) | `ben_parentkind` text(20), `ben_parentid` text(80), `ben_file` file 32768 KB, `ben_url` text(2000), `ben_caption` text(300), `ben_filename` text(300), `ben_sizekb` int, `ben_uploadedbyid` text(120), `ben_uploadedbyname` text(200), `role: {delete: true}` | 5 |

- `deploy-schema.mjs` creates columns and skips ones that exist. The
  widen needs a small new step in the tool (update the attribute's
  MaxLength). PROVE IT ON DEV FIRST; if Dataverse refuses, the fallback
  is a cap of 100 people per shared action and no widen.
- `ben_ltkactionfile` stays in the solution, unused (removing a table
  from a managed solution is not worth the risk). No screen ever wrote
  to it.
- No schema for: the status settings (recency days, three colours — the
  app-row settings JSON), the action card's "recently completed" days
  (card settings), featured filter terms (the documents config row,
  written through `patchAppDocsConfig`).
- After the deploy: `pac code add-data-source -a dataverse -t` for
  `ben_ltkinitiative`, `ben_ltkaction`, `ben_ltkattachment`.

Stale clients: an older bundle saving a shared action from its dialog
drops all but one person, and reads a merged flag correctly. So prod
imports the solution, runs the new build, then Settings → release
policy → "Lock every older build" (the v0.94.0 routine).

## Tranche 1 — the status rule (scope; issues 1, 3)

**One pure module**, `app/src/improvement/status.ts`:

- `initiativeStatus(input, settings, today)` → `{ state: "good" |
  "flagged" | "bad", health: "good" | "bad", label, reasons[] }`.
  Inputs: flag, created date, last update date, action counts (any,
  done, future, late), each metric's state.
- `priorityStatus(statuses[])` → `{ state, counts: { good, flagged,
  bad } }`, state "none" with nothing counted. Flagged wins, then bad.
- `actionCounts(actions, today)` → done / future / late, the one count
  the summary, the popup and the register share.
- `StatusSettings { recencyDays: 35, colours: { good, flagged, bad } }`
  with parse / serialise; colours are state-palette KEYS.
- Replaces `initiativeRag`, `rollup`, `rollupWords`, `tally`,
  `ragPaletteKey` and the strict / ratio toggle at every caller:
  `prioritiesScreen.ts`, `lifecycle.ts`, `walk.ts`, `settingsTab.ts`,
  `improvementTab.ts`, `ganttCard.ts`, `pdfPoster.ts`.

**Data**

- `Initiative.createdAt` (the row's created-on, mapped in the store) and
  `Initiative.lastUpdateAt`. `appendInitiativeEvent` stamps the row when
  the event is a comment (the one write path).
- Backfill: initiatives with an empty stamp get their latest comment
  event read once per load, in one query, until their next update stamps
  them. No script to run in production.
- `Initiative.metricStates` comes from the existing `buildMetricState`
  (every metric's state, not only the worst).

**Flag, merged**

- `FlagLevel` becomes `"" | "flag"`; a stored "escalated" maps to flag.
- `escalate.ts` becomes the one Flag dialog: what you need (required),
  a "Notify the sponsor" tick with the recipient chips, Teams or email.
  The flag applies first; a failed send never reads as a failed flag.
- The row kebab and the board kebab offer "⚐ Flag…" and "Clear flag".
- **Issue 3**: the Add update dialog always offers "Flag this
  initiative" when no flag is up (pre-ticked once Support needed has
  text, as today), with the "Notify the sponsor" tick under it. The
  Support text becomes the flag note. When a flag is already up the
  dialog offers "Keep the flag" / "Clear the flag".

**Settings → Priorities → Status** (replaces the ratio rule): the
recency days, and one palette pick per state. The starter palette gains
a "Flagged" entry (purple). A site with its own stored palette picks an
entry or adds one; until then flagged falls back to its Info colour.

**Issue 1**: `initiativesFor` in `prioritiesScreen.ts` reads
`roles.owner[0]`; it takes `ownersLabel` / `ownersTitle` like the
Improvement tab. Every new row below uses the same helper.

Tests: `status.test.ts` (each off-track cause alone, the grace window at
its edges under `TZ=Pacific/Auckland`, flagged over both healths, the
priority precedence, no initiatives), flag mapping, settings parse.

## Tranche 2 — the Executive summary (scope)

`walk.ts` is rebuilt in place; it keeps its steps (one sub-pillar per
step, "Cascades to accept" last), its rails, dots, keys, swipe, the
phone's inline mode and the ritual card's embedding. "▶ Present"
becomes "▶ Executive summary", "✕ Exit presentation" becomes "✕ Exit
summary".

- **Head**: the year pill, "Pillar : Sub-pillar" on the pillar's colour.
- **Priority card, collapsed**: status edge; statement; owner; three
  count circles (On track / Flagged / Off track); the priority's
  objectives as sparkline tiles (four, then "+n"); ⋮; the chevron.
- **Expanded**: the priority's own metric tiles give way to one row per
  initiative — status edge, "PRIMARY INITIATIVE" tag, title, owners, the
  stage disc with its name, Actions Done / Future / Late circles (and
  ⚑ n when actions ask for support), its metrics as sparkline tiles
  (starred first, four then "+n"), SUPPORT NEEDED with the flag note
  when flagged, and the reasons line when off track.
- Own initiatives first, then those inherited from child priorities
  under their org's name, as the popup lists them.
- Several cards may be open; "Expand all / Collapse all" in the head;
  the open set and the step are remembered for the session.
- The priority's title opens its popup. An initiative row opens its
  board, and Back returns to the summary at the same step.
- **Sparkline** (`improvement/sparkline.ts`, pure geometry + one small
  SVG builder): the last 12 buckets; a green band where the metric is
  good and a red band where it is not, from the target, the limits and
  the good direction. A good / bad or picklist metric shows its state
  chip; no reading shows "No data".
- Layout by the container's width (the hub can split the screen): tiles
  wrap under the title when narrow; the phone stacks.

**The same picture elsewhere**

- Priorities tab cards: the three circles replace the R / A / G tallies;
  the edge is the priority's status.
- Popup initiatives list: groups Flagged / Off track / On track; each
  row carries its sub-label, its reasons and every owner.
- Improvement register, tiles and Gantt card; the A3 poster's colours
  and counts.

Harness: a `summary.html` page with fake priorities, initiatives and
series, for screenshots at TV, laptop and phone widths. The live view
needs the Power Apps host and is Ben's check.

## Tranche 3 — actions (issues 2, 4, 6, 10, 11)

**Issue 2 — recently completed**

- The store stamps `doneAt` when an action reaches done or verify and
  clears it on a reopen (`upsertActions`, the one write path). Older
  done rows fall back to verified-at, then the row's modified-on.
- Action card setting "Show completed for (days)", default 7.
- Completed inside the window show by default on List, Kanban and
  Gantt. The switch becomes "Show all completed (n)", n = the older
  ones; the Done column's note reads "n older completed hidden".

**Issue 4 — Support required**

- The dialog tick, the card and Gantt flag, the hub chip and tooltips
  read "⚑ Support required". Same field, same Escalation viewer road,
  same acknowledgement.

**Issue 10 — shared actions**

- Who becomes tick-several. One tick behaves as today. An edit keeps
  each person's `done` (this fixes the dropped-assignees defect).
- `Assignee.doneAt` records when each part was ticked.
- The dialog lists the people with a tick each for anyone who can edit;
  Closed still closes for all.
- Cards, list and Gantt: first name "+N" and "3 / 12 done", the people
  still to do it in the tooltip. The hub keeps "my part".
- **"＋ Add a team…"**: pick a leader (type-ahead, the standing
  pattern), "Direct reports" or "Everyone below", optional "include the
  leader". Reads the reporting line through the existing
  `walkReports`; adds the people already in LeanBoard; names the ones it
  skipped.
- A confidential shared action looks up each person's manager at save:
  batched four at a time, as the directory walk does.

**Issue 11 — Duplicate**

- "Duplicate…" in the action's ⋮ and in the dialog footer opens the
  Raise dialog filled from the source: issue, action, who, supporters,
  dates, link, Support required, Confidential. Not copied: comments,
  history, parts done, attachments. A closed source duplicates as Do.

**Issue 6 — Message about this action**

- A "Message" button in the dialog's title row, on a saved action.
- Opens the notify panel's anatomy: recipient chips (the assignees by
  default, never yourself), a type-ahead to add anyone, an editable
  message carrying the action, its due date and a `boardUrl` link, send
  by Teams or email, the outcome reported in place.
- The shared dialog must not import the documents code: a provider,
  `setActionMessageProvider` in `shared/ui/actionLinkProvider.ts`,
  registered in `main.ts` behind a dynamic import (the import gate).

Tests: doneAt stamping and the window, `visibleActions` with days,
multi-assignee apply (kept parts, added, removed), the progress label,
duplicate's field list, the cascade's roster split.

## Tranche 4 — attachments (issue 5)

- `app/src/store/attachments.ts`: list by parent, add file (the
  issue-file road, `uploadFileToRecord`), add link, remove. Writes go
  through `writing()`.
- One component, `attachmentsList`: drop or pick a file (30 MB cap,
  said up front), "Add a link" (address + caption), rows with name,
  size, who, when, Download / Open, Remove (the uploader, the parent's
  owner, admins; `confirmRemoval`).
- Shown on the initiative (a section in the details pane, a count chip
  in the board header) and in the action dialog's right column under
  Comments (a saved action).
- Visibility follows the parent, app-level: a confidential initiative's
  attachments are listed only to those who see it. The rows stay
  readable through Dataverse; say so.
- The working folder and the links card are unchanged.

## Tranche 5 — document filters (issues 7, 8, 9)

**Issue 9**: the popover and the phone's selects order their groups
Status, Document type, Process area, then the rest in the site's column
order. Importance / risk drops below.

**Issue 7 — featured terms**

- Settings → Documents, on each filter column: "Featured terms" — an
  ordered list for the site, and an override per department. Terms are
  picked by type-ahead at any depth.
- The register leads a column's pills with the viewer's department list
  (from their roster profile), else the site's, else today's two top
  levels. Search still reaches every term.
- Stored in the documents config row through `patchAppDocsConfig`.

**Issue 8 — a tree for deep vocabularies**

- A hierarchical filter column deeper than two levels gets a nested
  drill-down in place of pills: expand, tick at any level, several at
  once; a ticked parent matches everything under it; the search box
  narrows by path.
- It opens at the viewer's own site and department branch; the other
  branches start closed.
- The "compare across sites" central picker stays above it.

## UAT (same commits as the behaviour)

New or reworded cases: priorities (status rule, summary, popup groups),
improvement (flag merge, flag from an update, attachments), actions
(recently completed, Support required, shared action, add a team,
duplicate, message), documents (filter order, featured terms, the
tree), settings (status colours and recency, featured terms).

## Order of work

1. Schema to dev, including the widen proof. Ben signs in.
2. Tranche 1, then 2: the rule before the screen that shows it.
3. Tranche 3, 4, 5 in that order; each is independent of the others.
4. Gates, harness screenshots, one push to dev, Ben's hosted checks.
5. Release on "Cut the release": solution first in prod, then the app,
   then lock older builds.

## Open checks before building

- Ellen: are her seven document types terms in the Document type set
  today, and at what level?
- A word to leaders about release day: the portfolio will read mostly
  off track, with the reasons listed.

## As built (2026-11-17)

Everything in the plan is built. Where the build differs, or settled
something the plan left open:

**Schema**
- The widen WORKS: `deploy-schema.mjs` gained `widenMemo` (a column
  marked `widen: true` is raised, never lowered; the PUT must name the
  attribute's type or Dataverse refuses it). `ben_assigneesjson` is
  100 000 on dev, so a shared action holds 500 people — no fallback cap.
- The token for the deploy came from yesterday's sign-in, refreshed
  with `exchange-token.mjs` against the same resource. No new sign-in.
- `ben_ltkattachment` also carries `ben_at` (when it was added).

**The status rule**
- A state missing from the site's palette paints with a FIXED default
  (purple for Flagged), not the Info colour the plan named: a flag must
  never look like an information chip. The starter palette gained
  "Flagged"; a site with its own stored palette picks or adds an entry
  in Settings → Priorities → Status.
- The stamp on the row has three readings: an ISO moment, "-" (known,
  none yet) and empty (a row from before the stamp). Empty rows are
  filled from one read of the comment events and written back 25 a
  load, once per session each.
- The strict / ratio toggle is gone from the ⋮ menu; a stored
  preference or a view link that carries one is read and ignored.
- The Improvement register shows a chip for flagged AND off track (its
  reasons on hover); on track shows none.
- The Gantt ritual card now reads metric states too (it used to colour
  from flags and actions only), through `statusLoad.ts`.

**The executive summary**
- The head reads "Executive summary · <org>" over "Pillar : Sub-pillar",
  with the year as a pill. The step counter no longer wraps.
- Metric tiles: four, then "+n". A good / bad or picklist metric shows
  its state as a block instead of a line.
- An initiative row also says its status in words and lists its
  reasons; the mock-up showed colour alone.
- The ⋮ on a card is offered to whoever manages the org, on priorities
  that are the org's own.

**Actions**
- Shared-action writes are MERGED at the store (not in the plan): the
  write reads the row and lays only the parts this screen changed over
  it. Without it, two people ticking their own parts from their own
  screens undid each other. This is the one change that touches every
  action save — it now always reads the row first (it did so already
  for the comment merge).
- Ticking a second person no longer unticks the first. Reassigning is
  untick one, tick the other.
- People who are not a tick box in the grid (a team, assignees from
  outside the meeting) sit as chips under it — twelve, then "+n more".
- "Duplicate…" is in the dialog's footer on the Action card, My day and
  the Improvement Gantt's editor. It is NOT on a row ⋮ (the rows have
  none) and not on the other cards that raise actions (5 Whys, Agenda…)
  — their dialogs do not offer it yet.
- "✉ Message": the panel is the host's, opened over the dialog; the
  dialog's focus trap now yields to a second modal. Escape inside the
  panel's search does not close its list (the dialog swallows Escape);
  a click elsewhere does.
- The flags' row: "⚑ Support required" is wider than "Escalated", so
  the two flags more often take a line of their own under the dates.

**Attachments**
- A file uploads as soon as it is picked or dropped, with no caption
  (its name shows); a link takes a caption. Captions cannot be edited
  afterwards — remove and add again.
- On an action the list shows for a SAVED action only.
- No preview: a file downloads, a link opens in a new tab.

**Document filters**
- The organisation group, when a site shows it, now sits FOURTH (after
  status, type and process area) — it used to lead.
- Featured terms live on the column in the site's dictionary
  (`SiteColumn.featured`: scope → term ids), set from a ★ in the Filter
  cell. A tree replaces the pills only for a vocabulary that is three
  or more levels deep AND past 14 terms; Document type becomes a tree
  on a site where it is that deep, with the featured pills above it.
- NOT verified in a browser: the Documents screen needs SharePoint, so
  the tree and the ★ editor were built against the tests alone. Ben's
  check: UAT-DOC-093.

**Verified here**
- 1183 tests, both typechecks, the import, dialog and chunk gates, the
  build.
- In the harness: the executive summary at TV, laptop and phone widths
  (`walk.html?open=P1`); the action card and dialog — shared action,
  parts, add a team, message, duplicate, recently completed
  (`actionboard.html?shared=1`); the attachments list (`attach.html`).
- Everything hosted is Ben's: UAT-PRI-012, PRI-013, IMP-007, IMP-008,
  IMP-009, SET-015, ACT-008, ACT-009, ACT-010, RIT-009, DOC-093.

**Open**
- Ellen's seven document types: are they terms in the Document type
  set? If not, they are added in the term manager before they can be
  featured.
- Release day reads mostly off track. Leaders should hear first.

## Changes from Ben's walkthrough (2026-11-17, on dev at cc4fe17)

Ben walked the build check by check; these came out of it and are built.

**Status and the summary**
- The wall's circles gained a KEY under the "Priorities" row label; the
  grey "· n" total beside them went (it repeated their sum).
- ONE initiative row (`improvement/initiativeRow.ts`): the priority
  popup, the Improvement list and the executive summary draw the same
  header and row. Status in small caps above the title — "⚑ SUPPORT
  NEEDED" (not "Flagged · recovery needed"), "OFF TRACK", "ON TRACK" —
  with a small i for the reasons (hover; press on a wall screen). Stage
  = the PDCA pill with a small disc. Actions = three circles in a fixed
  column, Done / Future / Late in the header over them. Primary = a
  heavy border and the star alone. The popup lost its group headings:
  primary, support needed, off track, on track. The Improvement list's
  status pill and template chip went (the template is in the grey
  line); "Primary metric" became sparkline tiles.
- The board header's chip reads "⚑ Support needed".
- The summary's open / close control is a round chevron button; the
  summary no longer takes the browser full screen.
- The Flag dialog's suggestion reads "e.g. a decision".

**Shared actions**
- A person's part is recorded ON their own box; the separate Parts list
  and every explanatory sentence went. On a SAVED shared action the
  people are sign-off boxes (press = that person's part; a small ✕
  takes them off) and only the people on the action are listed —
  everyone else is behind the search. "n / n people completed" sits at
  the right of the "＋ Cascade to team…" / "＋ Add support" line.
- A shared action closes ONLY when every part is done
  (`holdOpenUntilAllParts`, `tickPart`): Closed is greyed until then, a
  board's tick records the viewer's own part, a drop into Done is
  refused, and the store holds the same line. This REVERSES the plan's
  "anyone who can edit may close for all". Anyone who can edit may
  still press another person's box in the dialog.
- "Add a team" is "Cascade to team".

**The action dialog**
- "⚑ Flag for support" is a button in the title row
  (faint in the flag's colour, full once flagged); the tick is gone.
- Confidential shares the dates' row.
- The right side's headings read alike, and the side folds to a rail
  (remembered in the browser).
- Message, Duplicate and Cancel sit behind a ⋮ menu at the right of the
  title row, on a saved action only; the footer keeps Close and Save.

**Attachments**
- The document register's type chips (PDF, DOCX…; LINK for a link);
  Add file and Add link together under the heading.

**Not yet checked by Ben:** owners in the popup (1), Cascade to team
against a real reporting line (9), the document filters (12).

**Open**
- "Flagged" survives as the middle count's label and in the wall's
  key; only an initiative's status says "Support needed".
- The dialog's flag button uses the default purple, not the Settings
  colour for Flagged.

