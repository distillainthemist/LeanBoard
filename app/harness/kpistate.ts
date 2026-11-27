// A STANDALONE KPI card as good / bad or a status picklist (backlog
// programme tranche 7, E15, 2026-11-27), through the real mounter with
// stub data: a picklist card, a good / bad card, and a card switched
// from numbers to a picklist (its numbers stay stored, and are not drawn).
import "../src/style.css";
import { defaultTheme } from "../../shared/tokens";
import { cardMounter } from "../src/cardRegistry";
import { seed } from "./seriesStub";
import { bucketSpan } from "../../shared/schema/buckets";

const day = (weeksAgo: number): string => {
  const d = new Date();
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - weeksAgo * 7);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
// a reading entered in the grid sits on its period's first day
const cells = (values: string[]) => values.map((value, i) => ({ key: `k${i}`, date: bucketSpan(day(values.length - 1 - i), "weekly").from, shift: "-", value }));
seed("b1", "plant", cells(["Running", "Running", "Reduced", "Down", "Reduced", "Running", "Running"]));
seed("b1", "audit", cells(["Good", "Good", "Bad", "Good", "1", "0", "Good"]));
seed("b1", "switched", cells(["61", "63", "59", "On track", "At risk", "On track"]));

const host = document.getElementById("host")!;
const theme = defaultTheme();
const mount = (cardId: string, title: string, config: Record<string, unknown>) => {
  const pane = document.createElement("div");
  pane.style.cssText = "height:380px;background:#fff;border:1px solid #e4dfd6;border-radius:10px;overflow:hidden;position:relative";
  host.appendChild(pane);
  cardMounter("KpiTrendCard")?.({
    host: pane,
    title,
    boardId: "b1",
    cardId,
    outputJson: "",
    theme,
    settings: { config },
    instanceKey: `b1:${cardId}`,
    instanceWhen: "",
    actions: [],
    people: [],
    readOnly: false,
    sources: [],
    viewer: { whoId: "u1", who: "Ben" },
    onSave: () => undefined,
    onTile: () => undefined,
    onActions: () => undefined,
  } as never);
};
mount("plant", "Plant status", {
  tracking: "picklist",
  cadence: "weekly",
  trackingOptions: [
    { label: "Running", state: "green" },
    { label: "Reduced", state: "amber" },
    { label: "Down", state: "red" },
  ],
});
mount("audit", "Housekeeping audit", { tracking: "goodbad", cadence: "weekly" });
mount("switched", "Switched from numbers", { tracking: "picklist", cadence: "weekly" });
