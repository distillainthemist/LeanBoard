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
