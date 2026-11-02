// push-gate: refuse to push a bundle the release gate can never promote.
//
// The release gate (docs/release-gate-2026-10-31.md) lets the FIRST clean
// boot of a newer build record it as the current one, so every older client
// is told to close and reopen. A build stamped `-dirty` (uncommitted
// changes at build time) never records itself — by design, so a dev run
// cannot flag a whole site stale. The flip side, learned 2026-11-02: a
// dirty bundle pushed to an environment is invisible to the gate, and
// nobody on the previous build is ever told. So: commit first, build on
// the committed tree, then push. This gate checks both the tree and the
// stamp inside dist before `pac code push` runs (`npm run push`).
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const app = new URL("..", import.meta.url).pathname;
const fail = (msg) => {
  console.error(`push-gate: REFUSED — ${msg}`);
  process.exit(1);
};

const status = execSync("git status --porcelain", { cwd: app, encoding: "utf8" }).trim();
if (status !== "") fail(`the working tree has uncommitted changes — commit first, then build, then push:\n${status}`);

const assets = join(app, "dist", "assets");
let files;
try {
  files = readdirSync(assets).filter((f) => /^index-.*\.js$/.test(f));
} catch {
  fail("no dist/assets — run `npm run build` first");
}
if (files.length === 0) fail("no index bundle in dist/assets — run `npm run build` first");
const stamps = new Set();
for (const f of files) {
  const src = readFileSync(join(assets, f), "utf8");
  for (const m of src.matchAll(/v\d+\.\d+\.\d+(?:-\d+-g[0-9a-f]+)?(?:-dirty)?/g)) stamps.add(m[0]);
}
const head = execSync("git describe --tags --always --dirty", { cwd: app, encoding: "utf8" }).trim();
const dirty = [...stamps].filter((s) => s.endsWith("-dirty"));
if (dirty.length > 0) fail(`dist was built from a dirty tree (${dirty.join(", ")}) — rebuild now that the tree is clean`);
if (!stamps.has(head)) fail(`dist is stamped ${[...stamps].join(", ") || "(no stamp)"} but HEAD is ${head} — rebuild before pushing`);
console.log(`push-gate: OK — dist is ${head}, tree clean`);
