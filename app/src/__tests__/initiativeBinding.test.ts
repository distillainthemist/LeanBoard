// What an initiative card switch reads (improvement/binding.ts). A hop
// used to fetch the settings twice, the template twice, the roster and
// the whole priority cascade, in a row (Ben, 2026-11-17). These count
// the reads so the pile cannot grow back unnoticed.

import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: Record<string, number> = {};
const hit = (k: string) => void (calls[k] = (calls[k] ?? 0) + 1);

const initiative = {
  id: "I1",
  boardId: "init-I1",
  templateId: "T1",
  title: "Reduce changeover",
  description: "",
  period: "",
  method: "",
  status: "active",
  singleAction: false,
  stageId: "",
  stageTargets: {},
  org: { site: "Weipa", department: "Mining", area: "" },
  priorities: [{ priorityId: "P1", primary: true }],
  metrics: [],
  roles: { owner: [{ whoId: "u1", who: "Ben" }], member: [{ whoId: "u2", who: "Jane" }] },
  fieldValues: { scope: "Line 2" },
  snapshot: { stages: [], roleLabels: { owner: "Owner" } },
};

vi.mock("../runtime", () => ({ currentViewer: () => null }));
vi.mock("../prompts", () => ({ promptText: async () => null }));
vi.mock("../priorities/dialogs", () => ({ pickOwner: async () => null, pickPeople: async () => null }));
vi.mock("../people/directoryAdd", () => ({ myDirectoryRoad: async () => null }));
vi.mock("../store/inflight", () => ({ track: <T>(p: Promise<T>) => p }));
vi.mock("../store/people", () => ({ listPeople: async () => (hit("roster"), []) }));
vi.mock("../store/initiatives", () => ({ listInitiatives: async () => (hit("initiatives"), [initiative]), saveInitiative: async () => undefined }));
vi.mock("../store/templates", () => ({
  getTemplate: async () => (hit("template"), { id: "T1", name: "DMAIC", boardId: "tpl-T1", fields: [{ key: "scope", label: "Scope", kind: "text", options: [], required: false }], roles: [] }),
  listTemplates: async () => (hit("templates"), []),
}));
vi.mock("../store/config", () => ({ improvementSettingsJson: async () => (hit("settings"), "") }));
vi.mock("../store/priorities", () => ({
  priorityStatement: async () => (hit("priority"), "Zero harm"),
  loadCascade: async () => (hit("cascade"), { pillars: [], priorities: [], assignments: [] }),
}));

import { initiativeCardSide, initiativeContext, makeInitiativeBinding } from "../improvement/binding";

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
});

describe("an initiative card's reads", () => {
  it("loads the row, the settings and the template once each", async () => {
    const ctx = await initiativeContext("init-I1");
    expect(ctx?.i.title).toBe("Reduce changeover");
    expect(calls).toEqual({ initiatives: 1, settings: 1, template: 1 });
    expect(await initiativeContext("init-nope")).toBeNull();
  });

  it("builds a canvas card's binding from a context in hand with no further read", async () => {
    const context = await initiativeContext("init-I1");
    for (const k of Object.keys(calls)) delete calls[k];
    const side = await initiativeCardSide("init-I1", { context, canvas: true, binds: ["title", "field:scope"], roster: async () => (hit("roster"), []) });
    expect(calls).toEqual({});
    expect(side.binding?.get("title")).toBe("Reduce changeover");
    expect(side.binding?.get("field:scope")).toBe("Line 2");
    expect(side.assignees.map((p) => p.who)).toEqual(["Ben", "Jane"]);
  });

  it("reads the primary priority's one row only for a card that shows it, never the cascade", async () => {
    const context = await initiativeContext("init-I1");
    for (const k of Object.keys(calls)) delete calls[k];
    const side = await initiativeCardSide("init-I1", { context, canvas: true, binds: ["priority"], roster: undefined });
    expect(calls).toEqual({ priority: 1 });
    expect(side.binding?.get("priority")).toBe("Zero harm");
  });

  it("gives a card that is not a canvas the people and no binding", async () => {
    const context = await initiativeContext("init-I1");
    for (const k of Object.keys(calls)) delete calls[k];
    const side = await initiativeCardSide("init-I1", { context, canvas: false, binds: [], roster: undefined });
    expect(side.binding).toBeUndefined();
    expect(side.assignees).toHaveLength(2);
    expect(calls).toEqual({});
  });

  it("serves the board's shared binding in four reads, the roster not among them", async () => {
    const b = await makeInitiativeBinding("init-I1", () => undefined);
    expect(b?.get("priority")).toBe("Zero harm");
    expect(calls).toEqual({ initiatives: 1, settings: 1, template: 1, priority: 1 });
  });
});
