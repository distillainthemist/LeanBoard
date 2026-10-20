import { describe, expect, it } from "vitest";
import {
  HealthCriterion,
  answer,
  criteriaFor,
  criteriaProblems,
  editable,
  keyFor,
  parseHealthSiteConfig,
  parseHealthStandard,
  presetOptions,
  questionPossible,
  scopeKey,
  scoreFor,
  serializeHealthSiteConfig,
  serializeHealthStandard,
  todaysCheck,
  trendFor,
} from "../health/model";

const q = (key: string, opts: [string, number][], multi = false, allowNa = false) => ({
  key,
  text: key,
  multi,
  allowNa,
  options: opts.map(([label, weight]) => ({ key: label.toLowerCase(), label, guidance: "", weight })),
});
const crit = (key: string, questions: ReturnType<typeof q>[]): HealthCriterion => ({ key, title: key, description: "", questions, site: "" });

describe("health checks — definitions", () => {
  it("presets fill options with weights; keys are unique", () => {
    const yn = presetOptions("yesno");
    expect(yn.multi).toBe(false);
    expect(yn.options.map((o) => [o.key, o.weight])).toEqual([["yes", 1], ["no", 0]]);
    expect(presetOptions("allsomeno").options.map((o) => o.weight)).toEqual([2, 1, 0]);
    expect(presetOptions("scale5").options.length).toBe(6);
    expect(presetOptions("multi").multi).toBe(true);
    expect(keyFor("Ritual started on time?", ["ritual-started-on-time"])).toBe("ritual-started-on-time-2");
  });
  it("standard and site configs round-trip; site criteria carry their site; a bad blob is empty", () => {
    const std = { standard: { priorities: [crit("a", [q("q1", [["Yes", 1], ["No", 0]])])], initiative: [], cadence: [], documents: [] } };
    const back = parseHealthStandard(serializeHealthStandard(std));
    expect(back.standard.priorities[0].questions[0].options[0]).toEqual({ key: "yes", label: "Yes", guidance: "", weight: 1 });
    const site = { enabled: { priorities: true, initiative: false, cadence: false, documents: false }, criteria: { priorities: [crit("b", [q("q2", [["All", 2], ["No", 0]])])], initiative: [], cadence: [], documents: [] } };
    const sb = parseHealthSiteConfig(serializeHealthSiteConfig(site), "Bell Bay");
    expect(sb.enabled.priorities).toBe(true);
    expect(sb.criteria.priorities[0].site).toBe("Bell Bay");
    expect(criteriaFor("priorities", back, sb).map((c) => c.key)).toEqual(["a", "b"]);
    expect(parseHealthStandard("garbage").standard.cadence).toEqual([]);
  });
  it("names the problems that block a save", () => {
    const bad = [crit("", []), crit("x", [q("", [["Yes", 0]])]), crit("x", [q("q", [["A", 1], ["B", 1]])])];
    const p = criteriaProblems(bad);
    expect(p.join("|")).toMatch(/no title/);
    expect(p.join("|")).toMatch(/no questions/);
    expect(p.join("|")).toMatch(/no text/);
    expect(p.join("|")).toMatch(/at least two options/);
    expect(p.join("|")).toMatch(/worth anything/);
    expect(p.join("|")).toMatch(/used twice/);
    expect(criteriaProblems([crit("ok", [q("q", [["Yes", 1], ["No", 0]])])])).toEqual([]);
  });
});

