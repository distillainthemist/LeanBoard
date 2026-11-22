# Ingestion runs — three gaps and a plan to close them

Ben asked (2026-11-22) what happens when an ingestion task fails midway.
Reading the run (`app/src/docs/ingestionScreen.ts`, `startRun`) turned up
three gaps. This is the plan for them. **Built 2026-11-22 (see "As built" at the
foot); on dev, not released.**

**App-only: no Dataverse schema change.** The task row already carries
what the plan needs (`ben_status`, `ben_logjson`, and the system columns
`modifiedon` / `modifiedbyname`, which the generated model exposes).

## How a run works today

- Run sets the task row to `running`, then works the ready files eight
  at a time: check the document ID, copy, check out, set status and
  dates, check in, publish, recycle the source.
- Each file ends as a log entry, `moved` or `refused` with its reason.
- The task row (the WHOLE row, with the whole log) is saved after every
  `moved` file and once at the end, when the status returns to `open`.
- A failed save is swallowed (`.catch(() => undefined)`).

## Gap 1 — refusal reasons can be lost

**Today.** A `refused` entry is only pushed onto the in-memory log. It
reaches Dataverse when a LATER file moves, or when the run ends. Close
the tab mid-run and the refusals since the last move are gone. The
files are still in the folder, so nothing is lost but the reasons.

**Found beside it.**
- The row is saved once per moved file with the whole log. On a
  2,000-file task (the cap) that is 2,000 saves of a log growing to
  about half a megabyte.
- The log column holds 1 MB. Two or three runs of a large task can pass
  it. The save then fails, silently, and the log stops being kept.
- The run saves the whole row, so it writes its own copy of the name,
  assignees and defaults over an edit a second controller made
  meanwhile.

**Plan.**
1. One saver for the run (`runSaver` in a new pure-tested module
   `docs/ingestionRun.ts`): every outcome, moved or refused, marks the
   log dirty. At most one save is in flight; a save is sent no more
   often than every 3 seconds; the last state always goes out.
2. The run's saves write `ben_status` and `ben_logjson` ONLY
   (`saveIngestionRun(rowId, status, log)` in `ingestionStore.ts`).
3. The log is kept inside its column: when it nears the limit, older
   entries for a file are dropped where a newer one exists (the screen
   already reads "latest per file"), and a long refusal reason is cut
   at 300 characters.
4. A save that fails is counted and said: the status line reads "The
   run log could not be saved (n tries). The files are still being
   ingested." It is retried on the next tick. The run does not stop.

**Effort:** 3–4 h.

## Gap 2 — two controllers can run the same task at once

**Today.** Nothing reads `running` before a run starts. The word only
paints a chip. A second controller can press Run while the first run is
in flight.

**What goes wrong.** No document is damaged: the second copy of a file
is refused with "already exists". But each run saves its own log over
the other's, so `moved` entries vanish, files show refusals that are
not true, and whichever run ends first sets the task back to Open while
the other is still working. End task and Cancel task are also open to
the second controller, and both recycle the folder under a live run.

**The other half.** A run that was interrupted (tab closed, connection
lost) leaves the task reading Running for ever. So "is it running?"
cannot be answered from the status alone.

**Plan.**
1. **A heartbeat.** The run's saver also saves every 30 seconds when no
   file has finished (a large file can take longer than that to copy).
   So while a run is alive the row's own `modifiedon` keeps moving, and
   `modifiedbyname` says whose run it is. No new column.
2. **Live or interrupted** (`runState(row, now)` in `ingestionRun.ts`,
   pure and tested):
   - `running` and saved within the last 3 minutes: **live**.
   - `running` and not saved for 3 minutes: **interrupted**.
   - To stay right when a PC clock is wrong, a screen that finds a task
     Running re-reads the row every 20 seconds and trusts the stamp
     MOVING over its own clock.
3. **A live run, seen by anyone else:** the chip reads "◐ Running —
   <name>". Run, End task, Cancel task and Edit are disabled with the
   tooltip "<name> is running this task". The grid is read-only: a
   detail changed mid-run would not reach a file the run has already
   read. The screen refreshes its files and log as the run saves.
4. **An interrupted run:** a line under the title, "The last run
   stopped before it finished (<name>, <time>). Files it had not
   reached are still here." The task is treated as Open: Run is
   offered, and the next save sets the status right.
