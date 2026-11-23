# Documents

Personas: reader (any signed-in person), author (contributes to a working library), owner (named owner of a standard), reviewer, approver, controller (document controllers group), superadmin, team (an end-to-end flow run by several people on their own devices — each step names who acts). The production test site needs: two exposed standards libraries and one working library with the site columns mapped (status, owner, approvers, reviewers, revision editors, next review date, importance, document id, organisation, process area, tags, linked documents, management of change), the ingestion library, the three groups, the Organisation / Process / Status / Tags term sets, and a handful of documents in each lifecycle stage.

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
1. Open a library; watch the Document tasks button while the page loads.
2. Read the status line under the toolbar; hover it.
expected: the Document tasks button reads "Document tasks · …" with a small spinner until the count arrives, then the count; "N documents of M" with "loaded in … · feed … · opened in …" for a super admin only; the tooltip lists every load with its trigger; a plain user sees the count alone

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
expected: a reader lands with it ticked; a document controller or super admin lands with it unticked (every status); ticked, the register hides drafts, superseded and obsolete documents and the Status group explains itself instead of filtering; a document that leaves the approved stage while ticked (superseded, obsoleted) drops from the list at once with a status line; unticked, every stage shows and Status can be filtered; the choice is remembered for the view

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
expected: opening the view paints the register with its filters (never a blank register — a view that cannot be applied falls back to the plain register with a line saying why); the title reads "View · name" only while the register still matches the view — clear a filter or click a folder and the title returns to the scope with the crumb "from the view “name” · edited" (Update and Close stay in the Views menu); the site view is listed under "Site views" for the reader, who can pick but not change it; Rename and Delete are labelled on the row, Delete asks first, and the controller's update, rename and delete take effect for everyone

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
expected: the id chip, status chip and the section headings match the library's column sections; dates read in the app's format; owner & approver collapse to one row when they are the same person; the review date's hint reads "in 9 months · every 12 months from the effective date (set by Importance: High)"; Organisation and Process area show the whole path ("Bell Bay › Casting"), the leaf alone only while the term walk loads or when two terms share the name

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
2. Click one link; from there click one of ITS links; click "‹ Back to …" twice.
3. Back on the first document, click "Show these in the register".
expected: the links are grouped by relationship; a click switches the viewer to the linked document and its header gains "‹ Back to <the first document>", which walks the trail back one step at a time; Esc still closes; opening a document from the register starts a fresh trail; "Show these" scopes the register to exactly those documents with the chip "Linked to: X", every other filter cleared; the chip's × restores the register

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
1. Open the working library → Add document → By upload → choose the file from your device (the upload folder stays as the second road where one is configured).
2. Leave a required field (the ones with a small red asterisk) empty; read the Add button and hover it.
3. Fill it; Add.
4. (Controller) Make a library column required that is not in the site dictionary; open Add document again.
5. (Controller) Make a dictionary column required through the library's CONTENT TYPE (not the column itself); open Add document again.
expected: the device file goes straight into the library byte-exact (a name already in the library is refused before the upload); a Word, Excel or PowerPoint file is accepted when SharePoint's stored copy differs slightly in size (SharePoint writes the properties into Office files — within 10% or 256 KB), every other type must land at the exact size; Approval status is not a form field — the document lands as a Draft, the lifecycle moves it from there; every required column carries a small red superscript asterisk on its label (no "REQUIRED" word); while one is empty the Add button is disabled and its tooltip reads "Still needed: Owner, Importance", and it enables as they are filled — nothing is written under the button; the document then lands in the library with its properties and opens in the viewer, with the status line saying it was added as a draft, shows when "Show only approved" is unticked, and is submitted for review from its ⋯ menu; in step 4 the form names the library-required column it cannot collect and refuses before creating anything (no checked-out orphan); in step 5 the content-type-required column is marked and held like any other

### UAT-DOC-026 — Add refuses a duplicate name and a duplicate document id
persona: author
modules: docs/addDocument.ts docs/model.ts docs/editProperties.ts docs/ingestionScreen.ts
preconditions: an existing document name and document id in the library; a second standards library carrying a document id
steps:
1. Add document with the same file name.
2. Add document with a different name but the same document id.
3. Add document to the second library with a document id used in the first.
expected: all three are refused before anything is written, each with a plain reason naming the clash ("A document named “X” already exists in this library — last modified by … on …" / "Document ID “X” is already used by “name” in <library>"); the check spans every standards library; a check that could NOT be made (SharePoint refuses the lookup — for example a library past 5,000 items whose Document ID column is not indexed) stops the Add with "The document ID could not be checked in <library> — …" and nothing is created; Edit properties and an ingestion run refuse the same way; a library the person may not read is skipped

### UAT-DOC-027 — Edit properties
persona: owner
modules: docs/editProperties.ts docs/fieldEditors.ts
preconditions: a draft standard you own
steps:
1. Open the document → ⋯ → Edit properties…
2. Change a text field, a date, a taxonomy field and a person field; read the line under Importance.
3. Clear a required field; read the Save button and hover it; refill it; Save.
4. Edit again; change the document id to one another document carries; Save.
expected: Approval status is not in the form (Submit / Approve / Retire move it); the dialog's footer stays pinned while the body scrolls; each editor fits its column type; under Importance a line reads "Sets the review cadence — High: every 12 months. Next review 17 Aug 2027, counted from the effective date 17 Aug 2026." and updates as Importance changes, with a read-only "Next review date · Derived" row beneath it; with a required field empty Save is disabled and its tooltip names it ("Still needed: Owner"); Save then writes the values and the details pane shows them without reopening; the duplicate document id is refused with the clashing document named, and the unchanged id is never re-checked

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
expected: each record is two lines (number and link, then what changed) and not cramped; a scheme-less link is accepted; the register cell shows the records as chips and the details pane shows one row per record — the number linking out, what changed, and the date

