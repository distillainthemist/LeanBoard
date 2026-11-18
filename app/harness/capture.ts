// The capture card with a PERSON column (2026-11-18): "Celebrate
// success" — what happened, who (several), and who noticed (one).
// `?nopeople=1` mounts it with no people list: names are typed.
import "../src/style.css";
import { CaptureEditor } from "../../controls/CaptureCard/editor";
import { parseCapture, parseColumns, serializeCapture } from "../../controls/CaptureCard/types";

const q = new URLSearchParams(location.search);
const out = document.getElementById("out")!;
const editor = new CaptureEditor(document.getElementById("c")!, {
  onChange: (env) => {
    out.textContent = serializeCapture(env);
  },
  onSnapshot: () => undefined,
});
(window as unknown as { editor: CaptureEditor }).editor = editor;
editor.setChrome("Celebrate success", "");
if (!q.has("nopeople")) {
  editor.setPeople([
    { whoId: "u1", who: "Ben O'Brien", initials: "BO" },
    { whoId: "u2", who: "Jane Smith", initials: "JS" },
    { whoId: "u3", who: "Clegg, Tammy", initials: "TC" },
    { whoId: "u4", who: "Bird, Dylan", initials: "DB" },
  ]);
}
editor.setConfig(
  parseColumns(
    JSON.stringify([
      { key: "what", label: "What happened" },
      { key: "who", label: "Who", type: "person", multi: true },
      { key: "seen", label: "Noticed by", type: "person" },
    ])
  ),
  [],
  true
);
editor.setEnvelope(
  parseCapture(
    JSON.stringify({
      schema: "ltk/capture@1",
      data: { rows: [{ id: "r1", rowKey: "", cells: { what: "Caught a guarding fault before start-up", who: ["u2|Jane Smith", "u3|Clegg, Tammy"], seen: ["u1|Ben O'Brien"] } }] },
    })
  ).envelope
);
