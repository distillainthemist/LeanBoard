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
3. Open the same action again and read "Due date moves"; read the action's card on the kanban and its row on My day.
4. Open it again, set the due date three days EARLIER and Save.
5. On the ritual board open its action from the Action card, set the due date a week later and Save. Do the same to an initiative action opened from another card on the initiative board (a 5 Whys or the agenda).
6. Raise a new action with no due date, save it, open it and give it a due date.
expected: step 1 the dialog stays open and asks "Why is this moving?" under the comments, showing the old and new dates and a list of the organisation's reasons ending in "Other", with nothing chosen for you; step 2 Cancel closes the question only — the dialog is still open and nothing was saved; Move date with nothing chosen says "Choose a reason."; "Other" with no note says "Say what the reason is."; with the note the dialog closes and the new date shows; step 3 "Due date moves · 1" lists the move with its dates, "Other — <your note>", your name and today's date, and the card and the My day row carry "↷ 1" whose tooltip names the move and the reason; step 4 it saves with no question and the list gains a second line reading "Brought forward" (the ↷ count stays 1); step 5 the ritual's action saves with no question — its move is still listed when reopened, as "No reason recorded", and its card shows ↷ 1 — while the initiative action asks why from the other card exactly as it did from the Action plan; step 6 a first due date asks nothing and records nothing

### UAT-ACT-004 — The Gantt follows the same rule
persona: owner
modules: improvement/gantt.ts shared/schema/reschedule.ts shared/ui/reschedulePrompt.ts actions/reschedule.ts
preconditions: Settings → Improvement → Due date changes on "Initiative actions only"; an initiative with dated actions; a ritual board whose Action card holds dated actions
steps:
1. On the initiative's Gantt drag an action's bar a week to the right. Read the dialog, press Cancel.
2. Drag it again, choose a reason, add a note and press Move date. Open the action and read "Due date moves".
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
preconditions: an action assigned to person A; person B and person C on the roster; B able to sign in
steps:
1. Open the action. Under "Support (optional)" type part of B's name, pick B; add C the same way; remove C with its ✕; Save.
2. Read the action's row in the list view, its card on the kanban, its line on the Gantt, and the Gantt's CSV export.
3. As B, open the hub: read My day, the Actions tab's badge and list, and the group at its foot.
4. As B, open the action from "Supporting". As A, complete it.
5. Make the action confidential. As B, find it again. As B's manager (not otherwise involved), look for it.
6. Open the action, pick B as the person it is assigned to, and Save.
expected: step 1 the search offers people not already chosen and each choice becomes a chip; step 2 the list row reads "support: B", the kanban card shows ＋1 with B in its tooltip, the Gantt line and the export's Support column name B; step 3 the action is NOT in B's My day, does not count in the Actions badge or the overdue filter of B's own list, and sits under "Supporting · 1" with no tick; step 4 B can open and comment; the action closes when A completes it — B owed nothing; step 5 B still sees the confidential action, B's manager does not; step 6 B is now assigned and no longer listed in support (nobody is both)
