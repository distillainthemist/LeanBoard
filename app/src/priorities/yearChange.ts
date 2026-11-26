// The year change (issue review 2026-11-25, report 1). Pure.
//
// The pillar structure of one year, and what each pillar and sub-pillar
// becomes in the next: it CONTINUES, BECOMES another, or ENDS. Several
// may become one (a merge). A sub-pillar sits under whatever its pillar
// becomes unless it is moved. One Save applies the whole change.
//
// The rules a priority already follows do the rest: it crosses a year
// through the follow links (`pillarIdIn`), so nothing is rewritten per
// priority, and one placed by hand for the later year keeps its place.
//
// A sub-pillar ROW lives under exactly one pillar row. So a sub-pillar
// that continues under a pillar that became another row, or that moves
// under another pillar, is realised as a CARRY row: same name, starting
// the later year, following the old one. The panel shows it as
// "continues" — the rows are how it is stored, not what was decided.

import {
  PeriodSettings,
  Pillar,
  Priority,
  followsOf,
  objectiveColumns,
  pillarIdIn,
  pillarLiveIn,
  pillarsLiveIn,
  priorityLiveIn,
  withFollows,
} from "./model";

export type YcKind = "continues" | "becomes" | "ends";

export interface YcChoice {
  kind: YcKind;
  /** becomes: the row it becomes (a pillar for a pillar, a sub-pillar
   *  for a sub-pillar). */
  target?: string;
  /** A sub-pillar that continues: the pillar it sits under in the later
   *  year, when that is not simply what its own pillar becomes. */
  under?: string;
}

/** A pillar or sub-pillar added for the later year, in the panel. */
export interface YcNew {
  id: string;
  name: string;
  level: 1 | 2;
  /** A sub-pillar's pillar in the later year. */
  under?: string;
  color: string;
}

export interface YearChange {
  company: string;
  from: string;
  to: string;
  choices: Record<string, YcChoice>;
  added: YcNew[];
}

const inCompany = (p: Pillar, company: string): boolean => company === "" || p.company === company;
const byOrder = (a: Pillar, b: Pillar): number => a.order - b.order || a.name.localeCompare(b.name);

/** The earlier year's structure as the panel lists it: each pillar in
 *  force that year, with its sub-pillars in force beneath it. */
export function yearRows(settings: PeriodSettings, pillars: Pillar[], company: string, from: string): { pillar: Pillar; subs: Pillar[] }[] {
  const live = pillarsLiveIn(settings, pillars.filter((p) => inCompany(p, company)), from);
  return live
    .filter((p) => p.level === 1)
    .sort(byOrder)
    .map((pillar) => ({ pillar, subs: live.filter((s) => s.level === 2 && s.parentId === pillar.id).sort(byOrder) }));
}

/** Is `row` a CARRY of `of`: it starts the later year, follows it and
 *  has its name — the same sub-pillar under a different pillar row. */
function isCarry(row: Pillar, of: Pillar, to: string): boolean {
  return row.level === 2 && row.fromPeriod === to && followsOf(row).includes(of.id) && row.name.trim() === of.name.trim();
}

/** The rows of the later year a row may BECOME: those in force then,
 *  of its level, other than itself — a carry of something is not a
 *  target (it is that something, continued). */
export function targetsFor(settings: PeriodSettings, pillars: Pillar[], change: YearChange, row: Pillar): { id: string; name: string; isNew: boolean }[] {
  const rows = yearRows(settings, pillars, change.company, change.from);
  const old = rows.flatMap((r) => [r.pillar, ...r.subs]);
  const out: { id: string; name: string; isNew: boolean }[] = [];
  for (const p of pillars) {
    if (!inCompany(p, change.company) || p.level !== row.level || p.id === row.id || !p.active) continue;
    const startsLater = p.fromPeriod === change.to;
    if (startsLater) {
      if (old.some((o) => isCarry(p, o, change.to))) continue;
      out.push({ id: p.id, name: p.name, isNew: true });
      continue;
    }
    // a row of the earlier year that itself CONTINUES may take another in
    if (old.some((o) => o.id === p.id) && (change.choices[p.id]?.kind ?? "continues") === "continues") out.push({ id: p.id, name: p.name, isNew: false });
  }
  for (const n of change.added) if (n.level === row.level) out.push({ id: n.id, name: n.name, isNew: true });
  return out;
}

/** The change as it is STORED today — what the panel opens on, so a
 *  change already made can be read back and put right. */
