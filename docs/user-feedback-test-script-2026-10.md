# Feedback round 1 — test script (Tranches A–C, dev build of 2026-10-06)

Close and reopen the player first. Use a superadmin account for the
Settings steps and a second, ordinary account where a step says so.
Reports in brackets are the export's section numbers.

## Tranche A

1. **Version history refused (29, 40, 41)** — Documents, open a document
   as a reader whose permission level lacks View Versions (prod), or
   temporarily remove View Versions from a test level. Details pane →
   Version history reads one line: "needs the View Versions
   permission on this site". No JSON.
2. **Column order (21)** — Register ⋮ → Choose columns. Drag Owner above
   Approval Date, Apply. The register shows the columns in that order.
   Reset to default returns the dictionary order.
3. **Date a day out (6)** — As an Australian-zone user, open Edit
   properties on a document with an Effective or Review date. The
   prefilled date matches what the pane shows (not the day before).
4. **Download name (7)** — Open a .docx. Details ⋯ → "Download as PDF":
   the file saves as `<document name>.pdf`. (The original-file download
   was dropped on 2026-10-06 — nobody asked for it.)
5. **Scroll position (16)** — Scroll the register well down, open a
   document, close the preview. You are where you were.
6. **Search scope (3, 5, 37)** — Beside the search box: the "Match
   contents & every field" toggle. Tick it, search a word that is only
   inside a document; it appears. The scope menu's item shows the same
   state.
7. **Favourites (4, 25, 42)** — Click ☆ on a row: it fills. Click the
   Favourites nav entry: the starred documents show. Click the entry
   again: back to the libraries.
8. **Health report review dates (11)** — Register ⋮ → Document control
   health, on the library that previously listed dated documents under
   "No next review date". They are gone from that finding.
9. **Tags editor (13)** — Edit properties on a document that already has
   a tag. The Tags field shows the existing tag as a chip; "＋ Add a
   tag…" adds a second; ✕ removes one. Save. Both tags remain on the
   document.
10. **Details pane (15, 39)** — Open a document with the pane collapsed:
    a "Details ›" button sits in the head. Open it: the document type
    reads inside Categorisation and the status inside Status; the id
    chip stays at the top.

## Tranche B

11. **Several terms per filter (9, 14, 36)** — Filters → Status: tick
    Approved AND Awaiting approval. The chip reads "Status: Approved,
    Awaiting approval" and the list shows both. Untick one.
    **Approved by default (Ben, 2026-10-06)**: the register OPENS with
    "Approval status: Approved" as a visible chip; × on it shows every
    status; the kebab's "Show only Approved" is gone. A saved view or
    link opens exactly as it was saved.
12. **Sort by any header (1)** — Click the Owner or Document Type
    header. Rows reorder; while more pages remain the status line says
    "sorted by Owner within the loaded documents". Click Document or
    Modified: a server sort, no note.
13. **Named view (26, 27)** — Register ⋮ → Views: save "Test view". The
    head shows "View · Test view". Change a filter, open Views again:
    "Update ‘Test view’ with the current view". Open the view from the
    menu later: the change is there. × on the chip drops the name.
14. **Hide the panel (49)** — "« Hide panel" at the top of the left
    panel. A slim rail labelled "Libraries & folders" brings it back.
    Reload: the choice is remembered.
15. **People and Has filters (17, 46)** — Filters → Owner: search
    people (the group lists first, then Office 365 users), pick one.
    Only their documents show; the chip reads "Owner: <name>". Filters → Has → Linked documents / Tags. Register
    ⋮ → Export CSV with the owner filter on: the file is their list.
16. **Default columns (44)** — Settings → Documents → Document columns:
    ★ a column for the standard type. A new user's register (or Reset
    to default) shows it.

## Tranche C

17. **Roles health (30, 33)** — Register ⋮ → Document control health.
    After the first paint two findings may appear: "Named owner or
    approver is not in the owners & approvers group" and "Named person
    is no longer in the directory". Open one: each row names the
    person and role. A failed lookup shows as "Not checked: …".
18. **Replace a person (33, 46)** — In the same report, "Replace a
    person…". Pick someone from the list, search the group for the
    replacement, leave all roles ticked: the preview counts the
    documents. Replace. Each row reports ✓ or the refusal. Open one
    document: the new name is in the role; version history shows a
    minor version "Role reassigned". Try an approved document on the
    moderated library: it stays published.
19. **Reviewers from anyone (31)** — Edit properties → Reviewers, or
    Submit for review → add reviewers: the group's people list first;
    typing two letters of a controller's name finds them from the
    directory. Owner and Approvers still search the group only.
