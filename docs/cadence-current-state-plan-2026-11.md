# Cadence Current State — the utility app's first tool (plan, 2026-11-03)

Ben, 2026-11-03: a second code app, **LeanBoard Utilities** (`utility/`),
for task-specific tools. Its first tool, **Cadence Current State**, scans
the signed-in person's own Outlook calendar for a chosen period, lists
every meeting for review with include/exclude ticks, masks confidential
meetings, and exports the result for an agent to analyse.

The working review and plan is the Claude Doc "Cadence Current State:
review and plan"; this page is the repo's record of the decisions and
phases.

## Decisions (Ben, 2026-11-03)

1. **Where it lives**: a separate code app in the existing
   **LeanToolKitData** solution (display name "LeanBoard"), which already
   holds the LeanBoard code app, the LeanBoard User role and the tables.
   Pushed with `pac code push --solutionName LeanToolKitData`
   (`npm run push` in `utility/`), so the release's managed export
   carries both apps.
2. **Period**: the user picks from and to; default the last month; at
   most 12 months, either direction.
3. **Attendee roles**: meeting role (organizer, required, optional,
   resource) and response; job title and department from Office 365
   Users; internal or external by tenant domain.
4. **Confidential**: sensitivity personal, private and confidential are
   all masked. A masked meeting keeps start, end, duration and
   recurrence; subject reads "Confidential"; everything else is blank.
5. **Bodies**: HTML to text, Teams/Zoom join blocks stripped, full length
   up to Excel's 32,767-character cell limit.
6. **Declined and cancelled**: dropped from the list and the export, only
   counted in the excluded totals.
7. **Access**: the app is shared with one Entra security group.
8. **Calendars**: the user's own primary calendar only (`/me/calendar`).
9. **Format**: JSON is the main export (meetings with series and
   attendees nested, a header with period, masking rule and field
   dictionary); Excel is an option with the same content as sheets.

Nothing is stored server-side. The app's connectors are Office 365
Outlook and Office 365 Users only — no Dataverse table, no SharePoint.

## Phases

- **Phase 0 — probe (this commit).** `utility/` scaffold and a probe page
  that measures, in the hosted player: the Outlook connector's
  `HttpRequest` on `/me/calendar/calendarView`, whether the `Prefer`
  headers (time zone, text body) are honoured, which fields come back
  (attendee type and response, event type, series id, sensitivity,
  cancelled, online meeting), `@odata.nextLink` paging, a series master's
  recurrence, the typed `GetEventsCalendarViewV3` fallback, and an Office
  365 Users job-title lookup. Status-only output. Also proves the push
  into the solution.
- **Phase 1 — shell.** The tools hub, tokens from `shared/`, the shared
  dialog, gates (import, native dialog, chunk), UAT component.
- **Phase 2 — pure model with tests.** Normalise events, group by
  series, classify and mask, clean bodies, recurrence wording, internal
  or external, derived fields (duration, weekday, counts, hours a week).
- **Phase 3 — read and review.** Paged scan with progress and Cancel,
  series reads a few in flight, cached people lookups; the grouped
  review list with ticks, chips, filters and totals.
- **Phase 4 — export.** JSON first; Excel option (`xlsx.ts` moved to
  `shared/export/`, date-time cells added).
- **Phase 5 — release and docs.** Release workflow and runbook (the
  solution carries both apps; the group share), UAT script
  `docs/uat/cadence.md`, the ledger.

