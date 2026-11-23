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
