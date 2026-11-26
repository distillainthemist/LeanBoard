import { describe, expect, it } from "vitest";
import { holderIsMe, lockHolder, lockWords, refusalLine } from "../docs/refusal";

describe("Word's lock (report 14)", () => {
  it("reads the holder from SharePoint's sentence", () => {
    expect(lockHolder('The file "https://x.sharepoint.com/sites/a/Lib/Doc.docx" is locked for exclusive use by ben.obrien@example.com.')).toBe("ben.obrien@example.com");
    expect(lockHolder("The file Doc.docx is locked for shared use by Dugre, Marie (RTA)")).toBe("Dugre, Marie (RTA)");
    expect(lockHolder("… is locked for exclusive use by i:0#.f|membership|ellen@example.com")).toBe("ellen@example.com");
  });
  it("a lock with no name is still a lock", () => {
    expect(lockHolder("The file is locked for exclusive use")).toBe("");
  });
  it("another refusal is not a lock", () => {
    expect(lockHolder("Access denied.")).toBeNull();
    expect(lockHolder("The file is checked out for editing by someone")).toBeNull();
  });
  it("knows the person acting by address or by name", () => {
    const me = { email: "Ben.OBrien@example.com", name: "O'Brien, Ben (RTA)" };
    expect(holderIsMe("ben.obrien@example.com", me)).toBe(true);
    expect(holderIsMe("O'Brien, Ben (RTA)", me)).toBe(true);
    expect(holderIsMe("marie@example.com", me)).toBe(false);
    expect(holderIsMe("", me)).toBe(false);
  });
  it("words my own lock, someone else's, and a second refusal", () => {
    expect(lockWords({ mine: true, shown: "", again: false })).toBe("This document is open in Word. Close it there, then press again.");
    expect(lockWords({ mine: false, shown: "Marie Dugre", again: false })).toBe("Marie Dugre has this document open in Word. Ask them to close it, then press again.");
    expect(lockWords({ mine: true, shown: "", again: true })).toBe(
      "This document is open in Word. Close it there, then press again. Word can hold a document for a moment after it is closed. Wait a few seconds and press again."
    );
  });
  it("an unnamed holder reads as the plain line", () => {
    expect(lockWords({ mine: false, shown: "", again: false })).toBe("This document is open in Word. Close it there, then press again.");
  });
});

describe("how the check-out stands after a refusal (report 16)", () => {
  const reason = "The status write was refused: Access denied.";
  it("a check-out the step took is given back", () => {
    expect(refusalLine(reason, "released")).toBe(`Nothing was changed. ${reason}`);
  });
  it("a release that was refused says what to do", () => {
    expect(refusalLine(reason, "stuck")).toBe(`${reason} It is still checked out to you. Use Check in or Discard from the document's menu.`);
  });
  it("one held beforehand is left, and said to be", () => {
    expect(refusalLine(reason, "held")).toBe(`${reason} It was already checked out, and still is.`);
  });
  it("a refusal before any check-out adds nothing", () => {
    expect(refusalLine(reason, "none")).toBe(reason);
  });
});
