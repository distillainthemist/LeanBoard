// The one type-ahead builder (shared/ui/typeAhead.ts, backlog programme
// tranche 5, 2026-11-27) on stub data: a box bound to a known group, a
// box with a directory behind it, a directory-only box with marks, and
// the same inside a dialog (Escape closes the list, not the dialog).
import "../src/style.css";
import { el } from "../../shared/ui/dom";
import { openDialog } from "../../shared/ui/dialog";
import { buildTypeAhead } from "../../shared/ui/typeAhead";
import { docPeopleBox } from "../src/docs/peopleField";
import type { PeopleSource } from "../src/docs/accessGates";

const names = ["Ann Ray", "Ben O'Brien", "Jane Smith", "Sam Lee", "Kim Lowe", "Anna Petrov", "Brett Cole", "Chandra Rao", "Dan Wu", "Ana Lima", "Sue Park", "Tom Hale", "Uma Shah", "Vic Tan", "Wes Orr", "Xia Lin", "Yan Koh", "Zed Moss", "Abe Fox", "Bea Dunn"];
const group = names.map((displayName) => ({ displayName, mail: `${displayName.toLowerCase().replace(/[^a-z]+/g, ".")}@x.test` }));
const log: string[] = [];
(window as unknown as { log: string[] }).log = log;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const directory = async (q: string) => {
  log.push(`directory ${q}`);
  await wait(500);
  if (q.toLowerCase().startsWith("fail")) throw new Error("no connection");
  return [
    { displayName: "Ann Ray", mail: "ann.ray@x.test" },
    { displayName: `Pat ${q} (Contractor)`, mail: "pat@x.test" },
    { displayName: `Lee ${q}`, mail: "lee@x.test" },
  ];
};
const pool: PeopleSource = { restricted: true, hint: "", held: group, directory: null };
const reviewers: PeopleSource = { restricted: false, hint: "", held: group.slice(0, 6), directory };

const host = document.getElementById("host")!;
const block = (title: string, body: HTMLElement) => {
  const b = el("div");
  b.append(el("div", "app-field-label", title), body);
  host.appendChild(b);
};
const chipsFor = (picked: { mail: string; displayName: string }[]) => {
  const chips = el("div", "app-docs-pplchips");
  const paint = () => {
    chips.textContent = "";
    for (const p of picked) chips.appendChild(el("span", "app-docs-pplchip", p.displayName));
  };
  return { chips, paint };
};

// 1. bound to the group: clicking in lists it
{
  const picked: { mail: string; displayName: string }[] = [];
  const { chips, paint } = chipsFor(picked);
  const box = docPeopleBox({
    placeholder: "Search the owners & approvers group…",
    source: Promise.resolve(pool),
    listOnFocus: true,
    taken: () => picked.map((p) => p.mail.toLowerCase()),
    onPick: (p) => {
      picked.length = 0;
      picked.push(p);
      log.push(`owner ${p.displayName}`);
      paint();
    },
  });
  const wrap = el("div", "app-docs-ppl");
  wrap.append(chips, box.el);
  block("Owner (the group, listed on a click)", wrap);
}
// 2. held people at once, the directory behind them
{
  const picked: { mail: string; displayName: string }[] = [];
  const { chips, paint } = chipsFor(picked);
  const box = docPeopleBox({
    placeholder: "Search people to add…",
    source: Promise.resolve(reviewers),
    taken: () => picked.map((p) => p.mail.toLowerCase()),
    onPick: (p) => {
      picked.push(p);
      log.push(`reviewer ${p.displayName}`);
      paint();
    },
  });
  const wrap = el("div", "app-docs-ppl");
  wrap.append(chips, box.el);
  block("Reviewers (held at once, then the directory)", wrap);
}
// 3. directory only, with a mark and a row that cannot be picked
{
  const box = buildTypeAhead({
    placeholder: "Search the directory to add someone…",
    inputClass: "app-input",
    noneWords: "No one in the directory matches.",
    remote: {
      search: async (q) =>
        (await directory(q)).map((h, i) => ({
          label: h.displayName,
          sub: h.mail,
          tag: i === 0 ? "a member" : i === 1 ? "new to the app" : "",
          disabled: i === 0,
          run: async () => {
            await wait(400);
            if (i === 2) throw new Error("Could not add: not an owner of the group");
            log.push(`added ${h.displayName}`);
          },
        })),
    },
  });
  block("Group members (directory only)", box.el);
}

const bar = document.getElementById("cases")!;
const b = el("button", "app-btn", "In a dialog") as HTMLButtonElement;
b.addEventListener("click", () => {
  const dlgHost = el("div", "app-dlghost");
  document.body.appendChild(dlgHost);
  const dlg = openDialog({
    host: dlgHost,
    title: "Add reviewers",
    maxWidth: 480,
    onClose: () => dlgHost.remove(),
    buttons: [
      { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
      { label: "Save", kind: "primary", onClick: () => log.push("SAVE pressed") },
    ],
  });
  const picked: { mail: string; displayName: string }[] = [];
  const { chips, paint } = chipsFor(picked);
  const box = docPeopleBox({
    placeholder: "Add reviewers…",
    source: Promise.resolve(reviewers),
    taken: () => picked.map((p) => p.mail.toLowerCase()),
    onPick: (p) => {
      picked.push(p);
      paint();
    },
  });
  dlg.body.append(chips, box.el);
});
bar.appendChild(b);
