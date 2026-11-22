// Actions raised ON a priority (the 2026-11-18 proposal, feature 1): the
// key they carry, how a link reads and moves, what the popup's Actions
// tab lists, and how they count toward the priority's status.

import { describe, expect, it } from "vitest";
import { newAction, LtkAction } from "../../../shared/schema/actions";
import { applyLink, currentLink, homeBoardOf, linkLabel, orgMark, priorityKey, priorityOfKey, priorityTarget } from "../../../shared/schema/actionLinks";
import { sectioned } from "../../../controls/ActionBoard/editor";
import { sourceLabel } from "../../../controls/LeanHub/types";
import { actionCounts, countsWords, priorityStatus } from "../improvement/status";
import { homesFor, openOwn, OWN_LABEL, stampNew, tabActions } from "../priorities/actionsTabModel";

const WEIPA = "PacOps|Weipa||";
const BSL = "PacOps|BSL||";
const act = (id: string, over: Partial<LtkAction>): LtkAction => ({ ...newAction({ source: "priority", sourceId: "Weipa" }), id, ...over });

describe("the key of an action on a priority", () => {
  it("names the priority and the org it was raised at", () => {
    const key = priorityKey("pr-1", WEIPA);
    expect(key).toBe(`priority:pr-1@${orgMark(WEIPA)}`);
    expect(priorityOfKey(key)).toBe("pr-1");
    expect(priorityOfKey("init-in1:board")).toBe("");
  });
  it("differs by org: an adopted priority's action shows only where it was raised", () => {
    expect(priorityKey("pr-1", WEIPA)).not.toBe(priorityKey("pr-1", BSL));
    expect(orgMark(WEIPA)).toMatch(/^[0-9a-f]{8}$/);
  });
  it("is no board's key", () => {
    expect(homeBoardOf(priorityKey("pr-1", WEIPA))).toBe("");
  });
});

describe("how the link reads and moves", () => {
  const key = priorityKey("pr-1", WEIPA);
  const target = priorityTarget("pr-1", "Zero harm at the port", WEIPA, "Weipa");
  it("is a priority link, named when the list carries the priority", () => {
    const named = currentLink({ instanceId: key, initiativeId: undefined }, [target]);
    expect(named.kind).toBe("priority");
    expect(linkLabel(named)).toEqual({ kind: "Priority", text: "Zero harm at the port" });
    const bare = currentLink({ instanceId: key, initiativeId: undefined }, []);
    expect(bare.kind).toBe("priority");
    expect(bare.target).toBeNull();
  });
  it("links an action to the priority: its key, no initiative", () => {
    const a = act("a1", { instanceId: "init-in1:board", initiativeId: "in-1" });
    applyLink(a, target, "u1");
    expect(a.instanceId).toBe(key);
    expect(a.context.source).toBe("priority");
    expect(a.context.sourceId).toBe("Weipa");
  });
  it("labels it by kind in a list that has no name for it — never the key", () => {
    expect(sourceLabel(key, "priority", {}, () => undefined)).toBe("Priority");
    expect(sourceLabel(key, "priority", { [key]: "Priority · Zero harm at the port" }, () => undefined)).toBe("Priority · Zero harm at the port");
  });
});

describe("the popup's Actions tab", () => {
  const key = priorityKey("pr-1", WEIPA);
  const rituals = { id: "in-1", title: "Performance rituals", boardId: "init-in1" };
  const own1 = act("o1", { instanceId: key });
  const init1 = act("i1", { instanceId: "init-in1:card-3" });
  it("lists the priority's own actions first, then its initiatives'", () => {
    expect(tabActions([own1], [rituals], [init1, own1]).map((a) => a.id)).toEqual(["o1", "i1"]);
    expect(tabActions([own1], [], []).map((a) => a.id)).toEqual(["o1"]);
  });
  it("offers the priority as a home only to who may raise on it", () => {
    expect(homesFor([rituals], key).map((h) => h.label)).toEqual([OWN_LABEL, "Performance rituals"]);
    expect(homesFor([rituals]).map((h) => h.label)).toEqual(["Performance rituals"]);
    expect(homesFor([])).toEqual([]);
  });
  it("stamps a new action on the priority with its key and no initiative", () => {
    const a = act("n1", { instanceId: "" });
    stampNew(a, homesFor([rituals], key));
    expect(a.instanceId).toBe(key);
    expect(a.initiativeId ?? "").toBe("");
    const b = act("n2", { instanceId: "init-in1:board" });
    stampNew(b, homesFor([rituals], key));
    expect(b.initiativeId).toBe("in-1");
  });
  it("puts “This priority” ahead of the initiatives in the list", () => {
    const groups = sectioned([init1, own1], (a) => (a.instanceId === key ? { key: "priority", label: OWN_LABEL, first: true } : { key: "in-1", label: "Performance rituals" }));
    expect(groups.map((g) => g.label)).toEqual([OWN_LABEL, "Performance rituals"]);
  });
  it("counts the open ones for the warning on Complete and Archive", () => {
    expect(openOwn([{ status: "open" }, { status: "in-progress" }, { status: "verify" }, { status: "done" }, { status: "cancelled" }])).toBe(3);
    expect(openOwn([])).toBe(0);
  });
});

describe("a priority's own actions in its status", () => {
  const today = "2026-11-18";
  const late = actionCounts([act("l", { status: "open", due: "2026-11-01" }), act("f", { status: "open", due: "2026-12-01" })], today);
  const fine = actionCounts([act("f", { status: "open", due: "2026-12-01" })], today);
  it("a late action makes the priority off track, and says why", () => {
    const p = priorityStatus(["good", "good"], { actions: late, metrics: [] });
    expect(p.state).toBe("bad");
    expect(p.own.map((r) => r.text)).toEqual(["1 late priority action"]);
    expect(countsWords(p)).toBe("2 on track · 0 support needed · 0 off track · 1 late priority action");
  });
  it("a flagged initiative still wins", () => {
    expect(priorityStatus(["flagged"], { actions: late, metrics: [] }).state).toBe("flagged");
  });
  it("with no initiatives, its own actions alone decide", () => {
    expect(priorityStatus([], { actions: fine, metrics: [] }).state).toBe("good");
    const p = priorityStatus([], { actions: late, metrics: [] });
    expect(p.state).toBe("bad");
    expect(countsWords(p)).toBe("No initiatives · 1 late priority action");
    expect(priorityStatus([], { actions: actionCounts([], today), metrics: [] }).state).toBe("none");
  });
  it("an own metric short of plan or outside its limits does too", () => {
    const p = priorityStatus(["good"], { actions: actionCounts([], today), metrics: [{ name: "TRIFR", rag: "red" }, { name: "Tonnes", rag: "amber" }, { name: "Cost", rag: "green" }] as never });
    expect(p.state).toBe("bad");
    expect(p.own.map((r) => r.text)).toEqual(["TRIFR outside its limits", "Tonnes short of plan"]);
  });
});
