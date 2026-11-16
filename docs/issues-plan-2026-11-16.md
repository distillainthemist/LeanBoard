# Issues plan — 2026-11-16 export (13 issues, v0.93.0)

Source: `leanboard-issues-2026-11-16.pdf` (Sue Vallance and Ben, filed
2026-11-16 against v0.93.0). Analysis read from the code at 5a4ee52;
nothing here was reproduced in the player. Decisions are Ben's, taken
one by one on 2026-11-16.

Status: PLAN — not built.

## Decisions of record

| # | Question | Decision |
|---|----------|----------|
| 1 | Primary initiative archived | The priority drops to "no primary" and flags the owner. Nothing is chosen for them. |
| 1 | A COMPLETED primary | Keeps headlining, marked completed. Only archived, unlinked or deleted initiatives drop away. |
| 5, 11 | Who edits actions from the priority popup | Whoever could edit that action on its own initiative board. |
| 7 | What a supporter is | Named on the action, sees it (My day "Supporting", confidential visibility), owes no part. |
| 8 | Objectives with no primary | The owner picks metrics from the linked initiatives; the choice is stored on the priority. |
| 8 | Staying without a primary | Auto-claim stops entirely. An initiative becomes primary only when someone stars it. |
| 9 | Session memory | Site and year are remembered for the session and SHARED by Priorities and Improvement. Reset on app start. |
| 10 | Editing a comment | The author may edit or delete for 24 hours, then it locks. |
| 12 | Directory add in pickers | Admins only, in every picker (the 2026-10-02 rule stands and is extended). |
| 13 | Who proposes | Owner and site admins add as accepted. The owner's direct reports add as PROPOSED. |
| 13 | Declined proposals | Kept on record with a reason; can be proposed again. |
| 13 | Direct reports and accepted priorities | Everything as today. |
| 4 | A past year shows | The structure as it was: that year's pillars, names, placement and priorities. Ratings and metrics stay current. No year-end snapshot. |
| — | Packaging | Everything in one solution-carrying release; schema to dev up front. |

Assumptions I made where no question was asked — veto any of them:

- Deleting a comment inside its 24 hours removes it outright (no
  "removed" placeholder).
- Comments written before this release carry a date, not a time. They
  can be edited only on the day they were written.
- A direct report's "Pull from above" also lands as proposed.
- With no primary, the metric picker offers initiatives linked directly
  AND those inherited through child priorities (inherited ones tagged).
- A supporter's manager gets no view of a confidential action (the
  "leaders" rule stays for the accountable person only).
- Several owners read "Vallance, Colin & Williams, Thomas", two names
  then "+N" with the rest in the tooltip.

## Schema (deployed to dev first — Ben signs in for the device code)

| Table | Column | For |
|-------|--------|-----|
| `ben_ltkaction` | `ben_supportersjson` memo(4000) | 7 |
| `ben_ltkpriority` | `ben_objectivesjson` memo(4000) | 8 |
| `ben_ltkpriority` | `ben_placementsjson` memo(4000) | 4 |
| `ben_ltkpillar` | `ben_succeedsid` text(40) | 4 |

`data/schema.mjs`, `node data/deploy-schema.mjs`, then
`pac code add-data-source -a dataverse -t` for the three tables. All
additive: a row without the column behaves as today. Production imports
the managed solution before the app package. Nothing else to do there.

Stale clients: a pre-release bundle reads the new priority status
"proposed" as "active" (`store/priorities.ts:130`). The release raises
the release gate's minimum build so no old client keeps running.

## Tranche 1 — boards (issues 2, 3)

**2. Cards empty on an initiative board, for one person.** "Live board"
is a per-browser switch (`localStorage` `ltk.liveTiles`,
`screens/board.ts:61,486`). Off, the grid draws stored snapshots
(`setLiveRenderer(null)`, `:509`); an initiative board has none, so each
tile shows its card type (`ltk-bg-nosnap`, `BoardGrid/editor.ts:425`).
On an initiative board the button always reads "Live board" and opens
the gate list (`:495-498, :544`), so it cannot be switched back there;
`refreshBoardActions` also returns early (`:564`).
Workaround today: open any ritual board, click "Stored board".

- An initiative board ignores the switch: live whenever the living
  board is shown, stamped rows only when a gate is picked.
- `refreshBoardActions` follows the same rule.
- Stored mode with no snapshot says "No stored snapshot" in place of
  the card type name.

**3. False "Nothing recorded yet".** `noData` is "no stored tile svg for
this card" (`store/tiles.ts:40`), not "the live card is empty". A
charter filled from the initiative's header has no row of its own.