20. **Tags in settings (28, 45)** — Settings → Documents → Tags: the
    tags in use as chips. ＋ Add tag "Test tag": it appears. Click a chip
    to rename it; a document carrying it shows the new name.
21. **Controller mints a tag (13, 45)** — As a document controller, Edit
    properties → Tags → "Add a new tag…" → type a name → Add tag. The
    tag lands on the document at once. As an ordinary user the same
    control reads "Propose a new tag…".
22. **Guidance (23, 24)** — REMOVED before release (Ben, 2026-10-06):
    to be clarified with Holly first. Nothing to test.
23. **Review request confirmation (19)** — On a draft with NO reviewers
    named, Submit for review without adding any: the dialog stays open
    with "Sent for review … nobody was messaged". With reviewers: the
    notify panel offers the Teams message. Details → Version history
    shows the one-line note about drafts.
24. **MOC column (32)** — docs/deployment-cookbook.md Recipe 3; a
    configuration step, nothing to test in the app until the column
    exists.

## Walkthrough outcome (Ben, 2026-10-06, dev build 01541e6)

| Item | Result |
|---|---|
| A1 versions 403 | End-user testing (prod reader without View Versions) |
| A2 column order | Good |
| A3 date a day out | End-user testing (Australian-zone user) |
| A4 download name | Good — "Download original" dropped (nobody asked for it) |
| A5 scroll position | Good |
| A6 search scope toggle | Good |
| A7 favourites | Good |
| A8 health review dates | End-user testing (the pilot library) |
| A9 tags editor | End-user testing (Ellen) |
| A10 details pane | Good |
| B1 several terms per filter | Good — and the register now OPENS with a visible "Approval status: Approved" filter; the kebab toggle is gone |
| B2 sort by header | Good |
| B4 named views | Good after two changes: a saved view is the active one at once; its name is the TITLE (scope in the crumb, "Close" in the Views menu) |
| B5 hide the panel | Good |
| B6 people / Has filters | Good after three changes: people filters are a directory search (group first); chips use the dictionary labels; Export CSV follows every filter (it never had) |
| B6 follow-up | Tags (and any big term set) are searched in the Filters popover |
| B7 default columns | End-user testing (Christelle) |
| C1 roles health | Good |
| C1 replace a person | Good — controllers only, confirmed |
| C2 reviewers from anyone | Good |
| C3 tags in settings | Good |
| C3 controller mints | End-user testing (needs a non-controller account) |
| C4 guidance | REMOVED pending clarification with Holly |
| C5 review confirmation | End-user testing |
| C6 MOC recipe | Configuration — nothing to test |

## Phone pass — v0.66.0 (2026-10-07)

On a phone, in the Power Apps mobile app AND a phone browser; close
and reopen the player first. Each line is one screen.

1. **The frame** — the bar shows ⚑ ⚙ ＋ as squares and nothing is cut
   off; the tab strip scrolls sideways to Actions and Documents and the
   open tab is in view when you land.
2. **My day / Actions** — action rows are two lines (title in full,
   then with · due · flags); the Actions head stacks with the add field
   full width and the state chips in one scrolling row; a tick closes
   a part.
