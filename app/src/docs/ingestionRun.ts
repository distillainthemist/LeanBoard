// Document ingestion — what keeps a RUN honest
// (ingestion-run-hardening-plan-2026-11-22.md). Pure but for the
// saver's timers: no DOM, no SharePoint, no SDK — tested in node.
//
//  - the run's saver: every outcome is saved as it happens, one save at
//    a time, no more often than every three seconds, and a heartbeat
//    when nothing has finished — so the task row's own last-modified
//    stamp says a run is alive;
//  - the log kept inside its column;
//  - live or interrupted: a task that reads Running is only running
//    while that stamp keeps moving;
//  - whose run it is, and which of two runs started in the same seconds
//    stands down.

import type { IngestionStatus, RunLogEntry } from "./ingestionModel";

/** No more than one save of the run's log in this time. */
export const RUN_SAVE_FLOOR_MS = 3000;
/** With nothing to save, the row is still written this often: the
 *  heartbeat (one large file can copy for longer than this). */
export const RUN_BEAT_MS = 30000;
/** A Running task not written for this long was interrupted (Ben,
 *  2026-11-22: three minutes). */
export const RUN_STALE_MS = 180000;
/** Older than this by the PC's clock, the stamp needs no second look. */
export const RUN_SURELY_STALE_MS = 15 * 60000;
/** How long a screen watches a doubtful stamp before calling it — a
 *  little over one heartbeat. */
export const RUN_WATCH_MS = 40000;
/** How often a screen that found a task Running reads it again. */
export const RUN_POLL_MS = 20000;
/** How long a run that has just claimed the task waits before it
 *  checks that the claim is still its own. */
export const RUN_CLAIM_WAIT_MS = 2000;

/** The log column holds 1,048,576 characters; kept well inside it. */
export const LOG_MAX_CHARS = 900000;
/** A refusal's reason is cut here in the stored log. */
export const LOG_DETAIL_MAX = 300;

// ---- the log, kept inside its column --------------------------------------

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** The log as it is stored: reasons cut to a readable length and, when
 *  it would pass the column, the oldest entries a newer one has
 *  replaced dropped first (the screen reads "latest per file"), then
 *  the oldest of what is left. The newest entries always survive. */
export function trimLog(log: RunLogEntry[], maxChars = LOG_MAX_CHARS): RunLogEntry[] {
  let out = log.map((e) => (e.detail.length > LOG_DETAIL_MAX ? { ...e, detail: cut(e.detail, LOG_DETAIL_MAX) } : e));
  const size = (list: RunLogEntry[]) => JSON.stringify(list).length;
  if (size(out) <= maxChars) return out;
  // superseded: an earlier outcome for a file that has a later one, and
  // every "started" mark but the last
  const lastAt = new Map<string, number>();
  out.forEach((e, i) => lastAt.set(e.outcome === "started" ? "\u0000started" : e.file, i));
  const superseded = out.map((e, i) => lastAt.get(e.outcome === "started" ? "\u0000started" : e.file) !== i);
  const kept: RunLogEntry[] = [];
  let over = size(out) - maxChars;
  out.forEach((e, i) => {
    if (over > 0 && superseded[i]) {
      over -= JSON.stringify(e).length + 1;
      return;
    }
    kept.push(e);
  });
  out = kept;
  while (out.length > 1 && size(out) > maxChars) out = out.slice(Math.ceil(out.length / 10));
  return out;
}

// ---- whose run, and is it alive ------------------------------------------

/** The mark a run writes as it starts: who and when. */
export function startedEntry(by: string, at: string): RunLogEntry {
  return { file: "", outcome: "started", detail: "Run started", at, by };
}

/** The last run's start mark, null when the log has none (a run made by
 *  a build older than 2026-11-22). */
export function lastStart(log: RunLogEntry[]): RunLogEntry | null {
  for (let i = log.length - 1; i >= 0; i--) if (log[i].outcome === "started") return log[i];
  return null;
}

