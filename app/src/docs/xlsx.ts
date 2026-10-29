// A dependency-free .xlsx writer and reader (features-plan-2026-10-29,
// feature 2). An .xlsx is a zip of small XML parts; writing one with
// STORED (uncompressed) entries, inline strings and a data-validation
// block is a few hundred lines, and it carries the Excel DROPDOWNS the
// community spreadsheet library cannot write. Reading parses the zip's
// central directory and inflates through an injected function — the
// browser's native DecompressionStream in the app, node's zlib in the
// tests — then scans the sheet XML with a tolerant regex reader: the
// subset Excel writes for plain cells (shared strings, inline strings,
// numbers, booleans). Pure and SDK-free; the DOM is never touched.

export type Inflate = (data: Uint8Array) => Promise<Uint8Array>;

export type CellValue = string | number | null;

export interface ListValidation {
  /** The validated column (0-based) on this sheet, over rows from..to (0-based, inclusive). */
  col: number;
  fromRow: number;
  toRow: number;
  /** The list's sheet and column, rows from..to (0-based, inclusive). */
  listSheet: string;
  listCol: number;
  listFromRow: number;
  listToRow: number;
  /** The message Excel shows for a value outside the list. */
  error?: string;
}

export interface SheetSpec {
  name: string;
  rows: CellValue[][];
  /** Column widths in characters (default 16). */
  colWidths?: number[];
  hiddenCols?: number[];
  hiddenRows?: number[];
  boldRows?: number[];
  /** Rows frozen at the top (0 = none). */
  freezeRows?: number;
  validations?: ListValidation[];
}

