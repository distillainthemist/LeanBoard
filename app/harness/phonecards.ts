// The four cards M2 left to narrow (SQDPC, RiskMatrix, RACI, Fishbone)
// on the REAL board grid through the REAL tile mount — at a phone's
// width the grid lists them one per row (backlog programme tranche 6,
// G1, 2026-11-27). Stub data; `?only=<type>` shows one card,
// `?focus=<type>` mounts it as the focused card (editable, full pane).
import "../src/style.css";
import { BoardGridView } from "../../controls/BoardGrid/editor";
import type { BoardTile } from "../../controls/BoardGrid/types";
import { defaultTheme } from "../../shared/tokens";
import { serializeEnvelope } from "../../shared/schema/envelope";
import { observeHostTier } from "../../shared/ui/tier";
import { cardMounter, mountTile } from "../src/cardRegistry";
import { seed } from "./seriesStub";

const today = new Date();
const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const cells: { key: string; date: string; shift: string; value: string }[] = [];
for (const letter of ["S", "Q", "D", "P", "C"]) {
  for (let d = 1; d <= Math.min(today.getDate(), 28); d++) {
    cells.push({ key: letter, date: `${ym}-${String(d).padStart(2, "0")}`, shift: "-", value: (d * (letter.charCodeAt(0) % 7)) % 9 === 0 ? "issue" : "good" });
  }
}
seed("b1", "sq", cells);

const env = (schema: string, data: unknown) => serializeEnvelope({ schema, meta: { created: "", updated: "" }, data } as never);
const docs: Record<string, { type: string; title: string; json: string }> = {
  sq: { type: "SqdpcCard", title: "SQDPC", json: "" },
  rm: {
    type: "RiskMatrix",
    title: "Risk matrix",
    json: env("ltk/riskmatrix@1", {
      risks: [
        { id: "r1", hazard: "Conveyor nip point", risk: "Entanglement during clearing", impact: "Serious injury", controls: "Guarding, isolation", likelihood: 3, consequence: 5, postLikelihood: 1, postConsequence: 5 },
        { id: "r2", hazard: "Hot metal transfer", risk: "Splash at the launder", impact: "Burns", controls: "PPE, exclusion zone", likelihood: 2, consequence: 4, postLikelihood: 1, postConsequence: 4 },
        { id: "r3", hazard: "Forklift traffic", risk: "Pedestrian struck in the warehouse", impact: "Serious injury", controls: "Walkways, spotters", likelihood: 4, consequence: 4, postLikelihood: 2, postConsequence: 4 },
        { id: "r4", hazard: "Dust", risk: "Respiratory exposure at bagging", impact: "Long-term illness", controls: "Extraction", likelihood: 3, consequence: 3, postLikelihood: 2, postConsequence: 3 },
      ],
    }),
  },
  ra: {
    type: "Raci",
    title: "RACI",
    json: env("ltk/raci@1", {
      roles: ["Sponsor", "Lead", "Team", "QA", "Maintenance"],
      tasks: [
        { id: "t1", label: "Define the scope of the conveyor survey" },
        { id: "t2", label: "Approve the budget" },
        { id: "t3", label: "Deliver the work" },
        { id: "t4", label: "Verify the readings after calibration" },
      ],
      assign: { t1: { Sponsor: "A", Lead: "R", Team: "C" }, t2: { Sponsor: "R", Lead: "C", QA: "I" }, t3: { Lead: "A", Team: "R", Maintenance: "R" }, t4: { QA: "R", Lead: "A", Team: "I" } },
    }),
  },
  fb: {
    type: "Fishbone",
    title: "Fishbone",
    json: env("ltk/fishbone@1", {
      problem: "Moisture readings drift after calibration",
      categories: ["People", "Method", "Machine", "Material", "Measurement", "Environment"],
      causes: [
        ["People", "New operators not trained on sampling"],
        ["People", "Shift handover skips the check"],
        ["Method", "Sampling point differs by crew"],
        ["Method", "No standard for sample size"],
        ["Machine", "Probe worn"],
        ["Machine", "Belt speed varies"],
        ["Material", "Ore blend changed in October"],
        ["Measurement", "Calibration weights overdue"],
        ["Measurement", "Lab and line disagree"],
        ["Environment", "Humidity in the sample room"],
      ].map(([category, text], i) => ({ id: `c${i}`, text, status: "open", votes: i % 3, isRoot: i === 4, category, parentId: null })),
    }),
  },
};

const q = new URLSearchParams(location.search);
const only = q.get("only") ?? "";
const focus = q.get("focus") ?? "";
const host = document.getElementById("board")!;
const theme = defaultTheme();
const mountOpts = (id: string, h: HTMLElement) => ({
  host: h,
  title: docs[id].title,
  boardId: "b1",
  cardId: id,
  outputJson: docs[id].json,
  theme,
  settings: {},
  instanceKey: `b1:${id}`,
  instanceWhen: "",
  actions: [],
});

if (focus !== "" && docs[focus]) {
  // the focused card: the pane's own width, its tier stamped by the host
  const pane = document.createElement("div");
  pane.style.cssText = "height:calc(100vh - 16px);background:#fff;border-radius:10px;overflow:hidden;position:relative";
  host.appendChild(pane);
  observeHostTier(pane);
  cardMounter(docs[focus].type)?.({
    ...mountOpts(focus, pane),
    people: [],
    readOnly: false,
    sources: [],
    viewer: { whoId: "u1", who: "Ben" },
    onSave: () => undefined,
    onTile: () => undefined,
    onActions: () => undefined,
  } as never);
} else {
  const ids = Object.keys(docs).filter((id) => only === "" || id === only);
  const tiles: BoardTile[] = ids.map((id, i) => ({ pos: i + 1, cardId: id, cardType: docs[id].type, title: docs[id].title, svg: "", w: 1, h: 1, barColor: "", nav: i + 1 }));
  const grid = new BoardGridView(host, { onSelect: () => undefined, onLayout: () => undefined });
  grid.setTheme(theme);
  grid.setReadOnly(true);
  grid.setLiveRenderer((h, tile) => mountTile(tile.cardType, mountOpts(tile.cardId, h)) ?? (() => undefined));
  grid.setTiles(tiles, 2);
}