/** Is the claim on the row still this run's? Two people pressing Run in
 *  the same seconds each write their mark; the later write is the row's,
 *  and the earlier run stands down when it reads it back. */
export function claimHeld(log: RunLogEntry[], mine: RunLogEntry): boolean {
  const last = lastStart(log);
  return last !== null && last.at === mine.at && last.by === mine.by;
}

/** How old a row's last-modified stamp is by this PC's clock (ms);
 *  null when there is none to read. */
export function stampAgeMs(modifiedOn: string | undefined, now = Date.now()): number | null {
  const t = Date.parse(modifiedOn ?? "");
  return Number.isFinite(t) ? Math.max(0, now - t) : null;
}

/** The stamp a run's life is read from: the row's own last-modified
 *  time, which the heartbeat keeps moving. Should a read ever come back
 *  without it, the newest time in the log stands in (a start mark or a
 *  file's outcome) — coarser, but never "no stamp", which would let a
 *  live run read as interrupted. */
export function runStamp(modifiedOn: string | undefined, log: RunLogEntry[]): string {
  if ((modifiedOn ?? "") !== "") return modifiedOn as string;
  let newest = "";
  for (const e of log) if (e.at > newest) newest = e.at;
  return newest;
}

/** For a list that cannot watch (the Document-tasks panel): does this
 *  task read as running RIGHT NOW? Running, and written inside the
 *  stale time. */
export function readsRunning(status: IngestionStatus, modifiedOn: string | undefined, now = Date.now()): boolean {
  const age = stampAgeMs(modifiedOn, now);
  return status === "running" && age !== null && age < RUN_STALE_MS;
}

export type RunState = "idle" | "live" | "checking" | "interrupted";

export interface RunWatch {
  status: IngestionStatus;
  /** How old the row's last-modified stamp is by THIS PC's clock (ms);
   *  null when the stamp could not be read. */
  stampAgeMs: number | null;
  /** How long this screen has been watching the task (ms). */
  watchedMs: number;
  /** How long since this screen last SAW the stamp change (ms); null
   *  when it has not seen it change. */
  sinceMoveMs: number | null;
}

/** Live, interrupted, or not yet known. A PC clock can be wrong, so a
 *  stamp this screen has SEEN move is trusted over its age:
 *   - seen to move within the stale time: live;
 *   - seen to move, then still for the stale time: interrupted;
 *   - never seen to move: young by the clock, live (until watched still
 *     for the stale time); very old, interrupted; in between, watched
 *     for a little over one heartbeat before it is called. */
export function runState(w: RunWatch): RunState {
  if (w.status !== "running") return "idle";
  if (w.sinceMoveMs !== null) return w.sinceMoveMs < RUN_STALE_MS ? "live" : "interrupted";
  if (w.stampAgeMs === null) return w.watchedMs < RUN_WATCH_MS ? "checking" : "interrupted";
  if (w.stampAgeMs >= RUN_SURELY_STALE_MS) return "interrupted";
  if (w.stampAgeMs < RUN_STALE_MS) return w.watchedMs < RUN_STALE_MS ? "live" : "interrupted";
  return w.watchedMs < RUN_WATCH_MS ? "checking" : "interrupted";
}

// ---- the run's saver ------------------------------------------------------

export interface RunSaver {
  /** Something changed: it is saved soon. */
  touch: () => void;
  /** Save what is unsaved now and wait for it (one try). */
  flush: () => Promise<void>;
  /** No more saves or heartbeats. */
  stop: () => void;
  /** Saves that have failed since the last one that worked. */
  failures: () => number;
}

export interface RunSaverOpts {
  save: () => Promise<void>;
  /** A save failed (`n` in a row) or, with n = 0, worked again. */
  onHealth?: (n: number, err: unknown) => void;
  floorMs?: number;
  beatMs?: number;
}

/** One save in flight at a time; a change is saved no sooner than
 *  `floorMs` after the last save began; with no change for `beatMs` the
 *  row is saved anyway. A failed save keeps what it had to say and is
 *  tried again at the next tick — the run itself never waits on it. */
