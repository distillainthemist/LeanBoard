# LeanBoard

LeanBoard is a **Power Apps code app** for running a lean management
system on Microsoft 365: meeting rituals and problem-solving boards,
cascaded priorities, improvement initiatives with their metrics and value
drivers, a central actions register, and a SharePoint-backed controlled
documents system — in one shell, with Teams and Outlook notifications,
in-app issue reporting and in-app user acceptance testing.

It is code-first (vanilla TypeScript, Vite, no framework), ships through
`pac code push` and tagged GitHub releases, stores its data in Dataverse
tables delivered as a managed solution, and talks to SharePoint, Teams and
Outlook through the standard Power Platform connectors. There is no
backend of its own. Current release: see the
[releases page](https://github.com/distillainthemist/LeanBoard/releases).

The maintained technical overview is
[docs/architecture.md](docs/architecture.md). This page is the tour.

## The hub

The app opens on a hub whose tabs a site can switch on per site:

| Tab | What it is |
|---|---|
| **My day** | The person's day: their rituals for the day and their actions bucketed late, due today, due this week. |
| **Cadence** | The site's meeting cadence — a scoped calendar of ritual instances with protected-time bands, crew rosters and the person's own filters; each instance opens its board. |
| **Priorities** | The cascaded priorities: company pillars, priorities cascaded down the organisation, the review queue, a walk-through presentation mode, an A3 poster, a year control, and a per-priority popup with its initiatives, actions, commentary, metrics and charter. |
| **Improvement** | Initiatives on templates (stages, gates, roles, fields, metrics), each with its own board; list and tile views, flags, escalation to sponsors, archive, a Gantt of their actions. |
| **Value drivers** | The site's value driver tree with KPI value entry, plan / forecast / actual by period, scenarios and links to the initiatives that move each driver. |
| **Actions** | The person's actions across every board, with parts per assignee, due dates, endorsements and escalation. |
| **Documents** | The controlled documents system (below). |

Settings sit behind the header cog: rituals, users, organisation, process
model, site cadence, priorities, improvement templates, value drivers,
access control, branding, documents, UAT and issue triage, each gated by
role (user, site admin, super admin). Phone layouts exist for the hub, the
boards, the register and the UAT tab.

## Boards and cards

A board is a grid of tile snapshots; tapping a tile opens that card's full
editor. Meeting boards run per occurrence, project and initiative boards
have one living instance with gate snapshots, and a composer and card
studio let a site admin lay boards out and author standard content. The
card catalogue:

- **Rituals** — Agenda, Capture card, Capture rollup, Meeting scheduler.
- **Action management** — Actions (list, kanban or Gantt), Escalation viewer.
- **Performance** — Status tile, KPI trend, Initiative metrics, Pareto, SQDPC, Winning conditions, Heatmap, Embed (Power BI or any https page).
- **Problem solving** — Five whys, Fishbone, Fault tree, Process map (flowchart, swimlane, SIPOC, value stream), Benefit–effort.
- **Project management** — Canvas (the initiative charter), Canvas rollup, RACI, Skills matrix, Benefit–effort quadrants.
- **Reference** — Documentation & links, Standard documents, Document health, Priorities, Actions Gantt, Linked card.

Every card writes one JSON document and raises actions into the central
register; causes share one node model across the root-cause tools, and a
card's tile repaints from its saved snapshot.

## The improvement system

- **Cascaded priorities** — pillars and priorities with spans across
  financial years, cascade to child organisations with accept / customise
  / hold / reject decisions, RAG roll-ups from the initiatives and actions
  beneath, a primary initiative per priority, and shareable views.
- **Initiatives** — created from templates (methods, PDCA stages with
  descriptions and target weeks, gates with approver roles, standard
  roles and fields, metric rules); a charter card bound to the header
  fields, a Metrics card, commentary updates with staleness, stage
  reverts with history, escalation cards to sponsors, confidential
  initiatives, and the working folder in SharePoint.
- **Value drivers** — the tree, the KPI value grid, KPI cards that link
  back to drivers, and the roll-up into the priorities' RAG.

## Controlled documents

A document management system over SharePoint libraries, read and written
through the SharePoint connector, with the app's own vocabulary held in
the term store.

- **Register** — libraries as tiles, folders by organisation, search,
  filters by status, organisation (at any level), document type, process,
  person, dates and links; chosen and ordered columns, personal and site
  views, favourites, a Flags column, "Show only approved", and a phone
  register.
- **Viewer** — the document with its details pane: properties by section,
  versions, linked documents, management-of-change records, flags and
  tag proposals; copy link, download, share with a QR code, open in a new
  tab; permission-aware for Restricted View readers.
- **Lifecycle** — check-out / check-in, replace content, submit for
  review with the reviewers' Teams card, review complete, submit for
  approval with a warn-and-confirm gate, approve and publish through
  content approval, mark reviewed with cadence-driven review dates,
  cancel revision, supersede and obsolete; every step with Teams or
  email notifications from one notify panel.
- **People and access** — owners, approvers, reviewers and revision
  editors from the site columns; edit-access requests with grant and
  revoke; the controllers and owners & approvers groups; an owner outside
  the group cannot approve.
- **Document tasks** — one badge and one panel: awaiting your approval or
  review, checked out to you, review due, flagged for review, access
  requests and grants; a "show all in register" scope.
- **Flags and tags** — any reader flags a document for review with a
  level, a comment and a screenshot; owners hear on Teams, controllers
  triage, Mark reviewed offers to close. Readers propose tags; controllers
  approve, and a tag is written only on a document in revision.
- **Ingestion** — bulk-drop tasks with assignees, a grid of required
  details with defaults, per-file flags, and a run that lands files in
  their destination library with the right status and version.
- **Health** — document control health across the libraries: missing
  owners, statuses, IDs and tags, reviews overdue, people who left or sit
  outside the group, open flags; replace a person, add to the group, a
  Teams digest and a CSV export.
- **Term store** — Organisation and Process area term sets kept in step
  with the app's organisation and process model: drift reports, one-way
  write-through, orphan handling, retirement.

## Cross-cutting

- **Notifications** — Teams cards and Outlook mail through the
  connectors, with deep links that open the right screen.
- **Issue reporting** — anyone reports a bug or idea from the app with
  screenshots; super admins triage, merge, decline and message every
  reporter and follower, and export issues as PDF.
- **UAT in the app** — test scripts live as markdown under
  [docs/uat](docs/uat) and compile into the build; a super admin starts a
  run with components, scope and testers per persona; testers get a UAT
  tab with their cases, and a Fail raises an issue. Runs report progress
  by persona and tester and export as PDF.
- **Diagnostics** — probes for the SharePoint write road, the move road,
  the feed and notifications, and a timing readout for super admins.

## Repository layout

```
app/        the code app (TypeScript, Vite): src/screens, src/docs,
            src/priorities, src/improvement, src/issues, src/uat,
            src/store (Dataverse), src/generated (pac-generated services)
controls/   the card editors and the shared card model (platform-free
            classes the app mounts directly)
shared/     design tokens, JSON schemas, UI kit, pointer/drag, PNG export
data/       the declarative Dataverse schema and its deployer
docs/       architecture, runbooks, design records, UAT scripts
tools/      the UAT script compiler and delta tool
```

## Build, test and gates

Node 22. From `app/`:

```bash
npm install
npm run build      # compiles the UAT scripts, type-checks, bundles
npm test           # vitest — the pure model, parsing, date math, scripts
npm run gate       # import gate + native-dialog gate
npm run chunks     # chunk report
```

The repo-root `npm run typecheck` covers `shared/` and `controls/`. All of
these run in CI on every push.

## Deploy and release

- **Dev**: `cd app && pac code push`.
- **Release**: `./release.sh x.y.z` then `git push origin main --tags`. The
  tag runs the Release workflow, which attaches the code-app package and
  the managed `LeanToolKitData` solution to a GitHub Release.
- **Another environment**: import the managed solution, then the app
  package; the SharePoint site steps and the per-release schema notes are
  in [docs/deploy-to-new-org.md](docs/deploy-to-new-org.md).

## Documentation

- [docs/architecture.md](docs/architecture.md) — structure, connectors, SharePoint interfacing, deployment, security and DLP.
- [docs/deploy-to-new-org.md](docs/deploy-to-new-org.md) — the receiving-org runbook.
- [docs/sharepoint-writes.md](docs/sharepoint-writes.md) — the SharePoint write cookbook.
- [docs/ui-standard.md](docs/ui-standard.md) — the visual standard.
- [docs/uat-proposal-2026-10.md](docs/uat-proposal-2026-10.md) and [docs/uat](docs/uat) — UAT in the app and the scripts.
- [docs/controls](docs/controls/README.md) — per-card reference and JSON contracts.
- [docs/leanboard-cascade-improvement-plan.md](docs/leanboard-cascade-improvement-plan.md) — the running ledger of what shipped when.

## History

The cards began as Power Apps Component Framework controls; the PCF
target was retired at v0.12.0, the permanent archive of that form, and
the code app has been the sole product since. The rationale is in
[docs/leanboard-pcf-retirement-plan.md](docs/leanboard-pcf-retirement-plan.md).
