// The document controller's tools on a FAKE SharePoint (2026-11-27,
// R4): Change properties (bulk), Rename and the effective-date
// correction. The dialogs and their rules are the real ones; the few
// SharePoint calls they make are answered here (`__harnessExecute`,
// see dataverseStub.ts) and every write is listed under the buttons.
// "Fails.docx" refuses its check-in, to show a failed row and the
// check-out being given back.
import "../src/style.css";
import { ensureStylesheet } from "../../shared/ui/dom";
import { LTK_BASE_CSS } from "../../shared/ui/baseCss";
import { detectHost } from "../src/runtime";
import { openBulkChange } from "../src/docs/bulkChange";
import { openCorrectDate, openRename } from "../src/docs/controllerCmds";
import type { DocLibrary } from "../src/docs/docsStore";
import type { SiteColumn } from "../src/docs/model";
import type { DocRow } from "../src/docs/rows";

ensureStylesheet("ltk-base-css", LTK_BASE_CSS);
const SITE = "https://example.sharepoint.com/sites/dms";
const AREA_SET = "aaaaaaaa-1111-4111-8111-111111111111";
const IMP_SET = "bbbbbbbb-2222-4222-8222-222222222222";
const term = (id: string, name: string) => ({ id, labels: [{ name, isDefault: true }] });
const AREAS = [term("a1", "Metal Delivery General"), term("a2", "Casthouse General"), term("a3", "Crane Ops"), term("a4", "Inspection")];
const IMPS = [term("high", "High"), term("low", "Low")];
const log = document.getElementById("log")!;
const say = (line: string) => (log.textContent = `${log.textContent}${line}\n`);

