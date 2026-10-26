# Documents

Personas: reader (any signed-in person), author (contributes to a working library), owner (named owner of a standard), reviewer, approver, controller (document controllers group), superadmin. The production test site needs: two exposed standards libraries and one working library with the site columns mapped (status, owner, approvers, reviewers, revision editors, next review date, importance, document id, organisation, process area, tags, linked documents, management of change), the ingestion library, the three groups, the Organisation / Process / Status / Tags term sets, and a handful of documents in each lifecycle stage.

## Journey 1 — Register and libraries

### UAT-DOC-001 — The Documents tab shows the exposed libraries
persona: reader
modules: docs/docsScreen.ts docs/docsTiles.ts
preconditions: signed in; at least two exposed libraries on the site
steps:
1. Open LeanBoard → Documents.
2. Read the tiles.
expected: one tile per exposed library with its document count; the ingestion and template libraries are not register tiles; the tiles open the register scoped to that library

### UAT-DOC-002 — Open a library and read the register
persona: reader
modules: docs/docsScreen.ts docs/listView.ts docs/registerCells.ts
preconditions: a library with more than 20 documents
steps:
1. Open a library tile.
2. Scroll the list; use the "more" paging at the bottom.
expected: the register lists the documents with Document, status chip, owner and the library's chosen columns; the header and the Document column stay in place while the rest scrolls sideways in a narrow window; paging loads more rows without losing the scroll position

### UAT-DOC-003 — The status line counts and the timing readout
persona: superadmin
modules: docs/docsScreen.ts docs/timing.ts
preconditions: signed in as a super admin
steps:
1. Open a library.
2. Read the status line under the toolbar; hover it.
expected: "N documents of M" with "loaded in … · feed … · opened in …" for a super admin only; the tooltip lists every load with its trigger; a plain user sees the count alone

### UAT-DOC-004 — Search by name
persona: reader
modules: docs/docsScreen.ts docs/rows.ts
preconditions: a library with a document whose name contains a distinctive word
steps:
1. Type part of the name in the search box; press Enter.
2. Clear the search.
expected: only matching documents remain, the count follows; clearing restores the full list

### UAT-DOC-005 — Filter by status
persona: reader
modules: docs/docsScreen.ts
preconditions: a standards library with approved and draft documents
steps:
1. With "Show only approved" ticked, open Filters → Status.
2. Click "Show every status"; tick Draft.
3. Tick Approved as well, then clear the filter.
expected: under the approved-only default the Status group says the register shows approved documents only and offers "Show every status" instead of hiding; after it, each tick narrows or widens the list at once; the filter pill shows the chosen values; Clear all removes every filter

### UAT-DOC-006 — Show only approved
persona: reader
modules: docs/docsScreen.ts docs/views.ts
preconditions: a standards library with approved and non-approved documents
steps:
1. Kebab ⋮ → read "✓ Show only approved" (ticked by default).
2. Untick it.
3. Tick it again.
expected: ticked, the register hides drafts, superseded and obsolete documents and the Status group explains itself instead of filtering; a document that leaves the approved stage while ticked (superseded, obsoleted) drops from the list at once with a status line; unticked, every stage shows and Status can be filtered; the choice is remembered for the view

### UAT-DOC-007 — Filter by organisation at a parent level
persona: reader
modules: docs/docsScreen.ts docs/rows.ts docs/sp.ts
preconditions: documents tagged with organisation terms under one parent (a site or department)
steps:
1. Filters → Organisation → pick a parent term (a department with areas under it).
2. Open one of the results and read its Organisation value.
expected: documents tagged anywhere beneath the parent appear, not only those tagged with the parent itself; the pill names the parent; on a browser that has never loaded the tree, the Folders pane paints the viewer's own site branch within a few seconds with "Loading the rest of the organisation…" above it, and the other sites fill in behind "Show other sites" as the walk completes

### UAT-DOC-008 — Filter by document type and process
persona: reader
modules: docs/docsScreen.ts
preconditions: documents tagged with document types and process areas
steps:
1. Filters → Document type → Procedure.
2. Add Filters → Process area → a process.
expected: the filters combine (AND); each pill removes independently; a library that lacks one of the columns is skipped quietly, never "Something refused"

### UAT-DOC-009 — Filter by a person and by "has links"
persona: reader
modules: docs/docsScreen.ts docs/rows.ts
preconditions: documents with different owners; some with linked documents
steps:
1. Filters → Owner → type a name and pick it.
2. Filters → Linked documents → "Has links".
expected: only that owner's documents remain; the links filter then keeps the ones carrying links; the pills read "Owner: X" and "Has links"

