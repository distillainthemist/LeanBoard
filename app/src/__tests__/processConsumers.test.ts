// The process association on the meeting blob and the subtree / option
// helpers the consumers share (2026-10-12).
import { describe, expect, it } from "vitest";
import { buildMeetingSection, parseMeetingInfo } from "../../../shared/schema/meeting";
import { ProcessNode, buildProcessTree, flatProcessOptions, inSubtree } from "../../../shared/schema/process";

const n = (nodeId: string, level: 0 | 1 | 2 | 3, name: string, parentId = "", order = 10, over: Partial<ProcessNode> = {}): ProcessNode => ({ rowId: "", nodeId, parentId, level, name, order, termId: "", aliases: {}, archived: false, ...over });
const tree = buildProcessTree([n("t1", 0, "Smelter"), n("a1", 1, "Casting", "t1", 10, { aliases: { "bell bay": "Casthouse" } }), n("p1", 2, "Ingot casting", "a1"), n("s1", 3, "Line 2", "p1"), n("a2", 1, "Anodes", "t1", 20), n("x", 2, "Old", "a2", 5, { archived: true })]);

describe("meeting blob", () => {
  it("round-trips the process and stays sparse without one", () => {
    const section = buildMeetingSection({ purpose: "", owner: null, org: { site: "Bell Bay", department: "", area: "" }, alsoOrgs: [], participants: [], processNodeId: "p1" });
    expect(section?.processNodeId).toBe("p1");
    const info = parseMeetingInfo(JSON.stringify({ meeting: section }));
    expect(info?.processNodeId).toBe("p1");
    expect(buildMeetingSection({ purpose: "", owner: null, org: { site: "", department: "", area: "" }, alsoOrgs: [], participants: [], processNodeId: "" })).toBeNull();
    expect(parseMeetingInfo(JSON.stringify({ meeting: { org: { site: "X" } } }))?.processNodeId).toBe("");
  });
});

describe("inSubtree / flatProcessOptions", () => {
  it("matches the node itself and anything beneath; any when no filter", () => {
    expect(inSubtree(tree, "s1", "a1")).toBe(true);
    expect(inSubtree(tree, "p1", "p1")).toBe(true);
    expect(inSubtree(tree, "s1", "a2")).toBe(false);
    expect(inSubtree(tree, "", "a1")).toBe(false);
    expect(inSubtree(tree, "", "")).toBe(true);
  });
  it("lists the type's live nodes, indented, with the site's local names, to a depth", () => {
    expect(flatProcessOptions(tree, "t1", "Bell Bay").map((o) => o.label)).toEqual(["Casthouse", "  Ingot casting", "    Line 2", "Anodes"]);
    expect(flatProcessOptions(tree, "t1", "", 2).map((o) => o.value)).toEqual(["a1", "p1", "a2"]);
    expect(flatProcessOptions(tree, "", "Bell Bay")).toEqual([]);
  });
});
