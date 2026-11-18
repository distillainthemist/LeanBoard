// A site's default branches (Settings → Documents → Default filters):
// the tick tree, the member's own site leading, and what a first visit
// folds (2026-11-18 — the list had shrunk to companies only).
import { describe, expect, it } from "vitest";
import { defaultBranchRoots, defaultFilterRows, firstVisitFolds } from "../docs/filterModel";

const t = (id: string, ...labels: string[]) => ({ id, labels });
// two top-level terms, as in production: a company with sites, and Training
const org = [
  t("co", "RTAL PacOps"),
  t("bsl", "RTAL PacOps", "BSL"),
  t("cast", "RTAL PacOps", "BSL", "Casting"),
  t("pot", "RTAL PacOps", "BSL", "Potlines"),
  t("bba", "RTAL PacOps", "BBA"),
  t("lab", "RTAL PacOps", "BBA", "Lab"),
  t("opx", "RTAL PacOps", "Operational Excellence"),
  t("trn", "Training"),
  t("trn1", "Training", "Academy"),
];

describe("the Default filters tick tree", () => {
  it("lists each company with its sites beneath, and no departments", () => {
    expect(defaultFilterRows(org, true).map((r) => `${r.depth}:${r.label}`)).toEqual([
      "1:RTAL PacOps",
      "2:BSL",
      "2:BBA",
      "2:Operational Excellence",
      "1:Training",
      "2:Academy",
    ]);
  });
  it("lists the top level alone when the set has no company level", () => {
    const flat = [t("a", "BSL"), t("a1", "BSL", "Casting"), t("b", "BBA")];
    expect(defaultFilterRows(flat, false).map((r) => r.label)).toEqual(["BSL", "BBA"]);
  });
});

describe("the branches a member's pane opens on", () => {
  const bsl = org[1];
  it("leads with their own site though only a company is ticked", () => {
    expect(defaultBranchRoots(org, bsl, ["co"]).map((n) => n.id)).toEqual(["bsl", "co"]);
  });
  it("leads with their own site among other ticked sites, once", () => {
    expect(defaultBranchRoots(org, bsl, ["bba", "BSL".toLowerCase(), "trn"]).map((n) => n.id)).toEqual(["bsl", "bba", "trn"]);
    expect(defaultBranchRoots(org, bsl, ["bsl", "opx"]).map((n) => n.id)).toEqual(["bsl", "opx"]);
  });
  it("drops a stale id, and without a site term keeps the mapping alone", () => {
    expect(defaultBranchRoots(org, bsl, ["gone"]).map((n) => n.id)).toEqual(["bsl"]);
    expect(defaultBranchRoots(org, null, ["bba", "gone"]).map((n) => n.id)).toEqual(["bba"]);
  });
});

describe("what a first visit folds", () => {
  const bsl = org[1];
  const paths = (folds: string[][]) => folds.map((f) => f.join(" › "));
  it("folds the other mapped sites and my site's other departments", () => {
    expect(paths(firstVisitFolds(org, [bsl, org[4], org[7]], "Casting"))).toEqual(["RTAL PacOps › BBA", "Training", "RTAL PacOps › BSL › Potlines"]);
  });
  it("never folds my company over my site: the sites beside mine fold", () => {
    expect(paths(firstVisitFolds(org, [bsl, org[0]], "casting"))).toEqual(["RTAL PacOps › BBA", "RTAL PacOps › Operational Excellence", "RTAL PacOps › BSL › Potlines"]);
  });
  it("folds nothing without a branch", () => {
    expect(firstVisitFolds(org, [], "Casting")).toEqual([]);
  });
});
