// The duplicate document-id check must tell "may not read this library"
// (skip it) from "the question could not be answered" (stop) — a failed
// lookup used to count as "no clash" (2026-11-18).
import { describe, expect, it } from "vitest";
import { isAccessRefusal, isThresholdRefusal } from "../docs/model";

const odata = (value: string) => JSON.stringify({ "odata.error": { code: "-2147024891, System.UnauthorizedAccessException", message: { lang: "en-US", value } } });

describe("a refused duplicate-id lookup", () => {
  it("knows a library the person may not read", () => {
    expect(isAccessRefusal(odata("Access denied. You do not have permission to perform this action or access this resource."))).toBe(true);
    expect(isAccessRefusal("List does not exist. The page you selected contains a list that does not exist.")).toBe(true);
    expect(isAccessRefusal("403 Forbidden")).toBe(true);
  });
  it("knows the list view threshold, which is NOT an access refusal", () => {
    const t = odata("The attempted operation is prohibited because it exceeds the list view threshold.");
    expect(isThresholdRefusal(t)).toBe(true);
    expect(isAccessRefusal("The attempted operation is prohibited because it exceeds the list view threshold.")).toBe(false);
  });
  it("treats anything else as unanswered", () => {
    for (const text of ["The request timed out", "BadGateway", "Throttled: too many requests", ""]) {
      expect(isAccessRefusal(text)).toBe(false);
      expect(isThresholdRefusal(text)).toBe(false);
    }
  });
});
