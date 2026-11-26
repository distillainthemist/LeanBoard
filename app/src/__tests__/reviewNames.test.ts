import { describe, expect, it } from "vitest";
import { fillVersionComments, nameKey, reviewProgress, reviewsOutstanding } from "../docs/model";

// report 13 (2026-11-25): "Review complete by O'Brien, Ben (RTA)" was on
// the version and the reviewer's card still listed him as waited on.
describe("a reviewer's name, however two feeds write it", () => {
  it("folds case, the apostrophe's shape and odd spaces", () => {
    expect(nameKey("O’Brien,  Ben (RTA)")).toBe("o'brien, ben (rta)");
    expect(nameKey("O'Brien, Ben (RTA) ")).toBe("o'brien, ben (rta)");
    expect(nameKey("  DUGRE, Marie (RTA)")).toBe("dugre, marie (rta)");
  });

  const names = ["O'Brien, Ben (RTA)", "Dugre, Marie (RTA)", "Black, Ellen (RTA BSL)"];

  it("finds the reviewer whose name the version writes with a curly apostrophe", () => {
    const versions = [
      { label: "10.3", comment: "Review complete by O’Brien, Ben (RTA) — I reviewed it", author: "O’Brien, Ben (RTA)", when: "2026-11-24T22:50:00Z" },
      { label: "10.2", comment: "Submitted for review", author: "Black, Ellen (RTA BSL)", when: "2026-11-24T22:00:00Z" },
    ];
    expect(reviewsOutstanding(versions, names)).toEqual(["Dugre, Marie (RTA)", "Black, Ellen (RTA BSL)"]);
    const mine = reviewProgress(versions, names, "O'Brien, Ben (RTA)");
    expect(mine.mineDone).toBe(true);
    expect(mine.mineAt).toBe("2026-11-24T22:50:00Z");
  });

  it("a draft's words found on the FILE's version count as the review", () => {
    // the item version came back bare; the file's own version holds it
    const bare = [
      { label: "10.3", comment: "", author: "O'Brien, Ben (RTA)", when: "2026-11-24T22:50:00Z" },
      { label: "10.2", comment: "", author: "Black, Ellen (RTA BSL)", when: "2026-11-24T22:00:00Z" },
    ];
    expect(reviewProgress(bare, names, "O'Brien, Ben (RTA)").mineDone).toBe(false);
    const filled = fillVersionComments(bare, new Map([
      ["10.3", "Review complete by O'Brien, Ben (RTA)"],
      ["10.2", "Submitted for review"],
    ]));
    const st = reviewProgress(filled, names, "O'Brien, Ben (RTA)");
    expect(st.mineDone).toBe(true);
    expect(st.outstanding).toEqual(["Dugre, Marie (RTA)", "Black, Ellen (RTA BSL)"]);
  });

  it("a completion before the latest submit does not count for the new round", () => {
    const versions = [
      { label: "10.5", comment: "Submitted for review", author: "Black, Ellen (RTA BSL)", when: "2026-11-25T01:00:00Z" },
      { label: "10.4", comment: "Revision requested — more to do", author: "Dugre, Marie (RTA)", when: "2026-11-25T00:00:00Z" },
      { label: "10.3", comment: "Review complete by O'Brien, Ben (RTA)", author: "O'Brien, Ben (RTA)", when: "2026-11-24T22:50:00Z" },
      { label: "10.2", comment: "Submitted for review", author: "Black, Ellen (RTA BSL)", when: "2026-11-24T22:00:00Z" },
    ];
    expect(reviewProgress(versions, names, "O'Brien, Ben (RTA)").mineDone).toBe(false);
  });
});
