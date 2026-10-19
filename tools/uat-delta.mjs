// The UAT delta (uat-proposal §5): the cases whose `modules` changed
// since a release tag (default: the latest v* tag) — for the release
// notes and for choosing a delta run. Usage: node tools/uat-delta.mjs [tag]

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (cmd) => execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
const tag = process.argv[2] ?? git("git describe --tags --abbrev=0 --match 'v*'");
const changed = git(`git diff --name-only ${tag}..HEAD -- app/src shared controls`).split("\n").filter((f) => f !== "");
const scripts = JSON.parse(readFileSync(join(root, "app", "src", "uat", "scripts.generated.json"), "utf8"));
const hits = [];
for (const [key, comp] of Object.entries(scripts.components)) {
  for (const j of comp.journeys) {
    for (const c of j.cases) {
      const touched = c.modules.filter((m) => changed.some((f) => f.startsWith(`app/src/${m}`) || f.startsWith(m)));
      if (touched.length > 0) hits.push({ key, id: c.id, title: c.title, touched });
    }
  }
}
console.log(`UAT delta since ${tag}: ${hits.length} case${hits.length === 1 ? "" : "s"} (${changed.length} source files changed)`);
for (const h of hits) console.log(`  ${h.id}  ${h.title}  [${h.touched.join(", ")}]`);
