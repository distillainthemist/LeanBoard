// The session's working view (issue 9, 2026-11-16).

import { beforeEach, describe, expect, it } from "vitest";
import { clearSessionView, improvementView, popupTabFor, prioritiesView, rememberImprovement, rememberPopupTab, rememberPriorities, rememberShared, sharedView } from "../sessionView";

describe("the session's working view", () => {
  beforeEach(() => clearSessionView());

  it("starts with nothing chosen: the screens fall back to home and this year", () => {
    expect(sharedView()).toEqual({ org: null, period: null });
    expect(prioritiesView()).toBeNull();
    expect(improvementView()).toBeNull();
  });

  it("shares the site and the year between the two screens", () => {
    rememberShared("Pechey|Bendigo||", "FY27");
    expect(sharedView()).toEqual({ org: "Pechey|Bendigo||", period: "FY27" });
  });

  it("keeps each screen's own filters apart", () => {
    rememberPriorities({ status: "all", l1: "p1" });
    rememberImprovement({ pdca: "do", status: "completed", flagOnly: true, method: "A3", teamScope: "", process: "", viewMode: "gantt", search: "valve" });
    expect(prioritiesView()).toEqual({ status: "all", l1: "p1" });
    expect(improvementView()?.viewMode).toBe("gantt");
    expect(improvementView()?.search).toBe("valve");
  });

  it("hands back copies: a caller cannot change the memory by accident", () => {
    rememberPriorities({ status: "active", l1: null });
    const v = prioritiesView()!;
    v.status = "all";
    expect(prioritiesView()?.status).toBe("active");
  });

  it("remembers the popup's tab per priority", () => {
    rememberPopupTab("pr-1", "actions");
    expect(popupTabFor("pr-1")).toBe("actions");
    expect(popupTabFor("pr-2")).toBeNull();
  });

  it("forgets everything when home changes", () => {
    rememberShared("Pechey|Bendigo||", "FY27");
    rememberPriorities({ status: "all", l1: null });
    rememberPopupTab("pr-1", "actions");
    clearSessionView();
    expect(sharedView()).toEqual({ org: null, period: null });
    expect(prioritiesView()).toBeNull();
    expect(popupTabFor("pr-1")).toBeNull();
  });
});
