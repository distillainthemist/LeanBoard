# Actions — UAT script

Personas: assignee (an action is assigned to them), owner (owns a board or initiative), superadmin.

## Journey 1 — Where an action lands

### UAT-ACT-001 — Quick add on an initiative board links to that initiative
persona: owner
modules: actions/quickAdd.ts actions/linkTargets.ts shared/ui/actionUi.ts shared/schema/actionLinks.ts store/actions.ts
preconditions: three initiatives with boards — one active you hold a role on, one COMPLETED, one confidential you hold no role on but whose board you can open
steps:
1. Open each initiative's board (the overview) and press the top bar's ＋ Add action; read the "Linked to" chip; type an issue; Save. On the active one, press Save the instant the dialog opens, before the link has loaded.
2. Open each initiative's Action plan and the person's My day.
expected: the chip names the initiative on all three — the completed and the confidential ones read "Initiative · <its title>" even though they are not in your search list — and every action, the fast-saved one included, appears on its initiative's Action plan and on the board's action card; none sits on My day as a personal action; the row's source reads leanhub and its key names the board

### UAT-ACT-002 — Unlinking stays unlinked
persona: owner
modules: shared/ui/actionUi.ts shared/schema/actionLinks.ts store/actions.ts
preconditions: an action raised from a card on an initiative board
steps:
1. Open the card's ＋ Action → the action → press the chip's ✕ (Take it off) → Save.
2. Open the action from My day; reopen the initiative's Action plan.
expected: the action leaves the card and the initiative's Action plan and shows on My day as "Personal — not linked"; it is NOT re-linked to the initiative behind the scenes (the row has no initiative id); linking it back from My day's search restores it to the initiative

## Journey 2 — Moving a due date

### UAT-ACT-003 — A later due date asks why, an earlier one does not
persona: owner
modules: shared/ui/actionUi.ts shared/schema/reschedule.ts shared/ui/reschedulePrompt.ts shared/ui/actionLinkProvider.ts actions/reschedule.ts controls/ActionBoard/editor.ts controls/LeanHub/editor.ts
preconditions: Settings → Improvement → Due date changes on "Initiative actions only"; an initiative with an open action that has a due date; a ritual board with an open action that has a due date
steps:
1. On the initiative's Action plan open the action, set the due date a week later and press Save.
2. Press Cancel on the question; then press Save again, press Move date without choosing, choose "Other" and press Move date, then type a note and press Move date.
3. Open the same action again, press the "Due date moved…" line under the comments and read the list; read the action's card on the kanban and its row on My day.
4. Open it again, set the due date three days EARLIER and Save.
5. On the ritual board open its action from the Action card, set the due date a week later and Save. Do the same to an initiative action opened from another card on the initiative board (a 5 Whys or the agenda).
6. Raise a new action with no due date, save it, open it and give it a due date.
expected: step 1 the dialog stays open and asks "Why is this moving?" across the foot of the dialog, showing the old and new dates and a list of the organisation's reasons ending in "Other", with nothing chosen for you; step 2 Cancel closes the question only — the dialog is still open and nothing was saved; Move date with nothing chosen says "Choose a reason."; "Other" with no note says "Say what the reason is."; with the note the dialog closes and the new date shows; step 3 the line reads "Due date moved later once" with the latest move, and opens to a list showing the move with its dates, "Other — <your note>", your name and today's date, and the card and the My day row carry "↷ 1" whose tooltip names the move and the reason; step 4 it saves with no question and the list gains a second line reading "Brought forward" (the ↷ count stays 1); step 5 the ritual's action saves with no question — its move is still listed when reopened, as "No reason recorded", and its card shows ↷ 1 — while the initiative action asks why from the other card exactly as it did from the Action plan; step 6 a first due date asks nothing and records nothing

### UAT-ACT-004 — The Gantt follows the same rule
persona: owner
modules: improvement/gantt.ts shared/schema/reschedule.ts shared/ui/reschedulePrompt.ts actions/reschedule.ts
preconditions: Settings → Improvement → Due date changes on "Initiative actions only"; an initiative with dated actions; a ritual board whose Action card holds dated actions
steps:
1. On the initiative's Gantt drag an action's bar a week to the right. Read the dialog, press Cancel.
2. Drag it again, choose a reason, add a note and press Move date. Open the action and open its "Due date moved…" line.
3. Drag the same bar a few days to the LEFT. Drag only its left edge.
4. On the ritual board's Action card, Gantt view, drag a bar a week to the right.
5. A super admin sets Due date changes to "All actions"; a minute later repeat step 4 and then edit a ritual action's due date later in its dialog.
expected: step 1 "Move due date to <date>?" shows the previous date (in red with "overdue" when it was), the same reasons as the action's dialog with nothing chosen, and a Note; Cancel snaps the bar back; step 2 the bar stays moved and the list shows the move as "<reason> — <note>" with your name; step 3 the earlier date and the start-only move both save with no question, the earlier date listed as "Brought forward"; step 4 the ritual's action moves with no question and its move is recorded without a reason; step 5 both the Gantt and the dialog now ask why for the ritual's action

