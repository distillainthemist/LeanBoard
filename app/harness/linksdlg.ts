// "Link a document" (2026-11-23, report 9): the relationship first, then
// the type-ahead search — on canned answers, since the harness cannot
// reach SharePoint. Type "slow" for a late answer, "none" for no match,
// "down" for a library that could not be read.
import "../src/style.css";
import { buildLinksEditor } from "../src/docs/linksEditor";
import type { DocLibrary } from "../src/docs/docsStore";

const lib = (listId: string, name: string): DocLibrary => ({ rowId: listId, listId, siteUrl: "", name, libType: "standard", config: { title: "", columns: [], statusColors: {}, renditionPath: "" } });
const libraries = [lib("l1", "Standards"), lib("l2", "Site procedures · UAT")];
const docs = [
  ["Isolation and lock-out procedure.docx", "STD-0012"],
  ["Isolation permit register.xlsx", "STD-0044"],
  ["Hot work permit.docx", "STD-0101"],
  ["Confined space entry — a deliberately long document name that has to wrap inside the list.docx", "STD-0200"],
  ["Working at heights.docx", ""],
];
const ed = buildLinksEditor({
  site: "https://example.test/sites/docs",
  libraries,
  selfUniqueId: "self",
  docIdInternal: "DocId",
  initialRaw: JSON.stringify([{ uid: "u0", rel: "parent", site: "", listId: "l1", name: "Safety management standard.docx", docId: "STD-0001" }]),
  offerRegulatorCopy: false,
  find: async (q) => {
    await new Promise((r) => setTimeout(r, q.includes("slow") ? 2500 : 400));
    if (q.includes("down")) return [{ rows: [], failed: false }, { rows: [], failed: true }];
    const words = q.toLowerCase().replace("slow", "").trim().split(/\s+/).filter((w) => w !== "");
    const rows = docs
      .filter(([n]) => words.every((w) => n.toLowerCase().includes(w)))
      .map(([name, id], i) => ({ uniqueId: `u${i + 1}`, name, values: { DocId: id } }));
    return [
      { rows: rows.filter((_, i) => i % 2 === 0), failed: false },
      { rows: rows.filter((_, i) => i % 2 === 1), failed: false },
    ];
  },
});
const host = document.getElementById("host")!;
host.appendChild(ed.root);
const out = document.createElement("pre");
out.id = "out";
out.style.cssText = "font-size:11px;white-space:pre-wrap;margin-top:12px;color:#6d675c";
host.appendChild(out);
setInterval(() => (out.textContent = ed.read() ?? "(untouched)"), 500);
