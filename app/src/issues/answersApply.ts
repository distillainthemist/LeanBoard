// Applying an answers file, and telling people (2026-11-26, R3 — N1).
// Pure but for the `ApplyIo` it is handed: the desk passes its own
// actions in (the status write with its thread line, its merge, its
// thread messages), so an import does exactly what a hand at the desk
// does — and a test passes fakes.

import type { Judged, KnownIssue, Step } from "./answersCsv";

export interface ApplyIo {
  /** The status write AND its line in the thread, as the desk does. */
  setStatus(issueId: string, to: string): Promise<void>;
  /** The desk's merge: the child closes as merged, its people follow
   *  the parent, both threads say so. */
  merge(childId: string, parentId: string): Promise<void>;
  setResolution(issueId: string, line: string): Promise<void>;
  message(issueId: string, text: string, audience: "reporter" | "internal"): Promise<void>;
}

export interface RowResult {
  id: string;
  ok: boolean;
  /** "" or which step was refused and why. */
  error: string;
  /** A reporter message was written in THIS run — only these rows go
   *  on a Teams card (an already-applied row never sends again). */
  messageWritten: boolean;
}

const STEP_WORDS: Record<Step["kind"], string> = {
  status: "The status change",
  merge: "The merge",
  resolution: "The resolution line",
  message: "The message",
  note: "The internal note",
};

const why = (e: unknown): string => String(e instanceof Error ? e.message : e).slice(0, 240);

/** Run a row's steps in order. A refused step stops THAT row; what
 *  landed before it stays, `issue` is brought up to date as each step
 *  lands, so judging the row again gives only the steps still owed. */
export async function applyRow(j: Judged, io: ApplyIo): Promise<RowResult> {
  const issue = j.issue as KnownIssue;
  let messageWritten = false;
  for (const step of j.steps) {
    try {
      switch (step.kind) {
        case "status":
          await io.setStatus(issue.id, step.to);
          issue.status = step.to;
          break;
        case "merge":
          await io.merge(issue.id, step.parentId);
          issue.status = "merged";
          issue.parentId = step.parentId;
          break;
        case "resolution":
          await io.setResolution(issue.id, step.line);
          issue.resolution = step.line;
          break;
        case "message":
          await io.message(issue.id, step.text, "reporter");
          issue.reporterMessages.push(step.text);
          messageWritten = true;
          break;
        case "note":
          await io.message(issue.id, step.text, "internal");
          issue.internalMessages.push(step.text);
          break;
      }
    } catch (e) {
      return { id: issue.id, ok: false, error: `${STEP_WORDS[step.kind]} was refused: ${why(e)}`, messageWritten };
    }
  }
  return { id: issue.id, ok: true, error: "", messageWritten };
}

// ---- one card per person ---------------------------------------------------

/** An answer that was written in this run, and who hears about it. */
export interface Answered {
  issueId: string;
  title: string;
  /** The status word the reporter reads. */
  outcome: string;
  message: string;
  /** The issue this one was answered as a duplicate of, or "". */
  parentId: string;
  /** Reporter, merged-in reporters and followers — the sender already
   *  left out. */
  audience: { email: string; name: string }[];
}

export interface PersonCard {
  email: string;
  name: string;
  subject: string;
  text: string;
  /** How many answers this card carries. */
  count: number;
}

export const CARD_SUBJECT = "Updates on your LeanBoard reports";

/** ONE card per person listing every answer that is theirs (Ben's
 *  choice 2 of N1: this round had seventeen for one reporter).
 *  - A person whose duplicate report has its own row gets THAT row and
 *    not the parent's line as well: the merge made them a follower of
 *    the parent, and their own answer already says how it came out.
 *  - More than `perCard` answers split into cards marked "(1 of 2)".
 *  No markdown: a card that is refused falls back to a plain message,
 *  where the marks would show. */
export function cardsFor(answered: Answered[], perCard = 20): PersonCard[] {
  const people = new Map<string, { name: string; lines: Answered[] }>();
  for (const a of answered) {
    for (const p of a.audience) {
      const email = p.email.trim().toLowerCase();
      if (email === "") continue;
      const entry = people.get(email) ?? { name: p.name.trim() || email, lines: [] };
      if (!entry.lines.some((l) => l.issueId === a.issueId)) entry.lines.push(a);
      people.set(email, entry);
    }
  }
  const cards: PersonCard[] = [];
  for (const [email, { name, lines }] of people) {
    const childOf = new Set(lines.map((l) => l.parentId).filter((id) => id !== ""));
    const mine = lines.filter((l) => !childOf.has(l.issueId));
    const total = mine.length;
    const parts = Math.ceil(total / perCard);
    for (let p = 0; p < parts; p++) {
      const chunk = mine.slice(p * perCard, (p + 1) * perCard);
      const lead = total === 1 ? "A report you raised or follow has an answer." : `${total} reports you raised or follow have an answer.`;
      const body = chunk.map((l) => `▸ ${l.title} · ${l.outcome}\n\n${l.message}`).join("\n\n");
      cards.push({
        email,
        name,
        subject: parts > 1 ? `${CARD_SUBJECT} (${p + 1} of ${parts})` : CARD_SUBJECT,
        text: `${lead}\n\n${body}`,
        count: chunk.length,
      });
    }
  }
  return cards;
}
