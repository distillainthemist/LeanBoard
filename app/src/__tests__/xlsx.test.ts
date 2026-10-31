// The dependency-free .xlsx writer and reader (docs/xlsx.ts, features-
// plan-2026-10-29). Written files read back; Excel-style files (shared
// strings, deflated entries) read too — node's zlib stands in for the
// browser's DecompressionStream.
import { describe, expect, it } from "vitest";
import { colIndex, colLetters, crc32, excelSerialToIso, isoToExcelSerial, parseSheetXml, readXlsx, readZip, writeXlsx, writeZip, xmlEscape, xmlUnescape } from "../docs/xlsx";

// node's zlib stands in for the browser's DecompressionStream; the
// specifier is built so the app's tsconfig (no node types) is not asked
// to resolve it
type Zlib = { deflateRawSync: (d: Uint8Array) => Uint8Array; inflateRawSync: (d: Uint8Array) => Uint8Array };
const zlib = (): Promise<Zlib> => import(/* @vite-ignore */ "node:" + "zlib") as Promise<Zlib>;
const nodeInflate = async (d: Uint8Array) => new Uint8Array((await zlib()).inflateRawSync(d));
const enc = new TextEncoder();

describe("column letters", () => {
  it("round-trips", () => {
    expect(colLetters(0)).toBe("A");
    expect(colLetters(25)).toBe("Z");
    expect(colLetters(26)).toBe("AA");
    expect(colLetters(701)).toBe("ZZ");
    for (const i of [0, 1, 25, 26, 27, 51, 52, 701, 702, 16383]) expect(colIndex(colLetters(i))).toBe(i);
  });
});

describe("xml escaping", () => {
  it("escapes and unescapes, entities included", () => {
    const s = `a & b < c > "d" 'e'`;
    expect(xmlUnescape(xmlEscape(s))).toBe(s);
    expect(xmlUnescape("&#x2023; &#8250;")).toBe("‣ ›");
  });
});

describe("zip", () => {
  it("writes stored entries that read back, and crc matches a known value", () => {
    expect(crc32(enc.encode("123456789")).toString(16)).toBe("cbf43926");
    const z = writeZip([
      { name: "a.txt", data: enc.encode("hello") },
      { name: "dir/b.txt", data: enc.encode("wörld") },
    ]);
    return readZip(z, nodeInflate).then((parts) => {
      expect([...parts.keys()]).toEqual(["a.txt", "dir/b.txt"]);
      expect(new TextDecoder().decode(parts.get("dir/b.txt"))).toBe("wörld");
    });
  });
  it("reads deflated entries through the injected inflate", async () => {
    // a hand-built zip with one deflated entry (method 8), as Excel saves
    const name = enc.encode("x.txt");
    const plain = enc.encode("deflated content ".repeat(20));
    const comp = new Uint8Array((await zlib()).deflateRawSync(plain));
    const local = new Uint8Array(30 + name.length + comp.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc32(plain), true);
    lv.setUint32(18, comp.length, true);
    lv.setUint32(22, plain.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(comp, 30 + name.length);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc32(plain), true);
    cv.setUint32(20, comp.length, true);
    cv.setUint32(24, plain.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, 0, true);
    central.set(name, 46);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, 1, true);
    ev.setUint16(10, 1, true);
    ev.setUint32(12, central.length, true);
    ev.setUint32(16, local.length, true);
    const z = new Uint8Array(local.length + central.length + eocd.length);
    z.set(local, 0);
    z.set(central, local.length);
    z.set(eocd, local.length + central.length);
    const parts = await readZip(z, nodeInflate);
    expect(new TextDecoder().decode(parts.get("x.txt"))).toBe("deflated content ".repeat(20));
  });
  it("refuses what is not a zip", async () => {
    await expect(readZip(enc.encode("not a zip at all, nothing here"), nodeInflate)).rejects.toThrow(/Not a zip/);
  });
});

