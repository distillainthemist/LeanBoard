# UAT — Priorities

The cascade wall: pillars, priorities, objectives, the present view and the walk.

## Journey 1 — The wall

### UAT-PRI-001 — The Objectives row lists metrics only
persona: viewer
modules: priorities/prioritiesScreen.ts
preconditions: a wall with three or more priorities in view: one whose primary initiative has starred metrics with values, one whose primary initiative has none starred, one with no primary initiative
steps:
1. Priorities tab in the matrix view; read the Objectives row under each column.
2. Switch to the present view and step to the same priorities.
expected: the Objectives row shows "Name: objective" with plan / actual and a traffic light for each starred metric, and is BLANK under a priority with no starred metric or no primary initiative — no "No primary initiative" or "No metric value yet" line anywhere in the row; the present view shows the same lines and the same blanks

### UAT-PRI-002 — The ⋮ menu: no period, a health-chip toggle
persona: viewer
modules: priorities/prioritiesScreen.ts priorities/model.ts
preconditions: a wall with at least one sub-pillar that has a submitted health check
steps:
1. Priorities tab → ⋮ in the toolbar: read the sections.
2. Change the year with the year pill in the header.
3. ⋮ → Show → Health check scores; close and reopen the app.
expected: the menu has Status · View · Roll-up rule · Show · Share and no Period section — the year pill (and the phone head's Period select) is the one period door; Health check scores is off by default and the headers carry no chip; on, the chips appear and the choice is remembered for this person across sessions
