// The spreadsheet round trip's pure parts (docs/sheetRoundTrip.ts,
// features-plan-2026-10-29, feature 2): the export strings, the two
// sheets, and an edited Files sheet read back strictly.
import { describe, expect, it } from "vitest";
import { FILES_SHEET, FIRST_FILE_ROW, ID_INTERNAL, NAME_INTERNAL, PATH_SEP, SheetColumn, SheetFile, VALUES_FIRST_ROW, VALUES_SHEET, buildSheets, exportCell, mapCell, parsePersonText, parseSheet, parseSummary, personText } from "../docs/sheetRoundTrip";

const org: SheetColumn = {
  internal: "DMSOrg",
  label: "Organisation unit",
  kind: "taxonomy",
  multi: false,
  options: [
    { text: "Pechey", label: "Pechey", termId: "t-p" },
    { text: `Pechey${PATH_SEP}Bell Bay`, label: "Bell Bay", termId: "t-bb" },
    { text: `Pechey${PATH_SEP}Bell Bay${PATH_SEP}Casting`, label: "Casting", termId: "t-cast" },
    { text: `Pechey${PATH_SEP}Boyne${PATH_SEP}Casting`, label: "Casting", termId: "t-cast2" },
  ],
  poolBound: false,
  required: true,
};
const tags: SheetColumn = { internal: "DMSTags", label: "Tags", kind: "taxonomy", multi: true, options: [{ text: "Safety", label: "Safety", termId: "t-s" }, { text: "Crane Ops", label: "Crane Ops", termId: "t-c" }], poolBound: false, required: false };
const owner: SheetColumn = { internal: "DMSOwner", label: "Owner", kind: "person", multi: false, options: [{ text: "Ann Ray <ann@x.test>", email: "ann@x.test", name: "Ann Ray" }, { text: "Bob Day <bob@x.test>", email: "bob@x.test", name: "Bob Day" }], poolBound: true, required: true };
const author: SheetColumn = { internal: "DMSAuthor", label: "Author", kind: "person", multi: true, options: [], poolBound: false, required: false };
const status: SheetColumn = { internal: "DMSStatus", label: "Status", kind: "choice", multi: false, options: [{ text: "Draft" }, { text: "Approved" }], poolBound: false, required: false };
const eff: SheetColumn = { internal: "DMSEffective", label: "Effective", kind: "date", multi: false, options: [], poolBound: false, required: false };
const title: SheetColumn = { internal: "DMSTitle", label: "Title", kind: "text", multi: false, options: [], poolBound: false, required: false };
const cols = [org, tags, owner, author, status, eff, title];

const values = {
  __name: "Policy A",
  DMSOrg: "Casting",
  DMSTags: "Safety; Crane Ops",
  DMSOwner: "Ann Ray",
  "DMSOwner#email": "ann@x.test",
  DMSAuthor: "Cy Lee; Di Moss",
  "DMSAuthor#email": "cy@x.test; di@x.test",
  DMSStatus: "Draft",
  "DMSEffective.": "2026-10-09T00:00:00Z",
  DMSEffective: "9 Oct 2026",
  DMSTitle: "Policy A — scope",
};
const fileOf = (uniqueId: string, name: string, v: Record<string, string>): SheetFile => ({ uniqueId, name, cells: Object.fromEntries([[NAME_INTERNAL, v.__name ?? ""], ...cols.map((c) => [c.internal, exportCell(c, v)])]) });
const f1 = fileOf("U1", "Policy A.pdf", values);
const f2 = fileOf("U2", "Plan B.docx", { __name: "Plan B" });
const noDirectory = async () => [];

