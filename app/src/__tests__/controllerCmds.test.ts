// Rename and the effective-date correction (R4 of the 2026-11-25 round,
// report 28): what is refused before any write, and the history's words.
import { describe, expect, it } from "vitest";
import { dateComment, dateOutcome, dateProblem, dayWords, priorNamesAfter, renameComment, renameProblem, splitName, titleAfter } from "../docs/controllerCmdsModel";

describe("rename", () => {
  it("keeps the file type out of the person's hands", () => {
    expect(splitName("Report.final.docx")).toEqual({ stem: "Report.final", ext: ".docx" });
    expect(splitName("README")).toEqual({ stem: "README", ext: "" });
  });
  it("refuses before any write", () => {
    const p = (stem: string, taken: string[] = []) => renameProblem(stem, "Crane SOP.docx", taken);
    expect(p("")).toBe("Give the new name.");
    expect(p("Crane SOP")).toBe("That is the name it has.");
    expect(p("Crane: SOP")).toBe("A name cannot hold :");
    expect(p("Crane/SOP")).toBe("A name cannot hold /");
    expect(p(" Crane SOP 2")).toMatch(/start or end with a space/);
    expect(p("Crane SOP.")).toMatch(/full stop/);
    expect(p("x".repeat(260))).toBe("That name is too long.");
    expect(p("Hoist SOP", ["hoist sop.DOCX", "Other.docx"])).toBe("“Hoist SOP.docx” is already in this folder.");
    expect(p("Hoist SOP", ["Other.docx"])).toBe("");
    // capitals only: a rename, not a clash with itself
    expect(p("CRANE SOP", ["Crane SOP.docx"])).toBe("");
  });
  it("says it in the history", () => {
    expect(renameComment("A.docx", "B.docx", "O'Brien, Ben", " wrong title ")).toBe("Renamed from “A.docx” to “B.docx” by O'Brien, Ben. Reason: wrong title");
  });
  it("adds the old name to Prior names, newest first, once", () => {
    expect(priorNamesAfter("", "A.docx")).toBe("A.docx");
    expect(priorNamesAfter("Older.docx; a.DOCX", "A.docx")).toBe("A.docx; Older.docx");
    expect(priorNamesAfter("First.docx\nSecond.docx", "Third.docx")).toBe("Third.docx; First.docx; Second.docx");
    // a single line of text holds 255: the oldest go
    const long = priorNamesAfter(`${"b".repeat(120)}.docx; ${"c".repeat(120)}.docx`, `${"a".repeat(120)}.docx`, 255);
    expect(long.length).toBeLessThanOrEqual(255);
    expect(long.startsWith("aaaa")).toBe(true);
    expect(long.includes("cccc")).toBe(false);
  });
  it("the Title follows only where it held the old name", () => {
    expect(titleAfter("Crane SOP", "Crane SOP.docx", "Hoist SOP.docx")).toBe("Hoist SOP");
    expect(titleAfter("crane sop.docx", "Crane SOP.docx", "Hoist SOP.docx")).toBe("Hoist SOP.docx");
    expect(titleAfter("Safe use of the crane", "Crane SOP.docx", "Hoist SOP.docx")).toBe("");
    expect(titleAfter("", "Crane SOP.docx", "Hoist SOP.docx")).toBe("");
  });
});

describe("the effective date", () => {
  const today = "2026-11-27";
  it("refuses a future date, a non-date and the same date; any past date is allowed", () => {
    expect(dateProblem("", "2024-03-01", today)).toBe("Give the correct date.");
    expect(dateProblem("2026-11-28", "2024-03-01", today)).toBe("The date cannot be in the future.");
    expect(dateProblem("2025-02-30", "2024-03-01", today)).toBe("That is not a date.");
    expect(dateProblem("2024-03-01", "2024-03-01", today)).toBe("That is the date it has.");
    expect(dateProblem("2011-06-15", "2024-03-01", today)).toBe("");
    expect(dateProblem(today, "2024-03-01", today)).toBe("");
  });
  it("counts the review date again and says when it is already due", () => {
    expect(dateOutcome("2022-03-01", 36, today)).toEqual({ review: "2025-03-01", months: 36, due: true });
    expect(dateOutcome("2026-01-31", 13, today)).toEqual({ review: "2027-02-28", months: 13, due: false });
  });
  it("says both dates, the review date, who and why", () => {
    expect(dayWords("2022-03-01")).toBe("1 Mar 2022");
    expect(dateComment("Effective date", "2024-03-01", "2022-03-01", "2025-03-01", "Ben", "wrong at ingestion")).toBe(
      "Effective date corrected from 1 Mar 2024 to 1 Mar 2022 by Ben. Review date now 1 Mar 2025. Reason: wrong at ingestion"
    );
    expect(dateComment("Effective date", "", "2022-03-01", "", "", "x")).toBe("Effective date corrected to 1 Mar 2022. Reason: x");
  });
});