5. **Two people pressing Run in the same seconds.** The SDK offers no
   conditional write, so: after writing `running`, the run waits two
   seconds and re-reads. If the row was written again by someone else
   in that time, this run stands down ("<name> started a run on this
   task a moment ago") and writes nothing more. The later writer is the
   one that proceeds, so exactly one run goes on.
6. **Other surfaces.** The Document-tasks panel's "◐ Running" pill
   (`docsScreen.ts`) follows the same rule, so an interrupted task
   stops reading Running there too.

**Effort:** 6–8 h.

## Gap 3 — an unexpected error locks the screen

**Today.** Every SharePoint call I checked returns its failure as a
refusal, so I found no route to this. But the run has no guard: if a
step THREW, the pool would reject, the screen would stay in its running
state (Esc and close are refused during a run), the row would stay
Running, and the other seven lanes would carry on unseen.

**Plan.**
1. Each file is wrapped: a throw becomes a `refused` entry, "Stopped by
   an unexpected error: <message>. Check <library> for a draft of this
   file." The other files carry on.
2. The run as a whole is wrapped in `try / finally`: whatever happens,
   the saver flushes, the status returns to Open, the buttons come
   back, and the status line says what finished.
3. `void startRun()` gets a catch that writes the error to the status
   line. Nothing fails silently.

**Effort:** 2 h.

## Offered with it, not one of the three

**Say which files already have a copy in the destination, before the
run.** After an interrupted run, a file that had been copied but not
checked in is refused on the next run with "already exists", and
someone has to find and discard the draft in the destination library.
The run could look first: one query of the destination for the names
in the folder, and the confirmation would list them — "3 files already
have a copy in <library> from an earlier run. Discard those drafts
first, or these will be refused." It needs no stored state.

A step further, resuming the leftover draft in place, is possible but
is a judgement on a file the app did not just create. Not proposed.

**Effort:** 3 h. Say if you want it in.

## Decisions for Ben

| # | Decision | Recommendation |
|---|---|---|
| 1 | How long without a heartbeat before a run counts as interrupted | 3 minutes |
| 2 | What a second controller may do during a live run | Read only: no Run, End task, Cancel task, Edit, or grid edits |
| 3 | May an assignee still ADD files to the folder during a run | Recommended yes. **Ben, 2026-11-22: NO — an assignee cannot add new files.** |
| 4 | Include "already has a copy in the destination" in the confirmation | Yes |

## Tests and UAT

- `ingestionRun.test.ts`: the saver (one in flight, the 3-second floor,
  the last state goes out, a failed save retried and counted), the log
  trim, `runState` (live, interrupted, a clock that is wrong), the
  stand-down rule.
- The harness cannot reach SharePoint, so the run itself is checked on
  dev. Two new UAT cases in `docs/uat/documents.md`:
  - a refused file's reason survives closing the tab mid-run;
  - a second controller opening a running task, and a task whose run
    was interrupted.
- Gap 3 has no honest manual test (nothing is known to throw). It is
  covered by a unit test of the wrapper with a step that throws.

## Order and release

1. Gap 3 (smallest, and it makes the other two safe to work on).
2. Gap 1.
3. Gap 2.
4. The destination check, if wanted.

About 11–14 h, or 14–17 h with the destination check. One app-only
release. An older build has no heartbeat, so its runs would read as
interrupted after three minutes to a newer build: "Lock every older
build" after the install, as usual.

## As built (2026-11-22, on dev, NOT released)

Ben agreed decisions 1, 2 and 4 and set 3 to "an assignee cannot add
new files". Built in the order planned, with the destination check.

- **`docs/ingestionRun.ts`** (new, pure, tested): `runSaver`,
  `trimLog`, `runState`, `readsRunning`, `stampAgeMs`, `startedEntry`,
  `lastStart`, `claimHeld`, `alreadyThere`, `nameList`.
- **Gap 3.** Each file is wrapped: a throw is logged as "Stopped by an
  unexpected error: … Check <library> for a draft of this file." The run
  sits in `try / finally`: the saver flushes, the status returns to
  Open, the buttons come back, and the line says "The run stopped: …"
  with what finished before it. The Run button's handler catches too.
- **Gap 1.** Every outcome touches the saver: one save in flight, a
  3-second floor, the last state always sent. `saveIngestionRun` writes
  `ben_status` and `ben_logjson` only, the log trimmed to 900,000
  characters (reasons cut at 300; outcomes a later one replaced go
  first). A failed save shows "The run log could not be saved (n
  tries). The files are still being ingested." and is retried.
- **Gap 2.**
  - *Whose run:* a run pushes a `started` entry (who, when) onto the
    log as it claims the task. A new `outcome` value, not a column. It
    is no file's outcome (`latestByFile`, `logSummary` skip it) and a
    closed task's log prints it as "▶ Run started (name, time)".
  - *Heartbeat:* the saver saves every 30 s when nothing has finished.
    `IngestionTask.modifiedOn` carries the row's own stamp.
  - *Live or interrupted:* `runState`. A sheet that finds the task
    Running re-reads it every 20 s; a stamp SEEN to move is trusted
    over the PC's clock; a stamp 3–15 minutes old is watched for 40 s
    ("Checking whether the run is still going…") before it is called.
  - *Someone else's live run:* chip "◐ Running — <name>", a line under
    the hint, and Run, End task, Edit task, Open folder, Set for
    selected, Fill blanks, Upload sheet and Save are `inert`; the
    grid's rows are `inert` (the grid still scrolls). The sheet
    refreshes as the other run saves.
  - *Interrupted:* "The last run stopped before it finished (<name>,
    last active <time>). Files it had not reached are still here." Run
    is offered. Nothing is written until the next run or End task.
  - *The claim:* Run checks for a live run before the confirmation and
    again after it; writes Running with its mark; waits 2 s; reads the
    row back; stands down if the last mark is not its own.
  - *Elsewhere:* End task checks first. The task editor's Save and
    Cancel task refuse during a live run and adopt the row's status and
    log before writing. The Document-tasks pill reads Running only
    while the row is fresh (`readsRunning`).
- **Decision 3, as built.** The app holds its own roads during ANY run,
  its own included: Open folder and every edit control. SharePoint
  itself still accepts a file dropped straight into the folder; the app
  cannot stop that. Such a file is not ingested, stays in the grid, and
  the run's last line says "n files were added to the folder during the
  run and were not ingested."
- **The destination check.** Before the confirmation: up to 40 ready
  files are each asked for in the destination; more, and the
  destination's top folder is listed (up to 10,000 entries). The
  confirmation names what is already there. It sees only what the
  running account can see — a file another person copied and never
  checked in is hidden from everyone else by SharePoint.
- **Not seen running.** The harness cannot reach SharePoint, so the run
  itself has only been read and typechecked. The pure parts carry 25
  tests. Ben's checks on dev: UAT-DOC-095 (a run cut short), 096 (two
  controllers; needs a second person), 097 (leftover copies).
- **For the release.** App-only. An older build writes no heartbeat and
  no start mark: its run reads as interrupted to a newer build after
  three minutes. Lock older builds after the install.
