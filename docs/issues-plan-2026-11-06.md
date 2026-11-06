# Issue round 2026-11-06 — findings and plan

Source: the issues export of 2026-11-06 04:04 UTC (5 reports: Mark
Gerrard ×2, Ben, Alicia Sargent; the fifth, "Folder selection in
Ingestion task resets view", was already Done). Analysed 2026-11-06
against v0.90.0. Ben worked through the decisions one at a time in the
intake thread; every row below records his answer.

| # | Report | Cause | Decision (Ben) | Status |
|---|---|---|---|---|
| 1 | Cannot select 4-weekly or another interval, e.g. 3 or 5-weekly (Mark, idea) | The recurrence engine has seven fixed cadences; fortnightly is the only interval kind (week parity from the anchor, `weeks mod 2`). Monthly and longer use the anchor's nth weekday, so 4-weekly is not monthly. | **Every N weeks, 2–12.** Fortnightly keeps its category and gains an interval (`intervalWeeks`, default 2); the wizard offers "Every … weeks" as one cadence, Fortnightly stays as the 2-week shortcut. `weeks mod N`. One day a week, anchored like fortnightly. | Built |
| 2 | Cannot edit to cascade the priority (Mark, bug) | Working as designed: managing an org is owning it or any org above it (`canManageOrg`), and Mark owns neither PacOps nor the company. On the way Ben found a real gap: the priority overlay's **Add initiative** checked only that the priority was active (`lifecycle.ts`), and the initiative form's picker offered priorities at the initiative's org **and every org above** (2026-08-29 rule) — so anyone could hang an initiative under a priority they cannot manage. | (a) **Managing an org = its owner, or a direct report of its owner** (the viewer's directory manager owns it), walking up the tree as before; a failed manager lookup grants owner-only. (b) **Initiatives link only to priorities at an org the person manages** (or adopted at one): the overlay button, the form's picker and the store's write all ask one rule; **upward linking ends — pull first**. (c) **Pull from above**: ＋ Priority offers a new priority or a pull of an active priority at an org ABOVE (not peers); the pull is adopted as-is or customised (Accept / Accept & customise); below a site's customisation floor the pull adopts as-is only. (d) **An adopted priority can be Customised** (becomes the org's own linked row — renameable via Edit, unlinkable via the Cascade tab) **or Dropped** (with a reason the sender sees). (e) **Existing upward links stay** and count; only NEW upward links are refused. | Built |
| 3 | Tabs offset on the focused / slide view (Ben, bug) | Since R0 the focused card is capped at 1600 px and centred between its rails (`.app-editor-host-capped`), but the title line and the tab strip above it were not — they keep a fixed 56 px inset from the window, so on any window wider than ~1740 px the card moves right and the tabs stay left. | **Cap the title line and the tabs with the card** (1600 + rails, centred). | Built |
| 4 | Legend for the HSE Cross ratings (Alicia, idea) | The SQDPC card's status codes carry code, label, colour, icon — no meaning; the legend shows label + this month's count only. | **A Definition per status code, always shown under its legend entry.** | Built |
| 5 | Folder selection in Ingestion task resets view | — | Already Done before the export. | — |

All app-only; no schema change (the interval, the definitions and the
pull's assignment ride existing JSON / rows).