export function readYearChange(settings: PeriodSettings, pillars: Pillar[], company: string, from: string, to: string): YearChange {
  const mine = pillars.filter((p) => inCompany(p, company));
  const choices: Record<string, YcChoice> = {};
  const liveLater = (p: Pillar) => pillarLiveIn(settings, p, to);
  const followers = (r: Pillar) => mine.filter((f) => f.level === r.level && f.id !== r.id && liveLater(f) && followsOf(f).includes(r.id));
  const image = new Map<string, string | null>();
  const rows = yearRows(settings, pillars, company, from);
  for (const { pillar } of rows) {
    if (liveLater(pillar)) {
      choices[pillar.id] = { kind: "continues" };
      image.set(pillar.id, pillar.id);
      continue;
    }
    const f = followers(pillar)[0];
    choices[pillar.id] = f ? { kind: "becomes", target: f.id } : { kind: "ends" };
    image.set(pillar.id, f ? f.id : null);
  }
  for (const { pillar, subs } of rows) {
    for (const s of subs) {
      if (liveLater(s)) {
        choices[s.id] = { kind: "continues" };
        continue;
      }
      const fs = followers(s);
      const carry = fs.find((f) => isCarry(f, s, to));
      if (carry) {
        const natural = image.get(pillar.id) ?? null;
        choices[s.id] = carry.parentId !== natural ? { kind: "continues", under: carry.parentId } : { kind: "continues" };
      } else if (fs[0]) choices[s.id] = { kind: "becomes", target: fs[0].id };
      else choices[s.id] = { kind: "ends" };
    }
  }
  return { company, from, to, choices, added: [] };
}

/** The pillar row a pillar of the earlier year is in the later year:
 *  itself, what it becomes, or null when it ends. */
export function imageOf(change: YearChange, pillarId: string): string | null {
  const c = change.choices[pillarId] ?? { kind: "continues" };
  if (c.kind === "continues") return pillarId;
  if (c.kind === "becomes") return c.target ?? null;
  return null;
}

/** What stops a Save, in words — "" when nothing does. */
export function yearChangeProblems(settings: PeriodSettings, pillars: Pillar[], change: YearChange): string[] {
  const out: string[] = [];
  const rows = yearRows(settings, pillars, change.company, change.from);
  const name = (p: { name: string }) => (p.name.trim() !== "" ? p.name.trim() : "(unnamed)");
  for (const n of change.added) {
    if (n.name.trim() === "") out.push(`Name the new ${n.level === 1 ? "pillar" : "sub-pillar"}.`);
    if (n.level === 2 && (n.under ?? "") === "") out.push(`Choose a pillar for “${name(n)}”.`);
  }
  for (const { pillar, subs } of rows) {
    const pc = change.choices[pillar.id] ?? { kind: "continues" };
    if (pc.kind === "becomes" && (pc.target ?? "") === "") out.push(`Choose what “${name(pillar)}” becomes.`);
    for (const s of subs) {
      const c = change.choices[s.id] ?? { kind: "continues" };
      if (c.kind === "becomes" && (c.target ?? "") === "") out.push(`Choose what “${name(s)}” becomes.`);
      if (c.kind === "continues" && (c.under ?? "") === "" && imageOf(change, pillar.id) === null) {
        out.push(`“${name(s)}” continues, but its pillar “${name(pillar)}” ends: choose a pillar for it, or end it.`);
      }
    }
  }
  return [...new Set(out)];
}

export interface YearChangePlan {
  /** Every pillar as it would stand after the change. */
  pillars: Pillar[];
  /** The writes, IN ORDER: new rows (pillars before sub-pillars), then
   *  rows whose links, pillar or span change without ending, then the
   *  rows that END. A failure part-way leaves the earlier year as it
   *  was; saving again finishes. */
  creates: Pillar[];
  updates: Pillar[];
  ends: Pillar[];
  /** Carry rows the change no longer needs, and nothing sits under. */
  deletes: Pillar[];
}

const same = (a: Pillar, b: Pillar): boolean =>
  a.name === b.name &&
  a.parentId === b.parentId &&
  a.fromPeriod === b.fromPeriod &&
  a.toPeriod === b.toPeriod &&
  a.color === b.color &&
  a.order === b.order &&
  a.active === b.active &&
  followsOf(a).join("|") === followsOf(b).join("|");

