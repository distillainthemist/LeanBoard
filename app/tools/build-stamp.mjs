// The build stamp (__APP_VERSION__): `git describe --tags --always`, plus
// `-dirty` when a TRACKED SOURCE file differs from HEAD. Git's own
// `--dirty` counted `src/uat/scripts.generated.json` too — the build's
// first step (uat-compile) rewrites that tracked file with the HEAD date
// and the tag list, so every build on a later day, and EVERY release
// build in CI (the new tag is not in the committed copy), stamped itself
// dirty. A dirty build never records itself as the current one, so the
// release gate never told anyone to reopen (found 2026-11-02: the
// v0.88.0 release package reads `v0.88.0-dirty`). The generated file is
// excluded here; everything else counts.
import { execSync } from "node:child_process";

export const GENERATED_UAT = "src/uat/scripts.generated.json";

const run = (cmd, cwd) => execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** The stamp for the checkout at `appDir` (the app folder), or "dev"
 *  when git is unavailable. */
export function buildStamp(appDir) {
  try {
    const described = run("git describe --tags --always", appDir);
    const changes = run(`git status --porcelain -- . ":(exclude)${GENERATED_UAT}"`, appDir)
      .split("\n")
      .filter((l) => l.trim() !== "" && !l.startsWith("??"));
    return changes.length > 0 ? `${described}-dirty` : described;
  } catch {
    return "dev";
  }
}
