// The status rule (2026-11-17): on track / off track / flagged for an
// initiative, with its reasons; flagged > off track > on track for a
// priority. Run under a DST zone too (TZ=Pacific/Auckland).
import { describe, expect, it } from "vitest";
import {
  actionCounts,
  actionCountsFor,
  countsWords,
  DEFAULT_STATUS_SETTINGS,
  initiativeStatus,
  NO_ACTIONS,
  parseStatusSettings,
  priorityStatus,
  reasonsLine,
  spanWords,
  statusColour,
  StatusInput,
  statusTag,
  statusWords,
  whyLines,
} from "../improvement/status";
import { rowRank } from "../improvement/initiativeRow";

const S = DEFAULT_STATUS_SETTINGS;
const TODAY = "2026-11-17";
const healthy: StatusInput = {
  flagged: false,
  createdAt: "2026-01-05T02:00:00Z",
  lastUpdateAt: "2026-11-10T02:00:00Z",
  actions: { total: 3, done: 1, future: 2, late: 0, support: 0 },
  metrics: [{ name: "Scrap rate", rag: "green" }],
};
const st = (over: Partial<StatusInput>) => initiativeStatus({ ...healthy, ...over }, S, TODAY);

describe("an initiative's status", () => {
  it("is on track with actions in hand, metrics on plan and a recent update", () => {
    const s = st({});
    expect(s.state).toBe("good");
    expect(s.label).toBe("On track");
    expect(s.reasons).toEqual([]);
  });
  it("is off track on one late action", () => {
    const s = st({ actions: { total: 3, done: 1, future: 1, late: 1, support: 0 } });
    expect(s.state).toBe("bad");
    expect(s.reasons).toEqual([{ kind: "late", text: "1 late action" }]);
  });
  it("is off track with no actions — but fine when every action is done", () => {
    expect(st({ actions: NO_ACTIONS }).reasons.map((r) => r.kind)).toEqual(["noactions"]);
    expect(st({ actions: { total: 2, done: 2, future: 0, late: 0, support: 0 } }).state).toBe("good");
  });
  it("is off track when ANY metric is short of plan or outside its limits; no reading is ignored", () => {
    const s = st({ metrics: [{ name: "A", rag: "green" }, { name: "B", rag: "amber" }, { name: "C", rag: "red" }, { name: "D", rag: null }] });
    expect(s.state).toBe("bad");
    expect(s.reasons.map((r) => r.text)).toEqual(["B short of plan", "C outside its limits"]);
    expect(st({ metrics: [{ name: "D", rag: null }] }).state).toBe("good");
    expect(st({ metrics: [] }).state).toBe("good");
  });
  it("is off track once the last update is the recency window old", () => {
    expect(st({ lastUpdateAt: "2026-10-14T02:00:00Z" }).state).toBe("good"); // 34 days
    const s = st({ lastUpdateAt: "2026-10-13T02:00:00Z" }); // 35 days
    expect(s.state).toBe("bad");
    expect(s.reasons).toEqual([{ kind: "noupdate", text: "No update for 5 weeks" }]);
  });
  it("follows the setting", () => {
    const s = initiativeStatus({ ...healthy, lastUpdateAt: "2026-11-01T02:00:00Z" }, { ...S, recencyDays: 14 }, TODAY);
    expect(s.reasons.map((r) => r.text)).toEqual(["No update for 2 weeks"]);
  });
  it("gives a new initiative a grace for no actions and no update", () => {
    const fresh = { createdAt: "2026-11-01T02:00:00Z", lastUpdateAt: "", actions: NO_ACTIONS, metrics: [] };
    const s = st(fresh);
    expect(s.state).toBe("good");
    expect(s.inGrace).toBe(true);
    // the grace ends at the window
    const old = st({ ...fresh, createdAt: "2026-10-13T02:00:00Z" });
    expect(old.inGrace).toBe(false);
    expect(old.reasons.map((r) => r.kind)).toEqual(["noactions", "noupdate"]);
    expect(old.reasons[1].text).toBe("No status update yet");
  });
  it("late actions and metrics bite inside the grace", () => {
    const s = st({ createdAt: "2026-11-10T02:00:00Z", lastUpdateAt: "", actions: { total: 1, done: 0, future: 0, late: 1, support: 0 }, metrics: [{ name: "A", rag: "amber" }] });
    expect(s.state).toBe("bad");
    expect(s.reasons.map((r) => r.kind)).toEqual(["late", "metric"]);
  });
  it("an unknown creation date gets no grace", () => {
    expect(st({ createdAt: "", lastUpdateAt: "", actions: NO_ACTIONS }).reasons.map((r) => r.kind)).toEqual(["noactions", "noupdate"]);
  });
  it("flagged is the primary state, and says what lies under it", () => {
    const ok = st({ flagged: true });
    expect(ok.state).toBe("flagged");
    expect(ok.health).toBe("good");
    expect(statusWords(ok)).toBe("Flagged · at risk");
    const hurt = st({ flagged: true, actions: { total: 4, done: 0, future: 1, late: 3, support: 0 } });
    expect(hurt.state).toBe("flagged");
    expect(hurt.health).toBe("bad");
    expect(statusWords(hurt)).toBe("Flagged · recovery needed");
    expect(reasonsLine(hurt)).toBe("3 late actions");
    expect(statusWords(st({}))).toBe("On track");
  });
  it("caps a long reasons line", () => {
    const s = st({ metrics: ["A", "B", "C", "D", "E", "F"].map((name) => ({ name, rag: "amber" as const })) });
    expect(reasonsLine(s, 2)).toBe("A short of plan · B short of plan · +4 more");
  });
});

