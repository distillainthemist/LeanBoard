# UAT — Priorities

The cascade wall: pillars, priorities, objectives, the status rule and the executive summary.

## Journey 1 — The wall

### UAT-PRI-001 — The Objectives row lists metrics only
persona: viewer
modules: priorities/prioritiesScreen.ts
preconditions: a wall with three or more priorities in view: one whose primary initiative has starred metrics with values, one whose primary initiative has none starred, one with no primary initiative
steps:
1. Priorities tab in the matrix view; read the Objectives row under each column.
2. Open ▶ Executive summary and step to the same priorities.
expected: the Objectives row shows "Name: objective" with plan / actual and a traffic light for each starred metric, and is BLANK under a priority with no starred metric or no primary initiative — no "No primary initiative" or "No metric value yet" line anywhere in the row; the executive summary shows the SAME metrics as tiles on each closed priority card, and none where the row is blank

### UAT-PRI-002 — The ⋮ menu: no period, a health-chip toggle
persona: viewer
modules: priorities/prioritiesScreen.ts priorities/model.ts
preconditions: a wall with at least one sub-pillar that has a submitted health check
steps:
1. Priorities tab → ⋮ in the toolbar: read the sections.
2. Change the year with the year pill in the header.
3. ⋮ → Show → Health check scores; close and reopen the app.
expected: the menu has Status · View · Show · Share — no Period section and no Roll-up rule (the strict / ratio rule went with the status rule, 2026-11-17) — the year pill (and the phone head's Period select) is the one period door; Health check scores is off by default and the headers carry no chip; on, the chips appear and the choice is remembered for this person across sessions

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
4. On the Initiatives tab ★ one initiative; read the tabs and the Objectives cell. Open the priority's Edit form and read it. Clear the star.
expected: step 1 the initiative is NOT starred by itself — the priority has no primary, no Charter or Commentary tab; step 2 the tab lists each initiative under the priority with its metrics (name, objective, plan, actual, light), the child priority's marked "via <org>"; the ticked metrics show as the priority's objectives everywhere the Objectives row is drawn; step 3 the cell follows; a non-manager sees the ticks greyed; step 4 with a primary starred its starred metrics take over and Charter, Metrics and Commentary return; the Edit form has no "Primary initiative" line — the star lives on the Initiatives tab alone; clearing the star brings the picked objectives back

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

### UAT-PRI-010 — Proposed priorities
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts improvement/initiativeForm.ts
preconditions: an org with an owner; a direct report of that owner able to sign in; the org's site admin; an accepted priority with an initiative; a priority set at the org above
steps:
1. As the direct report, press ＋ Priority. Read the dialog's title, fill it in and save.
2. Read the matrix: the Priorities row, the Objectives row, the row beneath, and the chip in the bar. Open the row.
3. As the direct report, open the proposal: read the header and its buttons; edit its wording; create an initiative under it.
4. As the direct report, ＋ Priority → Pull from above: read the buttons, pick a priority and "Propose as-is". Read the cascades chip.
5. As the owner, read the same screen; open "to accept", accept the pull; open the proposal and press Accept.
6. As the direct report, propose another. As the owner, Decline it with a reason.
7. As the direct report, set Status to All, open the declined one, read its buttons, and press Propose again.
8. As the direct report, edit, complete and cascade an ACCEPTED priority.
9. As the owner, open the ⋮ of an accepted priority that an org below has adopted as-is and another has customised; choose "Move back to proposed…", read the question and confirm. Read both boards, then Accept it again. As the direct report, open the same ⋮.
expected: step 1 the dialog reads "Propose a priority" and offers no cascade targets; step 2 the proposal is in NO column of the Priorities row and adds nothing to Objectives, tallies or the poster; a "▸ Proposed" row sits under Objectives with "1 proposed" in its column and the bar shows "✎ 1 proposed"; opening the row shows a dashed card with no tallies; step 3 the header reads "Proposed — waiting for the org's owner or an admin", with Edit but no Accept, Decline or Reopen; the initiative form lists the priority tagged "(proposed)"; step 4 the buttons read "Propose as-is" / "Propose & customise…" with a line saying a pull is proposed; the pull waits in "cascades to accept" marked "Pulled … by <name> — proposed" with its buttons greyed for the direct report; step 5 the owner (and the site admin) can accept both — the accepted priority joins its column and starts to count; step 6 it leaves the Proposed row; step 7 the declined one reads "Declined — <reason>" and offers "Propose again", never "Reopen", to someone who cannot approve; step 8 the direct report can do all three, as before; step 9 the question says it stops counting and names "1 org adopted it as-is" and "1 customised copy below stays"; confirmed, it sits in the Proposed row with no tallies, its initiatives no longer feed the objectives above, the adopting org's board no longer shows it and the customising org's own copy is untouched; History reads "moved back to proposed"; Accept puts everything back; the direct report's ⋮ has no such item

### UAT-PRI-011 — A priority's sub-pillar, year by year
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/dialogs.ts prompts.ts store/priorities.ts
preconditions: a priority that began last year under sub-pillar A; a sub-pillar B in force this year; a priority completed last year
steps:
1. On this year, edit the priority and change its sub-pillar to B. Read the question; choose "From <this year>".
2. Read this year's matrix, then switch the year to last year.
3. Edit it again on this year, choose a third sub-pillar and "Every year"; look at last year.
4. On last year, leave Status on Active and look for the priority that was completed last year.
5. On last year, press ＋ Priority and read the sub-pillar choices.
expected: step 1 the dialog opens on the sub-pillar the priority sits under in the year in view and asks "from <year>, or for every year?" only because the priority began earlier; step 2 this year shows it under B and last year still shows it under A; step 3 "Every year" puts it under the third sub-pillar in both years; step 4 a past year is a record: the completed priority shows on the year it ran in under Active, marked completed, though it is hidden on this year; step 5 only the sub-pillars in force in the year in view are offered

## Journey 5 — The status rule and the executive summary (2026-11-17)

### UAT-PRI-012 — On track, flagged, off track: the wall and the popup
persona: viewer
modules: improvement/status.ts improvement/statusUi.ts improvement/initiativeModel.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts priorities/model.ts store/initiatives.ts
preconditions: a priority with at least four linked initiatives: A with open actions none late, metrics on plan and a status update in the last five weeks; B the same but with one action a day late; C flagged; D created over five weeks ago with no actions and no status update; a second priority whose initiatives are all like A; a third with no initiative
steps:
1. Priorities tab: read the left edge and the three small circles on each of the three priority cards; hover the circles.
2. Open the first priority → Initiatives tab: read the groups, and the line under B, C and D.
3. Give B's late action a later due date (or close it); return to the wall.
4. Create a new initiative under the second priority and add nothing to it; return to the wall.
expected: step 1 the first priority's edge is the Flagged colour (flagged wins over off track) and its circles read on track 1 · flagged 1 · off track 2 with the words on hover; the second is the on-track colour with every initiative in the first circle; the third is neutral with three faint zeros and "0 initiatives"; step 2 the groups are Flagged, Off track, On track in that order, each row's edge in its state's colour; B's row says "1 late action", D's "No actions defined · No status update yet", C's says "At risk" or "Recovery needed" with what was asked for, and a row with several owners names them all; no row reads "At risk" amber or "No signal" grey; step 3 B moves to On track and the priority's circles follow; step 4 the new initiative is ON TRACK (a new initiative has the recency window as grace) and the second priority stays on track

### UAT-PRI-013 — The executive summary
persona: viewer
modules: priorities/walk.ts improvement/sparkline.ts improvement/statusUi.ts improvement/metricValues.ts priorities/prioritiesScreen.ts sessionView.ts
preconditions: the wall of UAT-PRI-012; the first priority has a primary initiative with three metrics, at least one with several readings and a target; C carries a flag note
steps:
1. Priorities tab → ▶ Executive summary; read the head and the first priority card.
2. Press the ◀ chevron (or anywhere on the card) to open the first priority; read the rows.
3. Press Expand all; press it again; step with → and ←; press a priority's title.
4. Open the first priority again and click initiative C's row; on its board use the crumb back to Priorities.
5. ✕ Exit summary. On a phone, open Priorities.
expected: step 1 the button reads "Executive summary" (no "Present"); the head shows the year pill, "Executive summary · <org>" and "Pillar : Sub-pillar"; each priority is one card with its status edge, title, owner, the three labelled circles On track / Flagged / Off track and its objectives as sparkline tiles (a line over a green band where the metric is good and red where it is not; at most four, then "+n"); step 2 the card's own metric tiles go and one row per initiative shows: "PRIMARY INITIATIVE" on the primary (listed first), title, every owner, its status in words with its reasons, the stage name over its PDCA disc, Actions Done / Future / Late circles, its own metric tiles, and SUPPORT NEEDED with the note on a flagged one; confidential initiatives the viewer may not see are counted and summed in one "not shown" line; step 3 every card on the page opens, then closes; the arrows step sub-pillar by sub-pillar and a final "Cascades to accept" step appears when any are pending; the title opens the priority's popup; step 4 the board opens, and coming back lands in the summary on the same step with the same cards open; step 5 the wall returns; on a phone the summary IS the page, stacked, with no Exit

