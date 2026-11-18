# Priorities — five proposed changes: review, decisions and design

Source: Ben's six-page deck "cascadedprioritiesapp.pdf" (2026-11-18).
Reviewed the same day against v0.96.0. Each feature was checked in the
code before any question was asked; Ben then answered fifteen questions
one at a time. Nothing here is built.

**All five are app-only: no Dataverse schema change.** Two of them
change what older builds can read, so "Lock every older build" follows
the release (see Release).

## Decisions of record (Ben, 2026-11-18)

| # | Question | Decision |
|---|---|---|
| 1 | Do a priority's own actions and metrics affect its status? | **Yes, both count.** |
| 2 | An action raised on an adopted priority shows where? | **Only at the org where it was raised.** |
| 3 | Who may raise an action on a priority? | **Org managers only** (the Add initiative rule). |
| 4 | Open priority actions when the priority is completed or archived | **Warn, then leave them open.** |
| 5 | How own metrics combine with initiative metrics | **They add together**: own first, then the primary's starred metrics, or the ticked ones. |
| 6 | Where an own metric's numbers come from | **Typed in, or linked to a value driver.** |
| 7 | Numbers beside a sparkline | **None.** Title and chart only; numbers in the tooltip. |
| 8 | The "Priority only view" | **Retired everywhere.** |
| 9 | How far ahead Edit priority asks for a sub-pillar | **Only years already set up.** |
| 10 | Sub-pillar inheritance in Settings | **One follows one.** No split, no merge. |
| 11 | A waiting cascade | **A tile in its own row; the pop-up list is retired.** |
| 12 | Who decides proposals and cascades | **Kept different**: proposals the owner and admins; cascades also the owner's direct reports. |
| 13 | Messages | **Offered at each step**, never automatic. |
| 14 | The "Other" row | **True orphans only**, fixed with "Place under…". |
| 15 | The phone | **Left as it is.** |

## What the review found (before the questions)

- **Actions.** An action can belong to a meeting or an initiative,
  never a priority (`LinkKind = "ritual" | "initiative"`). The three
  circles on a priority tile count INITIATIVES by status, not actions.
  The Actions tab is replaced by "No initiatives linked yet" when a
  priority has none.
- **Metrics.** Objectives are either/or today: a live primary
  initiative's starred metrics, else the ticked ones
  (`objectiveValues`). A metric already has an objective text
  (`TemplateMetric.objective`), shown as "Name: objective".
- **Visuals.** The line under a small chart is "reading · plan", not
  the plan alone. The page already loads every metric's last twelve
  readings, so charts in tiles cost no extra reads. The "Priority only
  view" has a chart box that was never filled.
- **Pillars.** Start period and planned end do not interact with the
  sub-pillar at all. A sub-pillar "carries over" when the same row
  spans both years or a row that follows it is live. A brand-new
  sub-pillar has no way to name the one it follows.
- **The zone.** Proposals are a row; cascades are a header chip and a
  pop-up; orphans are a line of links. Three faults: the orphan links
  open Edit with no permission check; a proposal under a hidden
  sub-pillar is counted in the chip but not shown; a pillar FILTER
  reports priorities as orphans.

## 1. Actions on a priority — 14–18 h

**What people see**
- In the priority popup's title row: an outline **Add action** button
  to the left of the solid **Add initiative** (one solid button per
  surface). On the tile's ⋮ menu: **Add action…** under Edit…. Both
  only for people who manage the org, on an active priority. An
  adopted tile, which has no ⋮ today, gets one holding this item alone.
- The standard action dialog, with a "Linked to" chip reading
  "Priority · <statement>". Action, Who and Due are required as on any
  new action.
- The **Actions tab always shows**. It leads with a "This priority"
  section, then a section per initiative as now. A priority with no
  initiatives shows its own actions and Add action.
- The action shows in its people's My day and Actions list labelled
  with the priority; in the Gantt under "This priority"; in the
  executive summary as action circles on the priority's own line.
- Completing or archiving a priority with open actions of its own
  asks first ("3 actions on this priority are still open") and leaves
  them open.

**Rules**
- The action records the org it was raised at and shows on that
  priority **only at that org** (decision 2). So an adopted priority
  can read off track at Weipa and on track at BSL.
- **Status.** A priority is off track when any of its initiatives is,
  or when one of its own actions is late; the reason reads "1 late
  priority action" behind the ⓘ, as initiative reasons do.

