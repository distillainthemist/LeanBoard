# Improvement — UAT script

Personas: member, lead, sponsor, superadmin. The Improvement tab's own cross-site process filter is covered by UAT-SET-005.

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
