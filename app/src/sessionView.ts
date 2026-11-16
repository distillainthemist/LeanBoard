// Where the person is working, for the SESSION (Ben, 2026-11-16, issue
// 9). Priorities and Improvement rebuilt themselves from defaults — own
// site, current year — on every route change, so opening an initiative
// and coming back threw the place away. The site and the year are now
// remembered here and SHARED by the two screens; each keeps its own
// other filters.
//
// Module state on purpose: it survives the route remounts (the bundle
// stays loaded) and is gone when the app starts again — exactly the
// lifetime asked for. sessionStorage would outlive a reload of the
// player frame. UI-free, so it is tested on its own.

export interface SharedView {
  /** orgKey of the organisation in view; null = not chosen yet. */
  org: string | null;
  /** The period label in view; null = not chosen yet. */
  period: string | null;
}

export interface PrioritiesView {
  status: "active" | "completed" | "all";
  l1: string | null;
}

export interface ImprovementView {
  pdca: string;
  status: string;
  flagOnly: boolean;
  method: string;
  teamScope: string;
  process: string;
  viewMode: "list" | "tiles" | "gantt";
  search: string;
}

let shared: SharedView = { org: null, period: null };
let priorities: PrioritiesView | null = null;
let improvement: ImprovementView | null = null;
/** The priority popup's tab, per priority — returning from a board
 *  reopens the popup where it was left. */
const popupTab = new Map<string, string>();

export function sharedView(): SharedView {
  return { ...shared };
}
export function rememberShared(org: string, period: string): void {
  shared = { org, period };
}

export function prioritiesView(): PrioritiesView | null {
  return priorities ? { ...priorities } : null;
}
export function rememberPriorities(v: PrioritiesView): void {
  priorities = { ...v };
}

export function improvementView(): ImprovementView | null {
  return improvement ? { ...improvement } : null;
}
export function rememberImprovement(v: ImprovementView): void {
  improvement = { ...v };
}

export function popupTabFor(priorityId: string): string | null {
  return popupTab.get(priorityId) ?? null;
}
export function rememberPopupTab(priorityId: string, tab: string): void {
  popupTab.set(priorityId, tab);
}

/** Forget everything: the person's own site changed, or they are now
 *  viewing as someone else — "home" is somewhere new. */
export function clearSessionView(): void {
  shared = { org: null, period: null };
  priorities = null;
  improvement = null;
  popupTab.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("ltk-profile-changed", clearSessionView);
  window.addEventListener("leanboard:viewas", clearSessionView);
}
