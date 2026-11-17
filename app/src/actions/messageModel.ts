// "Message about this action" (issue 6, 2026-11-17) — the pure half:
// who it goes to by default, what it says, and the line it leaves on the
// action. The panel and the send are actions/message.ts.

export interface MessageRecipient {
  name: string;
  email: string;
}

/** The people the message opens addressed to: the action's assignees
 *  who have an email — never the person sending it. */
export function defaultRecipients(assignees: { whoId: string; who: string }[], emailOf: (whoId: string) => string, senderId: string): MessageRecipient[] {
  const out: MessageRecipient[] = [];
  for (const a of assignees) {
    if (a.whoId === "" || a.whoId === senderId) continue;
    const email = emailOf(a.whoId);
    if (email === "" || out.some((r) => r.email.toLowerCase() === email.toLowerCase())) continue;
    out.push({ name: a.who, email });
  }
  return out;
}

/** The subject, and the message as it opens (the sender edits it). */
export function messageDraft(a: { issue: string; description: string; due: string }): { subject: string; body: string } {
  const what = (a.description !== "" ? a.description : a.issue).trim();
  const short = what.length > 80 ? `${what.slice(0, 77)}…` : what;
  const lines = [what !== "" ? `About the action: ${what}` : "About an action"];
  if (a.issue !== "" && a.description !== "") lines.push(`Issue: ${a.issue}`);
  lines.push(a.due !== "" ? `Due ${a.due}.` : "No due date.");
  return { subject: `Action: ${short !== "" ? short : "an action"}`, body: lines.join("\n") };
}

/** The comment a sent message leaves on the action. */
export function sentLine(recipients: MessageRecipient[], how: string): string {
  const names = recipients.map((r) => r.name);
  const to = names.length > 3 ? `${names.slice(0, 3).join("; ")} +${names.length - 3}` : names.join("; ");
  return `Messaged ${to} by ${how === "email" ? "email" : "Teams"}`;
}
