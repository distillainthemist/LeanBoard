// The priority popup's Actions tab, the pure half (issues 5 and 11).

import { describe, expect, it } from "vitest";
import { newAction, LtkAction } from "../../../shared/schema/actions";
import { assigneeOptions, sectioned } from "../../../controls/ActionBoard/editor";
import { actionsOfInitiatives, changedSince, homeKeyFor, homesFor, initiativeOf, snapshotOf, stampNew } from "../priorities/actionsTabModel";

const rituals = { id: "in-1", title: "Performance rituals", boardId: "init-in1" };
const ecotone = { id: "in-2", title: "Ecotone plan", boardId: "init-in2" };
const single = { id: "in-3", title: "A single action", boardId: "" };
const act = (id: string, over: Partial<LtkAction>): LtkAction => ({ ...newAction({ source: "actionboard", sourceId: "" }), id, ...over });

describe("which actions the tab shows, and under what", () => {
  const a1 = act("a1", { instanceId: "init-in1:card-3" });
  const a2 = act("a2", { initiativeId: "in-2", instanceId: "hub:someone" });
  const a3 = act("a3", { initiativeId: "in-3", instanceId: "improvement:in-3" });
  const other = act("a4", { initiativeId: "in-9", instanceId: "init-in9:board" });

  it("keeps the actions of the priority's initiatives, by id or by board", () => {
    expect(actionsOfInitiatives([rituals, ecotone, single], [a1, a2, a3, other]).map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("names the initiative an action sits under", () => {
    expect(initiativeOf([rituals, ecotone], a1)?.title).toBe("Performance rituals");
    expect(initiativeOf([rituals, ecotone], a2)?.title).toBe("Ecotone plan");
    expect(initiativeOf([rituals, ecotone], other)).toBeNull();
  });

  it("groups the list under its sections, by label, the unplaced last", () => {
    const groups = sectioned([a1, a2, other], (a) => {
      const i = initiativeOf([rituals, ecotone], a);
      return i ? { key: i.id, label: i.title } : null;
    });
    expect(groups.map((g) => [g.label, g.items.map((a) => a.id)])).toEqual([
      ["Ecotone plan", ["a2"]],
      ["Performance rituals", ["a1"]],
      ["", ["a4"]],
    ]);
  });

  it("offers the people the actions are assigned to, by name", () => {
    const list = [
      act("x", { assignees: [{ whoId: "u2", who: "Smith, Jessica", done: false }] }),
      act("y", { assignees: [{ whoId: "u1", who: "Forsyth, Hayden", done: false }, { whoId: "u2", who: "Smith, Jessica", done: true }] }),
      act("z", { assignees: [{ whoId: "", who: "Someone typed", done: false }] }),
    ];
    expect(assigneeOptions(list)).toEqual([
      { whoId: "u1", who: "Forsyth, Hayden" },
      { whoId: "u2", who: "Smith, Jessica" },
    ]);
  });
});

describe("where a new action lands", () => {
  it("keys an initiative's home by its board, or by itself when it has none", () => {
    expect(homeKeyFor(rituals)).toBe("init-in1:board");
    expect(homeKeyFor(single)).toBe("improvement:in-3");
    expect(homesFor([rituals, ecotone]).map((h) => h.label)).toEqual(["Ecotone plan", "Performance rituals"]);
  });

  it("gives an unkeyed action the first home and its initiative", () => {
    const a = act("n1", { instanceId: "" });
    stampNew(a, homesFor([rituals]));
    expect(a.instanceId).toBe("init-in1:board");
    expect(a.initiativeId).toBe("in-1");
  });

  it("keeps the home the dialog chose and stamps that initiative", () => {
    const a = act("n2", { instanceId: "init-in1:board" });
    stampNew(a, homesFor([rituals, ecotone]));
    expect(a.instanceId).toBe("init-in1:board");
    expect(a.initiativeId).toBe("in-1");
  });

  it("leaves an action keyed somewhere else alone", () => {
    const a = act("n3", { instanceId: "hub:someone" });
    stampNew(a, homesFor([rituals]));
    expect(a.instanceId).toBe("hub:someone");
    expect(a.initiativeId).toBeUndefined();
  });
});

describe("which rows a change writes", () => {
  it("writes only what is new or different", () => {
    const a = act("a", { description: "one" });
    const b = act("b", { description: "two" });
    const seen = snapshotOf([a, b]);
    expect(changedSince(seen, [a, b])).toEqual([]);
    b.description = "two, edited";
    const c = act("c", {});
    expect(changedSince(seen, [a, b, c]).map((x) => x.id)).toEqual(["b", "c"]);
  });
});
