# Health checks — analysis and plan (2026-10-21)

Ben's scope ("Scope for health checks", 2026-10-21): define and complete
maturity health checks on the use of the application — priorities (per
pillar, several at once), initiatives (per initiative), cadence (per
meeting), documents (per organisational level). Standard criteria per
module plus site-specific criteria; sites enable each check type
(default off). Criteria = title · description · questions (single /
multi select, yes/no, all/some/no) with a weight per answer; a score
normalised 0–5 = chosen weights ÷ possible; two comments (what went
well, even better if); actions; the trend of recent checks in the
popup. Entry points: a Health check button left of "Live board" on
meeting and initiative boards, the Documents kebab, after ＋ Priority.

## What already exists

- **An initiative health check** (decision 12, 2026-08-20):
  `ImprovementSettings.healthQuestions` (yes/no or 1–5, a weight each,
  edited under Settings → Improvement), a popup from the initiative
  Details pane ("Health check" button, `boardHeader.ts openHealth`),
  the result on the initiative (`fieldValues.__health` = score /10 +
  date) and a `health` event with the answers. One question set for
  every initiative, no site criteria, no comments, no actions, no
  trend beyond the events.
- The initiative row menu carries a "Health check (next update)"
  stub; Document control health is a different thing (a scan, not an
  assessment) and keeps its name.
- Building blocks to reuse: the org tree and `pickOrg`; the standard
  action dialog (`openActionDialog`) and `upsertActions`; the issues
  PDF writer; site settings rows (APP_ROW for app-level JSON, one row
  per site); the settings strip and section patterns; the UAT tables
  as the pattern for "a definition frozen into each record".

## Critique and open questions (decided one by one with Ben)

(filled in as decided)

## Decisions

1. **Storage** (Ben, 2026-10-21): definitions as JSON on the settings
   rows (standard criteria per module on the APP_ROW; site criteria and
   the per-site enable switches on each site's row, one new long-text
   column); completed checks in ONE new table, one row per check with
   the criteria frozen into it. The existing initiative health check
   (`healthQuestions`, `__health`, the `health` event, the Details
   button, the row-menu stub) is REMOVED, not migrated — never used.
2. **Question shape** (Ben, 2026-10-21): one shape — options
   {label, guidance?, weight} + `multi`; yes/no and all/some/no are
   editor presets. Weights are whole numbers ≥ 0, invisible to the
   assessor; a question's possible score = its highest option (single)
   or the sum of its positive options (multi); an optional per-question
   "Not applicable" (set in the editor) drops it from both numerator
   and denominator.
3. **Score** (Ben, 2026-10-21): 0–5 to one decimal; per criterion and
   overall, the overall = chosen ÷ possible across every applicable
   question (a weighted whole, not an average of criteria); shown as
   the number plus a quiet five-segment bar, no colour in the first
   stage; Submit only when every applicable question is answered, the
   line under it naming how many remain.
