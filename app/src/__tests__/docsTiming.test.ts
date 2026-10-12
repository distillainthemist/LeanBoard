import { describe, expect, it } from "vitest";
import { kindOfUri, markTiming, now, summarizeTimings, timingsSince, TimingMark } from "../docs/timing";

const mark = (kind: TimingMark["kind"], ms: number, note = "", failed = false): TimingMark => ({
  kind,
  ms,
  note,
  failed,
  at: 0,
});

describe("docs timing readout", () => {
  it("names what a SharePoint request was for", () => {
    expect(kindOfUri("_api/web/lists(guid'abc')/RenderListDataAsStream")).toBe("feed");
    expect(kindOfUri("_api/web/lists(guid'abc')/RenderListDataAsStream?Paged=TRUE")).toBe("feed");
    expect(kindOfUri("_api/search/postquery")).toBe("search");
    expect(kindOfUri("_api/web/lists(guid'abc')?$select=ItemCount")).toBe("count");
    expect(kindOfUri("_api/v2.1/termStore/sets/x/children")).toBe("term");
    expect(kindOfUri("_api/web/GetFolderByServerRelativePath(...)")).toBe("other");
  });

  it("sums each kind, counts calls and names refusals", () => {
    const s = summarizeTimings(
      [mark("feed", 900, "a"), mark("feed", 1300, "b"), mark("count", 120), mark("search", 400, "", true)],
      2100
    );
    expect(s.line).toBe("loaded in 2.1 s · feed 2.2 s ×2 · search 400 ms (1 refused) · count 120 ms");
    expect(s.detail.split("\n")).toEqual([
      "feed a: 900 ms",
      "feed b: 1.3 s",
      "count: 120 ms",
      "search: 400 ms (refused)",
    ]);
  });

  it("counts a term walk once, not its per-level calls as well", () => {
    const s = summarizeTimings(
      [mark("term", 200), mark("term", 300), mark("term walk", 520, "set 12 terms"), mark("feed", 800)],
      1500,
      { paintedFromCache: true }
    );
    expect(s.line).toBe("loaded in 1.5 s · feed 800 ms · term walk 520 ms · first paint from cache");
  });

  it("clocks a visit's first load from the tab opening", () => {
    const s = summarizeTimings([mark("app", 600, "documents config"), mark("feed", 900)], 1800, { sinceOpen: true });
    expect(s.line).toBe("1.8 s after opening · feed 900 ms · app data 600 ms");
  });

  it("keeps only the marks started after a load began", () => {
    const before = now();
    markTiming("other", before - 50, "old");
    const t0 = now();
    markTiming("feed", t0, "new");
    const mine = timingsSince(t0);
    expect(mine.map((m) => m.note)).toEqual(["new"]);
    expect(mine[0].ms).toBeGreaterThanOrEqual(0);
  });
});
