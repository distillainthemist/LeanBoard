// The priority popup's Actions tab (issues 5 and 11): the action card
// over three initiatives' actions — headings per initiative in the list,
// tags on kanban cards, the assignee filter, the app's Gantt in org
// scope. Writes fail here (no store): the screen keeps what was typed.
import "../src/style.css";
import { newAction, LtkAction } from "../../shared/schema/actions";
import { setActionViewerProvider } from "../../shared/ui/actionLinkProvider";
import { mountPriorityActions } from "../src/priorities/actionsTab";
import type { Initiative } from "../src/improvement/initiativeModel";

setActionViewerProvider(() => ({ whoId: "u1", who: "Vallance, Sue" }));
const day = (n: number) => new Date(Date.UTC(2026, 10, 16) + n * 86400000).toISOString().slice(0, 10);
const people = [
  { whoId: "u1", who: "Vallance, Sue" },
  { whoId: "u2", who: "Smith, Jessica" },
  { whoId: "u3", who: "Forsyth, Hayden" },
];
const init = (id: string, title: string, boardId: string): Initiative =>
  ({ id, title, boardId, status: "active", roles: { owner: [people[1]], lead: [people[2]] }, priorities: [], stageTargets: {}, confidential: false, snapshot: { stages: [] }, stageIndex: 0 }) as unknown as Initiative;
const initiatives = [init("in-1", "Embedded and Consistent Contractor Performance Rituals", "init-in1"), init("in-2", "Safety improvement plan for Ecotone", "init-in2"), init("in-3", "Prioritise Safety in the Field", "")];
const make = (n: number, home: string, who: number, status: LtkAction["status"], text: string): LtkAction => {
  const a = newAction({ source: "actionboard", sourceId: "" });
  a.id = `a${n}`;
  a.description = text;
  a.instanceId = home;
  a.status = status;
  a.pdca = status === "done" ? "closed" : status === "in-progress" ? "do" : "plan";
  a.start = day(-30 + n * 4);
  a.due = day(-6 + n * 9);
  a.assignees = [{ ...people[who], done: status === "done" }];
  if (n === 2) a.supporters = [people[0]];
  return a;
};
const actions = [
  make(0, "init-in1:board", 1, "open", "SIAP allocations and tracked through Cascaded Priorities per dept"),
  make(1, "init-in1:card-3", 1, "in-progress", "Assign dedicated resource to area and dept specific contracts"),
  make(2, "init-in1:board", 2, "open", "Run Senior Leadership Town Hall with Contracting Partners"),
  make(3, "init-in1:board", 1, "done", "Designated Leader Training Lifecycle"),
  make(4, "init-in2:board", 2, "open", "Improvement Strategy for Remondis"),
  make(5, "init-in2:board", 0, "open", "Monthly contractor forum minutes into the Contractor Management file"),
];
actions.push({ ...make(6, "improvement:in-3", 2, "open", "Field leadership walk schedule"), initiativeId: "in-3" });
(window as unknown as { actions: LtkAction[] }).actions = actions;
const log: string[] = [];
(window as unknown as { log: string[] }).log = log;
mountPriorityActions({
  host: document.getElementById("b")!,
  initiatives,
  actions,
  roster: people.map((p) => ({ ...p, email: "", site: "Weipa", department: "", area: "", role: "user", active: true })),
  palette: { issue: "#c0392b", atrisk: "#d9a441", good: "#1f7a3f" },
  ragFor: (i) => (i.id === "in-1" ? "amber" : "grey"),
  actor: { whoId: "u1", who: "Vallance, Sue" },
  onOpenBoard: (b) => log.push(`open ${b}`),
  onWritten: () => log.push("written"),
});
