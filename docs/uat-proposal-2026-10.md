# UAT in LeanBoard — proposal (2026-10-19)

Ben's ask: a UAT tab in the app; Settings starts a run and assigns
people; flexible across components — pick the components, the run
loads their tests. First script: Documents. Environment: the
production test site.

## 1. Where the tests live

- One markdown file per component under `docs/uat/`:
  `documents.md`, later `rituals.md`, `actions.md`, `improvement.md`,
  `priorities.md`, `people-settings.md`, `issues.md`, `phone.md`.
  The markdown is the source of truth and is reviewed like code.
- A strict shape, one case per `###` block:

      ## Journey 5 — Lifecycle end to end
      ### UAT-DOC-051 — Submit for review sends the reviewers' card
      persona: owner
      modules: docs/lifecycleCmds.ts docs/notifyPanel.ts
      preconditions: a draft standard with two reviewers named
      steps:
      1. Open the document → Submit for review.
      2. …
      expected: status "In review"; each reviewer has a Teams card; …

- `tools/uat-compile.mjs` parses every file into
  `app/src/uat/scripts.generated.json` (ids, journeys, personas,
  modules, the git date each case last changed). A vitest test runs
  the parser over `docs/uat/` and fails the build on a duplicate id,
  a missing field or an unknown persona. The JSON is loaded by
  dynamic import, so the board chunk never carries it.
- `app/src/uat/components.ts` is the registry: key, label, script
  file, the personas it uses, and the source globs its cases cover.
  A component with no script yet shows "no script yet" and cannot
  be picked.

## 2. Data (schema-carrying)

- `ben_ltkuatrun`: name, status (planned|running|closed),
  components (JSON keys), app version at start, environment label,
  assignees (JSON `[{whoId,email,name,personas[]}]`), the case
  snapshot (JSON — the ids and titles as they were when the run
  started, so a later build cannot change what a run tested),
  created by/at, closed by/at, closing note. Delete: false.
- `ben_ltkuatresult`: lookup to the run, case id, outcome
  (pass|fail|blocked|skipped), note, tester email/name, at, the
  issue id when a fail was reported. One row per run + case, the
  latest write wins; the issue carries the history. Delete: true (a
  tester takes a tick back).
- Screenshots are not stored on results: a Fail goes through the
  issue reporter, which already stores them.

## 3. Settings → UAT (super admins)

- A list of runs with status, components, progress by persona and
  by tester, and the open fails.
- "New UAT run…": name; components as checkboxes with their case
  counts; people from the roster, each with the personas they
  cover; a scope choice — every case, or only the cases changed
  since a chosen release (the compiled JSON carries each case's
  last-change date, the release list comes from the tags shipped
  in the build); Start. Starting writes the run and sends each
  assignee a Teams card with the link to their UAT tab.
- On a run: Close run… (asks, records the note), "Re-run the
  fails" (a new run holding only the failed and blocked cases),
  Export PDF (the issues export's writer: one page per journey,
  outcome and note per case, the fails first).

## 4. The UAT tab (assignees)

- A hub tab, shown only to people assigned to an open run; several
  open runs = a run picker at the top.
- Cases for the tester's personas, grouped by journey, with a
  progress bar and "Next untested". A case expands to
  preconditions, steps and expected result.
- Pass · Fail… · Blocked… · Skip. Fail opens the issue reporter
  prefilled: title "UAT DOC-051: …", area = the component, the
  steps and expected result in the description, the tester's
  screenshots; the issue id is stored on the result and the case
  shows "Issue raised ↗". Blocked asks what blocked it.
- Phone layout: one case at a time, the same buttons — readers at
  a site will test on a phone.

## 5. Keeping it true

- CLAUDE.md rule beside the ledger rule: a behaviour change under a
  component's source updates or adds its UAT case in the same
  commit.
- `tools/uat-delta.mjs`: the cases whose `modules` changed since
  the last tag, for the release notes' "UAT delta" line and for the
  "changed since release" scope in New run.
- A full run before a solution-carrying release reaches production;
  a delta run for app-only ones. The run log lives in Dataverse
  (the runs) and the PDF export goes with the release record.

## 6. Build order and effort

1. Schema + services (1 h) · 2. script format, compiler, validation
test, registry (3 h) · 3. Settings → UAT (4 h) · 4. the UAT tab +
issue-reporter prefill (6 h) · 5. Teams card, PDF export, delta tool
(3 h) · 6. the Documents script content, ~100 cases (10–14 h, Ben
reviews per persona).

About 17 h of build plus the content. The release that carries it is
solution-carrying (two tables).

## Decisions needed

1. One result per case per run (latest tester wins) — or per tester,
   so two people can test the same case independently?
2. The UAT tab as a hub tab for assignees, or under Settings?
3. Fail always raises an issue, or "Fail without an issue" too?
4. Start with the Documents script only; the other components get
   their files as they come up.