describe("workbook round trip", () => {
  it("writes two sheets with hidden parts and validations, and reads the cells back", async () => {
    const bytes = writeXlsx([
      {
        name: "Files",
        rows: [
          ["File id", "Name", "Owner ✱"],
          ["__id", "__name", "DMSOwner"],
          ["u1", "Policy & scope <v2>", "Ann Ray <ann@x.test>"],
          ["u2", "Plan", null],
          [],
          ["u3", "", ""],
        ],
        hiddenCols: [0],
        hiddenRows: [1],
        boldRows: [0],
        freezeRows: 2,
        validations: [{ col: 2, fromRow: 2, toRow: 50, listSheet: "Values", listCol: 0, listFromRow: 3, listToRow: 4 }],
      },
      { name: "Values", rows: [["note"], [], ["Owner"], ["Ann Ray <ann@x.test>"], ["Bob <bob@x.test>"]], freezeRows: 3 },
    ]);
    const parts = await readZip(bytes, nodeInflate);
    const sheet1 = new TextDecoder().decode(parts.get("xl/worksheets/sheet1.xml"));
    expect(sheet1).toContain(`<col min="1" max="1" width="2" customWidth="1" hidden="1"/>`);
    expect(sheet1).toContain(`<row r="2" hidden="1">`);
    expect(sheet1).toContain(`<c r="A1" s="1" t="inlineStr">`);
    expect(sheet1).toContain(`<pane ySplit="2" topLeftCell="A3"`);
    expect(sheet1).toContain(`sqref="C3:C51"><formula1>Values!$A$4:$A$5</formula1>`);
    expect(sheet1).toContain("Policy &amp; scope &lt;v2&gt;");
    // dataValidations must follow sheetData (the schema's order)
    expect(sheet1.indexOf("<dataValidations")).toBeGreaterThan(sheet1.indexOf("</sheetData>"));
    const sheets = await readXlsx(bytes, nodeInflate);
    expect(sheets.map((s) => s.name)).toEqual(["Files", "Values"]);
    expect(sheets[0].rows[2]).toEqual(["u1", "Policy & scope <v2>", "Ann Ray <ann@x.test>"]);
    expect(sheets[0].rows[3]).toEqual(["u2", "Plan", ""]);
    expect(sheets[0].rows[5]).toEqual(["u3", "", ""]);
    expect(sheets[1].rows[4]).toEqual(["Bob <bob@x.test>"]);
  });
  it("writes a date cell as a formatted serial, a note row in the muted style, a date validation and a column date format", async () => {
    const bytes = writeXlsx([
      {
        name: "S",
        rows: [["Effective", "Note"], ["guidance", "x"], [{ date: "2026-10-09" }, { date: "not a date" }], [{ date: "" }, "y"]],
        noteRows: [1],
        rowHeights: { 1: 40 },
        dateCols: [0],
        validations: [{ kind: "date", col: 0, fromRow: 2, toRow: 9 }],
      },
    ]);
    const parts = await readZip(bytes, nodeInflate);
    const xml = new TextDecoder().decode(parts.get("xl/worksheets/sheet1.xml"));
    expect(xml).toContain(`<c r="A3" s="3"><v>46304</v></c>`);
    expect(xml).toContain(`<c r="B3" t="inlineStr"><is><t xml:space="preserve">not a date</t></is></c>`);
    expect(xml).not.toContain(`<c r="A4"`);
    expect(xml).toContain(`<row r="2" ht="40" customHeight="1">`);
    expect(xml).toContain(`<c r="A2" s="2" t="inlineStr">`);
    expect(xml).toContain(`<col min="1" max="1" width="16" customWidth="1" style="3"/>`);
    expect(xml).toContain(`<dataValidation type="date" operator="greaterThanOrEqual"`);
    expect(xml).toContain(`sqref="A3:A10"><formula1>1</formula1>`);
    const styles = new TextDecoder().decode(parts.get("xl/styles.xml"));
    expect(styles).toContain(`<numFmt numFmtId="164"`);
    expect(styles).toContain(`<cellXfs count="10">`);
    const sheets = await readXlsx(bytes, nodeInflate);
    expect(sheets[0].rows[2][0]).toBe("46304");
    expect(isoToExcelSerial("2026-10-09")).toBe(46304);
    expect(isoToExcelSerial("1900-01-01")).toBe(2); // the serial counts the phantom 29 Feb 1900 only from March on
    expect(Number.isNaN(isoToExcelSerial("Nov 3"))).toBe(true);
  });
  it("quotes a sheet name with a space in a validation formula", () => {
    const bytes = writeXlsx([
      { name: "My Files", rows: [["a"]], validations: [{ col: 0, fromRow: 0, toRow: 0, listSheet: "Valid Values", listCol: 1, listFromRow: 0, listToRow: 2 }] },
      { name: "Valid Values", rows: [["x", "y"]] },
    ]);
    return readZip(bytes, nodeInflate).then((parts) => {
      expect(new TextDecoder().decode(parts.get("xl/worksheets/sheet1.xml"))).toContain("<formula1>&apos;Valid Values&apos;!$B$1:$B$3</formula1>");
    });
  });
});