## Journey 3 — Comments and supporters

### UAT-ACT-005 — A comment's author can put it right for a day
persona: assignee
modules: shared/ui/actionUi.ts shared/schema/actions.ts store/actions.ts store/dv.ts controls/EscalationViewer/editor.ts
preconditions: an action you can open, carrying a comment from someone else and one of your own written more than a day ago; a second person signed in on another device
steps:
1. Open the action, write a comment with a spelling mistake, press Add, then Save.
2. Open the action again. Read the tools on each comment.
3. Press ✎ on the new comment, fix the spelling, press Done, read the row, then Save. Open it again.
4. The second person opens the same action and leaves it open. You add another comment and Save. The second person then adds their own comment and saves. Both reopen the action.
5. Press ✕ on one of your comments from today, confirm, and press Close; answer the question; then delete it again and Save.
6. Open the action the next day.
expected: step 2 only your own comment from the last 24 hours shows ✎ and ✕ — not the other person's, not your older one; step 3 the edited row reads "edited · not saved yet" with a dashed edge until Save, and afterwards "· edited" with the edit date in its tooltip; step 4 both comments are there after both saves — neither save dropped the other's; step 5 Close asks about the unsaved change before leaving, and after Save the comment is gone; step 6 yesterday's comments carry no tools: they are the record

### UAT-ACT-006 — Supporters: named, seen, never owing a part
persona: owner
modules: shared/ui/actionUi.ts shared/schema/actions.ts store/actions.ts store/mappers.ts controls/LeanHub/editor.ts controls/ActionBoard/editor.ts improvement/gantt.ts
preconditions: an action assigned to person A; person B and person C on the roster; B able to sign in; for step 7 an admin (site or super) and a person D who is in the directory but not yet a LeanBoard user
steps:
1. Open the action. Press "＋ Add support", type part of B's name, pick B; press "＋ Add" and add C the same way; remove C with its ✕; Save.
2. Read the action's row in the list view, its card on the kanban, its line on the Gantt, and the Gantt's CSV export.
3. As B, open the hub: read My day, the Actions tab's badge and list, and the group at its foot.
4. As B, open the action from "Supporting". As A, complete it.
5. Make the action confidential. As B, find it again. As B's manager (not otherwise involved), look for it.
6. Open the action, pick B as the person it is assigned to, and Save.
7. As the admin: open an action, press "＋ Add support" and type three letters of D's name; pick D. Then type the same letters in "Search everyone…" under Who. As a person who is not an admin, type the same letters under Support.
expected: step 1 the search is the same type-ahead as Who's — one list under the box, ↑ ↓ and Enter pick without saving the dialog — it offers people not already chosen and each choice becomes a chip; step 2 the list row reads "support: B", the kanban card shows ＋1 with B in its tooltip, the Gantt line and the export's Support column name B; step 3 the action is NOT in B's My day, does not count in the Actions badge or the overdue filter of B's own list, and sits under "Supporting · 1" with no tick; step 4 B can open and comment; the action closes when A completes it — B owed nothing; step 5 B still sees the confidential action, B's manager does not; step 6 B is now assigned and no longer listed in support (nobody is both); step 7 Support searches what Who searches: the app's people first, then for an admin "In the directory — adds them to the app" after a short pause; picking D adds them to LeanBoard and to support, and Who then finds D among the app's people; a person an admin added through Who is found under Support the same way; a non-admin is offered the app's people only, under both

## Journey 4 — The dialog itself

