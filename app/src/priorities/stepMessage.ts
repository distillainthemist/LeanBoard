// Offer the message a priorities step calls for (stepMessageModel.ts):
// the shared message panel, addressed, worded and linked, with "Skip".
// Loaded on first use — the panel's senders are the documents module's,
// reached through actions/message's own dynamic import.

import type { RosterPerson } from "../store/mappers";
import { prioritiesViewUrl } from "../links";
import { encodePrioritiesView } from "./viewLink";
import { OrgRef, orgKey, orgName } from "./model";
import { PriorityStep, stepDraft, stepRecipients } from "./stepMessageModel";

export interface StepMessage {
  step: PriorityStep;
  statement: string;
  /** The org the step was taken at. */
  org: OrgRef;
  toOrgs?: OrgRef[];
  reason?: string;
  /** Who should hear: person ids. */
  to: string[];
  /** The org whose Priorities page the message links to. */
  linkOrg: OrgRef;
  period: string;
}

/** Offer the message; resolves at once (the panel lives on its own). No
 *  one to tell (no email on record, or only the sender) = no panel. */
export function offerStepMessage(m: StepMessage, actor: { whoId: string; who: string }, roster: RosterPerson[]): void {
  const person = (id: string) => roster.find((p) => p.whoId === id);
  const to = stepRecipients(m.to, (id) => person(id)?.who ?? "", (id) => person(id)?.email ?? "", actor.whoId);
  if (to.length === 0) return;
  const draft = stepDraft(m.step, { statement: m.statement, org: orgName(m.org), toOrgs: (m.toOrgs ?? []).map(orgName), by: actor.who !== "" ? actor.who : "Someone", reason: m.reason });
  const link = prioritiesViewUrl(encodePrioritiesView({ org: orgKey(m.linkOrg), period: m.period, status: "", view: "", l1: "", focus: [], rule: "", showOther: null, groupByPillar: null }));
  void import("../actions/message").then(({ openMessagePanel }) =>
    openMessagePanel({ title: draft.title, note: "", recipients: () => to, subject: draft.subject, body: draft.body, link, cancelLabel: "Skip" })
  );
}
