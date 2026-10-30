# Actions raised on an initiative board landing personal and unlinked — review (2026-10-30)

Ben, 2026-10-30: reports continue of an action added via "＋ Action" on an
initiative board ending up on the person's own list and unlinked from the
initiative. A code trace of every road an action takes from a button to
the row, at v0.84.0 + the 2026-10-30 commits. Nothing changed yet.

## The roads

There are THREE "＋ Action" buttons a person on an initiative board can
mean, and they do not share a path:

| Road | Where | Key the action starts with | Who stamps the board and initiative |
|---|---|---|---|
| **A. The card's title-bar ＋ Action** (focused card, `#/edit/init-…/…`) | `screens/cardEditor.ts:628` → `openActionManager` → `openActionDialog` | `""`, mapped to the card's key `init-<id>:<card>` at save (`pushActions`) | `upsertActions(set, sourceBoardId)`: board from the caller, initiative from `initiativeIdForBoard(home)` |
| **B. The top bar's ＋ Add action** (anywhere, including the board overview `#/board/init-…`) | `actions/quickAdd.ts` → `openActionDialog({ linkToOpenBoard: true })` | `hub:<who>` — PERSONAL until the dialog links it | `upsertActions([action])` with NO board: everything comes from the key the dialog left |
| **C. A card's own element** (a RACI cell, a risk, a fishbone cause) | `cardRegistry.ts:435` → `openActionManager` | `""`, stamped by the mounter's `stamped()` | as A |

Road A is sound: whatever the dialog shows, an untouched save keeps or
gets the card key, the store stamps `ben_boardid` from the caller and
`ben_initiativeid` from the board, and even an unstamped row is found by
`actionsForInitiatives` through its `init-` prefix and healed. Road C
likewise. **Road B is the one that can land personal and unlinked**, and
the top-bar button sits over an initiative board exactly where a person
would call it "the + action button on an initiative board".

## How road B loses the initiative

Quick add creates the action as personal (`hub:<who>`) and relies on the
dialog's "Linked to" field to move it onto the open board. That default
is applied in `buildLinkField` (`shared/ui/actionUi.ts:661`):

```
if (o.isNew && o.linkToOpenBoard === true && c.openBoardId !== null) {
  const open = c.targets.find((t) => t.boardId === c.openBoardId);
  if (open) chosen = open;
}
```

So the open initiative is linked only if it is in the viewer's TARGET
LIST, and only once that list has loaded. Each of these leaves the action
personal, with no error and no board to stamp from:

1. **The initiative is not "active".** `visibleInitiatives()`
   (`actions/linkTargets.ts`) keeps `status === "active"` only. A
   completed or archived initiative's board still opens, its cards still
   raise actions (road A works), but quick add there lands personal.
2. **The initiative is confidential and the viewer is not a role-holder,
   an owner of its organisation, or an admin** (`canSee`). They may well
   be looking at the board (board visibility is a separate rule); quick
   add lands personal.
3. **The target list is stale.** It is cached 60 s, keyed by the change
   versions of boards, initiatives and people. An initiative created in
   this session bumps the version; one created by SOMEONE ELSE in the
   last minute, or a board a colleague just gave the viewer a role on,
   is not in the list yet.
4. **The save races the list.** The link field reads "Loading…" while
   `loadTargets()` runs four reads (boards, initiatives, the viewer,
   archived sites). Save is enabled the whole time. A quick typist who
   types the issue and presses Save before the list lands saves with
   `chosen === undefined` and `origin === null`, so nothing moves and
   the `hub:` key stands. On a slow connection this is seconds.
5. **The route is not a board.** `openBoardId` knows `#/board/<id>` and
   `#/edit/<id>/…`. From the Improvement tab, the hub or Priorities the
   default is personal by design — but a person who opened the
   initiative from a Teams link that lands elsewhere may think they are
   "on" it.

In every case the dialog shows "Personal — not linked to a ritual or an
initiative." under the issue box, with a search field. People read past
it: they pressed ＋ while looking at the initiative.

Then `upsertActions([action])` is called with no board id. `boardOf`
reads the key; a `hub:` key gives "", so no initiative id is stamped;
`stampedBoard` writes `ben_boardid = ""`. The row carries
`ben_source = "leanhub"`. `actionsForInitiatives` never sees it (no
initiative id, no `init-` prefix), the initiative's Action plan and the
ActionBoard card on the board never see it, and `actionsForViewer` shows
it on the person's own list. That is the reported symptom.

## Two more things the trace found

6. **Unlinking on an initiative board is silently undone — halfway.**
   On road A, if the person presses the chip's ✕ (the chip may read
   "Initiative · not available to you" when the initiative is outside
   their target list, which invites exactly that click), `applyLink`
   makes the action personal (`hub:<who>`, initiative id deleted). The
   store then runs `boardOf(action, boardId)` with the CALLER's board,
   sees `init-`, and re-stamps `ben_initiativeid` — while `stampedBoard`
   writes `ben_boardid = ""` because the key is personal. The row is
   personal by key, linked by initiative id: it shows on My day AND on
   the initiative, and the chip reads "Personal" next time. Not the
   reported bug, but the same code and the opposite confusion.
7. **"Not available to you" is the only word the dialog has** for an
   initiative outside the target list (`linkLabel`). It cannot name the
   initiative, because the list is the only source of titles. A person
   raising an action on a completed or confidential initiative's board
   sees that chip and reasonably doubts the link.

## A check Ben can run now

The row says which road it came from. For a reported action, read
`ben_source` (and `ben_instanceid`) in Dataverse or the action's
details: `leanhub` with a `hub:` key is road B (findings 1–5); `card`
with a `hub:` key and an initiative id is finding 6; `card` with an
`init-…` key is road A and would be a different problem (none found).

## Proposed fixes (about half a day, app-only)

1. **Quick add on an initiative board links to the board, not to the
   list.** When `openBoardId` starts with `init-` and the list has no
   matching target, link to the board directly: a synthetic target
   `{kind: "initiative", boardId: openBoardId, id: ""}` so `applyLink`
   writes the board's channel key; the store's own stamp then fills the
   initiative id from the board, as it does for road A. The same for a
   ritual board (`kind: "ritual"`). The link no longer depends on
   status, confidentiality or cache.
2. **Save waits for the link.** While the link field is loading, Save
   is disabled with "Linking…" — or, simpler and safer, the default
   link is applied at SAVE time from `openBoardId` when the list has
   not resolved, so a fast save cannot lose it.
3. **The store stamps the initiative from the action's own key, never
   from the caller's board when the key is personal.** In
   `upsertActions`: `home = homeBoardOf(action.instanceId) || boardId`
   only when the key is not `hub:`. An unlinked action stays unlinked
   (finding 6); an action with an `init-` key keeps the stamp.
4. **Name the initiative the viewer cannot see.** The link context
   carries the OPEN board's title (from the board row) so the chip can
   read "Initiative · Reduce dross loss" rather than "not available to
   you", with the ✕ still offered.
5. **A backstop for rows already written** (optional): a one-off repair
   in Settings → Improvement listing `leanhub`-sourced personal actions
   whose creator was on an initiative board at the time cannot be known;
   skip — but finding 6's rows can be listed (personal key with an
   initiative id) and either relinked or truly unlinked.

The one-write-path rule holds: fixes 1, 2 and 4 are the dialog's
defaults; fix 3 is the store's one stamp rule applied consistently.