describe("the tag above an initiative's name, and why", () => {
  it("says Support needed for a flagged one — plainly — else on or off track", () => {
    expect(statusTag(st({ flagged: true }))).toBe("Support needed");
    expect(statusTag(st({ flagged: true, actions: { total: 1, done: 0, future: 0, late: 1, support: 0 } }))).toBe("Support needed");
    expect(statusTag(st({}))).toBe("On track");
    expect(statusTag(st({ actions: NO_ACTIONS }))).toBe("Off track");
  });
  it("keeps what lies under a flag, and the reasons, a tap away", () => {
    expect(whyLines(st({}))).toEqual([]);
    expect(whyLines(st({ actions: { total: 4, done: 0, future: 1, late: 3, support: 0 } }))).toEqual(["3 late actions"]);
    expect(whyLines(st({ flagged: true }), " Two fitters ")).toEqual(["Support needed: Two fitters", "Otherwise on track"]);
    expect(whyLines(st({ flagged: true, actions: { total: 4, done: 0, future: 1, late: 3, support: 0 } }), "")).toEqual(["Support needed — no note written", "Recovery needed — it is also off track:", "3 late actions"]);
  });
  it("orders rows: the primary, then support needed, off track, on track", () => {
    const rows: ["good" | "flagged" | "bad", boolean][] = [["good", false], ["bad", false], ["good", true], ["flagged", false]];
    expect([...rows].sort((a, b) => rowRank(a[0], a[1]) - rowRank(b[0], b[1]))).toEqual([["good", true], ["flagged", false], ["bad", false], ["good", false]]);
  });
});

describe("action counts", () => {
  const a = (over: Record<string, unknown>) => ({ status: "open", due: "2026-12-01", initiativeId: "I1", instanceId: "", ...over });
  it("splits done / future / late and leaves cancelled out", () => {
    const c = actionCounts(
      [
        a({ status: "done" }),
        a({ status: "verify", due: "2026-01-01" }),
        a({}),
        a({ due: "" }),
        a({ due: "2026-11-16" }),
        a({ due: "2026-11-17" }),
        a({ due: "2026-01-01", pdca: "hold" }),
        a({ status: "cancelled", due: "2026-01-01" }),
        a({ due: "2026-11-01", escalated: true }),
      ],
      TODAY
    );
    expect(c).toEqual({ total: 8, done: 2, future: 4, late: 2, support: 1 });
  });
  it("reads one initiative's own actions, by id or by its board", () => {
    const list = [a({}), a({ initiativeId: "I2" }), a({ initiativeId: "", instanceId: "init-I1:card" })];
    expect(actionCountsFor({ id: "I1", boardId: "init-I1" }, list, TODAY).total).toBe(2);
  });
});

describe("a priority's status", () => {
  it("flagged wins, then off track, then on track", () => {
    expect(priorityStatus(["good", "bad", "flagged"]).state).toBe("flagged");
    expect(priorityStatus(["good", "bad", "good"]).state).toBe("bad");
    expect(priorityStatus(["good", "good"]).state).toBe("good");
    expect(priorityStatus([]).state).toBe("none");
  });
  it("counts each state", () => {
    const p = priorityStatus(["good", "bad", "flagged", "good"]);
    expect(p.counts).toEqual({ good: 2, flagged: 1, bad: 1 });
    expect(p.total).toBe(4);
    expect(countsWords(p)).toBe("2 on track · 1 flagged · 1 off track");
    expect(countsWords(priorityStatus([]))).toBe("No initiatives");
  });
});

describe("settings and colours", () => {
  it("parses with defaults and bounds", () => {
    expect(parseStatusSettings(undefined)).toEqual(S);
    expect(parseStatusSettings({ recencyDays: 21, colours: { flagged: "info" } })).toEqual({ recencyDays: 21, colours: { good: "good", flagged: "info", bad: "issue" } });
    expect(parseStatusSettings({ recencyDays: 0 }).recencyDays).toBe(1);
    expect(parseStatusSettings({ recencyDays: "x" }).recencyDays).toBe(35);
  });
  it("resolves through the palette, with a fallback for a missing key", () => {
    expect(statusColour("good", S, { good: "#00ff00" })).toBe("#00ff00");
    expect(statusColour("flagged", S, { good: "#00ff00" })).toBe("#7b3fa0");
    expect(statusColour("none", S, { neutral: "#808080" })).toBe("#808080");
  });
  it("words a span", () => {
    expect(spanWords(13)).toBe("13 days");
    expect(spanWords(35)).toBe("5 weeks");
    expect(spanWords(1)).toBe("1 day");
  });
});