// ---- XML helpers -----------------------------------------------------------

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function xmlUnescape(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (_, e: string) => {
    if (e === "amp") return "&";
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    const code = e.startsWith("#x") ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function colLetters(i: number): string {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** "AA" → 26. */
export function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Characters XML 1.0 forbids (control codes) are dropped so a pasted
 *  value never makes an unreadable file. */
const xmlSafe = (s: string): string => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");

// ---- the writer -------------------------------------------------------------

const CT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/** A sheet name as a formula reference: quoted when it needs it. */
const sheetRef = (name: string): string => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`);

function sheetXml(s: SheetSpec): string {
  const hiddenCols = new Set(s.hiddenCols ?? []);
  const hiddenRows = new Set(s.hiddenRows ?? []);
  const boldRows = new Set(s.boldRows ?? []);
  const nCols = Math.max(1, ...s.rows.map((r) => r.length));
  const parts: string[] = [];
  parts.push(CT_XML);
  parts.push(`<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">`);
  parts.push(`<dimension ref="A1:${colLetters(nCols - 1)}${Math.max(1, s.rows.length)}"/>`);
  if ((s.freezeRows ?? 0) > 0) {
    const fr = s.freezeRows ?? 0;
    parts.push(`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${fr}" topLeftCell="A${fr + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${fr + 1}" sqref="A${fr + 1}"/></sheetView></sheetViews>`);
  } else {
    parts.push(`<sheetViews><sheetView workbookViewId="0"/></sheetViews>`);
  }
  parts.push(`<sheetFormatPr defaultRowHeight="15"/>`);
  parts.push("<cols>");
  for (let c = 0; c < nCols; c++) {
    const w = s.colWidths?.[c] ?? 16;
    parts.push(`<col min="${c + 1}" max="${c + 1}" width="${hiddenCols.has(c) ? 2 : w}" customWidth="1"${hiddenCols.has(c) ? ` hidden="1"` : ""}/>`);
  }
  parts.push("</cols>");
  parts.push("<sheetData>");
  s.rows.forEach((row, r) => {
    parts.push(`<row r="${r + 1}"${hiddenRows.has(r) ? ` hidden="1"` : ""}>`);
    row.forEach((v, c) => {
      if (v === null || v === "") return;
      const ref = `${colLetters(c)}${r + 1}`;
      const style = boldRows.has(r) ? ` s="1"` : "";
      if (typeof v === "number" && Number.isFinite(v)) parts.push(`<c r="${ref}"${style}><v>${v}</v></c>`);
      else parts.push(`<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(xmlSafe(String(v)))}</t></is></c>`);
    });
    parts.push("</row>");
  });
  parts.push("</sheetData>");
  const vals = s.validations ?? [];
  if (vals.length > 0) {
    parts.push(`<dataValidations count="${vals.length}">`);
    for (const v of vals) {
      const sq = `${colLetters(v.col)}${v.fromRow + 1}:${colLetters(v.col)}${v.toRow + 1}`;
      const lc = colLetters(v.listCol);
      const f1 = `${sheetRef(v.listSheet)}!$${lc}$${v.listFromRow + 1}:$${lc}$${v.listToRow + 1}`;
      parts.push(
        `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Not a listed value" error="${xmlEscape(v.error ?? "Pick a value from the dropdown — the full list is on the Values sheet.")}" sqref="${sq}"><formula1>${xmlEscape(f1)}</formula1></dataValidation>`
      );
    }
    parts.push("</dataValidations>");
  }
  parts.push(`<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>`);
  parts.push("</worksheet>");
  return parts.join("");
}

function workbookParts(sheets: SheetSpec[]): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  out.push({
    path: "[Content_Types].xml",
    text:
      `${CT_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `</Types>`,
  });
  out.push({
    path: "_rels/.rels",
    text: `${CT_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  });
  out.push({
    path: "xl/workbook.xml",
    text: `${CT_XML}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
  });
  out.push({
    path: "xl/_rels/workbook.xml.rels",
    text:
      `${CT_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
  });
  out.push({
    path: "xl/styles.xml",
    text:
      `${CT_XML}<styleSheet xmlns="${NS_MAIN}">` +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`,
  });
  sheets.forEach((s, i) => out.push({ path: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) }));
  return out;
}

/** The workbook as bytes. */
export function writeXlsx(sheets: SheetSpec[]): Uint8Array {
  const enc = new TextEncoder();
  return writeZip(workbookParts(sheets).map((p) => ({ name: p.path, data: enc.encode(p.text) })));
}

// ---- zip (stored entries) ------------------------------------------------------

let crcTable: Uint32Array | null = null;
export function crc32(data: Uint8Array): number {
  if (crcTable === null) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS time/date for the zip headers — fixed, so the same content
 *  gives the same bytes (tests compare). */
const DOS_TIME = 0;
const DOS_DATE = (2026 - 1980) << 9 | (1 << 5) | 1;

export function writeZip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const local = new Uint8Array(30 + name.length + e.data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, DOS_TIME, true);
    lv.setUint16(12, DOS_DATE, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, e.data.length, true);
    lv.setUint32(22, e.data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(e.data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, DOS_TIME, true);
    cv.setUint16(14, DOS_DATE, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  const total = offset + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const l of locals) {
    out.set(l, p);
    p += l.length;
  }
  for (const c of centrals) {
    out.set(c, p);
    p += c.length;
  }
  out.set(eocd, p);
  return out;
}

/** Every entry of a zip, by name. Stored entries are sliced; deflated
 *  ones go through `inflate`. ZIP64 is not supported (a spreadsheet of
 *  five hundred rows is kilobytes). */
export async function readZip(bytes: Uint8Array, inflate: Inflate): Promise<Map<string, Uint8Array>> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file (no end-of-directory record)");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Corrupt zip directory");
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const lNameLen = dv.getUint16(local + 26, true);
    const lExtraLen = dv.getUint16(local + 28, true);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = bytes.subarray(start, start + csize);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, await inflate(raw));
    else throw new Error(`Unsupported zip compression (${method}) in ${name}`);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** The browser's native inflate (raw deflate, as zip stores it). */
export const browserInflate: Inflate = async (data) => {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

// ---- the reader ---------------------------------------------------------------

export interface ReadSheet {
  name: string;
  /** Row-major, "" for empty cells, numbers as their decimal text,
   *  booleans as "TRUE" / "FALSE". Ragged rows are padded to the
   *  widest. */
  rows: string[][];
}

const textsIn = (xml: string): string => {
  let out = "";
  const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out += xmlUnescape(m[1] ?? "");
  return out;
};

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(textsIn(m[1]));
  return out;
}

export function parseSheetXml(xml: string, shared: string[]): string[][] {
  const cells = new Map<string, string>();
  let maxR = 0;
  let maxC = 0;
  const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2] ?? "";
    const ref = /\br="([A-Z]+)(\d+)"/.exec(attrs);
    if (!ref) continue;
    const c = colIndex(ref[1]);
    const r = parseInt(ref[2], 10) - 1;
    const t = (/\bt="(\w+)"/.exec(attrs) ?? [])[1] ?? "";
    let value = "";
    if (t === "inlineStr") value = textsIn(inner);
    else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
      const raw = v ? xmlUnescape(v[1]) : "";
      if (t === "s") value = shared[parseInt(raw, 10)] ?? "";
      else if (t === "b") value = raw === "1" ? "TRUE" : "FALSE";
      else if (t === "e") value = "";
      else value = raw; // n (or absent) and str
    }
    cells.set(`${r}:${c}`, value);
    if (r + 1 > maxR) maxR = r + 1;
    if (c + 1 > maxC) maxC = c + 1;
  }
  const rows: string[][] = [];
  for (let r = 0; r < maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c < maxC; c++) row.push(cells.get(`${r}:${c}`) ?? "");
    rows.push(row);
  }
  return rows;
}

/** Every sheet of a workbook, in workbook order. */
export async function readXlsx(bytes: Uint8Array, inflate: Inflate): Promise<ReadSheet[]> {
  const parts = await readZip(bytes, inflate);
  const dec = new TextDecoder();
  const text = (path: string): string => {
    const p = parts.get(path) ?? parts.get(path.replace(/^\//, ""));
    return p ? dec.decode(p) : "";
  };
  const wb = text("xl/workbook.xml");
  if (wb === "") throw new Error("Not an Excel workbook (xl/workbook.xml is missing)");
  const rels = new Map<string, string>();
  const relRe = /<Relationship\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  const relsXml = text("xl/_rels/workbook.xml.rels");
  while ((m = relRe.exec(relsXml)) !== null) {
    const id = (/\bId="([^"]*)"/.exec(m[1]) ?? [])[1] ?? "";
    const target = xmlUnescape((/\bTarget="([^"]*)"/.exec(m[1]) ?? [])[1] ?? "");
    if (id !== "" && target !== "") rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }
  const shared = sharedStrings(text("xl/sharedStrings.xml"));
  const out: ReadSheet[] = [];
  const sheetRe = /<sheet\b([^>]*)\/?>/g;
  while ((m = sheetRe.exec(wb)) !== null) {
    const name = xmlUnescape((/\bname="([^"]*)"/.exec(m[1]) ?? [])[1] ?? "");
    const rid = (/\br:id="([^"]*)"/.exec(m[1]) ?? [])[1] ?? "";
    const path = rels.get(rid) ?? "";
    if (path === "") continue;
    out.push({ name, rows: parseSheetXml(text(path), shared) });
  }
  return out;
}

/** Excel's day serial → yyyy-mm-dd (the 1900 date system; day 1 is
 *  1900-01-01, serial 60 the phantom 29 Feb). */
export function excelSerialToIso(serial: number): string {
  if (!Number.isFinite(serial) || serial < 1) return "";
  const days = Math.floor(serial);
  // before the phantom 29 Feb 1900 (serial 60) the count runs from
  // 1899-12-31; from it on, from 1899-12-30
  const ms = (days < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30)) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}
