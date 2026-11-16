// The actions card: a kanban column with more actions than fit, adding to
// a column, the List | Kanban | Gantt switch, and the app's own Gantt in
// the Gantt view (flat "board" scope — the store is never reached unless a
// date is dragged). Due-date moves: `?policy=all` asks every action why
// it moves later (the default asks the one initiative action, number 1);
// action 2 arrives with two moves on its history; `?edit=1` lets the
// Gantt's bars be dragged as far as its own prompt. `?links=1` gives the
// dialog its "Linked to" field (a ritual and an initiative to find);
// `?dir=1` gives "Search everyone…" a directory to look in (an admin's
// view): names containing what was typed, after a short wait.
import "../src/style.css";
import { ActionBoardEditor } from "../../controls/ActionBoard/editor";
import { newAction, LtkAction } from "../../shared/schema/actions";
import { setActionDirectoryProvider, setActionLinkProvider, setActionViewerProvider, setRescheduleProvider } from "../../shared/ui/actionLinkProvider";
import { mountGantt } from "../src/improvement/gantt";

setActionViewerProvider(() => ({ whoId: "u1", who: "Ben O'Brien" }));
const query = new URLSearchParams(window.location.search);
setRescheduleProvider(() => Promise.resolve({ policy: query.get("policy") === "all" ? "all" : "initiatives", reasons: ["Waiting on parts", "Supplier late", "Scope changed"] }));
if (query.get("links") === "1") {
  const target = (kind: "ritual" | "initiative", id: string, boardId: string, title: string, detail: string) => ({ kind, id, boardId, title, detail, keywords: "", mine: true, near: true, cards: {} });
  setActionLinkProvider(() =>
    Promise.resolve({
      targets: [target("ritual", "B1", "B1", "Daily production meeting", "Weipa · Mining"), target("initiative", "in-1", "init-in1", "Contractor Safety Improvement Strategy", "Weipa · Vallance, Colin")],
      personalWho: "u1",
      openBoardId: null,
      openHome: "",
    })
  );
}
if (query.get("dir") === "1") {
  const directory = ["Amelia Hart", "Amir Haddad", "Benedict Shaw", "Hannah Amos", "Priya Raman"];
  setActionDirectoryProvider(() =>
    Promise.resolve({
      search: (q: string) =>
        new Promise((resolve) => setTimeout(() => resolve(directory.filter((n) => n.toLowerCase().includes(q.toLowerCase())).map((n) => ({ objectId: `dir-${n}`, displayName: n, mail: `${n.toLowerCase().replace(" ", ".")}@example.com` }))), 400)),
      add: (hit) => new Promise((resolve) => setTimeout(() => resolve({ whoId: hit.objectId, who: hit.displayName }), 300)),
    })
  );
}
const day = (n: number) => new Date(Date.UTC(2026, 8, 30) + n * 86400000).toISOString().slice(0, 10);
const make = (n: number, status: LtkAction["status"]): LtkAction => {
  const a = newAction({ source: "actionboard", sourceId: "" });
  a.id = `a${n}`;
  a.issue = ["Safety", "Quality", "Delivery"][n % 3];
  a.description = `Action number ${n + 1} with enough words to wrap onto a second line in a column`;
  a.status = status;
  a.pdca = status === "done" ? "closed" : status === "in-progress" ? "do" : "plan";
  a.start = day(-6 + n);
  a.due = day(-2 + n * 2);
  a.assignees = [{ whoId: n % 2 ? "u2" : "u1", who: n % 2 ? "Jane Smith" : "Ben O'Brien", done: status === "done" }];
  a.instanceId = "B1:board";
  if (n === 0) a.initiativeId = "init-1";
  if (n === 1) {
    a.history = [
      { kind: "rescheduled", whoId: "u2", who: "Jane Smith", when: "2026-09-20T02:00:00.000Z", from: day(-9), to: day(-4), reason: "Waiting on parts" },
      { kind: "rescheduled", whoId: "u1", who: "Ben O'Brien", when: "2026-09-27T02:00:00.000Z", from: day(-4), to: a.due, reason: "Other — crane booked out until the shutdown" },
    ];
  }
  return a;
};
const many = [...Array.from({ length: 11 }, (_, n) => make(n, "open")), ...Array.from({ length: 2 }, (_, n) => make(20 + n, "in-progress")), make(30, "done")];
const log: string[] = [];
(window as unknown as { log: string[] }).log = log;
const ed = new ActionBoardEditor(document.getElementById("b")!, { onChange: (acts) => log.push(`change ${acts.length} last=${acts[acts.length - 1].status}/${acts[acts.length - 1].issue}`) });
(window as unknown as { ed: ActionBoardEditor }).ed = ed;
ed.setActor({ whoId: "u1", who: "Ben O'Brien" });
ed.setPeople([{ whoId: "u1", who: "Ben O'Brien", initials: "BO" }, { whoId: "u2", who: "Jane Smith", initials: "JS" }]);
ed.setOptions({ view: "kanban", groupBy: "status", verifyColumn: true });
ed.setUserView(null, (v) => log.push(`view ${v}`));
ed.setGanttRenderer((host, g) =>
  mountGantt({ host, scopes: [{ key: "board", label: "" }], initiatives: [], actions: g.actions, palette: { issue: "#c0392b", atrisk: "#d9a441", good: "#1f7a3f" }, canEdit: query.get("edit") === "1", actor: g.actor, onChanged: g.onChanged, centerIso: "2026-09-30", hideViewSwitch: true, showCompleted: g.showCompleted, onEdit: g.onEdit, groups: g.groups, toolbarHost: g.toolbar, window: g.window, onWindow: g.onWindow })
);
ed.setActions(many);
const bar = document.getElementById("bar")!;
const cases: [string, () => void][] = [
  ["By status", () => ed.setOptions({ view: "kanban", groupBy: "status", verifyColumn: true })],
  ["By issue", () => ed.setOptions({ view: "kanban", groupBy: "issue", columns: ["Safety", "Quality", "Delivery"] })],
  ["Card's own Gantt", () => ed.setGanttRenderer(null)],
];
for (const [label, fn] of cases) {
  const b = document.createElement("button");
  b.className = "app-btn";
  b.textContent = label;
  b.id = "case-" + label.toLowerCase().replace(/[^a-z]+/g, "-");
  b.addEventListener("click", fn);
  bar.appendChild(b);
}
