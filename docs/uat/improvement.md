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
modules: improvement/initiativeForm.ts improvement/improvementTab.ts priorities/model.ts store/linkRule.ts
preconditions: a site with priorities at the company, the site and one department; the Improvement tab scoped to that department; the tester owns the department only (not the site or company), and the department has adopted one company priority as-is
steps:
1. Improvement → New initiative → pick a template; read the Organisation group's site, department and area.
2. Priorities & people → "＋ Link a priority"; read the list; type part of a company priority's statement; clear it; press "n more from above ›".
3. Change the department in the form to one with no priorities of its own; open the picker again.
expected: step 1 the form opens on the tab's scope, department included; step 2 the picker opens with the search box focused and lists only the department's open priorities under its name, with one line "n more from above ›"; typing narrows both the department's and the parents' priorities case-blind and shows the parents' groups; the line expands the company and site groups in chain order and lists ONLY the company priority the department adopted — priorities set above that the department has not pulled are not offered (pull them first, Priorities → ＋ Priority → Pull from above); step 3 a department without its own priorities shows "No open priorities at <department>" and the parents' groups straight away (or "None you can link — pull a priority to this org…" when there are none to offer); Edit details on an existing initiative uses the same picker, and an initiative that already carries a link to a priority from above keeps it and saves

### UAT-IMP-003 — Who may edit an initiative
persona: siteadmin
modules: improvement/initiativeModel.ts improvement/rowMenu.ts improvement/improvementTab.ts improvement/boardHeader.ts screens/board.ts actions/endorsement.ts
preconditions: signed in as a site admin of site A; an active initiative at site A you hold no role on, one at site B, and one at site B that also spans site A; a super admin on a second device
steps:
1. Improvement tab → the ⋮ on each of the three rows; read Edit details…, Flag, Escalate and Archive.
2. Open the site-A initiative's board: Edit details in the header, the health check button, an endorsement.
3. As the super admin, the same three rows.
expected: the site admin may edit, flag, escalate and archive the site-A initiative and the one that also spans site A, and sees those actions greyed on the site-B-only initiative; on the board the header's Edit details, the health check and the endorsement follow the same line; a confidential site-B initiative is hidden from the site admin unless they hold a role or own its org; the super admin has every action on all three — including initiatives they did not create and hold no role on

### UAT-IMP-004 — An initiative board is always live; a filled charter is not "empty"
persona: member
modules: screens/board.ts store/tiles.ts controls/BoardGrid/editor.ts
preconditions: an initiative whose charter card is filled from the header (title, problem, owner) and has never been edited on the card itself; at least one approved gate; a ritual board
steps:
1. Open a ritual board and click "Live board" so it reads "Stored board". Leave it that way.
2. Open the initiative's board. Read each card's tile and the Live board button.
3. Read the foot of the charter tile.
4. Click Live board, pick the gate snapshot, read the tiles and the banner; click "Back to live".
5. Return to the ritual board: read its button, then click it back to "Live board".
expected: step 2 the initiative's cards render their live content — the charter's fields, the metrics, the action plan with its actions — never a blank tile reading "CanvasCard" or "MetricsCard"; step 3 no "Nothing recorded yet" line under a charter that shows header data (a charter with nothing in any bound field still wears it); step 4 the gate shows the board as stamped, read-only, with the snapshot banner, and Back to live restores the living board; step 5 the ritual board still reads "Stored board" (the switch is the ritual boards' own), and a stored tile with no snapshot says "No stored snapshot"

### UAT-IMP-005 — Every owner is named
persona: member
modules: improvement/initiativeModel.ts improvement/improvementTab.ts priorities/prioritiesScreen.ts actions/linkTargets.ts
preconditions: an initiative whose Owner role holds two people, another with four, linked to a priority
steps:
1. Open the priority's popup, Initiatives tab; read each row's line.
2. Improvement tab: read the rows in the list view, then the tiles view.
3. Raise an action and search "Linked to" for the initiative.
expected: the two-owner initiative reads "Last, First & Last, First" in all three places; the four-owner one names the first two and "+2" on the popup row and tile (the list names three); nothing shows only the first owner

### UAT-IMP-006 — An admin adds someone from the directory while assigning a role
persona: siteadmin
modules: people/directoryAdd.ts improvement/initiativeForm.ts improvement/binding.ts priorities/dialogs.ts priorities/prioritiesScreen.ts shared/ui/actionUi.ts shared/ui/actionLinkProvider.ts main.ts
preconditions: signed in as a site admin of site A; a colleague in the directory who is NOT in the app; a person whose app access was revoked; an ordinary user on a second device
steps:
1. Create an initiative (or Edit details): press ＋ on the Owner role. Read the picker's title. Type the colleague's name, press "Search the directory…", and pick them.
2. On the initiative's charter card press a bound multi-person role, search the directory the same way and tick the person.
3. Edit a priority at a site-B org and set its owner from the directory with a second new person. Open Settings → Users and find both people.
4. Raise an action: in "Search everyone…" type three letters of a third new name, wait a moment, and pick them under "In the directory".
5. Search the directory for the revoked person and pick them.
6. As the ordinary user, open the same pickers and type a name nobody on the roster matches.
expected: step 1 the picker is titled by the role ("Choose the owner", "Choose the sponsor" …) and the person is added to the app and chosen in one step; step 2 the multi-person picker offers the same road and ticks them; step 3 both new people sit at site A — the admin's own site — whatever org was being edited, with the department only when the org was at site A; step 4 the directory is searched by itself after a short pause — there is no "Search the directory" button to press — and the action is assigned to the new person; step 5 the picker refuses: "had their access revoked. Restore them in Settings → Users first" — nobody is silently re-activated; step 6 an ordinary user is offered no directory search anywhere
