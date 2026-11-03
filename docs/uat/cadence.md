# Cadence Current State — UAT script

Personas: user (anyone in the security group the LeanBoard Utilities app is shared with). The tool lives in the second code app, LeanBoard Utilities; it reads only the tester's own primary calendar and stores nothing.

## Journey 1 — Scan a period

### UAT-CAD-001 — First launch asks for the connections, then the tool scans
persona: user
modules: utility/src/cadence/screen.ts utility/src/cadence/read.ts
preconditions: the tester has never opened LeanBoard Utilities; their calendar has meetings in the last month
steps:
1. Open LeanBoard Utilities from Power Apps; allow the Office 365 Outlook and Office 365 Users connections.
2. Open Cadence Current State; leave the period at its default; press Scan my calendar.
expected: the period defaults to the last month ending today; the scan shows a spinner with a running count and a Cancel button; the review lists the month's meetings with recurring series first, then one-offs by date; the summary shows meetings found, series and one-offs, ticked, hours a week and confidential counts; times read in the tester's own time zone, which the start screen names

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

## Journey 3 — Export

### UAT-CAD-007 — JSON export carries only what was ticked, masked where flagged
persona: user
modules: utility/src/cadence/exportDoc.ts utility/src/cadence/screen.ts
preconditions: a review with one confidential meeting, one unticked meeting and an external attendee somewhere
steps:
1. Press Export JSON and open the file.
expected: the file downloads as cadence-current-state-<from>-to-<to>.json; about holds the period, time zone, rules, counts (untickedByReviewer 1, confidential 1) and the field dictionary; the unticked meeting is absent; the confidential one reads subject "Confidential" with its start, end, duration and recurrence but no location, organizer, attendees or body; other meetings list attendees with role, response, internal true/false and job title where the directory has one; bodies have no Teams join block

### UAT-CAD-008 — Excel export has the same content in four sheets
persona: user
modules: utility/src/cadence/exportDoc.ts shared/export/xlsx.ts
preconditions: the review from UAT-CAD-007
steps:
1. Press Export Excel and open the file in Excel.
expected: sheets About, Series, Meetings and Attendees; start and end are real date-times (sortable, shown yyyy-mm-dd hh:mm at the minute); the confidential meeting reads Confidential with blank details on Meetings and has no Attendees rows; the counts match the JSON