describe("exportCell", () => {
  it("writes a term's full path, people as Name <email>, dates by their ISO twin", () => {
    // the first leaf match wins (the saved value carries only labels)
    expect(exportCell(org, values)).toBe(`Pechey${PATH_SEP}Bell Bay${PATH_SEP}Casting`);
    expect(exportCell(tags, values)).toBe("Safety; Crane Ops");
    expect(exportCell(owner, values)).toBe("Ann Ray <ann@x.test>");
    expect(exportCell(author, values)).toBe("Cy Lee <cy@x.test>; Di Moss <di@x.test>");
    expect(exportCell(eff, values)).toBe("2026-10-09");
    expect(exportCell(title, values)).toBe("Policy A — scope");
    expect(exportCell(org, { DMSOrg: "Unknown leaf" })).toBe("Unknown leaf");
  });
  it("personText drops a name equal to the email", () => {
    expect(personText("ann@x.test", "ann@x.test")).toBe("ann@x.test");
    expect(personText("", "ann@x.test")).toBe("ann@x.test");
    expect(personText("Ann", "ann@x.test")).toBe("Ann <ann@x.test>");
  });
});

describe("buildSheets", () => {
  const sheets = buildSheets(cols, [f1, f2], { task: "Batch 1", library: "Standards", exportedAt: "2026-10-29 03:00 UTC" });
  it("lays out the Files sheet: labels, hidden internals, one row per file", () => {
    const files = sheets[0];
    expect(files.name).toBe(FILES_SHEET);
    expect(files.rows[0]).toEqual(["File id", "Name on ingestion", "Organisation unit ✱", "Tags", "Owner ✱", "Author", "Status", "Effective", "Title"]);
    expect(files.rows[1]).toEqual([ID_INTERNAL, NAME_INTERNAL, "DMSOrg", "DMSTags", "DMSOwner", "DMSAuthor", "DMSStatus", "DMSEffective", "DMSTitle"]);
    expect(files.rows[FIRST_FILE_ROW]).toEqual(["U1", "Policy A", `Pechey${PATH_SEP}Bell Bay${PATH_SEP}Casting`, "Safety; Crane Ops", "Ann Ray <ann@x.test>", "Cy Lee <cy@x.test>; Di Moss <di@x.test>", "Draft", "2026-10-09", "Policy A — scope"]);
    expect(files.rows[FIRST_FILE_ROW + 1]).toEqual(["U2", "Plan B", "", "", "", "", "", "", ""]);
    expect(files.hiddenCols).toEqual([0]);
    expect(files.hiddenRows).toEqual([1]);
    expect(files.freezeRows).toBe(FIRST_FILE_ROW);
  });
  it("lists the valid values and validates the single-value listed columns only", () => {
    const vals = sheets[1];
    expect(vals.name).toBe(VALUES_SHEET);
    expect(vals.rows[VALUES_FIRST_ROW - 1]).toEqual(["Organisation unit", "Tags", "Owner", "Status"]);
    expect(vals.rows[VALUES_FIRST_ROW]).toEqual(["Pechey", "Safety", "Ann Ray <ann@x.test>", "Draft"]);
    expect(vals.rows[VALUES_FIRST_ROW + 3]).toEqual([`Pechey${PATH_SEP}Boyne${PATH_SEP}Casting`, "", "", ""]);
    const v = sheets[0].validations ?? [];
    // org (col 2), owner (col 4), status (col 6); tags is multi — no dropdown
    expect(v.map((x) => x.col)).toEqual([2, 4, 6]);
    expect(v[0]).toMatchObject({ listSheet: VALUES_SHEET, listCol: 0, listFromRow: VALUES_FIRST_ROW, listToRow: VALUES_FIRST_ROW + 3, fromRow: FIRST_FILE_ROW });
    expect(v[1]).toMatchObject({ listCol: 2, listToRow: VALUES_FIRST_ROW + 1 });
    expect(v[2]).toMatchObject({ listCol: 3, listToRow: VALUES_FIRST_ROW + 1 });
    expect(v[0].toRow).toBeGreaterThan(FIRST_FILE_ROW + 1);
  });
});

