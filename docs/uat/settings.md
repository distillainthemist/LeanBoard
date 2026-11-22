# Settings, people & organisation

Personas: user, siteadmin (a site admin of one site), superadmin. The site needs the organisation tree with at least two sites, a roster, and the directory connector signed in.

## Journey 1 — People

### UAT-SET-001 — A site admin adds a person from the directory
persona: siteadmin
modules: screens/settings.ts store/people.ts
preconditions: signed in as a site admin; someone in the directory who is not yet on the roster
steps:
1. Settings → People; type the person's name in the search box; "Search directory & add".
2. On the hit, ＋ Add; read the placement row; pick a department and crew; "Add to roster".
3. Search the roster for them.
expected: the note at the top says site admins add people from the directory into their site; the directory matches show; the placement row's Site is fixed to the admin's own site and Role to User (both greyed, with a tooltip saying why), department and crew offer the site's own; the person lands on the roster placed in that site; a super admin sees the full placement row with every site and role

## Journey 2 — Access control

### UAT-SET-002 — Members of the document control groups
persona: superadmin
modules: screens/settings.ts docs/groupMembers.ts store/accessGroup.ts
preconditions: the Document controllers and Owners & approvers groups linked under Settings → Access control, both owned by you in Entra; a person in the directory who is in neither
steps:
1. Settings → Access control → Document controllers → Members…; read the note and the ownership line.
2. Search the directory for the person; ＋ Add. In Entra (or the Owners & approvers → Members… dialog) check the owners & approvers group.
3. Remove them from Document controllers; confirm. Check the owners & approvers group again.
4. Owners & approvers → Members…: add and remove someone.
5. Settings → Users: read the Document roles column; tick Controller on a person; untick Owner/approver on another.
expected: the Users register's Document roles column shows a Controller and an Owner/approver box per person, ticked from the groups' live membership, writable only for a super admin who owns the group (the tooltip says why otherwise, and your own Controller box cannot be unticked); ticking Controller also ticks Owner/approver; unticking asks first and a refusal reverts the box with the reason under the row; Members… shows only on a linked group; the controllers dialog says an add also makes the person a member and owner of the owners & approvers group; after the add they are a controller AND a member and owner of the pool; after the remove they are no controller and no longer an owner of the pool but still its member; the pool dialog adds and removes members alone; removing the group's only owner is refused with a readable line; you cannot remove yourself

## Journey 3 — Processes

### UAT-SET-003 — A site's own process hierarchy
persona: siteadmin
modules: processes/settingsTab.ts processes/migrate.ts store/processes.ts shared/schema/process.ts
preconditions: you are a site admin of a site with no process hierarchy yet; the central hierarchy has a type with areas and processes
steps:
1. Settings → Processes: your site is the only chip; read the starter.
2. Clone the central type (or Start empty); add an area, a process beneath it and a sub-process; rename one; reorder two by drag; archive one.
3. Open a ritual's wizard, an initiative's header form and a value driver for your site.
expected: the tab shows only your site, no Central hierarchy chip; cloning creates the tree in the site's own words with every node reading "↔ <central name>" greyed (a super admin sets links) and the status line counts the rituals, initiatives and value drivers re-pointed; edits write at once and the term-set push line reads under the tree; the pickers in the wizard, the initiative form and the value driver cascade through YOUR site's tree, never the central one

### UAT-SET-004 — Links to the central hierarchy
persona: superadmin
modules: processes/settingsTab.ts shared/ui/processPicker.ts shared/schema/process.ts
preconditions: a site with its own tree; the central hierarchy with two types
steps:
1. Settings → Processes → the site chip → "↔" on an area → pick a type and a central process → Link.
2. On a process beneath that area read its link; open it and press Inherit.
3. Central hierarchy chip → the type → read the "↔ n site nodes" count on the central node; rename it.
expected: the area reads "↔ Type › Process"; the node beneath reads the same with "(inherited)"; Inherit on a node with its own link clears it back to the inherited one; the central node's count shows the explicit links; renaming a central node does not touch the term set (the central tree does not sync) and the site node's label in the Improvement tab's company-scope filter follows

### UAT-SET-005 — Initiatives compared across sites
persona: superadmin
modules: improvement/improvementTab.ts shared/ui/processPicker.ts shared/schema/process.ts
preconditions: two sites whose trees link a node each to the same central process; an initiative on each naming its site's node
steps:
1. Improvement tab at company scope (no site) → Filters → "Process (across sites)" → the type, then the process.
2. Switch the scope to one site → Filters → Process.
expected: at company scope both initiatives match the central pick and the filter count reads 1; at site scope the Process filter cascades through that site's own tree and matches only its initiative

## Journey 4 — Versions

