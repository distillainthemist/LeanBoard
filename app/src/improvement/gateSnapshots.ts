// Which gate snapshot stands (Ben, 2026-11-24, programme E17 part 2).
// A snapshot is stamped at each gate approval and is never deleted. A
// revert sends the initiative back, and the gates it undid are passed
// again on the way forward — so a stage can have several snapshots, and
// until now nothing said which one stood.
//
//   - the NEWEST snapshot of a stage is the one shown for it;
//   - it reads "reverted" when a later revert went back to that stage or
//     an earlier one (the gate has to be passed again);
//   - an older snapshot of the same stage is "superseded" and folds
//     under the newer one.
//
// PURE: the board hands in its snapshots, the initiative's reverts (its
// stage-move events marked `revert`) and the stage names in order.

export interface SnapLike {
  /** The stage whose gate was approved (its name, as stamped). */
  stage: string;
  /** When it was stamped: an ISO time (a bare date reads as that day). */
  when: string;
}

export interface RevertLike {
  /** When the revert was made (ISO). */
  at: string;
  /** The stage it went back TO (its name, as logged). */
  to: string;
}

export type SnapState = "stands" | "reverted" | "superseded";

export interface MarkedSnap<S> {
  snap: S;
  state: SnapState;
  /** reverted: the day of the revert (yyyy-mm-dd); else "". */
  revertedOn: string;
}

export interface SnapGroup<S> {
  head: MarkedSnap<S>;
  /** Earlier snapshots of the same stage, newest first. */
  older: MarkedSnap<S>[];
}

const time = (iso: string): number => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

/** One group per stage, in stage order (a stage no longer in the list
 *  comes after, newest first). */
export function markGateSnapshots<S extends SnapLike>(snaps: S[], reverts: RevertLike[], stageNames: string[]): SnapGroup<S>[] {
  const idx = (name: string): number => stageNames.indexOf(name);
  const byStage = new Map<string, S[]>();
  for (const s of snaps) {
    const list = byStage.get(s.stage);
    if (list) list.push(s);
    else byStage.set(s.stage, [s]);
  }
  const groups: SnapGroup<S>[] = [];
  for (const [stage, list] of byStage) {
    const sorted = [...list].sort((a, b) => time(b.when) - time(a.when));
    const [newest, ...rest] = sorted;
    const at = idx(stage);
    // the earliest revert AFTER the stamp that went back to this stage or
    // before it; a stage or a target the list no longer names is not judged
    const undone =
      at < 0
        ? undefined
        : reverts
            .filter((r) => time(r.at) > time(newest.when) && idx(r.to) >= 0 && idx(r.to) <= at)
            .sort((a, b) => time(a.at) - time(b.at))[0];
    groups.push({
      head: { snap: newest, state: undone ? "reverted" : "stands", revertedOn: undone ? undone.at.slice(0, 10) : "" },
      older: rest.map((snap) => ({ snap, state: "superseded" as const, revertedOn: "" })),
    });
  }
  return groups.sort((a, b) => {
    const ia = idx(a.head.snap.stage);
    const ib = idx(b.head.snap.stage);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0 || ib >= 0) return ia >= 0 ? -1 : 1;
    return time(b.head.snap.when) - time(a.head.snap.when);
  });
}

/** The words after a snapshot's own line: "" · "reverted 2026-11-20" ·
 *  "superseded". */
export function snapStateWords(m: Pick<MarkedSnap<unknown>, "state" | "revertedOn">): string {
  if (m.state === "reverted") return m.revertedOn !== "" ? `reverted ${m.revertedOn}` : "reverted";
  return m.state === "superseded" ? "superseded" : "";
}

/** The reverts in an initiative's history: its stage moves marked so. */
export function revertsOf(events: { kind: string; at: string; detail: Record<string, unknown> }[]): RevertLike[] {
  return events
    .filter((e) => e.kind === "stagemove" && e.detail.revert === true && typeof e.detail.to === "string" && e.detail.to !== "")
    .map((e) => ({ at: e.at, to: e.detail.to as string }));
}
