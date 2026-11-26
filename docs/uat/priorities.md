# UAT — Priorities

The cascade wall: pillars, priorities, objectives, the status rule and the executive summary.

## Journey 1 — The wall

### UAT-PRI-001 — Objectives sit on each priority, as charts
persona: viewer
modules: priorities/prioritiesScreen.ts improvement/initiativeRow.ts improvement/sparkline.ts
preconditions: a wall with four or more priorities in view: one whose primary initiative has one starred metric with several readings; one with three or more starred metrics, at least one with an objective sentence written and one without; one whose only metric is good / bad or a picklist; one with no primary initiative and nothing ticked on its Objectives tab
steps:
1. Priorities tab in the matrix view; read the rows of the matrix and each priority's tile.
2. Rest the pointer on a chart and on its title.
3. Turn off the "Objectives" switch to the left of ▶ Executive summary; turn it on again; close and reopen the app.
4. Open ⋮ in the toolbar. Open ▶ Executive summary and step to the same priorities.
5. Open a priority and read the Key metrics of its initiative rows; open the Improvement tab and read the same column.
expected: step 1 there is NO Objectives row under the priorities: each tile carries its objectives under its three circles as small charts, two to a row, a third wrapping under and the tile growing with them; a chart is titled by the objective's sentence where one was written, else the metric's name, on one line cut with "…"; there are NO numbers on the tile; a good / bad or picklist metric shows its state as a coloured chip in place of a chart; a priority with no objectives shows none and no placeholder; step 2 the tooltip gives the metric's name, its objective, the latest reading and the plan; step 3 off, every tile is its statement and circles alone; the switch is on by default and the choice is remembered for this person and org; step 4 the ⋮ menu has no View section; the executive summary shows the same metrics on each closed priority card; step 5 each metric there is its name over a taller chart with no "reading · plan" line beneath

