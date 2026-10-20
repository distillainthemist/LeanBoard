// Health checks (docs/health-checks-proposal-2026-10.md) — the pure
// side: criteria and questions, the presets, the score rule, scopes,
// the one-per-day rule, the seven-day lock, the trend. vitest covers
// this; store.ts talks to Dataverse; settingsTab.ts and checkDialog.ts
// paint.

export type HealthType = "priorities" | "initiative" | "cadence" | "documents";
export const HEALTH_TYPES: { key: HealthType; label: string; scopeWord: string }[] = [
  { key: "priorities", label: "Priorities", scopeWord: "sub-pillar" },
  { key: "initiative", label: "Initiatives", scopeWord: "initiative" },
  { key: "cadence", label: "Cadence", scopeWord: "meeting" },
  { key: "documents", label: "Documents", scopeWord: "organisation" },
];

export interface HealthOption {
  key: string;
  label: string;
  /** The screenshot's "<30% unassigned" — a line under the label. */
  guidance: string;
  /** Whole number ≥ 0; invisible to the assessor (decision 2). */
  weight: number;
}

export interface HealthQuestion {
  key: string;
  text: string;
  /** Several options may be chosen. */
  multi: boolean;
  /** The assessor may mark it N/A — out of both numerator and denominator. */
  allowNa: boolean;
  options: HealthOption[];
}

export interface HealthCriterion {
  key: string;
  title: string;
  description: string;
  questions: HealthQuestion[];
  /** "" = standard; a site name = that site's own criterion. */
  site: string;
}

/** The APP_ROW's part: the standard criteria per type. */
export interface HealthStandard {
  standard: Record<HealthType, HealthCriterion[]>;
}
/** A site row's part: the switches and the site's own criteria. */
export interface HealthSiteConfig {
  enabled: Record<HealthType, boolean>;
  criteria: Record<HealthType, HealthCriterion[]>;
}

export type HealthStatus = "draft" | "submitted" | "void";

/** What a check points at (decision 4). */
export interface HealthScope {
  type: HealthType;
  site: string;
  /** priorities: the sub-pillar at an org; documents: the org. */
  org?: { company: string; site: string; department: string; area: string };
  pillarId?: string;
  initiativeId?: string;
  boardId?: string;
  /** cadence: the occurrence the check was done in ("" = live). */
  instanceId?: string;
  label: string;
}

/** Answers: question key → chosen option keys, or "na". */
export type HealthAnswers = Record<string, string[] | "na">;

export interface HealthCheck {
  rowId: string;
  type: HealthType;
  site: string;
  scopeKey: string;
  scope: HealthScope;
  date: string;
  status: HealthStatus;
  criteria: HealthCriterion[];
  answers: HealthAnswers;
  score: HealthScore;
  wentWell: string;
  betterIf: string;
  assessorEmail: string;
  assessorName: string;
  createdAt: string;
  submittedAt: string;
  editedByName: string;
  editedAt: string;
  voidedByName: string;
  voidedAt: string;
  voidReason: string;
}

