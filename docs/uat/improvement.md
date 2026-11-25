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
expected: step 1 the picker is titled by the role ("Choose the owner", "Choose the sponsor" …), its box reads "Search the app and the directory…", people in the app narrow as you type and the directory is searched by itself after a short pause — no "Search the directory" button anywhere — and the person is added to the app and chosen in one click; the dialog stays the SAME size and in the same place from the first letter to the last and when the directory answers — only the list inside it changes, with its own scroll — so the row under the pointer is the row that is clicked; step 2 the multi-person picker offers the same road and ticks them; step 3 both new people sit at site A — the admin's own site — whatever org was being edited, with the department only when the org was at site A; step 4 the directory is searched by itself after a short pause — there is no "Search the directory" button to press — and the action is assigned to the new person; step 5 the picker refuses: "had their access revoked. Restore them in Settings → Users first" — nobody is silently re-activated; step 6 an ordinary user is offered no directory search anywhere

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
expected: step 1 the menu has ONE flag item and no "Escalate to sponsor"; the dialog asks what you need (required) and the tick reveals the sponsor chips and "Flag & email" / "Flag & send Teams"; after Flag the header shows "⚑ Support needed" in the Support needed colour with the note on hover, and the initiative reads "⚑ SUPPORT NEEDED" wherever it is listed; step 2 the Add update dialog always shows "⚐ Flag this initiative — it needs support", unticked until Support needed has text, then ticked (untick it and it stays unticked); ticking with no Support text refuses to save and says why; step 3 the update saves, the flag goes up with the Support text as its note, and the dialog stays open on "✓ Saved and marked Support needed. Sent by Teams…" (or "Not sent: …" — the flag stands either way) until closed; step 4 the first update replaces the flag's note with the new text; the second clears the flag; an EDIT of an update never offers the flag; step 5 it reads Flagged, with its escalation note kept

### UAT-IMP-008 — The Improvement tab reads the same status
persona: member
modules: improvement/improvementTab.ts improvement/ganttCard.ts improvement/statusLoad.ts improvement/gantt.ts improvement/status.ts improvement/boardHeader.ts improvement/statusBand.ts
preconditions: the four initiatives of UAT-PRI-012 in one department; a completed initiative; a ritual board with an Actions Gantt card scoped to that department
steps:
1. Improvement tab, list view: read each row's left edge and the chip beside its title; hover a chip. Switch to tiles, then to the Gantt.
2. Open the ritual board's Actions Gantt card.
3. Open initiative D's board; read the status band.
expected: step 1 the list is the SAME row and header as the Priorities popup and the executive summary — Initiative · Org · Your role(s) · Stage · Actions (Done, Future, Late over the three circles) · Key metrics: every active row's edge is its status colour, its status sits in small caps above the title ("⚑ SUPPORT NEEDED", "OFF TRACK", "ON TRACK") with a small i for the reasons (and what was asked for, on a flag), the grey line under the title reads owner · priority · template, the stage is its pill with a small disc and "awaiting …" or the next gate's date under it, and the metrics are sparkline tiles (two, then "+n"; "No metric set" where there are none); no pill sits beside the title; the completed initiative's edge is neutral and its tag reads "COMPLETED"; a narrower window drops Key metrics, then Org and Your role(s); tiles carry the colour on top, a ⚐ or ✕ glyph and the three circles; the Gantt's group rows carry the same edge; step 2 the card's group edges match the tab's; step 3 the band says "No update for n days" only once the recency window (Settings → Priorities → Status, 35 days unless changed) has passed — not at 14 days

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
expected: step 1 "＋ Add file" and "＋ Add link" sit together on one line under the heading; "Uploading <name>…" shows, then the file is listed newest first behind the document register's own type chip (PDF, DOCX, XLSX… — a link carries LINK), with who added it, the date and its size, and the heading counts it; two dropped files upload one after the other ("Uploading 1 of 2…"); step 2 nothing uploads and the line says the file's size, the 30 MB limit, and to put large files in the working folder and add a link; step 3 "notes" is refused as not a web address; the full address is added by Enter without closing or saving anything around it, listed by its caption, and https:// is added when it was left off; step 4 a "📎 n" chip sits with the title's chips and opens the details pane at the attachments; the PDF downloads under its own name; the link opens in a new tab; step 5 the action's file is there on reopening — an attachment is saved when it is added, not with the dialog's Save — and a NEW action (Raise) shows no attachments block until it exists; step 6 the second account sees and opens everything, has no ＋ Add file / ＋ Add link on the initiative, and no ✕ on rows it did not add; step 7 a confirmation names the file and says it is deleted for everyone; after it the row and the count are gone

