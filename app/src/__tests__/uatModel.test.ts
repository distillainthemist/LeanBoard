import { describe, expect, it } from "vitest";
import { parseUatMarkdown, caseHash } from "../../../tools/uat-parse.mjs";
import {
  UAT_COMPONENTS,
  UatRun,
  UatResult,
  UatScripts,
  casesFor,
  casesForTester,
  changedSince,
  failIssueDescription,
  failIssueTitle,
  failedCases,
  parseAssignees,
  progressByPersona,
  progressByTester,
  progressFor,
  snapshotCases,
} from "../uat/model";

const SAMPLE = `# Documents

## Journey 1 — Register

### UAT-DOC-001 — Open the register
persona: reader
modules: docs/docsScreen.ts
preconditions: a site with one exposed library
steps:
1. Open Documents.
2. Pick a library.
expected: the documents list

### UAT-DOC-002 — Filter by status
persona: reader
steps:
1. Filters → Status.
expected: only matching rows
`;

describe("UAT script parser", () => {
  it("parses journeys, cases, fields and numbered steps", () => {
    const r = parseUatMarkdown(SAMPLE, "documents", ["reader"]);
    expect(r.errors).toEqual([]);
    expect(r.title).toBe("Documents");
    expect(r.journeys[0].cases.map((c) => c.id)).toEqual(["UAT-DOC-001", "UAT-DOC-002"]);
    const c = r.journeys[0].cases[0];
    expect(c.steps).toEqual(["Open Documents.", "Pick a library."]);
    expect(c.modules).toEqual(["docs/docsScreen.ts"]);
    expect(c.preconditions).toBe("a site with one exposed library");
    expect(caseHash(c)).toMatch(/^[0-9a-f]{8}$/);
    expect(caseHash({ ...c, expected: "x" })).not.toBe(caseHash(c));
  });
  it("reports a missing field, an unknown persona, a duplicate id and a bad id", () => {
    const bad = `# X\n## J\n### UAT-DOC-001 — a\npersona: ghost\nsteps:\n1. s\n### UAT-DOC-001 — b\npersona: reader\nexpected: e\n### DOC-3 — c\npersona: reader\nsteps:\n1. s\nexpected: e\n`;
    const r = parseUatMarkdown(bad, "documents", ["reader"]);
    expect(r.errors.join("|")).toMatch(/missing expected/);
    expect(r.errors.join("|")).toMatch(/unknown persona/);
    expect(r.errors.join("|")).toMatch(/missing steps/);
    expect(r.errors.join("|")).toMatch(/duplicate id/);
    expect(r.errors.join("|")).toMatch(/must look like/);
  });
  it("every shipped script parses clean against its component's personas", async () => {
    // node's fs through a computed specifier: the app tsconfig has no
    // node types, and this test is the only reader of docs/uat
    const fs = (await import("node" + ":fs")) as { readdirSync: (d: string) => string[]; readFileSync: (f: string, e: string) => string };
    const dir = new URL("../../../docs/uat/", import.meta.url).pathname;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const comp = UAT_COMPONENTS.find((c) => c.key === f.replace(/\.md$/, ""));
      expect(comp, `${f} has no component in components.json`).toBeDefined();
      const r = parseUatMarkdown(fs.readFileSync(dir + f, "utf8"), comp!.key, comp!.personas);
      expect(r.errors, f).toEqual([]);
      expect(r.journeys.reduce((n, j) => n + j.cases.length, 0)).toBeGreaterThan(0);
    }
  });
});

