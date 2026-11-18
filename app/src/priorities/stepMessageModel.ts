// The messages the priorities' steps OFFER (2026-11-18) — the pure half:
// who a step concerns and what the message says as it opens. Nothing is
// ever sent by itself: the panel is offered, the person sends or skips.
// Until then neither flow told anyone anything — a proposal or a cascade
// waited for its decider to happen upon the page, and the sender learned
// the answer only by opening the priority's Cascade tab.

/** A step someone else needs to hear about. */
export type PriorityStep =
  /** raised from below: a priority, or a pull, proposed to an org */
  | "proposed"
  /** sent from above to one or more orgs */
  | "cascaded"
  /** the answers to a cascade */
  | "accepted"
  | "customised"
  | "held"
  | "declined"
  /** the answers to a proposal */
  | "proposal-accepted"
  | "proposal-held"
  | "proposal-declined";

export interface StepFacts {
  statement: string;
  /** The org the step was taken at (the one answering, or proposing to). */
  org: string;
  /** For a cascade: the org(s) it went to. */
  toOrgs?: string[];
  /** Who took the step. */
  by: string;
  /** Hold and decline carry the reason given. */
  reason?: string;
}

const short = (s: string): string => (s.length > 80 ? `${s.slice(0, 77)}…` : s);

/** The panel's title, the message's subject and its opening words. */
export function stepDraft(step: PriorityStep, f: StepFacts): { title: string; subject: string; body: string } {
  const what = `“${f.statement}”`;
  const why = f.reason && f.reason.trim() !== "" ? `\nReason: ${f.reason.trim()}` : "";
  switch (step) {
    case "proposed":
      return { title: "Let the owner know", subject: `Priority proposed for ${f.org}: ${short(f.statement)}`, body: `${f.by} has proposed a priority for ${f.org}:\n${what}\nIt is waiting in the Proposed row for you to accept or decline.` };
    case "cascaded": {
      const to = (f.toOrgs ?? []).join(", ");
      return { title: "Let them know", subject: `Priority cascaded from ${f.org}: ${short(f.statement)}`, body: `${f.by} has cascaded a priority from ${f.org}${to !== "" ? ` to ${to}` : ""}:\n${what}\nIt is waiting under “Cascaded to you” to accept, customise, hold or decline.` };
    }
    case "accepted":
      return { title: "Let the sender know", subject: `${f.org} accepted: ${short(f.statement)}`, body: `${f.org} has accepted the priority ${what} as it is written.` };
    case "customised":
      return { title: "Let the sender know", subject: `${f.org} accepted and customised: ${short(f.statement)}`, body: `${f.org} has accepted the priority ${what} with wording of its own.` };
    case "held":
      return { title: "Let the sender know", subject: `${f.org} put on hold: ${short(f.statement)}`, body: `${f.org} has put the priority ${what} on hold.${why}` };
    case "declined":
      return { title: "Let the sender know", subject: `${f.org} declined: ${short(f.statement)}`, body: `${f.org} has declined the priority ${what}.${why}` };
    case "proposal-accepted":
      return { title: "Let them know", subject: `Accepted for ${f.org}: ${short(f.statement)}`, body: `${f.by} has accepted the proposed priority ${what} for ${f.org}. It is on the board now.` };
    case "proposal-held":
      return { title: "Let them know", subject: `On hold for ${f.org}: ${short(f.statement)}`, body: `${f.by} has put the proposed priority ${what} on hold for ${f.org}.${why}` };
    case "proposal-declined":
      return { title: "Let them know", subject: `Declined for ${f.org}: ${short(f.statement)}`, body: `${f.by} has declined the proposed priority ${what} for ${f.org}.${why}` };
  }
}

/** Who the message opens addressed to: the people named, with an email,
 *  once each — never the person sending it. Nobody left = nothing to
 *  offer. */
export function stepRecipients(ids: string[], nameOf: (whoId: string) => string, emailOf: (whoId: string) => string, senderId: string): { name: string; email: string }[] {
  const out: { name: string; email: string }[] = [];
  for (const id of ids) {
    if (id === "" || id === senderId) continue;
    const email = emailOf(id);
    if (email === "" || out.some((r) => r.email.toLowerCase() === email.toLowerCase())) continue;
    out.push({ name: nameOf(id) !== "" ? nameOf(id) : email, email });
  }
  return out;
}
