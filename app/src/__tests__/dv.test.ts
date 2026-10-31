// dv.ts — failure must never read as emptiness. A refused Dataverse
// call RESOLVES with success:false (it does not reject); before settle()
// that turned "permission denied" into an empty table, which a user saw
// as "Standard documents haven't been set up yet" (2026-08-05).

import { describe, expect, it } from "vitest";
import { allWhere, eq, firstWhere, odata, upsertWhere } from "../store/dv";

const ok = <T>(data: T) => Promise.resolve({ success: true, data });
const refused = () =>
  Promise.resolve({
    success: false,
    data: undefined,
    error: { message: "Principal user is missing prvReadben_ltkdoclibrary" },
  });

describe("dv helpers refuse to read failure as emptiness", () => {
  it("allWhere returns rows on success and [] on genuinely empty", async () => {
    expect(await allWhere(() => ok([1, 2]))).toEqual([1, 2]);
    expect(await allWhere(() => ok<number[] | undefined>(undefined))).toEqual([]);
  });

  it("allWhere THROWS the real error when the call is refused", async () => {
    await expect(allWhere(refused)).rejects.toThrow(/prvReadben_ltkdoclibrary/);
  });

  it("allWhere follows the SDK's skip token to the last page, asking for Dataverse's page ceiling", async () => {
    const calls: Record<string, unknown>[] = [];
    const paged = (o?: Record<string, unknown>) => {
      calls.push(o ?? {});
      const token = o?.skipToken as string | undefined;
      if (token === undefined) return Promise.resolve({ success: true, data: [1, 2], skipToken: "p2" });
      if (token === "p2") return Promise.resolve({ success: true, data: [3], skipToken: "p3" });
      return Promise.resolve({ success: true, data: [4] });
    };
    expect(await allWhere(paged, "x eq 1", ["a"], ["a asc"])).toEqual([1, 2, 3, 4]);
    expect(calls.length).toBe(3);
    expect(calls[0]).toEqual({ filter: "x eq 1", select: ["a"], orderBy: ["a asc"], maxPageSize: 5000 });
    expect(calls[1].skipToken).toBe("p2");
    expect(calls[2].skipToken).toBe("p3");
    // a token on an empty page never loops; a refusal mid-way throws
    expect(await allWhere(() => ok([]))).toEqual([]);
    let n = 0;
    const midway = () => (n++ === 0 ? Promise.resolve({ success: true, data: [1], skipToken: "t" }) : refused());
    await expect(allWhere(midway)).rejects.toThrow(/prvRead/);
  });

  it("firstWhere: null on empty, throw on refusal", async () => {
    expect(await firstWhere(() => ok([]), eq("a", "b"))).toBeNull();
    await expect(firstWhere(refused, eq("a", "b"))).rejects.toThrow(/failed/);
  });

  it("tolerates result shapes that never report the flag (doubles, legacy)", async () => {
    expect(await allWhere(() => Promise.resolve({ data: [7] }))).toEqual([7]);
  });

  it("upsertWhere surfaces a refused update instead of claiming success", async () => {
    const service = {
      getAll: () => ok([{ id: "row-1" }]),
      update: () =>
        Promise.resolve({
          success: false,
          data: undefined,
          error: { message: "update refused" },
        }),
      create: () => ok({ id: "row-2" }),
    };
    await expect(
      upsertWhere(service as never, eq("k", "v"), (r: { id: string }) => r.id, { x: 1 })
    ).rejects.toThrow(/update refused/);
  });

  it("odata escaping doubles apostrophes", () => {
    expect(odata("O'Brien")).toBe("O''Brien");
    expect(eq("name", "O'Brien")).toBe("name eq 'O''Brien'");
  });
});
