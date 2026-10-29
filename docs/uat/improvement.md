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