- In live mode the line comes from the live card: a bound CanvasCard or
  LinksCard is empty only when none of its bound fields has a value
  (the LinksCard working-folder special case at `board.ts:660` becomes
  the general rule, through the pure helper in
  `controls/CanvasCard/draft.ts`).

Size S. UAT: IMP (initiative board with Live off), RIT.

## Tranche 2 — actions (issues 10, 7, 5 + 11)

**10. Edit a saved comment.** `ActionComment` has no id and a date-only
`when` (`shared/schema/actions.ts:120-125`); `buildCommentField`
(`actionUi.ts`) is add-only.

- Comments gain `id`, `at` (ISO time) and `editedAt`; all three join the
  `sanitizeAction` whitelist (or they are stripped on the next read).
- One pure rule `canEditComment(c, viewer, now)`: the author, within 24
  hours of `at` (date-only comments: the day written).
- The author's own rows get edit and delete; changes are staged and
  applied with the dialog's Save, like new comments. "edited" shows on
  the meta line.
- `upsertActions` merges comments by id against the stored row before
  writing — today two people saving the same action lose one side's
  comments.
- The Escalation viewer's comment dialog writes through `newComment`.

Size S–M, no schema.

**7. Supporters.** `assignees` is the only people list and every rule
treats its members as owing a part.

- `supporters?: {whoId, who}[]` on `LtkAction`, stored in
  `ben_supportersjson`.
- A "Support" row under "Who" in the action dialog: several people, the
  same search, never also the assignee.
- Shown on list rows, board cards, the Gantt tooltip and export, and
  the hub ("support …").
- INCLUDED for supporters: the hub's "mine" read
  (`actionsForViewer`), a separate "Supporting" group with no tick, the
  confidential visible set (`visibleSetFor`, `actionVisibleTo`).
- NOT for supporters: `settleFromParts` / `isComplete` and every done
  flag, the overdue badge and My day to-do, the "my part" tick, the
  org-scope open list, endorsement rights.

Size M, schema.

Found on the way, NOT in this plan unless wanted: an action raised with
several assignees (the Agenda card does this) loses all but the chosen
one when opened and saved in the dialog (`buildActionForm.apply`).

**5 + 11. The priority popup's Actions tab.** It mounts the bare Gantt
component with no `onEdit` (`priorities/lifecycle.ts:1136`), so a list
row falls to "Set dates" (`improvement/gantt.ts`) and there is no
kanban.

- Mount `ActionBoardEditor` there as `cardRegistry.ts` does: List,
  Kanban, Gantt, the full dialog, Add action (link targets = the linked
  initiatives' boards).
- The card learns sections: List grouped by initiative, an initiative
  tag on kanban cards. The Gantt keeps its org scope.
- The card gains an assignee filter on List and Kanban (today only the
  Gantt has one), so the popup loses nothing.
- Edit rights per action follow the action's own initiative board, not
  the priority's org.
- Writes go through `upsertActions`, changed rows only.
- The Improvement tab's Gantt gets `onEdit` too (same gap,
  `improvementTab.ts:216`).

Size M, no schema. Touches `controls/` (root typecheck).

## Tranche 3 — the priority popup and screen (issues 1, 6, 8, 9)

**1. Archived primary.** The Initiatives list is status-aware
(`initiativesByPriority` keeps active only), the primary path is not:
`metricState` covers every initiative and `mountPrimaryCard` /
`mountPrimaryCommentary` look the id up without checking status.

- One pure rule `livePrimaryId(p, initiatives)`: the stored id counts
  only while that initiative is still linked to the priority and is
  active or completed.
- Applied at every reader: objectives row, dynamic card, poster, edit
  dialog label, popup header, the star row, Charter, Metrics,
  Commentary.
- The Initiatives tab says "The primary initiative “X” was archived —
  star another, or restore it", with Clear. The stored id is kept, so
  Restore brings it back.
- A completed primary shows a "completed" tag.

**6. Only the first owner shown.** `(i.roles.owner ?? [])[0]`
(`prioritiesScreen.ts:514`).

- One helper `ownersLabel(i)` used at the popup row, the Improvement
  list and wall, and the action dialog's link detail.

**8. No primary initiative.**

- Auto-claim removed (`setPrimaryInitiative(..., true)` callers at
  `improvementTab.ts:930`, `editDetails.ts:206`). Existing primaries are
  untouched; a new priority has none until someone stars one.
- `Priority.objectives: {initiativeId, metricKey}[]` in
  `ben_objectivesjson`.
