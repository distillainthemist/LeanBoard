// Backlog programme tranche 6 (2026-11-27): the pure rules behind the
// capture card's add row (G3) and the risk matrix's markers (G1).

import { describe, expect, it } from "vitest";
import { hasContent, optionText, optionsFor } from "../../../controls/CaptureCard/addRow";
import { chipsShown } from "../../../controls/RiskMatrix/types";

describe("is there anything in the row to add", () => {
  it("is nothing when every cell is empty", () => {
    expect(hasContent({})).toBe(false);
    expect(hasContent({ what: "", who: [], done: false, when: undefined })).toBe(false);
    expect(hasContent({ what: "   " })).toBe(false);
  });

  it("is something for a word, a ticked box, a picked value or a person", () => {
    expect(hasContent({ what: "Caught a fault" })).toBe(true);
    expect(hasContent({ done: true })).toBe(true);
    expect(hasContent({ kind: "safety" })).toBe(true);
    expect(hasContent({ who: ["u1|Jane Smith"] })).toBe(true);
  });

  it("counts a number, zero included", () => {
    expect(hasContent({ count: 0 })).toBe(true);
    expect(hasContent({ count: 12 })).toBe(true);
  });

  it("is not fooled by an unticked box beside empty cells", () => {
    expect(hasContent({ done: false, flagged: false, what: "" })).toBe(false);
  });
});

describe("a dependent list in the add row", () => {
  const opt = (value: string, when: string, icon = "") => ({ value, label: value.toUpperCase(), icon, when }) as never;
  const col = { parent: "area", options: [opt("belt", "mine"), opt("kiln", "refinery"), opt("other", "")] };

  it("offers the options of the parent's value, and those tied to none", () => {
    expect(optionsFor(col, ["mine"]).map((o) => o.value)).toEqual(["belt", "other"]);
    expect(optionsFor(col, []).map((o) => o.value)).toEqual(["other"]);
    expect(optionsFor(col, ["mine", "refinery"]).map((o) => o.value)).toEqual(["belt", "kiln", "other"]);
  });

  it("offers everything when the list has no parent", () => {
    expect(optionsFor({ ...col, parent: "" }, []).map((o) => o.value)).toEqual(["belt", "kiln", "other"]);
  });

  it("leads a drop-down line with a text icon, never a picture's address", () => {
    expect(optionText(opt("belt", "", "⚙"))).toBe("⚙ BELT");
    expect(optionText(opt("belt", "", "data:image/png;base64,AAAA"))).toBe("BELT");
    expect(optionText(opt("belt", ""))).toBe("BELT");
  });
});

describe("the markers a risk matrix cell draws", () => {
  it("draws up to four", () => {
    expect(chipsShown(0)).toEqual({ shown: 0, more: 0 });
    expect(chipsShown(1)).toEqual({ shown: 1, more: 0 });
    expect(chipsShown(4)).toEqual({ shown: 4, more: 0 });
  });

  it("draws three and counts the rest past four", () => {
    expect(chipsShown(5)).toEqual({ shown: 3, more: 2 });
    expect(chipsShown(9)).toEqual({ shown: 3, more: 6 });
  });
});
