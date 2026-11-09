# Cadence Current State — UAT script

Personas: user (anyone in the security group the LeanBoard Utilities app is shared with). The tool lives in the second code app, LeanBoard Utilities; it reads only the tester's own primary calendar and stores nothing.

## Journey 1 — Scan a period

### UAT-CAD-001 — First launch asks for the connections, then the tool scans
persona: user
modules: utility/src/cadence/screen.ts utility/src/cadence/read.ts
preconditions: the tester has never opened LeanBoard Utilities; their calendar has meetings in the last month
steps:
1. Open LeanBoard Utilities from Power Apps; allow the Office 365 Outlook connection (the only one it asks for).
2. Open Cadence Current State; leave the period at its default; press Scan my calendar.
expected: the period defaults to the last month ending today; the scan shows a spinner with a running count and a Cancel button; the review lists the month's meetings with recurring series first, then one-offs by date; there is no row of summary tiles (the export bar reads the ticked count); times read in the tester's own time zone, which the start screen names

### UAT-CAD-002 — The period runs up to 12 months, back or forward
persona: user
modules: utility/src/cadence/screen.ts utility/src/cadence/model.ts
preconditions: none
steps:
1. Press each preset (Last month … Last 12 months, Next month, Next 3 months) and read the dates.
2. Set From 13 months before To; then set To before From.
3. Press Last 12 months and scan.
expected: each preset fills both dates; a period over 12 months reads "The period can be at most 12 months." and an inverted one "The end date is before the start date." with Scan disabled; a 12-month scan completes with every page read (the count keeps rising past 100)

### UAT-CAD-003 — Cancel stops a scan
persona: user
modules: utility/src/cadence/screen.ts utility/src/cadence/read.ts
preconditions: a busy calendar
steps:
1. Start a 12-month scan and press Cancel while the count is rising.
expected: the button reads Stopping…, then the start screen returns with the same dates; nothing is exported or stored

## Journey 2 — Review

### UAT-CAD-004 — Cancelled and declined meetings are left out
persona: user
modules: utility/src/cadence/model.ts
preconditions: in the period, one meeting cancelled by its organizer and one the tester declined
steps:
1. Scan the period.
expected: neither meeting is in the list; the line under the summary reads "Left out: 1 cancelled meeting and 1 declined meeting."

### UAT-CAD-005 — Personal, private and confidential meetings are flagged
persona: user
modules: utility/src/cadence/model.ts utility/src/cadence/screen.ts
preconditions: three meetings in the period marked Personal, Private and Confidential in Outlook (Sensitivity), and an ordinary one
steps:
1. Scan; read each meeting's chip.
2. Click the chip on the ordinary meeting, then on one flagged meeting.
expected: the three read Confidential (shaded) and the ordinary one Mark confidential; the clicks swap them; the summary's confidential count follows

### UAT-CAD-006 — A series ticks and flags as one, or by occurrence
persona: user
modules: utility/src/cadence/screen.ts utility/src/cadence/model.ts
preconditions: a weekly meeting with at least four occurrences in the period
steps:
1. Read the series row; press Show all.
2. Untick one occurrence; then mark one occurrence confidential.
3. Untick the series row's own box, then tick it again.
expected: the series row names the pattern (e.g. "Weekly on Tue"), the occurrence count and hours; after step 2 the series box is part-ticked and its chip reads "Confidential (1 of n)"; step 3 unticks and re-ticks every occurrence; the export bar's count follows each change

### UAT-CAD-011 — Notice given shows on every row and short notice is flagged
persona: user
modules: utility/src/cadence/model.ts utility/src/cadence/read.ts utility/src/cadence/screen.ts utility/src/cadence/exportDoc.ts
preconditions: in the period, a one-off invite received a week or more before it; a one-off invite sent the same day it was held; a weekly series created for its first meeting less than a day ahead (ask a colleague to create and send it for tomorrow); one occurrence of a series moved by its organizer
steps:
1. Scan; read the badge on each row (hover it for the times).
2. Press Show all on the moved series; read the moved occurrence's row.
3. Press the Short notice chip.
4. Export JSON and Excel; read a one-off, the series row and the moved occurrence in each.
expected: step 1 — the week-ahead invite reads "7 d notice" (grey) and its tooltip "Invite received <date time>"; the same-day invite reads "<n> h notice" shaded amber; the series row reads "<n> h notice" amber with the tooltip naming when the series was created and its first meeting; above the list a line reads "<n> meetings or series were issued with under 24 h notice …"; step 2 — ordinary occurrences carry no badge; the moved one reads "moved, <n> h notice" (or "<n> d notice") with the tooltip "Moved <date time>"; step 3 — only rows flagged short notice stay (a series stays when it or any occurrence is flagged); step 4 — the JSON meeting has created, lastModified, noticeHours and shortNotice (noticeHours null for an ordinary occurrence); the series has created, firstStart (before the period when the series is older) and noticeHours; counts has shortNoticeMeetings and shortNoticeSeries; a confidential meeting keeps these fields; the Excel Meetings and Series sheets carry the same columns with created/firstStart as date-times in the tester's zone

