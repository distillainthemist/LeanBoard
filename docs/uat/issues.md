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
