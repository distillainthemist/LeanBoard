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
modules: controls/BoardGrid/editor.ts controls/BoardGrid/types.ts shared/ui/tier.ts shared/ui/baseCss.ts cardHost.ts
preconditions: a ritual board with several live tiles (an agenda, an action board, a status tile); a laptop (about 1366 px) and, if available, a wall screen
steps:
1. Open the board on the laptop with the details pane closed, then open the pane; read the tiles.
2. Set the board to three or four columns with the pane open; read the tiles.
3. Open a card from the board (the focused view) on the laptop and on the widest screen available.
4. Back on the widest screen, read the hub (the tabs) and open the template wizard.
expected: tiles fill their slot with no empty band beside or below the card and the text stays readable (never thumbnails) — a wide slot shows a wide card, a tall slot a tall one; a tile shows no scrollbar; when the slots become too narrow (three or more columns with the pane open) the board flips to the one-per-row list rather than shrinking further; the focused card is centred and no wider than about 1600 px on a big monitor and full width on the laptop — while the hub, the wizards and the card studio always fill the window's width; the action rows inside a narrow tile read as two lines

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
expected: the agenda tile clips without a scrollbar and, when narrow, puts who · minutes under each title in one row; the action board's kanban columns share the width with no sideways scrollbar, and a Gantt asked for in a card under about 760 px shows the list with "The Gantt opens when the card is wider"; the charter TILE shows the whole canvas scaled to fit (never cut at row five) and the focused charter's rows grow to fill a tall window; a two-row capture card's big text never wraps a word a line (it is capped by the column width); the status tile's state word and reason grow and shrink with the box and a long reason stops at three lines; the links tile shows exactly six LINKS (group headings do not count) and "+3 more"; on the wide screen the links lay out in columns; an embed card's commentary pane sits under the frame when the card is narrow

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

### UAT-RIT-009 — Show completed, edit from the Gantt, Gantt lanes follow the kanban columns
persona: participant
modules: controls/ActionBoard/editor.ts improvement/gantt.ts cardRegistry.ts
preconditions: a board whose Action card has two or more completed actions and some open ones; a second Action card configured with custom kanban columns (grouped by issue, e.g. Safety · Quality · Delivery) with actions in at least two columns
steps:
1. Open the first card. On the List view read the "Show completed" switch; switch to Kanban, then Gantt, reading it each time.
2. Switch it on, then off again; look at the Kanban's Done column while it is off.
3. Mark every action complete, then look at the card.
4. On the Gantt, click an action's name; change its description; save. Then drag a bar.
5. Open the second card on the Gantt.
expected: step 1 the switch is present on all three views and OFF, with the hidden count in brackets, and completed actions appear on none of them; step 2 on, completed actions show on the list, in Done and as grey bars; off again, the Done column stays as a drop target reading "n completed hidden", and clicking that line switches completed on; step 3 the card reads "All n actions are complete" with the switch and the Add button, not the empty-card prompt; step 4 the action's dialog opens from its name and the saved change shows; the bar still drags its dates; step 5 the Gantt shows a lane per kanban column in the kanban's order with a count, each folding to one summary bar on click, and the list view inside the Gantt groups the same way
