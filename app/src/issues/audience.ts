// Who hears about an issue (issue 38, 2026-10-18 round): the reporter,
// everyone following it (+1), and the reporters of the reports merged
// into it — each with the quote THEIR card carries (their own report
// for a reporter, the report they follow for a follower). Pure; the
// admin tab sends one Teams card per person from this list.

export interface AudienceMember {
  email: string;
  name: string;
  /** Why this person hears about it. */
  reason: "reporter" | "merged reporter" | "follower";
  /** The quote their card carries. */
  quote: { label: string; text: string };
}

export interface AudienceIssue {
  name: string;
  description: string;
  reporterEmail: string;
  reporterName: string;
}

const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase();
const quoteOf = (name: string, description: string) => description.trim() !== "" ? description.trim() : name;

/** The audience, deduped by email, the sender left out; the reporter
 *  first, then merged-in reporters, then followers. */
export function issueAudience(
  issue: AudienceIssue,
  mergedIn: AudienceIssue[],
  followers: { email: string; name: string }[],
  senderEmail: string
): AudienceMember[] {
  const me = norm(senderEmail);
  const seen = new Set<string>();
  const out: AudienceMember[] = [];
  const add = (email: string | undefined, name: string | undefined, reason: AudienceMember["reason"], quote: AudienceMember["quote"]) => {
    const e = norm(email);
    if (e === "" || e === me || seen.has(e)) return;
    seen.add(e);
    out.push({ email: e, name: (name ?? "").trim() || e, reason, quote });
  };
  add(issue.reporterEmail, issue.reporterName, "reporter", { label: "Your report", text: quoteOf(issue.name, issue.description) });
  for (const c of mergedIn) add(c.reporterEmail, c.reporterName, "merged reporter", { label: "Your report", text: quoteOf(c.name, c.description) });
  for (const f of followers) add(f.email, f.name, "follower", { label: "The report you follow", text: quoteOf(issue.name, issue.description) });
  return out;
}

/** The send button's label for an audience of this size. */
export function sendLabel(n: number): string {
  return n <= 1 ? "Send to reporter" : `Send to reporters (${n})`;
}

/** One line naming the audience: "To: A, B and 2 more". */
export function audienceLine(a: AudienceMember[], max = 4): string {
  if (a.length === 0) return "No one to send to — you are the only person on this report.";
  const names = a.slice(0, max).map((m) => m.name);
  const rest = a.length - names.length;
  return `To: ${names.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}`;
}