export interface HealthScore {
  /** 0–5 to one decimal; null = nothing applicable answered. */
  value: number | null;
  got: number;
  possible: number;
  /** Questions still to answer (not N/A, not answered). */
  remaining: number;
  perCriterion: { key: string; value: number | null; got: number; possible: number }[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const EMPTY_BY_TYPE = <T>(make: () => T): Record<HealthType, T> => ({ priorities: make(), initiative: make(), cadence: make(), documents: make() });

/** A key from a label: lowercase words joined, unique among `taken`. */
export function keyFor(label: string, taken: string[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "q";
  let k = base;
  let n = 2;
  while (taken.includes(k)) k = `${base}-${n++}`;
  return k;
}

// ---- presets (decision 2) ------------------------------------------------

export const PRESETS: { key: string; label: string; multi: boolean; options: { label: string; weight: number }[] }[] = [
  { key: "yesno", label: "Yes / no", multi: false, options: [{ label: "Yes", weight: 1 }, { label: "No", weight: 0 }] },
  { key: "allsomeno", label: "All / some / no", multi: false, options: [{ label: "All", weight: 2 }, { label: "Some", weight: 1 }, { label: "No", weight: 0 }] },
  { key: "scale5", label: "0–5 scale", multi: false, options: [0, 1, 2, 3, 4, 5].map((n) => ({ label: String(n), weight: n })) },
  { key: "multi", label: "Multi select", multi: true, options: [{ label: "Option A", weight: 1 }, { label: "Option B", weight: 1 }] },
];

export function presetOptions(presetKey: string): { multi: boolean; options: HealthOption[] } {
  const p = PRESETS.find((x) => x.key === presetKey) ?? PRESETS[0];
  const taken: string[] = [];
  return {
    multi: p.multi,
    options: p.options.map((o) => {
      const key = keyFor(o.label, taken);
      taken.push(key);
      return { key, label: o.label, guidance: "", weight: o.weight };
    }),
  };
}

// ---- parse / serialise ---------------------------------------------------

export function parseOption(v: unknown): HealthOption | null {
  const o = obj(v);
  const key = str(o.key);
  if (key === "") return null;
  return { key, label: str(o.label), guidance: str(o.guidance), weight: Math.max(0, Math.round(num(o.weight))) };
}

export function parseQuestion(v: unknown): HealthQuestion | null {
  const o = obj(v);
  const key = str(o.key);
  if (key === "") return null;
  return {
    key,
    text: str(o.text),
    multi: o.multi === true,
    allowNa: o.allowNa === true,
    options: arr(o.options).map(parseOption).filter((x): x is HealthOption => x !== null),
  };
}

export function parseCriterion(v: unknown): HealthCriterion | null {
  const o = obj(v);
  const key = str(o.key);
  if (key === "") return null;
  return {
    key,
    title: str(o.title),
    description: str(o.description),
    questions: arr(o.questions).map(parseQuestion).filter((x): x is HealthQuestion => x !== null),
    site: str(o.site),
  };
}

const byType = (v: unknown, site: string): Record<HealthType, HealthCriterion[]> => {
  const o = obj(v);
  const out = EMPTY_BY_TYPE<HealthCriterion[]>(() => []);
  for (const t of HEALTH_TYPES) {
    out[t.key] = arr(o[t.key])
      .map(parseCriterion)
      .filter((x): x is HealthCriterion => x !== null)
      .map((c) => ({ ...c, site }));
  }
  return out;
};

export function parseHealthStandard(raw: string): HealthStandard {
  try {
    const o = obj(JSON.parse(raw || "{}"));
    return { standard: byType(o.standard, "") };
  } catch {
    return { standard: EMPTY_BY_TYPE<HealthCriterion[]>(() => []) };
  }
}

export function serializeHealthStandard(s: HealthStandard): string {
  return JSON.stringify({ standard: s.standard });
}

export function parseHealthSiteConfig(raw: string, site: string): HealthSiteConfig {
  try {
    const o = obj(JSON.parse(raw || "{}"));
    const en = obj(o.enabled);
    const enabled = EMPTY_BY_TYPE<boolean>(() => false);
    for (const t of HEALTH_TYPES) enabled[t.key] = en[t.key] === true;
    return { enabled, criteria: byType(o.criteria, site) };
  } catch {
    return { enabled: EMPTY_BY_TYPE<boolean>(() => false), criteria: EMPTY_BY_TYPE<HealthCriterion[]>(() => []) };
  }
}

export function serializeHealthSiteConfig(c: HealthSiteConfig): string {
  return JSON.stringify({ enabled: c.enabled, criteria: c.criteria });
}

/** The criteria a check on a site freezes: standard first, the site's own after. */
export function criteriaFor(type: HealthType, standard: HealthStandard, site: HealthSiteConfig): HealthCriterion[] {
  return [...standard.standard[type], ...site.criteria[type]];
}

/** Problems that block saving a definition. */
export function criteriaProblems(list: HealthCriterion[]): string[] {
  const out: string[] = [];
  const keys = new Set<string>();
  for (const c of list) {
    if (c.title.trim() === "") out.push("A criterion has no title.");
    if (keys.has(c.key)) out.push(`Criterion key “${c.key}” is used twice.`);
    keys.add(c.key);
    if (c.questions.length === 0) out.push(`“${c.title || c.key}” has no questions.`);
    const qk = new Set<string>();
    for (const q of c.questions) {
      if (q.text.trim() === "") out.push(`A question under “${c.title || c.key}” has no text.`);
      if (qk.has(q.key)) out.push(`Question key “${q.key}” is used twice under “${c.title || c.key}”.`);
      qk.add(q.key);
      if (q.options.length < 2) out.push(`“${q.text || q.key}” needs at least two options.`);
      if (!q.options.some((o) => o.weight > 0)) out.push(`“${q.text || q.key}” has no option worth anything.`);
    }
  }
  return out;
}

// ---- scope (decision 4) ----------------------------------------------------

export function orgKeyOf(o: { company: string; site: string; department: string; area: string }): string {
  return [o.company, o.site, o.department, o.area].join("|");
}

/** One key per scope — what "one check per scope per day" compares. */
export function scopeKey(s: HealthScope): string {
  switch (s.type) {
    case "priorities":
      return `pillar:${s.pillarId ?? ""}|org:${s.org ? orgKeyOf(s.org) : ""}`;
    case "initiative":
      return `init:${s.initiativeId ?? ""}`;
    case "cadence":
      return `board:${s.boardId ?? ""}`;
    case "documents":
      return `org:${s.org ? orgKeyOf(s.org) : ""}`;
  }
}

export function parseScope(raw: string, type: HealthType, site: string, label: string): HealthScope {
  try {
    const o = obj(JSON.parse(raw || "{}"));
    const org = o.org ? obj(o.org) : null;
    return {
      type,
      site,
      label,
      ...(org ? { org: { company: str(org.company), site: str(org.site), department: str(org.department), area: str(org.area) } } : {}),
      ...(str(o.pillarId) !== "" ? { pillarId: str(o.pillarId) } : {}),
      ...(str(o.initiativeId) !== "" ? { initiativeId: str(o.initiativeId) } : {}),
      ...(str(o.boardId) !== "" ? { boardId: str(o.boardId) } : {}),
      ...(str(o.instanceId) !== "" ? { instanceId: str(o.instanceId) } : {}),
    };
  } catch {
    return { type, site, label };
  }
}

export function serializeScope(s: HealthScope): string {
  const { type: _t, site: _s, label: _l, ...rest } = s;
  return JSON.stringify(rest);
}

export function parseAnswers(raw: string): HealthAnswers {
  try {
    const o = obj(JSON.parse(raw || "{}"));
    const out: HealthAnswers = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === "na") out[k] = "na";
      else if (Array.isArray(v)) out[k] = v.map((x) => str(x)).filter((x) => x !== "");
    }
    return out;
  } catch {
    return {};
  }
}

// ---- score (decision 3) ----------------------------------------------------

/** A question's possible score: the highest option (single), the sum of
 *  the positive options (multi). */
export function questionPossible(q: HealthQuestion): number {
  if (q.options.length === 0) return 0;
  return q.multi ? q.options.filter((o) => o.weight > 0).reduce((a, o) => a + o.weight, 0) : Math.max(...q.options.map((o) => o.weight));
}

export function questionGot(q: HealthQuestion, chosen: string[]): number {
  const set = new Set(chosen);
  const picked = q.options.filter((o) => set.has(o.key));
  if (q.multi) return picked.reduce((a, o) => a + o.weight, 0);
  return picked[0]?.weight ?? 0;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function scoreFor(criteria: HealthCriterion[], answers: HealthAnswers): HealthScore {
  let got = 0;
  let possible = 0;
  let remaining = 0;
  const perCriterion: HealthScore["perCriterion"] = [];
  for (const c of criteria) {
    let cg = 0;
    let cp = 0;
    for (const q of c.questions) {
      const a = answers[q.key];
      if (a === "na" && q.allowNa) continue;
      if (a === undefined || a === "na" || a.length === 0) {
        remaining++;
        cp += questionPossible(q);
        continue;
      }
      cp += questionPossible(q);
      cg += Math.min(questionGot(q, a), questionPossible(q));
    }
    got += cg;
    possible += cp;
    perCriterion.push({ key: c.key, value: cp > 0 ? round1((5 * cg) / cp) : null, got: cg, possible: cp });
  }
  return { value: possible > 0 ? round1((5 * got) / possible) : null, got, possible, remaining, perCriterion };
}

/** Set one answer: single selects replace, multi toggles, "na" clears. */
export function answer(answers: HealthAnswers, q: HealthQuestion, optionKey: string | "na"): HealthAnswers {
  const next = { ...answers };
  if (optionKey === "na") {
    if (answers[q.key] === "na") delete next[q.key];
    else next[q.key] = "na";
    return next;
  }
  const cur = Array.isArray(answers[q.key]) ? (answers[q.key] as string[]) : [];
  if (q.multi) next[q.key] = cur.includes(optionKey) ? cur.filter((k) => k !== optionKey) : [...cur, optionKey];
  else next[q.key] = cur[0] === optionKey ? [] : [optionKey];
  return next;
}

// ---- rules (decision 5, 13) -------------------------------------------------

export const EDIT_WINDOW_DAYS = 7;

/** May a submitted check still be edited? Seven days from submission. */
export function editable(check: { status: HealthStatus; submittedAt: string }, nowIso: string): boolean {
  if (check.status === "draft") return true;
  if (check.status !== "submitted") return false;
  const t = Date.parse(check.submittedAt);
  if (Number.isNaN(t)) return false;
  return Date.parse(nowIso) - t < EDIT_WINDOW_DAYS * 86_400_000;
}

/** The day's check on a scope, if any (draft or submitted; void never). */
export function todaysCheck<T extends { scopeKey: string; date: string; status: HealthStatus }>(checks: T[], key: string, date: string): T | null {
  return checks.find((c) => c.scopeKey === key && c.date === date && c.status !== "void") ?? null;
}

/** The trend: the last `n` non-void checks on a scope, newest first,
 *  submitted only. */
export function trendFor<T extends { scopeKey: string; date: string; status: HealthStatus; submittedAt: string }>(checks: T[], key: string, n = 6): T[] {
  return checks
    .filter((c) => c.scopeKey === key && c.status === "submitted")
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.submittedAt < b.submittedAt ? 1 : -1))
    .slice(0, n);
}

/** The row's primary name. */
export function checkName(type: HealthType, label: string, date: string): string {
  const t = HEALTH_TYPES.find((x) => x.key === type)?.label ?? type;
  return `${t} · ${label} · ${date}`.slice(0, 290);
}

export function scoreText(s: { value: number | null }): string {
  return s.value === null ? "—" : s.value.toFixed(1);
}
