// The host's size signal (shared/ui/tier.ts, card-responsiveness-review-2026-10-30 R0).
import { describe, expect, it } from "vitest";
import { TIER_COMPACT_MIN, TIER_REGULAR_MIN, TIER_WIDE_MIN, tierFor } from "../../../shared/ui/tier";

describe("tierFor", () => {
  it("maps a host width to its tier at the documented bounds", () => {
    expect(tierFor(0)).toBe("phone");
    expect(tierFor(TIER_COMPACT_MIN - 1)).toBe("phone");
    expect(tierFor(TIER_COMPACT_MIN)).toBe("compact");
    expect(tierFor(TIER_REGULAR_MIN - 1)).toBe("compact");
    expect(tierFor(TIER_REGULAR_MIN)).toBe("regular");
    expect(tierFor(TIER_WIDE_MIN - 1)).toBe("regular");
    expect(tierFor(TIER_WIDE_MIN)).toBe("wide");
    expect(tierFor(Number.NaN)).toBe("phone");
  });
});
