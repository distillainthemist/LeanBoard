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
expected: tiles fill their slot with no empty band beside or below the card and the text stays readable (never thumbnails) — a wide slot shows a wide card, a tall slot a tall one; a tile shows no scrollbar; when the slots become too narrow (three or more columns with the pane open) the board flips to the one-per-row list rather than shrinking further; the focused card is centred and no wider than about 1600 px on a big monitor and full width on the laptop; the action rows inside a narrow tile read as two lines

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
