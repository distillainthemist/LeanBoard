// The entry points' shared piece (decision 9): a "Health check" button
// that appears only when the type is enabled for the site, reads
// "Health check · 3.4" when today's check exists, and opens the popup.
// Screens reach it by dynamic import so the board path stays lean.

import { el } from "../../../shared/ui/dom";
import { todayIso } from "../../../shared/schema/id";
import { HealthCheck, HealthScope, HealthType, scopeKey, scoreText, todaysCheck, trendFor } from "./model";
import { listChecks, loadDefinitions } from "./store";
import { HealthCheckOpts, openHealthCheck } from "./checkDialog";

export async function healthEnabled(site: string, type: HealthType): Promise<boolean> {
  try {
    return (await loadDefinitions(site)).site.enabled[type];
  } catch {
    return false;
  }
}

/** Today's check, else the latest submitted one, on a scope. */
export async function latestFor(scope: HealthScope): Promise<{ today: HealthCheck | null; latest: HealthCheck | null }> {
  try {
    const key = scopeKey(scope);
    const all = await listChecks({ scopeKey: key });
    return { today: todaysCheck(all, key, todayIso()), latest: trendFor(all, key, 1)[0] ?? null };
  } catch {
    return { today: null, latest: null };
  }
}

export interface HealthButtonOpts extends Omit<HealthCheckOpts, "onChanged" | "mayRun"> {
  mayRun: () => Promise<boolean>;
  /** Insert before this node in `parent` (null = append). */
  parent: HTMLElement;
  before: Node | null;
  cls?: string;
}

/** Mounts the button when the type is on for the site; silent otherwise. */
export async function mountHealthButton(o: HealthButtonOpts): Promise<void> {
  if (!(await healthEnabled(o.scope.site, o.scope.type))) return;
  const b = el("button", `app-btn app-hc-btn ${o.cls ?? ""}`.trim(), "Health check") as HTMLButtonElement;
  b.type = "button";
  const paint = async () => {
    const { today, latest } = await latestFor(o.scope);
    const shown = today ?? latest;
    b.textContent = shown !== null && shown.status !== "draft" ? `Health check · ${scoreText(shown.score)}` : today !== null ? "Health check · draft" : "Health check";
    b.title = today !== null ? "Today's check on this scope — open it" : latest !== null ? `Last checked ${latest.date} — run today's` : "Run a health check";
  };
  void paint();
  b.addEventListener("click", () => {
    void o.mayRun().then((ok) => {
      openHealthCheck({ host: o.host, scope: o.scope, mayRun: ok, isAdmin: o.isAdmin, actionBoardId: o.actionBoardId, onChanged: () => void paint() });
    });
  });
  if (o.before !== null && o.before.parentNode === o.parent) o.parent.insertBefore(b, o.before);
  else o.parent.appendChild(b);
}