export function runSaver(o: RunSaverOpts): RunSaver {
  const floor = o.floorMs ?? RUN_SAVE_FLOOR_MS;
  const beat = o.beatMs ?? RUN_BEAT_MS;
  let dirty = false;
  let stopped = false;
  let inFlight: Promise<void> | null = null;
  let lastSend = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failed = 0;

  const send = (): Promise<void> => {
    dirty = false;
    lastSend = Date.now();
    const p = o
      .save()
      .then(() => {
        if (failed > 0) o.onHealth?.(0, null);
        failed = 0;
      })
      .catch((err) => {
        failed++;
        dirty = true; // what it had to say is still unsaid
        o.onHealth?.(failed, err);
      })
      .then(() => {
        inFlight = null;
        arm();
      });
    inFlight = p;
    return p;
  };
  const arm = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (stopped || inFlight !== null) return;
    const wait = Math.max(0, lastSend + (dirty ? floor : beat) - Date.now());
    timer = setTimeout(() => {
      timer = null;
      if (!stopped && inFlight === null) void send();
    }, wait);
  };
  arm();
  return {
    touch: () => {
      dirty = true;
      arm();
    },
    flush: async () => {
      const disarm = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
      };
      disarm();
      if (inFlight !== null) await inFlight;
      // the save that just ended re-armed the timer: this one goes now
      disarm();
      if (dirty && inFlight === null) await send();
    },
    stop: () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
    failures: () => failed,
  };
}

// ---- a throttled call is tried again ---------------------------------------

/** The waits before the second, third and fourth try of a throttled
 *  call (Ben, 2026-11-22). */
export const THROTTLE_WAITS_MS = [2000, 5000, 10000];
/** Files in flight for the rest of a run once it has been throttled. */
export const IN_FLIGHT_THROTTLED = 4;
/** What a file still throttled after every try is refused with. */
export const BUSY_WORDS = "SharePoint is busy. Run again in a few minutes.";

/** Does a refusal read as a THROTTLE — the service saying "too many,
 *  not now" — and nothing else? Only these are retried: a throttled
 *  call was not carried out, so repeating it is safe; a timeout or any
 *  other failure may have gone through, and repeating a copy would then
 *  collide with itself. Read from the status text, because that is all
 *  the connector hands back; the real wording through the connector is
 *  unseen, so the usual forms are all accepted. */
export function isThrottled(status: string): boolean {
  return /\b429\b|too ?many ?requests|throttl|rate ?limit|server ?(is )?(too )?busy/i.test(status);
}

/** Run a call; while it is refused as throttled, wait and run it again
 *  (three more tries at most). `onThrottle` hears the first refusal of
 *  each call. The last answer is returned whatever it is. */
export async function retryThrottled<T extends { ok: boolean; status: string }>(
  call: () => Promise<T>,
  onThrottle: () => void = () => undefined,
  waits: number[] = THROTTLE_WAITS_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<T> {
  let r = await call();
  for (const wait of waits) {
    if (r.ok || !isThrottled(r.status)) return r;
    onThrottle();
    await sleep(wait);
    r = await call();
  }
  return r;
}

// ---- the copies a stopped run left behind ---------------------------------

/** Of the files about to run, the ones whose name is already in the
 *  destination's top folder — a run stopped after the copy leaves a
 *  draft there, and the next run would refuse the file. Names compare
 *  without case, as SharePoint's do. */
export function alreadyThere(names: string[], destNames: Iterable<string>): string[] {
  const there = new Set<string>();
  for (const n of destNames) there.add(n.toLowerCase());
  return names.filter((n) => there.has(n.toLowerCase()));
}

/** "a.pdf, b.pdf and 3 more" — a list a confirmation can carry. */
export function nameList(names: string[], show = 5): string {
  if (names.length <= show) return names.join(", ");
  return `${names.slice(0, show).join(", ")} and ${names.length - show} more`;
}
