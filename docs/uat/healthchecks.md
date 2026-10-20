# Health checks

Personas: assessor (someone who may run a check on the scope — a ritual owner or participant, an initiative role holder, an org owner, a document controller), siteadmin, superadmin. The site needs health checks enabled for each type under Settings → Health checks, with at least one standard or site criterion per type.

## Journey 1 — Settings

### UAT-HC-001 — Define standard criteria
persona: superadmin
modules: health/settingsTab.ts health/model.ts
preconditions: Settings → Health checks open as a super admin
steps:
1. Under Cadence health check → Standard criteria → ＋ Add standard criterion; title and description.
2. Add a question with the Yes / no preset; another with All / some / no; another with the 0–5 scale; a multi-select with two options.
3. Edit an option's weight and guidance; tick N/A on one question; reorder criteria with ▲▼.
4. Save.
expected: every edit buffers until Save; a criterion with no title, a question with fewer than two options or no option worth anything refuses the save naming the problem; after Save the criteria reload as entered, marked "standard"

### UAT-HC-002 — Site criteria and the enable switch
persona: siteadmin
modules: health/settingsTab.ts
preconditions: a site admin at a site; standard criteria exist
steps:
1. Settings → Health checks: read the standard criteria (no editing, no hiding).
2. Under the site's criteria → ＋ Add the site criterion with a question.
3. Tick "Enabled for <site>" on Cadence; Save.
expected: the standard criteria are read-only for a site admin with no way to hide one; the site criterion saves marked with the site; the switch turns the type on for the site only

### UAT-HC-003 — Recent checks per site
persona: superadmin
modules: health/settingsTab.ts
preconditions: checks exist at two sites
steps:
1. Settings → Health checks: use the site picker at the top.
2. Read "Recent checks" under a type; Open one.
expected: a super admin switches sites and sees each site's recent checks (date, scope, score, assessor); a site admin sees their own site only; Open shows the check read-only

## Journey 2 — Running a check

### UAT-HC-004 — Meeting health check from the board
persona: assessor
modules: screens/board.ts health/entry.ts health/checkDialog.ts
preconditions: Cadence checks enabled for the site; a ritual you own or attend
steps:
1. Open the ritual's board: a "Health check" button sits left of Live board.
2. Click it; answer every question; type What went well and Even better if.
3. Submit.
expected: the popup shows the criteria as cards with pills, the score live in the footer, "n questions to answer" under Submit until none remain; Submit records the check and the button reads "Health check · 3.4"; the button is absent when the type is off for the site

### UAT-HC-005 — Draft, Reset, Discard
persona: assessor
modules: health/checkDialog.ts health/store.ts
preconditions: a scope with no check today
steps:
1. Start a check, answer some questions, Close.
2. Reopen: the answers are there (a draft); the button reads "Health check · draft".
3. Reset → confirm: every answer clears, the comments stay.
4. Discard draft → confirm.
expected: a draft is kept and reopened as the day's check on that scope; Reset clears the pills only; Discard removes it and the button reads "Health check" again

### UAT-HC-006 — N/A and the score
persona: assessor
modules: health/model.ts health/checkDialog.ts
preconditions: a criterion with an N/A-allowed question
steps:
1. Answer every question but the N/A one; read the footer.
2. Mark it N/A.
3. Read each card's own score and the overall.
expected: an unanswered question blocks Submit; N/A removes it from both numerator and denominator; each card shows its own 0–5 and the footer the weighted whole to one decimal with the five-segment bar

### UAT-HC-007 — One check per scope per day; edit for seven days
persona: assessor
modules: health/model.ts health/checkDialog.ts
preconditions: a check submitted today on a scope by another person
steps:
1. Open the scope's Health check button as a different assessor.
2. Change an answer; Save changes.
3. On a check submitted more than seven days ago (or a void one), open it from the trend.
expected: the button opens today's existing check, not a second one; a submitted check is editable by anyone who may run it, and the header names who edited it; a check older than seven days is read-only ("locked")

### UAT-HC-008 — Trend and past checks
persona: assessor
modules: health/checkDialog.ts
preconditions: a scope with three submitted checks
steps:
1. Open the check: read the Trend strip.
2. Click an earlier chip; read it; "← Back to today's check".
expected: the strip lists the last six submitted checks newest first with date and score; an earlier check opens read-only in the same dialog; Back returns to today's

### UAT-HC-009 — Actions from a check
persona: assessor
modules: health/checkDialog.ts store/actions.ts
preconditions: a meeting check open
steps:
1. ＋ Add action; fill it in; save.
2. Read the Actions row; open the board's Actions card.
expected: the action lands on the board's channel and shows on the board's Actions card; the check lists it with its status; for a priorities or documents check the action lands on the assessor's own list instead

### UAT-HC-010 — Initiative health check
persona: assessor
modules: screens/board.ts health/entry.ts
preconditions: Initiative checks enabled; an initiative you hold a role on
steps:
1. Open the initiative board: Health check left of Live board.
2. Run and submit.
3. Open the initiative's Details pane and the Improvement list.
expected: the check runs against the Initiative criteria; the Details pane no longer has the old "Health check" button and the Improvement list no longer has a Health column

### UAT-HC-011 — Priorities health check per sub-pillar
persona: assessor
modules: priorities/prioritiesScreen.ts health/entry.ts
preconditions: Priorities checks enabled; an org you manage with sub-pillars
steps:
1. Priorities → "Health check…" after ＋ Priority: a picker of the org's sub-pillars with their last score and date.
2. Pick one; run and submit.
3. Read the sub-pillar's column header.
expected: one sub-pillar at a time; the check is scoped to the sub-pillar at this organisation; the column header carries a quiet "3.4 · 10/21" chip after a check

### UAT-HC-012 — Documents health check
persona: assessor
modules: docs/docsScreen.ts health/entry.ts
preconditions: Documents checks enabled; signed in as a document controller
steps:
1. Documents → kebab → "Health check…".
2. In the org picker, keep your site or pick a department; run and submit.
expected: the kebab item is there for controllers only; the picker opens on the person's site; the check is scoped to the chosen organisational level

### UAT-HC-013 — Void and restore
persona: siteadmin
modules: health/checkDialog.ts health/store.ts
preconditions: a submitted check
steps:
1. Open it; Void… with a reason.
2. Read the trend; open the void check from "n void"; Restore.
expected: a void check leaves the trend and the recent list and stays on record marked void with who and why; Restore puts it back; a submitted check is never deleted