### UAT-DOC-030 — Linked documents editor
persona: owner
modules: docs/linksEditor.ts docs/editProperties.ts
preconditions: the linked-documents column mapped; another document to link to
steps:
1. Edit properties → Linked documents → "＋ Link a document…". Read the area that opens. Choose a Relationship, then type part of a document's name in the search under it; use ↓ and Enter to pick. Add a second link.
2. Type a name nothing matches; then press Escape with the list open.
3. Remove a link; Save.
expected: the area opens with a "Relationship" choice FIRST (Parent / Related / Child, Related chosen; hovering the label says what it means), then a "Document" search the full width of the form; typing shows a list floating under the box with "Searching…" at once, then the matches, each with its name and beneath it the library and document ID; the list has its own scroll and does not push the form taller; ↑ ↓ move, Enter picks (never the form's Save), Escape closes the list and not the form; a name nothing matches reads "No documents match"; a library that could not be searched is named ("Could not search <library>."); picking adds the link and folds the area away; the picker finds documents across the exposed libraries; two links save; the relationship is stored; the viewer's Linked documents section and the "n links" register cell follow. On a library whose Linked documents column is still a single line of text, the editor warns above the links and Save with two links is refused before anything is written, naming the column and the fix (multiple lines of text); Settings → Documents → Document columns carries the same warning on that column

### UAT-DOC-031 — Check out, check in, discard
persona: owner
modules: docs/lifecycleCmds.ts docs/docsScreen.ts
preconditions: a draft standard you own, not checked out
steps:
1. Open it → Check out.
2. Read the register row and the Document tasks panel.
3. Check in… with a comment (the Comment label carries the red asterisk — its tooltip says the comment is the version's audit entry — and BOTH check-in buttons are disabled until it is written); then check out again and Discard check-out.
4. With a second person: they check the document out; WITHOUT refreshing, click Check out on your own stale view of it.
expected: step 4 a notice titled "Checked out to <their name>" reads "Ask them to check it in. A document controller can discard their check-out." with Close only, and behind it the panel and the register row now show the lock and their name, the Check out button gone; the row shows the lock and your name; "Checked out to you" lists it in Document tasks; Check in writes a minor version with the comment (the library must keep major AND minor versions — Settings → Documents warns on a library that keeps majors only); Discard releases it without a version; after an approval the published major's card carries the step's comment, or "published from v1.1 “…”" when the forms engine had to publish it

### UAT-DOC-032 — Replace content
persona: owner
modules: docs/replaceContent.ts docs/lifecycleCmds.ts
preconditions: a draft standard you own; a new file
steps:
1. Open it → ⋯ → Replace content…; choose a file of the same type from your device; Replace content.
2. Check in… with a comment.
expected: the file goes over the document IN PLACE (the connector's Update file, bytes declared binary): the record keeps its id, every property, its links, favourites, flags and its history, and the new content sits on top as a version; a file of another type is refused before anything is sent; the dialog checks what landed and refuses to close on a mismatch — the record must be the same one and SharePoint must show it modified by this upload; a Word, Excel or PowerPoint file may land slightly larger or smaller than it was sent (SharePoint writes the document's properties into the file — within 10% or 256 KB is accepted, never "landed wrong"), every other type must land at the exact size; the document stays checked out to you; the check-in writes a minor version with the comment; the viewer reopens on the new content; a file over 100 MB (the connector's ceiling) is refused with "Replace it in SharePoint ↗" named, which stays as the second road

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
preconditions: a draft standard you own (status Draft — on a document in review or later the one-flow button is rightly absent and the dialog says why), checked out to you
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
2. Read the panel's card again without closing it; close and reopen the document.
3. Read the versions.
expected: a minor version with the comment "Review complete by <you>"; the owner gets a Teams card; the card repaints at once: the "Review complete" button is gone and in its place the card reads "✓ You completed your review on <date>", with "Waiting on <names>" while other reviewers are outstanding (or "Every review is complete." when none are); reopening the document shows the same, never the button again; a reviewer who has NOT finished still sees "Awaiting your review" and the solid Review complete button

### UAT-DOC-036 — Submit for approval warns while reviewers are outstanding
persona: owner
modules: docs/model.ts docs/docsScreen.ts
preconditions: a standard in review with one reviewer done and one not
steps:
1. Open it → Submit for approval.
2. Cancel at the warning; then run it again and confirm.
expected: while a review is outstanding the card reads "In review" with "Waiting on <name>" and "Submit for approval" is an OUTLINE button on the card (not the solid one); the warning names the reviewer who has not marked review complete; Cancel leaves the document untouched; Confirm proceeds to awaiting approval and the approvers' card goes; on a document whose reviewers have ALL finished the card reads "Every review is complete." and "Submit for approval" is the one solid button, with no warning

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
4. Open Details → Versions on the cancelled document; expand the newest card.
expected: the last approved major's content and status come back as a NEW major (v3.0 restored lands as v4.0 with the comment "Revision cancelled — restored v3.0"), published where content approval is on; the draft versions stay in history; step 4 the restored version's card shows “Revision cancelled — restored v3.0” under its label (never "No comment", and never "published from" one of the cancelled drafts), its folded line counts "n cancelled drafts", and each draft of the abandoned revision reads "cancelled" where it used to read "draft"; the audit view names the step "Revision cancelled"; your own check-out is discarded first; another person's check-out refuses with their name

### UAT-DOC-041 — Supersede and obsolete
persona: controller
modules: docs/lifecycleCmds.ts docs/model.ts
preconditions: two approved standards
steps:
1. On one: ⋯ → Supersede…; search and pick the other as "Superseded by" (required); confirm.
2. On another approved standard: ⋯ → Make obsolete…
expected: "Superseded by" is the same type-ahead as Link a document (a floating list, "Searching…", name with library and document ID beneath, "No standards match", ↑ ↓ Enter Escape); the picked standard shows as a chip with ✕ and the search steps aside; the superseded document carries the mapped status, a "Superseded by" link to its successor in its Linked documents and the comment "Superseded by “<name>”"; the successor's pane lists it under "Supersedes" (derived); the obsolete one carries its status; both leave the approved-only register and show when "Show only approved" is unticked

### UAT-DOC-042 — The notify panel: Teams and email, people chips
persona: owner
modules: docs/notifyPanel.ts docs/notify.ts docs/notifyModel.ts
preconditions: a lifecycle step whose panel asks before sending (Submit for approval)
steps:
1. Run the step; in the panel remove one recipient chip, add a note, choose Teams.
2. Run another step and choose Email.
expected: the panel says "Nothing has been sent yet" above the chips; the chips show who hears and why; the removed person gets nothing; "Add a person…" finds someone in the directory and adds a chip; the note rides the card; "Send on Teams" / "Send by email" — the email arrives with the link; a refused send is reported with its reason, never silently

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
1. Document tasks → Edit-access requests: read the request before deciding.
2. Approve.
3. On a second request: Decline with a reason.
expected: each request is a card — the document name in full, who asked and when, the library, and the whole reason — with Open document, Approve… and Decline… beneath; the panel is wider while requests are listed; nothing is read for the first time inside the Approve dialog; Approve adds the person to the revision editors and the requester's card says so; Decline carries the reason; both leave the queue; the requester's "Your access requests" shows the outcome

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
expected: the dialog names who will hear (the owner by name); a comment is required; the flag is written and the owner gets a Teams card quoting the comment with an "Open in LeanBoard" link; the owners are read fresh even when the register row never fetched them; flagging a document you own yourself raises the flag and says it sits in your Document tasks under Flags, with no Teams error (Teams cannot chat with yourself); a card to two or more people starts a group chat whose topic is the subject with its colon turned into a dash and the quotes stripped ("Flagged for review – <name>") — Teams refuses a colon in a topic, and the send no longer fails on it; "choose an image" offers JPG, PNG, GIF and WebP; a HEIC photo dragged in is refused under the box with "HEIC photos can't be shown here: <name>. Use a JPG or PNG, or paste a screenshot."; any other file that is not an image reads "That file is not an image: <name>"; a good image clears the line

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
expected: the queue lists every open flag with its screenshot — for a controller with a site on their person row, their own site's flags and those on documents with no Organisation unit (UAT-DOC-102); Open document opens the overlay; Close asks for a note and records who closed it; the Settings button opens the same queue

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
1. Register kebab → New ingestion task…: name, destination, read the Site select (your own site preselected; "Any site" available), assignees, defaults — set the Status default to Approved; Create.
2. Open the task sheet; Open folder ↗.
expected: Task defaults offers the Status column under its heading (it is set by hand in ingestion only — the documents arrive with their history); with a site chosen the Organisation unit default cascades from that site's term and the Process area default from the site's own tree, nothing beyond them; a sub-folder of the ingestion library is created and linked; the assignees get a Teams card; the sheet's meta line reads "→ library · <site> only · …" and shows the assignees and status chip

### UAT-DOC-063 — Fill the grid
persona: author
modules: docs/ingestionScreen.ts docs/ingestionDraft.ts docs/ingestionModel.ts
preconditions: an open task you are assigned to with three files in its folder, two of them inside a sub-folder "Policies/2024"
steps:
1. Refresh; read the ✱ required columns and the ⚠ marks; read the Document column.
2. Edit cells, including a Status cell from Draft to Approved; Fill blanks from defaults; Set for selected… on two rows, once with the Status column; Save.
3. Tick the checkbox on the "Policies › 2024" group row; Set for selected…; untick it.
expected: the two nested files are listed with a muted "Policies › 2024" line under the name (read-only, the tooltip says the file lands flat) and sit under a group row "Policies › 2024 · 2 files · Open ↗" after the "Task folder" group; the group's checkbox selects exactly its files for Set for selected… and clears them again; sorting by another column drops the group rows and keeps the path lines; the Status cell and Set for selected… both offer the status editor (never "no editable columns configured"); on a task constrained to a site the Organisation unit and Process area cells and Set for selected… cascade from that site's branch only (the site itself is a valid pick), while an "Any site" task offers the whole sets; the header and every row share one set of column widths (no drift between rows); required cells drive the ✓/⚠ mark and its tooltip — a Management of change column is required only when SharePoint marks it so; the MoC cell shows its records as "MOC-12, MOC-14" and opens the records editor, never raw JSON; dirty cells and rows are marked until Save; emptying a text, choice or date cell that held a value, or Clear in a term / people popover, marks the cell dirty reading "—" and Save clears the value in SharePoint (a blank over a blank is nothing; the name never clears); Save writes the values to the ingestion items and the marks turn ✓; the Run button is greyed until every file is ready and saved

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
preconditions: a file whose name already exists in the destination; a file whose document id is already used; on a task constrained to a site, a file whose Organisation unit was set to another site's department in SharePoint's grid view; two files with the same name in different sub-folders of the task
steps:
1. Read the two same-named files' ⚠ marks and the Run button; rename one with Name on ingestion and Save.
2. Run ingestion including the other three.
expected: before the rename both same-named files read ⚠ "Missing: a unique name — another file in this task has the same name…", the status line counts "2 share a name" and Run is greyed; after the rename both are ✓; in the run each of the three is refused with the reason in its ⚠ tooltip and the run log — the third reads "Organisation unit "X" is outside this task's site (Y)"; the other files land flat in the destination (no sub-folder is created there); nothing half-moves

### UAT-DOC-095 — A run that is cut short keeps what it learned
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionRun.ts docs/ingestionStore.ts docs/ingestionModel.ts
preconditions: an open task with fifteen or more ready files, two of which will be refused (one whose document ID is already used in the destination, one tagged outside the task's site, or similar — NOT a name clash, which UAT-DOC-097 covers)
steps:
1. Press Run ingestion… and Run. While the bar moves, read the chip beside the task's name, the line under the hint, and the buttons. Click a cell in the grid. Press Esc and ✕.
2. About ten seconds in, close the browser tab (not the task window).
3. Open the app again within two minutes, open Ingestion tasks, read the task's pill; open the task and read the chip and the line under the hint.
4. Wait three minutes with the task open (it re-reads itself). Read the chip, the line, the Run button and the ⚠ marks of the two refused files.
5. Press Run ingestion… and Run. Read the status line when it ends.
expected: step 1 the chip reads "◐ Running"; a line reads "A run is in progress. Files cannot be added or changed until it finishes."; Edit task…, End task…, Open folder, Set for selected…, Fill blanks from defaults, Upload sheet… and Save changes are dimmed and do nothing; no cell opens for editing though the grid still scrolls; Esc and ✕ do not close the window; step 3 the pill reads "◐ Running", the chip "◐ Running — <your name>" and the line "<your name> is running this task (started <time>). Files cannot be added or changed until it finishes." — the app cannot yet know the run died; step 4 within about three minutes of the tab closing the chip returns to "● Open", the line reads "The last run stopped before it finished (<your name>, last active <time>). Files it had not reached are still here.", Run ingestion… is offered again, and each refused file's ⚠ tooltip carries "Last run: <its reason>" — the reasons were saved as they happened, not at the end; files already moved are gone from the folder; step 5 the run finishes with "Run finished — n moved · 2 refused. Refused files stay here with the reason on the glyph." and the task reads Open

### UAT-DOC-096 — One run at a time
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionRun.ts docs/ingestionStore.ts docs/docsScreen.ts
preconditions: two document controllers at two computers; an open task with thirty or more ready files, so a run lasts a minute or more; a second open task with one ready file
steps:
1. Controller A opens the first task and runs it.
2. While it runs, controller B opens Ingestion tasks and reads the pill; opens the task; reads the chip, the line under the hint and the buttons; clicks a cell; presses Run ingestion…, End task… and Edit task….
3. B keeps the task open and watches the grid.
4. When A's run ends, B reads the chip, the line and the buttons (allow twenty seconds).
5. On the second task, A and B each open it, press Run ingestion… and then press Run in the confirmation as close to together as they can.
6. On a task A is running, B opens Edit task… from another route if one is open to them (the editor left open from before the run) and presses Save, then Cancel task….
expected: step 2 the pill reads "◐ Running"; the chip "◐ Running — <A's name>"; the line "<A's name> is running this task (started <time>). Files cannot be added or changed until it finishes."; Run ingestion…, End task…, Edit task…, Open folder and the grid's edit buttons are dimmed and do nothing, and no cell opens; step 3 files leave B's grid as A's run moves them, without B pressing Refresh; step 4 the chip returns to "● Open", the line goes and the buttons work; the refused files show A's reasons; step 5 exactly ONE run goes on — the other controller reads either "<name> is running this task — wait for it to finish." or "<name> started a run on this task a moment ago. This run stood down and ingested nothing."; the file is ingested once and the log carries one "moved" for it; step 6 the editor refuses both with "<A's name> is running this task — wait for it to finish."

### UAT-DOC-097 — Copies a stopped run left behind are named before the next run
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionRun.ts
preconditions: an open task with three ready files; a copy of ONE of them already in the destination library's top folder under the same name (copy it there by hand, or use a draft an interrupted run left); a second task with twenty or more ready files; rights to add a file to that task's folder in SharePoint directly
steps:
1. On the first task press Run ingestion…; read the confirmation; Cancel.
2. In the destination, delete the copy (or discard its check-out). Press Run ingestion… again; read the confirmation; Run; read the status line.
3. Run the second task. While it runs, add one more file to its folder from SharePoint itself (the task's own Open folder is held). Read the status line when the run ends.
expected: step 1 the confirmation carries "1 file already has a copy in <library>, probably from a run that stopped: <file name>. Discard that draft there first, or it will be refused."; step 2 the sentence is gone; the run ends "Run finished — 3 moved. Every file has moved — End task when the batch is complete."; step 3 the line ends "1 file was added to the folder during the run and was not ingested."; that file is in the grid, waiting for the next run

### UAT-DOC-098 — Closed ingestion tasks keep their logs
persona: controller
modules: docs/docsScreen.ts docs/ingestionModel.ts docs/ingestionScreen.ts
preconditions: one open ingestion task and at least one task you have ended (End task…) whose run moved and refused files; a person who was an assignee on one closed task only
steps:
1. Documents → Ingestion tasks. Read the button's label and the panel.
2. Click "▸ Closed tasks (n)". Read a row. Click it.
3. End your last open task. Read the Ingestion tasks button.
4. As the assignee, open Ingestion tasks.
expected: step 1 the button counts OPEN tasks only ("Ingestion tasks · 1"); the panel lists "Open tasks (1)" and, under it, a collapsed heading "▸ Closed tasks (n)"; step 2 the heading opens to the closed tasks, most recently ended first, each with a green "✓ Closed" pill, the task's name and "→ <library> · ended <date>"; more than twenty show the first twenty and "Show all n"; a row opens the task's sheet, which reads "This task is closed — its log is below." with the run log, a "▶ Run started (name, time)" line for each run; step 3 with no open task the button stays, reading "Ingestion tasks" with no count, so the closed tasks can still be reached; step 4 the assignee sees only the closed tasks they were assigned or created

### UAT-DOC-099 — A term renamed after a file was tagged
persona: controller
modules: docs/rows.ts docs/ingestionModel.ts docs/ingestionScreen.ts
preconditions: an open ingestion task with a file tagged with a Document type (or another term column); rights to rename that term in the term manager
steps:
1. Open the task and read the file's Document type cell.
2. In the term manager, rename that term. Return to the task and press ↻ Refresh. Read the cell.
3. Click the cell. Read the picker. Cancel.
4. Read the file's row and the Save changes button.
expected: step 2 the cell shows the term's NEW name (SharePoint's own stored label may lag — the grid reads the term by its id); step 3 the picker opens with the renamed term SELECTED, not empty; step 4 the row is not marked changed and Save changes stays disabled — nothing needs setting again; a file whose term was deleted from the set keeps showing its stored label

### UAT-DOC-100 — A throttled run waits and retries
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionRun.ts
preconditions: an open ingestion task with two hundred or more ready files (the size that has throttled before), on a TEST destination
steps:
1. Run the task. Watch the progress bar's pace.
2. When it ends, read the status line and hover the ⚠ of any refused file.
expected: the run finishes; if SharePoint throttled it, the bar slows for a few seconds at a time (a throttled call waits 2, 5 then 10 seconds and is tried again) and the rest of the run goes four files at a time, not eight; no refusal reads as a raw "429" or "TooManyRequests" — a file still throttled after every try reads "SharePoint is busy. Run again in a few minutes." and is still in the folder; a file that failed for any other reason keeps its own reason and was not retried

### UAT-DOC-068 — Message assignees and end the task
persona: controller
modules: docs/ingestionScreen.ts
preconditions: an open task with at least one assignee who is not you, whose files have all moved; a second open task with files left in two sub-folders
steps:
1. Message assignees… → read the recipients, type a note, Send.
2. End task… (the header button; the ✕ only closes the window and says so in its tooltip)
expected: a dialog lists every assignee (you marked as not messaged — Teams refuses a chat with yourself) with a note box; Send shows the outcome in the dialog ("Teams message sent to …" or the refusal) and each other assignee gets the card with your note quoted under it; with you as the only assignee the dialog says so and Send is disabled; End task… confirms with the count of files not yet ingested, then the task closes with its log, leaves the open lists and the badge, and reopens from Settings if needed; on the second task End task… counts the FILES "(in 2 sub-folders)", not the folders, and Cancel task… in the task editor counts the same way

### UAT-DOC-087 — Export the grid as a spreadsheet
persona: author
modules: docs/ingestionScreen.ts docs/sheetRoundTrip.ts docs/xlsx.ts
preconditions: an open task you are assigned to with files in its folder, some details saved; the owners & approvers group linked
steps:
1. Edit a cell without saving; Export sheet.
2. Save (or Discard); Export sheet; open the workbook in Excel.
expected: with unsaved changes the export is refused with "Save or discard your changes first"; otherwise a workbook `ingestion-<task>-<date>.xlsx` downloads; its Files sheet has one row per file, in folder-then-name order, with a LOCKED Folder column first ("Plans › 2024", blank at the root — Excel refuses to type in it, the guidance says it is for reference), a locked Open column whose "Open ↗" link opens that file in the browser (the Office web app or the PDF viewer), then Name on ingestion and every grid column (the MoC column left out); every other cell edits freely and rows can be added, deleted, sorted and filtered (the sheet is protected only on the id and Folder columns), term cells as full paths ("Pechey › Bell Bay › Casting"), people as "Name <email>", dates as real Excel dates shown yyyy-mm-dd, required columns marked ✱; under the header a muted guidance row says how to fill each column ("Required. One term as its full path — use the dropdown…", "A date — type yyyy-mm-dd or pick a date…"); the header, guidance and key rows are frozen; typing "Nov 3" into a date cell is refused by Excel, a typed date shows as yyyy-mm-dd; column A and row 2 are hidden keys; the Values sheet lists every term path, choice and the owners & approvers pool per column — on a task constrained to a site, the Organisation unit and Process area paths are that site's branch only, starting at the site; a single-value term, choice or owner cell offers an Excel dropdown of those values and refuses a typed value outside them

### UAT-DOC-088 — Upload an edited spreadsheet
persona: author
modules: docs/ingestionScreen.ts docs/sheetRoundTrip.ts docs/xlsx.ts docs/ingestionDraft.ts
preconditions: the workbook from DOC-087
steps:
1. In Excel: change a status from the dropdown, pick an owner, type a term's leaf label ("Casting") in another file's organisation cell by pasting over the validation, empty a title cell, rename a file in Name on ingestion, try to type into a Folder cell (refused — then unprotect the sheet from the Review tab and change one), type "Nov 3" in a date cell, and delete a file's row; save.
2. Upload sheet… → drop or choose the workbook; read the report; Apply to grid; Save changes.
expected: the report says how many cells on how many files change and lists each problem with its Excel row, file, column, value and reason — the leaf label says to use the full path, "Nov 3" says yyyy-mm-dd — a Folder cell changed after unprotecting is ignored without a problem line, and the deleted row's file is simply untouched; Apply marks the changed cells dirty in the grid (the emptied title reads "—"), leaves the problem cells as they were, and the status line counts the problems; Save writes the changes, renames the file, and clears the title in SharePoint; uploading the untouched export reports "0 cells on 0 files to change" with Apply greyed; a workbook that is not this task's export is refused with a message, nothing applied

### UAT-DOC-090 — A nested drop lists and lands flat
persona: controller
modules: docs/ingestionScreen.ts docs/ingestionModel.ts docs/rows.ts
preconditions: an open task; in SharePoint, a folder tree dropped into its folder — files at the root, in "Policies", in "Policies/2024" and in "Archive/2019"; one file renamed in the grid
steps:
1. Refresh the task; read the status line and the grid.
2. Rename a nested file with Name on ingestion; Save; check the file in SharePoint.
3. Scroll down to a sub-folder's group row; tick its checkbox; tick one more file by its own box; then Set every required detail for the selection; Run.
4. End task.
expected: every file at every depth is listed — the status line reads "n files in 3 sub-folders · …"; the grid groups them under Task folder, Archive › 2019, Policies, Policies › 2024 with the path under each nested name; the renamed file keeps its place in its sub-folder (it does not move to the task root); ticking the group box ticks every file in the group and the list STAYS where it was scrolled (no jump to the top — Ellen Black's 2026-11-02 report), the count reads "n selected", and the header's select-all box follows the ticks; the run copies every file into the destination library's ROOT with no sub-folder created, the sources are recycled and the emptied sub-folders stay; End task counts 0 files and removes the folder with its empty sub-folders

## Journey 10 — Health and the term store

### UAT-DOC-086 — The owners & approvers group from the register
persona: controller
modules: docs/groupMembers.ts docs/docsScreen.ts store/accessGroup.ts
preconditions: the owners & approvers group linked (Settings → Access control); you own it in Entra (a super admin added you to Document controllers); someone in the directory who is not in the group
steps:
1. Register kebab → Owners & approvers group…; read the ownership line and the members.
2. Search the directory for the person; ＋ Add.
3. Open Edit properties on a standard and search the Owner picker for them.
4. Back in the dialog, Remove them; confirm.
expected: the dialog says you own the group and lists its members with mail; the add lands with a tick and the person is at once offered by the owner and approver pickers (no reload); Remove asks first and names what they lose; a controller who does NOT own the group sees the members only, with a line saying who can make them an owner

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
preconditions: at least one site with its own process tree (Settings → Processes) and a central type that still carries retired local names; the Process area set bound
steps:
1. Settings → Documents → Term store → Load process drift report → Apply.
2. Archive a process node in a site's tree; reload the report.
expected: every SITE node is a term in order under a root term named after the site (the central types do not sync); the old type-rooted terms are listed as orphans and left alone; the synonyms the retired local names once pushed are removed from the central nodes' terms and the nodes' local names clear; an archived node's term is retired, never deleted

### UAT-DOC-089 — Compare documents across sites by process
persona: reader
modules: docs/docsScreen.ts shared/schema/process.ts
preconditions: two sites with process trees whose nodes link to the same central process; a document on each tagged with that site's process term; a Process area column mapped
steps:
1. Register → Filters → the Process area column → "Compare across sites" → pick the central type and process.
expected: the filter chip names the central process; the register shows the documents of BOTH sites tagged with their own linked process terms (and anything beneath them); clearing the chip shows everything again

## Journey 11 — Settings → Documents

### UAT-DOC-073 — Connection and libraries
persona: superadmin
modules: docs/settingsTab.ts docs/docsStore.ts
preconditions: the SharePoint site url known
steps:
1. Settings → Documents → SharePoint connection: test it.
2. Libraries: discover; expose a library as Standard; set its title; Save.
expected: the test reports the site and the groups it can read; a newly exposed library appears as a register tile with the site columns it carries ticked; the library's panel carries Display name, Library type and a "UAT only" tick — and NO "PDF rendition folder" field (removed 2026-11-23: nothing read it)

### UAT-DOC-074 — Document columns and roles
persona: superadmin
modules: docs/settingsTab.ts docs/model.ts
preconditions: the site columns created in SharePoint
steps:
1. Document columns: map each role; set a label; reorder by drag; Save.
2. Open a document's details.
expected: every role maps to one column and the duplicate-role check refuses a second; labels and order are what the viewer and the add form show

### UAT-DOC-092 — A library dropped and exposed again keeps its columns
persona: superadmin
modules: docs/settingsTab.ts docs/model.ts docs/docsStore.ts docs/docsScreen.ts docs/docsCards.ts docs/docSolo.ts
preconditions: two exposed libraries, A and B, sharing mapped columns (labels, roles, a group); B also carrying one column of its own with a label and a place in the default view; documents in B with values in those columns
steps:
1. Settings → Documents → Libraries: untick B; Save. Read Document columns.
2. Tick B again and press Save at once, before its panel has finished "Loading columns…". Close and reopen the app; open Documents on B; open a document's details.
3. Settings → Documents → Libraries: untick B, tick it again, Save, without leaving the page between the two.
4. Open Settings → Documents on a site where a library was saved without its columns (the state step 2 used to leave).
expected: step 1 B's own column leaves the grid and is listed under "Kept for later" with its label, and the shared columns stay mapped; step 2 the register shows B's values in every default column, the details pane names every column by its label (no raw internal names) and B's own column is back in the grid with its label, role, group and default-view cell, off the kept list; step 3 B is still exposed after the save with its type, title and columns as they were; step 4 a note names the library, says its stored columns were out of step and that the list was refreshed, the Save bar is armed, and after Save and a reopen the register and the pane read correctly

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
modules: docs/settingsTab.ts docs/filterModel.ts docs/docsScreen.ts docs/writeProbe.ts docs/moveProbe.ts
preconditions: Settings → Documents open; an Organisation term set with a company level holding two or more top-level terms (a company with several sites, and one other); a reader whose profile names site S of that company and who has never opened Documents in this browser
steps:
1. Default filters: choose site S; read the tick list.
2. Tick ONLY the company that holds S; Save site default; open the register as the reader. Read the Folders pane and the filter chip.
3. Back in Settings: Edit the row; also tick a site under the OTHER top-level term; Save; open the register as the reader in a fresh browser profile.
4. Write access: run the probe. Move road: run the probe.
expected: step 1 the list is a tree — each company or top-level unit in bold with its SITES indented beneath it, no departments; every one can be ticked; step 2 the register opens filtered to S alone (the chip names S, not the company); the pane shows the company with S open to its departments and the company's other sites folded beneath it, one click away; "Show other sites" still reveals the rest; step 3 the extra site sits in the pane folded, after the reader's own; step 4 each probe reports what it tried and what SharePoint answered, in plain words

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

### UAT-DOC-101 — A UAT-only library
persona: superadmin
modules: docs/uatLibraries.ts docs/docsStore.ts docs/settingsTab.ts docs/viewer.ts docs/linksEditor.ts
preconditions: a library exposed for trials, holding a document; an ordinary document that LINKS to that trial document; a UAT run that is running with one tester assigned; a third person who is neither a super admin nor on a running run
steps:
1. Settings → Documents → Libraries → open the trial library's panel → tick "UAT only" (hover it); Save.
2. As the super admin, open Documents.
3. As the assigned tester, open Documents.
4. As the third person: close and reopen the app, open Documents; open the ordinary document and read its Linked documents and the register's links count; open Add document and the Link a document search.
5. Close the UAT run; the tester closes and reopens the app.
expected: step 1 the tick's tooltip says who sees the library and that SharePoint's own permissions are unchanged, and a "UAT" chip sits beside the library's name in the list; steps 2 and 3 the library shows, its name reading "<name> · UAT" on its tile, in the library filter and wherever the name appears; step 4 the library is absent everywhere — no tile, not in the library filter, Add document or any search — and the link to the trial document is hidden entirely: not in Linked documents, not in the derived links, and the "n links" count is one lower; flags, access requests and ingestion tasks for the trial library are not listed either; saving the ordinary document's properties as this person does NOT remove the hidden link (the super admin still sees it); step 5 the tester no longer sees the library. This is the app hiding the library: its SharePoint address still opens for anyone SharePoint allows

### UAT-DOC-102 — A controller sees their own site
persona: controller
modules: docs/siteScope.ts docs/docsScreen.ts docs/healthReport.ts
preconditions: two sites on the Organisation page, each with documents tagged to it (Organisation unit) and one document with NO Organisation unit; an open flag and an edit-access request on a document of each site and on the untagged one; an ingestion task for each site and one with "Any site"; a document controller whose person row names the first site, a controller with no site, and a super admin
steps:
1. As the first site's controller: open Document tasks; register kebab → "Document flags (n)…"; "Show flagged documents"; Ingestion tasks; Document control health…
2. As the controller with no site, and as the super admin: the same.
3. As the first site's controller: have the other site's task assigned to you, and own a flagged document at the other site; reopen Document tasks.
expected: step 1 the flags, the count on the menu, the flagged scope, the access requests and the ingestion tasks are the first site's plus those with no site (the untagged document, the "Any site" task) — nothing of the second site; the health report scans the same documents and says "Showing <site>'s documents, and those with no Organisation unit."; there is no "All sites" switch; step 2 everything, as before; step 3 the task assigned to you and the flag on the document you own show whatever their site. This is what the app shows: a controller's SharePoint rights are unchanged

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

## Journey 13 — End to end, several people

Each case is run by several people, each on their own sign-in and device; the step names who acts. Set the people up first: a reader not named on the standard, its owner, a reviewer, an approver, and a document controller.

### UAT-DOC-082 — A reader's revision, from request to publication
persona: team
modules: docs/accessRequests.ts docs/lifecycleCmds.ts docs/notifyPanel.ts docs/docsScreen.ts
preconditions: an approved standard with an owner, a reviewer and an approver named; a reader not named on it; the Revision editors column mapped
steps:
1. [Reader] Open the standard → "Request edit access…" with a reason.
2. [Owner] Document tasks → the request → Approve & grant; send the card.
3. [Reader] From the card's link: Start revision; Check out & edit; Check in with a comment.
4. [Reader] Submit for review; keep the reviewer; Send on Teams.
5. [Reviewer] From the card: open → Review complete with a comment.
6. [Reader] Submit for approval; Send on Teams.
7. [Approver] From the card: Approve with a comment.
8. [Everyone] Reopen the standard.
expected: the request shows in the owner's Document tasks and nowhere else; the grant lands at once and the reader's card opens the document with Start revision live; the draft minor carries the reader's comment; the reviewer's task appears on submit and clears on Review complete; the approver's task appears and clears on Approve; the approved major carries "Approved by <approver> — <comment>" and the review date moves by the cadence; the reader's grant is released; readers see the new content only after the approval

### UAT-DOC-083 — A revision sent back, fixed and approved
persona: team
modules: docs/lifecycleCmds.ts docs/docsScreen.ts
preconditions: a draft revision in review; its owner, the reviewer and an approver on separate devices
steps:
1. [Reviewer] Open → Request revision with a reason.
2. [Owner] Document tasks → the document → Check out & edit → Check in → Submit for review.
3. [Reviewer] Review complete.
4. [Owner] Submit for approval.
5. [Approver] Approve.
expected: Request revision returns the status to Draft with the reason in the version comment and on the owner's card; the owner's Document tasks lists it under "Needs revision"; the second review and the approval run as in DOC-082; the version history shows every step with its comment

### UAT-DOC-084 — A flag raised by a reader, acted on by the owner
persona: team
modules: docs/flagDialog.ts docs/docFlags.ts docs/lifecycleCmds.ts
preconditions: an approved standard; a reader; its owner
steps:
1. [Reader] Flag for review… with a level and a comment.
2. [Owner] From the Teams card: open → read the flag chip → Mark reviewed… and accept "close the open flags".
3. [Reader] Reopen the document.
expected: the owner's card quotes the comment with an Open link; the flag shows on the register row and in the owner's Document tasks; Mark reviewed offers to close the open flags and the chip clears; the reader sees no open flag

### UAT-DOC-091 — Controller affordances paint at once on a repeat visit
persona: controller
modules: docs/docsScreen.ts docs/accessGates.ts docs/views.ts
preconditions: a controller who has opened Documents at least once since this build; a reader likewise
steps:
1. [Controller] Close and reopen the app; open Documents; watch the header and the top ⋯ menu as the register paints.
2. [Controller] Hover the status line's timing readout; read the "controllers group" entry.
3. [Reader] Open Documents; open the top ⋯ menu.
4. [Super admin] Settings → Documents → Access control: relink or clear the controllers group; a controller reopens Documents.
expected: on the repeat visit the controller's affordances (Tag proposals…, Save for the site, the template library row, every-status default) are present as the register paints, not seconds later; the readout lists "controllers group" as one call after the shared config read, with no separate "documents config row" read; the reader never sees a controller affordance, on a first or a repeat visit; after a relink the next open re-checks live and a person removed from the group loses the affordances on that open

### UAT-DOC-085 — Supersede with a successor, seen by everyone
persona: team
modules: docs/lifecycleCmds.ts docs/viewer.ts docs/linksIndex.ts
preconditions: two approved standards (A the old, B the new); a controller; a reader
steps:
1. [Controller] On A: ⋯ → Supersede…; pick B as "Superseded by"; confirm.
2. [Reader] Open A; follow its "Superseded by" link; read B's pane.
expected: A carries the Superseded status and a "Superseded by" link to B; B's pane lists A under "Supersedes" (derived); A leaves the approved-only register and shows with "Show only approved" unticked; the reader reaches B from A's link and "‹ Back to A" returns

### UAT-DOC-093 — The Filters pane: its order, featured terms and the tree
persona: controller
modules: docs/filterModel.ts docs/docsScreen.ts docs/featuredEditor.ts docs/settingsTab.ts docs/model.ts
preconditions: a site whose Document type and Process area columns are filterable; the Process area set is three or more levels deep with more than 14 terms; two readers whose profiles name different departments of one site (R1 in Casting, R2 elsewhere); a controller or admin who can save Settings → Documents
steps:
1. [Reader] Documents → Filters: read the groups from the top.
2. [Controller] Settings → Documents → the column list: on the Document type row press ★ in the Filter cell. Leave "For" on Everyone; add two terms by typing part of each name; choose the Casting department in "For" and add three deeper terms in a chosen order (use ↑ ↓); Done; Save the settings.
3. [R1, then R2] Documents → Filters → Document type.
4. [Reader] Filters → Process area: open a branch with ▸; tick a term three levels down and a second term in another branch; tick a parent; type part of a deep term's name in the search box.
5. [Controller] Settings → Documents: untick Filter on a column and read its ★; reopen ★ on Document type and remove every term for Casting; Done; Save.
6. [R1] On a column whose term set holds 14 terms or fewer and has a featured list for Casting: reload Documents and open Filters at once, before anything else; read the pills, then press "Show all n".
expected: step 6 the pills are Casting's own from the first paint, never the Everyone list for a moment; "Show all n" follows them and brings out every other term of the set after the featured ones, each pickable; "Show fewer" folds them again; a longer set keeps its search box or tree and has no such link; step 1 the groups read Status (or "Showing approved documents only" with its button), then Document type, then Process area, then the rest — Importance / risk is below Process area; the phone's selects are unchanged; step 2 the ★ opens "Featured terms — Document type" with a "For" list of Everyone, each site and each department; the list under the box narrows as you type, shows each term's path, and Enter adds without closing; the ★ turns on once a list exists; nothing is saved until the settings' Save; step 3 R1 sees Casting's three terms leading the pills in the order set; R2 sees the two set for everyone; a term at any depth can be featured; picked terms that are not featured stay in sight ahead of them; step 4 Process area is a tree, opened at the reader's own site and department with other branches closed; ticks at any level add to the filter chips and the register follows; a ticked parent shows everything under it ticked and greyed ("included by the level above") and matches documents on any of them; the search shows the matching terms with the path down to each; the "compare across sites" picker is still above it; step 5 ★ is disabled on a column that is not a filter; with Casting's list emptied R1 falls back to the list for everyone

### UAT-DOC-094 — A tall window loads past the first 20 documents
persona: reader
modules: docs/listView.ts docs/docsTiles.ts docs/docsScreen.ts
preconditions: a library (or libraries) with more than 70 documents; a large monitor, the browser window maximised so the first 20 rows leave empty space below them
steps:
1. Open Documents in the list view and wait for the rows. Do not scroll and do not change the view.
2. Scroll to the end of the list; keep scrolling.
3. Reload; switch to Tiles; repeat steps 1 and 2.
expected: step 1 the list goes on past its first 20 documents by itself until the rows fill the window and more — the line under the title counts up ("70 documents of 111 matching") without a click; step 2 every scroll to the end brings the next documents until the count reaches the total; step 3 the tiles behave the same

