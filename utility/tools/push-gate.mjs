// push-gate (utility app): the same rule as app/tools/push-gate.mjs —
// commit first, then build, then push. A bundle built from a dirty tree,
// or not built from HEAD, is refused before `pac code push` runs.
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildStamp } from "../../app/tools/build-stamp.mjs";

const dir = new URL("..", import.meta.url).pathname;
const fail = (msg) => {
  console.error(`push-gate: REFUSED — ${msg}`);
  process.exit(1);
};

const status = execSync("git status --porcelain -- .", { cwd: dir, encoding: "utf8" })
  .split("\n")
  .filter((l) => l.trim() !== "" && !l.startsWith("??"))
  .join("\n");
if (status !== "") fail(`the working tree has uncommitted changes — commit first, then build, then push:\n${status}`);

let files;
try {
  files = readdirSync(join(dir, "dist", "assets")).filter((f) => /\.js$/.test(f));
} catch {
  fail("no dist/assets — run `npm run build` first");
}
if (files.length === 0) fail("no bundles in dist/assets — run `npm run build` first");
const stamps = new Set();
for (const f of files) {
  const src = readFileSync(join(dir, "dist", "assets", f), "utf8");
  for (const m of src.matchAll(/v\d+\.\d+\.\d+(?:-\d+-g[0-9a-f]+)?(?:-dirty)?/g)) stamps.add(m[0]);
}
const head = buildStamp(dir);
const dirty = [...stamps].filter((s) => s.endsWith("-dirty"));
if (dirty.length > 0) fail(`dist was built from a dirty tree (${dirty.join(", ")}) — rebuild now that the tree is clean`);
if (!stamps.has(head)) fail(`dist is stamped ${[...stamps].join(", ") || "(no stamp)"} but HEAD is ${head} — rebuild before pushing`);
console.log(`push-gate: OK — dist is ${head}, tree clean`);