/**
 * The change as rows. `used`: ids of pillar rows a priority sits under
 * in any year (such a row is never deleted). `mintId`: a fresh pillar id.
 */
export function planYearChange(settings: PeriodSettings, pillars: Pillar[], change: YearChange, used: Set<string>, mintId: () => string): YearChangePlan {
  const { from, to, company } = change;
  const next: Pillar[] = pillars.map((p) => ({ ...p, succeedsIds: followsOf(p) }));
  const byId = (id: string) => next.find((p) => p.id === id);
  const rows = yearRows(settings, pillars, company, from);
  const oldL1 = rows.map((r) => r.pillar.id);
  const oldL2 = rows.flatMap((r) => r.subs.map((s) => s.id));
  const choice = (id: string): YcChoice => change.choices[id] ?? { kind: "continues" };
  const maxOrder = (level: 1 | 2, parentId: string) => Math.max(0, ...next.filter((p) => p.level === level && (level === 1 || p.parentId === parentId)).map((p) => p.order));

  // rows added in the panel: pillars first, so a new sub-pillar finds its
  // pillar. One already stored (a save that stopped part-way created it)
  // is not added twice.
  const stored = new Set(pillars.map((p) => p.id));
  const adding = change.added.filter((x) => !stored.has(x.id));
  for (const n of adding.filter((x) => x.level === 1)) {
    next.push({ id: n.id, name: n.name.trim(), level: 1, parentId: "", color: n.color, order: maxOrder(1, "") + 1, active: true, company, fromPeriod: to, toPeriod: "", succeedsId: "", succeedsIds: [] });
  }
  for (const n of adding.filter((x) => x.level === 2)) {
    const parent = byId(n.under ?? "");
    next.push({ id: n.id, name: n.name.trim(), level: 2, parentId: n.under ?? "", color: parent?.color ?? n.color, order: maxOrder(2, n.under ?? "") + 1, active: true, company, fromPeriod: to, toPeriod: "", succeedsId: "", succeedsIds: [] });
  }

  /** `r` ends with the earlier year; one that continues in place and
   *  was ended by an earlier change is open again. */
  const end = (r: Pillar) => {
    r.toPeriod = from;
  };
  const reopen = (r: Pillar) => {
    if (r.toPeriod === from) r.toPeriod = "";
  };

  // ---- pillars
  const becomes = new Map<string, string[]>(); // target id → the rows that become it
  const into = (target: string, id: string) => becomes.set(target, [...(becomes.get(target) ?? []), id]);
  for (const id of oldL1) {
    const r = byId(id)!;
    const c = choice(id);
    if (c.kind === "continues") reopen(r);
    else {
      end(r);
      if (c.kind === "becomes" && c.target) into(c.target, id);
    }
  }

  // ---- sub-pillars
  const carries = new Set<string>(); // carry rows this change keeps
  for (const { pillar, subs } of rows) {
    for (const s0 of subs) {
      const r = byId(s0.id)!;
      const c = choice(r.id);
      const existing = next.find((x) => isCarry(x, s0, to));
      if (c.kind === "continues") {
        const q = (c.under ?? "") !== "" ? (c.under as string) : imageOf(change, pillar.id);
        if (q === null) {
          end(r); // refused by yearChangeProblems; never half-applied
          continue;
        }
        if (q === r.parentId && imageOf(change, pillar.id) === pillar.id) {
          reopen(r); // the same row, under the same row
          continue;
        }
        end(r);
        if (existing) {
          existing.parentId = q;
          existing.color = byId(q)?.color ?? existing.color;
          carries.add(existing.id);
          into(existing.id, r.id);
        } else {
          const id = mintId();
          next.push({ id, name: r.name, level: 2, parentId: q, color: byId(q)?.color ?? r.color, order: r.order, active: true, company, fromPeriod: to, toPeriod: r.toPeriod === from ? "" : r.toPeriod, succeedsId: "", succeedsIds: [] });
          carries.add(id);
          into(id, r.id);
        }
      } else {
        end(r);
        if (c.kind === "becomes" && c.target) into(c.target, r.id);
      }
    }
  }

  // ---- the follow links: every link FROM a row of the earlier year is
  // re-stated by this change; links from other years stand
  const olds = new Set([...oldL1, ...oldL2]);
  for (const t of next) {
    if (!inCompany(t, company)) continue;
    const kept = followsOf(t).filter((id) => !olds.has(id));
    const want = [...kept, ...(becomes.get(t.id) ?? [])];
    Object.assign(t, withFollows(t, want));
  }

  // ---- carry rows no longer wanted: gone when nothing sits under them
  const deletes: Pillar[] = [];
  for (const s0 of rows.flatMap((r) => r.subs)) {
    for (const x of pillars.filter((p) => isCarry(p, s0, to))) {
      if (carries.has(x.id)) continue;
      if (!used.has(x.id)) deletes.push(x);
    }
  }
  const gone = new Set(deletes.map((d) => d.id));
  const after = next.filter((p) => !gone.has(p.id));

  const was = new Map(pillars.map((p) => [p.id, p]));
  const creates = after.filter((p) => !was.has(p.id)).sort((a, b) => a.level - b.level);
  const changed = after.filter((p) => was.has(p.id) && !same(p, { ...was.get(p.id)!, succeedsIds: followsOf(was.get(p.id)!) }));
  const endsNow = (p: Pillar) => p.toPeriod === from && was.get(p.id)!.toPeriod !== from;
  return { pillars: after, creates, updates: changed.filter((p) => !endsNow(p)), ends: changed.filter(endsNow), deletes };
}