const scripts: UatScripts = {
  generatedAt: "2026-10-19",
  releases: [{ tag: "v0.74.0", date: "2026-10-19" }, { tag: "v0.73.2", date: "2026-10-13" }],
  components: {
    documents: {
      title: "Documents",
      journeys: [
        { title: "J1", cases: [
          { id: "UAT-DOC-001", title: "a", journey: "J1", persona: "reader", modules: [], preconditions: "", steps: ["s"], expected: "e", hash: "1", changed: "2026-10-10" },
          { id: "UAT-DOC-002", title: "b", journey: "J1", persona: "owner", modules: [], preconditions: "", steps: ["s"], expected: "e", hash: "2", changed: "2026-10-19" },
        ] },
      ],
    },
  },
};
const run = (over: Partial<UatRun> = {}): UatRun => ({
  rowId: "r", name: "Run", description: "", status: "running", components: ["documents"], appVersion: "0.74.0", environment: "test",
  assignees: [{ whoId: "a", email: "ann@x.com", name: "Ann", personas: ["reader"] }, { whoId: "b", email: "ben@x.com", name: "Ben", personas: [] }],
  cases: snapshotCases(casesFor(scripts, ["documents"])), scope: "all", createdByEmail: "", createdByName: "", createdAt: "", closedByName: "", closedAt: "", closingNote: "", ...over,
});
const res = (caseId: string, outcome: UatResult["outcome"], tester: string, at = "2026-10-19T10:00:00Z"): UatResult => ({ rowId: "", runId: "r", caseId, outcome, note: "", testerEmail: tester, testerName: tester, at, issueId: "" });

describe("UAT runs", () => {
  it("scopes: every case, or only those changed since a release", () => {
    const all = casesFor(scripts, ["documents"]);
    expect(all.map((c) => c.id)).toEqual(["UAT-DOC-001", "UAT-DOC-002"]);
    expect(changedSince(all, scripts, "v0.73.2").map((c) => c.id)).toEqual(["UAT-DOC-002"]);
    expect(changedSince(all, scripts, "v9.9.9").length).toBe(2);
  });
  it("a tester owes their personas' cases; no personas = everything", () => {
    const r = run();
    expect(casesForTester(r, "ANN@x.com").map((c) => c.id)).toEqual(["UAT-DOC-001"]);
    expect(casesForTester(r, "ben@x.com").length).toBe(2);
    expect(casesForTester(r, "nobody@x.com")).toEqual([]);
  });
  it("progress per tester takes the latest result per case", () => {
    const r = run();
    const results = [res("UAT-DOC-001", "fail", "ann@x.com", "2026-10-19T09:00:00Z"), res("UAT-DOC-001", "pass", "ann@x.com", "2026-10-19T10:00:00Z"), res("UAT-DOC-001", "pass", "ben@x.com")];
    expect(progressFor(casesForTester(r, "ann@x.com"), results, "ann@x.com")).toEqual({ total: 1, pass: 1, fail: 0, blocked: 0, skipped: 0, untested: 0 });
    const byT = progressByTester(r, results);
    expect(byT[1].progress).toEqual({ total: 2, pass: 1, fail: 0, blocked: 0, skipped: 0, untested: 1 });
  });
  it("progress per persona: any fail is a fail; a re-run takes the failed and blocked cases", () => {
    const r = run();
    const results = [res("UAT-DOC-001", "pass", "ann@x.com"), res("UAT-DOC-001", "fail", "ben@x.com"), res("UAT-DOC-002", "blocked", "ben@x.com")];
    const byP = progressByPersona(r, results);
    expect(byP.find((p) => p.persona === "reader")?.progress.fail).toBe(1);
    expect(byP.find((p) => p.persona === "owner")?.progress.blocked).toBe(1);
    expect(failedCases(r, results).map((c) => c.id)).toEqual(["UAT-DOC-001", "UAT-DOC-002"]);
  });
  it("assignees parse and the fail issue is prefilled from the case", () => {
    expect(parseAssignees('[{"whoId":"a","email":"Ann@X.com","name":"Ann","personas":["reader",""]},{"email":""}]')).toEqual([{ whoId: "a", email: "ann@x.com", name: "Ann", personas: ["reader"] }]);
    expect(failIssueTitle({ id: "UAT-DOC-051", title: "Submit for review" })).toBe("UAT DOC-051: Submit for review");
    expect(failIssueDescription({ steps: ["a", "b"], expected: "e", preconditions: "p" })).toBe("Preconditions: p\n\nSteps:\n1. a\n2. b\n\nExpected: e\n\nWhat happened instead:\n");
  });
});
