// The release gate (release-gate-2026-10-31.md). Every bundle carries
// its build stamp (__APP_VERSION__); the APP_ROW records the newest
// build anyone has booted on and the oldest still allowed. This module
// compares the two at boot and while the app runs:
//   newer   → record this build as current (a clean build only)
//   stale   → at boot a full gate; while running a banner, so nobody
//             loses an edit — the player keeps the bundle it opened
//             with until the app is closed and opened again
//   blocked → a gate at once, once no screen holds unsaved work
// No reload button: a raw reload inside the player loses the host
// handshake (main.ts, view-as), so the only road is close and reopen.
import { el } from "../../../shared/ui/dom";
import { buildLabel, BuildVerdict, ReleasePolicy, shouldRecord, verdictFor } from "../../../shared/schema/release";
import { getLeaveGuard } from "../navGuard";
import { releasePolicy, saveReleasePolicy } from "../store/config";
import { recordLastBuild } from "../store/people";

export const CHECK_EVERY_MS = 5 * 60_000;
const BLOCKED_RETRY_MS = 15_000;
const VISIBLE_MIN_GAP_MS = 60_000;

export function thisBuild(): string {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
}

let banner: HTMLElement | null = null;
let gate: HTMLElement | null = null;

function copyFor(verdict: BuildVerdict, policy: ReleasePolicy): string {
  const mine = buildLabel(thisBuild());
  const cur = buildLabel(policy.current);
  return verdict === "blocked"
    ? `This LeanBoard (${mine}) is older than the oldest build still allowed (${buildLabel(policy.minimum)}).`
    : `A newer LeanBoard is available: you are on ${mine}, the current build is ${cur}.`;
}

/** The full-screen gate: nothing behind it is usable. */
function showGate(verdict: BuildVerdict, policy: ReleasePolicy): void {
  banner?.remove();
  banner = null;
  if (gate) return;
  gate = el("div", "app-update-gate");
  gate.setAttribute("role", "alertdialog");
  gate.setAttribute("aria-modal", "true");
  const card = el("div", "app-update-gate-card");
  card.append(
    el("h2", "app-update-gate-title", "Update LeanBoard"),
    el("p", "app-update-gate-text", copyFor(verdict, policy)),
    el("p", "app-update-gate-text", "Close LeanBoard and open it again to get the latest build. Anything saved is safe."),
    el("p", "app-field-hint", `Build ${thisBuild()}`)
  );
  gate.appendChild(card);
  document.body.appendChild(gate);
  document.body.classList.add("app-update-gated");
}

/** The banner under the top bar: finish up, then close and reopen. */
function showBanner(verdict: BuildVerdict, policy: ReleasePolicy): void {
  if (gate) return;
  const text = `${copyFor(verdict, policy)} ${verdict === "blocked" ? "Save your work now — the app locks when it is saved." : "Finish what you are doing, then close and reopen LeanBoard."}`;
  if (banner) {
    const msg = banner.querySelector(".app-update-msg");
    if (msg) msg.textContent = text;
    banner.classList.toggle("app-update-banner-blocked", verdict === "blocked");
    return;
  }
  banner = el("div", "app-update-banner");
  banner.classList.toggle("app-update-banner-blocked", verdict === "blocked");
  banner.setAttribute("role", "status");
  banner.appendChild(el("span", "app-update-msg", text));
  const outlet = document.querySelector(".app-outlet");
  if (outlet && outlet.parentElement) outlet.parentElement.insertBefore(banner, outlet);
  else document.body.prepend(banner);
}

export interface GateViewer {
  objectId: string;
  name: string;
}

/** Boot entry: one check now, then every CHECK_EVERY_MS and on return to
 *  the tab. `hasRow` says the viewer has a roster row to stamp. */
export async function startReleaseGate(viewer: GateViewer, hasRow: boolean): Promise<void> {
  const mine = thisBuild();
  if (hasRow) void recordLastBuild(viewer.objectId, mine).catch(() => undefined);
  let lastAt = 0;
  let blockedTimer: number | null = null;

  const check = async (atBoot: boolean): Promise<void> => {
    lastAt = Date.now();
    let policy: ReleasePolicy;
    try {
      policy = await releasePolicy();
    } catch {
      return; // unreachable settings never lock anyone out
    }
    const verdict = verdictFor(mine, policy);
    if (verdict === "newer" && shouldRecord(mine, policy)) {
      await saveReleasePolicy({ ...policy, current: mine, recordedAt: new Date().toISOString(), recordedBy: viewer.name }).catch(() => undefined);
      return;
    }
    if (verdict === "stale") {
      if (atBoot) showGate(verdict, policy);
      else showBanner(verdict, policy);
      return;
    }
    if (verdict === "blocked") {
      // never over unsaved work: a screen holding the leave guard gets
      // the banner and a retry until it lets go
      if (!atBoot && getLeaveGuard() !== null) {
        showBanner(verdict, policy);
        if (blockedTimer === null) blockedTimer = window.setTimeout(() => { blockedTimer = null; void check(false); }, BLOCKED_RETRY_MS);
        return;
      }
      showGate(verdict, policy);
      return;
    }
    // current or unknown: clear a banner a rollback may have left
    banner?.remove();
    banner = null;
  };

  await check(true);
  window.setInterval(() => void check(false), CHECK_EVERY_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastAt > VISIBLE_MIN_GAP_MS) void check(false);
  });
}
