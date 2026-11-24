// Which gate snapshot stands (programme E17 part 2, 2026-11-24).

import { describe, expect, it } from "vitest";
import { markGateSnapshots, revertsOf, snapStateWords } from "../improvement/gateSnapshots";

const STAGES = ["Define", "Measure", "Improve", "Control"];
const snap = (stage: string, when: string) => ({ stage, when, id: `${stage}@${when}` });
const states = (g: ReturnType<typeof markGateSnapshots<ReturnType<typeof snap>>>) => g.map((x) => [x.head.snap.id, x.head.state, x.older.map((o) => o.snap.id)]);

describe("which gate snapshot stands", () => {
  it("with no revert every snapshot stands, in stage order", () => {
    const g = markGateSnapshots([snap("Measure", "2026-10-10T02:00:00Z"), snap("Define", "2026-10-01T02:00:00Z")], [], STAGES);
    expect(states(g)).toEqual([
      ["Define@2026-10-01T02:00:00Z", "stands", []],
      ["Measure@2026-10-10T02:00:00Z", "stands", []],
    ]);
  });

  it("a revert undoes the gates at and after the stage it went back to", () => {
    const snaps = [snap("Define", "2026-10-01T02:00:00Z"), snap("Measure", "2026-10-10T02:00:00Z"), snap("Improve", "2026-10-20T02:00:00Z")];
    const g = markGateSnapshots(snaps, [{ at: "2026-11-01T05:00:00Z", to: "Measure" }], STAGES);
    expect(g.map((x) => [x.head.snap.stage, x.head.state, x.head.revertedOn])).toEqual([
      ["Define", "stands", ""],
      ["Measure", "reverted", "2026-11-01"],
      ["Improve", "reverted", "2026-11-01"],
    ]);
  });

  it("passed again: the older snapshot is superseded and folds under the newer, which stands", () => {
    const snaps = [snap("Measure", "2026-10-10T02:00:00Z"), snap("Measure", "2026-11-05T02:00:00Z")];
    const g = markGateSnapshots(snaps, [{ at: "2026-11-01T05:00:00Z", to: "Measure" }], STAGES);
    expect(states(g)).toEqual([["Measure@2026-11-05T02:00:00Z", "stands", ["Measure@2026-10-10T02:00:00Z"]]]);
    expect(g[0].older[0].state).toBe("superseded");
  });

  it("reverted a second time: the newest reads reverted with the later date", () => {
    const snaps = [snap("Measure", "2026-10-10T02:00:00Z"), snap("Measure", "2026-11-05T02:00:00Z")];
    const reverts = [
      { at: "2026-11-01T05:00:00Z", to: "Measure" },
      { at: "2026-11-12T05:00:00Z", to: "Define" },
    ];
    const g = markGateSnapshots(snaps, reverts, STAGES);
    expect([g[0].head.state, g[0].head.revertedOn]).toEqual(["reverted", "2026-11-12"]);
  });

  it("a revert BEFORE the stamp, or to a later stage, undoes nothing", () => {
    const g = markGateSnapshots(
      [snap("Define", "2026-10-01T02:00:00Z"), snap("Measure", "2026-11-05T02:00:00Z")],
      [
        { at: "2026-11-01T05:00:00Z", to: "Measure" }, // before Measure's stamp, after Define's — but Define is earlier than Measure
        { at: "2026-11-20T05:00:00Z", to: "Improve" }, // back to a stage AFTER both gates
      ],
      STAGES
    );
    expect(g.map((x) => x.head.state)).toEqual(["stands", "stands"]);
  });

  it("a stage or a target the list no longer names is not judged", () => {
    const g = markGateSnapshots([snap("Old stage", "2026-10-01T02:00:00Z"), snap("Define", "2026-10-02T02:00:00Z")], [{ at: "2026-11-01T05:00:00Z", to: "Renamed" }], STAGES);
    expect(g.map((x) => [x.head.snap.stage, x.head.state])).toEqual([
      ["Define", "stands"],
      ["Old stage", "stands"],
    ]);
  });

  it("reads as words", () => {
    expect(snapStateWords({ state: "stands", revertedOn: "" })).toBe("");
    expect(snapStateWords({ state: "reverted", revertedOn: "2026-11-01" })).toBe("reverted 2026-11-01");
    expect(snapStateWords({ state: "superseded", revertedOn: "" })).toBe("superseded");
  });

  it("the reverts are the stage moves marked so", () => {
    const events = [
      { kind: "stagemove", at: "2026-11-01T05:00:00Z", detail: { from: "Improve", to: "Measure", revert: true } },
      { kind: "stagemove", at: "2026-10-10T05:00:00Z", detail: { from: "Define", to: "Measure" } },
      { kind: "gate", at: "2026-10-09T05:00:00Z", detail: { what: "approved" } },
    ];
    expect(revertsOf(events)).toEqual([{ at: "2026-11-01T05:00:00Z", to: "Measure" }]);
  });
});