### UAT-DOC-010 — Filter by modified date
persona: reader
modules: docs/docsScreen.ts
preconditions: documents modified at different times
steps:
1. Filters → Modified → last 30 days.
2. Custom range: pick a from date and a to date → Apply range.
3. Save the view; reopen it.
expected: the list narrows to the window; the pill names it ("Modified: 1 Oct 2026 – 15 Oct 2026" for the range); either end of the range may be left open; a preset clears the range and the range clears the preset; the range is kept on a saved view; clearing restores the list

### UAT-DOC-011 — Choose and order columns
persona: reader
modules: docs/docsScreen.ts docs/registerCells.ts
preconditions: a library with several available columns
steps:
1. Kebab → Choose columns.
2. Untick one column, tick Version and Flags, drag Document below Modified, Apply.
3. Reload the page.
expected: the register shows exactly the ticked columns in the dragged order, Document where it was placed with Library beside it; Version reads "v3.0" (a minor version muted); the choice survives a reload

### UAT-DOC-012 — Sort by a column
persona: reader
modules: docs/listView.ts docs/docsScreen.ts
preconditions: any library
steps:
1. Click the Modified header; click again.
2. Click the Document header.
expected: the list sorts ascending then descending with the arrow in the header; name and Modified sort across the whole library, the other columns within the loaded rows

### UAT-DOC-013 — Save, rename and tick a personal view
persona: reader
modules: docs/views.ts docs/prefs.ts docs/docsScreen.ts
preconditions: any library
steps:
1. Set a search, a filter and a column set.
2. Views → Save view… → name it.
3. Change a filter; read the Views menu; Views → Rename… the view; pick it again.
expected: the saved view appears in the menu with ✓ when active; after a change the title reads "View · name · edited"; Rename keeps the view; picking it restores search, filters and columns; the name box in the menu is wide enough to read

### UAT-DOC-014 — Site views for everyone
persona: controller
modules: docs/views.ts docs/docsStore.ts docs/docsScreen.ts
preconditions: signed in as a document controller
steps:
1. Build a view with an organisation filter and a library; Views → "Save for the site".
2. Open the new site view from the Views menu straight away.
3. Sign in as a reader; open Views.
4. As the controller: Update site view, "✎ Rename", "× Delete".
expected: opening the view paints the register with its filters (never a blank register — a view that cannot be applied falls back to the plain register with a line saying why); the site view is listed under "Site views" for the reader, who can pick but not change it; Rename and Delete are labelled on the row, Delete asks first, and the controller's update, rename and delete take effect for everyone

### UAT-DOC-015 — Favourites and Back to libraries
persona: reader
modules: docs/docsScreen.ts docs/prefs.ts
preconditions: any library
steps:
1. Star two documents (★ in the row).
2. Open ★ Favourites.
3. Click "← Back to libraries" at the far right.
expected: Favourites lists the starred documents across libraries; Back returns to the tiles; the star is remembered per person

### UAT-DOC-016 — The register on a phone
persona: reader
modules: docs/phoneRegister.ts docs/docsScreen.ts
preconditions: the app open on a phone (or a window under 600 px wide)
steps:
1. Open Documents → a library.
2. Search; apply a status filter; open a document.
expected: one stacked cell per document (name, status, owner, modified); search and filters work; the document opens in the viewer; no sideways scroll

## Journey 2 — Open and read

### UAT-DOC-017 — Open a document in the viewer
persona: reader
modules: docs/viewer.ts docs/data.ts
preconditions: an approved PDF and a Word document
steps:
1. Open the PDF from the register.
2. Close it; open the Word document.
expected: the PDF renders in the viewer; the Word document shows its preview; the register's scroll position is restored on close; Esc closes

### UAT-DOC-018 — The details pane
persona: reader
modules: docs/viewer.ts
preconditions: a document with owner, approvers, organisation, document id and a review date
steps:
1. Open the document → Details.
2. Read the identity line, the chips and the Properties grid.
expected: the id chip, status chip and the section headings match the library's column sections; dates read in the app's format; owner & approver collapse to one row when they are the same person; the review hint names the cadence

### UAT-DOC-019 — Versions
persona: owner
modules: docs/viewer.ts docs/data.ts docs/rows.ts
preconditions: a document with several versions; signed in as its OWNER (the Owner column names you) or as a document controller — anyone else sees no open links by design
steps:
1. Open the document → Details → Versions.
2. Click a version's open link.
3. Sign in as a reader who is neither owner nor controller; open the same list.
expected: every version with its label, author, date and comment; open links on versions for the owner or a controller only; the reader sees the list without the links and the line "Open links on versions show for the document's owner and document controllers"

