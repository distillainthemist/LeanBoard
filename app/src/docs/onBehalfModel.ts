// Approving on behalf of someone, with evidence (2026-11-27, R4 of the
// 2026-11-25 round, report 12). A document controller may press Approve
// at either approval step as a deadlock-breaker (lifecycleCommandsFor);
// until now the version's comment named the controller and nobody
// else, and held no proof. Pure: who can be approved for, the comment,
// where the evidence is kept and what the person approved for is told.
// The dialog is lifecycleCmds.ts; the history's chips are viewer.ts.

export interface Person {
  name: string;
  email: string;
}

/** Which approval step an Approve command is: the named approvers'
 *  endorsement moves the document on to the owner, whose Approve makes
 *  it approved. */
export type ApprovalStep = "approvers" | "owner";
export function approvalStep(to: string): ApprovalStep | null {
  return to === "inOwnerApproval" ? "approvers" : to === "approved" ? "owner" : null;
}

const key = (s: string): string => s.trim().toLowerCase();

/** The people a controller can approve FOR at this step — the named
 *  approvers at theirs, the owner at the owner's — never themselves.
 *  [] = the controller is named at this step and approves in their own
 *  right, or the step names nobody. */
export function behalfCandidates(step: ApprovalStep, roles: { owners: Person[]; approvers: Person[] }, me: string): Person[] {
  const list = step === "approvers" ? roles.approvers : roles.owners;
  if (list.some((p) => key(p.email) !== "" && key(p.email) === key(me))) return [];
  const seen = new Set<string>();
  return list.filter((p) => {
    const k = key(p.email) || key(p.name);
    if (k === "" || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const listed = (names: string[]): string => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** "Approved by A on behalf of B and C" — the head of the version's
 *  comment; the person's own note follows it as on any step. */
export function behalfBase(commandComment: string, actor: string, people: Person[]): string {
  const who = actor.trim() !== "" ? ` by ${actor.trim()}` : "";
  return `${commandComment}${who} on behalf of ${listed(people.map((p) => p.name.trim() || p.email))}`;
}

/** Evidence is an attachment whose parent is this kind… */
export const EVIDENCE_KIND = "docapproval";
/** …and whose parent id is the document's file id and the version the
 *  approval made, "<uid>/<label>" — at most 80 characters. */
export function evidenceParentId(uid: string, label: string): string {
  return `${uid.trim().toLowerCase()}/${label.trim()}`;
}
export function evidencePrefix(uid: string): string {
  return `${uid.trim().toLowerCase()}/`;
}
/** The version an evidence row belongs to; "" when the id is not one. */
export function evidenceLabel(parentId: string): string {
  const at = parentId.lastIndexOf("/");
  return at < 0 ? "" : parentId.slice(at + 1);
}

/** The card the person approved for receives — the check on the
 *  feature: an approval in someone's name is seen by them the same day
 *  (Ben's choice on R4's walk). */
export function behalfCard(docName: string, actor: string, step: ApprovalStep, note: string, evidence: number): { subject: string; text: string } {
  const what = step === "approvers" ? "endorsed" : "approved";
  const proof = evidence > 0 ? ` ${evidence === 1 ? "A file was" : `${evidence} files were`} attached as evidence; it is on that version in the document's history.` : "";
  const said = note.trim() !== "" ? `\n\nComment: ${note.trim()}` : "";
  return {
    subject: `Approved on your behalf — ${docName}`,
    text: `Hi — ${actor.trim() || "A document controller"} ${what} “${docName}” on your behalf in LeanBoard.${proof} If this was not agreed with you, tell them or a document controller.${said}`,
  };
}