describe("parseSheetXml — what Excel writes", () => {
  it("reads shared strings with rich runs, inline strings, numbers, booleans and errors", () => {
    const shared = ["plain", "rich text"];
    const xml =
      `<worksheet><sheetData>` +
      `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1"><v>46000</v></c></row>` +
      `<row r="3"><c r="A3" t="inlineStr"><is><t xml:space="preserve"> padded </t></is></c><c r="B3" t="b"><v>1</v></c><c r="C3" t="e"><v>#N/A</v></c><c r="E3" s="2"/></row>` +
      `</sheetData></worksheet>`;
    const rows = parseSheetXml(xml, shared);
    expect(rows).toEqual([
      ["plain", "rich text", "", "46000", ""],
      ["", "", "", "", ""],
      [" padded ", "TRUE", "", "", ""],
    ]);
  });
  it("joins the runs of a rich shared string", async () => {
    // a workbook whose strings live in sharedStrings.xml, as Excel saves
    const parts = [
      { name: "[Content_Types].xml", data: enc.encode("<Types/>") },
      { name: "xl/workbook.xml", data: enc.encode(`<workbook><sheets><sheet name="Files" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(`<Relationships><Relationship Id="rId1" Type="w" Target="worksheets/sheet1.xml"/></Relationships>`) },
      { name: "xl/sharedStrings.xml", data: enc.encode(`<sst><si><t>one</t></si><si><r><rPr><b/></rPr><t>Bell Bay</t></r><r><t xml:space="preserve"> › Casting</t></r></si></sst>`) },
      { name: "xl/worksheets/sheet1.xml", data: enc.encode(`<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c></row></sheetData></worksheet>`) },
    ];
    const sheets = await readXlsx(writeZip(parts), nodeInflate);
    expect(sheets[0].rows).toEqual([["Bell Bay › Casting"]]);
  });
  it("resolves an absolute relationship target", async () => {
    const parts = [
      { name: "xl/workbook.xml", data: enc.encode(`<workbook><sheets><sheet name="S" sheetId="1" r:id="rId9"/></sheets></workbook>`) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(`<Relationships><Relationship Id="rId9" Type="w" Target="/xl/worksheets/sheet7.xml"/></Relationships>`) },
      { name: "xl/worksheets/sheet7.xml", data: enc.encode(`<worksheet><sheetData><row r="2"><c r="B2"><v>3.5</v></c></row></sheetData></worksheet>`) },
    ];
    const sheets = await readXlsx(writeZip(parts), nodeInflate);
    expect(sheets[0].rows).toEqual([
      ["", ""],
      ["", "3.5"],
    ]);
  });
});

describe("excelSerialToIso", () => {
  it("maps the 1900 date system", () => {
    expect(excelSerialToIso(1)).toBe("1900-01-01");
    expect(excelSerialToIso(61)).toBe("1900-03-01");
    expect(excelSerialToIso(46304)).toBe("2026-10-09");
    expect(excelSerialToIso(0)).toBe("");
    expect(excelSerialToIso(Number.NaN)).toBe("");
  });
});

describe("sheet protection (lockedCols)", () => {
  it("protects the sheet, locks the named columns and unlocks every other cell and column default", async () => {
    const bytes = writeXlsx([{ name: "Files", rows: [["id", "Folder", "Name", "When"], ["U1", "A › B", "Policy", { date: "2026-10-09" }]], hiddenCols: [0], dateCols: [3], boldRows: [0], lockedCols: [0, 1] }]);
    const parts = await readZip(bytes, nodeInflate);
    const xml = new TextDecoder().decode(parts.get("xl/worksheets/sheet1.xml"));
    expect(xml).toContain(`<sheetProtection sheet="1" objects="1" scenarios="1" formatCells="0" formatColumns="0" formatRows="0" insertRows="0" deleteRows="0" sort="0" autoFilter="0"/>`);
    // locked columns keep the base styles; the others wear the unlocked twins (+5)
    expect(xml).toContain(`<c r="A1" s="1" t="inlineStr">`);
    expect(xml).toContain(`<c r="B1" s="1" t="inlineStr">`);
    expect(xml).toContain(`<c r="C1" s="6" t="inlineStr">`);
    expect(xml).toContain(`<c r="B2" t="inlineStr">`);
    expect(xml).toContain(`<c r="C2" s="5" t="inlineStr">`);
    expect(xml).toContain(`<c r="D2" s="8"><v>46304</v></c>`);
    // empty cells follow the column default: unlocked, dated where asked
    expect(xml).toContain(`<col min="3" max="3" width="16" customWidth="1" style="5"/>`);
    expect(xml).toContain(`<col min="4" max="4" width="16" customWidth="1" style="8"/>`);
    expect(xml).toContain(`<col min="2" max="2" width="16" customWidth="1"/>`);
    const styles = new TextDecoder().decode(parts.get("xl/styles.xml"));
    expect(styles).toContain(`<cellXfs count="10">`);
    expect((styles.match(/<protection locked="0"\/>/g) ?? []).length).toBe(5);
    // an unprotected sheet is untouched
    const plainParts = await readZip(writeXlsx([{ name: "S", rows: [["a"]] }]), nodeInflate);
    const plain = new TextDecoder().decode(plainParts.get("xl/worksheets/sheet1.xml"));
    expect(plain).not.toContain("sheetProtection");
    expect(plain).toContain(`<c r="A1" t="inlineStr">`);
  });
});

describe("link cells", () => {
  it("writes a HYPERLINK formula with the text cached, quotes doubled, in the link style; reads back as the text", async () => {
    const bytes = writeXlsx([{ name: "S", rows: [[{ link: "https://x.test/a b.pdf?web=1", text: "Open ↗" }, { link: "", text: "nothing" }, { link: "https://x.test/q", text: 'say "hi"' }]], lockedCols: [0] }]);
    const parts = await readZip(bytes, nodeInflate);
    const xml = new TextDecoder().decode(parts.get("xl/worksheets/sheet1.xml"));
    expect(xml).toContain(`<c r="A1" s="4" t="str"><f>HYPERLINK("https://x.test/a b.pdf?web=1","Open ↗")</f><v>Open ↗</v></c>`);
    expect(xml).not.toContain(`r="B1"`); // an empty link writes nothing
    expect(xml).toContain(`<c r="C1" s="9" t="str"><f>HYPERLINK("https://x.test/q","say &quot;&quot;hi&quot;&quot;")</f><v>say &quot;hi&quot;</v></c>`);
    const back = await readXlsx(bytes, nodeInflate);
    expect(back[0].rows[0]).toEqual(["Open ↗", "", 'say "hi"']);
  });
});
