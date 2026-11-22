// The entry dialogs that may raise an action with the entry (5 Whys and
// the Risk matrix here; Heatmap and Fault tree share the helper): the
// required field's asterisk, the held Add button, and Who / Due asked
// for only once an action is being typed (backlog programme, tranche 1).
import { FiveWhysEditor } from "../../controls/FiveWhys/editor";
import { RiskMatrixEditor } from "../../controls/RiskMatrix/editor";

document.documentElement.style.setProperty("--ltk-accent", "#2563eb");
const people = [
  { whoId: "u1", who: "O'Brien, Ben", initials: "BO" },
  { whoId: "u2", who: "Smith, Jane", initials: "JS" },
];
const whys = new FiveWhysEditor(document.getElementById("whys")!, { onChange: () => undefined } as never);
whys.setPeople(people as never);
whys.setChrome("5 Whys", "");
const risks = new RiskMatrixEditor(document.getElementById("risks")!, { onChange: () => undefined } as never);
(risks as unknown as { setPeople: (p: unknown) => void }).setPeople(people);
(risks as unknown as { setChrome: (t: string, p: string) => void }).setChrome("Risk matrix", "");
