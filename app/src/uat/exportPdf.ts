// A UAT run as one PDF (uat-proposal §3): the run's facts, progress by
// persona, the fails and blocks first, then every case by journey with
// each tester's outcome and note. The issues writer's blocks.

import { Block, buildPdf } from "../issues/pdf";
import { OUTCOME_WORDS, UatResult, UatRun, progressByPersona, progressByTester } from "./model";

const asBuffer = (u: Uint8Array): ArrayBuffer => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
const when = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().replace("T", " ").slice(0, 16) + " UTC";
};

export function runPdfBlocks(run: UatRun, results: UatResult[]): Block[] {
  const b: Block[] = [];
  b.push({ kind: "title", text: `UAT run — ${run.name}` });
  b.push({ kind: "meta", text: `${run.status} · app v${run.appVersion} · ${run.environment} · ${run.cases.length} cases · exported ${when(new Date().toISOString())}` });
  if (run.description.trim() !== "") b.push({ kind: "p", text: run.description });
  b.push({ kind: "kv", key: "Components", value: run.components.join(", ") });
  b.push({ kind: "kv", key: "Scope", value: run.scope });
  b.push({ kind: "kv", key: "Started", value: `${run.createdByName} ${when(run.createdAt)}` });
  if (run.closedAt !== "") b.push({ kind: "kv", key: "Closed", value: `${run.closedByName} ${when(run.closedAt)}${run.closingNote !== "" ? ` — ${run.closingNote}` : ""}` });
  b.push({ kind: "h1", text: "Progress by persona" });
  for (const p of progressByPersona(run, results)) {
    b.push({ kind: "kv", key: p.persona, value: `${p.progress.pass} pass · ${p.progress.fail} fail · ${p.progress.blocked} blocked · ${p.progress.skipped} skipped · ${p.progress.untested} untested of ${p.progress.total}` });
  }
  b.push({ kind: "h1", text: "Progress by tester" });
  for (const t of progressByTester(run, results)) {
    b.push({ kind: "kv", key: `${t.assignee.name} (${t.assignee.personas.join(", ") || "every persona"})`, value: `${t.progress.pass} pass · ${t.progress.fail} fail · ${t.progress.blocked} blocked · ${t.progress.untested} untested of ${t.progress.total}` });
  }
  const latest = new Map<string, UatResult>();
  for (const r of results) {
    const k = `${r.caseId}|${r.testerEmail}`;
    const prev = latest.get(k);
    if (prev === undefined || prev.at < r.at) latest.set(k, r);
  }
  const byCase = new Map<string, UatResult[]>();
  for (const r of latest.values()) byCase.set(r.caseId, [...(byCase.get(r.caseId) ?? []), r]);
  const bad = run.cases.filter((c) => (byCase.get(c.id) ?? []).some((r) => r.outcome === "fail" || r.outcome === "blocked"));
  b.push({ kind: "h1", text: `Fails and blocks (${bad.length})` });
  if (bad.length === 0) b.push({ kind: "p", text: "None." });
  for (const c of bad) {
    b.push({ kind: "h2", text: `${c.id} — ${c.title}` });
    for (const r of (byCase.get(c.id) ?? []).filter((r) => r.outcome === "fail" || r.outcome === "blocked")) {
      b.push({ kind: "kv", key: `${OUTCOME_WORDS[r.outcome]} · ${r.testerName}`, value: `${when(r.at)}${r.note !== "" ? ` — ${r.note}` : ""}${r.issueId !== "" ? ` — issue ${r.issueId}` : ""}` });
    }
  }
  b.push({ kind: "pagebreak" });
  b.push({ kind: "h1", text: "Every case" });
  let journey = "";
  for (const c of run.cases) {
    if (c.journey !== journey) {
      journey = c.journey;
      b.push({ kind: "h2", text: journey });
    }
    const rs = byCase.get(c.id) ?? [];
    const line = rs.length === 0 ? "untested" : rs.map((r) => `${OUTCOME_WORDS[r.outcome]} (${r.testerName}${r.note !== "" ? `: ${r.note}` : ""})`).join("; ");
    b.push({ kind: "kv", key: `${c.id} · ${c.persona}`, value: `${c.title} — ${line}` });
  }
  return b;
}

export function exportRunPdf(run: UatRun, results: UatResult[]): void {
  const bytes = buildPdf({ title: `UAT run — ${run.name}`, footer: `LeanBoard UAT · ${run.name} · v${run.appVersion}`, blocks: runPdfBlocks(run, results) });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([asBuffer(bytes)], { type: "application/pdf" }));
  a.download = `UAT_${run.name.replace(/[^\w-]+/g, "_")}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
