// Attachments & links (issue 5): the list as an initiative's pane shows
// it (three rows; the viewer manages the parent), empty with adding, and
// read-only for someone who neither manages it nor added anything.
import "../src/style.css";
import { mountAttachments } from "../src/attachments/list";
const me = { whoId: "u1", who: "Ben O'Brien" };
mountAttachments({ host: document.getElementById("pane")!, parent: { kind: "initiative", id: "I1" }, actor: me, canAdd: true, managesParent: true, onCount: (n) => console.log("count", n) });
mountAttachments({ host: document.getElementById("empty")!, parent: { kind: "action", id: "a1" }, actor: me, canAdd: true, managesParent: true });
mountAttachments({ host: document.getElementById("read")!, parent: { kind: "initiative", id: "I1" }, actor: { whoId: "u9", who: "A Viewer" }, canAdd: false, managesParent: false });
