// "＋ Add a team…" on an action (issue 10, 2026-11-17) — the pure half:
// a leader's reporting line, read from the directory, split into the
// people who are IN the app (assignable) and those who are not (named,
// never added — adding from the directory stays an admin's act, the
// 2026-11-16 rule). Pure; the directory walk is actions/team.ts.

export interface TeamDirectoryPerson {
  id: string;
  name: string;
  accountEnabled: boolean;
  /** "Guest" for a guest account. */
  userType: string;
}

export interface TeamSplit {
  people: { whoId: string; who: string }[];
  skipped: string[];
}

/** Everyone under `leaderId` (the leader left out — the dialog adds them
 *  on its own tick): in the app → assignable, by the app's own name for
 *  them; not in the app → named. Disabled and guest accounts are neither
 *  — they are not people an action can wait on. Names sorted. */
export function splitTeam(directory: TeamDirectoryPerson[], roster: { whoId: string; who: string; active: boolean }[], leaderId: string): TeamSplit {
  const inApp = new Map(roster.filter((p) => p.active).map((p) => [p.whoId.toLowerCase(), p]));
  const people: { whoId: string; who: string }[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const d of directory) {
    const id = d.id.toLowerCase();
    if (id === leaderId.toLowerCase() || seen.has(id)) continue;
    seen.add(id);
    if (!d.accountEnabled || d.userType.toLowerCase() === "guest") continue;
    const known = inApp.get(id);
    if (known) people.push({ whoId: known.whoId, who: known.who });
    else skipped.push(d.name);
  }
  people.sort((a, b) => a.who.localeCompare(b.who));
  skipped.sort((a, b) => a.localeCompare(b));
  return { people, skipped };
}