## Journey 3 — Export

### UAT-CAD-007 — JSON export carries only what was ticked, masked where flagged
persona: user
modules: utility/src/cadence/exportDoc.ts utility/src/cadence/screen.ts
preconditions: a review with one confidential meeting, one unticked meeting and an external attendee somewhere
steps:
1. Press Export JSON and open the file.
expected: the file downloads as cadence-current-state-<from>-to-<to>.json; about holds the period, time zone, rules, counts (untickedByReviewer 1, confidential 1) and the field dictionary; the unticked meeting is absent; the confidential one reads subject "Confidential" with its start, end, duration and recurrence but no location, organizer, attendees or body; other meetings list attendees with role, response and internal true/false (no job title or department — the tool makes no directory lookups); bodies have no Teams join block

### UAT-CAD-008 — Excel export has the same content in four sheets
persona: user
modules: utility/src/cadence/exportDoc.ts shared/export/xlsx.ts
preconditions: the review from UAT-CAD-007
steps:
1. Press Export Excel and open the file in Excel.
expected: sheets About, Series, Meetings and Attendees; start and end are real date-times (sortable, shown yyyy-mm-dd hh:mm at the minute); the confidential meeting reads Confidential with blank details on Meetings and has no Attendees rows; the counts match the JSON

## Journey 4 — Send and task links

### UAT-CAD-009 — Send the result to a colleague by email
persona: user
modules: utility/src/cadence/screen.ts utility/src/cadence/share.ts utility/src/cadence/deliver.ts
preconditions: the review from UAT-CAD-007; a colleague in the organisation who agrees to receive a test email
steps:
1. Press Send to a colleague…, enter an address outside the organisation, press Send.
2. Enter your own address, press Send.
3. Enter the colleague's address, press Send.
expected: step 1 reads "Only people in <your domain> can receive the result." and step 2 "That is you — export the files instead.", nothing sent; step 3 reads Sent; the colleague receives one email from the tester, subject "Cadence Current State: <from> to <to> (<tester>)", whose body gives the period, the counts (including "<n> on short notice (under 24 h)") and the recurring series by hours, with cadence-current-state-<from>-to-<to>.json and .xlsx attached; both files open and match the downloads; the confidential meeting reads Confidential in the body and the files; a copy is in the tester's Sent Items

### UAT-CAD-010 — A task link scans and offers Send to the named person
persona: user
modules: utility/src/main.ts utility/src/cadence/screen.ts utility/src/cadence/share.ts
preconditions: a colleague in the organisation to name as the recipient
steps:
1. On the Cadence start screen, under Task link, pick Last 3 months, enter the colleague's address and a note, press Create link, then Copy link.
2. Close the player, paste the link into a browser and open it.
3. Review the meetings, untick one, then press Send to <colleague> and Send.
4. Make a second link with Period "Fixed dates…", From the 1st and To the last day of last month; open it fresh.
5. Make a link with fixed dates more than 12 months apart, or To before From.
expected: step 1 shows an apps.powerapps.com/play link; step 4's link carries ufrom and uto and scans exactly those dates (the review's date line names them), whatever day it is opened; step 5 is refused under the fields with the same wording as the start screen and no link is made; step 2 opens LeanBoard Utilities straight into Cadence and starts the scan without a press, for the last 3 months ending today; the review shows the task banner with the note (no "Task: … send to" heading; the recipient is named on the Send button); nothing is sent until step 3; the email arrives with the note in its body and the unticked meeting absent from the files; returning to the hub and opening Cadence again later is an ordinary visit with no banner