### UAT-DOC-020 — A Restricted View reader
persona: reader
modules: docs/viewer.ts docs/model.ts docs/docsScreen.ts
preconditions: a library where the test reader has Restricted View (no download)
steps:
1. Open an approved PDF as that reader.
2. Look for Download, Open in new tab and the version list.
expected: SharePoint's own viewer shows the document; no download or new-tab road; the current version line stands in for a history that would be refused; nothing errors

### UAT-DOC-021 — Copy link, Download, Share with QR, Open in new tab
persona: reader
modules: docs/viewer.ts docs/docsScreen.ts docs/links.ts
preconditions: any PDF document
steps:
1. Open the document → Copy link; paste it in a new browser tab.
2. Download (in the header, beside Open in new tab): read the saved file's name.
3. Share… → read the permalink and the QR code.
4. ⋯ → Open in new tab ↗.
expected: the pasted link opens LeanBoard on that document; Download saves the file under the document's own name (the viewer frame's own save icon cannot name it — it offers "pdf"); the QR encodes the same link; the new tab opens the file in SharePoint, and its tooltip says to print from there

### UAT-DOC-022 — A permalink opens the document, a view link opens the view
persona: reader
modules: links.ts docs/docsScreen.ts screens/hub.ts
preconditions: a document permalink and a Documents view link (Views → Share view)
steps:
1. Open the document permalink in a fresh browser tab.
2. Open the view link in a fresh browser tab.
expected: the permalink lands on the document with the viewer open; the view link lands on the register with the view's library, filters and "Show only approved" state applied, not the default library

### UAT-DOC-023 — Linked documents and "Show these in the register"
persona: reader
modules: docs/viewer.ts docs/docLinks.ts docs/docsScreen.ts
preconditions: a document with three linked documents in its links column
steps:
1. Open the document → Details → Linked documents.
2. Click one link.
3. Back on the first document, click "Show these in the register".
expected: the links are grouped by relationship; a click switches the viewer to the linked document; "Show these" scopes the register to exactly those documents with the chip "Linked to: X", every other filter cleared; the chip's × restores the register

### UAT-DOC-024 — Management of change chips
persona: reader
modules: docs/viewer.ts docs/registerCells.ts docs/mocEditor.ts
preconditions: a document whose management-of-change column holds a record with a number and a link
steps:
1. Read the register's MoC column.
2. Open the document → Details → the MoC row; click the chip.
expected: the number reads as a chip in both places; the chip opens the link in a new tab; the tooltip carries the title and date

## Journey 3 — Add, edit and replace

### UAT-DOC-025 — Add a document to a working library
persona: author
modules: docs/addDocument.ts docs/fieldEditors.ts docs/docsScreen.ts
preconditions: a working library the author may contribute to; a file to upload
steps:
1. Open the working library → Add document.
2. Pick the file; fill the required fields (the ✱ ones); leave an optional one blank.
3. Add.
4. (Controller) Make a library column required that is not in the site dictionary; open Add document again.
expected: the required fields block Add until filled and the line under the button names what is missing; the document lands in the library with its properties and opens in the viewer, with the status line saying it was added as a draft, shows when "Show only approved" is unticked, and is submitted for review from its ⋯ menu; in step 4 the form names the library-required column it cannot collect and refuses before creating anything (no checked-out orphan)

### UAT-DOC-026 — Add refuses a duplicate name and a duplicate document id
persona: author
modules: docs/addDocument.ts docs/model.ts
preconditions: an existing document name and document id in the library; a second standards library carrying a document id
steps:
1. Add document with the same file name.
2. Add document with a different name but the same document id.
3. Add document to the second library with a document id used in the first.
expected: all three are refused before anything is written, each with a plain reason naming the clash ("A document named “X” already exists in this library — last modified by … on …" / "Document ID “X” is already used by “name” in <library>"); the check spans every standards library

### UAT-DOC-027 — Edit properties
persona: owner
modules: docs/editProperties.ts docs/fieldEditors.ts
preconditions: a draft standard you own
steps:
1. Open the document → ⋯ → Edit properties…
2. Change a text field, a date, a taxonomy field and a person field.
3. Save.
4. Edit again; change the document id to one another document carries; Save.
expected: the dialog's footer stays pinned while the body scrolls; each editor fits its column type; Save writes the values and the details pane shows them without reopening; the duplicate document id is refused with the clashing document named, and the unchanged id is never re-checked

### UAT-DOC-028 — Cascading organisation and process pickers
persona: owner
modules: docs/fieldEditors.ts docs/model.ts
preconditions: the Organisation and Process area columns mapped
steps:
1. Edit properties → Organisation: pick a company, then a site, then a department.
2. Process area: pick a type, then an area, then a process.
expected: each level offers only the children of the level above; the saved value is the deepest pick; the register and filters read it back

