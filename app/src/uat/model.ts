// UAT (uat-proposal-2026-10.md) — the pure side: the shipped script
// shape, runs, per-tester results, progress and scopes. vitest covers
// this; store.ts talks to Dataverse; settingsTab.ts and uatTab.ts paint.

import registry from "./components.json";

export interface UatComponent {
  key: string;
  label: string;
  /** The issue area a Fail reports under. */
  issueArea: string;
  personas: string[];
  modules: string[];
}

export const UAT_COMPONENTS: UatComponent[] = registry as UatComponent[];

export interface UatCase {
  id: string;
  title: string;
  journey: string;
  persona: string;
  modules: string[];
  preconditions: string;
  steps: string[];
  expected: string;
  hash: string;
  /** The date the case last changed (ISO date). */
  changed: string;
}

export interface UatScripts {
  generatedAt: string;
  releases: { tag: string; date: string }[];
  components: Record<string, { title: string; journeys: { title: string; cases: UatCase[] }[] }>;
}

export interface UatAssignee {
  whoId: string;
  email: string;
  name: string;
  personas: string[];
}

/** A case as a run froze it: id, component, journey, persona, title. */
export interface UatRunCase {
  id: string;
  component: string;
  journey: string;
  persona: string;
  title: string;
  hash: string;
}

export interface UatRun {
  rowId: string;
  name: string;
  status: "planned" | "running" | "closed";
  components: string[];
  appVersion: string;
  environment: string;
  assignees: UatAssignee[];
  cases: UatRunCase[];
  scope: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
  closedByName: string;
  closedAt: string;
  closingNote: string;
}

export type UatOutcome = "pass" | "fail" | "blocked" | "skipped";

export interface UatResult {
  rowId: string;
  runId: string;
  caseId: string;
  outcome: UatOutcome;
  note: string;
  testerEmail: string;
  testerName: string;
  at: string;
  issueId: string;
}

export const OUTCOME_WORDS: Record<UatOutcome, string> = { pass: "Pass", fail: "Fail", blocked: "Blocked", skipped: "Skipped" };

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function parseAssignees(raw: string): UatAssignee[] {
  try {
    return arr(JSON.parse(raw || "[]"))
      .map((x) => obj(x))
      .map((x) => ({ whoId: str(x.whoId), email: str(x.email).toLowerCase(), name: str(x.name), personas: arr(x.personas).map((p) => str(p)).filter((p) => p !== "") }))
      .filter((a) => a.email !== "" || a.whoId !== "");
  } catch {
    return [];
  }
}

export function parseRunCases(raw: string): UatRunCase[] {
  try {
    return arr(JSON.parse(raw || "[]"))
      .map((x) => obj(x))
      .map((x) => ({ id: str(x.id), component: str(x.component), journey: str(x.journey), persona: str(x.persona), title: str(x.title), hash: str(x.hash) }))
      .filter((c) => c.id !== "");
  } catch {
    return [];
  }
}

export function parseComponentKeys(raw: string): string[] {
  try {
    return arr(JSON.parse(raw || "[]")).map((x) => str(x)).filter((x) => x !== "");
  } catch {
    return [];
  }
}

/** Every case of the chosen components, flattened. */
export function casesFor(scripts: UatScripts, components: string[]): (UatCase & { component: string })[] {
  const out: (UatCase & { component: string })[] = [];
  for (const key of components) {
    for (const j of scripts.components[key]?.journeys ?? []) for (const c of j.cases) out.push({ ...c, component: key });
  }
  return out;
}

/** The cases changed since a release (its date, exclusive) — the delta
 *  scope; an unknown release = every case. */
export function changedSince(cases: (UatCase & { component: string })[], scripts: UatScripts, releaseTag: string): (UatCase & { component: string })[] {
  const rel = scripts.releases.find((r) => r.tag === releaseTag);
  if (rel === undefined) return cases;
  return cases.filter((c) => c.changed > rel.date);
}

/** Freeze the cases a run tests. */
export function snapshotCases(cases: (UatCase & { component: string })[]): UatRunCase[] {
  return cases.map((c) => ({ id: c.id, component: c.component, journey: c.journey, persona: c.persona, title: c.title, hash: c.hash }));
}

/** The cases a tester owes: those in the personas they were given
 *  (an assignee with no personas sees every case). */
