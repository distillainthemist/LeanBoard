import { describe, expect, it } from "vitest";
import {
  HealthCriterion,
  HealthQuestionKind,
  answer,
  defaultOptions,
  newQuestion,
  withKind,
  criteriaFor,
  criteriaProblems,
  editable,
  keyFor,
  parseHealthSiteConfig,
  parseHealthStandard,
  questionPossible,
  scopeKey,
  scoreFor,
  serializeHealthSiteConfig,
  serializeHealthStandard,
  todaysCheck,
  trendFor,
} from "../health/model";

const q = (key: string, opts: [string, number][], kind: HealthQuestionKind = "list", allowNa = false) => ({
  key,
  text: key,
  kind,
  allowNa,
  options: opts.map(([label, weight]) => ({ key: label.toLowerCase(), label, guidance: "", weight })),
});
const crit = (key: string, questions: ReturnType<typeof q>[]): HealthCriterion => ({ key, title: key, description: "", questions, site: "" });

describe("health checks — definitions", () => {
  it("the forms' defaults: Yes 1 / No 0; All 1 / Some 0.5 / No 0; a list of two rows", () => {
    expect(defaultOptions("yesno").map((o) => [o.key, o.weight])).toEqual([["yes", 1], ["no", 0]]);
    expect(defaultOptions("allsomeno").map((o) => [o.key, o.weight])).toEqual([["all", 1], ["some", 0.5], ["no", 0]]);
    expect(defaultOptions("list").length).toBe(2);
    const nq = newQuestion("Ritual started on time?", "yesno", ["ritual-started-on-time"]);
    expect(nq.key).toBe("ritual-started-on-time-2");
    expect(withKind(nq, "allsomeno").options.map((o) => o.key)).toEqual(["all", "some", "no"]);
    expect(withKind(nq, "list").options.map((o) => o.key)).toEqual(["yes", "no"]); // kept as rows
    expect(keyFor("Ritual started on time?", ["ritual-started-on-time"])).toBe("ritual-started-on-time-2");
  });
  it("standard and site configs round-trip; site criteria carry their site; a bad blob is empty", () => {
    const std = { standard: { priorities: [crit("a", [q("q1", [["Yes", 1], ["No", 0]], "yesno")])], initiative: [], cadence: [], documents: [] } };
    const back = parseHealthStandard(serializeHealthStandard(std));
    expect(back.standard.priorities[0].questions[0].options[0]).toEqual({ key: "yes", label: "Yes", guidance: "", weight: 1 });
    expect(back.standard.priorities[0].questions[0].kind).toBe("yesno");
    // a blob from before `kind` infers it from the option keys; a fixed
    // form keeps its rows with the stored weights
    const old = parseHealthStandard('{"standard":{"cadence":[{"key":"c","title":"C","questions":[{"key":"q","text":"Q","options":[{"key":"all","label":"All","weight":2},{"key":"some","label":"Some","weight":1},{"key":"no","label":"No","weight":0}]}]}]}}');
    const oq = old.standard.cadence[0].questions[0];
    expect(oq.kind).toBe("allsomeno");
    expect(oq.options.map((o) => o.weight)).toEqual([2, 1, 0]);
    const site = { enabled: { priorities: true, initiative: false, cadence: false, documents: false }, criteria: { priorities: [crit("b", [q("q2", [["All", 2], ["No", 0]])])], initiative: [], cadence: [], documents: [] } };
    const sb = parseHealthSiteConfig(serializeHealthSiteConfig(site), "Bell Bay");
    expect(sb.enabled.priorities).toBe(true);
    expect(sb.criteria.priorities[0].site).toBe("Bell Bay");
    expect(criteriaFor("priorities", back, sb).map((c) => c.key)).toEqual(["a", "b"]);
    expect(parseHealthStandard("garbage").standard.cadence).toEqual([]);
  });
  it("names the problems that block a save", () => {
    const bad = [crit("", []), crit("x", [q("", [["Yes", 0]])]), crit("x", [q("q", [["A", 1], ["", 1]])])];
    const p = criteriaProblems(bad);
    expect(p.join("|")).toMatch(/no title/);
    expect(p.join("|")).toMatch(/no questions/);
    expect(p.join("|")).toMatch(/no text/);
    expect(p.join("|")).toMatch(/at least two choices/);
    expect(p.join("|")).toMatch(/worth anything/);
    expect(p.join("|")).toMatch(/has no title/);
    expect(p.join("|")).toMatch(/used twice/);
    expect(criteriaProblems([crit("ok", [q("q", [["Yes", 1], ["No", 0]], "yesno")])])).toEqual([]);
  });
});

describe("health checks — score (decision 3)", () => {
  const criteria = [
    crit("c1", [q("a", [["Yes", 1], ["No", 0]], "yesno"), q("b", [["All", 1], ["Some", 0.5], ["No", 0]], "allsomeno")]),
    crit("c2", [q("m", [["Poor", 0], ["Developing", 2], ["Excellent", 5]]), q("n", [["Yes", 1], ["No", 0]], "yesno", true)]),
  ];
  it("possible = the highest-weighted answer; halves count", () => {
    expect(questionPossible(q("b", [["All", 1], ["Some", 0.5], ["No", 0]], "allsomeno"))).toBe(1);
    expect(questionPossible(q("m", [["Poor", 0], ["Developing", 2], ["Excellent", 5]]))).toBe(5);
  });
  it("the overall is a weighted whole; per criterion too; remaining counts unanswered", () => {
    const s = scoreFor(criteria, { a: ["yes"], b: ["some"], m: ["developing"], n: ["no"] });
    expect(s.got).toBe(1 + 0.5 + 2 + 0);
    expect(s.possible).toBe(1 + 1 + 5 + 1);
    expect(s.value).toBe(2.2);
    expect(s.remaining).toBe(0);
    expect(s.perCriterion.map((p) => p.value)).toEqual([3.8, 1.7]);
  });
  it("N/A drops a question from both sides only where allowed; unanswered stays in the denominator", () => {
    const s = scoreFor(criteria, { a: ["yes"], b: ["all"], m: ["excellent"], n: "na" });
    expect(s.possible).toBe(7);
    expect(s.value).toBe(5);
    const s2 = scoreFor(criteria, { a: "na", b: ["all"], m: ["excellent"], n: "na" });
    expect(s2.remaining).toBe(1); // "a" does not allow N/A → still owed
    expect(s2.possible).toBe(7); // a (1) + b (1) + m (5); n is N/A
    expect(scoreFor(criteria, {}).value).toBe(0);
    expect(scoreFor([], {}).value).toBeNull();
  });
  it("answer(): a choice replaces the last, ticking it again un-ticks, N/A toggles", () => {
    const b = q("b", [["All", 1], ["Some", 0.5], ["No", 0]], "allsomeno");
    let a = answer({}, b, "all");
    expect(a.b).toEqual(["all"]);
    a = answer(a, b, "some");
    expect(a.b).toEqual(["some"]);
    a = answer(a, b, "some");
    expect(a.b).toEqual([]);
    const n = q("n", [["Yes", 1], ["No", 0]], "yesno", true);
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
