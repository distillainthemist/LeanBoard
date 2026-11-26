// The Documents people search, as the standing type-ahead (backlog
// programme tranche 5, F1, 2026-11-27). Four screens carried their own
// copy that drew its results in the form: a document's person fields,
// "Add reviewers", the hand-over's "With" and the Filters pane. They
// now share this one box over `shared/ui/typeAhead.ts`:
//
//  - the people already in memory (the owners & approvers group, the
//    document controllers) match at once;
//  - the directory is asked by itself after a pause and three letters,
//    and stands under its own heading;
//  - a box bound to the group lists the group when clicked into.
//
// Which people a field may hold is still the source's rule
// (`accessGates.ts`); this module only draws it.

import { TypeAhead, TypeAheadOption, buildTypeAhead } from "../../../shared/ui/typeAhead";
import type { DocPerson, PeopleSource } from "./accessGates";

export interface DocPeopleBoxOpts {
  placeholder: string;
  label?: string;
  /** The people source, or a function giving the one in force NOW
   *  (null until it has loaded): the hand-over's source follows its
   *  role ticks. */
  source: Promise<PeopleSource> | (() => PeopleSource | null);
  /** With a function source: when its sources have loaded, so a box
   *  the person is already typing in catches up. */
  ready?: Promise<unknown>;
  /** Clicking into the empty box lists the held people (owner and
   *  approver fields: the group is the whole choice). */
  listOnFocus?: boolean;
  /** Lower-cased emails not to offer again. */
  taken?: () => string[];
  onPick: (p: DocPerson) => void;
}

/** Held people that match what is typed, less the ones already taken.
 *  Pure. */
export function heldMatches(held: DocPerson[], ql: string, taken: string[]): DocPerson[] {
  const off = new Set(taken);
  return held.filter(
    (p) => p.mail !== "" && !off.has(p.mail.toLowerCase()) && (ql === "" || p.displayName.toLowerCase().includes(ql) || p.mail.toLowerCase().includes(ql))
  );
}

/** Directory hits worth showing: with an address, not already held (they
 *  matched above) and not taken. Pure. */
export function directoryExtras(hits: DocPerson[], held: DocPerson[], taken: string[]): DocPerson[] {
  const off = new Set([...taken, ...held.map((p) => p.mail.toLowerCase())]);
  const out: DocPerson[] = [];
  for (const h of hits) {
    const k = h.mail.toLowerCase();
    if (h.mail === "" || off.has(k)) continue;
    off.add(k);
    out.push(h);
  }
  return out;
}

export function docPeopleBox(o: DocPeopleBoxOpts): TypeAhead {
  const taken = () => o.taken?.() ?? [];
  const source = typeof o.source === "function" ? o.source : landed(o.source);
  const ready = typeof o.source === "function" ? o.ready : o.source;
  const opt = (p: DocPerson): TypeAheadOption => ({ label: p.displayName, sub: p.mail, run: () => o.onPick(p) });
  const box = buildTypeAhead({
    placeholder: o.placeholder,
    label: o.label,
    inputClass: "app-input",
    listOnFocus: o.listOnFocus,
    noneWords: "No one matches.",
    local: (ql) => heldMatches(source()?.held ?? [], ql, taken()).map(opt),
    remote: () => {
      const src = source();
      const dir = src?.directory ?? null;
      if (src === null || dir === null) return null;
      return {
        heading: src.held.length > 0 ? "In the directory" : "",
        failed: "The people search failed. Check the connection and type again.",
        search: async (q) => directoryExtras(await dir(q), src.held, taken()).map(opt),
      };
    },
  });
  void ready?.then(
    () => box.refresh(),
    () => undefined
  );
  return box;
}

/** A promise's value once it has landed, null before (and after a
 *  failure) — what `source` wants from an async people source. */
export function landed<T>(p: Promise<T>): () => T | null {
  let v: T | null = null;
  void p.then(
    (x) => (v = x),
    () => undefined
  );
  return () => v;
}
