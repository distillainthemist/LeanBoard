// Compiles docs/uat/*.md into app/src/uat/scripts.generated.json (the
// list the app ships). Each case carries a hash of its text and the
// date it last changed — kept from the previous JSON when the hash is
// unchanged, stamped with today's HEAD date otherwise — so "cases
// changed since release X" needs no git archaeology at run time. The
// release list (tags + dates) rides along for that same scope. Run by
// `npm run build`; a parse error fails the build.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseUatMarkdown, caseHash } from "./uat-parse.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const docsDir = join(root, "docs", "uat");
const outFile = join(root, "app", "src", "uat", "scripts.generated.json");
const registryFile = join(root, "app", "src", "uat", "components.json");

const registry = JSON.parse(readFileSync(registryFile, "utf8"));
const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : { components: {} };
const git = (cmd) => {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};
const headDate = (git("git log -1 --format=%cI") || new Date().toISOString()).slice(0, 10);
const releases = git("git tag -l 'v*' --format='%(refname:short) %(creatordate:short)'")
  .split("\n")
  .map((l) => l.trim().split(/\s+/))
  .filter((p) => p.length === 2)
  .map(([tag, date]) => ({ tag, date }))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const out = { generatedAt: headDate, releases, components: {} };
const errors = [];
for (const comp of registry) {
  const file = join(docsDir, `${comp.key}.md`);
  if (!existsSync(file)) {
    out.components[comp.key] = { title: comp.label, journeys: [] };
    continue;
  }
  const parsed = parseUatMarkdown(readFileSync(file, "utf8"), comp.key, comp.personas);
  errors.push(...parsed.errors.map((e) => `${comp.key}.md: ${e}`));
  const prevCases = new Map();
  for (const j of previous.components?.[comp.key]?.journeys ?? []) for (const c of j.cases) prevCases.set(c.id, c);
  for (const j of parsed.journeys) {
    for (const c of j.cases) {
      c.hash = caseHash(c);
      const prev = prevCases.get(c.id);
      c.changed = prev && prev.hash === c.hash ? prev.changed : headDate;
    }
  }
  out.components[comp.key] = { title: parsed.title, journeys: parsed.journeys };
}
if (errors.length > 0) {
  console.error("uat-compile: FAILED\n  " + errors.join("\n  "));
  process.exit(1);
}
writeFileSync(outFile, JSON.stringify(out, null, 1) + "\n");
const n = Object.values(out.components).reduce((a, c) => a + c.journeys.reduce((b, j) => b + j.cases.length, 0), 0);
console.log(`uat-compile: OK — ${n} cases across ${Object.keys(out.components).length} components, ${releases.length} releases`);