### UAT-SET-006 — People on an old build are told, then gated
persona: superadmin
modules: release/gate.ts screens/settings.ts shared/schema/release.ts
preconditions: two devices (or a browser and the phone) open on the app; Settings → Branding → Version readable
steps:
1. Settings → Branding → Version: read "This device", "Current build" and "Oldest build allowed". Press "Make this build current" if it is not.
2. Leave device B open. Push a new build (or on device A press "Make this build current" after a push). Wait up to five minutes on device B, or switch away from its tab and back.
3. On device B close LeanBoard and open it again.
4. On device A press "Require this build"; on a device still on the older build, open a card editor, make a change, wait.
5. Settings → Users: find the two people.
expected: step 1 names the device's build (v0.x.y, "+n" past a tag) and who recorded the current one; step 2 device B shows an amber banner under the top bar naming both builds and asking to close and reopen, nothing is blocked; a device that OPENS on the old build (a cached player) sees the full-screen gate instead and cannot use the app; step 3 clears it and, on a clean build newer than the record, records itself as current; step 4 the old device shows the red banner while the editor holds unsaved work and the gate as soon as it is saved or closed; "Clear the minimum" lifts it; step 5 each person's row reads "Last opened on <build>"

## Journey 5 — Bulk-adding a site's people

### UAT-SET-008 — The roster pages
persona: superadmin
modules: screens/settings.ts
preconditions: a roster of more than 50 people
steps:
1. Settings → Users; read the count line and the list; scroll to the bottom.
2. Next ›; then filter by a site with fewer than 50 people; then clear the filter.
3. Type part of a name in the search box.
expected: the tab opens with the first 50 people and the count reads "n of n people · 1–50 of n" where n is the WHOLE roster (a roster of several thousand is counted in full, not the first 500); a pager under the list reads "Page 1 of m · 1–50 of n" with ‹ Previous greyed; Next › shows 51–100 and scrolls the list head into view; a filter that fits one page shows no pager; every filter and the search start again from page 1; job titles fill in for the rows on screen only (the search matches name and email everywhere, job title on rows that have been shown)

### UAT-SET-009 — Access diagnostics time the membership roads
persona: user
modules: docs/accessProbe.ts store/accessGroup.ts
preconditions: the hosted app; a Document controllers group linked (the Owners & approvers group optional)
steps:
1. Settings → Access diagnostics → Run diagnostics; wait for "Done.".
2. Read the "Membership roads" block.
expected: the block shows the documents config row's read time, then per linked group five timed lines — the listing (today's road, with the member count), the filter road for you and for a non-member, the path road for you and for a non-member — and a VERDICT line naming which one-call road agreed with the listing on both answers, with its time against the listing's; a non-member always reads "not a member"; nothing is written and no group is changed

