# Card responsiveness — critical review and plan (2026-10-30)

Ben, 2026-10-30: the meeting and initiative cards were set up to roughly
fit 16:9; what could be done per card to improve how their layouts
respond? Four code reviews (the host machinery, the seven meeting
cards, the seven analysis cards, the eight content cards) read the
code at v0.84.0; nothing was rendered. Status: ANALYSIS — nothing
built; the questions at the end need Ben's answers.

---

## 1. The finding: the host, not the cards, sets the ceiling

**There is no 16:9 anywhere.** The BoardGrid lays tiles on
`repeat(cols, 1fr) × repeat(rows, 1fr)` tracks that split whatever
width and height the pane has (`controls/BoardGrid/editor.ts:302-303`);
columns come from the board's grid setting, rows from the tiles. A slot's
shape therefore follows the pane: wide and short on a wallboard, tall
and narrow on a laptop with the details pane open.

**Every live card is drawn on one fixed stage, 640 × 420 px (1.52:1),
then shrunk or enlarged with `transform: scale(min(w/640, h/420))`**
(`controls/BoardGrid/types.ts:43-44`, `editor.ts:363-390`). The stage is
centred horizontally and top-aligned, so a wide slot gets empty bands
left and right and a tall slot an empty band below. Consequences, with
14 px base text:

| Setup | Slot width | Scale k | Text | Empty space |
|---|---|---|---|---|
| 1366 laptop, 3 cols, 2 rows, pane closed | ~431 px | 0.49 | ~7 px | ~57 px each side |
| 1366 laptop, 3 cols, 3 rows, details pane open | ~284 px | 0.25 | ~3.5 px | bands each side |
| 1920 wallboard, 4 cols, 2 rows | ~459 px | 0.72 | ~10 px | ~130 px below |
| 2560 monitor, 2 cols | ~1200 px | 1.40 | ~20 px | ~177 px each side |

Laptop tiles are thumbnails; a wallboard is borderline at viewing
distance; a 27" monitor draws the same 640 px layout magnified rather
than showing more. **No card can tell what scale it ends up at**: the
transform does not change layout boxes, so every ResizeObserver a card
owns (ActionBoard's 480 px narrow rule, CanvasCard's, SQDPC's,
Conditions', Capture's) reads 640 × 420 in a tile and only meets real
widths in the phone list or the focused view. Nothing in the host chain
sets `container-type`; the mobile review's note that "cards' tile modes
are container-queried" is not borne out by the code. The only narrow
rule in the shared CSS is a viewport media query (`baseCss.ts:336`),
which never fires for a narrow card on a desktop.

Two more host facts shape every card's behaviour:

- **A tile cannot scroll or pan**: `.ltk-tile` turns pointer events off
  (`baseCss.ts:377`), so anything a card puts in an `overflow: auto`
  area is cut off, often with a dead scrollbar showing.
- **The focused view is the whole window** with no frame: at 1366 × 768
  the card is about 1230 × 500 at true 14 px (fine); at 2560 × 1440 it
  is about 2400 × 1150 with long lines and empty height. On a phone it
  is the natural width, the same reflow as list mode.

The phone list (M2, v0.66.0) is the one place the model is right: the
stage is the slot's natural size and cards reflow — which is why the
list exposed the per-card gaps (SQDPC, RiskMatrix, RACI, Fishbone).

**Conclusion.** Per-card work done before the host is fixed would be
tuned to a stage no card is ever shown at. The order is: host first,
then a shared size signal cards can read, then the cards in the order
of what hurts most on the surfaces Ben cares about.

---

## 2. Per-card findings

