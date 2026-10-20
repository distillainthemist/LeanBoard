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
4. **Scope** (Ben, 2026-10-21): a priorities check is scoped to a
   SUB-PILLAR at an organisational level (the Priorities screen's
   current org by default), ONE at a time — no multi-pillar sitting;
   an initiative check to the initiative; a cadence check to the
   meeting (board + the occurrence it was done in); a documents check
   to an organisational level — site, department or area ("team" =
   area), the person's site by default.
5. **Who** (Ben, 2026-10-21): run it — priorities: whoever manages the
   org's priorities (org owner, site/super admins); initiative: a role
   holder, site/super admins; cadence: the board's owner or a
   participant, site/super admins; documents: controllers, site/super
   admins. See it — anyone who can open the scope (controllers and
   admins for documents). ONE check per scope per day (not per person):
   the button on a scope checked today opens that check. A submitted
   check stays EDITABLE for 7 days by anyone who may run it (the edit
   stamps who and when), then LOCKS.
6. **Settings → Health checks** (Ben, 2026-10-21): one section per
   type (Priorities · Initiatives · Cadence · Documents) with the
   site's "Enabled" switch (off by default), the STANDARD criteria
   (super admins edit; site admins read them, marked "standard", and
   CANNOT hide one) and the SITE criteria beneath (site/super admins
   add, marked with the site); one criterion editor for both (title,
   description, questions with options and weights, the yes/no and
   all/some/no presets, Not applicable, drag order); saves through the
   Save bar; a "Recent checks" list per section (date, scope, score,
   assessor, Open) — a site admin's own site, a super admin every
   site through a site picker.