### UAT-SET-007 — Import a site's team from the directory
persona: superadmin
modules: people/importTeam.ts store/directoryWalk.ts shared/schema/teamImport.ts
preconditions: a site with a site owner and at least one department owner set in Settings → Organisation; some of that site's people not yet on the roster; one of them placed on a different site
steps:
1. Settings → Users → "Import a site's team…" → pick the site; read the "Start from" chip; add a second starting person by search; remove it again.
2. Walk the directory; watch the progress line.
3. In the list: read the counts; find a person under a department owner and read their proposed department; find the one on another site; tick "Show skipped and already here".
4. Untick one person, change another's department, tick the other-site person; press "Add n".
5. Run the import again for the same site.
expected: step 1 the chip reads the site owner with "site owner", a searched person can be added and removed; step 2 the line counts people, managers and levels; step 3 the counts add up to the total, people under a department owner carry that department (an area owner's team carries the area too), the directory label fills gaps blind to case, disabled / guest / no-mailbox / office-elsewhere accounts are unticked with a red or amber chip and hidden until the toggle, the other-site person is unticked with an "on <site>" chip; step 4 the ticked people appear on Users as users of the site with the chosen departments, the moved person now shows the new site, the result names the access group's members added; step 5 everyone just added reads "already here" and the button is disabled with 0 to add

## Journey 6 — A slow connection

### UAT-SET-010 — The host is slow to answer at boot
persona: user
modules: runtime.ts screens/hub.ts loading.ts
preconditions: the hosted app on a slow connection (throttle the browser's network to "Slow 3G" in its developer tools, or open the app over a poor mobile link)
steps:
1. Open the app; watch the loading spinner.
2. With the network throttled hard enough that the host never answers (offline for the first 20 seconds), open the app again; read the message.
3. Restore the connection; close and reopen the app.
expected: step 1 the spinner stays while the app asks the host again (three tries, each wait longer than the last, about 17 seconds in all) and My day opens with the real data — never the "Demo mode" note or demo rituals and people; step 2 a note reads that Power Apps did not answer after three tries and to close and reopen the app or refresh the browser, with no reload button; step 3 the app opens normally

### UAT-SET-011 — Switching Settings tabs while one is still loading
persona: superadmin
modules: screens/settings.ts loading.ts
preconditions: a roster and organisation big enough that Users and Organisation take a moment to load (or the network throttled)
steps:
1. Settings → Users; before it has painted, click Organisation; then Branding.
2. Wait for Branding to paint; scroll the whole page.
3. Back on Organisation, change a name, then switch to Users before saving; answer the unsaved-changes prompt.
expected: each tab shows a spinner until its own sections arrive; step 2 the page holds Branding's sections only — nothing from Users or Organisation lands on it, and the section strip's pills name Branding's sections; step 3 the unsaved-changes prompt belongs to the tab you were on, and Users opens clean after Discard


### UAT-SET-012 — Due date changes: who is asked why, and the reasons
persona: superadmin
modules: improvement/templateWizard.ts improvement/templateModel.ts shared/schema/reschedule.ts actions/reschedule.ts
preconditions: super admin; an initiative action with a due date that has already been moved once with the reason "Scope changed"
steps:
1. Open Settings → Improvement and read "Due date changes".
2. Add the reason "Supplier late"; drag it to the top; rename "Scope changed" to "Scope grew"; remove "Waiting on parts" and confirm.
3. Try to add "supplier late" and "Other".
4. Leave Settings, wait a minute, open the initiative action, move its due date later and press Save. Read the reasons, then open the "Due date moved…" line under the comments.
5. In Settings → Value drivers change who may edit values (any change that saves), then return to Improvement.
6. Set "Ask for a reason on" to "All actions"; a minute later move a ritual action's due date later.
expected: step 1 the section explains the rule, shows "Ask for a reason on: Initiative actions only" and lists Waiting on parts, Resource unavailable, Scope changed, Blocked by another action, then a dashed "Other — Always offered · needs a note" with no handle or ×; step 2 each change saves at once (the remove asks first and says past moves keep the reason); step 3 neither is added — a repeat in any capitals and "Other" are refused; step 4 the question offers Supplier late first, Scope grew, no Waiting on parts, and Other last; the earlier move still reads "Scope changed"; step 5 the reasons and the choice are unchanged by the other tab's save; step 6 the ritual's action now asks why. A site admin does not see the section

### UAT-SET-013 — No empty row above a tab's first section
persona: superadmin
modules: settingsStrip.ts screens/settings.ts
preconditions: super admin; a connection slow enough that a Settings tab shows its spinner for a moment (a first open of the day, or a throttled network)
steps:
1. Open Settings → Improvement and wait for the templates to appear. Read the space between the section pills and "Initiative templates".
2. Open Value drivers, Priorities, Health checks and Documents in turn, waiting for each to finish loading.
3. Switch quickly back and forth between Improvement and Priorities several times.
expected: on every tab the first section's card sits directly under the pills — there is never an empty white card (a blank bordered row) above it, during the load or after it; the spinner shows on the tinted ground with no card around it; tabs that open with content before their first heading still show that content in a card of its own

### UAT-SET-014 — Strategic pillars, year by year
persona: superadmin
modules: priorities/settingsTab.ts priorities/model.ts store/priorities.ts prompts.ts
preconditions: super admin; pillars and sub-pillars that have been in force since last year, with priorities under some of them; next year on offer
steps:
1. Settings → Priorities → Strategic pillars. Read "Year in view" and the list.
2. Set the year to next year. Add a sub-pillar and name it. Save. Look at this year and next year on the Priorities tab.
3. With next year in view, rename a sub-pillar that priorities sit under and leave the field. Choose "From <next year>". Save.
4. On the Priorities tab compare this year and next year. Back in Settings, open "Other years".
5. With next year in view, change a sub-pillar's "Under:" to another pillar and choose "From <next year>". Save and compare the two years.
6. Press × on a sub-pillar that has priorities; read the question. Press × on one that has none.
7. Rename another one and choose "Every year".
expected: step 1 the list shows the pillars in force this year, with a note saying what adding and renaming do; step 2 the new sub-pillar is a column next year and NOT this year; step 3 the question names the old and new name; step 4 this year keeps the OLD name and next year shows the NEW one, each with the same priorities under it (they followed the rename — nothing was re-filed by hand); "Other years" lists the ended version with its span; step 5 the sub-pillar sits under the old pillar this year and the new one next year; step 6 a sub-pillar in use is ENDED after the year before the one in view ("ended rather than deleted"), never deleted; an unused one is removed as before; step 7 the name changes on every year

### UAT-SET-015 — Status: the recency window and the three colours
persona: superadmin
modules: priorities/settingsTab.ts improvement/status.ts priorities/model.ts
preconditions: an initiative whose last status update is 20 days old and is otherwise on track; Settings → Branding has a state palette
steps:
1. Settings → Priorities: read the sections. In Status set "No status update for (days)" to 14 and Save.
2. Open Priorities and the initiative's board.
3. Settings → Priorities → Status: set the Support needed colour to another palette entry; Save; open Priorities.
4. Set the days back to 35.
expected: step 1 the section "Period" no longer mentions a ratio rule and there is no "Ratio rule — red above (%)" field; a "Status" section explains the rule in a paragraph and carries the days and three colour pickers listing the state palette's entries (a state whose key is not in the site's palette reads "Default … colour (not in the palette)"); step 2 the initiative is Off track with "No update for 2 weeks" and its board's band says "No update for 20 days"; step 3 every Support needed edge, circle and chip takes the new colour, and so do the action dialog's "⚑ Flag for support" button and the ⚑ beside a flagged action; step 4 the initiative returns to On track