export function casesForTester(run: UatRun, email: string): UatRunCase[] {
  const me = run.assignees.find((a) => a.email === email.trim().toLowerCase());
  if (me === undefined) return [];
  if (me.personas.length === 0) return run.cases;
  const set = new Set(me.personas);
  return run.cases.filter((c) => set.has(c.persona));
}

/** Is this person on the run? */
export function isAssignee(run: UatRun, email: string): boolean {
  const e = email.trim().toLowerCase();
  return run.assignees.some((a) => a.email === e);
}

export interface UatProgress {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  skipped: number;
  untested: number;
}

const emptyProgress = (total: number): UatProgress => ({ total, pass: 0, fail: 0, blocked: 0, skipped: 0, untested: total });

/** Progress over a case list for ONE tester (their latest result per case). */
export function progressFor(cases: UatRunCase[], results: UatResult[], testerEmail: string): UatProgress {
  const e = testerEmail.trim().toLowerCase();
  const latest = new Map<string, UatResult>();
  for (const r of results) {
    if (r.testerEmail !== e) continue;
    const prev = latest.get(r.caseId);
    if (prev === undefined || prev.at < r.at) latest.set(r.caseId, r);
  }
  const p = emptyProgress(cases.length);
  for (const c of cases) {
    const r = latest.get(c.id);
    if (r === undefined) continue;
    p[r.outcome]++;
    p.untested--;
  }
  return p;
}

/** Progress per assignee, each over the cases they owe. */
export function progressByTester(run: UatRun, results: UatResult[]): { assignee: UatAssignee; progress: UatProgress }[] {
  return run.assignees.map((a) => ({ assignee: a, progress: progressFor(casesForTester(run, a.email), results, a.email) }));
}

/** Progress per persona over every tester who owes that persona —
 *  a case counts as tested when ANY of its testers recorded it; it
 *  counts as a fail when any of them failed it. */
export function progressByPersona(run: UatRun, results: UatResult[]): { persona: string; progress: UatProgress }[] {
  const personas = [...new Set(run.cases.map((c) => c.persona))];
  return personas.map((persona) => {
    const cases = run.cases.filter((c) => c.persona === persona);
    const p = emptyProgress(cases.length);
    for (const c of cases) {
      const rs = results.filter((r) => r.caseId === c.id);
      if (rs.length === 0) continue;
      p.untested--;
      if (rs.some((r) => r.outcome === "fail")) p.fail++;
      else if (rs.some((r) => r.outcome === "blocked")) p.blocked++;
      else if (rs.some((r) => r.outcome === "pass")) p.pass++;
      else p.skipped++;
    }
    return { persona, progress: p };
  });
}

/** The latest result per case for one tester. */
export function latestByCase(results: UatResult[], testerEmail: string): Map<string, UatResult> {
  const e = testerEmail.trim().toLowerCase();
  const out = new Map<string, UatResult>();
  for (const r of results) {
    if (r.testerEmail !== e) continue;
    const prev = out.get(r.caseId);
    if (prev === undefined || prev.at < r.at) out.set(r.caseId, r);
  }
  return out;
}

/** The cases a re-run takes: every case any tester failed or blocked. */
export function failedCases(run: UatRun, results: UatResult[]): UatRunCase[] {
  const bad = new Set(results.filter((r) => r.outcome === "fail" || r.outcome === "blocked").map((r) => r.caseId));
  return run.cases.filter((c) => bad.has(c.id));
}

/** The run and case an issue was raised from, as its context carries
 *  them (the Issues tab filters on these). */
export const UAT_CONTEXT_KEYS = { run: "uatRun", runName: "uatRunName", case: "uatCase" } as const;

/** A tester's issue title for a failed case. */
export function failIssueTitle(c: { id: string; title: string }): string {
  return `UAT ${c.id.replace(/^UAT-/, "")}: ${c.title}`.slice(0, 290);
}

/** The issue description a Fail pre-fills: the steps and the expected
 *  result, then room for what happened. */
export function failIssueDescription(c: { steps: string[]; expected: string; preconditions: string }): string {
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `${c.preconditions !== "" ? `Preconditions: ${c.preconditions}\n\n` : ""}Steps:\n${steps}\n\nExpected: ${c.expected}\n\nWhat happened instead:\n`;
}
