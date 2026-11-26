# Issue reporting

Personas: reporter (anyone signed in — a report goes from the ? button or a failed UAT step), superadmin (Settings → Issues). The site needs the issues table deployed and at least one super admin.

## Journey 1 — Raising and following a report

### UAT-ISS-001 — Withdraw my own report
persona: reporter
modules: issues/report.ts issues/adminTab.ts
preconditions: a report you raised that is still new or triaged
steps:
1. Open the ? button → My reports.
2. On your open report click "Withdraw…"; give a reason; confirm.
3. As a super admin open Settings → Issues and find it.
expected: the report's status reads Withdrawn with your reason on its thread; the Withdraw link shows only on your own open reports (never on one in progress, fixed or closed); the admin list shows it under Withdrawn and the PDF export carries the status

### UAT-ISS-002 — The queue reads newest first
persona: superadmin
modules: issues/adminTab.ts issues/queueOrder.ts
preconditions: Settings → Issues with reports raised weeks apart; one older report given a priority rank
steps:
1. Open Settings → Issues and read the list from the top.
2. Raise a new report from the ? button; refresh the list.
3. Tick three issues of different ages and Export.
expected: step 1 any ranked issues lead, by rank; under them the reports run from the most recent to the oldest; step 2 the new report is at the top of the unranked ones; step 3 the export lists the ticked issues in the same order