### UAT-ACT-007 — The add / edit action dialog fits its screen
persona: owner
modules: shared/ui/actionUi.ts shared/ui/baseCss.ts
preconditions: a desktop window about 870px high or taller; an initiative with around 15 people in its roles and an action that has comments, a supporter and a moved due date; a phone
steps:
1. On the desktop, open the action from the initiative's Action plan. Read the dialog without scrolling.
2. Read the left side from top to bottom, then the right side.
3. Tick a different person. Type two letters of someone's name in "Search everyone…", then a third; use ↓ and Enter to pick. Press "＋ Add" beside Support.
4. Press the "Due date moved…" line. Add three long comments. On an unlinked action, type one letter in "Linked to (optional)" so many rituals and initiatives match; use ↓ and Enter.
5. Press ＋ Add action and read the new dialog.
6. Open the same action on the phone.
7. Open an action from a card that offers no "Linked to" (a 5 Whys in a standalone harness, or any narrow add dialog with "＋ Add action").
expected: step 1 the whole dialog shows at once — no scrolling inside it — about 900px wide, in two columns; step 2 left: Issue, the Action, "Who" as a label over the people grid — "Search everyone…" its first box, the size of a person's, then the people three across (each a full-height touch target, the same people as before), Support on one line, Start, Due and Confidential on one row; "⚑ Flag for support" is a button in the title row, faint purple until pressed, with the ⋮ menu beside it on a saved action, PDCA state as one row of six; right: "Linked to (optional)" (a chip when linked; a bare search when not, with no "Personal — not linked" line), then Comments and one "Due date moved…" line; the footer carries Close and Save alone — "Cancel this action…" is in the ⋮ menu at the right of the title row, with Message and Duplicate; step 3 a list opens under the search box as you type, wider than the box and over the grid (the people do not move): people already shown as boxes and the rest of the app's people, narrowing with each letter; Enter ticks the highlighted person and never saves the dialog; Escape clears it; Support opens a search only when asked; step 4 the line opens to the full list of moves; with long threads the dialog scrolls as ONE piece — the comment list never scrolls inside it; the link search opens a list under its box that scrolls by itself — the dialog does not grow and the comments do not move — and Enter links the highlighted one; step 5 a new action uses the same layout with an empty Comments column and Cancel / Raise; step 6 one column: the action first (people two across, the two flags on a line under the dates, PDCA three by two), then Linked to, then the comments; step 7 with no "Linked to" the right side starts at Comments

## Journey 4 — Shared actions, support, duplicate and message (2026-11-17)

### UAT-ACT-008 — One action for several people, a part each
persona: owner
modules: shared/ui/actionUi.ts shared/schema/actions.ts store/actions.ts controls/ActionBoard/editor.ts controls/LeanHub/editor.ts improvement/gantt.ts
preconditions: TWO accounts, A and B, both on an initiative with an Action card; a third person C on it; nobody else editing
steps:
1. As A: ＋ Add action; tick A, B and C in Who; Raise. Read the card on List, Kanban and Gantt.
2. As B: My day → find the action → tick "my part". As A, WITHOUT reloading: tick the action's circle on the Action card. As someone who is NOT on the action, look at the same circle.
3. As A: open the action from the card; read the people's boxes; press anywhere on C's box; Save.
4. As A: open it again, set PDCA to Do, Save. Open it once more and try Closed with a part still to do; drag its card into Done on the Kanban.
5. As A: open an action that has several people, untick one of them, Save.
expected: step 1 ticking a second person does NOT untick the first (no explanatory line appears under the people); the card names the first person "+2" with a "0 / 3 done" chip (who is still to do it on hover) on every view; step 2 B's tick shows "1 / 3 done" for everyone; A's tick on the card records A's OWN part only — the circle becomes an outlined tick, the action stays open and reads "2 / 3 done" — and, made from a screen that had not seen B's tick, does not undo it; for someone who is not on the action the circle is dashed and does nothing, and its tooltip says how many parts are done; step 3 the Who grid of this saved shared action lists ONLY the three people on it — the people who have to sign off — with "Search everyone…" as its first box (typing there finds and adds anyone else, the rest of the meeting included); each person's box is a SIGN-OFF box, not a tick box: a circle at its left — green with a tick for a part that is done, empty for one still to do — and a small ✕ at its right that takes the person off the action; pressing anywhere on the box records that person's part and can never untick them by accident; "n / 3 people completed" sits at the right of the "＋ Cascade to team…" line —; there is no separate Parts list and no explanatory line under the people or under the PDCA row; pressing C's box closes the action on Save (Closed, struck through; on an initiative that asks for endorsement it waits for its endorser instead); step 4 reopening reopens every part ("0 / 3 done"); with a part still to do, Closed is greyed (its tooltip says how many people have not completed their part) — a shared action closes ONLY when every person has done theirs, and the last circle ticked closes it by itself; a card dragged into Done goes back and the card says why for a few seconds; step 5 the other people stay on the action with their parts as they were — only the unticked person leaves (before this release a save from the dialog kept one person)