describe("mapCell — strict by kind", () => {
  it("taxonomy takes the full path only", async () => {
    expect(await mapCell(org, `pechey ${PATH_SEP.trim()} bell bay ${PATH_SEP.trim()} casting`, noDirectory)).toEqual({ internal: "DMSOrg", kind: "taxonomy", label: "Casting", termId: "t-cast" });
    expect(await mapCell(org, "Casting", noDirectory)).toMatch(/label, not its path/);
    expect(await mapCell(org, "Bell Bay", noDirectory)).toMatch(/not its path.*Pechey › Bell Bay\)/);
    expect(await mapCell(org, "Nowhere", noDirectory)).toMatch(/not a term in this set/);
    expect(await mapCell(org, "Pechey; Pechey › Bell Bay", noDirectory)).toMatch(/not a term/);
  });
  it("multi taxonomy splits on ; and keeps every term once", async () => {
    expect(await mapCell(tags, "Crane Ops; safety; Safety", noDirectory)).toEqual({ internal: "DMSTags", kind: "taxonomy", multi: true, terms: [{ label: "Crane Ops", termId: "t-c" }, { label: "Safety", termId: "t-s" }], label: "Crane Ops", termId: "t-c" });
    expect(await mapCell(tags, "Safety; Quality", noDirectory)).toMatch(/"Quality" is not a term/);
  });
  it("choice and date", async () => {
    expect(await mapCell(status, "approved", noDirectory)).toEqual({ internal: "DMSStatus", kind: "choice", text: "Approved" });
    expect(await mapCell(status, "Retired", noDirectory)).toMatch(/Not one of the choices \(Draft, Approved\)/);
    expect(await mapCell(eff, "2026-11-03", noDirectory)).toEqual({ internal: "DMSEffective", kind: "date", text: "2026-11-03" });
    expect(await mapCell(eff, "2026-11-03T10:00:00", noDirectory)).toEqual({ internal: "DMSEffective", kind: "date", text: "2026-11-03" });
    expect(await mapCell(eff, "46304", noDirectory)).toEqual({ internal: "DMSEffective", kind: "date", text: "2026-10-09" });
    expect(await mapCell(eff, "2026-02-30", noDirectory)).toMatch(/yyyy-mm-dd/);
    expect(await mapCell(eff, "3/11/2026", noDirectory)).toMatch(/yyyy-mm-dd/);
  });
  it("a pool-bound person must be in the pool; names resolve when unique", async () => {
    expect(await mapCell(owner, "Bob Day <bob@x.test>", noDirectory)).toEqual({ internal: "DMSOwner", kind: "person", people: [{ email: "bob@x.test", name: "Bob Day" }] });
    expect(await mapCell(owner, "bob@x.test", noDirectory)).toEqual({ internal: "DMSOwner", kind: "person", people: [{ email: "bob@x.test", name: "Bob Day" }] });
    expect(await mapCell(owner, "Bob Day", noDirectory)).toEqual({ internal: "DMSOwner", kind: "person", people: [{ email: "bob@x.test", name: "Bob Day" }] });
    expect(await mapCell(owner, "zed@x.test", noDirectory)).toMatch(/not in the owners & approvers pool/);
    expect(await mapCell(owner, "Ann Ray; Bob Day", noDirectory)).toMatch(/takes one person/);
  });
  it("a free person column goes to the directory", async () => {
    const dir = async (q: string) => {
      if (q === "cy@x.test") return [{ email: "cy@x.test", name: "Cy Lee" }];
      if (q === "Di") return [{ email: "di@x.test", name: "Di Moss" }, { email: "di2@x.test", name: "Di Mott" }];
      if (q === "Ed") return [{ email: "ed@x.test", name: "Ed Nye" }];
      return [];
    };
    expect(await mapCell(author, "cy@x.test; Ed", dir)).toEqual({ internal: "DMSAuthor", kind: "person", people: [{ email: "cy@x.test", name: "Cy Lee" }, { email: "ed@x.test", name: "Ed Nye" }] });
    // an email the directory does not return still goes through as itself
    expect(await mapCell(author, "new@x.test", dir)).toEqual({ internal: "DMSAuthor", kind: "person", people: [{ email: "new@x.test", name: "new@x.test" }] });
    expect(await mapCell(author, "Di", dir)).toMatch(/matches several people/);
    expect(await mapCell(author, "Nobody", dir)).toMatch(/not found in the directory/);
  });
  it("parsePersonText", () => {
    expect(parsePersonText("Ann Ray <ann@x.test>")).toEqual({ name: "Ann Ray", email: "ann@x.test" });
    expect(parsePersonText("ANN@x.test")).toEqual({ name: "", email: "ann@x.test" });
    expect(parsePersonText("Ann Ray")).toEqual({ name: "Ann Ray", email: "" });
  });
});

