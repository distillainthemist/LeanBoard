// The ActionBoard's Show completed (every view, off by default — Ben,
// 2026-10-31) and the Gantt grouping it hands the host.
import { describe, expect, it } from "vitest";
import { visibleActions } from "../../../controls/ActionBoard/editor";
import { LtkAction, newAction } from "../../../shared/schema/actions";

const a = (status: LtkAction["status"], issue = ""): LtkAction => ({ ...newAction({ source: "actionboard", sourceId: "" }), status, issue });

describe("visibleActions", () => {
  const all = [a("open", "Safety"), a("in-progress"), a("verify"), a("done", "Safety"), a("cancelled")];
  it("hides completed and cancelled by default; verify is still open work", () => {
    expect(visibleActions(all, false).map((x) => x.status)).toEqual(["open", "in-progress", "verify"]);
  });
  it("shows completed when asked; cancelled never", () => {
    expect(visibleActions(all, true).map((x) => x.status)).toEqual(["open", "in-progress", "verify", "done"]);
  });
});