| Card | What breaks today | Cheap fix | Structural |
|---|---|---|---|
| **AgendaCard** | Clipped at 420 logical px with a dead scrollbar; a tall slot (its natural shape) wasted; at 330 px titles wrap a word a line (`.ltk-ag-right` 38%); on 27" rows stretch 2500 px | `.ltk-tile .ltk-ag-body{overflow:hidden}`; a narrow rule (<420 px) that drops the right column under the title; cap the body ~1100 px centred | — |
| **ActionBoard** | Kanban 3 × 200 px min columns = 624 px in a 616 px body: a permanent horizontal scrollbar; Gantt plot ~136 px in a tile and near zero in a 480–700 px focused view | columns `min-width:0; flex-basis:0` in tiles (or 160 px); body overflow hidden in tiles; Gantt falls back to the list under ~760 px | — |
| **ConditionsCard** | Label column fixed 168 px and legend margin 174 px: at 330 px the grid is 359 px and clips, 20 px names wrap; the height budget reserves 36 px for a title bar tiles hide; on 27" cells cap at 240 px and sit left | label `clamp(90px, 26%, 168px)` fed to the calculation; legend margin follows; centre the grid; skip the title reserve in tiles | — |
| **SqdpcCard** | 28-day columns make the tile width-bound (~16 px, digits 5 px before scale), 55% of the stage empty; at 330 px the panels wrap into rows the calculation does not expect and clip; a gap mismatch (24 vs 20) | hide sub-labels and digits under ~18 px; try 1/2/3 wrap rows and keep the largest tile; fix the gap constant | — |
| **StatusTile** | Fixed 30/14/11 px text: a long reason clips at 210 px height and "updated" overlaps the dots; a 30 px word in a 2500 px box on 27" | `container-type:size` on the body; `clamp()` sizes in cqmin units; line-clamp the reason | — |
| **KpiTrendCard** | Fixed viewBox 640 × 300 `meet`: ~110 px blank bands in a tile; ~5 px labels on a phone; 40 px ticks and 10 px strokes on 27" | size the viewBox from the measured box (ResizeObserver) so one unit = one px; `vector-effect: non-scaling-stroke` as interim | — |
| **ParetoCard** | Same viewBox scaling; labels take 29% of the height; 15+ categories wrap past the band and clip | the same measured viewBox; rotate labels or show top N + "Other" when narrow | — |
| **Fishbone** | `.fb-root{min-height:420px}` is taller than a ~248 px phone stage: the lower half clips (the "corner of the canvas"); fixed 1120 × 680 layout gives 4–5 px chip text in tiles; `resize()` is never called | drop the min-height in tiles and under 600 px; `min-height:0` on the stage | a vertical spine under ~480 px |
| **FiveWhys** | Shared PanZoom fit is clamped 0.3–1, never enlarges, refits only while `needsFit`: a 5-why chain (~1050 px) is clipped on a phone with the ROOT CAUSE off-screen and cannot be panned; small chains sit top-left on 27" | refit on every resize until the user pans or zooms; allow fit up to ~1.5 in the focused view; stack chains vertically under ~480 px | — |
| **FaultTree** | Same PanZoom; breadth grows the width; 0.3 floor clips the sides on a phone | the same PanZoom changes | an indented outline under ~480 px |
| **ProcessMap** | Own pan/zoom fits ONCE from a rAF, no ResizeObserver; 9 px detail text; palette fixed 112 px (a third of a phone) | observe the svg and refit until the user takes over; collapse the palette to an icon strip under 600 px | — |
| **RiskMatrix** | No responsive code: matrix always ~347 px (`92px repeat(5, minmax(48px,1fr))`, 46 px rows), register `min-width:200px`: 583 px minimum, so a phone tile overflows sideways and cannot scroll; on 27" the matrix stays top-left | `flex-wrap` so the register drops under; `aspect-ratio:1` cells that grow; hide the register in narrow tiles (the chips already number the matrix) | — |
| **BenefitEffort** | The most fluid card; chips `max-width:150px` overlap on a ~290 px canvas and half-clip at 0%/100% | `max-width: clamp(80px, 30%, 150px)`; clamp chip centres inside the canvas | — |
| **HeatmapCard** | The only card with a working fit; at 330 px the list's `min-width:150px` beats its `max-width:40%`, the image gets ~146 px and 22 px pins pile up | under ~480 px stack the list under the image, or hide it in tiles | — |
| **CanvasCard** | Reflows (1–3 `1fr` columns; a 480 px narrow mode) but rows are a fixed 60 px step: a tile shows ~5 rows and cuts the rest with no hint; a phone shows 2–3 fields; on 27" two 1200 px columns with 60 px rows and most of the height empty | in tiles scale the grid to the body (the BoardGrid's own trick); let rows grow (`grid-auto-rows: minmax(60px, …)`); cap `--h` at 2 when narrow | — |
| **CanvasRollup** | One column per field, 260 px caps, `min-width: max-content` inherited: 1500 px+ tables, no sticky header or first column | sticky first column and head; first N columns + "+k fields" in tiles | one card per charter under 480 px (styles exist) |
| **CaptureCard** | `min-width: max-content` makes the minimum width the sum of the 260 px caps: 4–5 text columns overflow a tile and scroll a phone sideways; the "simple" font scale ignores width (44 px text in 260 px cells on 27"); the height budget counts hidden chrome | `min-width:100%`; cap the font by column width too; lift the cell cap under `.ltk-cc-simple` | — |
| **CaptureRollup** | The CaptureCard overflow plus ⚑ and Source columns | the same; sticky Source column; fold the date and flag under 480 px | — |
| **LinksCard** | **Bug**: `.ltk-lk-row:nth-child(n+7)` counts group headers too, so grouped lists show fewer than six and "+n more" is wrong; rows stretch 2000 px on 27"; the two-column form is cramped on a phone | an overflow class set in JS from index 6; `repeat(auto-fill, minmax(320px,1fr))` when wide; one-column form under 400 px | — |
| **EmbedCard** | Commentary pane fixed 300 px leaves a 340 px frame in a tile and ~40 px on a phone | stack the pane under the frame under ~560 px (≤40% height), or hide it in narrow tiles | — |
| **Raci** | `200px repeat(n, minmax(58px,1fr)) 62px`: six roles = 662 px, already past a 640 tile; one role fits a phone; the 62 px actions column stays when read-only | label `minmax(110px,200px)` sticky; drop the actions column when read-only or in a tile; under 480 px the deliverable on its own row with initials-only headers | — |
| **SkillsMatrix** | `190px repeat(people, minmax(60px,1fr))`: a tile fits ~6 people, a phone 2; 400 px cells with a 26 px disc on 27" | `minmax(44px, 96px)` with `justify-content:start`; sticky label column; hide the Actions row in tiles | — |

---

## 3. The plan

Each tranche is app-only and its own release; the harness pages
(`app/harness/`, the screenshot road for controls) are stepped through
at 375, 1366 × 768 and 2560 × 1440, and every tranche updates the UAT
cases of the cards it touches.

### R0 — the host (about 2 days) — everything else depends on it

1. **A stage that follows the slot.** In `renderLive`, derive the stage
   from the slot instead of the constant: keep the stage's HEIGHT at
   420 and set its width to `clamp(480, 420 · w/h, 1120)` (so a wide
   slot gets a wide stage and the text size stays even across slots),
   OR choose a width from the slot so the resulting scale lands near
   0.85–1.0. Either way the stage takes the slot's aspect and `k` fills
   both directions: no letterbox bands, no 3–7 px text on a laptop, no
   magnified 640 px layout on a 27" screen, and every card's existing
   ResizeObserver starts seeing real widths in tiles. The fixed
   640 × 420 stays for the stored-snapshot path (its SVGs carry a
   viewBox) — and the snapshot CAPTURE in the card registry must follow
   the new stage size, or stored tiles and live tiles diverge.
2. **One size signal from the host.** `container-type: inline-size;
   container-name: ltk` on `.ltk-root` in `baseCss.ts` (safe: the root
   is always `width:100%`), a few named tiers in the shared CSS
   (phone < 480, compact < 900, regular, wide ≥ 1400), and `renderLive`
   setting `--ltk-tile-scale` and `data-ltk-tier` on the stage. Cards
   then adapt with CSS alone in tiles, the focused view, the list and
   the phone, and stop each carrying its own threshold.
3. **A floor on the wall and a frame in the focus.** If the computed
   `k` falls under ~0.6 (a 1366 laptop with the pane open, or 3+ rows),
   drop to fewer columns or the list, so no board ever shows thumbnails.
   Cap `.app-editor-host` at `max-width: min(100%, 1600px)` centred, so
   a 27" monitor gets a readable centred card.
4. **Tiles never show a dead scrollbar.** `.ltk-tile [class*="-body"]
   {overflow: hidden}` in the shared CSS, and the pan/zoom fit lowered
   or aimed at the important end in tiles.

### R1 — the shared layers (about 1 day)

- The viewport `@media (max-width: 599px)` rules in `baseCss.ts` become
  container queries on the `ltk` container.
- Tables fit their container: `min-width: 100%` replaces
  `min-width: max-content` (`CaptureCard/styles.ts:18`, inherited by
  CaptureRollup and CanvasRollup), with a sticky first column and
  sticky head for Capture, CaptureRollup, CanvasRollup, RACI and
  SkillsMatrix.
- The shared PanZoom (`shared/ui/panzoom.ts`): refit on every resize
  until the user pans or zooms; fit above 1 (to ~1.5) in the focused
  view; a ResizeObserver on ProcessMap's svg with the same rule.

### R2 — charts (about 1 day)

KpiTrendCard and ParetoCard size their viewBox from the measured box so
one unit is one pixel (text stays 10–12 px from a phone to a 27"
screen, the blank bands go); `vector-effect: non-scaling-stroke`;
Pareto rotates labels or shows top N + "Other" when narrow.

### R3 — matrices and grids (about 1.5 days)

RiskMatrix (wrap, square growing cells, register hidden in narrow
tiles), RACI (minmax sticky label, actions column dropped when
read-only, stacked rows under 480), SkillsMatrix (capped columns,
sticky label, Actions row hidden in tiles), ConditionsCard (clamped
label column, legend follows, no title reserve in tiles), SqdpcCard
(wrap-aware tile size, digits hidden under 18 px, the gap constant),
HeatmapCard (stacked under 480).

### R4 — content and status cards (about 1 day)

CanvasCard (scale-to-fit in tiles, growing rows, `--h` capped when
narrow), CaptureCard and the rollups (font capped by width, column
caps lifted in simple mode, folded flag and date under 480),
LinksCard (the overflow-count bug, auto-fill grid when wide, one-column
form), EmbedCard (pane stacked or hidden when narrow), StatusTile
(container-unit `clamp()` text, line-clamped reason), AgendaCard (right
column dropped under the title when narrow, body capped when wide),
ActionBoard (fluid kanban columns, Gantt list fallback under 760).

### R5 — the diagrams' narrow forms (1–2 days, optional)

A vertical spine for Fishbone, vertical chains for FiveWhys, an
indented outline for FaultTree — the only structural changes in the
plan. They matter only if the analysis cards are read on phones; the
R0 stage and the R1 pan/zoom fix make them legible on every desktop
slot without this.

**About six days in all before R5.** R0 alone removes the worst of it
on every board; R1–R4 can ship in any order after it.

---

## 4. Questions for Ben

1. **Which surface is first?** The wallboard (1920, 4 columns), the
   laptop (1366 with the details pane open), the phone list, or the
   focused view on a big monitor? R0 helps all four; the order of
   R2–R4 follows the answer.
2. **Should slots keep a fixed aspect?** Today a slot's shape follows
   the pane. R0 as written lets the card fill whatever shape the slot
   has. The alternative — enforce 16:9 slots and letterbox the board —
   wastes height on a laptop but keeps a board looking the same on
   every screen. I recommend following the pane.
3. **Does the stored-snapshot tile still matter?** Live tiles are the
   default; if boards still show stored SVG snapshots anywhere, the
   capture size must follow the adaptive stage (R0 step 1 carries it).
4. **Cap the focused view at 1600 px?** Or let a 27" monitor use the
   width (the Gantt and the RACI could use it; a charter cannot).
5. **R5 at all?** Only if the analysis cards are used on phones.

---

## Decisions (Ben, 2026-10-30)

1. **First surface: the laptop with the details pane open** — the worst
   case today and the screen meetings and initiatives run from. After
   R0, the card order is Agenda, ActionBoard, Canvas, Capture, then the
   wallboard cards (SQDPC, Conditions, StatusTile, KPI trend), then the
   phone-list cards (RiskMatrix, RACI, Fishbone).
2. **Slots follow the pane; the stage adapts** (R0 step 1 as written).
   No enforced 16:9, no letterbox. Cards must tolerate shapes from about
   1:1 to 3:1 — the R3/R4 narrow and wide rules.
3. **Live tiles are the rule; snapshots are a fallback.** The capture
   keeps its 640 × 420 viewBox; a snapshot that still shows draws at the
   old shape, accepted as rare.
4. **The focused view is capped at ~1600 px, centred.**
5. **R5 (the diagrams' narrow forms) waits for the phone pass.** R0 and
   the pan/zoom refit make them legible on every desktop slot first.

Order of work: R0 → R1 → R4 (laptop cards) → R3 (wall and phone cards)
→ R2 (charts), each its own app-only release; R5 later.

---

## Built — R0 (2026-10-30, dev, unreleased, app-only)

- **The stage follows the slot** (`controls/BoardGrid/types.ts`
  `liveStageFor`, `editor.ts renderLive`): the stage takes the slot's
  shape with its width clamped to 480–1120 px — a slot in that range
  renders at natural size (k = 1), a tighter one shrinks from a 480 px
  stage, a huger one grows from 1120; left/top 0, no letterbox band. The
  fixed 640 × 420 stays as the mount size and the snapshot viewBox
  (decision 3). Tests in `boardGridList.test.ts`.
- **The readability floor** (`wantsList`): the wall lists under 600 px
  of its own width (the phone rule) OR when a column's slot would scale
  under 0.6 — `measure()` divides the grid's width by the laid-out
  columns.
- **The size signal** (`shared/ui/tier.ts`): `tierFor` (phone < 480,
  compact < 900, regular < 1400, wide), `applyHostTier` stamps
  `data-ltk-tier` and `--ltk-host-w` on the host; the BoardGrid stage
  stamps it on every fit (plus `--ltk-tile-scale`), the focused host
  (`app/src/cardHost.ts editorHost`) through one shared ResizeObserver
  that lets go of hosts that have left the document. NOT a container
  query: layout containment would trap the cards' `position: fixed`
  dialogs inside their root. `baseCss.ts` documents the tiers and
  carries the first tier rule (the narrow action row, twin of the
  viewport query); R1 moves the rest.
- **Tiles hide every scrollbar** (`.ltk-tile *`), so a clipped body no
  longer shows dead chrome.
- **The focused view is capped** at 1600 px and centred
  (`.app-editor-host`, `.app-card-row` justify-content).
- UAT: RIT-003.

## Built — R1 (2026-10-30, dev, unreleased, app-only)

- **The viewport rule has its tier twin** (R0 carried it): the shared
  narrow action-row rule fires on `[data-ltk-tier="phone"]` hosts as well
  as under a 600 px window. LeanHub's own media queries stay — the hub
  is not a tiered host.
- **Tables fit their container** (`CaptureCard/styles.ts`, inherited by
  CaptureRollup and CanvasRollup): `min-width: 100%` replaces
  `max-content`; the head is sticky at the top, the row label / Source /
  charter column sticky at the left (`border-collapse: separate` so
  sticky works). RACI and SkillsMatrix (CSS grids): role / people heads
  sticky top, deliverable / skill labels sticky left, with the card's
  background so the gap shows nothing through.
- **Pan / zoom keeps fitting** (`shared/ui/panzoom.ts`, ProcessMap):
  `autoFit` holds until the person pans (> 3 px) or zooms; the
  ResizeObserver refits on every size change while it holds; "Fit to
  view" and a reload hand it back; a fit may ENLARGE to 1.5× in the
  focused view and stays at 1:1 in a tile (`closest(".ltk-tile")`).
  ProcessMap gains a ResizeObserver on its svg with the same rule
  (disconnected on destroy).
- UAT: RIT-004 (tables), RIT-005 (diagrams).

## Built — R4 (2026-10-30, dev, unreleased, app-only)

- **AgendaCard**: tile body clips (no scrollbar); phone tier wraps the
  row — who · minutes · actions under the title in one row; wide tier
  caps the body at 1100 px, centred.
- **ActionBoard**: fluid kanban columns (`flex: 1 1 0; min-width:
  160px`, none in a tile), tile body clips; `ACTIONBOARD_GANTT_MIN` 760 —
  the Gantt falls back to the list under it with a note (`viewFor`
  gains `ganttRoom`; tested).
- **CanvasCard**: a reading canvas (`.ltk-cv-grow`) lets rows grow to a
  tall host (`minmax(step, 1fr)`; the designer keeps the fixed step);
  a TILE scales the grid to fit its body (`fitTile`, floor 0.5); the
  narrow cap `--hn` (≤ 2 steps per field).
- **CaptureCard**: the simple font scale is capped by column width
  (~12 characters) and no longer reserves the title bar / Add row a tile
  hides; `.ltk-cc-simple td` lifts the 260 px cap. **CaptureRollup**:
  the ⚑ column folds away on the phone tier.
- **LinksCard**: the tile's six-link rule counts LINKS (the
  `ltk-lk-overflow` class set from the sixth row; the nth-child rule
  that counted headings is gone); wide tier lays links out in
  `auto-fill` columns; phone tier one-column form.
- **EmbedCard**: phone tier stacks the commentary pane under the frame
  (≤ 40% height) and hides it in a tile.
- **StatusTile**: `container-type: size` on the tile (its dialogs live
  on the root, so nothing is trapped); state, reason and "updated" in
  `clamp()` container units; the reason clamps at three lines.
- UAT: RIT-006.

## Built — R3 (2026-10-30, dev, unreleased, app-only)

- **RiskMatrix**: `.ltk-rm-body` wraps so the register drops under the
  matrix; the matrix flexes (320–640 px) with `minmax(40px, 1fr)` cells
  that keep `aspect-ratio: 1`; a phone-tier tile hides the register;
  the tile body clips.
- **RACI**: label column `minmax(110px, 200px)`; the Actions column only
  when the card is editable; `RACI_NARROW_MAX` 480 — a ResizeObserver
  flips the stacked form (label spanning the row, role heads as
  `roleInitials`, tested).
- **SkillsMatrix**: columns `minmax(44px, 96px)`, label `minmax(120px,
  190px)`, `justify-content: start`; a tile hides the Actions row and
  clips.
- **ConditionsCard**: `--cn-label-w` = 26% of the card clamped 90–168
  px drives the grid, the legend offset and a `clamp()` name size; a
  tile reserves no title bar.
- **SqdpcCard**: the panel gap constant matches the CSS (20); the tile
  size is chosen over one, two or three wrap rows of panels and the
  largest wins; `.ltk-sq-small` hides digits and sub-labels under 18 px;
  a tile reserves no title bar.
- **HeatmapCard**: phone tier stacks the list under the image (≤ 40%);
  a phone-tier tile hides it.
- UAT: RIT-007.

### R0/R3 follow-up (2026-10-30, Ben's screenshots)

- **A very short slot scales down instead of cutting** (`LIVE_STAGE_MIN_H`
  300): a five-by-four wall gave 370 × 150 px slots and the stage, following
  the slot's shape, could not hold a matrix or a fishbone — the top rows
  showed and the rest clipped. The stage is now at least 300 px tall,
  `k = min(w/stageW, h/stageH)`, centred when height-bound. Readability
  on such walls is the board's column count, not the card's.
- **RiskMatrix no longer scrolls when focused**: `--rm-cell` from a
  ResizeObserver — the largest square that fits five columns beside the
  axis AND five rows under the titles, 36–120 px — replaces the
  width-only `aspect-ratio` cells.
- **Fishbone** drops its 420 px floor in a tile and on the phone tier;
  its stage may shrink (`min-height: 0`).

## Built — R2 (2026-10-30, dev, unreleased, app-only)

- **KpiTrendCard and ParetoCard** measure their viewBox from the svg's
  box through a ResizeObserver on the root (`measureChart`; floors
  240 × 140 / 240 × 180; the old constants are the first-paint
  defaults). One unit is one pixel, so the 9–12 px tick, value and label
  text stays that size from a phone tile to a 27" screen and the plot
  fills the box. `vector-effect: non-scaling-stroke` on the strokes.
- **Pareto folds its tail**: under ~44 px per bar the smallest
  categories become one greyed, untappable "Other (n)" bar; the vital
  few keep their names and their quick-tally buttons.
- UAT: RIT-008.

All five tranches (R0, R1, R4, R3, R2) are built; R5 waits for the phone
pass (decision 5).
