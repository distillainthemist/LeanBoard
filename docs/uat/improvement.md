# Improvement — UAT script

Personas: member, lead, sponsor, siteadmin, superadmin. The Improvement tab's own cross-site process filter is covered by UAT-SET-005.

## Journey 1 — Value drivers

### UAT-IMP-001 — The driver tree's process filter, this site or across sites
persona: lead
modules: improvement/vdt/valuesTab.ts improvement/vdt/settingsTab.ts shared/ui/processPicker.ts shared/schema/process.ts
preconditions: two sites with value driver trees whose drivers name site process nodes linked to the same central process
steps:
1. Value drivers (the hub tab) on the first site: Process → the mode select reads "This site" → pick an area; read the dimming.
2. Switch the mode to "Across sites" → pick the type and the central process; read the dimming; switch the Site select to the second site.
3. Settings → Value drivers: the same Process bar on the structure editor.
expected: "This site" cascades through the site's own tree and dims the drivers outside the pick; "Across sites" dims the drivers whose process does not link to the central pick, and the pick HOLDS when the site changes (the second site's tree dims by the same central process); the structure editor's bar behaves the same; a site with no tree offers "Across sites" only, and no bar at all when the central hierarchy is empty

## Journey 2 — Initiatives

### UAT-IMP-002 — Linking a priority from the new-initiative form
persona: lead
modules: improvement/initiativeForm.ts improvement/improvementTab.ts priorities/model.ts
preconditions: a site with priorities at the company, the site and one department; the Improvement tab scoped to that department
steps:
1. Improvement → New initiative → pick a template; read the Organisation group's site, department and area.
2. Priorities & people → "＋ Link a priority"; read the list; type part of a company priority's statement; clear it; press "n more from above ›".
3. Change the department in the form to one with no priorities of its own; open the picker again.
expected: step 1 the form opens on the tab's scope, department included; step 2 the picker opens with the search box focused and lists only the department's open priorities under its name, with one line "n more from above ›"; typing narrows both the department's and the parents' priorities case-blind and shows the parents' groups; the line expands the company and site groups in chain order; step 3 a department without its own priorities shows "No open priorities at <department>" and the parents' groups straight away; Edit details on an existing initiative uses the same picker

### UAT-IMP-003 — Who may edit an initiative
persona: siteadmin
modules: improvement/initiativeModel.ts improvement/rowMenu.ts improvement/improvementTab.ts improvement/boardHeader.ts screens/board.ts actions/endorsement.ts
preconditions: signed in as a site admin of site A; an active initiative at site A you hold no role on, one at site B, and one at site B that also spans site A; a super admin on a second device
steps:
1. Improvement tab → the ⋮ on each of the three rows; read Edit details…, Flag, Escalate and Archive.
2. Open the site-A initiative's board: Edit details in the header, the health check button, an endorsement.
3. As the super admin, the same three rows.
expected: the site admin may edit, flag, escalate and archive the site-A initiative and the one that also spans site A, and sees those actions greyed on the site-B-only initiative; on the board the header's Edit details, the health check and the endorsement follow the same line; a confidential site-B initiative is hidden from the site admin unless they hold a role or own its org; the super admin has every action on all three — including initiatives they did not create and hold no role on
