// The org on the action row (Ben, 2026-11-25, programme E13: "we need to
// assume there are going to be 1000s of actions"). The hub's organisation
// scope read EVERY open action and matched assignees to the roster in the
// browser, because neither half of "assigned to people who sit here" was
// a column the server could filter on. Two stamps put it on the row:
//
//   ben_assigneeorgs — where the action's assignees sit. For each: the
//     site, "site>department" and "site>department>area". An action
//     shared across orgs carries each org once.
//   ben_raisedorg — where it was raised: the org of its board, its
//     initiative or its priority, the same three tokens.
//
// A stamp is "|token|token|", so `contains(col,'|Weipa>Mine|')` can never
// match half a name. "|-|" = stamped, nobody placed (free-text names, a
// personal action with no home). EMPTY = never stamped: a row from
// before this, read the old way until "Re-stamp actions" has run.
//
// Orgs have no id in this app — a site, a department and an area are
// their NAMES, as the roster holds them — so a rename re-stamps.
//
// PURE. The store (store/actions.ts) writes and reads with these.

export interface OrgPlace {
  site: string;
  department: string;
  area: string;
}

/** Nobody placed / no home: stamped, with nothing to find. */
export const NO_ORG_STAMP = "|-|";
export const ASSIGNEE_STAMP_MAX = 4000;
export const RAISED_STAMP_MAX = 1000;

/** A name as a token part: the two separators can never be in it. */
const part = (s: string): string => s.replace(/[|>]/g, " ").replace(/\s+/g, " ").trim();

/** One org's tokens, widest first: site · site>department ·
 *  site>department>area. Nothing for a place with no site. */
export function orgTokens(p: Partial<OrgPlace> | null | undefined): string[] {
  const site = part(p?.site ?? "");
  if (site === "") return [];
  const department = part(p?.department ?? "");
  const area = part(p?.area ?? "");
  const out = [site];
  if (department !== "") {
    out.push(`${site}>${department}`);
    if (area !== "") out.push(`${site}>${department}>${area}`);
  }
  return out;
}

/** Tokens → the stored stamp: each once, the widest (site) tokens first
 *  so a stamp cut to its column always keeps what the site scope needs. */
export function makeStamp(tokens: string[], max: number): string {
  const unique = [...new Set(tokens.filter((t) => t !== ""))];
  if (unique.length === 0) return NO_ORG_STAMP;
  const depth = (t: string) => t.split(">").length;
  const ordered = unique.map((t, i) => ({ t, i })).sort((a, b) => depth(a.t) - depth(b.t) || a.i - b.i);
  let out = "|";
  for (const { t } of ordered) {
    if (out.length + t.length + 1 > max) break;
    out += `${t}|`;
  }
  return out === "|" ? NO_ORG_STAMP : out;
}

/** Where an action's assignees sit. `placeOf`: the roster's placement of
 *  a person, or null (not on the roster, no site, a typed name). */
export function assigneeStamp(assignees: { whoId: string }[], placeOf: (whoId: string) => Partial<OrgPlace> | null): string {
  return makeStamp(
    assignees.flatMap((a) => (a.whoId !== "" ? orgTokens(placeOf(a.whoId)) : [])),
    ASSIGNEE_STAMP_MAX
  );
}

/** Where an action was raised: its home org, or none. */
export function raisedStamp(home: Partial<OrgPlace> | null): string {
  return makeStamp(orgTokens(home), RAISED_STAMP_MAX);
}

/** The token an organisation scope looks for — its narrowest level; null
 *  for the whole company (no site: every action, nothing to filter on). */
export function scopeToken(scope: Partial<OrgPlace>): string | null {
  const tokens = orgTokens(scope);
  return tokens.length > 0 ? tokens[tokens.length - 1] : null;
}

/** What a filter searches a stamp for. */
export function stampNeedle(token: string): string {
  return `|${token}|`;
}

/** Does a stamp carry this scope? (The browser's check of a row read the
 *  old way, and the tests'.) */
export function stampHas(stamp: string, token: string): boolean {
  return stamp.includes(stampNeedle(token));
}

/** Has this row ever been stamped? */
export function isStamped(stamp: string | null | undefined): boolean {
  return (stamp ?? "").trim() !== "";
}

/** The stamps a rename rewrites: every token at or under the old org
 *  becomes the same token under the new name. `from` / `to` are tokens of
 *  the same depth ("Weipa" → "Weipa North", "Weipa>Mine" → "Weipa>Mining"). */
export function renameInStamp(stamp: string, from: string, to: string): string {
  if (!isStamped(stamp) || from === "" || from === to) return stamp;
  const tokens = stamp.split("|").filter((t) => t !== "" && t !== "-");
  let changed = false;
  const next = tokens.map((t) => {
    if (t === from || t.startsWith(`${from}>`)) {
      changed = true;
      return to + t.slice(from.length);
    }
    return t;
  });
  if (!changed) return stamp;
  return makeStamp(next, Math.max(stamp.length + (to.length - from.length) * tokens.length, ASSIGNEE_STAMP_MAX));
}
