// Shared actions, completion stamps, "recently completed" and duplicate
// (2026-11-17, issues 2, 10 and 11).
import { describe, expect, it } from "vitest";
import {
  assigneesLabel,
  duplicateAction,
  LtkAction,
  mergeAssignees,
  mergeParts,
  newAction,
  partsLabel,
  partsProgress,
  partsTitle,
  recentlyDone,
  sanitizeAction,
  settleFromParts,
  stampCompletion,
} from "../../../shared/schema/actions";

const act = (over: Partial<LtkAction> = {}): LtkAction => ({ ...newAction({ source: "card", sourceId: "" }), ...over });
const p = (whoId: string, done = false, doneAt?: string) => ({ whoId, who: `Person ${whoId}`, done, ...(doneAt ? { doneAt } : {}) });
const NOW = "2026-11-17T03:00:00.000Z";

describe("completion stamps", () => {
  it("stamps an action when it reaches done or verify, and clears it on a reopen", () => {
    const a = act({ status: "done" });
    expect(stampCompletion(a, NOW)).toBe(true);
    expect(a.doneAt).toBe(NOW);
    // already stamped: the first moment stands
    expect(stampCompletion(a, "2026-12-01T00:00:00.000Z")).toBe(false);
    expect(a.doneAt).toBe(NOW);
    a.status = "open";
    expect(stampCompletion(a, NOW)).toBe(true);
    expect(a.doneAt).toBeUndefined();
    const v = act({ status: "verify" });
    stampCompletion(v, NOW);
    expect(v.doneAt).toBe(NOW);
  });
  it("stamps each part as it is done", () => {
    const a = act({ assignees: [p("a", true), p("b"), p("c", false, "2026-01-01T00:00:00.000Z")] });
    stampCompletion(a, NOW);
    expect(a.assignees.map((x) => x.doneAt)).toEqual([NOW, undefined, undefined]);
  });
  it("survives the sanitiser — a part not done carries no moment", () => {
    const a = sanitizeAction({ ...act({ status: "done", doneAt: NOW, assignees: [p("a", true, NOW), p("b", false, NOW)] }) });
    expect(a.doneAt).toBe(NOW);
    expect(a.assignees[0].doneAt).toBe(NOW);
    expect(a.assignees[1].doneAt).toBeUndefined();
  });
});

describe("recently completed", () => {
  const done = (doneAt?: string) => ({ status: "done" as const, doneAt });
  it("is done within the window; today is day 0", () => {
    expect(recentlyDone(done("2026-11-17"), 7, "2026-11-17")).toBe(true);
    expect(recentlyDone(done("2026-11-11"), 7, "2026-11-17")).toBe(true); // 6 days ago
    expect(recentlyDone(done("2026-11-10"), 7, "2026-11-17")).toBe(false); // 7 days ago
  });
  it("needs a completion moment, a positive window and a done action", () => {
    expect(recentlyDone(done(undefined), 7, "2026-11-17")).toBe(false);
    expect(recentlyDone(done("2026-11-17"), 0, "2026-11-17")).toBe(false);
    expect(recentlyDone({ status: "open", doneAt: "2026-11-17" }, 7, "2026-11-17")).toBe(false);
    expect(recentlyDone(done("not a date"), 7, "2026-11-17")).toBe(false);
  });
  it("reads a moment by the local day it fell on", () => {
    // 2026-11-16T12:00Z is the 17th in Auckland (UTC+13) and the 16th in UTC
    const a = done("2026-11-16T12:00:00.000Z");
    const localDay = new Date("2026-11-16T12:00:00.000Z").getDate();
    expect(recentlyDone(a, 1, `2026-11-${localDay}`)).toBe(true);
  });
  it("crosses a daylight-saving change by calendar days", () => {
    // NZ daylight saving began 2026-09-27: six calendar days back is still inside seven
    expect(recentlyDone(done("2026-09-24"), 7, "2026-09-30")).toBe(true);
    expect(recentlyDone(done("2026-09-23"), 7, "2026-09-30")).toBe(false);
  });
});

describe("a shared action's picture", () => {
  it("counts parts only when several people share it", () => {
    expect(partsProgress(act({ assignees: [p("a", true)] }))).toBeNull();
    expect(partsProgress(act())).toBeNull();
    const a = act({ assignees: [p("a", true), p("b"), p("c", true)] });
    expect(partsProgress(a)).toEqual({ done: 2, total: 3 });
    expect(partsLabel(a)).toBe("2 / 3 done");
    expect(partsLabel(act({ assignees: [p("a")] }))).toBe("");
  });
  it("labels the people: the first, and how many more", () => {
    expect(assigneesLabel(act(), "Unassigned")).toBe("Unassigned");
    expect(assigneesLabel(act({ assignees: [p("a")] }))).toBe("Person a");
    expect(assigneesLabel(act({ assignees: [p("a"), p("b"), p("c")] }))).toBe("Person a +2");
  });
  it("says who is still to do it", () => {
    expect(partsTitle(act({ assignees: [p("a", true), p("b"), p("c")] }))).toBe("Still to do: Person b; Person c\nDone: Person a");
  });
});