### UAT-ACT-009 — Cascade an action to a leader's team
persona: owner
modules: shared/ui/actionUi.ts actions/team.ts actions/teamModel.ts store/directoryWalk.ts shared/ui/actionLinkProvider.ts
preconditions: a leader in LeanBoard whose direct reports include at least two LeanBoard users and one person who is NOT a LeanBoard user; one of those reports has reports of their own, and one of THOSE has reports too (a third level)
steps:
1. ＋ Add action → "＋ Cascade to team…" (on the same line as "＋ Add support"); type part of the leader's name and pick them with ↓ and Enter; leave "Direct reports"; press Add them.
2. Change to "Direct reports and their reports"; tick "Include the leader"; press Add them again.
3. Remove one person with their ✕; press "Remove all"; add the team again and Raise.
expected: step 1 the list under the box narrows as you type and Enter picks without saving the dialog; after a moment the direct reports who are in LeanBoard are on the action — ticked in the grid where they have a box there, as further boxes of the SAME shape in the same grid otherwise (no pills) — and the note says how many were added and NAMES the ones not in the app ("ask an admin to add them"); nobody is added to LeanBoard; the note does not say the directory "answered only in part" unless a read failed; step 2 the choice reads "Direct reports" or "Direct reports and their reports" — there is no "Everyone below"; the second level and the leader are added, the third level is NOT, anyone already on the action is not added twice, and past twelve added boxes the rest sit behind "+n more" ("Show fewer" folds them again); step 3 unticking takes one person off, "Remove all" clears the boxes the cascade added (the meeting's own boxes stay), and the raised action carries everyone ticked, each with their own part; a directory that cannot be read says so and adds nobody

### UAT-ACT-010 — Support required, Duplicate, and Message about this action
persona: assignee
modules: shared/ui/actionUi.ts shared/schema/actions.ts actions/message.ts actions/messageModel.ts shared/ui/focusTrap.ts controls/LeanHub/editor.ts actions/quickAdd.ts
preconditions: an action assigned to someone else who has an email, on an initiative board; Teams or Outlook available to the sender
steps:
1. Open the action; press "⚑ Flag for support" in the title row; Save. Read the card, My day and the Gantt. Then press the round button on the divider between the two columns, close the dialog and open another action.
2. Open it again → ⋮ in the title row → "Duplicate…"; change the Who and the due date; Raise.
3. Open the original → ⋮ → "✉ Message about this action…"; read To and the message; add a person by typing three letters of a name that is not a LeanBoard user; remove them; Send by Teams.
4. Close the action dialog WITHOUT Save and open the action again.
expected: step 1 the tick that read "Escalated" is now the "⚑ Flag for support" button in the title row, with a ⋮ menu to its right holding "✉ Message about this action…", "Duplicate…" and "Cancel this action…" (red; it still asks first): a faint tint of the flag's colour until pressed, the full colour once the action is flagged (press again to take the flag off); it is saved with the dialog's Save; the action carries ⚑ on the card and the Gantt and "⚑ Support required" in My day, and still reaches the Escalation viewer of the board above; the right side's three headings — Linked to (optional), Comments, Attachments & links — read alike; the round button folds the right side into a slim rail showing the comment and attachment counts, the dialog narrows, the rail brings it back, and the choice is remembered for the next action opened in this browser; step 2 a Raise action dialog opens already filled — issue, action, people, supporters, dates, link, Support required, Confidential — with no comments, no history and no parts done; raised, it is a NEW action beside the original, which is unchanged; a closed action duplicates as Do; step 3 the panel opens over the dialog addressed to the action's assignees (never yourself), with a message naming the action and its due date that you can edit; the list under "Add a person…" shows LeanBoard people first and, after three letters and a pause, the directory; Tab and typing stay inside the panel; after sending it reports "✓ Sent by Teams…" (a failure says why and sends nothing) and the action's comments gain "Messaged <name> by Teams"; step 4 the comment line is still there — it was saved when the message went

### UAT-ACT-011 — An action tile shows what fits and says how many more
persona: assignee
modules: controls/ActionBoard/editor.ts controls/ActionBoard/tileFit.ts controls/ActionBoard/styles.ts
preconditions: a board (a meeting's or an initiative's) whose Action card holds more open actions in one kanban column than its tile can show, some with descriptions several lines long
steps:
1. Open the board and read the Action card's tile without opening it.
2. Make the browser window shorter, then taller.
3. Switch the card to the list view (open it, choose List, go back) and read the tile.
4. Open the card.
expected: step 1 each action's words stop at three lines; a column that holds more than fits shows whole cards only and ends "+N more" (N = the actions not shown), with no card cut through at the tile's bottom edge; a column that fits has no such line; step 2 the count follows the tile's height; step 3 the list ends "+N more" the same way; step 4 the opened card shows every action and scrolls, with no "+N more" — a tile still cannot be scrolled or clicked into