3. **Documents** — the register is search, Library / Organisation /
   Type / Status selects, chips, a one-column list with titles wrapping;
   a row opens the viewer full-screen with Details › and Open in new
   tab ↗ reachable. (Report 20's reporter: is the Documents tab there?)
4. **A ritual board** — tiles as a full-width list in reading order,
   live cards readable; Details opens the sheet, picking an occurrence
   closes it; a tile opens the card with PREV above and NEXT below.
5. **Priorities** — the select strip, the vision band, the walk inline;
   swipe or the rails step objectives; a row opens the overlay; ＋
   Priority and the ⋮ share link work.
6. **An initiative** — the stacked band and cards; Details from the
   sheet button; the actions card shows its list with the one-line
   note; the Improvement tab lists initiatives as tiles.
7. **Cadence** — opens in Day view, one full-width column; ‹ Today ›
   step days; picking Week sticks for the session.
8. **Settings** — My profile has no desktop note; a changed Site shows
   a save bar whose buttons sit on their own line; Users opens on the
   add card, a directory search adds someone, Edit ▾ opens their
   controls; the other tabs say "best on a desktop".
9. **Settings on a desktop** — Documents, Priorities, Site cadence,
   Branding and My profile show the section strip under the tabs; it
   sticks while scrolling, the pill follows the section, a click lands
   its heading under the strip; Branding carries Ritual categories.

| Item | Outcome |
|---|---|
| 1–9 | _Ben's pass pending_ |

## Settings and poster pass — v0.67.0 (2026-10-08)

On a desktop.

1. **Documents settings** — the section strip under the tabs (ten
   pills over two rows), sticky while scrolling, the pill following
   the section; a click lands its heading under the strip; each
   section is a white card on the tinted ground.
2. **Site cadence** — the three pills and "Site: Mine ▾" on one row;
   three cards below; clicking into Time zone holds focus; switching
   the site repaints the cards.
3. **Priorities settings** (super admin) — two pills, two cards; as a
   site admin the tab is absent.
4. **Improvement settings** — Initiative templates first with its note
   under the heading; Methods, Standard fields and Health-check
   questions follow.
5. **Organisation** — a site card shows Hub tabs and Cascade
   customisation; changing the level saves without a bar.
6. **Branding** — Ritual categories under the palettes; a swatch
   change saves; a ritual still shows its colour.
7. **Users** — type a name not on the roster, use "Search directory &
   add" (or the empty-result link), add someone with a site and
   department, and see them in the list already placed.
8. **Rituals** — one row of search, filters and the blue ＋ New ritual.
9. **Request admin** (as a user) — the super admins listed with mail
   links.
10. **Priorities tab** — ⋮ → Download PDF version on the Mine view:
    one A3 page, the org chain in the title, the rail labels, wrapped
    heads, rounded cards, the export date, no page count.

| Item | Outcome |
|---|---|
| 1–10 | _Ben's pass pending_ |

## Processes pass — after v0.69.0 (2026-10-12, dev; solution-carrying)

1. **Types** — Settings → Processes: ＋ New type… "Smelter"; a second
   "Refinery"; the chips switch the tree.
2. **Tree** — under Smelter: the "Add area" box → "Casting" ＋; expand
   the card; its "Add process" box → "Ingot casting"; expand the
   sub-card; its "Add sub-process" box → "Line 2"; ✎ rename a node;
   drag ⠿ to reorder two areas, then two processes; × Archive a
   sub-process (it leaves the tree; the row stays as archived).
3. **Site** — Settings → Organisation → a site card → Process type:
   Smelter; the Processes tab's Smelter chip hover names the site.
4. **Local names** — on "Casting" → Local names… → the site's box:
   "Casthouse" → Save; the row reads "1 local name"; the dialog's hint
   reads "Casthouse (Casting)".

5. **Ritual** — Settings → Rituals → edit a ritual (or New meeting):
   the Organisation step shows "Process" under the area once the site
   has a type; pick Casting › Ingot casting; the review lists it; after
   Save the Cadence tab's organisation scope gains a "Process" select
   and picking Casting shows the ritual, picking Anodes hides it.
6. **Initiative** — New initiative / Edit details: Organisation group →
   "Process"; the row's meta line and the tile read "Casthouse ›
   Ingot casting" at a site with the local name; Filters → Process
   narrows the list; the chip count on the Filters button rises.
7. **Value drivers** — Settings → Value drivers: a driver's rail has
   "Process"; set it; a new child inherits it; the top row's "Process"
   select dims the drivers outside the pick; the hub's Value drivers
   tab has the same select beside Show.

8. **Process area set** — in SharePoint create an empty "Process
   area" term set under the DMS group; Settings → Documents → Term
   store → Process area term set: pick it; Load process drift report
   lists every type, area, process and sub-process to create; Apply;
   the log binds the nodes; reload the report: "Nothing to sync" (or
   "Push local names as synonyms" if any); Manage terms… on the set
   shows the tree read-only with "Casthouse" as a synonym of Casting.
9. **Rename after binding** — Settings → Processes: rename Casting to
   Cast; the process drift report reads it as a rename in place (the
   term keeps its id), not a create + orphan.
10. **Document column** — add a site column reading the set to the
   controlled standards library; Document columns: role "Process area";
   tag a document; the register's filter on it includes a parent's
   subtree.

11. **Site admin** — as a site admin of a site WITH a type: the
   "Process" tab (after Organisation) shows that type read-only — no
   adders, handles, rename or archive — and "Local name…" on a node
   offers only that site's box; as a site admin of a site without a
   type the tab is absent.
13. **Cascades everywhere** — the Improvement tab's "Owned by my team"
   scope and its Filters → Process; Cadence's Process after the
   organisation; the value drivers' Process (settings and hub); the
   Priorities "Browse all…" dialog and its phone head; the phone
   register's organisation; Add / Edit properties' Organisation unit:
   each is a set of dependent selects, never one long indented list;
   clearing a level steps back to its parent.
12. **Narrow window** — shrink the settings window: the tabs compact
   under 1440px and wrap onto a second line under 1180px; nothing
   scrolls sideways; View as stays at the right.

| Item | Outcome |
|---|---|
| 1–13 | _Ben's pass pending_ |

## UAT in the app — after v0.74.0 (2026-10-19, dev)

1. **Settings → UAT** — as a super admin: the tab lists runs (none yet)
   and the per-component case counts (Documents 80, the rest "no
   script yet"). New UAT run…: name, environment, tick Documents,
   scope "Every case" (then try "changed since v0.73.2"), Testers and
   personas… → add yourself with reader + owner, add a second person
   with controller; Start run. The testers get a Teams card linking to
   the UAT tab.
2. **The UAT tab** — as an assignee: the hub shows a UAT tab (last);
   the run's name, your personas, a progress bar and "Next untested";
   cases by journey for your personas only; a case expands to
   preconditions, steps and expected. Pass one; Blocked… one with a
   reason; Skip one; "Take it back" on the pass.
3. **Fail raises an issue** — Fail… on a case: the issue reporter opens
   prefilled (title "UAT DOC-0xx: …", area Documents, the steps and
   expected in the details); add a screenshot; Send. The case shows
   "✗ Fail · issue raised". Cancelling the reporter records nothing.
4. **Progress and fails in Settings** — Settings → UAT → open the run:
   bars by persona and by tester; the fails list with the issue note;
   Export PDF (fails first, then every case); Close run… with a note;
   Reopen; Re-run the fails… makes "<name> — re-run" with only the
   failed and blocked cases and sends the cards again.
5. **Issues filtered by run** — Settings → Issues → origin "UAT: <run>":
   only the issues raised from that run; tick them → Export to PDF.
6. **Several runs** — start a second run that includes you: the UAT tab
   shows a run picker; results stay per run.

| Item | Outcome |
|---|---|
| 1–2 | PASS (Ben, 2026-10-19) — after follow-ups: the UAT tab scrolls inside the hub; run instructions (ben_description) on the run, the tab, the card and the PDF |
| 3–6 | _Ben's pass pending_ |

## Issue round tranche E — after v0.73.2 (2026-10-19, dev)

1. **(29) Every template card** — add an optional card (e.g.
   Documentation & links) to an initiative template, create an
   initiative from it: the card is on the new board. Reset board to
   template keeps it; "Add card from template" says every card is
   already there.
2. **(36) Stage descriptions** — Settings → initiative template →
   Stages: each stage row has a second line "What happens in this
   stage"; save. On an initiative: the band segment's tooltip ends with
   the description, and Details → Stages & gates shows it under the
   current stage. Changing it in the template changes it on the
   initiative at once (no copy).
3. **(32) Priority popup initiatives** — Priorities → open a priority
   → Initiatives: every row has ⋮ with Open · Edit details… · Flag ·
   Escalate to sponsor · Archive — the same menu as the Improvement
   tab; Edit details saves and the row updates. Metrics tab: values can
   be updated (a role on the initiative or an admin, initiative
   active); the card scrolls, nothing is clipped.
4. **(37) Year control** — the Priorities header reads ‹ FY26 ▾ ›
   Cascaded Priorities: ‹ › step the year, the pill opens the list
   with a "current" badge; another year tints the pill and shows
   "Back to FY26". Opening the screen lands on the current year.
5. **(38) Issue merge messaging** — Settings → Issues: an issue with a
   follower and a merged-in report shows "To: A, B, C" chips above the
   compose box and "Send to reporters (3)"; each gets their own Teams
   card quoting their own report. Decline does the same. Merging an
   issue that already includes others moves those across too.
6. **(23) Document flags** — Documents: open a document → details →
   "Flag this document…": level, comment, pasted screenshot → the
   owners get a Teams card. The details chip "⚑ level" opens the
   flags; the register's Flags column (Choose columns) shows it;
   kebab → "Show flagged documents" scopes the register; Document
   tasks → "Flagged for review"; Document control health → "Flagged
   for review"; kebab → "Document flags (n)…" (controllers) → Close
   flag… with a note; Settings → Documents → Review levels edits the
   list, "Document flags…" opens the same queue. Mark reviewed on a
   flagged document offers to close its flags. Ingestion task: each
   file has a ⚑; flag one, run the ingestion — the flag now points at
   the landed document.

| Item | Outcome |
|---|---|
| 1–2 | PASS (Ben, 2026-10-19) |
| 3 | PASS (Ben, 2026-10-19) — after a follow-up: starring asks first, and the popup now survives the screen repaint every popup write triggers |
| 4 | PASS (Ben, 2026-10-19) |
| 5 | PASS (Ben, 2026-10-19) |
| 6 part A | PASS (Ben, 2026-10-19) — after follow-ups: the flag row sits under the buttons; owners are read fresh before the card (a controller had been messaged when the register row lacked the owner's email); Suggest a tag back with the Tags property; a tag is written only on a document in revision (waiting state "minted", "To tag at next revision") |
| 6 part C | PASS (Ben, 2026-10-19) — after a follow-up: a "Flag for review" column after the name column replaced the glyph |
| 6 part B | PASS (Ben, 2026-10-19) |

## Issue round tranche D — after v0.73.2 (2026-10-19, dev)

1. **(8) Owner outside the group** — as a named owner who is not in
   the owners & approvers group, open a standard awaiting owner
   approval: the decision card reads "Awaiting your approval" with the
   reason and no Approve button. Document control health → a "Named
   owner … not in the group" row offers "Add X to the group" (works
   when you own the group) and "Replace X…" prefilled; Export CSV has
   a People column.
2. **(11) Leavers** — the report's "Teams digest to controllers" sends
   one card listing the people findings to every document controller.
3. **(5/6) Views** — Kebab → Saved views: ✓ marks the view you are in;
   ✎ renames; the title reads "View · name" and "· edited" once you
   change a filter; a controller sees "Save for the site" and the
   result appears under "Site views" for everyone, with Update site
   view while it is active.
4. **(10) Management of change** — map a Note column to the
   "Management of change" role (Settings → Documents → Document
   columns): Edit properties shows rows of MoC number / link / what
   changed; the register and the overlay show the numbers as chips
   that open the link; ingestion marks the column required where the
   destination carries it.
5. **(2) Tag proposals** — AFTER the schema deploy: Details → "Suggest
   a tag…" on a document; as a controller, Kebab → "Tag proposals
   (1)…" → Approve: the tag is minted, lands on that document, and the
   proposer gets a Teams card; Decline asks for the reason. Settings →
   Documents → Tags still approves too.
6. **(4) Review round** — on a draft with reviewers, Submit for review:
   the done line names the status and the reviewers' Teams card is
   sent at once ("Reviewers notified ✓"). As a reviewer, the overlay
   offers "Review complete" (a minor version "Review complete by you").
   As the submitter, Submit for approval before every reviewer has done
   so warns "X has not marked their review complete — submit anyway?".
   On a checked-out draft, Check in… offers "Check in & submit for
   review" as one flow.

| Item | Outcome |
|---|---|
| 1–3 | PASS (Ben, 2026-10-19) — views menu name box widened to 340px after 3 |
| 4 | PASS (Ben, 2026-10-19) — after two follow-ups: the details chip opens its link (the pane had swallowed the click; scheme-less links are now accepted), and the editor row became two lines |
| 5 | PASS (Ben, 2026-10-19) |
| 6 | PASS (Ben, 2026-10-19) |

## Issue round tranche C — after v0.73.2 (2026-10-19, dev)

1. **(13) Filters reach every level** — Filters → a parent term such
   as SMELTER or MOS returns the documents tagged anywhere beneath it;
   Procedure and Form still work; "Something refused" never appears
   for a library that lacks the filtered column (it simply contributes
   nothing). If the term store is slow, the popover reads "loaded only
   partly" and recovers on reopening.
2. **(13) Descriptions** — add a description to a criticality term in
   the term manager; hover its pill in Filters: the description shows
   above the path.
3. **(12) Organisation order** — the Folders pane lists departments
   and areas in the order Settings → Organisation has them (drag one
   there, Save, reopen Documents); the Organisation pills in Filters
   follow the same order.
4. **(17a) Links card folders** — on a board's Documentation & links
   card, Show contents: a sub-folder has ▸ and expands in place;
   long names wrap.
5. **(17b) Panel width** — drag the Documents panel's right edge: it
   resizes (220–640px) and keeps the width next visit; long folder
   labels wrap instead of ending in "…".
6. **(3) Linked documents in the register** — open a document with
   links → Details → "Show these in the register": the overlay closes,
   the register shows only those documents with a "Linked to: <name>"
   chip; × restores the register. Choose columns → the links column
   reads "2 links".

| Item | Outcome |
|---|---|
| 1–6 | PASS (Ben, 2026-10-19; 6 after the scope cleared person and presence filters too) |

## Issue round tranche B — after v0.73.2 (2026-10-19, dev)

1. **(19) Version column** — Kebab → Choose columns → tick Version: a
   "v3.0" column; minors (v3.2) muted; sorts; in the CSV export.
2. **(7/15) Version history, view-only reader** — as a Restricted View
   account: the details pane shows "Current version v3.0 · Approved ·
   date" with the check-in comment and a one-line reason, no JSON, no
   failing call. As a Read account: the full history as before.
3. **(14) Opening, view-only reader** — as a Restricted View account:
   the preview shows the first page with the reason line; the header
   reads "Open in viewer ↗" and opens SharePoint's own viewer; no
   Download as PDF in ⋯; the register kebab reads "Open in viewer ↗".
   HOSTED CHECK: does a PDF open in the embed viewer for that account?
4. **(20) Document column position** — Choose columns: a "Document"
   row, always ticked, draggable; drag it below Document ID → Apply:
   the ID column comes first, frozen when the list scrolls sideways.
5. **(21) Favourites** — ★ Favourites: "← Back to libraries" in the
   title row returns to the register.
6. **(22) Show only approved** — Kebab: "✓ Show only approved" ticked;
   no status chip, no Status group in Filters, approved documents only.
   Untick: every status shows and the Status pills return; the setting
   rides "Copy link to this view" and saved views.
7. **(18) Print** — the overlay header's "Print": the browser's print
   dialog with the PDF rendition (Office files too). HOSTED CHECK: if
   the player frame blocks the dialog, the document opens in a new tab
   instead — say which happened.
8. **(25) Ingestion statuses** — the grid has an Approval status column
   (blank = Approved); set one file Superseded and one Draft; Run: the
   confirm counts "n as approved, 1 as superseded, 1 as draft"; the
   superseded file lands published 1.0 with status Superseded, the
   draft lands as 0.2 unpublished; Edit task… → defaults offers the
   status.

| Item | Outcome |
|---|---|
| 1–6, 8 | PASS (Ben, 2026-10-19; 5 moved to the far right; 6 after the view-link grace window) |
| 7 | WITHDRAWN — the player refuses the Office rendition's bytes and a PDF in a hidden frame downloads; Open in new tab carries the Ctrl+P hint |

## Issue round tranche A — after v0.73.2 (2026-10-19, dev)

Twelve fixes from docs/issues-plan-2026-10-19.md. Numbers are the
issue numbers in that plan.

1. **(1) Health report** — Documents ⋮ → Document control health: a
   library whose review column is not the site's first review column
   no longer lists its dated documents under "No next review date"; a
   calculated or text review column lists under "Review date
   unreadable" (info).
2. **(28) Template board** — Settings → Improvement → New template:
   the board designer opens on the board at once, no reload.
3. **(30) Template usage** — the template list reads "n active
   initiatives"; editing shows the real count; Delete on a used
   template says it cannot be deleted and names the count.
4. **(26) Ingestion task edit** — Edit task… → add an assignee → Save:
   the sheet reopens with the new assignee; Run and Close keep the
   assignees; a second new task with the same name is refused; the
   assignee picker lists the app's people first with "Searching…" /
   "No match".
5. **(27) Priorities** — opens at your own site every time, whatever
   you browsed to last.
6. **(31) My profile** — change your site and Save: you land on the
   home hub with the new site's tabs and accent, no browser refresh.
7. **(34) Issues** — change an issue's status: it stays open where it
   is, the chip updates, the thread shows the line; a status outside
   the filter dims the row with "leaves this list on ↻ Refresh".
8. **(33/35) Filters** — the term search box keeps focus as you type;
   no "Has tags"; "Linked documents · Has linked documents" remains;
   the search box has room above the pills.
9. **(32c) Priority popup → Metrics** — the tab scrolls; every chart
   keeps its height; nothing is clipped at the bottom.
10. **(25) Register width** — with the Folders pane open on a laptop,
    every chosen column (status included) stays; the list scrolls
    sideways with the Document column frozen; ingestion marks the
    organisation column required when the destination carries it.
11. **(11) Health report, people** — a directory lookup that fails
    reads "Not checked: n lookups failed", not "no longer in the
    directory".
12. **(9) Reviewer picker** — document controllers list before the
    directory search; Replace a person with only Reviewers ticked
    searches everyone.

| Item | Outcome |
|---|---|
| 1–12 | PASS (Ben, 2026-10-19; 10 after two follow-ups: the column floor at every width, classic scrollbars) |

## Term alignment pass — after v0.71.0 (2026-10-12, dev)

Settings → Documents → Term store. Needs the Organisation set (and
the Process area set) bound, and a term in one of them the app does
not know (make one in the term store by hand for the test).

1. **Alignment card** — "Align term sets" runs both sets: a card per
   set with its log, then "✓ Aligned — n terms bound" or the lines
   saying what is left (the hand-made term is named as "the app does
   not know").
2. **Decision rows** — Load drift report: "In the term set only (n)"
   lists the hand-made term with a select: Leave, Retire, and "This
   is X" for each sibling the plan would create (none when the plan
   creates nothing under that parent).
3. **Pair** — choose "This is X": the Apply button counts it as a
   change; Apply renames the term in place (log "is X: bound; it will
   be renamed"), the fresh verdict reads aligned, and Manage terms…
   shows the term under its new name with its GUID unchanged.
4. **Retire** — choose Retire on another term: Apply deprecates it
   (log "retired … (deprecated)") or, where the road refuses, suffixes
   "(retired)" and says so; the verdict no longer counts it; reload
   shows it under "Retired earlier".
5. **One create claimed once** — two orphans cannot both be "This is
   X": picking it on the second resets the first to Leave.
6. **Nothing lost** — no term is deleted by any of the above; the
   manager's delete stays the only delete and only at zero usage.

7. **Write-through, organisation** — Settings → Organisation: add a
   department and Save: a line at the top reads "Organisation term set
   updated ✓" and Manage terms… shows the new term under its site;
   rename it and Save: the term is renamed in place (same GUID);
   remove it and Save: the term is retired (deprecated or suffixed),
   listed under "Retired earlier" in the drift report; archive a site:
   its term retires; restore it: the term comes back.
8. **Write-through, process** — Settings → Process: add an area:
   "Process area term set updated ✓" under the tree and the term
   exists; set a local name: it reads as a synonym; archive a
   process: its term (and its children's) retire.
9. **Owed push** — as a site admin without term-store rights, rename a
   department and Save: the line reads "push owed — …"; then as a
   super admin open Settings → Documents: the Term store section says
   a push is owed and pushes it, ending in "✓ … updated"; the drift
   report reads aligned.

10. **Shape guard** (production, 2026-10-13) — with the Organisation set
    starting at company level and the box UNTICKED, the drift report
    reads "Cannot compare: the term set starts at COMPANY level … tick
    the box" and write-through reports the push owed with the same
    reason; nothing is created. With stray site terms at the top
    level, the report lists them with Count usage → Remove.
11. **Large set** — a production-sized set walks whole (no "cut
    short"); a throttled walk reads "n children requests failed … try
    again in a minute" and the sync stays disabled.

12. **Two companies** — with the box ticked and sites under two
    companies, the drift report creates each company as a top-level
    term and the sites under their own company; a hand-made top term
    ("Pacific") is listed as unknown with "This is RTAL PacOps" — Apply
    renames it in place (its sites and tags stay) and creates the
    other company beside it; the verdict reads aligned.

13. **Ampersands** — a department named "Bauxite & Alumina" creates
    as "Bauxite ＆ Alumina" (OK, not 400), matches on the next report
    (no create, no rename), and the hand-made "＆" terms match their
    "&" app names instead of reading as unknown; the ⚠ phone note
    still names them.

| Item | Outcome |
|---|---|
| 1–13 | _Ben's pass pending_ |

## Term manager pass — after v0.69.0 (2026-10-12, dev)

1. **Open** — Settings → Documents → Term sets & colours → "Manage
   terms…" under a card: the sheet lists the set's terms as a tree;
   the head says how many terms and which languages.
2. **Find** — type in "Find a term…": hits show inside their branch;
   clear it and the tree returns.
3. **Edit** — pick a term: a card per language; change the default
   label, add a synonym (Enter), a description; Save term; the tree
   shows the new name; Discard-on-close asks when unsaved.
4. **Usage and delete** — Count usage reads a number; Delete… is
   greyed while the count is unknown or above zero, or while the term
   has children; a new child term via ＋ Add child, then delete it.
5. **Organisation set** — "Manage terms…" beside the Organisation term
   set: the default label is read-only, synonyms and translations edit,
   no Add / Delete.
6. **Register** — after a rename, reload the register: the filter and
   the chips read the new label; colours keyed to the id hold.
7. **Colour in the manager** — pick a colour and a glyph on a term;
   the tree row shows the dot and the line reads "Saved."; the
   register's chip wears it on its next load (no Settings save needed). The set's card in Term sets & colours
   is one line with the count.
8. **Rename journal** — Settings → Organisation: rename a department,
   Save; Settings → Documents → Term store shows "The organisation
   changed since the last sync — 1 rename recorded (Old → New)"; Load
   drift report lists the rename as exact (not a create + orphan);
   Apply; the warning is gone and the term kept its id (Manage terms
   shows the new name on the same id).
9. **Binding** — rename TWO sibling departments before any sync, Save,
   then drift report: both read as renames, nothing to create.

| Item | Outcome |
|---|---|
| 1–9 | _Ben's pass pending_ |

## Document ingestion pass — after v0.68.0 (2026-10-08, dev)

Needs the ingestion library set up (document-ingestion-proposal §8).

1. **Hidden library** — the register, phone selects, filters, views
   and exports never list the ingestion library.
2. **New task** — the register's ⋮ → New ingestion task… (controllers only):
   name, destination, two assignees, a default or two; the folder
   appears in the library; assignees get a Teams card.
3. **Ingestion tasks button** — its own "Ingestion tasks · n" button
   beside Document tasks, present only while the viewer has active
   tasks (assignees theirs, controllers all); its panel's row opens the
   task sheet; Document tasks does not list them.
4. **Files** — Open folder ↗, drop three files; the sheet lists them
   with the destination's columns and a Ready pill naming what is
   missing.
5. **Details** — the grid shows every column the destination type
   offers in the settings order (✱ required), the Document column
   frozen while the rest scrolls; type in a text cell, pick a choice,
   a date, open a term or person cell's popover and Set; the row dot
   and tinted cells mark unsaved; Save changes writes them (one bracket
   per file); Discard reverts; close or Refresh with drafts asks first;
   select two rows → Set for selected… lands in the grid; Fill blanks
   from defaults fills the rest; Run is greyed while anything is
   unsaved.
6. **Run** — Run ingestion… is greyed while any file lacks a required
   detail (hover says how many); once every file is ready it names the
   counts; files move into the
   destination as approved 1.0 with the check-in comment naming the
   task; a file with a missing detail stays with its reason; a name
   already in the destination is refused; a changed "Name on ingestion"
   renames the file on Save and the copy lands under the new name; the
   task stays open after a run; Close task… recycles the folder (the
   confirm counts un-ingested files) and the log reads on the closed task.
7. **Cancel** — Edit task… → Cancel task… (controllers): the confirm
   names the files; the folder and its files go to the site recycle
   bin; the task leaves the Ingestion tasks button and the sheet closes.
8. **Timing readout** (2026-10-12, super admins only) — the register's
   status line ends with "… after opening · feed … ×n · app data …" on
   the visit's first load and "loaded in … · feed …" on every later one
   (search, scroll-paging, a filter); hover reads each call; a site
   admin or user sees the plain count. After v0.71.0: the tooltip's
   Load 1 is the open itself (never "next page, scroll"), and "opened
   in" is close to the feed time — the stray scroll page and the
   vocabulary wait are gone.

| Item | Outcome |
|---|---|
| 1–8 | _Ben's pass pending_ |

## Initiative links pass — after v0.67.0 (2026-10-08)

1. **Settings → Improvement → Standard fields** — "Working folder"
   (url) leads the list; remove it, see "Restore the built-in…", restore.
2. **An initiative's pane** — a "Folder" row with "Set folder…"; paste
   a SharePoint folder link; the row shows host › path and opens it in
   a new tab; the Improvement list row and tile show 📁.
3. **An initiative board** — add the "Documentation & links" card
   (Reference); it opens with the working folder pinned and "Change…";
   "＋ Add link" (always under the list), paste a URL, Add; Edit on a
   row, change the title, Save; the tile shows titles only.
4. **A meeting board** — the same card as standing content; its links
   hold across occurrences.
5. **The walk** — open any card on an initiative board: tabs, PREV /
   NEXT, "Card n of m", the stage pill, "＋ Action" in the title bar,
   Back to board.
6. **Template chip** — every Improvement row and tile shows a tinted
   "Template · Method" chip beside the title (the method alone when the
   template was deleted); hover gives both in full.
7. **Working folder button** — with a folder set, the initiative
   board's control row (left of Current stage / All stages) shows
   "📁 Working folder", which opens the folder in a new tab; no button
   without a folder.
8. **Edit details** — six groups (About · Organisation · Priorities &
   people · Details · Metrics · Rules) in a narrower modal, no Period;
   "Also shown in" folded under Organisation (open when it has
   entries); short fields two to a row; Save with an empty required
   field names the group and lands the cursor on it. New initiative's
   second step is the same form.
9. **Folder contents** — on the links card, a working folder given as
   a SharePoint folder address (…/Shared Documents/… or …?id=…) shows
   "Show contents ▾" and lists its folders and files; a OneDrive
   "/:f:/g/" share shows ⓘ and no list; the Improvement list and tiles
   show no folder shortcut.

| Item | Outcome |
|---|---|
| 1–9 | _Ben's pass pending_ |