### UAT-DOC-029 — Management of change records
persona: owner
modules: docs/mocEditor.ts docs/fieldEditors.ts docs/model.ts
preconditions: the management-of-change role mapped to a note column
steps:
1. Edit properties → the Management of change rows: add a record with a number, a link typed without https, and what changed.
2. Add a second record; remove the first; Save.
expected: each record is two lines (number and link, then what changed) and not cramped; a scheme-less link is accepted; the saved value shows as chips

### UAT-DOC-030 — Linked documents editor
persona: owner
modules: docs/linksEditor.ts docs/editProperties.ts
preconditions: the linked-documents column mapped; another document to link to
steps:
1. Edit properties → Linked documents → Add link… search for a document, pick a relationship.
2. Remove a link; Save.
expected: the picker finds documents across the exposed libraries; the relationship is stored; the viewer's Linked documents section and the "n links" register cell follow

### UAT-DOC-031 — Check out, check in, discard
persona: owner
modules: docs/lifecycleCmds.ts docs/docsScreen.ts
preconditions: a draft standard you own, not checked out
steps:
1. Open it → Check out.
2. Read the register row and the Document tasks panel.
3. Check in… with a comment; then check out again and Discard check-out.
expected: the row shows the lock and your name; "Checked out to you" lists it in Document tasks; Check in writes a minor version with the comment; Discard releases it without a version

### UAT-DOC-032 — Replace content
persona: owner
modules: docs/replaceContent.ts docs/lifecycleCmds.ts
preconditions: a draft standard you own; a new file
steps:
1. Open it → ⋯ → Replace content…
2. Pick the new file; Replace.
expected: the file is swapped, the properties stay, a new minor version appears with the replace comment; the viewer shows the new content

## Journey 4 — Lifecycle

### UAT-DOC-033 — Submit for review sends the reviewers' card at once
persona: owner
modules: docs/lifecycleCmds.ts docs/notifyPanel.ts docs/notifyModel.ts
preconditions: a draft standard you own with two reviewers named and a reviewer who can check Teams
steps:
1. Open it → Submit for review.
2. Read the done line.
3. As a reviewer, check Teams.
expected: the status becomes the mapped "in review" value; the done line names the status and ends "Reviewers notified ✓" without the notify panel asking first; each reviewer has a card with the document link

### UAT-DOC-034 — Check in and submit for review as one flow
persona: owner
modules: docs/lifecycleCmds.ts
preconditions: a draft standard you own, checked out to you
steps:
1. Open it → Check in…
2. Click "Check in & submit for review".
expected: one dialog does both; the version lands and the status moves to in review; the reviewers' card goes

### UAT-DOC-035 — Review complete
persona: reviewer
modules: docs/lifecycleCmds.ts docs/model.ts docs/notifyModel.ts
preconditions: a standard in review that names you as a reviewer
steps:
1. Open it → Review complete.
2. Read the versions.
expected: a minor version with the comment "Review complete by <you>"; the owner gets a Teams card; the action disappears for you once recorded

### UAT-DOC-036 — Submit for approval warns while reviewers are outstanding
persona: owner
modules: docs/model.ts docs/docsScreen.ts
preconditions: a standard in review with one reviewer done and one not
steps:
1. Open it → Submit for approval.
2. Cancel at the warning; then run it again and confirm.
expected: the warning names the reviewer who has not marked review complete; Cancel leaves the document untouched; Confirm proceeds to awaiting approval and the approvers' card goes

### UAT-DOC-037 — Approve and publish
persona: approver
modules: docs/lifecycleCmds.ts docs/model.ts
preconditions: a standard awaiting approval that names you as approver; a cadence mapped to its importance
steps:
1. Open it → Approve.
2. Read the status, the version, the effective date and the next review date.
expected: a major version is published and approved; the effective date is today; the next review date is the effective date plus the cadence for its importance; the owner and reviewers get the courtesy card

### UAT-DOC-038 — Owner approval and an owner outside the group
persona: owner
modules: docs/model.ts docs/docsScreen.ts docs/viewer.ts
preconditions: a standard awaiting owner approval whose owner is NOT in the owners & approvers group
steps:
1. As that owner, open it.
2. Read the decision card.
expected: "Awaiting your approval" with the reason the owner cannot approve and no Approve button; the controllers see the same document in health with "Add X to the group"

### UAT-DOC-039 — Mark reviewed
persona: owner
modules: docs/lifecycleCmds.ts docs/docsScreen.ts
preconditions: an approved standard you own with a review date within 30 days
steps:
1. Document tasks → Review due → open it → Mark reviewed.
2. Read the dates and the version comment.
expected: the effective date refreshes, the next review date moves by the cadence, a minor version "Periodic review — no changes" is written; the task leaves the list

