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
1. Improvement tab → the ⋮ on each of the three rows; read Edit details…, Flag and Archive.
2. Open the site-A initiative's board: Edit details in the header, the health check button, an endorsement.
3. As the super admin, the same three rows.
expected: the site admin may edit, flag and archive the site-A initiative and the one that also spans site A, and sees those actions greyed on the site-B-only initiative; on the board the header's Edit details, the health check and the endorsement follow the same line; a confidential site-B initiative is hidden from the site admin unless they hold a role or own its org; the super admin has every action on all three — including initiatives they did not create and hold no role on

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
1. Create an initiative (or Edit details): press ＋ on the Owner role. Read the picker's title and its search box. Type three letters of the colleague's name, wait a moment, and pick them under "In the directory".
2. On the initiative's charter card press a bound multi-person role, type a name the same way and tick the person.
3. Edit a priority at a site-B org and set its owner from the directory with a second new person. Open Settings → Users and find both people.
4. Raise an action: in "Search everyone…" type three letters of a third new name, wait a moment, and pick them under "In the directory".
5. Search the directory for the revoked person and pick them.
6. As the ordinary user, open the same pickers and type a name nobody on the roster matches.
expected: step 1 the picker is titled by the role ("Choose the owner", "Choose the sponsor" …), its box reads "Search the app and the directory…", people in the app narrow as you type and the directory is searched by itself after a short pause — no "Search the directory" button anywhere — and the person is added to the app and chosen in one click; step 2 the multi-person picker offers the same road and ticks them; step 3 both new people sit at site A — the admin's own site — whatever org was being edited, with the department only when the org was at site A; step 4 the directory is searched by itself after a short pause — there is no "Search the directory" button to press — and the action is assigned to the new person; step 5 the picker refuses: "had their access revoked. Restore them in Settings → Users first" — nobody is silently re-activated; step 6 an ordinary user is offered no directory search anywhere

### UAT-IMP-007 — One flag: from the menu, and from a status update
persona: member
modules: improvement/escalate.ts improvement/commentary.ts improvement/commentaryActions.ts improvement/commentaryModel.ts improvement/rowMenu.ts improvement/boardHeader.ts priorities/lifecycle.ts
preconditions: an active initiative you hold a role on, with a sponsor who has an email; no flag up; a second initiative that was "escalated" before this release
steps:
1. On the initiative board → ⋮: read the flag items. Choose "⚐ Flag — needs support…", write what you need, leave "Notify the sponsor" unticked, press Flag.
2. ⋮ → Clear flag. Then Add update: type only a High; read the flag section; type a Support needed line; read it again.
3. With the flag ticked, choose "Notify the sponsor by Teams" and Save.
4. Add another update with a different Support needed line and no other change; then one with "Clear the flag" ticked.
5. Open the second initiative.
expected: step 1 the menu has ONE flag item and no "Escalate to sponsor"; the dialog asks what you need (required) and the tick reveals the sponsor chips and "Flag & email" / "Flag & send Teams"; after Flag the header shows "⚐ Flagged" in the Flagged colour with the note on hover, and the initiative reads Flagged wherever it is listed; step 2 the Add update dialog always shows "⚐ Flag this initiative — it needs support", unticked until Support needed has text, then ticked (untick it and it stays unticked); ticking with no Support text refuses to save and says why; step 3 the update saves, the flag goes up with the Support text as its note, and the dialog stays open on "✓ Saved and flagged. Sent by Teams…" (or "Not sent: …" — the flag stands either way) until closed; step 4 the first update replaces the flag's note with the new text; the second clears the flag; an EDIT of an update never offers the flag; step 5 it reads Flagged, with its escalation note kept

### UAT-IMP-008 — The Improvement tab reads the same status
persona: member
modules: improvement/improvementTab.ts improvement/ganttCard.ts improvement/statusLoad.ts improvement/gantt.ts improvement/status.ts improvement/boardHeader.ts improvement/statusBand.ts
preconditions: the four initiatives of UAT-PRI-012 in one department; a completed initiative; a ritual board with an Actions Gantt card scoped to that department
steps:
1. Improvement tab, list view: read each row's left edge and the chip beside its title; hover a chip. Switch to tiles, then to the Gantt.
2. Open the ritual board's Actions Gantt card.
3. Open initiative D's board; read the status band.
expected: step 1 every active row's edge is its status colour — the same state the Priorities popup gives it; a flagged row carries "⚐ Flagged · at risk" or "· recovery needed", an off-track row "Off track", each with its reasons on hover (and what was asked for, on a flag); an on-track row carries no chip; the completed initiative's edge is neutral; tiles carry the colour on top and a ⚐ or ✕ glyph; the Gantt's group rows carry the same edge; the Actions column says "n late", not "overdue"; step 2 the card's group edges match the tab's; step 3 the band says "No update for n days" only once the recency window (Settings → Priorities → Status, 35 days unless changed) has passed — not at 14 days

### UAT-IMP-009 — Attachments & links on an initiative and on an action
persona: member
modules: attachments/list.ts attachments/model.ts attachments/actionSlot.ts store/attachments.ts improvement/boardHeader.ts shared/ui/actionUi.ts
preconditions: an active initiative you hold a role on, with an Action card holding a saved action; a PDF of a few MB, a file over 30 MB, and a web link to hand; a second account that can see the initiative but holds no role on it
steps:
1. Open the initiative board → the details pane → "Attachments & links". Press ＋ Add file and pick the PDF; then drag two files onto the block together.
2. Pick the file over 30 MB.
3. Press ＋ Add link; type "notes" and Add link; then paste a full web address with a caption and press Enter.
4. Read the header beside the title; press the 📎 chip. Click the PDF's name, then the link's.
5. Open the action from the Action card: add a file under Comments; close the dialog with Close (not Save) and open it again.
6. As the second account, open the same pane and the same action.
7. As yourself, remove the PDF with ✕.
expected: step 1 "Uploading <name>…" shows, then the file is listed newest first with who added it, the date and its size, and the heading counts it; two dropped files upload one after the other ("Uploading 1 of 2…"); step 2 nothing uploads and the line says the file's size, the 30 MB limit, and to put large files in the working folder and add a link; step 3 "notes" is refused as not a web address; the full address is added by Enter without closing or saving anything around it, listed by its caption, and https:// is added when it was left off; step 4 a "📎 n" chip sits with the title's chips and opens the details pane at the attachments; the PDF downloads under its own name; the link opens in a new tab; step 5 the action's file is there on reopening — an attachment is saved when it is added, not with the dialog's Save — and a NEW action (Raise) shows no attachments block until it exists; step 6 the second account sees and opens everything, has no ＋ Add file / ＋ Add link on the initiative, and no ✕ on rows it did not add; step 7 a confirmation names the file and says it is deleted for everyone; after it the row and the count are gone

