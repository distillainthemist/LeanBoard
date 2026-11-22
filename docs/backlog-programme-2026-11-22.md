# The backlog programme — Ben's selection of 2026-11-22

Ben went through the whole backlog as a checklist. He marked 50 items
"work on now" and 23 "remove" (the removals are recorded in
`backlog.md` → Done / no longer tracked). This is the order and the
size for the 50. **Nothing here is built yet.**

Sizes are estimates from reading the code, not measurements. The whole
set is roughly **190–270 hours**. One item is schema-carrying (E12);
the rest are app-only as far as I can tell today.

The ids (C1, D4…) are the checklist's.

## Order

Small and certain first, so each tranche can reach dev and be checked
before the next. Decisions are asked one at a time, tranche by tranche,
not all up front.

### Tranche 1 — small fixes, nothing to decide but two words (22–30 h)

| Id | Item | Size |
|---|---|---|
| E3 | Escape in the message panel's search closes its list | 1 h |
| D6 | The values grid's note when opened from a priority | 0.5 h |
| E4 | "Flag for support" uses the colour chosen in Settings | 2 h |
| E7 | Rename the kanban column from "Verify" | 1 h |
| C7 | Rename the middle status count from "Flagged" | 1 h |
| C3 | The four card dialogs disable Add until the required fields are filled | 2–3 h |
| C4 | Documents forms: the "Required" tag becomes the red asterisk | 2–3 h |
| E9 | A per-column card cap on the tile kanban | 2 h |
| F8 | A "Closed" filter on the Ingestion tasks panel | 2 h |
| F7 | Ingestion: retry with back-off on throttled calls | 2–3 h |
| F9 | Ingestion: a renamed term opens its cell selected | 2–3 h |
| D4 | Batch the spec reads for a priority's own metrics | 1–2 h |
| D3 | Bound how far back metric readings are read | 2–3 h |
| D2 | The Metrics card chart opens on the page holding the latest reading | 2–3 h |

Decisions: the new word for "Verify" (E7); whether the count becomes
"Support needed" (C7).

### Tranche 2 — rules that need your answer, then small builds (18–28 h)

| Id | Item | Size |
|---|---|---|
| C1 | A priority's own actions roll up to the priority it was cascaded from | 2–3 h |
| C5 | Direct reports see confidential initiatives | 1–2 h |
| C6 | Who may press another person's sign-off box | 1–2 h |
| C8 | Removing a metric: keep its readings, or delete with a confirmation | 2–3 h |
| D7 | Flag a priority open more than a year with no planned end | 2 h |
| D8 | An initiative with no period label shows in every year | 2–3 h |
| D10 | Custom periods: keep the label list current | 2–3 h |
| E5 | The chosen action view follows the person across sessions | 2–3 h |
| E17 | Stage reverts: an approver, and old snapshots marked superseded | 4–6 h |
| G8 | Secondary organisations see a ritual in Settings | 2–3 h |

Every row here starts with a question to you.

### Tranche 3 — priorities and metrics (20–29 h)

| Id | Item | Size |
|---|---|---|
| D1 | A mark for a stale metric, and whether it counts toward status | 4–6 h |
| D5 | Link or promote a priority's own metric into the value driver tree | 4–6 h |
| D9 | Re-parenting a priority carries its cascades | 3–5 h |
| D11 | Phone and the executive summary's last step use the decision zone | 4–6 h |
| C2 | A style for canvas labels: size, bold, colour | 4–6 h |

### Tranche 4 — actions (25–36 h)

| Id | Item | Size |
|---|---|---|
| E1 | "Duplicate…" on the other action-raising cards | 2–3 h |
| E2 | Attachment captions editable, and a preview | 4–6 h |
| E6 | Styled PNG and SVG download in the Gantt view | 3–4 h |
| E8 | Tile pictures lagging one edit on non-live boards | 2–3 h |
| E10 | A count of due-date moves by reason, and per-site reasons | 4–6 h |
| E11 | Evidence attachments on actions | 6–8 h |
| E13 | Page the organisation-wide actions read | 4–6 h |

### Tranche 5 — type-ahead search pickers (25–34 h)

| Id | Item | Size |
|---|---|---|
| F1 | Document person fields (Add, Edit properties, ingestion, reviewers) | 6–8 h |
| F2 | Users register "Search directory and add" | 3–4 h |
| F3 | The meeting wizard's owner and participants | 4–5 h |
| F4 | Organisation owners | 2–3 h |
| F5 | The other ten places | 10–14 h |

### Tranche 6 — documents and cards (29–42 h)

| Id | Item | Size |
|---|---|---|
| F6 | Doc cards refresh (`leanboard-doc-cards-plan.md` parts A and B) | 16–24 h |
| F11 | A parent term in a filter includes everything beneath it | 3–4 h |
| G1 | Narrow four card tile layouts for phone | 6–8 h |
| G3 | Capture card inline add-row | 4–6 h |