### UAT-DOC-040 — Cancel a revision
persona: owner
modules: docs/lifecycleCmds.ts
preconditions: an approved standard with a draft revision in progress (a minor version after the major), NOT checked out
steps:
1. Open it → ⋯ → Cancel revision…
2. Confirm.
3. Repeat on a revision checked out to you; then on one checked out to someone else.
expected: the last approved major's content and status come back as a NEW major (v3.0 restored lands as v4.0 with the comment "Revision cancelled — restored v3.0"), published where content approval is on; the draft versions stay in history; your own check-out is discarded first; another person's check-out refuses with their name

### UAT-DOC-041 — Supersede and obsolete
persona: controller
modules: docs/lifecycleCmds.ts docs/model.ts
preconditions: two approved standards
steps:
1. On one: ⋯ → Supersede… naming the other.
2. On another approved standard: ⋯ → Make obsolete…
expected: the superseded document carries the mapped status and a link to its successor; the obsolete one carries its status; both leave the approved-only register and show when "Show only approved" is unticked

### UAT-DOC-042 — The notify panel: Teams and email, people chips
persona: owner
modules: docs/notifyPanel.ts docs/notify.ts docs/notifyModel.ts
preconditions: a lifecycle step whose panel asks before sending (Submit for approval)
steps:
1. Run the step; in the panel remove one recipient chip, add a note, choose Teams.
2. Run another step and choose Email.
expected: the chips show who hears and why; the removed person gets nothing; the note rides the card; the email arrives with the link; a refused send is reported with its reason, never silently

## Journey 5 — Access requests

### UAT-DOC-043 — Ask to work on a document
persona: reader
modules: docs/accessRequests.ts docs/viewer.ts
preconditions: a working-library document the reader cannot edit
steps:
1. Open it → Ask to work on this…; give a reason; Send.
2. Read Document tasks → Your access requests.
expected: the request is recorded with the reason; the owner gets a Teams card; the reader sees it listed as pending

### UAT-DOC-044 — Grant and decline
persona: owner
modules: docs/accessRequests.ts docs/docsScreen.ts
preconditions: a pending request on a document you own
steps:
1. Document tasks → Edit-access requests → Approve.
2. On a second request: Decline with a reason.
expected: Approve adds the person to the revision editors and the requester's card says so; Decline carries the reason; both leave the queue; the requester's "Your access requests" shows the outcome

### UAT-DOC-045 — Revoke a grant
persona: owner
modules: docs/accessRequests.ts docs/docsScreen.ts
preconditions: a grant you made earlier
steps:
1. Document tasks → Edit access you granted → Revoke.
expected: the person leaves the revision editors; the row leaves the list; the badge never counted this group

## Journey 6 — Document tasks

### UAT-DOC-046 — The badge equals the panel
persona: owner
modules: docs/docsScreen.ts docs/taskRows.ts taskBadge.ts
preconditions: a mix of items awaiting you (approval, review, checked out, review due, a request)
steps:
1. Read the Documents tab label and the "Document tasks · n" button.
2. Open the panel; count the rows across the groups.
expected: the hub tab, the button and the panel agree on one number; the groups appear in order: requests, awaiting approval, awaiting review, checked out, review due, flagged, your requests, grants you made

### UAT-DOC-047 — Open a task and show them all in the register
persona: owner
modules: docs/docsScreen.ts
preconditions: at least two task rows
steps:
1. Click a task row.
2. Reopen the panel → "Show all n in register".
expected: the row opens the document with its details pane and the action ready; "Show all" scopes the register with the chip "Document tasks · n", filters set aside; the chip's × restores the register

### UAT-DOC-048 — Ingestion tasks from the register
persona: controller
modules: docs/docsScreen.ts docs/ingestionScreen.ts
preconditions: an open ingestion task
steps:
1. Read the "Ingestion tasks" button beside Document tasks.
2. Open it; open a task.
expected: the button counts the open tasks you prepare or oversee; the panel lists them; a click opens the task sheet

## Journey 7 — Tag proposals

### UAT-DOC-049 — Suggest a tag from the properties
persona: reader
modules: docs/viewer.ts docs/docsScreen.ts docs/tagProposals.ts
preconditions: the Tags column mapped to a term set
steps:
1. Open a document → Details → Properties → under Tags, "Suggest a tag…".
2. Type a new tag and why; Send proposal.
expected: the link sits with the Tags property (a document with no tags still gets a Tags row holding it); the proposal is recorded and the status line says a controller decides; a duplicate label is refused

### UAT-DOC-050 — The controllers' tag queue
persona: controller
modules: docs/tagQueue.ts docs/tagProposals.ts
preconditions: a pending proposal raised on a DRAFT document
steps:
1. Register kebab → "Tag proposals (n)…".
2. Approve the proposal.
expected: the menu item counts the pending proposals; Approve mints the term, puts the tag on the draft document, and the proposer gets a Teams card saying so

