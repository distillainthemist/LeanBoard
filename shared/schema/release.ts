// The release gate (release-gate-2026-10-31.md): every bundle stamps
// itself with `git describe --tags --always --dirty` (vite.config.ts), e.g.
// "v0.84.0-15-gc264a91". The APP_ROW carries which build is current and
// the oldest build still allowed; a client compares its own stamp at
// boot and while it runs. Pure: no DOM, no store.

export interface Build {
  major: number;
  minor: number;
  patch: number;
  /** commits past the tag — 0 on a release build */
  ahead: number;
  sha: string;
  dirty: boolean;
}

/** A describe stamp as a Build, or null for anything else ("dev", a bare
 *  SHA from a tagless checkout, "unknown"). */
export function parseBuild(stamp: string): Build | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-(\d+)-g([0-9a-f]+))?(-dirty)?$/.exec(stamp.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    ahead: m[4] === undefined ? 0 : Number(m[4]),
    sha: m[5] ?? "",
    dirty: m[6] !== undefined,
  };
}

/** <0 when a is older, 0 when the same build, >0 when a is newer. Two
 *  stamps on the same tag order by commits ahead; the SHA carries no order. */
export function compareBuilds(a: Build, b: Build): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch || a.ahead - b.ahead;
}

/** The same build, SHA included when both carry one. */
export function sameBuild(a: Build, b: Build): boolean {
  return compareBuilds(a, b) === 0 && (a.sha === "" || b.sha === "" || a.sha === b.sha);
}

export interface ReleasePolicy {
  /** the newest build any client has booted on ("" = never recorded) */
  current: string;
  /** builds older than this are blocked at once ("" = none) */
  minimum: string;
  recordedAt: string;
  recordedBy: string;
}

export const EMPTY_POLICY: ReleasePolicy = { current: "", minimum: "", recordedAt: "", recordedBy: "" };

export function parseReleasePolicy(json: string | null | undefined): ReleasePolicy {
  if (!json || json.trim() === "") return { ...EMPTY_POLICY };
  try {
    const o = JSON.parse(json) as Partial<Record<keyof ReleasePolicy, unknown>>;
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    return { current: str(o.current), minimum: str(o.minimum), recordedAt: str(o.recordedAt), recordedBy: str(o.recordedBy) };
  } catch {
    return { ...EMPTY_POLICY };
  }
}

export function serializeReleasePolicy(p: ReleasePolicy): string {
  return JSON.stringify(p);
}

export type BuildVerdict =
  /** this build is the recorded one, or nothing is recorded */
  | "current"
  /** this build is newer than the recorded one — it should record itself */
  | "newer"
  /** a newer build is recorded — finish up, then close and reopen */
  | "stale"
  /** older than the minimum — unusable until reopened */
  | "blocked"
  /** this stamp cannot be compared (a dev tree, a tagless build) */
  | "unknown";

export function verdictFor(mine: string, policy: ReleasePolicy): BuildVerdict {
  const me = parseBuild(mine);
  if (!me) return "unknown";
  const min = parseBuild(policy.minimum);
  if (min && compareBuilds(me, min) < 0) return "blocked";
  const cur = parseBuild(policy.current);
  if (!cur) return "current";
  const c = compareBuilds(me, cur);
  if (c > 0) return "newer";
  if (c < 0) return "stale";
  return "current";
}

/** May this client record itself as the current build? Only a clean,
 *  comparable build that is newer than the record — a dirty tree never
 *  promotes itself, so a dev run cannot flag a whole site stale. */
export function shouldRecord(mine: string, policy: ReleasePolicy): boolean {
  const me = parseBuild(mine);
  return me !== null && !me.dirty && verdictFor(mine, policy) === "newer";
}

/** A short label for people: "v0.84.0" for a release, "v0.84.0 +15" for
 *  a build past it, the raw stamp otherwise. */
export function buildLabel(stamp: string): string {
  const b = parseBuild(stamp);
  if (!b) return stamp === "" ? "unknown" : stamp;
  return `v${b.major}.${b.minor}.${b.patch}${b.ahead > 0 ? ` +${b.ahead}` : ""}${b.dirty ? " (dirty)" : ""}`;
}
