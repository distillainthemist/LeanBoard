# Bulk-adding a site's people from the directory — proposal (2026-10-31)

Ben, 2026-10-31: a super admin picks a site; the app walks the site
owner's reports through the Office 365 Users connector, lists them for
confirmation in a popup, and adds them as users with their site set.
Aim: bulk add for initial setup. A critical review before building.

## What already exists

- **The site owner is known.** The org editor's `ben_orgowners` on each
  site row carries the site's owner and one owner per department (and
  areas). Nothing has to be picked by hand: the site chooses the root.
- **The connector reaches the reporting tree.** `DirectReports_V2(id,
  $select, $top)` returns one level; `UserProfile_V2` gives jobTitle,
  department, officeLocation, accountEnabled, userType, mail. There is no
  "all reports" call — the walk is a breadth-first loop over direct
  reports, one request per manager.
- **Adding a person is one function.** `upsertPerson` writes the roster
  row and fires the access-group membership add; `syncAllAccess`
  reconciles the whole roster against the Entra group in one pass.
- **Settings → Users already adds from the directory** one person at a
  time (`directoryAddCard`, site admins locked to their own site).

## The traps a naive build falls into

1. **Reporting lines are not site membership.** A site GM's tree carries
   matrix reports from corporate (finance, HR, IT), contractors with
   accounts, service accounts, shared mailboxes with a manager set, and
   people who have left but whose account is only disabled. A blind add
   puts them all on the site.
2. **Entra's department string is not the app's department.** "Casting
   Operations" vs the app's "Casthouse"; a blank; a company-wide
   "Operations". Label matching alone assigns a third of people wrongly
   or not at all.
3. **The site owner may not be the top of the tree.** Where the owner is
   an operations manager and the GM reports elsewhere, their peers'
   teams are missed. Where the owner is the CEO (a single-site
   business), the walk is the whole company.
4. **Scale and throttling.** A 400-person site has 50–80 managers: 50–80
   connector calls, each a Graph call under the viewer's delegated
   permissions. Fine sequentially with small concurrency and a retry on
   429; unbounded parallel calls are not. A manager with more than 100
   direct reports is truncated unless `$top` is raised (the connector's
   V2 call exposes no skip token).
5. **Per-person access-group adds.** 300 `upsertPerson` calls fire 300
   Graph membership adds, each surfacing its own failure. One reconcile
   at the end (`syncAllAccess`) is one road and one report.
6. **Re-running must be safe.** Setup is not once: new starters arrive.
   The same walk, run again, must show only who is new, never move or
   demote anyone already placed, and never resurrect a revoked person.
7. **Where it lives.** "Access control" is the Entra-group section —
   the gate on who may OPEN the app. Adding people is the Users tab's
   job (the directory add sits there). A super-admin-only "Import a
   site's team…" button on Users keeps one place for roster growth.

## The smart shape

**Roots from the org editor, departments from the owners' subtrees.**
Walk the site owner's tree for the full set, then walk each DEPARTMENT
owner's tree: a person under department owner D is proposed into D, and
under an area owner into that area. The org editor's owners ARE the
hierarchy, so the reporting lines place people without guessing from
labels. Entra's department string is the fallback (matched blind to
case, ampersands and dashes through `labelKey`), and blank when nothing
matches. Where a person sits under two owners (dotted lines), the deeper
owner wins and the row is flagged.

**A pure planner, a thin walker, a preview, one write pass.**

- `shared/schema/teamImport.ts` (pure, tested): `planImport(walk,
  roster, siteOrg, owners)` → one `ImportRow` per directory person:
  `{whoId, name, mail, jobTitle, entraDepartment, officeLocation, via
  (manager chain), proposedDepartment, proposedArea, include, flags}`.
  Flags: `disabled`, `guest`, `noMail` (service / shared accounts),
  `onRoster` (same site — skipped), `otherSite` (on the roster under a
  different site — shown, UNTICKED, never moved unless ticked),
  `revoked` (an inactive row — never resurrected here), `outsideSite`
  (officeLocation names a different app site), `deep` (more than N
  levels down), `twoOwners`. Default `include` = enabled member with a
  mail, not on the roster, not flagged outside.