### UAT-DOC-051 — A tag on an approved document waits for its revision
persona: controller
modules: docs/tagProposals.ts docs/tagQueue.ts
preconditions: a pending proposal raised on an APPROVED document
steps:
1. Tag proposals → Approve it.
2. Read the queue; click "Tag now".
3. Start a revision on the document (check out), then "Tag now" again.
expected: the term is minted but the document is not written; the proposal moves to "To tag at next revision" and the proposer's card says the tag goes on at the next revision; "Tag now" while approved says it is still approved; once in revision the tag lands and the proposal clears

### UAT-DOC-052 — Decline a proposal
persona: controller
modules: docs/tagQueue.ts docs/tagProposals.ts
preconditions: a pending proposal from another person
steps:
1. Tag proposals → Decline… → give a reason.
expected: the reason is required; the proposer's Teams card carries it; the proposal leaves the queue and stays on record as declined

### UAT-DOC-053 — Tags in Settings
persona: superadmin
modules: docs/settingsTab.ts docs/tagProposals.ts
preconditions: a pending proposal; tags in use
steps:
1. Settings → Documents → Tags: read "Tags in use"; rename one; approve a pending proposal.
expected: the rename keeps the term's id so tagged documents follow; approval behaves exactly as the controllers' queue (a tag on an approved document waits)

## Journey 8 — Document flags

### UAT-DOC-054 — Flag a document for review
persona: reader
modules: docs/flagDialog.ts docs/docFlags.ts docs/viewer.ts
preconditions: a document owned by someone else; a screenshot on the clipboard
steps:
1. Open it → under the buttons, "⚑ Flag for review…".
2. Pick a level, write a comment, paste the screenshot; Flag it.
expected: the dialog names who will hear (the owner by name); a comment is required; the flag is written and the owner gets a Teams card quoting the comment with an "Open in LeanBoard" link; the owners are read fresh even when the register row never fetched them

### UAT-DOC-055 — A flag with no owner goes to the controllers
persona: reader
modules: docs/docsScreen.ts docs/flagDialog.ts
preconditions: a document with no owner named
steps:
1. Flag it.
expected: the dialog says no owner is named and lists the controllers by name; the controllers get the card

### UAT-DOC-056 — The flag chip and the flags list
persona: owner
modules: docs/viewer.ts docs/flagQueue.ts docs/docFlags.ts
preconditions: a document you own carrying an open flag
steps:
1. Open it → read the "⚑ level" chip under the buttons; click it.
2. In the list: read the screenshot; "Close flag…" with a note.
expected: the chip names the level (or "n open flags"); the list shows level, flagger, when, comment and the screenshot full-size on click; closing asks for a note and the chip disappears; the closed flag stays listed for the record

### UAT-DOC-057 — Flags in the register
persona: reader
modules: docs/registerCells.ts docs/docsScreen.ts
preconditions: open flags on several documents
steps:
1. Choose columns → tick Flags.
2. Kebab → "Show flagged documents".
expected: the Flags column reads "⚑ level" or "⚑ n open flags"; the scope lists only the flagged documents with the chip "Flagged for review · n"; the chip's × restores the register

### UAT-DOC-058 — Flags in Document tasks and in health
persona: owner
modules: docs/docsScreen.ts docs/healthReport.ts
preconditions: an open flag on a document you own; another on a document you do not own
steps:
1. Document tasks → "Flagged for review".
2. As a controller: the same group; and Document control health.
expected: an owner sees the flags on their own documents only; a controller sees every open flag; the row shows level, flagger and the start of the comment and opens the document; health lists the flagged documents under "Flagged for review"

### UAT-DOC-059 — The controllers' flags queue
persona: controller
modules: docs/flagQueue.ts docs/docsScreen.ts docs/settingsTab.ts
preconditions: open flags on the site
steps:
1. Register kebab → "Document flags (n)…".
2. Open document; Close flag… with a note.
3. Settings → Documents → "Document flags…".
expected: the queue lists every open flag with its screenshot; Open document opens the overlay; Close asks for a note and records who closed it; the Settings button opens the same queue

### UAT-DOC-060 — Review levels are an app-managed list
persona: superadmin
modules: docs/settingsTab.ts docs/docFlagsModel.ts docs/model.ts
preconditions: Settings → Documents open
steps:
1. Review levels: read the defaults marked "default"; add a level; Save.
2. Flag a document and read the level list.
expected: adding a level replaces the defaults with your list (× on each); the flag dialog offers your list; an emptied list falls back to the defaults