**How**
- A third link kind, `"priority"`, stored in the existing
  `ben_instanceid` as `priority:<id>` (the `improvement:<id>` key is
  the precedent). The raising org rides the action's existing context
  fields. No new column.
- `shared/schema/actionLinks.ts` (`homeBoardOf`, `currentLink`,
  `applyLink`, labels), `shared/ui/actionUi.ts` (the chip),
  `app/src/store/actions.ts` (a reader for the key; no board stamp),
  `priorities/actionsTab.ts` + `actionsTabModel.ts` ("This priority"
  home), `lifecycle.ts` and `prioritiesScreen.ts` (button, menu item,
  the warning), `improvement/status.ts` (`priorityStatus` takes the
  priority's own inputs), `improvement/gantt.ts`, the hub's label,
  `actions/message.ts` (a link that opens the priority).
- Moving the action to an initiative through "Linked to" already
  works: the key is rewritten.

**Risks**
- An older build reads the new key as an unknown board. Lock older
  builds.
- Ratings can change on boards once people add actions (decision 1).

## 2. Metrics on a priority — 18–24 h

**What people see**
- The popup's tab is **Objectives**, always. Top section **This
  priority**: the initiative metric editor (name, objective, unit,
  plan, limits, cadence, or a link to a value driver) with ＋ Add
  metric, and "Values…" on each row opening the values grid. Below it,
  as today: the primary initiative's metrics card, or the tick list of
  initiative metrics.
- On the tile and everywhere objectives show: the priority's own
  metrics first, then the primary's starred metrics or the ticked ones
  (decision 5).

**Rules**
- **Status.** An own metric short of plan or outside its limits makes
  the priority off track, in the same words as an initiative's.
- Defined and filled in by people who manage the OWNING org. An org
  that adopted the priority sees them read-only.
- A company-level priority has no site tree: its metrics are typed.
- About eight own metrics per priority (the record's size).

**How**
- Definitions as `{ own: TemplateMetric }` entries in the existing
  `ben_objectivesjson`; readings in the existing series table at a
  location of their own (`"priority"`, `<priorityId>/<key>`), as the
  value-driver tree does with `"vdt"`. `openValueGridDialog` and
  `renderMetricsList` are reused as they are.
- `priorities/model.ts` (`parseObjectives`, `objectiveValues` becomes
  additive), `store/priorities.ts`, `lifecycle.ts` (the tab),
  `improvement/metricValues.ts` (a loader for the new location),
  `improvement/status.ts`, `docs/architecture.md`.

**Risks**
- An older build drops the own entries when it saves a priority. Lock
  older builds.
- One more read per own metric at page load.

## 3A. Objective visuals — 9–12 h

**Small charts (popup rows, the Improvement register, the executive
summary)**
- The number line under the chart goes; the chart takes its height
  (22 → about 36 px in the same row). Name above, chart below, nothing
  else. Reading, plan and limits are in the tooltip. A metric with no
  trend (good / bad, a picklist) keeps its coloured state chip.

**The main page**
- The Objectives row is removed. Each priority tile carries its
  objectives under the circles: two charts to a row, as many rows as
  needed, each titled by the objective text, or the metric's name when
  it has none. One line, cut with "…", whole text in the tooltip. No
  numbers (decision 7).
- A toggle **Objectives** to the left of "▶ Executive summary", on by
  default, remembered per person and org. Off shows statement and
  circles alone.
- The kebab's View section goes. A saved or shared "Priority only"
  view, and a board card set to it, opens with Objectives off. The
  board card's setting becomes "Show objectives".

**How**
- `improvement/initiativeRow.ts` (`metricTile`), `prioritiesScreen.ts`
  (`priorityCard`, the row, `dynamicCard` removed, the toggle),
  `priorities/prefs`, `viewLink.ts`, `controls/CardSettings/registry.ts`,
  `style.css`, `docs/ui-standard.md` §5.3 rewritten.

**Said plainly**
- A wall screen cannot hover, so with no numbers nobody in the room
  can read an actual value from the page; the chart's bands and colour
  carry the meaning. This was Ben's choice with that stated.
- Tiles become uneven in height. The poster and the phone are
  unchanged.

## 4. Sub-pillar by year — 12–16 h

**Edit priority**
- Order: Statement, Owner, Start period, Planned end, **Sub-pillar**,
  Cascade to, Notes.
- One Sub-pillar select for the start year. A further select,
  "Sub-pillar from 2027", appears ONLY for a year where the choice
  cannot carry: its sub-pillar ended and nothing follows it. A year
  where the same sub-pillar continues, or one follows it, asks
  nothing.
- It looks ahead only through years already set up in Settings
  (decision 9). A later restructure puts affected priorities in the
  "Other" row.
- Required fields carry the red asterisk; Save is disabled until they
  are filled; the two helper sentences go.

**Settings → Priorities → pillars**
- A sub-pillar that starts in the year shown and follows nothing gets
  a **Follows** select listing the sub-pillars that ended the year
  before and are not already followed. One follows one (decision 10).

**How**
- A pure planner in `priorities/model.ts` over the years; the answer
  is stored with the existing `pillarId` + `placements` — nothing new.
  `dialogs.ts` (the form), `prioritiesScreen.ts` and `lifecycle.ts`
  (callers), `settingsTab.ts` (Follows).

**Risks**
- Custom period labels: the planner must walk Settings' own list of
  periods, not assume calendar years.

## 5. The decision zone — 16–20 h

**What people see**, at the foot of the page, each row open by
default and absent when empty:
- **Proposed** — as now.
- **Cascaded to you** — each waiting cascade a dashed tile under the
  sub-pillar it would land in. Clicking it opens the priority's
  overlay with **Accept** (solid), and Accept & customise…, Hold… and
  Decline… as outline buttons. "Reject" becomes "Decline", the
  proposals' word. Hold and Decline ask for a reason, as now. The
  pop-up list is retired.
- **Other** — priorities whose sub-pillar is not valid in the year
  shown, each a tile with **Place under…** offering that year's
  sub-pillars. A filtered view reports nothing here. An adopted
  priority says which org places it.
- One header chip, "N awaiting a decision", scrolls to the zone. It
  replaces the two chips.

**Rules**
- Proposals: the owner and admins decide. Cascades: the owner, admins
  and the owner's direct reports (decision 12). A tile shows its
  buttons only to those who may use them.
- Anything raised from below is a proposal; anything sent from above
  is a cascade. (Today a direct report's as-is pull sits in the
  cascade pop-up and their customised pull in the Proposed row.)
- After proposing, cascading, accepting, declining or holding, the
  app OFFERS the Teams / email panel addressed to who needs to know:
  the org's owner, or the sender. Send or skip (decision 13).

**Fixed on the way**
- "Place under…" and the orphan tiles check the right to manage.
- A proposal under a hidden sub-pillar is no longer counted but
  invisible.
- To check at build: a customised pull by someone who cannot approve
  appears to mark the cascade accepted at once, so the sender reads
  "customised" for something still only proposed.

**How**
- `prioritiesScreen.ts` (the zone, one queue), `lifecycle.ts` (the
  overlay's cascade buttons, `cascadeReview` kept only for the
  executive summary's last step), `model.ts` (the orphan rule),
  `style.css`. The message panel is the one actions use.

## UI principles applied

- One solid primary per surface; everything else outline or behind ⋮.
- A switch that changes what is on screen sits in view, never in a
  menu (the Objectives toggle).
- Sentence case. No helper sentences under fields.
- Required fields: a small red superscript asterisk, and the primary
  button disabled until they are filled.
- Search-and-pick is a type-ahead.
- Status is a word or glyph plus colour, colours from the site
  palette.
- Counts and toggles inline.

## Order and effort

About 70–90 hours, in four tranches to dev:

1. **Visuals and the zone** (3A, 5): the most visible, no change to
   what is stored. 25–32 h.
2. **Sub-pillar by year** (4). 12–16 h.
3. **Actions on a priority** (1), with the status rule. 14–18 h.
4. **Metrics on a priority** (2). 18–24 h.

Tranches 3 and 4 change the status rule and what older builds can
read, so they should reach production in one release, followed by
"Lock every older build".

## Release

- App-only. No solution import.
- After it: "Lock every older build" (the `priority:` action key; own
  metrics in the objectives record).
- UAT: new cases in `docs/uat/priorities.md` for each feature;
  PRI-001, 007 and 008 rewritten for the tile charts and the toggle.

## As built — tranche 1 (2026-11-18, on dev, NOT released)

**3A. Visuals.** `metricTile` lost its number line everywhere it is
used (charts 36 px in rows, 52 px in the summary); `objectiveCharts`
puts a priority's objectives in its tile; the Objectives row,
`objectiveLinesFor` and the "Priority only" card (`dynamicCard`) are
gone; the toolbar has the Objectives switch. The stored word is kept:
"dynamic" (the retired view) = objectives off, so saved preferences,
shared links and the board card's setting (now labelled "Objectives:
Shown on each priority / Hidden") still read.

**5. The decision zone.** `waitingAt` and `orphansOf` (model, tested);
rows "Proposed" and "Cascaded to you" open by default; one chip, "N
awaiting a decision"; a waiting cascade or proposed pull opens the
priority's popup with Decline…, Hold…, Accept & customise… and Accept
(`decideCascade`, `openPriorityOverlay(…, decideAt)`); the message
panel offered after each step (`stepMessage.ts`, `stepMessageModel.ts`,
on `openMessagePanel`, split out of the action message dialog).
- **Named "Unplaced", not "Other".** The page already has an "Other
  (unlinked initiatives)" band; a second "Other" would be two things
  under one word.
- **Confirmed and fixed:** a customised pull by someone who cannot
  approve marked the parent "customised" at once. It is now marked when
  the proposal is accepted.
- **Left as found:** a proposed pull that the owner puts ON HOLD shows
  afterwards under "Cascaded to you" (on hold), where any manager may
  answer it — the hold overwrites who raised it. Small; say if it
  should stay with the owner.
- The phone and the executive summary's last step keep the old list.

**A way to see it.** The Priorities page could not be opened outside
Power Apps at all. `app/harness/dataverseStub.ts` and `appStub.ts` now
stand in for the SDK (an in-memory Dataverse, a signed-in person), and
`harness/priorities.html` seeds a company, sites, pillars that change
between 2026 and 2027, a proposal, cascades, a pull and an unplaced
priority through the stores' own save functions. Seen there: the zone,
the popup's answers, Accept, Hold with its offered message, "Place
under…", the 2027 follow-on. `?year=2027`, `?org=PacOps`, `?as=u2`.

UAT: PRI-001 rewritten; PRI-002 and PRI-010 updated; PRI-014 added.

## As built — tranche 2 (2026-11-18, on dev, NOT released)

**4. Sub-pillar by year.** `subPillarPlan`, `placementsFromRows`,
`picksOf`, `lastSetUpYear`, `followCandidates` (model, tested). The
form reads Statement, Owner, Start period, Planned end, Sub-pillar,
Cascade to, Notes; it is handed every pillar row, not one year's; the
first select is the START year's, and "Sub-pillar from <year>" appears
only where the choice cannot carry. Required fields carry the
asterisk; Save is disabled until they are filled; the two helper
sentences are label tooltips.
- **Kept, in a new place:** moving a priority to another sub-pillar
  from a later year by choice. It was a question after Save ("from
  2027, or for every year?"); it is now "＋ Change from <year in
  view>" in the form, with Remove to take it back.
- **Settings:** a sub-pillar that starts in a year shows "Follows: …"
  when a sub-pillar ended the year before and nothing else follows it.
- Seen in the harness (`priorities.html`, `prioritysettings.html`):
  the forced second select, the carry-over through a follower, a
  chosen move from 2027, a saved priority reopening on its choices,
  and the Follows select in the 2027 lens.

UAT: PRI-011 rewritten.

## As built — tranche 3 (2026-11-18, on dev, NOT released)

Actions on a priority. App-only: no schema.

- **The key.** `priority:<priorityId>@<org mark>` in `ben_instanceid`
  (`shared/schema/actionLinks.ts` `priorityKey`, `priorityOfKey`,
  `orgMark` — eight hex of the org key, so the key stays short). The
  org's NAME rides `context.sourceId`, `context.source` is `"priority"`.
  No initiative id, no board stamp (`store/actions.ts` `boardOf`,
  `stampedBoard`), read by `actionsForPriorities()`.
- **Which org.** `actionOrgOf(p)`: the org in view when the priority
  shows there ADOPTED, its own org otherwise. So an action raised at
  Weipa on an adopted company priority shows at Weipa only (decision 2),
  and one raised on a site's own priority shows wherever that priority
  is opened.
- **Who.** `ctx.own.canRaise(p)`: an active priority, and the viewer
  manages that org (`canManageOrg`). Anyone signed in may still open and
  edit an action they can see, as on a board.
- **Where it is raised.** Popup title row: outline "Add action" left of
  the solid "Add initiative" (left out while the Actions tab shows — the
  card's own ＋ Add action is the one there). Tile ⋮: "Add action…"
  under "Edit…". An adopted tile gets a ⋮ holding that item alone.
  `priorities/priorityActions.ts` opens the standard dialog with the
  action already keyed, so "Linked to" reads PRIORITY · the statement
  (named through `ActionLinkContext.resolve`, one row read on demand).
- **Actions tab.** Always mounts when there is anything to show or
  raise. "This priority" first (`ActionSection.first`), then a heading
  per initiative. The new-action select is "Linked to" (was
  "Initiative") and offers "This priority" first to who may raise. With
  no home to offer, the card hides its Add roads
  (`ActionBoardEditor.setAddable`). Gantt: one more group ahead of the
  initiatives (`GanttOpts.extraGroup`).
- **Status.** `priorityStatus(states, own)`: a late own action makes the
  priority off track; a priority with no initiatives is on track once it
  has an action of its own. The reason rides the circles' tooltip
  ("… · 1 late priority action"). The tile shows "N actions", or "N
  late" in the off-track colour. The executive summary row shows
  "Priority actions" Done / Future / Late beside the initiative circles.
- **No roll-up.** A priority's own actions count toward THAT priority at
  THAT org. They do not count toward the priority it was cascaded from,
  unlike initiatives. This follows decision 2.
- **Complete / Archive.** "N actions on this priority are still open.
  They stay open." above the reasons; nothing is closed.
- **Elsewhere.** Hub group "Priority · <statement>" (`screens/hub.ts`;
  `sourceLabel` falls back to "Priority", never the key). A message
  about the action links to Priorities (the key holds an org mark, not
  the org, so it cannot open that org's board).
- **Not seen in the hosted player.** Checked in the harness
  (`priorities.html`): raise from tile and popup, the chip, late status,
  Actions tab list and Gantt, the warning, the summary row, an adopted
  tile, a plain user. UAT-PRI-015.

## As built — tranche 4 (2026-11-18, on dev, NOT released)

Metrics on a priority. App-only: no schema.

- **Stored.** `Priority.ownMetrics` (`TemplateMetric[]`), written as
  `{ own: … }` entries AHEAD of the picks in `ben_objectivesjson`
  (`priorities/model.ts` `parseOwnMetrics`, `objectivesJson`). At most
  eight (`OWN_METRIC_CAP`), and the column is refused past 3,900
  characters with a plain message.
- **Readings.** `ben_ltkcardseries` at board `"priority"`, card
  `<priorityId>/<metricKey>` (`ownSeriesCard`, kept inside the column's
  80 characters); a metric picked from the value driver tree reads the
  driver's series instead (`improvement/metricValues.ts`
  `ownMetricLocation`, `loadOwnMetricLasts`, `ownMetricValues`). The
  value rule is one function now, `metricValueOf`, shared with an
  initiative's metrics.
- **Objectives tab.** Always named "Objectives". "This priority" first:
  the initiative metric editor (`renderMetricsList` with `noun:
  "priority"`, no ★, no Link… / Promote…) and "Values…" on each row
  opening the values grid. Then "★ <primary>" with its metrics card, or
  "From its initiatives" with the tick list.
- **Who.** The OWNING org's managers, on an active or proposed
  priority. Everyone else, an adopting org included, reads them: a
  light, "Name: objective", plan and actual, and a read-only grid.
- **Company level.** No site, so no tree: "＋ Add metric" alone.
- **Everywhere objectives show.** The priority's own metrics lead, then
  the primary's starred or the ticked ones (`objectiveValues` is
  additive): tile charts, executive summary, poster.
- **Status.** An own metric short of plan or outside its limits makes
  the priority off track, at every org that shows it (the metric is the
  priority's, not the org's). The reason rides the circles' tooltip.
- **The metric form.** On a priority it is titled "Add metric", its
  three hint sentences are tooltips, Name carries the red asterisk and
  the button waits for it (both forms). Found on the way: a form field
  hidden by its form still showed (`.app-field` set `display: flex`
  over the `hidden` attribute), so "Options" showed for every tracking
  and unticking a Row did not hide its field, on the initiative form
  too. Fixed with one rule, `.app-field[hidden]`.
- **Left as found.** Removing a metric leaves its readings in the series
  table, as removing an initiative metric does. The values grid's note
  still says "this card's own readings".
- **Not seen in the hosted player.** Checked in the harness: add a
  metric, enter values, the tile chart and status, the read-only view.
  UAT-PRI-016.

## Not in this round

- The phone layout (decision 15).
- Splitting or merging sub-pillars between years (decision 10).
- Linking an existing action to a priority from the action dialog's
  "Linked to" search: priority actions are raised from the priority.