describe("the assignees an edit leaves", () => {
  const prev = [p("a", true, "2026-11-01T00:00:00.000Z"), p("b"), p("c")];
  const pick = (...ids: string[]) => ids.map((id) => ({ whoId: id, who: `Person ${id}` }));
  it("keeps every picked person and the part each had (the dialog used to keep one)", () => {
    const out = mergeAssignees(prev, pick("a", "b", "c"), { closed: false, wasClosed: false, nowIso: NOW });
    expect(out).toEqual(prev);
  });
  it("adds a newcomer after, not done; drops someone unticked", () => {
    const out = mergeAssignees(prev, pick("c", "d", "a"), { closed: false, wasClosed: false, nowIso: NOW });
    expect(out.map((x) => `${x.whoId}:${x.done}`)).toEqual(["a:true", "c:false", "d:false"]);
  });
  it("takes a part ticked in the dialog, stamped now", () => {
    const out = mergeAssignees(prev, pick("a", "b", "c"), { closed: false, wasClosed: false, staged: (x) => (x.whoId === "b" ? true : x.whoId === "a" ? false : undefined), nowIso: NOW });
    expect(out).toEqual([p("a"), p("b", true, NOW), p("c")]);
  });
  it("closing closes every part; reopening reopens every part", () => {
    const closed = mergeAssignees(prev, pick("a", "b"), { closed: true, wasClosed: false, nowIso: NOW });
    expect(closed).toEqual([p("a", true, "2026-11-01T00:00:00.000Z"), p("b", true, NOW)]);
    const reopened = mergeAssignees(closed, pick("a", "b"), { closed: false, wasClosed: true, nowIso: NOW });
    expect(reopened.every((x) => !x.done && x.doneAt === undefined)).toBe(true);
  });
  it("never lists a person twice", () => {
    expect(mergeAssignees([], pick("a", "a", "b"), { closed: false, wasClosed: false }).map((x) => x.whoId)).toEqual(["a", "b"]);
  });
  it("matches a typed name with no id by its words", () => {
    const out = mergeAssignees([{ whoId: "", who: "Sam Lee", done: true, doneAt: NOW }], [{ whoId: "", who: "sam lee" }], { closed: false, wasClosed: false });
    expect(out[0].done).toBe(true);
  });
});

describe("the write lays this screen's parts over the row as it stands", () => {
  const base = [p("a"), p("b"), p("c")];
  it("my tick does not undo a tick someone else made since I loaded", () => {
    // I (a) tick mine from a screen that still shows b not done; b ticked meanwhile
    const rowNow = [p("a"), p("b", true, NOW), p("c")];
    const mine = [p("a", true), p("b"), p("c")];
    const out = mergeParts(rowNow, mine, base);
    expect(out.map((x) => x.done)).toEqual([true, true, false]);
    // …and with c ticking last from a stale screen, every part is done
    const last = mergeParts([p("a", true), p("b", true), p("c")], [p("a"), p("b"), p("c", true)], base);
    const a = act({ assignees: last });
    expect(settleFromParts(a, { reopen: false })).toBe(true);
    expect(a.status).toBe("done");
  });
  it("my un-tick stands", () => {
    const b2 = [p("a", true), p("b")];
    expect(mergeParts([p("a", true), p("b")], [p("a", false), p("b")], b2).map((x) => x.done)).toEqual([false, false]);
  });
  it("someone I removed goes; someone another person added stays", () => {
    const out = mergeParts([p("a"), p("b"), p("c"), p("z")], [p("a"), p("c")], base);
    expect(out.map((x) => x.whoId)).toEqual(["a", "c", "z"]);
  });
  it("someone I added lands", () => {
    expect(mergeParts(base, [...base, p("d")], base).map((x) => x.whoId)).toEqual(["a", "b", "c", "d"]);
  });
  it("with no baseline (a new action) my list is the list", () => {
    expect(mergeParts([p("x")], [p("a")], undefined).map((x) => x.whoId)).toEqual(["a"]);
  });
});

describe("duplicate", () => {
  it("copies what the action is — not its life", () => {
    const src = act({
      issue: "Guarding",
      description: "Audit the fillers",
      instanceId: "init-I1:card",
      initiativeId: "I1",
      assignees: [p("a", true, NOW), p("b")],
      supporters: [{ whoId: "s", who: "Sup" }],
      start: "2026-11-01",
      due: "2026-11-30",
      status: "done",
      pdca: "closed",
      doneAt: NOW,
      escalated: true,
      confidential: true,
      comments: [{ whoId: "a", when: "2026-11-02", text: "note" }],
      history: [{ kind: "rescheduled", whoId: "a", who: "A", when: NOW, reason: "x" }],
      verified: { whoId: "o", who: "O", when: NOW },
    });
    const d = duplicateAction(src);
    expect(d.id).not.toBe(src.id);
    expect(d).toMatchObject({ issue: "Guarding", description: "Audit the fillers", instanceId: "init-I1:card", initiativeId: "I1", start: "2026-11-01", due: "2026-11-30", status: "open", pdca: "do", escalated: true, confidential: true });
    expect(d.assignees).toEqual([p("a"), p("b")]);
    expect(d.supporters).toEqual([{ whoId: "s", who: "Sup" }]);
    expect(d.comments).toEqual([]);
    expect(d.history).toBeUndefined();
    expect(d.verified).toBeUndefined();
    expect(d.doneAt).toBeUndefined();
  });
  it("keeps an open source's PDCA state", () => {
    expect(duplicateAction(act({ pdca: "check" })).pdca).toBe("check");
    expect(duplicateAction(act({ pdca: "hold" })).pdca).toBe("hold");
  });
});