### UAT-DOC-061 — Mark reviewed offers to close the flags
persona: owner
modules: docs/docsScreen.ts docs/docFlags.ts
preconditions: an approved standard you own with two open flags and a review date within 30 days
steps:
1. Mark reviewed.
2. At the prompt, Close flags.
expected: after the review the prompt names each flag; confirming closes them with "Closed at Mark reviewed"; the chip clears and the tasks badge drops

## Journey 9 — Ingestion

### UAT-DOC-062 — Create an ingestion task
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionStore.ts
preconditions: the ingestion library exposed; a destination standards library
steps:
1. Register kebab → New ingestion task…: name, destination, assignees, defaults; Create.
2. Open the task sheet; Open folder ↗.
expected: a sub-folder of the ingestion library is created and linked; the assignees get a Teams card; the sheet shows the destination, assignees and status chip

### UAT-DOC-063 — Fill the grid
persona: author
modules: docs/ingestionScreen.ts docs/ingestionDraft.ts docs/ingestionModel.ts
preconditions: an open task you are assigned to with three files in its folder
steps:
1. Refresh; read the ✱ required columns and the ⚠ marks.
2. Edit cells; Fill blanks from defaults; Set for selected… on two rows; Save.
expected: the header and every row share one set of column widths (no drift between rows); required cells drive the ✓/⚠ mark and its tooltip — a Management of change column is required only when SharePoint marks it so; the MoC cell shows its records as "MOC-12, MOC-14" and opens the records editor, never raw JSON; dirty cells and rows are marked until Save; Save writes the values to the ingestion items and the marks turn ✓; the Run button is greyed until every file is ready and saved

### UAT-DOC-064 — Edit a task without losing its people
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionStore.ts
preconditions: an open task with assignees
steps:
1. Edit task… → change the name; Save.
2. Reopen the task.
expected: the name changes and the assignees, defaults and log are intact; a stale copy is never saved over a newer one

### UAT-DOC-065 — Status on landing
persona: controller
modules: docs/ingestionScreen.ts docs/model.ts
preconditions: the status column in the grid; one file marked Approved, one Superseded, one Draft
steps:
1. Run ingestion for the three.
2. Open each in the destination.
expected: Approved and Superseded land as published majors with that status; Draft lands as a minor with the draft status; each file's version comment names the ingestion

### UAT-DOC-066 — Flag a file during ingestion
persona: author
modules: docs/ingestionScreen.ts docs/docFlags.ts
preconditions: an open task with a file
steps:
1. In the "Flag for review" column (after the name column), "⚑ Flag…"; pick a level and comment.
2. Run the ingestion for that file; open it in the destination.
expected: the pill shows in the column with the flagger and comment in its tooltip; the controllers get the card; after landing the flag is on the destination document with "raised in ingestion"

### UAT-DOC-067 — Refusals are honest
persona: controller
modules: docs/ingestionScreen.ts
preconditions: a file whose name already exists in the destination; a file whose document id is already used
steps:
1. Run ingestion including both.
expected: each is refused with the reason in its ⚠ tooltip and the run log; the other files land; nothing half-moves

### UAT-DOC-068 — Message assignees and close the task
persona: controller
modules: docs/ingestionScreen.ts
preconditions: an open task whose files have all moved
steps:
1. Message assignees… → send a note.
2. Close task…
expected: each assignee gets the Teams card; the task closes with its log, leaves the open lists and the badge, and reopens from Settings if needed

## Journey 10 — Health and the term store

### UAT-DOC-069 — Document control health
persona: controller
modules: docs/healthReport.ts docs/model.ts
preconditions: documents with a missing owner, a missing status, an overdue review, no tags, a review date the app cannot read
steps:
1. Register kebab → Document control health…
2. Expand each finding; click a document.
expected: each finding lists its documents with a reason and the fix; a review date the feed renders in the site's locale ("17/08/2027" on an Australian site) is read as a date, so "Review date unreadable" fires only for a value that is not a date at all; the CSV's "Review source" column says whether each date came from the feed or was read from the text; a document opens from the report; the summary counts clean documents

### UAT-DOC-070 — People findings: leavers, outside the group, replace a person
persona: controller
modules: docs/healthReport.ts docs/roleReassign.ts docs/accessGates.ts
preconditions: a document naming a person who left the directory; an owner outside the owners & approvers group
steps:
1. Health → the people findings: "Add X to the group" on the outsider; "Replace X…" on the leaver with a successor.
2. Teams digest to controllers; Export CSV.
expected: Add puts the person in the group and the finding clears on refresh; Replace rewrites the role on every listed document; the digest card reaches the controllers; the CSV carries a People column; a directory lookup that failed is reported as "Not checked", never as absent

