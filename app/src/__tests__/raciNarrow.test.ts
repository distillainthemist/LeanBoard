// The RACI's narrow form (controls/Raci/editor.ts, card-responsiveness-review-2026-10-30 R3).
import { describe, expect, it } from "vitest";
import { RACI_NARROW_MAX, roleInitials } from "../../../controls/Raci/editor";

describe("roleInitials", () => {
  it("initials for several words, the first letters for one, nothing for none", () => {
    expect(roleInitials("Site Manager")).toBe("SM");
    expect(roleInitials("finance business partner lead")).toBe("FBP");
    expect(roleInitials("Finance")).toBe("Fin");
    expect(roleInitials("  ")).toBe("");
    expect(RACI_NARROW_MAX).toBe(480);
  });
});