## Phase 0 — running the probe (Ben's Mac)

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
git fetch origin claude/project-thread-741dac
git checkout claude/project-thread-741dac
cd utility
npm ci
npm run build        # after checkout: the tree is clean, so the stamp is
npm run push         # push-gate, then pac code push --solutionName LeanToolKitData
```

The first push creates the app and writes its `appId` into
`utility/power.config.json` — commit that change. Then open **LeanBoard
Utilities** in the player, allow the Outlook and Office 365 Users
connections, press **Run calendar probe**, then **Copy log**, and paste
the log into the thread. It holds counts, field names and status codes
only.

If `pac code push` refuses the copied connection references, run
`pac code add-data-source -a shared_office365 -c <connection id>` and
the same for `shared_office365users` in `utility/` (it regenerates
`src/generated/` and `.power/`), commit, build, push.

## Phase 0 — results (Ben's run on dev, 2026-11-03, build v0.88.1-1-gdc7da78)

- **The Graph passthrough is the road.** `HttpRequest` on
  `https://graph.microsoft.com/v1.0/me/calendar/calendarView` answered
  (first call 4.6 s cold, later calls ~0.3–0.7 s) with every field the
  tool needs: attendees with type and response, event type
  (`occurrence`, `singleInstance`), `seriesMasterId`, sensitivity,
  showAs, my response, cancelled, all-day, `onlineMeetingProvider`
  (`teamsForBusiness`), organizer, location, body.
- **`/me/calendarView` is refused** (400, "Allowed values: me,users …
  messages, mailFolders, events, calendar, calendars, outlook, …"). Always
  go through `/me/calendar/…`.
- **Send ONE combined Prefer header**:
  `Prefer: outlook.timezone="<zone>", outlook.body-content-type="text"`.
  As two custom headers only the last was honoured (times came back in
  UTC); combined, both were (times in `Australia/Brisbane`, bodies as
  text). The browser's IANA zone name is accepted.
- **Series master read works**: `/me/events/{seriesMasterId}?$select=type,recurrence`
  gives `seriesMaster` with pattern type, interval, daysOfWeek and range.
- **The typed fallback works**: `CalendarGetTables` (3 calendars, the
  default named "Calendar") and `GetEventsCalendarViewV3` (attendees only
  as semicolon strings, no per-attendee response, no event type).
- **Office 365 Users** found the internal attendee, but job title and
  department were empty — the directory profile is not populated for
  that person. The export will carry blanks where Entra has none.
- **Not yet measured: `@odata.nextLink` paging** — the probe week held 2
  events. Phase 3 measures it on a busier range before relying on it.

## Phases 1–4 — built (2026-11-03)

- **Shell**: `utility/src/main.ts` is the tools hub (one tile today; each
  tool loads by dynamic import). The probe stays behind the hub's footer
  link (`#/probe`).
- **Model** (`src/cadence/model.ts`, pure, 16 tests in
  `src/__tests__/cadence.test.ts`): cancelled and declined dropped and
  counted; personal / private / confidential flagged; wall-clock times
  in the requested zone; organizer listed once as `organizer`; roles,
  responses, internal by the signed-in person's domain (and its
  sub-domains); Teams / Zoom join blocks stripped, full length;
  recurrence in words; series grouping (most common subject wins over a
  renamed exception); the 12-month period rule.
- **Scan** (`src/cadence/read.ts`): calendarView pages of 100 following
  `@odata.nextLink` (retried relative once if the absolute link is
  refused), series masters and directory lookups four in flight (at most
  500 people), Cancel between calls, the typed V3 action as the fallback
  with a warning on the review.
- **Review** (`src/cadence/screen.ts`): presets and dates, summary
  (meetings, series · one-offs, ticked, hours a week, confidential),
  filters and search, series rows that tick and flag as one with Show
  all for single occurrences, the export bar.
- **Export** (`src/cadence/exportDoc.ts`): ONE place masks — a
  confidential meeting keeps start, end, duration, all-day and
  recurrence, subject "Confidential", everything else blank; a series
  with any masked occurrence is masked as a whole. JSON (about · series
  · meetings with nested attendees) and Excel (About, Series, Meetings,
  Attendees; real date-time cells — `{ datetime }` in
  `shared/export/xlsx.ts`, ten-decimal serials so 09:30 reads 09:30).
- **UAT**: `docs/uat/cadence.md` (8 cases, persona `user`), component
  `cadence` in `app/src/uat/components.json`; `tools/uat-delta.mjs` now
  reads `utility/src` too.

Hosted checks still Ben's: paging on a busy 12-month calendar, the
download inside the player, Excel opening the file, and the app listed
in LeanToolKitData.
