// The admins' issue queue: ranked first, then newest first (2026-11-18).
import { describe, expect, it } from "vitest";
import { queueOrder } from "../issues/queueOrder";

const i = (id: string, createdon: string | null, ben_priority: number | null = null) => ({ id, createdon, ben_priority });

describe("the issue queue's order", () => {
  it("reads newest first", () => {
    const out = queueOrder([i("aug", "2026-08-20T19:54:00Z"), i("nov", "2026-11-17T23:26:00Z"), i("oct", "2026-10-26T03:09:00Z")]);
    expect(out.map((x) => x.id)).toEqual(["nov", "oct", "aug"]);
  });
  it("keeps ranked issues at the top, by rank, whatever their age", () => {
    const out = queueOrder([i("new", "2026-11-17T00:00:00Z"), i("old-2", "2026-08-01T00:00:00Z", 2), i("old-1", "2026-09-01T00:00:00Z", 1), i("newer", "2026-11-18T00:00:00Z")]);
    expect(out.map((x) => x.id)).toEqual(["old-1", "old-2", "newer", "new"]);
  });
  it("orders two issues of one rank newest first", () => {
    expect(queueOrder([i("a", "2026-10-01T00:00:00Z", 1), i("b", "2026-11-01T00:00:00Z", 1)]).map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("puts an issue with no date last and keeps the order given between equals", () => {
    const out = queueOrder([i("nodate", null), i("x", "2026-11-01T00:00:00Z"), i("y", "2026-11-01T00:00:00Z"), i("bad", "not a date")]);
    expect(out.map((x) => x.id)).toEqual(["x", "y", "nodate", "bad"]);
  });
});
