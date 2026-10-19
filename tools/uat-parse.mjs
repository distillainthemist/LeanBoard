// UAT script parser (uat-proposal-2026-10.md §1) — one markdown file per
// component, one case per `###` block. Pure ESM JavaScript so the
// compile tool (node) and the vitest validation share one parser.
//
//   # <component title>
//   ## Journey 5 — Lifecycle end to end
//   ### UAT-DOC-051 — Submit for review sends the reviewers' card
//   persona: owner
//   modules: docs/lifecycleCmds.ts docs/notifyPanel.ts
//   preconditions: a draft standard with two reviewers named
//   steps:
//   1. Open the document → Submit for review.
//   2. …
//   expected: status "In review"; each reviewer has a Teams card

const FIELDS = new Set(["persona", "modules", "preconditions", "steps", "expected"]);

/** @returns {{ title: string, journeys: {title: string, cases: Case[]}[], errors: string[] }} */
export function parseUatMarkdown(text, componentKey, knownPersonas) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = { title: "", journeys: [], errors: [] };
  const seen = new Set();
  let journey = null;
  let cur = null;
  let field = "";
  const flush = () => {
    if (cur === null) return;
    const c = cur;
    cur = null;
    field = "";
    const missing = ["persona", "steps", "expected"].filter((f) => (c[f] ?? "").trim() === "");
    if (missing.length > 0) out.errors.push(`${c.id}: missing ${missing.join(", ")}`);
    if (knownPersonas && c.persona !== "" && !knownPersonas.includes(c.persona)) out.errors.push(`${c.id}: unknown persona "${c.persona}"`);
    if (seen.has(c.id)) out.errors.push(`${c.id}: duplicate id`);
    seen.add(c.id);
    const steps = c.steps
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((s) => s.replace(/^\d+[.)]\s*/, ""));
    journey.cases.push({
      id: c.id,
      title: c.title,
      journey: journey.title,
      persona: c.persona.trim(),
      modules: c.modules.split(/\s+/).map((m) => m.trim()).filter((m) => m !== ""),
      preconditions: c.preconditions.trim(),
      steps,
      expected: c.expected.trim(),
    });
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      out.title = h1[1].trim();
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      flush();
      journey = { title: h2[1].trim(), cases: [] };
      out.journeys.push(journey);
      continue;
    }
    const h3 = line.match(/^### (\S+)\s+[—-]\s+(.+)$/);
    if (h3) {
      flush();
      if (journey === null) {
        journey = { title: "", cases: [] };
        out.journeys.push(journey);
      }
      cur = { id: h3[1].trim(), title: h3[2].trim(), persona: "", modules: "", preconditions: "", steps: "", expected: "" };
      if (!/^UAT-[A-Z]+-\d{3}$/.test(cur.id)) out.errors.push(`${cur.id}: id must look like UAT-DOC-051`);
      continue;
    }
    if (cur === null) continue;
    const f = line.match(/^([a-z]+):\s?(.*)$/);
    if (f && FIELDS.has(f[1])) {
      field = f[1];
      cur[field] = f[2];
      continue;
    }
    if (field !== "") cur[field] += `\n${line}`;
  }
  flush();
  if (out.title === "") out.errors.push(`${componentKey}: no "# title" line`);
  return out;
}

/** A stable hash of what a case says — a changed case gets a new date. */
export function caseHash(c) {
  const s = [c.id, c.title, c.persona, c.modules.join(" "), c.preconditions, c.steps.join("\n"), c.expected].join("\u0001");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