### UAT-PRI-002 — The ⋮ menu: no period, a health-chip toggle
persona: viewer
modules: priorities/prioritiesScreen.ts priorities/model.ts
preconditions: a wall with at least one sub-pillar that has a submitted health check
steps:
1. Priorities tab → ⋮ in the toolbar: read the sections.
2. Change the year with the year pill in the header.
3. ⋮ → Show → Health check scores; close and reopen the app.
expected: the menu has Status · Show · Share — no View section (the Objectives switch in the toolbar replaced it, 2026-11-18), no Period section and no Roll-up rule (the strict / ratio rule went with the status rule, 2026-11-17) — the year pill (and the phone head's Period select) is the one period door; Health check scores is off by default and the headers carry no chip; on, the chips appear and the choice is remembered for this person across sessions

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
5. Press ＋ Add action, read the dialog, choose the second initiative under "Linked to", fill it in, and Raise.
6. On Gantt, drag a bar later; click an action's name.
7. Switch to the Initiatives tab and read the open-action counts; close the popup and read the priority's card.
8. As someone who does not manage the priority's org but can open the initiative's board, open the same tab and edit an action.
9. Improvement tab → Gantt view → click an action's name.
expected: step 1 List | Kanban | Gantt, Show all completed, All assignees and ＋ Add action share one row; the list has a heading per initiative with its count; step 2 the FULL action dialog opens (not "Set dates") and the row shows the changes; step 3 every view shows only that person's actions and the choice survives the switch; the Gantt has no second assignee select; step 4 the card moves and stays; each card names its initiative; step 5 the dialog offers a "Linked to" select — "This priority" first for who manages the org, then this priority's initiatives — and no search field beside it; the new action appears under the chosen initiative and on that initiative's own board; step 6 the move follows the due-date rule (UAT-ACT-004) and the name opens the full dialog; step 7 the counts and ratings include what was just changed; step 8 they can edit — the same rights as on the initiative's board; step 9 the full dialog opens there too

### UAT-PRI-007 — An archived primary initiative stops driving the priority
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts store/priorities.ts
preconditions: a priority with two linked initiatives, one starred as primary with a charter, commentary and a starred metric; rights to archive that initiative
steps:
1. Read the priority's objectives on its tile and its popup header; open Charter, Objectives and Commentary.
2. Archive the primary initiative (Improvement tab → ⋮ → Archive). Return to Priorities and read the same places.
3. On the Initiatives tab read the notice; press Clear.
4. Restore the initiative, then star it again. Mark it COMPLETED instead and read the priority again.
5. Edit the other initiative's details and remove its link to the priority while it is starred.
expected: step 1 the primary's starred metric shows as the objective and the three tabs show its content; step 2 the tile shows no objective, the header has no ★ line, the popup has no Charter or Commentary tab, and the Objectives tab (always so named) shows the tick list in place of the primary's metrics card; step 3 the notice names the archived initiative ("was archived, so it no longer headlines this priority") and Clear removes it; step 4 a COMPLETED primary keeps headlining: its metric still shows, the header reads "★ <title> (completed)", and the Initiatives tab says so with a Clear link; step 5 an unlinked primary drops the same way with "is no longer linked to this priority"

### UAT-PRI-008 — A priority with no primary initiative: picked objectives
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts store/priorities.ts improvement/improvementTab.ts improvement/editDetails.ts
preconditions: a new priority; two initiatives with metrics; a child priority with an initiative that has a metric
steps:
1. Create an initiative linked to the new priority as its primary link. Open the priority's popup.
2. Open the Objectives tab. Tick one metric from each initiative; close the popup; read the Objectives cell, the walk and the poster.
3. Untick one. As someone who does not manage the org, open the same tab.
4. On the Initiatives tab ★ one initiative; read the tabs and the Objectives cell. Open the priority's Edit form and read it. Clear the star.
expected: step 1 the initiative is NOT starred by itself — the priority has no primary, no Charter or Commentary tab; step 2 the tab lists each initiative under the priority with its metrics (name, objective, plan, actual, light), the child priority's marked "via <org>"; the ticked metrics show as the priority's objectives everywhere the Objectives row is drawn; step 3 the cell follows; a non-manager sees the ticks greyed; step 4 with a primary starred its starred metrics take over, Charter and Commentary return, and the Objectives tab shows the primary's metrics card under "★ <title>"; the Edit form has no "Primary initiative" line — the star lives on the Initiatives tab alone; clearing the star brings the picked objectives back

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
2. Read the matrix: the Priorities row, the row beneath, and the chip in the bar. Fold the row and open it again.
3. As the direct report, open the proposal: read the header and its buttons; edit its wording; create an initiative under it.
4. As the direct report, ＋ Priority → Pull from above: read the buttons, pick a priority and "Propose as-is". Read the Proposed row and the chip.
5. As the owner, read the same screen; open the pull's tile and press Accept; open the proposal and press Accept.
6. As the direct report, propose another. As the owner, Decline it with a reason.
7. As the direct report, set Status to All, open the declined one, read its buttons, and press Propose again.
8. As the direct report, edit, complete and cascade an ACCEPTED priority.
9. As the owner, open the ⋮ of an accepted priority that an org below has adopted as-is and another has customised; choose "Move back to proposed…", read the question and confirm. Read both boards, then Accept it again. As the direct report, open the same ⋮.
expected: step 1 the dialog reads "Propose a priority" and offers no cascade targets; step 2 the proposal is in NO column of the Priorities row and adds nothing to objectives, tallies or the poster; a "▾ Proposed" row sits under the priorities, OPEN, with a dashed card and no tallies in its column, and the bar shows "1 awaiting a decision"; folded, its column shows the count; after sending, a "Let the owner know" panel is offered (Skip, Send email, Send by Teams) addressed to the org's owner; step 3 the header reads "Proposed — waiting for the org's owner or an admin", with Edit but no Accept, Decline or Reopen; the initiative form lists the priority tagged "(proposed)"; step 4 the buttons read "Propose as-is" / "Propose & customise…" with a line saying a pull is proposed; the pull waits in the Proposed row as a dashed card reading "Proposed · pulled from <org> by <name>"; opened by the direct report its header reads "… waiting for the org's owner or an admin" with no Accept or Decline; step 5 the owner (and the site admin) can accept both — the accepted priority joins its column and starts to count; step 6 it leaves the Proposed row; step 7 the declined one reads "Declined — <reason>" and offers "Propose again", never "Reopen", to someone who cannot approve; step 8 the direct report can do all three, as before; step 9 the question says it stops counting and names "1 org adopted it as-is" and "1 customised copy below stays"; confirmed, it sits in the Proposed row with no tallies, its initiatives no longer feed the objectives above, the adopting org's board no longer shows it and the customising org's own copy is untouched; History reads "moved back to proposed"; Accept puts everything back; the direct report's ⋮ has no such item

### UAT-PRI-011 — A priority's sub-pillar, year by year
persona: orgowner
modules: priorities/model.ts priorities/prioritiesScreen.ts priorities/dialogs.ts priorities/settingsTab.ts store/priorities.ts
preconditions: Settings → Priorities with this year's and next year's pillars set up: a sub-pillar A in force in both years; a sub-pillar B that ENDS this year with nothing following it; a sub-pillar C that ends this year and a sub-pillar C2 starting next year that follows it; a new sub-pillar D starting next year. Three priorities that began this year with no planned end, one under each of A, B and C; a priority completed last year
steps:
1. On this year, press ＋ Priority. Read the order of the fields, the marks on the labels and the Save button. Fill the statement only.
2. Choose the start period (this year) and sub-pillar B. Read what appears. Set Planned end to this year; then back to "No planned end".
3. Choose a sub-pillar for next year and Save. Read this year's matrix, then next year's.
4. Edit the priority under A: read its sub-pillar block. Edit the one under C.
5. Switch the year to next year. Edit the priority under A; press "＋ Change from <next year>"; choose D; Save. Read both years. Edit it again and press Remove.
6. Settings → Priorities, year in view = this year: press "Change for <next year>…", set B to "Becomes" D and Save. Edit the priority of step 3.
7. On last year, leave Status on Active and look for the priority that was completed last year.
expected: step 1 the fields read Statement, Owner, Start period, Planned end, Sub-pillar, Cascade to, Notes — the sub-pillar AFTER the years; Statement, Start period and Sub-pillar carry a small red asterisk; there are no sentences under any field (Planned end and Cascade to explain themselves in their label's tooltip); Save is greyed with the tooltip "Still needed: Sub-pillar" until a sub-pillar is chosen; step 2 with B chosen a second select appears, "Sub-pillar from <next year>", required, offering next year's sub-pillars, and Save greys again; with the planned end at this year the second select goes (the priority never reaches next year) and returns when the end is opened; step 3 this year shows the priority under B and next year under the one chosen — it is never in the Unplaced band; step 4 the priority under A shows ONE select (A is in force throughout); the one under C shows ONE select too (C2 follows C, so it carries over without being asked); step 5 the link adds "Sub-pillar from <next year>" opening on A; saved with D, this year still shows it under A and next year under D; Remove takes the move back; step 6 which sub-pillar follows which is set in the year-change panel (UAT-SET-017), not on the list's rows; with B becoming D, the priority of step 3 opens with one select only if its next-year choice was D, and a priority still under B now carries into D unasked; step 7 a past year is a record: the completed priority shows on the year it ran in under Active, marked completed, though it is hidden on this year

## Journey 5 — The status rule and the executive summary (2026-11-17)

### UAT-PRI-012 — On track, support needed, off track: the wall and the popup
persona: viewer
modules: improvement/status.ts improvement/statusUi.ts improvement/initiativeModel.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts priorities/model.ts store/initiatives.ts
preconditions: a priority with at least four linked initiatives: A with open actions none late, metrics on plan and a status update in the last five weeks; B the same but with one action a day late; C flagged; D created over five weeks ago with no actions and no status update; a second priority whose initiatives are all like A; a third with no initiative
steps:
1. Priorities tab: read the left edge and the three small circles on each of the three priority cards; hover the circles; read the key under the "Priorities" row label.
2. Open the first priority → Initiatives tab: read the groups, and the line under B, C and D.
3. Give B's late action a later due date (or close it); return to the wall.
4. Create a new initiative under the second priority and add nothing to it; return to the wall.
expected: step 1 the first priority's edge is the Support needed colour (support needed wins over off track) and its circles read on track 1 · support needed 1 · off track 2 with the words on hover; the second is the on-track colour with every initiative in the first circle; the third is neutral with three faint zeros; no card carries a "· n initiatives" total beside its circles (they are the count); under the row label "Priorities" a small key reads On track, Support needed, Off track, each with its colour; step 2 the list has ONE header (Initiative · Stage · Actions with Done, Future, Late directly over the three circles · Key metrics) and no group headings; the cards stand in order — the primary first (a heavy border, "PRIMARY INITIATIVE ·" before its status, its star filled and alone), then support needed, off track, on track; each card's status is small caps above its title in its colour — "⚑ SUPPORT NEEDED", "OFF TRACK", "ON TRACK" — with a small i beside any that is not on track: hovering or pressing it gives B "1 late action", D "No actions defined" and "No status update yet", and C what was asked for and whether it is otherwise on track or also off track; the stage is its PDCA-tinted pill with a small disc leading it; the action circles and the ★ and ⋮ line up from card to card; a row with several owners names them all; nothing reads "At risk" amber or "No signal" grey; step 3 B moves to On track and the priority's circles follow; step 4 the new initiative is ON TRACK (a new initiative has the recency window as grace) and the second priority stays on track

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
expected: step 1 the button reads "Executive summary" (no "Present") and the summary fills the app's window WITHOUT taking the browser full screen; each card's open / close control is a round button with a chevron, pointing right when closed and down (filled) when open; the head shows the year pill, "Executive summary · <org>" and "Pillar : Sub-pillar"; each priority is one card with its status edge, title, owner, the three labelled circles On track / Support needed / Off track and its objectives as sparkline tiles (a line over a green band where the metric is good and red where it is not; at most four, then "+n"); step 2 the card's own metric tiles go and the initiatives show under the SAME header and as the SAME rows as the popup and the Improvement list, larger: Initiative (status in small caps above the title, the i for the reasons — press it, nothing hovers on a wall screen; the primary first, heavy-bordered) · Stage pill · Actions Done / Future / Late · Key metrics as sparkline tiles · Support needed, which carries the note of an initiative that asked; confidential initiatives the viewer may not see are counted and summed in one "not shown" line; step 3 every card on the page opens, then closes; the arrows step sub-pillar by sub-pillar and a final "Awaiting a decision" step appears when anything waits on the org (UAT-PRI-020); the title opens the priority's popup; step 4 the board opens, and coming back lands in the summary on the same step with the same cards open; step 5 the wall returns; on a phone the summary IS the page, stacked, with no Exit

### UAT-PRI-014 — The decision zone: cascades, proposals and unplaced priorities
persona: orgowner
modules: priorities/prioritiesScreen.ts priorities/lifecycle.ts priorities/model.ts priorities/stepMessage.ts priorities/stepMessageModel.ts actions/message.ts
preconditions: a site you own under a company; the company's owner able to sign in; a direct report of yours; three active company priorities not yet at the site; a site priority under a sub-pillar that ends this year with nothing following it; Teams or email available
steps:
1. As the company's owner, cascade two priorities to the site (the ⋮ on a tile → Cascade to…). Read what is offered afterwards.
2. As the site's owner, open Priorities: read the bar and the foot of the matrix.
3. Open the first cascade's tile. Read the header and its buttons. Press Hold…, give a reason.
4. Open the second and press Accept. Read the matrix and what is offered.
5. Open the held one; press Accept & customise…, change the wording and save.
6. As the direct report, open a waiting cascade (have the company send a third). Then as a person who does not manage the site.
7. Turn on a pillar filter (click a pillar), then clear it. Move the year forward to next year.
8. On the unplaced priority press "Place under…"; read the dialog; choose a sub-pillar and Place. Go back a year.
9. As the direct report, read the same Unplaced band. As the company's owner, read the priority's Cascade tab.
expected: step 1 a "Let them know" panel is offered, addressed to the site's owner, with Skip, Send email and Send by Teams — nothing is sent unless one is pressed; step 2 the bar shows ONE chip, "2 awaiting a decision" (no "cascades to accept" chip, no pop-up list); under the priorities a row "▾ Cascaded to you", open, holds each cascade as a dashed tile under the sub-pillar it would land in, reading "From <company> · <owner>"; clicking the chip scrolls to it; step 3 the priority's own popup opens with "Cascaded to <site> — yours to accept or decline" and the buttons Decline…, Hold…, Accept & customise… and ONE solid button, Accept — no Add initiative; Hold asks for a reason, the tile stays in the row dimmed and reading "On hold · from <company>", the chip drops to 1, and a "Let the sender know" panel is offered to the company priority's owner carrying the reason; step 4 the priority joins its column as adopted and the row loses the tile; the sender is offered "… accepted …"; step 5 the site has its own priority with the new wording and the held tile is gone; step 6 a direct report sees the same buttons and may answer a cascade; a person who does not manage the site sees "… waiting for someone who manages the org" and no buttons; step 7 a pillar filter hides the tiles of other pillars and reports NOTHING as unplaced; in the next year an "▾ Unplaced" band under the matrix holds the priority whose sub-pillar ended, with "Place under…"; a priority whose sub-pillar is followed by another sits in the follower's column, not here; step 8 the dialog lists that year's sub-pillars grouped by pillar, Sub-pillar carries a red asterisk and Place is disabled until one is chosen; placed, the priority sits in that column from that year on and in its old column the year before; step 9 someone who does not manage the priority's org sees "Placed by its org's owner" and no link; the company's Cascade tab shows the site's answers as before


## Journey 6 — Actions on a priority (2026-11-18)

### UAT-PRI-015 — Raise an action on a priority; it counts toward the priority's status
persona: orgowner
modules: priorities/priorityActions.ts priorities/prioritiesScreen.ts priorities/lifecycle.ts priorities/actionsTab.ts priorities/actionsTabModel.ts priorities/walk.ts improvement/status.ts improvement/statusUi.ts improvement/gantt.ts shared/schema/actionLinks.ts shared/ui/actionUi.ts shared/ui/actionLinkProvider.ts controls/ActionBoard/editor.ts controls/LeanHub/types.ts actions/linkTargets.ts actions/message.ts screens/hub.ts store/actions.ts
preconditions: a site you own, with an active priority that has no initiatives and a second active priority with one initiative that carries actions; a company priority the site has accepted as it is written (adopted); a person who can open Priorities but does not manage the site; the company's owner able to sign in
steps:
1. Open Priorities at your site. On the first priority's tile press ⋮ and read the menu; choose Add action….
2. Read the dialog. Leave Action empty and read the Raise button. Fill in Action, tick yourself under Who, set a due date in the PAST, and Raise.
3. Read the tile: its edge, what stands beside its three circles, and the tooltip on the circles.
4. Open the priority. Read the title row's buttons. Press Add action, raise a second action due next month.
5. Read the Actions tab: its heading, its rows, the tools row, and the title row's buttons while this tab shows. Switch to Gantt and read the group.
6. Open the second priority (the one with an initiative) → Actions. Press ＋ Add action and read the "Linked to" choice; raise one on "This priority". Read the headings and their order.
7. Open the late action from the list, press ✕ on its "Linked to" chip, search for the initiative, pick it and Save. Read the list and the first priority's tile.
8. Close the popup. On the first priority's ⋮ choose Complete…; read the dialog; Cancel.
9. Open ▶ Executive summary and find the first priority's row.
10. On the ADOPTED priority's tile press ⋮, read the menu, and raise an action on it. Then, as the company's owner, open the same priority at the company and read its Actions tab.
11. As the person who does not manage the site, open the first priority: read the title row, its ⋮ on the tile, and the Actions tab. Open one of its actions and mark your part done if you are assigned.
12. As the assignee of one of these actions, open the hub's actions list and read the group the action sits under. Open it and press Message.
expected: step 1 the menu holds "Add action…" under "Edit…"; step 2 the standard action dialog opens with a "Linked to" chip reading PRIORITY and the priority's statement; Action, Who and Due carry a red asterisk and Raise is disabled until all three are filled; step 3 the tile's edge turns to the off-track colour and the circles' tooltip ends "· 1 late priority action"; NOTHING is added beside the circles (no action count on the tile); step 4 the title row holds an outline "Add action" to the left of the one solid "Add initiative"; after raising, the popup turns to its Actions tab; step 5 a heading "This priority · 2" with both actions; the tools row is the action card's own (List | Kanban | Gantt, Show all completed, All assignees, ＋ Add action) and the title row no longer shows a second "Add action" on this tab; the Gantt shows one group "This priority · 2"; step 6 the select reads "Linked to" and offers "This priority" first, then each initiative; "This priority" stands above the initiative headings; step 7 the action moves under the initiative's heading and the first priority's tile loses its off-track edge (the action now counts toward the initiative); step 8 the dialog opens with a line "1 action on this priority is still open. It stays open." (the number is the open ones) above the reasons; step 9 the row shows the initiative circles and, beside them, "Priority actions" with Done / Future / Late circles; step 10 the adopted tile's ⋮ holds "Add action…" alone; the action shows at your site on that priority, and NOT at the company — the company's own Actions tab does not list it and the company's tile is unchanged; step 11 no "Add action" in the title row and no ⋮ on the tile; the Actions tab lists the priority's actions with no ＋ Add action when the priority has no initiatives; an assigned person can still open the action and mark their part done; step 12 the group reads "Priority · <statement>"; the message's link opens the app at Priorities

## Journey 7 — Metrics on a priority (2026-11-18)

### UAT-PRI-016 — A priority's own metrics: defined, filled in, counted
persona: orgowner
modules: priorities/ownMetricsTab.ts priorities/lifecycle.ts priorities/prioritiesScreen.ts priorities/model.ts store/priorities.ts store/seriesMap.ts store/driverSeries.ts improvement/metricValues.ts improvement/metricsCard.ts improvement/metricsList.ts improvement/metricLocation.ts improvement/status.ts improvement/vdt/gridDialog.ts improvement/initiativeRow.ts
preconditions: a site you own with a value driver tree; an active site priority with no initiatives; a second site priority with a starred primary initiative that has a starred metric; a company priority the site has accepted as written; a company priority you may edit (as the company's owner or an admin); a person who can open Priorities but does not manage the site
steps:
1. Open the first priority and read its tabs. Open Objectives and read the page.
2. Press ＋ Add metric. Read the dialog. Give it a name, a plan of 2 and an upper limit of 3; Add metric. Read the row.
3. Type an objective sentence into the row. Read what stands under the rows. On the metric's chart press "Update values"; enter 1, 2.5 and 5 in the last three weeks of the Actual row; Done. Click the chart's body.
4. Close the popup. Read the priority's tile: its chart, its edge, and the tooltip on its circles. Hover the chart.
5. Press "Update values" again and change the last reading to 1.5; Done. Read the tile.
6. Press ＋ From the value driver tree, pick a leaf driver, then press "Update values" on its chart. Read the note under the title.
7. Add metrics until there are eight. Read the two add buttons.
8. Open the second priority (with a primary) → Objectives. Add a metric of its own. Close and read the tile and the executive summary row.
9. As the person who does not manage the site, open the first priority → Objectives. Press Values….
10. Open the ADOPTED company priority at your site → Objectives. Then, as the company's owner, open the same priority at the company and add a metric; read the buttons offered. Return to the site and read the adopted tile.
11. On the first priority press × on a metric that has readings; read the question and Cancel; press × again and Remove. Read the tile. Add a metric under the same name and open its values.
expected: step 1 the tab is named "Objectives" (never "Metrics"); the page leads with "This priority" — "No metrics on this priority yet." and two buttons, "＋ From the value driver tree" and "＋ Add metric" — then "From its initiatives" with the tick list or its note; step 2 the dialog is titled "Add metric" with Name, Unit, Rows, Plan, limits, Tracking and Cadence, no note under the title and no sentences under the fields; Name carries a red asterisk and "Add metric" is disabled until it is filled; "Options" shows only for the Status picklist tracking; the row reads the name, "· priority-specific", its unit and direction, with plan and limit boxes and the links Edit…, Link…, Promote… and × — no ★ (Link… and Promote… are UAT-PRI-018; a company-level priority has neither); step 3 under the rows each metric has its FULL TREND, the same chart the initiative Metrics card draws (title, cadence, plan and limit lines, "No readings yet" before the first value), with "Update values" in its title strip; the values grid opens titled with the metric's name, its note reading "Weekly · <unit> · this priority's readings. Targets and limits set here carry forward until changed.", with Plan and Upper limit rows carried across; each reading shows a state dot (green, amber, red); after Done the chart draws the three readings; a click on the chart's body pops it out large, with Done to close; step 4 the tile shows the metric's chart, titled by "Name: objective", with NO number beside it; the tile's edge is the off-track colour and the circles' tooltip ends "· <name> outside its limits"; hovering the chart gives the value and plan; step 5 the edge returns to on track ("No initiatives" alone in the tooltip, the priority reading on track on its own metric); step 6 the driver's name is added as a "· VDT" row; its grid's note says the values are the value driver's own series; step 7 at eight both buttons are disabled with the tooltip "A priority carries up to 8 metrics of its own"; step 8 the page shows "This priority" with its rows and charts, then ONE line "★ <primary's title> · Open board" and the primary's metrics card; the tile and the summary row show the priority's own metric FIRST, then the primary's starred metric; step 9 the metrics are listed read-only — a light, "Name: objective", "Plan … · Actual …" — with each one's trend chart beneath (no "Update values" on it); Values… on a row opens the grid marked Read-only; no add buttons; step 10 at the site the adopted priority's Objectives tab has no add buttons (only its owning org defines its metrics); at the company only "＋ Add metric" is offered (a company has no value driver tree); back at the site the adopted tile shows the company's metric and follows its state; step 11 the question reads "Remove <name> and its N readings?" and "This cannot be undone."; Cancel keeps the metric; after Remove the metric leaves the tile at once and no longer counts toward the status, and a metric added under the same name starts with NO readings (a metric with no readings is asked about too: "Remove <name>?", "It has no readings.")

### UAT-PRI-017 — What a cascaded priority carries counts toward the one it came from
persona: orgowner
modules: priorities/ownBelow.ts improvement/status.ts priorities/prioritiesScreen.ts
preconditions: a company priority with no late work of its own; one site that ADOPTED it as it is written, and a second site that CUSTOMISED it (a priority of its own under it); you manage both sites and can open the company's board; every initiative under these priorities on track
steps:
1. At the adopting site: raise an action on the adopted priority with a due date in the past. Read the tile there, then open the company's board and read the company priority's tile and the tooltip on its circles.
2. Open the company priority and read its Actions tab.
3. Mark that action done. At the customising site: add a metric to the site's own priority with a target, and enter a reading short of the target. Read the company priority's tile and tooltip again.
4. At the adopting site, read the adopted priority's tile and tooltip.
5. Bring the metric back on plan.
expected: step 1 the priority reads off track at the site AND at the company; the company's tooltip ends "1 late priority action at <site>"; step 2 the company's Actions tab does NOT list the site's action — it shows only where it was raised; step 3 the company priority is off track again with "<metric> short of plan at <site>" (outside its limits reads "outside its limits at <site>"); step 4 the adopting site's tile is not touched by the other site's metric — nothing counts sideways or downward; step 5 the company priority is on track once nothing below it is late or off plan

### UAT-PRI-018 — Link or promote a priority's own metric into the value driver tree
persona: orgowner
modules: priorities/ownMetricsTab.ts improvement/metricsList.ts improvement/metricRemoval.ts store/driverSeries.ts store/series.ts
preconditions: a site you own with a value driver tree; a site priority with two metrics of its own, each with three or more readings; a driver in the tree that already has a value in one of the same weeks; you hold the value drivers editor role at the site (or are a super admin); a company-level priority with a metric of its own
steps:
1. Open the site priority → Objectives. Read the links on each of its own metrics' rows.
2. On the first metric press Link…; pick the existing driver and choose that this metric IS the driver. Read the question; Cancel.
3. Press Link… again, pick the same driver, and Move. Read the row, its chart, and the driver's values in Settings → Value drivers.
4. On the second metric press Promote…; choose a parent and "A driver"; Promote; read the question and Move. Read the tree.
5. Add a metric under the first metric's old name and open its values.
6. Open the company-level priority → Objectives and read its own metric's row.
7. As someone who manages the site but does not hold the value drivers editor role: read the Promote… link.
expected: step 1 each own metric's row carries Link… and Promote… beside Edit…; step 2 the question reads "Move N readings into <driver>?" with N the readings entered, and says they cannot be separated again and that the driver's value is kept where it already has one; Cancel changes nothing; step 3 the metric now reads as the driver (its name and unit), its chart shows the driver's series with the moved readings in it, and in the week the driver already had a value the driver's value stands; step 4 a new driver sits under the chosen parent carrying the metric's readings; step 5 the new metric starts EMPTY — the readings moved, they were not copied; step 6 no Link… or Promote… on a company-level priority (it has no site and no tree); step 7 Promote… is greyed, with a tooltip naming the role; Link… is still offered. A link that only LEADS a driver moves no readings and asks nothing: the metric keeps its own readings and its chart, whose title strip ends "· leads <driver>". A LINKED metric's row carries "Change link…" and "Unlink" (and ×): Unlink on a Leads link asks nothing and the metric is "priority-specific" again with every reading it had; Unlink on a metric that IS the driver asks "Unlink <name> from <driver>?" — "The readings entered while it was linked stay with the value driver." — and the metric then starts with none; Change link… opens the picker on the current link, where another driver or the other mode can be chosen

### UAT-PRI-019 — A re-parented priority takes its parent's sub-pillar, and its family follows
persona: orgowner
modules: priorities/relinkPillar.ts priorities/lifecycle.ts priorities/stepMessageModel.ts priorities/stepMessage.ts
preconditions: a site you own with a priority of its own under one sub-pillar, and a department priority made from it (customised) in the same sub-pillar; an active company priority under a DIFFERENT sub-pillar; the company's owner and the department's owner have an email on the roster; the year picker on the current year
steps:
1. Open the site priority → Cascade → "Link to a parent priority…". Read the dialog before choosing.
2. Choose the company priority. Read the line under the list. Press Link.
3. Read the message panel that opens; Skip (or send).
4. Read the site's matrix, then the department's. Switch the year picker to LAST year and read both again.
5. Open the site priority → Cascade → "Change parent…", choose a parent in the sub-pillar it already has, and read the line.
6. Press Unlink and confirm. Read the matrix.
expected: step 1 there is NO "Also take the parent's sub-pillar" tick; step 2 the line reads "It moves to <the company priority's sub-pillar>. 1 priority made from it moves with it."; step 3 a message is offered to the company priority's owner and the department's owner — it says the priority was linked under "<company>'s “…”", that it now counts toward that priority, and what moved; nothing is sent unless you send it; step 4 this year both the site's priority and the department's sit under the company priority's sub-pillar; last year both are still in the column they had; step 5 with nothing to move the line is absent; step 6 unlinking leaves the priority in the column it is in. A parent with no sub-pillar moves nothing

### UAT-PRI-020 — The decision zone on a phone and in the executive summary
persona: orgowner
modules: priorities/prioritiesScreen.ts priorities/walk.ts priorities/lifecycle.ts
preconditions: a site you own with, waiting on it: a priority proposed by a direct report, a cascade sent from the company, a cascade you put on hold, and a priority whose sub-pillar ended this year with nothing following it; a phone (or a window under 720 px wide)
steps:
1. On a desktop open Priorities at the site and read the chip in the bar. Press ▶ Executive summary and step to the last step.
2. Read the step's title and what it lists. Click the cascade; in its popup press Accept. Read the step again.
3. ✕ Exit summary. On the phone open Priorities at the site. Read the chip; press it.
4. Read what stands under the priorities. Tap the proposal and decline it with a reason; tap "Place under…" on the unplaced priority and choose a sub-pillar.
5. Answer everything that is left.
expected: step 1 the chip reads "N awaiting a decision" (the proposal and the cascade — a held one and an unplaced one are in the zone but not counted); the summary's last step is titled "Awaiting a decision · N"; step 2 it lists "Proposed" and "Cascaded to you" with the same dashed cards as the matrix (the held cascade greyed, "On hold · from <company>") and "Unplaced" with its "Place under…" link — there are NO Accept / Hold / Decline buttons in the list; a card opens the priority's popup, where the answer is given, and the summary repaints on the same step with one fewer; step 3 the phone shows the SAME chip, "N awaiting a decision" — not "⇩ N cascades to accept" — and it scrolls to the zone; step 4 the three groups stand one under another below the sub-pillar walk; a proposal and an unplaced priority can be answered on the phone (they could not be seen there before); step 5 with nothing left the chip, the zone and the summary's last step are gone. The pop-up "Cascades to accept" list is not offered anywhere

### UAT-PRI-021 — Extend a priority past its planned end
persona: orgowner
modules: priorities/prioritiesScreen.ts priorities/lifecycle.ts priorities/model.ts
preconditions: you manage an org with three active priorities whose planned end is this year: one under a sub-pillar that continues next year, one under a sub-pillar that ENDS this year with nothing following it, and (on another company or year) one where next year has no sub-pillars at all; an org that only adopted one of them
steps:
1. On this year, open a priority's ⋮ menu. Step to next year and read the three tiles.
2. On the first, ⋮ → "Extend to <next year>".
3. On the second, ⋮ → "Extend to <next year>"; choose a sub-pillar and press Place.
4. On the third, ⋮ → "Extend to <next year>".
5. Open the first priority's History tab.
6. As the adopting org, read the tile and its ⋮.
expected: step 1 this year the menu has no Extend — the priority is not past its end; next year each tile reads "⟳ Past its planned end (<this year>) — review"; step 2 the flag goes at once and NOTHING is asked — two clicks; its planned end is next year; step 3 the planned end moves and ONE question follows, "Place under a sub-pillar", offering next year's sub-pillars; placed, it sits under the one chosen from next year on and this year shows it where it was; step 4 it is extended and a notice says no sub-pillars are set for next year, so it is Unplaced until they are; step 5 History reads "extended to <next year> — planned end was <this year>" with who and when; step 6 the adopting org sees the flag and no Extend. "Complete…" and "Archive…" are in the same menu as before (2026-11-25 report 23)

### UAT-PRI-022 — The priority form: a changed start year, and a year with no sub-pillars
persona: orgowner
modules: priorities/dialogs.ts priorities/model.ts
preconditions: a priority under a sub-pillar that another sub-pillar FOLLOWS next year (set in the year-change panel); a year for which no sub-pillars are set
steps:
1. Edit the priority. Change Start period to next year. Read the Sub-pillar field and the Save button.
2. Cancel. Add a priority and set its Start period to the year with no sub-pillars.
expected: step 1 the Sub-pillar field shows the sub-pillar that FOLLOWS, already chosen, and Save is live (2026-11-25 report 23: the field went blank and Save was held with no reason shown); step 2 where the select would be, a line reads "No sub-pillars are set for <year> yet. A super admin sets them in Settings → Priorities." — never an empty required select