### UAT-ISS-003 — A photo the app cannot show is refused by name
persona: reporter
modules: issues/report.ts imagePick.ts
preconditions: a HEIC photo (an iPhone's default), a PDF and a PNG on the device
steps:
1. Open the ? button → Report an issue → "choose a photo": read the file types offered.
2. Drag the HEIC photo onto the screenshot box; then the PDF; then the PNG.
expected: the chooser offers JPG, PNG, GIF and WebP; the HEIC photo is not added and the line under the box reads "HEIC photos can't be shown here: <name>. Use a JPG or PNG, or paste a screenshot."; the PDF reads "That file is not an image: <name>"; the PNG is added as a thumbnail and the line clears; a pasted screenshot works as before

## Journey 2 — Answering reports, one at a time and in bulk

### UAT-ISS-004 — The status words: Resolved, Partially resolved, Deferred, Not a software issue
persona: superadmin
modules: issues/status.ts issues/adminTab.ts issues/report.ts issues/exportPdf.ts
preconditions: Settings → Issues with reports in several statuses, one of them closed as fixed before this build; a second account that raised one of them
steps:
1. Open Settings → Issues. Read the status filter's list, then choose "Everything" and read the chips.
2. Open an open report and read its Status select.
3. Set one report to "Partially resolved". Set the filter back to "Open".
4. Choose the filters "Deferred" and "Not a software issue" in turn.
5. As the reporter: ? button → My reports. Then ? → Report an issue, and choose the area of a DEFERRED report.
6. Tick two reports and Export to PDF; read their Status lines.
expected: step 1 the filter reads Open (new · triaged · in progress · partially resolved), New, Triaged, In progress, Partially resolved, Resolved, Deferred, Declined, Not a software issue, Merged, Withdrawn, Everything; a report closed as fixed before this build reads "Resolved" (the word "Done" is gone everywhere — the stored value did not change); step 2 the select offers New, Triaged, In progress, Partially resolved, Resolved, Deferred, Declined, Not a software issue — never Merged or Withdrawn, unless the report IS one, when its own word shows; step 3 the partially resolved report is still in the Open list; step 4 each filter lists only its own; step 5 My reports shows the same words; "Already reported in this area" lists the open reports AND the deferred one, the deferred one marked "Deferred", each with +1; step 6 the PDF carries the same words

### UAT-ISS-005 — Deferring, or closing as not a software issue, asks for a message
persona: superadmin
modules: issues/adminTab.ts issues/status.ts
preconditions: Settings → Issues; three open reports from another account (Teams must be able to reach that person)
steps:
1. Open the first and set Status to "Deferred". Read the dialog; press Cancel.
2. Set it to "Deferred" again; edit the message; press "Defer & send".
3. Open the second and set Status to "Not a software issue". Press "Close & send" without changing the message.
4. Add what the reporter should do and press "Close & send".
5. Open the third and set Status to "Partially resolved".
expected: step 1 a dialog titled "Defer — <title>" with a prefilled, complete message and the line saying who it goes to; Cancel leaves the status as it was; step 2 the status reads Deferred, the thread has "Status → Deferred" and the message, and the reporter gets one Teams card; step 3 nothing is sent — a line reads "Add what the reporter should do instead: who to contact, or how to do it."; step 4 the status reads Not a software issue, with the message on the thread and one card; step 5 NO dialog — the status changes and the thread has "Status → Partially resolved", as Resolved does. Declining still asks for its message as before

### UAT-ISS-006 — Export to CSV: the starting file for answers
persona: superadmin
modules: issues/adminTab.ts issues/answersCsv.ts
preconditions: Settings → Issues with several reports, one whose title has a comma and a quotation mark; a spreadsheet program
steps:
1. Read the selection bar with nothing ticked.
2. Tick four reports, one of them from another filter. Press "Export to CSV".
3. Open the file in a spreadsheet program.
expected: step 1 "Export to CSV" and "Export to PDF" are greyed; "Import answers…" is not; step 2 a file `leanboard-issues-<date>.csv` saves and the bar reads "Exported 4 issues to CSV."; step 3 one row per ticked report in the order shown, with the columns IssueID, Title, Kind, Area, Reporter, Raised, CurrentStatus, Status, ResolutionType, ReporterMessage, ReleaseVersion, ResolvedDate, DuplicateOfID, InternalNote; the first seven are filled (the reporter by NAME — no email anywhere in the file), the last seven are blank; the title with a comma and a quotation mark sits in one cell; accents and dashes read correctly

### UAT-ISS-007 — Import answers: the preview names every fault before anything is written
persona: superadmin
modules: issues/importAnswers.ts issues/answersCsv.ts issues/status.ts
preconditions: the file of UAT-ISS-006, filled in with a spreadsheet program and SAVED from it: one row Resolved with a type, a release and a date; one row with the status "Fixed"; one row with a status and no message; one row left blank; one row whose IssueID is changed by a character; one Duplicate row with no DuplicateOfID; a report its reporter withdrew, answered Declined; one report that already has a resolution line typed at the desk
steps:
1. Press "Import answers…". Read the dialog. Press "Choose a file…" and pick a file that is not an answers file (any other CSV).
2. Choose the filled-in file. Read the count line and each row.
3. Type a message into the row that had none. Type past 400 characters, then shorten it.
4. Tick the withdrawn report's row, then untick it.
5. Press Close. Open two of the reports at the desk.
expected: step 1 the dialog opens with "Choose a file…" and a "Tell people on Teams" tick, on; the wrong file is refused with the reason ("This is not an answers file: it has no … column"); step 2 a count line such as "8 rows: 2 ready, 4 with faults, 1 withdrawn by the reporter, 1 no answer"; each row shows the title, the reporter, the present status, the new status and the message in a box with its count out of 400; the Resolved row reads "Resolution: Bug fix, released in <release> on <date in words>" — the date the spreadsheet rewrote is read day first and shown in WORDS; "Fixed" is named as not a status, with the six words that are; the changed id reads "This id is not an issue in this environment."; the duplicate reads that it needs DuplicateOfID; the blank row reads "No answer" and is greyed; the report with a typed resolution line says it REPLACES that line and quotes it; fault rows cannot be ticked; the button reads "Apply <the number ticked>"; step 3 the row turns Ready and is ticked once it has a message; past 400 it is a fault again and loses its tick; shortened, it is ready; step 4 the withdrawn row is unticked to start with, carries a note, and can be ticked; step 5 NOTHING was written — both reports are as they were

### UAT-ISS-008 — Apply, apply again, and a duplicate pair
persona: superadmin
modules: issues/importAnswers.ts issues/answersApply.ts issues/answersCsv.ts issues/adminTab.ts
preconditions: an answers file for five open reports: one Resolved with type, release, date and an InternalNote; one Duplicate whose DuplicateOfID is that Resolved report; one Deferred; one Not a software issue; one Partially resolved. The duplicate was raised by a different person from its parent
steps:
1. Import the file with "Tell people on Teams" UNTICKED. Press Apply.
2. Read each row's result and the line under the table. Close.
3. At the desk choose "Everything" and open each of the five.
4. As the duplicate's reporter open ? → My reports.
5. Import the SAME file again.
6. Edit one message in the file, save it, and import it again.
expected: step 1 the status line counts "Applying 2 of 5…"; the Close button reads Stop while it runs; step 2 every row reads "Applied ✓"; the line reads "5 applied." and that nobody was told because the tick was off; step 3 each report carries its new status; its thread has the "Status → …" line, the message (visible to the reporter) and, where the file had one, the internal note marked internal; the Resolved report's resolution line reads "<type>, released in <release> on <date>"; the duplicate reads Merged, its thread says which report it was merged into, and the parent's thread has an internal "Merged in:" line — although the parent was resolved in the same file; step 4 the reporter sees Merged, "Merged into …", the resolution line and the message — never the internal note; step 5 the count line reads "5 rows: 5 already applied", every row is greyed and Apply is greyed — a second run changes nothing; step 6 only that row is Ready, and applying it adds the new message and nothing else. A row that fails says which step was refused, stays ticked, and does not stop the rows after it; Apply again runs only the steps still owed

### UAT-ISS-009 — One Teams card per person
persona: superadmin
modules: issues/importAnswers.ts issues/answersApply.ts issues/adminTab.ts
preconditions: an answers file covering: three reports raised by person A; one report raised by person B that is a Duplicate of one of A's; a report person C follows (+1) and did not raise; one report YOU raised. Teams can reach A, B and C
steps:
1. Import the file with "Tell people on Teams" ticked. Press Apply.
2. Read the lines under the table.
3. Ask A, B and C what arrived in Teams.
4. Import the same file again and press nothing.
expected: step 2 one line per person — "<name> — 3 answers … sent ✓"; a line says your own report's answer is on its thread and that no card went (Teams refuses a chat with yourself); a card that did not go says why and has "Send again", which sends that one card; step 3 A has ONE card, "Updates on your LeanBoard reports", listing the three reports each with its outcome word and message, and an Open button — not three cards; B has one card with their own duplicate report's answer and NOT the parent's as well; C has one card with the report they follow; step 4 every row is already applied, and nobody is told a second time
