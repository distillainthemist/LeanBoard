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
