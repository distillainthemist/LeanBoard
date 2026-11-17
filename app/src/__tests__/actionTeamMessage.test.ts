// "Add a team" and "Message about this action" — the pure halves
// (2026-11-17, issues 10 and 6) — and the Action card's "recently
// completed" window (issue 2).
import { describe, expect, it } from "vitest";
import { splitTeam } from "../actions/teamModel";
import { defaultRecipients, messageDraft, sentLine } from "../actions/messageModel";
import { visibleActions } from "../../../controls/ActionBoard/editor";
import { newAction, LtkAction } from "../../../shared/schema/actions";

const dp = (id: string, name: string, over: Record<string, unknown> = {}) => ({ id, name, accountEnabled: true, userType: "Member", ...over });
const rp = (whoId: string, who: string, active = true) => ({ whoId, who, active });

describe("a leader's team", () => {
  const roster = [rp("L", "Lead, Lee"), rp("a", "Able, Ann"), rp("b", "Baker, Bo"), rp("x", "Gone, Gil", false)];
  it("adds the people in the app, by the app's name for them, and names the rest", () => {
    const out = splitTeam([dp("L", "Lee Lead"), dp("B", "Bo Baker"), dp("a", "Ann Able"), dp("c", "Cy Carr"), dp("d", "Di Dunn")], roster, "L");
    expect(out.people).toEqual([{ whoId: "a", who: "Able, Ann" }, { whoId: "b", who: "Baker, Bo" }]);
    expect(out.skipped).toEqual(["Cy Carr", "Di Dunn"]);
  });
  it("leaves the leader out, and never lists a person twice", () => {
    const out = splitTeam([dp("L", "Lee Lead"), dp("a", "Ann Able"), dp("A", "Ann Able")], roster, "l");
    expect(out.people.map((p) => p.whoId)).toEqual(["a"]);
  });
  it("skips disabled and guest accounts without naming them; an inactive app person is not in the app", () => {
    const out = splitTeam([dp("q", "Old Account", { accountEnabled: false }), dp("g", "A Guest", { userType: "Guest" }), dp("x", "Gil Gone")], roster, "L");
    expect(out.people).toEqual([]);
    expect(out.skipped).toEqual(["Gil Gone"]);
  });
});

describe("message about an action", () => {
  const emails: Record<string, string> = { a: "ann@example.com", b: "bo@example.com", me: "me@example.com" };
  const emailOf = (id: string) => emails[id] ?? "";
  it("opens addressed to the assignees with an email — never the sender", () => {
    const to = defaultRecipients([{ whoId: "me", who: "Me" }, { whoId: "a", who: "Ann" }, { whoId: "z", who: "No Email" }, { whoId: "", who: "Typed Name" }, { whoId: "b", who: "Bo" }], emailOf, "me");
    expect(to).toEqual([{ name: "Ann", email: "ann@example.com" }, { name: "Bo", email: "bo@example.com" }]);
  });
  it("drafts the subject and the message from the action", () => {
    const d = messageDraft({ issue: "Guarding", description: "Audit the fillers", due: "2026-11-30" });
    expect(d.subject).toBe("Action: Audit the fillers");
    expect(d.body).toBe("About the action: Audit the fillers\nIssue: Guarding\nDue 2026-11-30.");
    expect(messageDraft({ issue: "Guarding", description: "", due: "" }).body).toBe("About the action: Guarding\nNo due date.");
    expect(messageDraft({ issue: "", description: "x".repeat(120), due: "" }).subject.length).toBeLessThanOrEqual(88);
  });
  it("leaves one line on the action", () => {
    expect(sentLine([{ name: "Ann", email: "a" }], "Teams")).toBe("Messaged Ann by Teams");
    expect(sentLine([1, 2, 3, 4, 5].map((n) => ({ name: `P${n}`, email: `${n}` })), "email")).toBe("Messaged P1; P2; P3 +2 by email");
  });
});

describe("the Action card: recently completed", () => {
  const a = (over: Partial<LtkAction>): LtkAction => ({ ...newAction({ source: "card", sourceId: "" }), ...over });
  const list = [a({ id: "open" }), a({ id: "new", status: "done", doneAt: "2026-11-15" }), a({ id: "old", status: "done", doneAt: "2026-10-01" }), a({ id: "undated", status: "done" }), a({ id: "gone", status: "cancelled" }), a({ id: "wait", status: "verify" })];
  const ids = (out: LtkAction[]) => out.map((x) => x.id);
  it("shows open work and what closed inside the window; never the cancelled", () => {
    expect(ids(visibleActions(list, false, 7, "2026-11-17"))).toEqual(["open", "new", "wait"]);
  });
  it("shows every completed action when asked", () => {
    expect(ids(visibleActions(list, true, 7, "2026-11-17"))).toEqual(["open", "new", "old", "undated", "wait"]);
  });
  it("a window of 0 hides completed until asked — as before 2026-11-17", () => {
    expect(ids(visibleActions(list, false, 0, "2026-11-17"))).toEqual(["open", "wait"]);
    expect(ids(visibleActions(list, false))).toEqual(["open", "wait"]);
  });
});