### UAT-IMP-010 — A long charter field does not stretch the others; the charter tile stays readable
persona: member
modules: controls/CanvasCard/styles.ts controls/CanvasCard/editor.ts controls/CanvasCard/fit.ts
preconditions: an initiative whose Charter has several fields (Title, Owner, Context, Scope In, Scope Out) and one field with a long label; you may edit it
steps:
1. Open the Charter card in the focused view. Paste about forty short lines into Scope In.
2. Read the Title and Owner fields.
3. Go back to the board and read the Charter tile.
4. Read the field whose label is a full sentence, on the tile and in the focused view.
expected: step 1 Scope In grows to show its lines and the card scrolls; step 2 Title and Owner stay one line tall (about the height of their text and label), not as tall as Scope In; step 3 the tile's text is never smaller than three-quarters of its normal size — a charter too long for the tile is cut off at the tile's bottom edge rather than shrunk further; step 4 the long label wraps onto a second line and nothing of it is cut off (the board designer still shows labels on one line)

### UAT-IMP-011 — Moving between an initiative's cards is as quick as a meeting's
persona: member
modules: screens/cardEditor.ts improvement/binding.ts store/priorities.ts
preconditions: an initiative linked to a primary priority, whose board has a Charter with fields bound to the header (title, a role, a custom field and "Primary priority"), an Action Plan and a Metrics card; a meeting board with three cards, for comparison
steps:
1. Open the meeting board's first card and step through its cards with NEXT › and the tabs. Note the wait.
2. Open the initiative's Charter and step through its cards the same way, forward and back, several times.
3. On the Charter, edit a bound text field and a role (pick a person); step to the Action Plan and back.
4. On the Action Plan, add an action and read the people offered first in Who.
expected: step 2 after the first card each step is about as quick as the meeting's — the old card stays under the spinner for a moment, never several seconds; step 3 the Charter shows the edits on return, the role picker lists the roster, and the "Primary priority" field reads the priority's statement; step 4 the initiative's role-holders lead the Who list, as before

### UAT-IMP-012 — A metric's chart shows its last twelve readings through to today
persona: lead
modules: improvement/metricsCard.ts improvement/readWindow.ts improvement/metricValues.ts store/series.ts store/seriesMap.ts store/driverSeries.ts controls/KpiTrendCard/editor.ts
preconditions: an initiative with three weekly metrics on its Metrics card: one filled in every week up to this week; one with ten or so readings that stopped two months ago; one whose last reading is more than thirteen weeks old
steps:
1. Open the initiative's board and read the three charts: where each starts and ends, and the subtitle under each name.
2. Press "Update values" on the second metric. Read which weeks the grid opens on.
3. Open Priorities and read the same metrics' sparklines and states on the priority's tile.
4. Open the Improvement register and read the initiative's metric values.
expected: step 1 the first chart is as before (the thirteen weeks around today); the second starts at its twelfth-last reading and STILL ends at this week, so its whole run is drawn and the two empty months show as a gap after it; the third opens on its readings alone, ending at the last one, and its subtitle ends "· last reading <date>"; step 2 the grid opens around TODAY, where new values go, whichever span the chart shows; step 3 and 4 every value, state and sparkline is what it was — a metric whose readings are all older than the read window (six months daily, two years weekly, five years monthly) still shows its last value and state, never "No data"


### UAT-IMP-013 — Removing a metric takes its readings with it
persona: lead
modules: improvement/metricRemoval.ts improvement/metricsList.ts improvement/editDetails.ts improvement/initiativeForm.ts priorities/ownMetricsTab.ts store/series.ts
preconditions: an initiative you lead with three metrics: one of its own with several readings entered, one of its own with no readings, and one taken from the value driver tree (it IS the driver) with readings
steps:
1. Edit details… → Metrics. Press × on the metric with no readings.
2. Press × on the own metric with readings. Read the question; Cancel. Press × again and Remove. Then press Cancel on the whole dialog.
3. Open Edit details… again; remove the same metric (Remove) and Save details. Open the Metrics card.
4. Edit details… → add an initiative-specific metric under the SAME name; Save details; open its values.
5. Edit details… → press × on the driver metric; Save details. Open the value driver tree and read that driver's values.
expected: step 1 the question reads "Remove <name>?" with "It has no readings."; Remove takes it off the list; step 2 the question reads "Remove <name> and its N readings?" with N the number of readings entered, and "This cannot be undone."; Cancel on the question keeps the metric; Cancel on the dialog after Remove changes nothing — the metric and its readings are still there; step 3 after Save the metric is gone from the Metrics card; step 4 the new metric starts EMPTY — last year's readings do not come back; step 5 the driver metric asks "Remove <name> from this initiative?" with "Its readings belong to the value driver and are kept."; after Remove and Save the driver's own values are untouched. On a priority's own metrics (Objectives tab) the same question is asked and the readings go at once, because that list saves at once. A linked metric's row also carries "Change link…" and "Unlink" (UAT-PRI-018 has the detail): a metric that only leads a driver unlinks with nothing lost

