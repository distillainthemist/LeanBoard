// Initiative commentary — the two writes (2026-09-29), shared by the
// initiative board and the priority popup's Commentary tab. Since
// 2026-11-17 an update may also raise or clear the initiative's flag
// (issue 3: the status update is the natural moment to ask for support).

import { nowIso } from "../../../shared/schema/id";
import { appendInitiativeEvent, saveInitiative, updateInitiativeEventDetail } from "../store/initiatives";
import { editedDetail, flagAfterUpdate, FlagChoice, trimFields, Update, UpdateFields } from "./commentaryModel";
import type { Initiative } from "./initiativeModel";

type Actor = { whoId: string; who: string };

/** A new update; it may raise the flag (the Support needed text becomes
 *  the flag's note), clear it, or refresh the note of one left up. */
export async function addUpdate(i: Initiative, fields: UpdateFields, choice: FlagChoice, actor: Actor): Promise<void> {
  await appendInitiativeEvent(i, "comment", { ...trimFields(fields) }, actor);
  const was = i.flag;
  const next = flagAfterUpdate(i, fields, choice);
  if (!next.changed) return;
  i.flag = next.flag;
  i.flagNote = next.flagNote;
  await saveInitiative(i);
  if (next.flag !== was) await appendInitiativeEvent(i, "flag", { flag: next.flag, ...(next.flag !== "" ? { note: next.flagNote, notified: choice.notify !== "" } : {}) }, actor);
}

/** Rewrite an update in place: stamped, the earlier wording kept. */
export async function editUpdate(u: Update, fields: UpdateFields, actor: Actor): Promise<void> {
  await updateInitiativeEventDetail(u.id, editedDetail(u, fields, actor.who, nowIso()));
}
