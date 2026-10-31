// The release gate's pure parts (shared/schema/release.ts, 2026-10-31).
import { describe, expect, it } from "vitest";
import { buildLabel, compareBuilds, parseBuild, parseReleasePolicy, serializeReleasePolicy, shouldRecord, verdictFor } from "../../../shared/schema/release";

describe("build stamps", () => {
  it("parses a release, a build past it, a dirty tree, and refuses the rest", () => {
    expect(parseBuild("v0.84.0")).toEqual({ major: 0, minor: 84, patch: 0, ahead: 0, sha: "", dirty: false });
    expect(parseBuild("v0.84.0-15-gc264a91")).toEqual({ major: 0, minor: 84, patch: 0, ahead: 15, sha: "c264a91", dirty: false });
    expect(parseBuild("v0.84.0-15-gc264a91-dirty")?.dirty).toBe(true);
    expect(parseBuild("0.84.0")?.minor).toBe(84);
    expect(parseBuild("c264a91")).toBeNull();
    expect(parseBuild("dev")).toBeNull();
    expect(parseBuild("")).toBeNull();
  });
  it("orders by tag, then commits ahead", () => {
    const o = (a: string, b: string) => Math.sign(compareBuilds(parseBuild(a)!, parseBuild(b)!));
    expect(o("v0.84.0", "v0.83.9")).toBe(1);
    expect(o("v0.84.0-15-gaaaaaaa", "v0.84.0-9-gbbbbbbb")).toBe(1);
    expect(o("v0.85.0", "v0.84.0-99-gaaaaaaa")).toBe(1);
    expect(o("v1.0.0", "v0.99.9")).toBe(1);
    expect(o("v0.84.0-15-gaaaaaaa", "v0.84.0-15-gbbbbbbb")).toBe(0);
  });
  it("labels for people", () => {
    expect(buildLabel("v0.84.0")).toBe("v0.84.0");
    expect(buildLabel("v0.84.0-15-gc264a91")).toBe("v0.84.0 +15");
    expect(buildLabel("v0.84.0-15-gc264a91-dirty")).toBe("v0.84.0 +15 (dirty)");
    expect(buildLabel("")).toBe("unknown");
    expect(buildLabel("dev")).toBe("dev");
  });
});

describe("the policy row", () => {
  it("round-trips and tolerates rubbish", () => {
    const p = { current: "v0.84.0-15-gc264a91", minimum: "v0.84.0", recordedAt: "2026-10-31T00:00:00Z", recordedBy: "Ben" };
    expect(parseReleasePolicy(serializeReleasePolicy(p))).toEqual(p);
    expect(parseReleasePolicy("")).toEqual({ current: "", minimum: "", recordedAt: "", recordedBy: "" });
    expect(parseReleasePolicy("{nope")).toEqual({ current: "", minimum: "", recordedAt: "", recordedBy: "" });
    expect(parseReleasePolicy(JSON.stringify({ current: 5 })).current).toBe("");
  });
});

describe("the verdict", () => {
  const policy = { current: "v0.84.0-15-gc264a91", minimum: "v0.84.0", recordedAt: "", recordedBy: "" };
  it("knows current, stale, newer and blocked; a minimum beats a current", () => {
    expect(verdictFor("v0.84.0-15-gc264a91", policy)).toBe("current");
    expect(verdictFor("v0.84.0-15-gfffffff", policy)).toBe("current"); // same count, the SHA carries no order
    expect(verdictFor("v0.84.0-9-gaaaaaaa", policy)).toBe("stale");
    expect(verdictFor("v0.84.0", policy)).toBe("stale");
    expect(verdictFor("v0.83.0", policy)).toBe("blocked");
    expect(verdictFor("v0.84.0-16-gaaaaaaa", policy)).toBe("newer");
    expect(verdictFor("v0.85.0", policy)).toBe("newer");
    expect(verdictFor("v0.84.0-9-gaaaaaaa", { ...policy, minimum: "v0.84.0-10-gbbbbbbb" })).toBe("blocked");
  });
  it("passes an unrecorded policy and an incomparable stamp", () => {
    expect(verdictFor("v0.84.0", { current: "", minimum: "", recordedAt: "", recordedBy: "" })).toBe("current");
    expect(verdictFor("dev", policy)).toBe("unknown");
    expect(verdictFor("c264a91", policy)).toBe("unknown");
    expect(verdictFor("v0.84.0", { ...policy, current: "garbage" })).toBe("current");
  });
  it("records only a clean newer build", () => {
    expect(shouldRecord("v0.85.0", policy)).toBe(true);
    expect(shouldRecord("v0.85.0-dirty", policy)).toBe(false);
    expect(shouldRecord("v0.84.0-15-gc264a91", policy)).toBe(false);
    expect(shouldRecord("v0.84.0-20-gaaaaaaa-dirty", policy)).toBe(false);
    expect(shouldRecord("dev", policy)).toBe(false);
    expect(shouldRecord("v0.1.0", { current: "", minimum: "", recordedAt: "", recordedBy: "" })).toBe(false);
  });
});