- `app/src/store/directoryWalk.ts`: `walkReports(rootIds, {maxPeople
  1500, maxDepth 8, concurrency 4})` — breadth-first, a visited set
  (manager cycles exist), `$top=999`, retry once on a throttle, a
  progress callback ("142 people · 19 managers · level 3"), stops at the
  cap with a plain message. The Users add card's directory search is
  reused for an extra root.
- `app/src/people/importTeam.ts`: the dialog. Site select (super
  admin), "Start from" chips prefilled from the site owner — add or
  remove roots via directory search (trap 3). Walk with progress → a
  table: tick, name + title, Entra department, proposed department
  (select over the site's departments, area beside it when the
  department has areas), via, flag chips. Filters: "Show skipped",
  counts ("212 to add · 31 already here · 9 outside the site · 4
  disabled"). "Add 212 people" confirms → one write pass:
  `upsertPerson(..., {skipAccessSync: true})` per row with a progress
  line, then `syncAllAccess` once, then a result card (added, skipped,
  failed by name, group sync report). A second run of the same site
  shows "already here" for everyone added.
- `upsertPerson` gets an `opts.skipAccessSync` for the batch; the
  single-person roads are unchanged.

Roles: everyone arrives as "user". Crew: blank. Site admins: not in the
first cut — the walk reads the directory under the viewer's own
delegated permissions and works for any signed-in person, so opening it
to site admins for their own site is a later `fixedSite` flag, as the
directory add card did.

No schema change — app-only. Tests on the planner (flags, department
placement from owner subtrees, two owners, re-run idempotence); UAT-SET-007.
About a day.

## Decisions (Ben, 2026-10-31 — the recommended option each time)

1. Settings → Users, "Import a site's team…" beside "Search directory & add".
2. Departments from the department owners' subtrees (areas from area
   owners), Entra's label as the fallback, two owners → the deeper one, flagged.
3. People already on another site: shown with an "on <site>" chip,
   unticked; ticking moves them.
4. Roots: the site owner prefilled, add or remove through directory search.
5. Caps: 1500 people, 8 levels, 4 connector calls at a time.

## Decisions as first proposed

1. **Where**: Settings → Users "Import a site's team…" (recommended) or
   under Access control as asked.
2. **Department placement**: from the department owners' subtrees with
   the Entra label as fallback (recommended), or Entra label only.
3. **People already on another site**: listed and unticked, move only
   when ticked (recommended); or hidden.
4. **Roots**: the site owner prefilled with add/remove (recommended), or
   the site owner only.
5. **Caps**: 1500 people / 8 levels / concurrency 4 (defaults).

## Built (2026-10-31, app-only)

- `shared/schema/teamImport.ts` (pure, 9 tests): `labelKey`, `planImport(walk,
  roster, site, owners, allSites)` → `ImportRow[]` sorted by depth then
  name — placement from the nearest owner up the manager chain (area
  owners place into department + area; an owner is in their own
  department), `twoOwners` when the chain crosses two departments'
  owners, Entra label fallback; flags disabled / guest / noMail /
  onRoster / otherSite / revoked / outsideSite / deep; `include` default
  excludes everything but deep and twoOwners; `summarize`, `FLAG_LABEL`.
- `app/src/store/directoryWalk.ts`: `walkReports(rootIds, onProgress,
  caps)` — roots via `UserProfile_V2`, levels via `DirectReports_V2(id,
  $select, 999)`, 4 workers, one retry after 1.5 s, visited set, caps
  1500 / 8, `truncated`, `failed` manager names.
- `app/src/people/importTeam.ts`: `openTeamImport` — the four-step
  dialog (site + roots with the owner prefilled and directory search for
  more → walk with progress → review table with per-row department /
  area selects, flag chips, "Show skipped and already here", counts →
  write pass with `upsertPerson(…, {skipAccessSync: true})` then ONE
  `syncAllAccess`, result card, "Import another site").
- `upsertPerson` gained `opts.skipAccessSync`; Users tab (super admins)
  gained "Import a site's team…" beside "Search directory & add", the
  roster's site filter preselects the site.
- UAT-SET-007; `people/` in the settings component.