### Tranche 7 — KPI depth (22–32 h)

| Id | Item | Size |
|---|---|---|
| E14 | Picklist option library, and a target-state row for picklist KPIs | 8–12 h |
| E15 | Standalone KPI cards as good / bad or picklist | 6–8 h |
| E16 | Simulate revived | 8–12 h |

### Tranche 8 — the two large ones (42–61 h)

| Id | Item | Size |
|---|---|---|
| C9 | Reporting (P10): a page of four tiles over drill lists, four ritual cards, period comparison, export | 30–45 h |
| E12 | Confidential actions in a separately secured table with per-record sharing | 12–16 h |

E12 is SCHEMA-CARRYING and its whole point is Dataverse security, which
only a second account in the hosted app can prove. It is the one item
I would ask you to confirm again before starting.

## How it runs

- One tranche at a time: build, gates, push to dev, a test list for
  you, then the next. A release whenever you say "Cut the release".
- Releases follow the corrected order (tag, push the tag's build to
  dev, then push the tag).
- Each item updates or adds its UAT case in the same commit.
- An item that turns out larger than sized is said before it is built,
  not after.

## Walked with Ben before building

Ben, 2026-11-22: every item of a tranche is stepped through with him,
one at a time, before any of it is built. His answers:

### Tranche 1

- **E7** — the kanban column "Verify" becomes **"Endorse"**.
- **C7** — "Flagged" becomes **"Support needed" everywhere** it names
  the initiative state: the summary's circle label, the tile tooltip,
  the wall's key, the Improvement filter pill ("⚑ Support needed
  only"), the colour's name in Settings, the flag dialog and its
  message subject. Documents' "Flagged for review" is untouched.
- **E3** — confirmed as proposed: Escape closes an open type-ahead
  list over a dialog (fixed at the cause, for every such list); the
  dialog itself still never closes on Escape.
- **D6** — the note on a priority's grid reads "<cadence> · <unit> ·
  this priority's readings. Targets and limits set here carry forward
  until changed." The initiative's and the driver's lines are unchanged.
- **E4** — BOTH the "Flag for support" button and the ⚑ on action rows
  take the colour chosen in Settings → Priorities → Status.
- **C3** — on the Risk matrix, Heatmap, 5 Whys and Fault tree entry
  dialogs: the entry's own required field carries the asterisk and
  Add / Save is disabled until it is filled (tooltip names what is
  needed); Who and Due gain the asterisk ONLY once an action is being
  typed, and Add then waits for them; the red marks and the "Required
  before Add" line go.
- **C4** — Documents forms (Add, Edit properties, ingestion defaults,
  the check-in and lifecycle comments): the "Required" tag becomes the
  red asterisk; the button is disabled until every required field is
  filled, tooltip "Still needed: …"; a section holding an empty
  required field opens by default; the "Required before Save" line
  goes. "Derived" and the ingestion grid's ✱ stay.
- **E9** — ALREADY BUILT (v0.96.0, `ActionBoard/tileFit.ts`: each
  column shows the cards that fit and "+N more"). The backlog line was
  stale. Nothing to build.
- **F8** — the Ingestion tasks panel gains a collapsed "Closed tasks ·
  n" heading under "Open tasks": newest first, name / destination /
  date ended, the first 20 with "Show all n"; a row opens the task's
  sheet and its log; the same visibility as open tasks; the badge still
  counts open ones only.
- **F7** — INGESTION RUNS ONLY: a call refused as throttled is retried
  up to three times (2 s, 5 s, 10 s); nothing else is retried; a run
  that has been throttled drops from eight files in flight to four; a
  file still throttled is refused "SharePoint is busy. Run again in a
  few minutes." The throttle's shape through the connector is unseen —
  an unrecognised one behaves as today and is logged.
- **F9** — the ingestion grid keeps each term's ID with its name: a
  cell opens with the right term selected by ID, and SHOWS the term's
  current name; a renamed term does not mark the file changed. To
  confirm on dev first: that the list feed returns the term ID beside
  the label (if not, Ben is told before anything else is built here).
- **D4** — confirmed: one request reads the values and the plan history
  of every priority metric; nothing visible changes.
- **D3** — readings are read in a window by cadence: shift or daily 6
  months, weekly 2 years, monthly 5 years, quarterly or yearly
  everything; a metric with nothing in its window gets one small
  request for its latest reading. Accepted edge: a rarely filled
  metric can draw fewer than 12 sparkline points.
- **D2** — the Metrics card chart shows the last 12 readings THROUGH TO
  TODAY (the gap after the last reading is drawn); when the last
  reading is more than 13 periods old it opens on the readings and the
  subtitle says "last reading <date>". "Update values" still opens the
  grid around today.

Ben, 2026-11-22: "build tranche 1".

## As built

(Filled in tranche by tranche.)