describe("parseSheet", () => {
  const exported = buildSheets(cols, [f1, f2], { task: "t", library: "l", exportedAt: "" })[0].rows.map((r) => r.map((c) => (c === null ? "" : String(c))));
  it("an untouched export is zero changes", async () => {
    const p = await parseSheet(exported, cols, [f1, f2], noDirectory);
    expect(p.error).toBe("");
    expect(p.changes).toEqual([]);
    expect(p.problems).toEqual([]);
    expect(p.filesSeen).toBe(2);
    expect(parseSummary(p)).toBe("0 cells on 0 files to change");
  });
  it("reads edits, clears, renames, problems and unknown rows", async () => {
    const grid = exported.map((r) => [...r]);
    const R = FIRST_FILE_ROW;
    grid[R][1] = "Policy A v2"; // rename
    grid[R][2] = ""; // clear the org
    grid[R][6] = "Approved";
    grid[R][7] = "Nov 3"; // problem
    grid[R + 1][2] = `Pechey${PATH_SEP}Bell Bay`;
    grid[R + 1][4] = "Zed <zed@x.test>"; // not in the pool
    grid[R + 1][8] = "  "; // blank over blank: nothing
    grid.push(["U9", "Gone.pdf", "", "", "", "", "", "", ""]);
    grid.push(["", "", "", "", "", "", "", "", ""]);
    const p = await parseSheet(grid, cols, [f1, f2], noDirectory);
    expect(p.error).toBe("");
    expect(p.changes).toEqual([
      { uniqueId: "U1", value: { internal: NAME_INTERNAL, kind: "text", text: "Policy A v2" } },
      { uniqueId: "U1", value: { internal: "DMSOrg", kind: "taxonomy", clear: true } },
      { uniqueId: "U1", value: { internal: "DMSStatus", kind: "choice", text: "Approved" } },
      { uniqueId: "U2", value: { internal: "DMSOrg", kind: "taxonomy", label: "Bell Bay", termId: "t-bb" } },
    ]);
    expect(p.problems).toEqual([
      { row: R + 1, file: "Policy A.pdf", column: "Effective", value: "Nov 3", reason: "Not a date — use yyyy-mm-dd." },
      { row: R + 2, file: "Plan B.docx", column: "Owner", value: "Zed <zed@x.test>", reason: `"Zed <zed@x.test>" is not in the owners & approvers pool.` },
    ]);
    expect(p.unknownFiles).toEqual(["Gone.pdf"]);
    expect(parseSummary(p)).toBe("4 cells on 2 files to change · 2 problems · 1 row for files no longer in the folder");
  });
  it("a column the sheet does not carry is untouched; a sheet without the key row is refused", async () => {
    const narrow = exported.map((r) => r.slice(0, 3));
    const p = await parseSheet(narrow, cols, [f1, f2], noDirectory);
    expect(p.changes).toEqual([]);
    const bad = await parseSheet([["a", "b"], ["x", "y"], ["U1", "z"]], cols, [f1], noDirectory);
    expect(bad.error).toMatch(/not an export/);
    expect(bad.changes).toEqual([]);
  });
});