describe("health checks — score (decision 3)", () => {
  const criteria = [
    crit("c1", [q("a", [["Yes", 1], ["No", 0]]), q("b", [["All", 2], ["Some", 1], ["No", 0]])]),
    crit("c2", [q("m", [["X", 1], ["Y", 1], ["Z", 1]], true), q("n", [["Yes", 1], ["No", 0]], false, true)]),
  ];
  it("possible = highest (single) or sum of positives (multi)", () => {
    expect(questionPossible(q("b", [["All", 2], ["Some", 1], ["No", 0]]))).toBe(2);
    expect(questionPossible(q("m", [["X", 1], ["Y", 1], ["Z", 1]], true))).toBe(3);
  });
  it("the overall is a weighted whole; per criterion too; remaining counts unanswered", () => {
    const s = scoreFor(criteria, { a: ["yes"], b: ["some"], m: ["x", "z"], n: ["no"] });
    expect(s.got).toBe(1 + 1 + 2 + 0);
    expect(s.possible).toBe(1 + 2 + 3 + 1);
    expect(s.value).toBe(2.9);
    expect(s.remaining).toBe(0);
    expect(s.perCriterion.map((p) => p.value)).toEqual([3.3, 2.5]);
  });
  it("N/A drops a question from both sides only where allowed; unanswered stays in the denominator", () => {
    const s = scoreFor(criteria, { a: ["yes"], b: ["all"], m: ["x", "y", "z"], n: "na" });
    expect(s.possible).toBe(6);
    expect(s.value).toBe(5);
    const s2 = scoreFor(criteria, { a: "na", b: ["all"], m: ["x", "y", "z"], n: "na" });
    expect(s2.remaining).toBe(1); // "a" does not allow N/A → still owed
    expect(s2.possible).toBe(6); // a (1) + b (2) + m (3); n is N/A
    expect(scoreFor(criteria, {}).value).toBe(0);
    expect(scoreFor([], {}).value).toBeNull();
  });
  it("answer(): single replaces and un-picks, multi toggles, N/A toggles", () => {
    const b = q("b", [["All", 2], ["Some", 1], ["No", 0]]);
    let a = answer({}, b, "all");
    expect(a.b).toEqual(["all"]);
    a = answer(a, b, "some");
    expect(a.b).toEqual(["some"]);
    a = answer(a, b, "some");
    expect(a.b).toEqual([]);
    const m = q("m", [["X", 1], ["Y", 1]], true);
    let am = answer({}, m, "x");
    am = answer(am, m, "y");
    expect(am.m).toEqual(["x", "y"]);
    am = answer(am, m, "x");
    expect(am.m).toEqual(["y"]);
    const n = q("n", [["Yes", 1], ["No", 0]], false, true);
    let an = answer({}, n, "na");
    expect(an.n).toBe("na");
    an = answer(an, n, "na");
    expect(an.n).toBeUndefined();
  });
});

describe("health checks — scope and rules", () => {
  const org = { company: "PPA", site: "Bell Bay", department: "Casting", area: "" };
  it("scope keys", () => {
    expect(scopeKey({ type: "priorities", site: "Bell Bay", label: "", pillarId: "p1", org })).toBe("pillar:p1|org:PPA|Bell Bay|Casting|");
    expect(scopeKey({ type: "initiative", site: "Bell Bay", label: "", initiativeId: "i1" })).toBe("init:i1");
    expect(scopeKey({ type: "cadence", site: "Bell Bay", label: "", boardId: "b1", instanceId: "x" })).toBe("board:b1");
    expect(scopeKey({ type: "documents", site: "Bell Bay", label: "", org })).toBe("org:PPA|Bell Bay|Casting|");
  });
  it("editable for seven days after submission; drafts always; void never", () => {
    expect(editable({ status: "draft", submittedAt: "" }, "2026-10-21T00:00:00Z")).toBe(true);
    expect(editable({ status: "submitted", submittedAt: "2026-10-15T00:00:00Z" }, "2026-10-21T00:00:00Z")).toBe(true);
    expect(editable({ status: "submitted", submittedAt: "2026-10-13T00:00:00Z" }, "2026-10-21T00:00:00Z")).toBe(false);
    expect(editable({ status: "void", submittedAt: "2026-10-20T00:00:00Z" }, "2026-10-21T00:00:00Z")).toBe(false);
  });
  it("today's check per scope ignores void; the trend is submitted only, newest first, six at most", () => {
    const mk = (date: string, status: "draft" | "submitted" | "void", key = "init:i1") => ({ scopeKey: key, date, status, submittedAt: `${date}T10:00:00Z` });
    const checks = [mk("2026-10-21", "void"), mk("2026-10-21", "draft"), mk("2026-10-20", "submitted"), mk("2026-10-01", "submitted"), mk("2026-10-19", "submitted", "init:i2")];
    expect(todaysCheck(checks, "init:i1", "2026-10-21")?.status).toBe("draft");
    expect(todaysCheck(checks, "init:i1", "2026-10-22")).toBeNull();
    expect(trendFor(checks, "init:i1").map((c) => c.date)).toEqual(["2026-10-20", "2026-10-01"]);
    const many = Array.from({ length: 9 }, (_, i) => mk(`2026-09-${String(i + 10).padStart(2, "0")}`, "submitted" as const));
    expect(trendFor(many, "init:i1").length).toBe(6);
  });
});
