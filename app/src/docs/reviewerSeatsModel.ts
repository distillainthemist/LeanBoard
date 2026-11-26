// Reviewer seats — the pure half (issue review 2026-11-25, R1 walk
// item 1). A reviewer may be anyone, but only people in the Owners &
// Approvers group (and document controllers) can open a draft. Someone
// named from outside is SEATED in the editors group for the cycle, and
// released when the document is approved or the revision is cancelled.

export interface SeatPerson {
  name: string;
  email: string;
}

const key = (email: string): string => email.trim().toLowerCase();

/** The reviewers who need a seat: not in the group, not a controller,
 *  deduped by email; entries with no email cannot be seated and are
 *  dropped. `insiders` null = the group could not be read — nobody is
 *  seated on a guess. */
export function needSeats(reviewers: SeatPerson[], insiders: string[] | null): SeatPerson[] {
  if (insiders === null) return [];
  const inside = new Set(insiders.map(key).filter((e) => e !== ""));
  const seen = new Set<string>();
  const out: SeatPerson[] = [];
  for (const r of reviewers) {
    const k = key(r.email);
    if (k === "" || inside.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push({ name: r.name.trim() !== "" ? r.name : r.email, email: r.email.trim() });
  }
  return out;
}

export interface SeatOutcome {
  /** Seated now: they can open the draft. */
  seated: SeatPerson[];
  /** The person acting could not seat them: the owner is asked to. */
  requested: SeatPerson[];
  /** Nobody could be seated, and why ("" = not the case). */
  unable: string;
}

export const NO_SEATS: SeatOutcome = { seated: [], requested: [], unable: "" };

const list = (people: SeatPerson[]): string => people.map((p) => p.name).join(", ");

/** What the submit dialog says about seats, after its own done line.
 *  "" when there is nothing to say. */
export function seatWords(o: SeatOutcome): string {
  const parts: string[] = [];
  if (o.requested.length > 0) {
    parts.push(`${list(o.requested)} cannot open the draft yet: the document's owner has been asked to let them in, and they are told once that is done.`);
  }
  if (o.unable !== "") parts.push(o.unable);
  return parts.join(" ");
}

/** Who the review-request card goes to at submit: everyone but the
 *  reviewers still waiting for a seat (a card would send them to a
 *  draft they cannot open). */
export function waitingEmails(o: SeatOutcome): string[] {
  return o.requested.map((p) => key(p.email));
}
