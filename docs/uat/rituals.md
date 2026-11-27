# Rituals & boards

Personas: participant (anyone on a board), owner (a board or card owner), siteadmin, superadmin. The site needs a board with a metrics card at each cadence.

## Journey 1 — Metric cards

### UAT-RIT-001 — The trend's time axis
persona: owner
modules: cardRegistry.ts controls/KpiTrendCard/editor.ts shared/schema/buckets.ts
preconditions: a monthly metric with two readings (this month and last); a weekly metric with readings over three months; a daily metric with a missed day
steps:
1. Open the board; read the monthly card's chart.
2. Read the weekly card's chart.
3. Read the daily card's chart.
expected: the monthly chart spans twelve months ending at the current month, each month ticked and named, the two readings sitting at their months at the right; the weekly chart shows its full three months (more than the 13-week floor) with thinned labels; the daily chart shows four weeks with the missed day as a gap in the line; plan, forecast and limit labels keep their place at the right edge

### UAT-RIT-002 — Cadence across sites by process
persona: owner
modules: controls/LeanHub/editor.ts shared/ui/processPicker.ts shared/schema/process.ts
preconditions: two sites whose process trees link a node each to the same central process; a ritual on each site naming its site's node
steps:
1. Hub → Cadence (or the Rituals directory) → scope "Organisation" with no site: read the Process filter — a type, then the central cascade; pick the central process.
2. Pick a site in the organisation cascade: read the Process filter again.
expected: at company scope the central pick shows both rituals (each matches through its site node's link) and the pick is remembered with the scope; with a site chosen the Process filter cascades through that site's own tree and a leftover central pick is cleared; a site with no tree shows no Process filter

### UAT-RIT-003 — Tiles fill their slot at a readable size
persona: owner
modules: controls/BoardGrid/editor.ts controls/BoardGrid/types.ts shared/ui/tier.ts shared/ui/baseCss.ts cardHost.ts style.css
preconditions: a ritual board with several live tiles (an agenda, an action board, a status tile); a laptop (about 1366 px) and, if available, a wall screen
steps:
1. Open the board on the laptop with the details pane closed, then open the pane; read the tiles.
2. Set the board to three or four columns with the pane open; read the tiles.
3. Open a card from the board (the focused view) on the laptop and on the widest screen available.
4. Back on the widest screen, read the hub (the tabs) and open the template wizard.
expected: tiles fill their slot with no empty band beside or below the card and the text stays readable (never thumbnails) — a wide slot shows a wide card, a tall slot a tall one; a tile shows no scrollbar; when the slots become too narrow (three or more columns with the pane open) the board flips to the one-per-row list rather than shrinking further; the focused card is centred and no wider than about 1600 px on a big monitor and full width on the laptop — its title line and tabs centre with it, the tabs sitting on the card's title bar from its left edge (never hanging off to the left) — while the hub, the wizards and the card studio always fill the window's width; the action rows inside a narrow tile read as two lines

### UAT-RIT-004 — Tables fit their card
persona: owner
modules: controls/CaptureCard/styles.ts controls/CaptureRollup/editor.ts controls/CanvasRollup/editor.ts controls/Raci/styles.ts controls/SkillsMatrix/styles.ts
preconditions: a capture card with five text columns and twenty rows; a capture rollup over two boards; a RACI with six roles and ten deliverables; a skills matrix with eight people
steps:
1. Open each as a tile on a board, then focused; scroll the focused view down and, where it overflows, sideways.
expected: a capture table never scrolls sideways in a tile or the focused view at laptop width — the columns share the width and long cells wrap; scrolling down keeps the column heads in view and scrolling sideways (a rollup with many fields) keeps the Source / charter column in view; the RACI keeps its role heads and deliverable labels in view the same way, the skills matrix its people heads and skill labels

### UAT-RIT-005 — Diagrams keep fitting until you take over
persona: owner
modules: shared/ui/panzoom.ts controls/FiveWhys/editor.ts controls/FaultTree/editor.ts controls/ProcessMap/editor.ts
preconditions: a five-whys card with a five-step chain, a fault tree, a process map; a window you can resize
steps:
1. Open each focused; resize the window narrower and wider; open the details pane and close it.
2. Pan the diagram a little, then resize again; press ⤢ Fit to view.
expected: before you touch it, the diagram refits to every size change — a small five-whys chain grows past 1:1 to fill a wide window (up to 1.5×), a big one shrinks to fit; after a pan or a zoom the view stays where you put it through further resizes; Fit to view hands the fitting back; as a tile the diagram never enlarges past 1:1

### UAT-RIT-006 — Content cards follow their host
persona: owner
modules: controls/AgendaCard/styles.ts controls/ActionBoard/editor.ts controls/ActionBoard/styles.ts controls/CanvasCard/editor.ts controls/CanvasCard/styles.ts controls/CaptureCard/editor.ts controls/CaptureCard/styles.ts controls/CaptureRollup/styles.ts controls/LinksCard/editor.ts controls/LinksCard/styles.ts controls/EmbedCard/styles.ts controls/StatusTile/styles.ts
preconditions: a ritual board with an agenda, an action board set to Gantt, a status tile, a capture card with two rows and a links card with nine links in two groups; an initiative board with its charter; a laptop (about 1366 px) and the widest screen available
steps:
1. On the laptop with the details pane open, read the board's tiles; then open each card focused.
2. Widen the card (close the pane, or the big screen); narrow it (the pane open, or a split).
3. Links: as a tile, count the links shown and read "+n more"; focused on the wide screen, read the layout.
expected: the agenda tile clips without a scrollbar and, when narrow, puts who · minutes under each title in one row; the action board's kanban columns share the width with no sideways scrollbar, every kanban card keeps its who · due line inside its own edge (the line wraps; nothing spills onto the column) and, as a tile, an action awaiting endorsement shows the ◐ mark alone, and a Gantt asked for in a card under about 760 px shows the list with "The Gantt opens when the card is wider"; the charter TILE shows the whole canvas scaled to fit (never cut at row five) and the focused charter's rows grow to fill a tall window; a two-row capture card's big text never wraps a word a line (it is capped by the column width); the status tile's state word and reason grow and shrink with the box and a long reason stops at three lines; the links tile shows exactly six LINKS (group headings do not count) and "+3 more"; on the wide screen the links lay out in columns; an embed card's commentary pane sits under the frame when the card is narrow

### UAT-RIT-007 — Matrices and grids follow their host
persona: owner
modules: controls/RiskMatrix/editor.ts controls/RiskMatrix/styles.ts controls/Raci/editor.ts controls/Raci/styles.ts controls/SkillsMatrix/editor.ts controls/SkillsMatrix/styles.ts controls/ConditionsCard/editor.ts controls/ConditionsCard/styles.ts controls/SqdpcCard/editor.ts controls/SqdpcCard/styles.ts controls/HeatmapCard/styles.ts
preconditions: a board with a risk matrix (six risks), a RACI (six roles, eight deliverables), a skills matrix (four people), a conditions card, an SQDPC card with all five letters and a heatmap with a list; a laptop and, if available, a phone
steps:
1. Read each as a tile on the laptop with the details pane open, then focused; widen and narrow the card.
2. On the phone (or a pane under 480 px) read the risk matrix, the RACI and the heatmap.
expected: the risk matrix's cells grow square with the card and the register drops under the matrix when the two do not fit side by side; in a narrow tile the register is hidden and the matrix fits without sideways scroll; the RACI's label column gives way before the cells, a read-only RACI has no Actions column, and under 480 px each deliverable's name sits on its own row above its cells with the roles as initials (hover for the name); the skills matrix's columns stop growing at 96 px and a tile hides its Actions row; the conditions card's label column narrows with the card (down to 90 px) with the legend aligned under it and the name text shrinking to fit; the SQDPC letters wrap into two or three rows in a narrow box with the tile size chosen for that wrap, and digits vanish under 18 px; the heatmap's list sits under the image on a narrow host and is hidden in a narrow tile

### UAT-RIT-008 — Charts draw at the size they are shown
persona: owner
modules: controls/KpiTrendCard/editor.ts controls/KpiTrendCard/styles.ts controls/ParetoCard/editor.ts controls/ParetoCard/styles.ts
preconditions: a KPI trend card with readings and a Pareto with twelve categories; a laptop, the widest screen available and, if possible, a phone
steps:
1. Read both as tiles, then focused; widen and narrow the card.
expected: the trend chart fills its box with no blank band above or below, and its tick and value text reads the same size (about 10–12 px) in a tile, on the laptop and on the big screen — never giant on a 27" monitor, never specks on a phone; the Pareto likewise, and when the card is narrow the tail of small categories folds into one greyed "Other (n)" bar that cannot be tapped while the vital few keep their names; widening the card unfolds them

## Journey 2 — The Action card's views

### UAT-RIT-009 — Recently completed and Show all completed, edit from the Gantt, Gantt lanes follow the kanban columns
persona: participant
modules: controls/ActionBoard/editor.ts improvement/gantt.ts cardRegistry.ts
preconditions: a board whose Action card has an action completed today, two completed more than a week ago (or before this release) and some open ones; a second Action card configured with custom kanban columns (grouped by issue, e.g. Safety · Quality · Delivery) with actions in at least two columns
steps:
1. Open the first card. On the List view read the "Show all completed" switch and find ＋ Add action; switch to Kanban, then Gantt, reading both each time. In the card's settings set "Show completed for (days)" to 0, look, then clear it again.
2. Switch it on, then off again; look at the Kanban's Done column while it is off.
3. Mark every action complete, then look at the card.
4. On the Gantt, click an action's name; change its description; save. Then drag a bar.
5. Open the second card on the Gantt.
expected: step 1 the switch reads "Show all completed" on all three views and is OFF, with the count of OLDER completed actions in brackets; the action completed today shows on every view without it — struck through on the list, in Done, a grey bar on the Gantt — and stays for 7 days; the older ones show on none; with the setting at 0 no completed action shows until the switch is on, and with it cleared the week is back; ＋ Add action sits at the right-hand end of the same row on every view, in sight without scrolling however long the list, and nothing sits under the list any more; step 2 on, every completed action shows on the list, in Done and as grey bars; off again, the Done column keeps the recent one and reads "n older completed hidden" under it, and clicking that line switches all completed on; step 3 the card reads "All n actions are complete" with the switch and ＋ Add action on the row above it, not the empty-card prompt; step 4 the action's dialog opens from its name and the saved change shows; the bar still drags its dates; step 5 the Gantt shows a lane per kanban column in the kanban's order with a count, each folding to one summary bar on click, and the list view inside the Gantt groups the same way

### UAT-RIT-010 — Rating definitions on the HSE cross
persona: owner
modules: controls/SqdpcCard/editor.ts controls/SqdpcCard/types.ts controls/SqdpcCard/styles.ts controls/CardSettings/registry.ts
preconditions: a board with an SQDPC card whose dimensions include "+" (the safety cross) and three status codes
steps:
1. Open the card's settings; read the Dimensions help; in Status codes, write a sentence-long Definition for two of the codes (e.g. "A recordable injury or lost-time event") in the full-width line under each row; save.
2. Open the board and the focused card; read the legend.
3. Clear both definitions; save; read the legend again.
expected: step 1 the Dimensions help names S, Q, D, P, C and + as the shapes that draw, and the Definition line is wide enough to read the whole sentence; step 2 the legend is a rail down the LEFT of the letters — each rating's swatch, label and count on one line with its definition under it, the undefined rating alone, the tap hint at the foot — and the cross keeps its height (narrower, not shorter); step 3 with no definitions the legend is the single line under the letters it was before

### UAT-RIT-011 — A ritual every N weeks
persona: owner
modules: controls/MeetingWizard/editor.ts controls/MeetingWizard/types.ts shared/schema/recurrence.ts controls/CardSettings/registry.ts
preconditions: rights to create a ritual at a site
steps:
1. Create a ritual: in Cadence pick "Every … weeks", enter 4, pick Tuesday and a first occurrence on a Tuesday; finish the wizard.
2. Read the review step, then the Rituals list and the hub's calendar for the next three months.
3. Edit the ritual in the wizard: set the weeks to 2; save; read the cadence again.
expected: the review and the Rituals list read "Every 4 weeks"; the calendar shows the ritual on the first occurrence and then every fourth Tuesday after it (never the weeks between); setting 2 turns the cadence back to Fortnightly with every second Tuesday; existing fortnightly rituals are unchanged

### UAT-RIT-012 — The Gantt's window: longer ranges, moving along, one row with Add action
persona: participant
modules: controls/ActionBoard/editor.ts controls/ActionBoard/styles.ts improvement/gantt.ts improvement/ganttWindow.ts cardRegistry.ts controls/CardSettings/registry.ts
preconditions: a board whose Action card is wide (a full-width card on a desktop) and holds open actions with start and due dates spread over several months, one of them due more than six months out
steps:
1. Open the card on the Gantt view. Read the row that holds List | Kanban | Gantt.
2. Click 26w, then 52w; read the header and the dates under the chart.
3. On 13w click › twice, then ‹ once; read the dates under the chart, then click Today.
4. Click All.
5. On 52w click › once, then click an action's name, change its description and save.
6. Narrow the window until the card is about half its width.
expected: step 1 the range buttons (‹ 2w 4w 8w 13w 26w 52w All ›) and the ⋮ sit on the same row as ＋ Add action, to its left, with no row of their own under it; step 2 each shows that many weeks around the meeting's week (today when the board has no meeting), the header names months with the year on the first and on each January, the whole window is in view without scrolling sideways, and the dates under the chart carry the year once the window leaves this one; step 3 each arrow moves the window six weeks (its tooltip says so), a Today button appears once the window has left today and brings it back; step 4 every dated action is in view at once from the earliest start to the latest due date with today inside, the chart fills the card's width, and the arrows are greyed; step 5 after the save the Gantt is still on 52w at the place it was moved to, not back on 4w; step 6 on a narrow card the range buttons drop to the row below, right-aligned, and ＋ Add action keeps the top right

### UAT-RIT-013 — The action card by person
persona: participant
modules: controls/ActionBoard/editor.ts controls/ActionBoard/personGroup.ts controls/ActionBoard/styles.ts controls/CardSettings/registry.ts cardRegistry.ts improvement/gantt.ts
preconditions: a board whose Action card holds open actions held by three or more people, one action with nobody on it, and one action SHARED by two people with one part done; you may edit actions
steps:
1. Open the card on the Kanban view. Beside List | Kanban | Gantt choose "By person" in the small select.
2. Read the columns, their counts, the shared action and the unassigned one.
3. Drag a one-person action from its column to another person's. Then drag the unassigned action onto a person, and an action onto Unassigned.
4. Drag the shared action to a third person's column.
5. Press ＋ at the top of a person's column and raise an action without touching Who.
6. Switch to Gantt; then back to Kanban and choose "By status". Leave the card and open it again in the same session.
7. [Owner] In the card's settings set Kanban grouping to "By person"; open the card as someone who has not chosen a grouping.
expected: step 1 the select reads By status / By PDCA state / By issue / By person and changes only your own view; step 2 one column per person holding an action, by name, then "Unassigned"; the shared action stands in BOTH its people's columns reading "with 1 other", and "✓ part done" under the person whose part is done; a column's count is that person's actions; step 3 the dragged action is theirs afterwards (its Who shows the new person) and the counts follow; dropping on Unassigned leaves nobody on it; step 4 the shared action stays where it was and the card says it is shared and that who is on it changes in the action itself; step 5 the new action is raised for that column's person; step 6 the Gantt's rows are grouped under the same people (a shared action under each of them); "By status" returns the status columns and the Gantt to one flat list; the grouping you chose is remembered for the session; step 7 the card opens by person for them; the tile shows the same grouping with no select

### UAT-RIT-014 — A person column in a capture card
persona: owner
modules: controls/CaptureCard/types.ts controls/CaptureCard/fields.ts controls/CaptureCard/editor.ts controls/CardSettings/captureColumns.ts controls/CaptureRollup/editor.ts controls/CanvasCard/editor.ts shared/ui/personTypeAhead.ts cardRegistry.ts
preconditions: a board you own with a Capture card (for example "Celebrate success") and a roll-up card that reads it; the board has participants
steps:
1. Card settings → Columns: add a column "Who", type "Person", tick "Several people"; add "Noticed by", type "Person", unticked. Save.
2. In the meeting, add a row: under Who type part of a participant's name, pick with ↓ and Enter; add a second person; under Noticed by pick one person, then pick another.
3. Save; read the row, sort by the Who column, and reopen the row.
4. Remove one person with their ✕; Save. Read the roll-up card and open the row from it.
5. Read the card's tile on the board, and the same card on a phone.
expected: step 1 "Person" is among the column types and "Several people" shows only for it; step 2 the search is the standing type-ahead (one list under the box, Enter picks without saving the dialog); people already chosen are not offered again; Who gathers chips, Noticed by keeps only the last pick; step 3 the cells show the names as chips, the column sorts by name, and the dialog reopens with the same people; step 4 the removal holds; the roll-up shows the same chips and its edit dialog offers the same search; step 5 the tile and the phone show the names; nobody is notified by being named

### UAT-RIT-015 — An entry dialog marks what it needs and holds its button
persona: participant
modules: shared/ui/actionUi.ts shared/ui/dialog.ts shared/ui/dom.ts controls/RiskMatrix/editor.ts controls/HeatmapCard/editor.ts controls/FiveWhys/editor.ts controls/FaultTree/editor.ts
preconditions: a board with a Risk matrix card and a 5 Whys card (Heatmap and Fault tree behave the same), with people on the meeting
steps:
1. On the Risk matrix press "＋ Add risk". Read the labels and the Add button; hover it.
2. Type a hazard. Read the Add button.
3. Press "＋ Add action" in the dialog. Read the Who and Due labels. Type an action. Read the labels and the Add button; hover it.
4. Clear the Action box. Read the labels and the button.
5. Type the action again, tick a person, set a due date, and Add. Open the risk again.
6. On the 5 Whys add a cause: read the Cause label and the Add button before typing. Edit an existing cause, clear its text and read Save.
expected: step 1 Hazard and Risk each carry a small red asterisk; Add is disabled with the tooltip "Still needed: Hazard or Risk" — pressing it does nothing and nothing turns red; step 2 Add enables (either field will do); step 3 before any action is typed Who and Due carry NO asterisk; once the Action box has words both gain one and Add is disabled with "Still needed: Who, Due"; step 4 the asterisks go and Add enables — no action is being raised; step 5 the risk is added with its action listed under Treatments; there is no "Required before Add" line anywhere; step 6 Cause carries the asterisk and Add waits for it; Save on an existing cause waits the same way


### UAT-RIT-016 — A ritual shared with your site: seen in Settings, changed by the site that runs it
persona: siteadmin
modules: screens/ritualScope.ts screens/settings.ts screens/wizard.ts
preconditions: two sites; a ritual whose primary organisation is at the FIRST site and which is also shown in an organisation at the SECOND; a ritual at the first site that is not shared; a site admin of each site; neither admin owns the shared ritual
steps:
1. As the second site's admin: Settings → Rituals. Read the heading's note and the list.
2. On the shared ritual's card read the lines and the buttons; press Open.
3. Still as the second site's admin: put the shared ritual's edit address in the address bar (#/wizard/<its board id>).
4. As the first site's admin: Settings → Rituals; read the same ritual's card.
5. As a super admin: read the same card.
expected: step 1 the note reads "Rituals at <site>, and those from other sites that are also shown there."; the shared ritual is listed, the first site's unshared ritual is not; step 2 the card carries "Also at your site, from <first site>" and offers Open and Copy link only — no Edit meeting, Replicate or Archive; Open opens the board; step 3 the wizard does not open: "This meeting is run from <first site>. Its admins or its owner can edit it."; step 4 and 5 the card has no "Also at your site" line and offers Edit meeting, Replicate and Archive as before. The ritual's owner keeps Edit meeting wherever they sit

### UAT-RIT-017 — A card left straight after an edit keeps the picture of that edit
persona: participant
modules: saver.ts screens/cardEditor.ts
preconditions: a meeting board with a 5 Whys, a Fishbone and an Action card, an open meeting on it, and the board's Live switch available
steps:
1. Open the 5 Whys card. Type a new cause and, without pausing, leave the card (the back arrow) within half a second of the last keystroke.
2. On the board press the Live button to show stored snapshots. Read the 5 Whys tile.
3. Do the same on the Fishbone (add a cause, leave at once) and the Action card (add an action, leave at once). Read both tiles in the stored view.
4. Close the meeting. Open it again from the schedule and read the three tiles.
expected: step 2 the stored tile shows the cause just typed — it is not one edit behind; step 3 the same for the Fishbone and the Action card; step 4 the closed meeting's pictures show every last edit. (Before this, a card left inside the half second was saved with the picture of the edit before.) A live board was never affected: it draws each tile fresh

## Journey 3 — Search pickers (backlog programme tranche 5)

### UAT-RIT-018 — The meeting wizard's Owner and Participants search as you type
persona: siteadmin
modules: controls/MeetingWizard/editor.ts shared/ui/typeAhead.ts
preconditions: a roster of ten or more; someone in the directory who is not on the roster
steps:
1. Start a new meeting. In Owner type two letters of a roster name, then three letters of the directory person's name.
2. Pick the directory person. Go to Participants.
3. In "Add a person" type a roster name, press Enter on the lit match, then type the directory person's name and pick them.
4. Add someone by name in "Add by name".
expected: step 1 roster matches show at once under the box; the directory person follows under "In the directory" marked "new to the app"; step 2 they are the owner; step 3 there is ONE box and no Search button; each pick joins Participants and the cursor stays in the box; nobody is listed until a letter is typed; someone already a participant is not offered; step 4 unchanged

### UAT-RIT-019 — The hub's person box and an agenda item's "Search everyone" are type-aheads
persona: participant
modules: controls/LeanHub/editor.ts controls/AgendaCard/editor.ts shared/ui/typeAhead.ts
preconditions: the hub's Cadence or Actions tab with the person scope; a board whose roster is wider than its own people
steps:
1. In the hub's person box clear the name and type two letters. Pick with ↓ and Enter.
2. Clear the box and press Enter. Then type a name nobody has and click away.
3. Edit an agenda item. In "Search everyone…" type a name and pick it.
expected: step 1 the list floats under the box, the pick scopes the tab to that person; step 2 an empty box is everyone; a name nobody has snaps back to the current person; "Me" works as before; step 3 the person is added as a ticked chip and the list closes

## Journey 4 — Cards on a phone, and the capture card's add row (backlog programme tranche 6)

### UAT-RIT-020 — SQDPC and the risk matrix fit a phone's board list
persona: participant
modules: controls/SqdpcCard/editor.ts controls/RiskMatrix/editor.ts controls/RiskMatrix/styles.ts controls/RiskMatrix/types.ts controls/HeatmapCard/styles.ts controls/EmbedCard/styles.ts
preconditions: a board with an SQDPC card of five letters, a risk matrix with two risks rated into the same square (one with a residual rating), a heatmap with a list and an embed with commentary; a phone, or a pane under 480 px
steps:
1. Open the board on the phone. Read the SQDPC tile.
2. Read the risk matrix tile, then open it.
3. Read the heatmap and embed tiles.
4. On a laptop, read the square that holds two risks. Rate five risks into one square.
expected: step 1 all five letters show whole, small, with the legend under them and nothing drawn over anything; step 2 the tile shows the matrix with its consequence labels and axis title and NO register; opened, the register sits under the matrix; step 3 the heatmap's list and the embed's commentary are hidden in the tile; step 4 two markers sit side by side inside the square, up to four sit two by two, and five show three and "+2" whose tooltip names the rest

### UAT-RIT-021 — Fishbone reads as a list on a phone
persona: owner
modules: controls/Fishbone/editor.ts controls/Fishbone/styles.ts
preconditions: a board with a fishbone of six bones and about ten causes, some with votes and one Confirmed; a phone, or a pane under 480 px; a laptop
steps:
1. On the phone read the fishbone tile, then open the card.
2. Tap a cause. Change its status and save. Tap "＋ Add cause" under a bone and add one. Tap the problem.
3. Open the same card on the laptop.
expected: step 1 the tile and the card show the problem in a box, then each bone as a heading with its count and its causes under it, each with its status colour and its votes; no diagram; the text is ordinary reading size; step 2 the same dialogs as the diagram open; the list shows the change; step 3 the laptop shows the diagram, with the cause added on the phone on its bone

### UAT-RIT-022 — A capture card's row is added in the table
persona: participant
modules: controls/CaptureCard/editor.ts controls/CaptureCard/addRow.ts controls/CaptureCard/styles.ts
preconditions: a capture card with free rows and a text, a number, a date, a yes/no, a list (one with several values, one that depends on another) and a person column; a capture card with fixed row headers; an empty capture card
steps:
1. Open the card. Type in the first cell of the blank row at the foot. Press Tab across the cells, filling each. In the person cell type two letters and press Enter on the lit name.
2. Press Enter. Type the next row straight away and press Enter again.
3. Type something in the blank row and press Escape. Then press Enter on the empty row.
4. Pick a value in the list that others depend on; open the dependent list. In the several-values list pick two.
5. Click an existing row.
6. Open the card with fixed row headers, the empty card, and the board's tile of the first card. Download the card as a PNG.
expected: step 1 there is no "＋ Add row" button; each cell is an editor of its column's kind; Enter in the person cell picks the name and does NOT add the row; step 2 the row joins the table and the cursor is in the first cell of a fresh blank row, which stays in view when the table scrolls; step 3 Escape empties the row; Enter on an empty row adds nothing; step 4 the dependent list offers only its parent's options; each pick of the several-values list becomes a chip; step 5 the row dialog opens, as before, with Delete; step 6 the fixed-header card has no blank row; the empty card shows its prompt and a click on it opens the blank row; the tile and the PNG show no blank row
