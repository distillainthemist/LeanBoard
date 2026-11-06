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

## Journey 2 — Who manages an org, pulling from above (issue round 2026-11-06)

### UAT-PRI-003 — An owner's direct reports manage the org; a report once removed does not
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts
preconditions: TWO accounts — a site whose owner (Settings → Organisation) is A; B reports to A in the directory; C reports to B; C is not an owner anywhere
steps:
1. As B, open Priorities on the site; read the toolbar; open a site priority's ⋮.
2. As C, open the same site; open the same priority.
3. As C, open the department C's manager B owns (if any) or note that C has no ＋ Priority anywhere above.
expected: a super admin can stand in for C with Settings → Users → View as: user — the role drops, but orgs the admin OWNS stay theirs (own a department only to try a pull); step 1 B sees ＋ Priority and the priority's ⋮ (Cascade, Edit, Complete…) and Add initiative enabled; step 2 C sees no ＋ Priority, no ⋮, and Add initiative disabled with a tooltip saying to pull the priority to their org first; a directory lookup that fails leaves B with owner-only rights (nothing extra), never an error

### UAT-PRI-004 — Pull a priority from above, as-is or customised
persona: orgowner
modules: priorities/lifecycle.ts priorities/prioritiesScreen.ts priorities/model.ts store/priorities.ts
preconditions: a department you own under a site with three active site priorities; one already adopted by the department; the site's customisation floor allows the department to customise
steps:
1. On the department, press ＋ Priority; read the dialog's head and its list; switch the toggle to New priority and back.
2. Pick a site priority; press Adopt as-is; read the department's matrix and the priority's Cascade tab and History.
3. ＋ Priority again; pick another; press Adopt & customise…; change the wording; save.
5. On the company, press ＋ Priority.
4. Set the site's customisation floor so the department adopts as-is; open the department again.
expected: step 1 one Add priority dialog opens on Pull from above (a joined Pull from above | New priority segmented toggle at its head, the chosen side filled; New priority shows the usual form with the same toggle, Pull brings the list back, and the dialog keeps the same narrow width on both faces); Adopt as-is is the primary button; the list shows the site's and the company's active priorities nearest first, never a peer department's, and not the one already adopted; step 2 the priority shows on the department's matrix (adopted), the site priority's Cascade tab lists "↓ <department> ✓" and History reads "<department> pulled it and adopted it as-is"; step 3 the department has its own priority with the new wording, its Cascade tab reads "↑ <site> (customised from)" and the parent lists the department as customised; step 4 the toolbar shows "Adopts priorities from above" with a "＋ Pull from above" button whose dialog offers Adopt as-is only; step 5 the company's ＋ Priority opens the new-priority form directly with no toggle

### UAT-PRI-005 — Customise or drop a priority adopted as-is
persona: orgowner
modules: priorities/lifecycle.ts priorities/prioritiesScreen.ts
preconditions: a department you own that has adopted two site priorities as-is; you do not manage the site
steps:
1. On the department, open the first adopted priority; open its ⋮; choose Customise for <department>…; change the wording; save.
2. Open the second adopted priority; ⋮ → Drop from <department>…; give a reason.
3. As the site's owner, open the second priority.
expected: step 1 the department's matrix shows the department's own priority with the new wording in place of the adopted one; it can be renamed through ⋮ → Edit… and unlinked from the Cascade tab; step 2 the priority leaves the department's matrix; step 3 its sender flags and Cascade tab read "↓ <department> ✕ declined — “<reason>”" and History reads "<department> dropped it — “<reason>”"