(window as unknown as { __harnessExecute: (r: unknown) => unknown }).__harnessExecute = (req) => {
  const op = (req as { connectorOperation: { operationName: string; parameters: Record<string, unknown> } }).connectorOperation;
  if (op.operationName !== "HttpRequest") {
    say(`${op.operationName} ${JSON.stringify(op.parameters).slice(0, 220)}`);
    return { success: true, data: {} };
  }
  const p = op.parameters.parameters as { method: string; uri: string; body?: string };
  const uri = decodeURIComponent(p.uri);
  if (p.method !== "GET") say(`${p.method} ${uri.slice(0, 200)}${p.body ? `  ${String(p.body).slice(0, 260)}` : ""}`);
  if (/\/fields\?/.test(uri)) {
    return {
      success: true,
      data: {
        value: [
          { InternalName: "Area", Title: "Process area", TypeAsString: "TaxonomyFieldTypeMulti", TermSetId: AREA_SET, Required: true },
          { InternalName: "Importance", Title: "Importance", TypeAsString: "TaxonomyFieldType", TermSetId: IMP_SET },
          { InternalName: "DocClass", Title: "Document class", TypeAsString: "Choice", Choices: ["Procedure", "Work instruction", "Form"] },
          { InternalName: "Notes", Title: "Controller notes", TypeAsString: "Text" },
          { InternalName: "DMSEffectiveDate", Title: "Effective date", TypeAsString: "DateTime" },
        ],
      },
    };
  }
  if (/contenttypes/.test(uri)) return { success: true, data: { value: [] } };
  if (/termStore\/sets\/[^/]+\/children/.test(uri)) return { success: true, data: { value: uri.includes(AREA_SET) ? AREAS : IMPS } };
  if (/termStore/.test(uri)) return { success: true, data: { value: [] } };
  if (/EnableModeration/.test(uri)) return { success: true, data: { EnableModeration: true } };
  if (/RegionalSettings/.test(uri)) return { success: true, data: { LocaleId: 5129 } };
  if (/\/items\(\d+\)$/.test(uri)) return { success: true, data: { Title: "Crane SOP", DMSPriorNames: "Hoist procedure.docx" } };
  if (/CheckIn\(/.test(uri) && /Fails\.docx/.test(uri)) return { success: false, error: { message: "The file is locked for shared use by kat@example.test" } };
  if (/ValidateUpdateListItem/.test(uri)) return { success: true, data: { value: [] } };
  return { success: true, data: {} };
};

const lib = {
  rowId: "r1",
  listId: "11111111-0000-4000-8000-000000000001",
  siteUrl: SITE,
  name: "Standards",
  libType: "standard",
  config: { title: "Controlled standards", columns: ["Area", "Importance", "DocClass", "Notes", "DMSEffectiveDate", "DMSReview"].map((internal) => ({ internal, available: true })) },
} as unknown as DocLibrary;
const col = (internal: string, label: string, role = "", termSetId = ""): [string, SiteColumn] => [internal, { internal, label, role, available: true, termSetId, isDate: false } as unknown as SiteColumn];
const dictBy = new Map<string, SiteColumn>([
  col("Area", "Process area", "processArea", AREA_SET),
  col("Importance", "Importance", "importance", IMP_SET),
  col("DocClass", "Document class"),
  col("Notes", "Controller notes"),
  col("DMSEffectiveDate", "Effective date", "effectiveDate"),
]);
let n = 0;
const row = (name: string, stage: string, over: Partial<DocRow> = {}, values: Record<string, string> = {}): DocRow => ({
  id: ++n,
  uniqueId: `0000000${n}-0000-4000-8000-00000000000${n}`,
  name,
  ext: "docx",
  serverUrl: `/sites/dms/Standards/${name}`,
  listId: lib.listId,
  modified: "2026-11-01T00:00:00Z",
  values: { Status: stage, Area: "Metal Delivery General; Crane Ops", "Area#termid": "a1;a3", Importance: "Low", "Importance#termid": "low", "DMSEffectiveDate.": "2025-03-31T00:00:00Z", "DMSReview.": "2028-03-31T00:00:00Z", ...values },
  ...over,
});
const rows: DocRow[] = [
  row("Crane SOP.docx", "approved"),
  row("Hoist inspection.docx", "approved", {}, { Area: "Metal Delivery General", "Area#termid": "a1" }),
  row("Casthouse entry.docx", "approved", {}, { Area: "Casthouse General", "Area#termid": "a2", Importance: "High", "Importance#termid": "high" }),
  row("New work instruction.docx", "draft"),
  row("Fails.docx", "approved"),
  row("In review.docx", "inReview"),
  row("Held by Kat.docx", "approved", { checkoutName: "Kat Reporter", checkoutEmail: "kat@example.test" }),
  row("Another site's.docx", "approved"),
  row("Old tag by name only.docx", "approved", {}, { Area: "General", "Area#termid": "" }),
];

void (async () => {
  await detectHost();
  const host = document.getElementById("host")!;
  const state = document.getElementById("state")!;
  document.getElementById("bulk")!.addEventListener("click", () =>
    openBulkChange({
      host,
      site: SITE,
      actor: "O'Brien, Ben",
      libs: [lib],
      dictBy,
      gather: async (_fields, _cap, onCount) => {
        onCount(rows.length);
        return { rows: rows.map((r) => ({ row: r, lib })), capped: false, error: "" };
      },
      stageOf: (r) => (r.values.Status ?? "") as never,
      isMine: () => false,
      siteOf: (r) => (r.name.startsWith("Another") ? "other" : "mine"),
      importanceInternal: "Importance",
      cadence: { high: 12, low: 36 },
      datesOf: () => ({ effective: "DMSEffectiveDate", review: "DMSReview", cadence: "DMSCadence", org: "", status: "Status" }),
      // "Notes" is in the dictionary and the library but hidden in the
      // column manager: it must not be offered
      offeredFor: () => new Set(["Area", "Importance", "DocClass", "DMSEffectiveDate"]),
      onDone: () => (state.textContent = "The register would re-read now."),
    })
  );
  document.getElementById("rename")!.addEventListener("click", () =>
    openRename({
      host,
      site: SITE,
      row: rows[0],
      actor: "O'Brien, Ben",
      readerFacing: true,
      priorNames: { internal: "DMSPriorNames", singleLine: false },
      onDone: (name) => (state.textContent = `Renamed to ${name}.`),
    })
  );
  document.getElementById("date")!.addEventListener("click", () =>
    openCorrectDate({
      host,
      site: SITE,
      row: rows[0],
      actor: "O'Brien, Ben",
      label: "Effective date",
      effectiveInternal: "DMSEffectiveDate",
      reviewInternal: "DMSReview",
      presentYmd: "2025-03-31",
      months: 36,
      onDone: () => (state.textContent = "Corrected."),
    })
  );
})();