/** How many priorities each row of the earlier year carries into the
 *  later one: those live in the later year whose home in the earlier
 *  year is that row. A pillar's number is its sub-pillars' together. */
export function carriedCounts(settings: PeriodSettings, pillars: Pillar[], priorities: Priority[], change: Pick<YearChange, "company" | "from" | "to">): Map<string, number> {
  const out = new Map<string, number>();
  const parentOf = new Map(pillars.map((p) => [p.id, p.parentId]));
  for (const p of priorities) {
    if (p.status === "proposed" || !priorityLiveIn(settings, p, change.to)) continue;
    const home = pillarIdIn(settings, p, change.from, pillars);
    if (home === "") continue;
    out.set(home, (out.get(home) ?? 0) + 1);
    const parent = parentOf.get(home) ?? "";
    if (parent !== "") out.set(parent, (out.get(parent) ?? 0) + 1);
  }
  return out;
}

export interface YearChangeOutcome {
  /** Priorities that have a column in the earlier year and would have
   *  none in the later one. */
  unplaced: Priority[];
  /** Sub-pillars in force in the later year whose pillar is not. */
  orphanSubs: Pillar[];
  /** Rows that end with nothing following them. */
  endedIds: string[];
}

/** What the change would cost, before it is saved. */
export function yearChangeOutcome(settings: PeriodSettings, before: Pillar[], plan: YearChangePlan, priorities: Priority[], change: YearChange): YearChangeOutcome {
  const colsBefore = new Set(objectiveColumns(pillarsLiveIn(settings, before, change.from), null).map((c) => c.id));
  const colsAfter = new Set(objectiveColumns(pillarsLiveIn(settings, plan.pillars, change.to), null).map((c) => c.id));
  const unplaced = priorities.filter((p) => {
    if (p.status === "proposed" || !priorityLiveIn(settings, p, change.to)) return false;
    if (change.company !== "" && p.org.company !== change.company) return false;
    if (!colsBefore.has(pillarIdIn(settings, p, change.from, before))) return false; // already without a column
    return !colsAfter.has(pillarIdIn(settings, p, change.to, plan.pillars));
  });
  const liveTops = new Set(plan.pillars.filter((p) => p.level === 1 && pillarLiveIn(settings, p, change.to)).map((p) => p.id));
  const orphanSubs = plan.pillars.filter((p) => p.level === 2 && pillarLiveIn(settings, p, change.to) && p.parentId !== "" && !liveTops.has(p.parentId) && (change.company === "" || p.company === change.company));
  const endedIds = Object.entries(change.choices)
    .filter(([, c]) => c.kind === "ends")
    .map(([id]) => id);
  return { unplaced, orphanSubs, endedIds };
}

/** The boards whose Priorities card rotates on something that ends:
 *  `cards` is each such card's board and the pillar ids its topics name. */
export function cardsOnEnded(cards: { board: string; ids: string[] }[], endedIds: string[], nameOf: (id: string) => string): { name: string; boards: string[] }[] {
  const out: { name: string; boards: string[] }[] = [];
  for (const id of endedIds) {
    const boards = [...new Set(cards.filter((c) => c.ids.includes(id)).map((c) => c.board))].sort((a, b) => a.localeCompare(b));
    if (boards.length > 0) out.push({ name: nameOf(id), boards });
  }
  return out;
}