### UAT-IMP-014 — Which gate snapshot stands after a revert
persona: lead
modules: improvement/gateSnapshots.ts improvement/boardHeader.ts screens/board.ts
preconditions: an initiative with gates on its stages that has passed at least two gates (so two gate snapshots exist); you are its owner or sponsor and an approver of the gates, or have one on hand
steps:
1. Open the initiative's board and press the Live button at the top. Read the "Gate snapshots" list.
2. Revert the initiative to its FIRST stage, with a reason. Open the list again.
3. Pass the first gate again (request, approve). Open the list again; open the folded line under the first stage; open the older snapshot and read the banner.
4. Go back to the live board.
expected: step 1 one line per stage in stage order, "Gate — <stage> · <date>", with nothing after the date; step 2 both snapshots are still listed and each now ends "· reverted <the day of the revert>"; step 3 the first stage's NEW snapshot leads with nothing after its date, and under it a folded line "▸ 1 superseded" opens to show the older one, "<date> · superseded"; the second stage's snapshot still reads "reverted" until that gate is passed again; the older snapshot opens read-only and its banner ends "· superseded — read-only"; step 4 nothing was deleted and nobody was asked to approve the revert

### UAT-IMP-015 — A stale metric is marked, and changes no status
persona: lead
modules: improvement/staleMetric.ts improvement/metricValues.ts improvement/initiativeRow.ts improvement/metricsCard.ts improvement/improvementTab.ts priorities/ownMetricsTab.ts priorities/lifecycle.ts priorities/prioritiesScreen.ts
preconditions: an initiative you lead that is on track, with a WEEKLY metric whose newest reading is on plan and at least three weeks old, a MONTHLY metric whose newest reading is in last month, and a metric that has never had a reading; a priority that shows that initiative's metric as an objective
steps:
1. Open the initiative's board and read the Metrics card.
2. Open Improvement and find the initiative's tile; open Priorities with Objectives switched on and read the priority's tile; hover the metric's chart.
3. Open the priority → Objectives and read the metric's row.
4. Read the initiative's and the priority's status.
5. Press "Update values" on the weekly metric and enter this week's reading; read the card and the tile again.
expected: step 1 the weekly metric's chart carries "◷ No reading for <n> weeks" in its lower left corner; the monthly one carries no mark until the sixth working day of this month has come with nothing entered for last month; the metric never read carries no mark; step 2 the Improvement tile's metric line ends "· ◷ no reading for <n> weeks"; on the priority's tile the chart is faded and a small ◷ leads its caption — no words are added to the tile — and the tooltip ends "· No reading for <n> weeks"; step 3 the row reads "Plan … · Actual …" then "◷ No reading for <n> weeks"; step 4 both are still ON TRACK: the mark changes no status; step 5 the mark is gone everywhere. Saturdays and Sundays do not count toward the five working days; public holidays do

### UAT-IMP-016 — An attachment's caption can be changed; an image opens in the app
persona: member
modules: attachments/list.ts attachments/model.ts store/attachments.ts
preconditions: an initiative you hold a role on with, attached by you: a JPG or PNG photo, a PDF, a HEIC photo and a link added with a caption; a second account that can see the initiative but holds no role on it and attached none of them
steps:
1. Open the initiative's details pane → "Attachments & links". Read the photo's row. Press Rename on it, type a caption and press Enter.
2. Press Rename on the link, clear the caption and press Enter. Press Rename on the PDF, type something and press Escape.
3. Click the photo's name. Read the viewer; press Download; press Escape.
4. Click the photo again and click on the dark area beside the picture. Click the PDF's name, then the HEIC photo's.
5. As the second account, open the same block and read the rows.
expected: step 1 a file added with no caption shows its file name; Rename turns the title into a text box holding the caption (empty for the file, its file name as the hint); Enter saves — the row is now titled by the caption, with the file name under it; step 2 a link with its caption cleared reads by its address again; Escape leaves the PDF's caption as it was, and the dialog or pane around it stays open; step 3 the photo opens in a viewer INSIDE the app, sized to fit, titled by its caption, with Download and Close; Download saves the file; Escape closes the viewer only; step 4 a click beside the picture closes it; the PDF and the HEIC photo download as before (a browser cannot draw HEIC); step 5 someone who may not remove an attachment sees no Rename and no ✕. The list shows no thumbnails: a picture is fetched when it is opened