### UAT-DOC-071 — Organisation term sync and the drift report
persona: superadmin
modules: docs/orgSync.ts docs/termAlign.ts docs/termWrite.ts docs/settingsTab.ts
preconditions: Settings → Organisation with sites under companies; the Organisation term set bound
steps:
1. Settings → Documents → Term store → Load drift report.
2. Read matched / to create / orphans; Apply.
3. Change a department name in Settings → Organisation; Save; reload the drift report.
expected: the walk reads the whole set (never a cut-short walk); companies are top-level terms when the set starts at company level; ampersand and dash variants match; the rename is written through to the term; orphans offer Leave / Retire / "This is…"

### UAT-DOC-072 — Process area sync
persona: superadmin
modules: docs/processSync.ts processes/settingsTab.ts
preconditions: the process model with a type, areas and processes; the Process area set bound
steps:
1. Settings → Documents → Term store → Load process drift report → Apply.
2. Archive a process node; reload the report.
expected: every node is a term in order; local names ride as synonyms; an archived node's term is retired, never deleted

## Journey 11 — Settings → Documents

### UAT-DOC-073 — Connection and libraries
persona: superadmin
modules: docs/settingsTab.ts docs/docsStore.ts
preconditions: the SharePoint site url known
steps:
1. Settings → Documents → SharePoint connection: test it.
2. Libraries: discover; expose a library as Standard; set its title; Save.
expected: the test reports the site and the groups it can read; a newly exposed library appears as a register tile with the site columns it carries ticked

### UAT-DOC-074 — Document columns and roles
persona: superadmin
modules: docs/settingsTab.ts docs/model.ts
preconditions: the site columns created in SharePoint
steps:
1. Document columns: map each role; set a label; reorder by drag; Save.
2. Open a document's details.
expected: every role maps to one column and the duplicate-role check refuses a second; labels and order are what the viewer and the add form show

### UAT-DOC-075 — Lifecycle mapping and review cadence
persona: superadmin
modules: docs/settingsTab.ts docs/model.ts
preconditions: the Status term set with one term per stage
steps:
1. Lifecycle: map each stage to its term; Save.
2. Review cadence: set months per importance term; Save.
expected: the lifecycle commands appear on documents according to their status; a document's next review date follows the cadence of its importance on approval and Mark reviewed

### UAT-DOC-076 — Default filters, write access and the move road
persona: superadmin
modules: docs/settingsTab.ts docs/writeProbe.ts docs/moveProbe.ts
preconditions: Settings → Documents open
steps:
1. Default filters: set a default organisation; Save; open the register as a reader.
2. Write access: run the probe. Move road: run the probe.
expected: the reader's register opens on the default organisation; each probe reports what it tried and what SharePoint answered, in plain words

### UAT-DOC-077 — Access control groups
persona: superadmin
modules: docs/settingsTab.ts docs/accessGates.ts store/accessGroup.ts
preconditions: the controllers and owners & approvers groups exist
steps:
1. Settings → Documents → the groups: pick each; Save.
2. Sign in as a controller; as a plain owner.
expected: the controller sees the controller-only kebab items (Tag proposals, Document flags, health, ingestion); the owner outside the group cannot approve; a group that cannot be read is reported, never assumed empty

### UAT-DOC-081 — Documents health check from the kebab
persona: controller
modules: docs/docsScreen.ts health/entry.ts
preconditions: Documents health checks enabled for the site (Settings → Health checks)
steps:
1. Register kebab → "Health check…"; keep the site in the picker; run and submit.
expected: the item shows for controllers only; the check is scoped to the site; the full behaviour is in the Health checks script

## Journey 12 — Boards and links

### UAT-DOC-078 — Documentation & links card
persona: owner
modules: controls/LinksCard/editor.ts improvement/workingFolder.ts
preconditions: an initiative board with a Documentation & links card and a working folder set
steps:
1. On the card, expand a sub-folder; open a file.
2. Add a link; remove it.
expected: sub-folders expand in place with carets; files open in SharePoint; links save on the board and the register's "n links" follows when the card is bound to a document

### UAT-DOC-079 — Document cards on a board
persona: owner
modules: docs/docsCards.ts
preconditions: a ritual board with a Document health card and a Standard documents card
steps:
1. Open the board; read both cards.
2. Click a row on the health card.
expected: the health card shows the same task rows as Document tasks for that scope; the documents card lists the configured documents; a click opens the document in the viewer

### UAT-DOC-080 — The Documents panel resizes
persona: reader
modules: docs/docsScreen.ts docs/views.ts
preconditions: the register open on a desktop
steps:
1. Drag the panel's right edge narrower, then wider.
2. Reload.
expected: the Folders pane follows the drag between its limits, labels wrap instead of clipping, and the width is remembered
