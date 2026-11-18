// "Cascade to team" (actions/team.ts): one level or two, never further,
// and stopping at the depth asked for is not "answered only in part".
import { beforeEach, describe, expect, it, vi } from "vitest";

const asked: { maxDepth?: number; maxPeople?: number }[] = [];
let walk = { rootIds: ["L"], people: [] as { id: string; name: string; mail: string; managerId: string; level: number }[], truncated: false, capped: false, failed: [] as string[] };

vi.mock("../store/directoryWalk", () => ({
  walkReports: async (_roots: string[], _progress: unknown, caps: { maxDepth?: number; maxPeople?: number }) => {
    asked.push(caps);
    return walk;
  },
}));
vi.mock("../store/people", () => ({ listPeople: async () => [] }));

import { teamRoad } from "../actions/team";

beforeEach(() => {
  asked.length = 0;
  walk = { rootIds: ["L"], people: [], truncated: false, capped: false, failed: [] };
});

describe("the cascade's reporting line", () => {
  it("walks exactly the levels asked for", async () => {
    await teamRoad().reports("L", 1);
    await teamRoad().reports("L", 2);
    expect(asked.map((c) => c.maxDepth)).toEqual([1, 2]);
  });
  it("is whole when the walk merely stopped at that depth", async () => {
    walk.truncated = true; // people exist further down — as asked
    expect((await teamRoad().reports("L", 1)).partial).toBe(false);
  });
  it("is partial when the people cap was hit or a read failed", async () => {
    walk.truncated = true;
    walk.capped = true;
    expect((await teamRoad().reports("L", 2)).partial).toBe(true);
    walk.capped = false;
    walk.truncated = false;
    walk.failed = ["Jane Smith"];
    expect((await teamRoad().reports("L", 2)).partial).toBe(true);
  });
});
