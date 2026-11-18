// The order of the admins' issue queue (Settings → Issues). Pure.

export interface QueueIssue {
  ben_priority?: number | null;
  createdon?: string | null;
}

/**
 * Ranked issues first, by their rank (1 before 2; unranked after every
 * ranked one) — a rank is an admin saying "this next" — then NEWEST
 * first (Ben, 2026-11-18). It was oldest first, which put the reports
 * of months ago above this morning's on every visit. An issue with no
 * readable date goes last in its group.
 */
export function queueOrder<T extends QueueIssue>(issues: T[]): T[] {
  const rank = (i: T): number => i.ben_priority ?? Number.POSITIVE_INFINITY;
  const when = (i: T): number => {
    const t = Date.parse(i.createdon ?? "");
    return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
  };
  return issues
    .map((i, n) => ({ i, n }))
    .sort((a, b) => {
      const ra = rank(a.i);
      const rb = rank(b.i);
      if (ra !== rb) return ra < rb ? -1 : 1;
      const wa = when(a.i);
      const wb = when(b.i);
      if (wa !== wb) return wa > wb ? -1 : 1;
      return a.n - b.n;
    })
    .map((x) => x.i);
}
