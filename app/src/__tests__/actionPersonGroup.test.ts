// The kanban's "By person" grouping (controls/ActionBoard/personGroup.ts).
import { describe, expect, it } from "vitest";
import { UNASSIGNED_KEY, partDoneBy, personColumns, personKey, reassignTo } from "../../../controls/ActionBoard/personGroup";
import { LtkAction, newAction } from "../../../shared/schema/actions";

const act = (id: string, who: [string, string, boolean?][], status: LtkAction["status"] = "open"): LtkAction => {
  const a = newAction({ source: "actionboard", sourceId: "" });
  a.id = id;
  a.status = status;
  a.assignees = who.map(([whoId, name, done]) => ({ whoId, who: name, done: done === true }));
  return a;
};

describe("a column per person", () => {
  const ben: [string, string] = ["u1", "O'Brien, Ben"];
  const jane: [string, string] = ["u2", "Smith, Jane"];
  const a1 = act("a1", [jane]);
  const a2 = act("a2", [ben]);
  const shared = act("a3", [ben, ["u2", "Smith, Jane", true]]);
  const nobody = act("a4", []);
  const typed = act("a5", [["", "amir haddad"]]);
  const cols = personColumns([a1, a2, shared, nobody, typed]);

  it("orders people by name and puts Unassigned last", () => {
    expect(cols.map((c) => c.label)).toEqual(["amir haddad", "O'Brien, Ben", "Smith, Jane", "Unassigned"]);
    expect(cols[3].key).toBe(UNASSIGNED_KEY);
    expect(cols[3].person).toBeNull();
  });
  it("stands a shared action in the column of everyone on it", () => {
    expect(cols[1].items.map((a) => a.id)).toEqual(["a2", "a3"]);
    expect(cols[2].items.map((a) => a.id)).toEqual(["a1", "a3"]);
  });
  it("keys a typed name by the name, an account by its id", () => {
    expect(cols[0].key).toBe("name:amir haddad");
    expect(personKey({ whoId: "u9", who: "Anyone" })).toBe("u9");
  });
  it("knows whose part of a shared action is done", () => {
    expect(partDoneBy(shared, "u2")).toBe(true);
    expect(partDoneBy(shared, "u1")).toBe(false);
  });
  it("has no Unassigned column when everything is held, and none at all for nothing", () => {
    expect(personColumns([a1, a2]).map((c) => c.label)).toEqual(["O'Brien, Ben", "Smith, Jane"]);
    expect(personColumns([])).toEqual([]);
  });
});

describe("a card dropped on another person", () => {
  it("hands a one-person action over, open", () => {
    const a = act("a", [["u1", "Ben"]]);
    expect(reassignTo(a, { whoId: "u2", who: "Jane" })).toBeNull();
    expect(a.assignees).toEqual([{ whoId: "u2", who: "Jane", done: false }]);
  });
  it("keeps a closed action closed for its new holder", () => {
    const a = act("a", [["u1", "Ben", true]], "done");
    a.assignees[0].doneAt = "2026-11-10T02:00:00.000Z";
    reassignTo(a, { whoId: "u2", who: "Jane" });
    expect(a.assignees).toEqual([{ whoId: "u2", who: "Jane", done: true, doneAt: "2026-11-10T02:00:00.000Z" }]);
  });
  it("gives an unassigned action a holder, and Unassigned takes one away", () => {
    const a = act("a", []);
    reassignTo(a, { whoId: "u2", who: "Jane" });
    expect(a.assignees.map((p) => p.who)).toEqual(["Jane"]);
    reassignTo(a, null);
    expect(a.assignees).toEqual([]);
  });
  it("refuses a shared action and leaves it as it was", () => {
    const a = act("a", [["u1", "Ben"], ["u2", "Jane"], ["u3", "Sam"]]);
    expect(reassignTo(a, { whoId: "u4", who: "Ana" })).toBe("That action is shared by 3 people. Change who is on it from the action itself.");
    expect(a.assignees).toHaveLength(3);
  });
});
