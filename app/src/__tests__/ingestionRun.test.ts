// What keeps an ingestion run honest (ingestion-run-hardening-plan-
// 2026-11-22.md): outcomes saved as they happen, a log that fits its
// column, a run told live from interrupted, one run at a time.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { latestByFile, logSummary, RunLogEntry, taskFromRow } from "../docs/ingestionModel";
import { isThrottled, retryThrottled, THROTTLE_WAITS_MS } from "../docs/ingestionRun";
import { alreadyThere, claimHeld, lastStart, LOG_DETAIL_MAX, nameList, RUN_BEAT_MS, RUN_SAVE_FLOOR_MS, RUN_STALE_MS, RUN_SURELY_STALE_MS, RUN_WATCH_MS, readsRunning, runSaver, runStamp, runState, stampAgeMs, startedEntry, trimLog } from "../docs/ingestionRun";

const entry = (file: string, outcome: RunLogEntry["outcome"], detail = "x", at = "2026-11-22T01:00:00.000Z"): RunLogEntry => ({ file, outcome, detail, at, by: "Ben" });

describe("the run's saver", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves a change, but no sooner than the floor after the last save", async () => {
    const save = vi.fn(() => Promise.resolve());
    const s = runSaver({ save });
    s.touch();
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS - 1);
    expect(save).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    // three more outcomes inside one floor: ONE more save
    s.touch();
    s.touch();
    s.touch();
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    expect(save).toHaveBeenCalledTimes(2);
    s.stop();
  });

  it("keeps one save in flight, and sends the last state after it", async () => {
    let release: () => void = () => undefined;
    const save = vi.fn(() => new Promise<void>((r) => (release = r)));
    const s = runSaver({ save });
    s.touch();
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    expect(save).toHaveBeenCalledTimes(1);
    s.touch(); // lands while the first save travels
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS * 3);
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    expect(save).toHaveBeenCalledTimes(2);
    s.stop();
  });

  it("beats when nothing has finished, so the row keeps moving", async () => {
    const save = vi.fn(() => Promise.resolve());
    const s = runSaver({ save });
    await vi.advanceTimersByTimeAsync(RUN_BEAT_MS - 1);
    expect(save).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RUN_BEAT_MS);
    expect(save).toHaveBeenCalledTimes(2);
    s.stop();
    await vi.advanceTimersByTimeAsync(RUN_BEAT_MS * 3);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("says when a save fails, tries again, and says when it is well", async () => {
    let fail = true;
    const save = vi.fn(() => (fail ? Promise.reject(new Error("too long")) : Promise.resolve()));
    const health: number[] = [];
    const s = runSaver({ save, onHealth: (n) => health.push(n) });
    s.touch();
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    expect(s.failures()).toBe(1);
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    expect(s.failures()).toBe(2);
    fail = false;
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    expect(s.failures()).toBe(0);
    expect(health).toEqual([1, 2, 0]);
    s.stop();
  });

  it("flush sends what is unsaved now, after the save in flight", async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    let n = 0;
    const save = vi.fn(() => {
      const k = ++n;
      order.push(`start ${k}`);
      return k === 1 ? new Promise<void>((r) => (release = () => (order.push("end 1"), r()))) : Promise.resolve().then(() => void order.push(`end ${k}`));
    });
    const s = runSaver({ save });
    s.touch();
    await vi.advanceTimersByTimeAsync(RUN_SAVE_FLOOR_MS);
    s.touch();
    const done = s.flush();
    release();
    await done;
    expect(order).toEqual(["start 1", "end 1", "start 2", "end 2"]);
    // nothing unsaved: flush sends nothing
    await s.flush();
    expect(save).toHaveBeenCalledTimes(2);
    s.stop();
  });
});

