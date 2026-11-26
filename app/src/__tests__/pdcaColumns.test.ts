// The kanban follows the PDCA state (R5 of the 2026-11-25 round, report
// 21 — Sue's 21 cards at Do sitting in To do): one rule keeps an
// action's status and its PDCA state in step.
import { describe, expect, it } from "vitest";
import { ActionPdca, ActionStatus, alignPdca, duplicateAction, newAction, pdcaOf, reopenAction, sanitizeAction } from "../../../shared/schema/actions";
import { PDCA_COLUMNS, kanbanGroupOf, pdcaColumnOf } from "../../../controls/ActionBoard/editor";

const a = (status: ActionStatus, pdca?: ActionPdca) => ({ status, pdca });
const after = (status: ActionStatus, pdca: ActionPdca | undefined, from: "pdca" | "status" | "stored") => {
  const x = a(status, pdca);
  alignPdca(x, from);
  return [x.status, x.pdca];
};

describe("the dialog chose a state: the column follows", () => {
  it("Plan and On hold are To do; Do, Check and Act are Doing", () => {
    expect(after("in-progress", "plan", "pdca")).toEqual(["open", "plan"]);
    expect(after("in-progress", "hold", "pdca")).toEqual(["open", "hold"]);
    expect(after("open", "do", "pdca")).toEqual(["in-progress", "do"]);
    expect(after("open", "check", "pdca")).toEqual(["in-progress", "check"]);
    expect(after("open", "act", "pdca")).toEqual(["in-progress", "act"]);
  });
  it("a closed or cancelled action is left to its own rules", () => {
    expect(after("done", "do", "pdca")).toEqual(["done", "closed"]);
    expect(after("verify", "act", "pdca")).toEqual(["verify", "closed"]);
    expect(after("cancelled", "do", "pdca")).toEqual(["cancelled", "do"]);
  });
});

describe("a drop chose a column: the state follows", () => {
  it("into To do is Plan", () => {
    expect(after("open", "do", "status")).toEqual(["open", "plan"]);
    expect(after("open", "closed", "status")).toEqual(["open", "plan"]);
    expect(after("open", "hold", "status")).toEqual(["open", "plan"]);
  });
  it("into Doing is Do, and Check and Act keep their mark", () => {
    expect(after("in-progress", "plan", "status")).toEqual(["in-progress", "do"]);
    expect(after("in-progress", "hold", "status")).toEqual(["in-progress", "do"]);
    expect(after("in-progress", "check", "status")).toEqual(["in-progress", "check"]);
    expect(after("in-progress", "act", "status")).toEqual(["in-progress", "act"]);
  });
});

describe("a row saved before the rule", () => {
  it("Do was the default: an open action at Do reads Plan and stays in To do", () => {
    expect(after("open", "do", "stored")).toEqual(["open", "plan"]);
    expect(after("open", undefined, "stored")).toEqual(["open", "plan"]);
  });
  it("Check and Act were set on purpose: the card moves to Doing and keeps its mark", () => {
    expect(after("open", "check", "stored")).toEqual(["in-progress", "check"]);
    expect(after("open", "act", "stored")).toEqual(["in-progress", "act"]);
  });
  it("a card dragged into Doing whose mark said Plan reads Do; On hold sits in To do", () => {
    expect(after("in-progress", "plan", "stored")).toEqual(["in-progress", "do"]);
    expect(after("in-progress", undefined, "stored")).toEqual(["in-progress", "do"]);
    expect(after("in-progress", "hold", "stored")).toEqual(["open", "hold"]);
    expect(after("open", "hold", "stored")).toEqual(["open", "hold"]);
  });
  it("a row this build saved reads back unchanged", () => {
    for (const [s, p] of [["open", "plan"], ["open", "hold"], ["in-progress", "do"], ["in-progress", "check"], ["in-progress", "act"], ["done", "closed"], ["verify", "closed"]] as [ActionStatus, ActionPdca][]) {
      expect(after(s, p, "stored")).toEqual([s, p]);
    }
  });
  it("is applied wherever an action is read", () => {
    const old = sanitizeAction({ id: "a1", status: "open", pdca: "do", description: "x" });
    expect([old.status, old.pdca]).toEqual(["open", "plan"]);
    const set = sanitizeAction({ id: "a2", status: "open", pdca: "check", description: "x" });
    expect([set.status, set.pdca]).toEqual(["in-progress", "check"]);
  });
});

describe("starting and reopening", () => {
  it("a new action starts at Plan, in To do", () => {
    const n = newAction({ source: "hub", sourceId: "" });
    expect([n.status, n.pdca]).toEqual(["open", "plan"]);
  });
  it("a reopened action goes back into Do, in Doing", () => {
    const x = a("done", "closed");
    reopenAction(x);
    expect([x.status, x.pdca]).toEqual(["in-progress", "do"]);
  });
  it("a duplicate of a live action keeps its state and column; of a closed one starts at Plan", () => {
    const live = duplicateAction(sanitizeAction({ id: "s", status: "in-progress", pdca: "check", description: "x" }));
    expect([live.status, live.pdca]).toEqual(["in-progress", "check"]);
    const closed = duplicateAction(sanitizeAction({ id: "s", status: "done", pdca: "closed", description: "x" }));
    expect([closed.status, closed.pdca]).toEqual(["open", "plan"]);
  });
  it("the state shown is the stored one, or the column's", () => {
    expect(pdcaOf(a("open"))).toBe("plan");
    expect(pdcaOf(a("in-progress"))).toBe("do");
    expect(pdcaOf(a("verify", "do"))).toBe("closed");
  });
});

describe("By PDCA state", () => {
  it("is a grouping the card understands", () => {
    expect(kanbanGroupOf("pdca")).toBe("pdca");
    expect(PDCA_COLUMNS.map((c) => c.label)).toEqual(["Plan", "Do", "Check", "Act", "Closed"]);
  });
  it("puts On hold in Plan and awaiting endorsement in Closed", () => {
    expect(pdcaColumnOf(a("open", "hold"))).toBe("plan");
    expect(pdcaColumnOf(a("open", "plan"))).toBe("plan");
    expect(pdcaColumnOf(a("in-progress", "act"))).toBe("act");
    expect(pdcaColumnOf(a("verify", "closed"))).toBe("closed");
    expect(pdcaColumnOf(a("done", "closed"))).toBe("closed");
  });
});
