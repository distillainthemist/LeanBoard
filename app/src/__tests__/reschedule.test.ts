import { describe, expect, it } from "vitest";
import { newAction } from "../../../shared/schema/actions";
import {
  DEFAULT_RESCHEDULE_REASONS,
  composeReason,
  dueMove,
  dueMoves,
  onInitiative,
  parseRescheduleSettings,
  reasonChoices,
  recordDueMove,
  slipCount,
} from "../../../shared/schema/reschedule";
import { parseImprovementSettings, serializeImprovementSettings } from "../improvement/templateModel";

const meeting = { initiativeId: "", instanceId: "board-1:card-2" };
const stamped = { initiativeId: "init-9", instanceId: "board-1:card-2" };
const onBoard = { instanceId: "init-9-board:actions" };

describe("which due-date moves ask why", () => {
  it("knows an initiative's action by its id or by its board", () => {
    expect(onInitiative(meeting)).toBe(false);
    expect(onInitiative(stamped)).toBe(true);
    expect(onInitiative(onBoard)).toBe(true);
    expect(onInitiative({ instanceId: "hub:someone" })).toBe(false);
  });

  it("says nothing for no change or a first due date", () => {
    expect(dueMove("2026-11-20", "2026-11-20", stamped, "all")).toBe("none");
    expect(dueMove("", "2026-11-20", stamped, "all")).toBe("none");
  });

  it("asks an initiative's action why it moves later, under either policy", () => {
    expect(dueMove("2026-11-20", "2026-11-27", stamped, "initiatives")).toBe("ask");
    expect(dueMove("2026-11-20", "2026-11-27", onBoard, "initiatives")).toBe("ask");
    expect(dueMove("2026-11-20", "2026-11-27", stamped, "all")).toBe("ask");
  });

  it("asks a meeting's action only when the policy is all", () => {
    expect(dueMove("2026-11-20", "2026-11-27", meeting, "initiatives")).toBe("record");
    expect(dueMove("2026-11-20", "2026-11-27", meeting, "all")).toBe("ask");
  });

  it("records an earlier date without asking", () => {
    expect(dueMove("2026-11-20", "2026-11-13", stamped, "all")).toBe("record");
    expect(dueMove("2026-11-20", "2026-11-13", meeting, "initiatives")).toBe("record");
  });

  it("treats a cleared date as a move later", () => {
    expect(dueMove("2026-11-20", "", stamped, "initiatives")).toBe("ask");
    expect(dueMove("2026-11-20", "", meeting, "initiatives")).toBe("record");
  });
});

describe("the reasons list", () => {
  it("falls back to the four standing reasons and the initiatives policy", () => {
    expect(parseRescheduleSettings(undefined)).toEqual({ policy: "initiatives", reasons: DEFAULT_RESCHEDULE_REASONS });
    expect(parseRescheduleSettings({ policy: "everything" }).policy).toBe("initiatives");
    expect(parseRescheduleSettings({ policy: "all" }).policy).toBe("all");
  });

  it("keeps the organisation's list, tidied, with Other always last", () => {
    const s = parseRescheduleSettings({ reasons: [" Supplier late ", "supplier late", "", 7, "Other", "Weather"] });
    expect(s.reasons).toEqual(["Supplier late", "Weather"]);
    expect(reasonChoices(s)).toEqual(["Supplier late", "Weather", "Other"]);
  });

  it("keeps an emptied list empty: Other alone is offered", () => {
    const s = parseRescheduleSettings({ reasons: [] });
    expect(s.reasons).toEqual([]);
    expect(reasonChoices(s)).toEqual(["Other"]);
  });

  it("needs a note for Other and carries one after any reason", () => {
    expect(composeReason("Other", "  ")).toBeNull();
    expect(composeReason("Other", "crane booked out")).toBe("Other — crane booked out");
    expect(composeReason("Scope changed", "")).toBe("Scope changed");
    expect(composeReason("Scope changed", "two more lines added")).toBe("Scope changed — two more lines added");
    expect(composeReason("", "a note")).toBeNull();
  });

  it("rides the improvement settings through a save by any editor", () => {
    const imp = parseImprovementSettings(JSON.stringify({ methods: ["A3"], reschedule: { policy: "all", reasons: ["Supplier late"] } }));
    expect(imp.reschedule).toEqual({ policy: "all", reasons: ["Supplier late"] });
    const again = parseImprovementSettings(serializeImprovementSettings(imp));
    expect(again.reschedule).toEqual({ policy: "all", reasons: ["Supplier late"] });
    expect(parseImprovementSettings("").reschedule).toEqual({ policy: "initiatives", reasons: DEFAULT_RESCHEDULE_REASONS });
  });
});

describe("the move history", () => {
  const actor = { whoId: "u1", who: "Ben" };

  it("writes each move with who, when, from, to and the reason", () => {
    const a = newAction({ source: "card", sourceId: "" });
    a.due = "2026-11-27";
    recordDueMove(a, "2026-11-20", actor, "Scope changed", "2026-11-16T01:00:00.000Z");
    expect(a.history).toEqual([
      { kind: "rescheduled", whoId: "u1", who: "Ben", when: "2026-11-16T01:00:00.000Z", from: "2026-11-20", to: "2026-11-27", reason: "Scope changed" },
    ]);
  });

  it("writes nothing for a first due date or an unchanged one", () => {
    const a = newAction({ source: "card", sourceId: "" });
    a.due = "2026-11-27";
    recordDueMove(a, "", actor, "", "2026-11-16T01:00:00.000Z");
    recordDueMove(a, "2026-11-27", actor, "", "2026-11-16T01:00:00.000Z");
    expect(a.history ?? []).toEqual([]);
  });

  it("counts only the moves later, a cleared date among them", () => {
    const a = newAction({ source: "card", sourceId: "" });
    a.due = "2026-11-27";
    recordDueMove(a, "2026-11-20", actor, "Scope changed", "t1");
    a.due = "2026-11-25";
    recordDueMove(a, "2026-11-27", null, "", "t2");
    a.due = "";
    recordDueMove(a, "2026-11-25", actor, "Other — parked", "t3");
    a.history = [...(a.history ?? []), { kind: "verified", whoId: "u1", who: "Ben", when: "t4", reason: "" }];
    expect(dueMoves(a).length).toBe(3);
    expect(slipCount(a)).toBe(2);
    expect(dueMoves(a)[1].who).toBe("");
  });
});