describe("the log, kept inside its column", () => {
  it("leaves a log that fits as it is, but for an over-long reason", () => {
    const long = entry("a.pdf", "refused", "r".repeat(LOG_DETAIL_MAX + 200));
    const out = trimLog([entry("b.pdf", "moved"), long]);
    expect(out).toHaveLength(2);
    expect(out[1].detail.length).toBe(LOG_DETAIL_MAX);
    expect(out[1].detail.endsWith("…")).toBe(true);
    expect(long.detail.length).toBe(LOG_DETAIL_MAX + 200); // the run's own copy is untouched
  });
  it("past the limit, drops outcomes a later one replaced before anything else", () => {
    const log = [entry("a.pdf", "refused", "first try"), entry("b.pdf", "refused", "first try"), entry("a.pdf", "moved", "/dest/a.pdf"), entry("c.pdf", "refused", "still here")];
    const full = JSON.stringify(log).length;
    const out = trimLog(log, full - 10);
    expect(out.map((e) => `${e.file}:${e.outcome}`)).toEqual(["b.pdf:refused", "a.pdf:moved", "c.pdf:refused"]);
  });
  it("keeps the newest entries when even that is not enough", () => {
    const log = Array.from({ length: 200 }, (_, i) => entry(`f${i}.pdf`, "moved", `/dest/f${i}.pdf`));
    const out = trimLog(log, 3000);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(3000);
    expect(out[out.length - 1].file).toBe("f199.pdf");
  });
  it("keeps the last run's start mark", () => {
    const log = [startedEntry("Ann", "2026-11-20T01:00:00.000Z"), entry("a.pdf", "moved"), startedEntry("Ben", "2026-11-22T01:00:00.000Z"), entry("b.pdf", "moved")];
    const out = trimLog(log, JSON.stringify(log).length - 10);
    expect(lastStart(out)?.by).toBe("Ben");
    expect(out.filter((e) => e.outcome === "started")).toHaveLength(1);
  });
});

describe("a run's start mark", () => {
  const log = [entry("a.pdf", "refused"), startedEntry("Ben", "2026-11-22T01:00:00.000Z"), entry("a.pdf", "moved")];
  it("survives the row, and is no file's outcome", () => {
    const back = taskFromRow({ ben_logjson: JSON.stringify(log), modifiedon: "2026-11-22T01:00:30Z" });
    expect(back.log[1].outcome).toBe("started");
    expect(back.modifiedOn).toBe("2026-11-22T01:00:30Z");
    expect([...latestByFile(back.log).keys()]).toEqual(["a.pdf"]);
    expect(logSummary(back.log)).toBe("1 moved · 1 refused");
  });
  it("names whose run it is", () => {
    expect(lastStart(log)?.by).toBe("Ben");
    expect(lastStart([entry("a.pdf", "moved")])).toBeNull();
  });
  it("two runs started in the same seconds: the later write holds the claim", () => {
    const ann = startedEntry("Ann", "2026-11-22T01:00:00.100Z");
    const ben = startedEntry("Ben", "2026-11-22T01:00:00.900Z");
    const row = [ann, ben]; // Ben's save landed last
    expect(claimHeld(row, ben)).toBe(true);
    expect(claimHeld(row, ann)).toBe(false);
    expect(claimHeld([], ann)).toBe(false);
  });
});

describe("live or interrupted", () => {
  const base = { status: "running" as const, watchedMs: 0, sinceMoveMs: null };
  it("a task that is not running has no run", () => {
    expect(runState({ ...base, status: "open", stampAgeMs: 1000 })).toBe("idle");
    expect(runState({ ...base, status: "closed", stampAgeMs: 1000 })).toBe("idle");
  });
  it("written a moment ago: live", () => {
    expect(runState({ ...base, stampAgeMs: 20000 })).toBe("live");
    expect(runState({ ...base, stampAgeMs: RUN_STALE_MS - 1 })).toBe("live");
  });
  it("not written for a long time: interrupted at once", () => {
    expect(runState({ ...base, stampAgeMs: RUN_SURELY_STALE_MS })).toBe("interrupted");
  });
  it("doubtful by the clock: watched for a little over a heartbeat first", () => {
    expect(runState({ ...base, stampAgeMs: RUN_STALE_MS + 1000 })).toBe("checking");
    expect(runState({ ...base, stampAgeMs: RUN_STALE_MS + 1000, watchedMs: RUN_WATCH_MS })).toBe("interrupted");
  });
  it("a stamp SEEN to move is live whatever the clock says", () => {
    // this PC's clock is ten minutes fast: the stamp reads old, yet it moves
    expect(runState({ ...base, stampAgeMs: 10 * 60000, watchedMs: 60000, sinceMoveMs: 5000 })).toBe("live");
  });
  it("a stamp that moved and then stood still for the stale time: interrupted", () => {
    expect(runState({ ...base, stampAgeMs: 1000, watchedMs: 400000, sinceMoveMs: RUN_STALE_MS })).toBe("interrupted");
  });
  it("young by a slow clock but never seen to move: interrupted once watched for the stale time", () => {
    expect(runState({ ...base, stampAgeMs: 1000, watchedMs: RUN_STALE_MS - 1 })).toBe("live");
    expect(runState({ ...base, stampAgeMs: 1000, watchedMs: RUN_STALE_MS })).toBe("interrupted");
  });
  it("no stamp to read: watched, then called interrupted", () => {
    expect(runState({ ...base, stampAgeMs: null })).toBe("checking");
    expect(runState({ ...base, stampAgeMs: null, watchedMs: RUN_WATCH_MS })).toBe("interrupted");
  });
});

