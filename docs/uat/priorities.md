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


### UAT-PRI-006 — The popup's Actions tab is the action card
persona: orgowner
modules: priorities/lifecycle.ts priorities/actionsTab.ts priorities/actionsTabModel.ts controls/ActionBoard/editor.ts controls/ActionBoard/styles.ts shared/ui/actionUi.ts improvement/gantt.ts improvement/improvementTab.ts actions/quickAdd.ts cardRegistry.ts
preconditions: a priority with two or more linked initiatives that carry actions for different people, one initiative you hold no role on and whose org you do not manage; a completed action among them
steps:
1. Open the priority, then the Actions tab. Read the tools row and the list.
2. Click an action's row. Change its description, assignee and PDCA state; add a comment; Save.
3. Choose a person in "All assignees"; switch to Kanban, then Gantt, then back to List; set it back to All assignees.
4. On Kanban, drag a card to Doing. Read the card's small grey line.
5. Press ＋ Add action, read the dialog, choose the second initiative, fill it in, and Raise.
6. On Gantt, drag a bar later; click an action's name.
7. Switch to the Initiatives tab and read the open-action counts; close the popup and read the priority's card.
8. As someone who does not manage the priority's org but can open the initiative's board, open the same tab and edit an action.
9. Improvement tab → Gantt view → click an action's name.
expected: step 1 List | Kanban | Gantt, Show completed, All assignees and ＋ Add action share one row; the list has a heading per initiative with its count; step 2 the FULL action dialog opens (not "Set dates") and the row shows the changes; step 3 every view shows only that person's actions and the choice survives the switch; the Gantt has no second assignee select; step 4 the card moves and stays; each card names its initiative; step 5 the dialog offers an "Initiative" select of this priority's initiatives and no "Linked to" field; the new action appears under the chosen initiative and on that initiative's own board; step 6 the move follows the due-date rule (UAT-ACT-004) and the name opens the full dialog; step 7 the counts and ratings include what was just changed; step 8 they can edit — the same rights as on the initiative's board; step 9 the full dialog opens there too

### UAT-PRI-007 — An archived primary initiative stops driving the priority
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts store/priorities.ts
preconditions: a priority with two linked initiatives, one starred as primary with a charter, commentary and a starred metric; rights to archive that initiative
steps:
1. Read the priority's Objectives cell on the matrix and its popup header; open Charter, Metrics and Commentary.
2. Archive the primary initiative (Improvement tab → ⋮ → Archive). Return to Priorities and read the same places.
3. On the Initiatives tab read the notice; press Clear.
4. Restore the initiative, then star it again. Mark it COMPLETED instead and read the priority again.
5. Edit the other initiative's details and remove its link to the priority while it is starred.
expected: step 1 the primary's starred metric shows as the objective and the three tabs show its content; step 2 the Objectives cell is blank, the header has no ★ line, the popup has no Charter or Commentary tab, and the Metrics tab reads "Objectives"; step 3 the notice names the archived initiative ("was archived, so it no longer headlines this priority") and Clear removes it; step 4 a COMPLETED primary keeps headlining: its metric still shows, the header reads "★ <title> (completed)", and the Initiatives tab says so with a Clear link; step 5 an unlinked primary drops the same way with "is no longer linked to this priority"

### UAT-PRI-008 — A priority with no primary initiative: picked objectives
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts store/priorities.ts improvement/improvementTab.ts improvement/editDetails.ts
preconditions: a new priority; two initiatives with metrics; a child priority with an initiative that has a metric
steps:
1. Create an initiative linked to the new priority as its primary link. Open the priority's popup.
2. Open the Objectives tab. Tick one metric from each initiative; close the popup; read the Objectives cell, the walk and the poster.
3. Untick one. As someone who does not manage the org, open the same tab.
4. On the Initiatives tab ★ one initiative; read the tabs and the Objectives cell. Clear the star.
expected: step 1 the initiative is NOT starred by itself — the priority has no primary, no Charter or Commentary tab; step 2 the tab lists each initiative under the priority with its metrics (name, objective, plan, actual, light), the child priority's marked "via <org>"; the ticked metrics show as the priority's objectives everywhere the Objectives row is drawn; step 3 the cell follows; a non-manager sees the ticks greyed; step 4 with a primary starred its starred metrics take over and Charter, Metrics and Commentary return; clearing the star brings the picked objectives back

### UAT-PRI-009 — The site and the year stay put for the session
persona: orgowner
modules: sessionView.ts priorities/prioritiesScreen.ts improvement/improvementTab.ts priorities/lifecycle.ts priorities/dialogs.ts
preconditions: priorities and initiatives at a site other than your own, in a year other than the current one
steps:
1. Open Priorities. Switch to the other site and the other year; set Status to All.
2. Open a priority, go to its Actions tab, and open an initiative's board from it. Press Back.
3. Switch to the Improvement tab. Change its site; return to Priorities.
4. From a priority's Charter tab press "Open board", then Back.
5. Close the app and open it again.
6. In Settings → My profile change your site, then open Priorities.
expected: step 2 Priorities returns on the other site, the other year and Status All, with the popup reopened on the Actions tab; step 3 Improvement opens on the same site and year, and a site chosen there is the site Priorities shows next — its other filters (view, search, stage) are its own; step 4 Back reopens the popup on the Charter tab; step 5 a fresh start opens on your own site and the current year; step 6 a changed home site clears the memory
