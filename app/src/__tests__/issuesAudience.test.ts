import { describe, expect, it } from "vitest";
import { audienceLine, issueAudience, sendLabel } from "../issues/audience";

const issue = { name: "Filter is slow", description: "The filter takes ages", reporterEmail: "Ann@x.com", reporterName: "Ann" };

describe("issue audience (issue 38)", () => {
  it("reporter first, then merged-in reporters with their own report, then followers with the parent's", () => {
    const a = issueAudience(
      issue,
      [{ name: "Slow filters", description: "", reporterEmail: "bob@x.com", reporterName: "Bob" }],
      [{ email: "cat@x.com", name: "Cat" }],
      "admin@x.com"
    );
    expect(a.map((m) => [m.email, m.reason])).toEqual([["ann@x.com", "reporter"], ["bob@x.com", "merged reporter"], ["cat@x.com", "follower"]]);
    expect(a[0].quote).toEqual({ label: "Your report", text: "The filter takes ages" });
    expect(a[1].quote).toEqual({ label: "Your report", text: "Slow filters" });
    expect(a[2].quote).toEqual({ label: "The report you follow", text: "The filter takes ages" });
  });
  it("dedupes by email, drops the sender and blanks, falls back to the email as the name", () => {
    const a = issueAudience(issue, [{ ...issue, reporterEmail: "ANN@x.com" }], [{ email: "admin@x.com", name: "Me" }, { email: "", name: "Nobody" }, { email: "dan@x.com", name: "" }], "admin@x.com");
    expect(a.map((m) => m.email)).toEqual(["ann@x.com", "dan@x.com"]);
    expect(a[1].name).toBe("dan@x.com");
  });
  it("labels", () => {
    expect(sendLabel(0)).toBe("Send to reporter");
    expect(sendLabel(1)).toBe("Send to reporter");
    expect(sendLabel(3)).toBe("Send to reporters (3)");
    expect(audienceLine([])).toMatch(/No one/);
    const many = ["a", "b", "c", "d", "e", "f"].map((n) => ({ email: `${n}@x`, name: n.toUpperCase(), reason: "follower" as const, quote: { label: "", text: "" } }));
    expect(audienceLine(many)).toBe("To: A, B, C, D and 2 more");
  });
});