describe("a list that cannot watch", () => {
  const now = Date.parse("2026-11-22T02:00:00Z");
  it("reads Running only while the row is fresh", () => {
    expect(readsRunning("running", "2026-11-22T01:59:30Z", now)).toBe(true);
    expect(readsRunning("running", "2026-11-22T01:50:00Z", now)).toBe(false); // interrupted ten minutes ago
    expect(readsRunning("running", undefined, now)).toBe(false);
    expect(readsRunning("open", "2026-11-22T01:59:30Z", now)).toBe(false);
  });
  it("takes the row's own stamp, and the newest time in the log when the row gave none", () => {
    const log = [startedEntry("Ben", "2026-11-22T01:00:00.000Z"), entry("a.pdf", "moved", "x", "2026-11-22T01:04:00.000Z"), entry("b.pdf", "refused", "x", "2026-11-22T01:02:00.000Z")];
    expect(runStamp("2026-11-22T01:05:10Z", log)).toBe("2026-11-22T01:05:10Z");
    expect(runStamp(undefined, log)).toBe("2026-11-22T01:04:00.000Z");
    expect(runStamp("", [])).toBe("");
  });
  it("reads a stamp's age, and none when there is no stamp", () => {
    expect(stampAgeMs("2026-11-22T01:59:00Z", now)).toBe(60000);
    expect(stampAgeMs("", now)).toBeNull();
    expect(stampAgeMs("2026-11-22T02:00:05Z", now)).toBe(0); // a server a little ahead
  });
});

describe("a throttled call is tried again", () => {
  const sleeps: number[] = [];
  const sleep = (ms: number) => {
    sleeps.push(ms);
    return Promise.resolve();
  };
  it("knows a throttle from any other refusal", () => {
    for (const s of ["429: Too Many Requests", "TooManyRequests: rate limit is exceeded", "The request was throttled", "Rate limit exceeded. Try again in 12 seconds.", "The server is busy now"]) expect(isThrottled(s)).toBe(true);
    for (const s of ["", "A file named a.pdf already exists", "403: Access denied", "The operation has timed out", "request failed", "Item 4290 does not exist"]) expect(isThrottled(s)).toBe(false);
  });
  it("waits 2, 5 and 10 seconds, and returns the first answer that is not a throttle", async () => {
    sleeps.length = 0;
    const answers = [{ ok: false, status: "429" }, { ok: false, status: "throttled" }, { ok: true, status: "" }];
    let calls = 0;
    let told = 0;
    const r = await retryThrottled(() => Promise.resolve(answers[calls++]), () => told++, THROTTLE_WAITS_MS, sleep);
    expect(r.ok).toBe(true);
    expect(calls).toBe(3);
    expect(sleeps).toEqual([2000, 5000]);
    expect(told).toBe(2);
  });
  it("gives up after three more tries and hands back the throttle", async () => {
    sleeps.length = 0;
    let calls = 0;
    const r = await retryThrottled(() => (calls++, Promise.resolve({ ok: false, status: "429" })), undefined, THROTTLE_WAITS_MS, sleep);
    expect(r.ok).toBe(false);
    expect(calls).toBe(4);
    expect(sleeps).toEqual([2000, 5000, 10000]);
  });
  it("never repeats a call that failed for another reason, or one that worked", async () => {
    sleeps.length = 0;
    let calls = 0;
    await retryThrottled(() => (calls++, Promise.resolve({ ok: false, status: "The operation has timed out" })), undefined, THROTTLE_WAITS_MS, sleep);
    expect(calls).toBe(1);
    calls = 0;
    await retryThrottled(() => (calls++, Promise.resolve({ ok: true, status: "" })), undefined, THROTTLE_WAITS_MS, sleep);
    expect(calls).toBe(1);
    expect(sleeps).toEqual([]);
  });
});

describe("copies a stopped run left in the destination", () => {
  it("finds the names already there, without case", () => {
    expect(alreadyThere(["Plan.pdf", "new.docx", "SOP 12.pdf"], ["plan.PDF", "other.pdf", "sop 12.pdf"])).toEqual(["Plan.pdf", "SOP 12.pdf"]);
    expect(alreadyThere(["a.pdf"], [])).toEqual([]);
  });
  it("lists a few and counts the rest", () => {
    expect(nameList(["a", "b"])).toBe("a, b");
    expect(nameList(["a", "b", "c", "d", "e", "f", "g"])).toBe("a, b, c, d, e and 2 more");
  });
});
