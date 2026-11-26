// "Convert measures" — Settings → Priorities, a super admin, once after
// release (2026-11-27, R5 of the 2026-11-25 round, report 20; the
// "Re-stamp actions" pattern). A priority's measures were worked out
// afresh at every read from three sources; "carried in as they stand on
// the day" needs a WRITE, and this is it: every priority that has no
// list yet gets the one it shows today (measures.ts `convertMeasures`).
// Nothing is dropped for being over the limit of four — the run says
// how many are over. Until it is run, an old priority keeps the old
// rule; a priority made since has its list from the start.

import { companies } from "../store/config";
import { listInitiatives } from "../store/initiatives";
import { loadCascade, savePriority } from "../store/priorities";
import { initiativesByPriority } from "../improvement/initiativeModel";
import { convertMeasures, setMeasures, starredKeys } from "./measures";
import { MEASURE_CAP, countedDescendants, livePrimaryId } from "./model";

/** How many priorities still read by the old rule, and how many have
 *  their list. */
export async function countUnconverted(): Promise<{ todo: number; done: number }> {
  let todo = 0;
  let done = 0;
  for (const company of await companies()) {
    const data = await loadCascade(company);
    for (const p of data.priorities) {
      if (p.measures === undefined) todo++;
      else done++;
    }
  }
  return { todo, done };
}

export interface ConvertResult {
  converted: number;
  already: number;
  /** Converted with more than four measures. */
  over: number;
  failed: number;
}

export async function runConvertMeasures(progress: (done: number, total: number) => void = () => undefined): Promise<ConvertResult> {
  const out: ConvertResult = { converted: 0, already: 0, over: 0, failed: 0 };
  const initiatives = await listInitiatives();
  const byPriority = initiativesByPriority(initiatives);
  const sets = [];
  for (const company of await companies()) sets.push(await loadCascade(company));
  const total = sets.reduce((n, d) => n + d.priorities.filter((p) => p.measures === undefined).length, 0);
  let done = 0;
  for (const data of sets) {
    for (const p of data.priorities) {
      if (p.measures !== undefined) {
        out.already++;
        continue;
      }
      const primary = livePrimaryId(p, initiatives);
      const starred = primary !== "" ? starredKeys(initiatives.find((i) => i.id === primary)?.metrics ?? []) : [];
      const under = [p, ...countedDescendants(p, data.priorities)];
      const linked = (initiativeId: string): boolean => under.some((pr) => (byPriority.get(pr.id) ?? []).some((i) => i.id === initiativeId));
      const list = convertMeasures(p, primary, starred, linked);
      const was = p.objectives;
      setMeasures(p, list);
      try {
        await savePriority(p, data);
        out.converted++;
        if (list.length > MEASURE_CAP) out.over++;
      } catch (e) {
        // left on the old rule: the next run takes it
        p.measures = undefined;
        p.objectives = was;
        out.failed++;
        console.warn("convert measures: a priority was not saved", p.id, e);
      }
      progress(++done, total);
    }
  }
  return out;
}
