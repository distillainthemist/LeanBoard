// The register's paging on a TALL window (2026-11-18): 111 documents,
// a first page of 20 that does not push the end out of range, then
// pages of 50. The loader carries the screen's own guards — nothing
// before the first load, one loader at a time, nothing once done — so
// a list that stops at 20 here stops at 20 in the player.
// ?tiles=1 for the tile view.
import "../src/style.css";
import { mountDocList } from "../src/docs/listView";
import { mountDocTiles } from "../src/docs/docsTiles";
import type { DocRow } from "../src/docs/rows";

const TOTAL = 111;
const all: DocRow[] = Array.from({ length: TOTAL }, (_, i) => ({
  id: i + 1,
  uniqueId: `u${i + 1}`,
  name: `MP SPL ${9000 + i} Document ${i + 1}.docx`,
  ext: "docx",
  serverUrl: `/sites/x/Docs/d${i + 1}.docx`,
  listId: "l1",
  modified: "2026-08-18T02:00:00Z",
  values: {},
}));
const host = document.getElementById("host")!;
const status = document.getElementById("status")!;
const tiles = new URLSearchParams(location.search).get("tiles") === "1";

let generation = 0;
let inFlight = false;
let done = false;
let calls = 0;
let asks = 0;
const load = async (reset: boolean): Promise<void> => {
  if (!reset && generation === 0) return;
  if (inFlight) return;
  if (done && !reset) return;
  inFlight = true;
  generation++;
  calls++;
  list.setLoading(true);
  await new Promise((r) => setTimeout(r, 120));
  const from = reset ? 0 : list.count();
  const page = all.slice(from, from + (reset ? 20 : 50));
  list.append(page);
  done = list.count() >= TOTAL;
  status.textContent = `${list.count()} documents of ${TOTAL} · ${calls} loads · ${asks} near-end asks`;
  document.body.dataset.count = String(list.count());
  list.setLoading(false);
  inFlight = false;
};
const common = { onRow: () => undefined, onNearEnd: () => { asks++; void load(false); }, emptyText: "No documents here yet." };
const list = tiles
  ? mountDocTiles(host, { ...common, statusChip: null, statusColumn: "", typeColumn: "" })
  : mountDocList<DocRow>(host, {
      ...common,
      columns: [
        { key: "name", label: "Document", render: (r) => r.name, width: "2fr" },
        { key: "mod", label: "Modified", render: (r) => r.modified.slice(0, 10) },
      ],
    });
void load(true);
