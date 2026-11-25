// Due-date moves counted by reason (programme E10, 2026-11-25).

import { describe, expect, it } from "vitest";
import type { ActionHistoryEntry } from "../../../shared/schema/actions";
import { moveReport, NO_REASON, reasonLabel } from "../improvement/moveReport";

const move = (from: string, to: string, reason: string, when = "2026-06-10T02:00:00.000Z"): ActionHistoryEntry => ({ kind: "rescheduled", whoId: "u", who: "U", when, from, to, reason });
const act = (initiativeId: string, history: ActionHistoryEntry[]) => ({ initiativeId, instanceId: `init-${initiativeId}:a`, history });
const titles: Record<string, string> = { a: "Alpha", b: "Beta" };
const inView = (ids: string[]) => (x: { initiativeId?: string }) => (x.initiativeId && ids.includes(x.initiativeId) ? { id: x.initiativeId, title: titles[x.initiativeId] } : null);
const YEAR = { from: "2026-01-01", to: "2026-12-31" };

describe("the reason a move is counted under", () => {
  it("is its label, without the note", () => {
    expect(reasonLabel("Waiting on parts — the gearbox")).toBe("Waiting on parts");
    expect(reasonLabel("Other — the vendor moved")).toBe("Other");
    expect(reasonLabel("Scope changed")).toBe("Scope changed");
    expect(reasonLabel("  ")).toBe(NO_REASON);
  });
});

describe("due-date moves by reason", () => {
  const actions = [
    act("a", [move("2026-06-01", "2026-06-20", "Waiting on parts — the gearbox"), move("2026-06-20", "2026-07-05", "waiting on parts"), move("2026-07-05", "2026-07-01", "")]),
    act("a", [move("2026-05-01", "2026-05-09", "")]),
    act("b", [move("2026-03-01", "2026-03-15", "Other — the vendor moved"), move("2026-03-15", "2026-04-01", "Resource unavailable")]),
  ];

  it("counts later moves only, most common first, no-reason last", () => {
    const r = moveReport(actions, inView(["a", "b"]), YEAR);
    expect(r.total).toBe(5); // the move EARLIER is not a slip
    expect(r.byReason).toEqual([
      { reason: "Waiting on parts", count: 2 },
      { reason: "Other", count: 1 },
      { reason: "Resource unavailable", count: 1 },
      { reason: NO_REASON, count: 1 },
    ]);
  });

  it("names the initiatives with the most moves", () => {
    const r = moveReport(actions, inView(["a", "b"]), YEAR);
    expect(r.byInitiative).toEqual([
      { id: "a", title: "Alpha", count: 3 },
      { id: "b", title: "Beta", count: 2 },
    ]);
    expect(moveReport(actions, inView(["a", "b"]), YEAR, 1).byInitiative).toHaveLength(1);
  });

  it("only the initiatives in view, only the year in view", () => {
    expect(moveReport(actions, inView(["b"]), YEAR).total).toBe(2);
    const old = [act("a", [move("2025-06-01", "2025-06-20", "Scope changed", "2025-06-01T02:00:00.000Z"), move("2026-01-10", "2026-02-01", "Scope changed", "2026-01-10T02:00:00.000Z")])];
    expect(moveReport(old, inView(["a"]), YEAR).total).toBe(1);
    expect(moveReport(old, inView(["a"]), null).total).toBe(2);
  });

  it("nothing moved is an empty report", () => {
    expect(moveReport([act("a", [])], inView(["a"]), YEAR)).toEqual({ total: 0, byReason: [], byInitiative: [] });
  });
});