- One selector `objectivesFor(p, livePrimary, metricState)`: a live
  primary gives its starred metrics as today; otherwise the picked
  pairs, dropping any whose initiative is no longer linked.
- Popup: with no live primary the Charter and Commentary tabs are not
  shown, and Metrics is a picker (each linked initiative, its metrics
  with plan, actual and light, a tick; managers only).

**9. Jumping back to own site and current year.** Every hash change
remounts the screen from defaults (`prioritiesScreen.ts:322-336`,
`improvementTab.ts:118-178`).

- A UI-free module holds the session view in module state (gone on app
  start, by construction): shared `{site/org, year}`, plus each
  screen's own filters (status, pillar; Improvement's view mode and
  search).
- Card mounts and share links keep their own start; the remembered org
  is validated against the tree.
- Cleared when the profile's site changes or View as changes.
- The popup's tab is remembered with the board origin, and the
  Charter / Metrics / Commentary "Open board" links pass the priority,
  so Back reopens the popup where it was — including under another
  site or year, which fails today.

Size M overall, schema for 8.

## Tranche 4 — the priority model (issues 13, 4, 12)

**13. Proposed priorities.** `ben_status` text(20) carries the new
value; no column needed.

- `PriorityStatus` gains "proposed". `canApproveAt` = `canManageOrg`
  without the direct-report clause (super admin, the site's admin,
  owners up the tree). `canManageOrg` stays "may add".
- Add and Pull by someone who is not an approver land as proposed.
- Matrix: a "Proposed" row under Objectives — absent when empty,
  collapsed to a per-column count chip by default, dashed cards when
  open. A header chip "N proposed".
- Popup: a Proposed pill; Accept and Decline (with a reason) for
  approvers. Decline = archived with the reason and a "declined" event;
  "Propose again" returns it.
- Proposed priorities are skipped by: `visibleFor` (every status
  filter), `makeRagsFor`, `ganttFor`, `initiativesFor` (descendant
  walks), the walk, poster and tile; `effectiveEnd` treats proposed as
  open; `parentClosed` ignores a proposed parent.
- The two Reopen doors exclude proposed (or any direct report could
  "reopen" a proposal into an accepted priority).
- Initiatives may link to a proposed priority (form picker tags it
  "(proposed)"; the popup's Add initiative is allowed).

**4. Pillars per year.** Pillars already carry `fromPeriod` /
`toPeriod`, but a priority has one sub-pillar for life, a rename
rewrites every year, the dialog offers sub-pillars from any year, and a
past year hides whatever has since completed.

- Settings → Priorities → Strategic pillars gets a YEAR lens: the set
  live in the chosen year, others behind "Other years".
- Removing a pillar that priorities reference becomes "End after
  <year>"; a hard delete only when nothing references it.
- Rename or re-parent of a row with history asks "From <year>" (the old
  row ends, a successor starts and names it in `ben_succeedsid`) or
  "Fix everywhere".
- A priority's earlier homes live in `ben_placementsjson`; the lookup
  stays its current home. One resolver `pillarIdIn(p, year)`, which
  also follows the successor chain. Changing the sub-pillar of a
  priority that started in an earlier year asks "Move from <year>" or
  "Correct for every year".
- The add / edit dialog offers the sub-pillars live in the viewed year.
- A past year shows what was live THEN: status is read as of that year.
- Health-check history and the Priorities card's rotation focus follow
  the successor chain.

Unverified: what Dataverse does to priorities when a referenced pillar
row is deleted. The guard above makes the question moot.

**12. Directory add in pickers.**

- One module `people/directoryAdd.ts` replaces five copies of "search
  the directory, add, select": admins only, a site admin pinned to
  their own site, never overwriting an existing row.
- Offered in: initiative role pickers (Create, Edit details, the
  charter card's bound roles, the multi-person picker), the priority
  owner picker, and the action dialog's search (through a host
  provider).
- Fixes two defects in the priority owner copy: a revoked person found
  in the directory was re-activated with site and role reset; a site
  admin's add landed at the priority's org instead of their own site.
- Each role picker is titled by its role (all read "Choose the owner"
  today).

Size L overall, schema for 4.

## Order of work

1. Schema to dev (one sign-in), data sources regenerated.
2. Tranche 1, push to dev.
3. Tranche 2, push to dev.
4. Tranche 3, push to dev.
5. Tranche 4, push to dev.
6. Release on "Cut the release": solution-carrying, with the due-date
   moves round and the Settings empty-row fix already on dev.

Every tranche carries its tests and UAT cases in the same commit.
