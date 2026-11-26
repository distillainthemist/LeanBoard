// The Issues desk's CSV (R3 of the 2026-11-25 round, N1): reading a
// file a spreadsheet has been at, judging each row, the steps a row
// still owes, applying them, and one card per person.
import { describe, expect, it } from "vitest";
import {
  AnswerRow,
  KnownIssue,
  dateWords,
  decodeCsv,
  exportCsv,
  fromElsewhere,
  judgeRows,
  parseCsv,
  readAnswers,
  readDate,
  resolutionLine,
  stepsFor,
  tallyLine,
} from "../issues/answersCsv";
import { ApplyIo, applyRow, cardsFor } from "../issues/answersApply";
import { OPEN_STATUSES, KNOWN_STATUSES, resolutionTypeFromCsv, statusFromCsv, statusWord } from "../issues/status";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

const issue = (id: string, over: Partial<KnownIssue> = {}): KnownIssue => ({
  id,
  title: `Issue ${id.slice(0, 1)}`,
  reporter: "Kat",
  status: "new",
  resolution: "",
  parentId: "",
  reporterMessages: [],
  internalMessages: [],
  ...over,
});
const known = (...list: KnownIssue[]) => new Map(list.map((i) => [i.id, i]));
const HEAD = "IssueID,Status,ResolutionType,ReporterMessage,ReleaseVersion,ResolvedDate,DuplicateOfID,InternalNote";
const rowsOf = (...lines: string[]): AnswerRow[] => readAnswers([HEAD, ...lines].join("\r\n")).rows;

describe("status words", () => {
  it("Done reads Resolved, the stored value unchanged", () => {
    expect(statusWord("done")).toBe("Resolved");
    expect(statusWord("partial")).toBe("Partially resolved");
    expect(statusWord("notsoftware")).toBe("Not a software issue");
    expect(statusWord("somethingold")).toBe("somethingold");
  });
  it("partially resolved is open; deferred is known to reporters but not open", () => {
    expect(OPEN_STATUSES).toContain("partial");
    expect(OPEN_STATUSES).not.toContain("deferred");
    expect(KNOWN_STATUSES).toContain("deferred");
  });
  it("reads the CSV's six words, forgiving case and spaces", () => {
    expect(statusFromCsv("Resolved")).toBe("done");
    expect(statusFromCsv("  partially   RESOLVED ")).toBe("partial");
    expect(statusFromCsv("Duplicate")).toBe("merged");
    expect(statusFromCsv("not a software issue")).toBe("notsoftware");
    expect(statusFromCsv("Fixed")).toBe("");
    expect(resolutionTypeFromCsv("training/guidance")).toBe("Training / guidance");
    expect(resolutionTypeFromCsv("bug FIX")).toBe("Bug fix");
    expect(resolutionTypeFromCsv("Hotfix")).toBe("");
  });
});

describe("reading CSV", () => {
  it("quoted commas, doubled quotes and a line break inside quotes", () => {
    const t = parseCsv('a,"b, c","say ""hi""","two\nlines"\r\nd,e,f,g\n');
    expect(t).toEqual([
      ["a", "b, c", 'say "hi"', "two\nlines"],
      ["d", "e", "f", "g"],
    ]);
  });
  it("drops blank lines and a last line with no line end", () => {
    expect(parseCsv("a,b\n\n,,\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("a file that is not UTF-8 is read as Windows-1252", () => {
    // "it’s – done" as a spreadsheet's plain CSV save writes it
    const bytes = new Uint8Array([0x69, 0x74, 0x92, 0x73, 0x20, 0x96, 0x20, 0x64, 0x6f, 0x6e, 0x65]);
    expect(decodeCsv(bytes)).toBe("it’s – done");
    const utf8 = new TextEncoder().encode("﻿it’s – done");
    expect(decodeCsv(utf8)).toBe("it’s – done");
  });
  it("columns by name in any order, unknown ones ignored, semicolons read", () => {
    const text = `Title;status;IssueID;Extra;ReporterMessage\r\nSomething;resolved;{${A.toUpperCase()}};x;"Thanks; it is fixed"`;
    const { error, rows } = readAnswers(text);
    expect(error).toBe("");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(A);
    expect(rows[0].status).toBe("done");
    expect(rows[0].message).toBe("Thanks; it is fixed");
  });
  it("a line break typed inside a message becomes a space", () => {
    const rows = rowsOf(`${A},Resolved,Bug fix,"Thanks.\nIt is fixed.",1.0.0,2026-12-03,,`);
    expect(rows[0].message).toBe("Thanks. It is fixed.");
  });
  it("refuses a file without the three columns it needs", () => {
    expect(readAnswers("IssueID,Title\r\nx,y").error).toMatch(/no Status, ReporterMessage column/);
    expect(readAnswers("").error).toBe("The file is empty.");
    expect(readAnswers(HEAD).error).toMatch(/no rows/);
  });
  it("the export is read back as rows with no answer", () => {
    const text = exportCsv([{ id: A, title: 'A "quoted", title', kind: "Bug", area: "Documents", reporter: "Kat", raised: "2026-11-25T03:00:00Z", status: "done" }]);
    expect(text.split("\r\n")[1]).toBe(`${A},"A ""quoted"", title",Bug,Documents,Kat,2026-11-25,Resolved,,,,,,,`);
    const { error, rows } = readAnswers(text);
    expect(error).toBe("");
    expect(judgeRows(rows, known(issue(A)))[0].state).toBe("none");
  });
});

describe("dates", () => {
  it("ISO and day-first slash dates, shown in words", () => {
    expect(readDate("2026-12-03")).toBe("2026-12-03");
    expect(readDate("3/12/2026")).toBe("2026-12-03");
    expect(readDate("03.12.26")).toBe("2026-12-03");
    expect(readDate("")).toBe("");
    expect(readDate("31/02/2026")).toBeNull();
    expect(readDate("12/31/2026")).toBeNull();
    expect(readDate("soon")).toBeNull();
    expect(dateWords("2026-12-03")).toBe("3 Dec 2026");
  });
});

describe("the resolution line", () => {
  const r = (status: string, type: string, release: string, date: string | null) => resolutionLine({ status, type, release, date });
  it("resolved rows say what shipped, blank parts left out", () => {
    expect(r("done", "Bug fix", "1.0.0", "2026-12-03")).toBe("Bug fix, released in 1.0.0 on 3 Dec 2026");
    expect(r("partial", "Enhancement", "1.0.0", "")).toBe("Enhancement, released in 1.0.0");
    expect(r("done", "", "", "2026-12-03")).toBe("Released on 3 Dec 2026");
    expect(r("done", "Bug fix", "", "")).toBe("Bug fix");
  });
  it("any other status carries the type alone, and nothing for No change", () => {
    expect(r("notsoftware", "Training / guidance", "1.0.0", "2026-12-03")).toBe("Training / guidance");
    expect(r("declined", "No change", "", "")).toBe("");
    expect(r("deferred", "", "", "")).toBe("");
  });
});

describe("judging rows", () => {
  it("a ready row owes status, line, message and note, in that order", () => {
    const [j] = judgeRows(rowsOf(`${A},Resolved,Bug fix,Thanks. It is fixed.,1.0.0,3/12/2026,,Root cause in the filter`), known(issue(A)));
    expect(j.state).toBe("ready");
    expect(j.steps.map((s) => s.kind)).toEqual(["status", "resolution", "message", "note"]);
  });
  it("names each fault", () => {
    const rows = rowsOf(
      `${A},Fixed,Bug fix,Thanks,,,,`,
      `${B},Resolved,Hotfix,Thanks,,,,`,
      `${C},Resolved,,,,,,`,
      `${D},Resolved,,Thanks,,31/02/2026,,`,
      `99999999-9999-4999-8999-999999999999,Resolved,,Thanks,,,,`,
      `,Resolved,,Thanks,,,,`
    );
    const j = judgeRows(rows, known(issue(A), issue(B), issue(C), issue(D)));
    expect(j.map((x) => x.state)).toEqual(["fault", "fault", "fault", "fault", "fault", "fault"]);
    expect(j[0].faults[0]).toMatch(/“Fixed” is not a status/);
    expect(j[1].faults[0]).toMatch(/“Hotfix” is not a resolution type/);
    expect(j[2].faults).toEqual(["ReporterMessage is missing."]);
    expect(j[2].fixable).toBe(true);
    expect(j[3].faults[0]).toMatch(/is not a date/);
    expect(j[3].fixable).toBe(false);
    expect(j[4].faults[0]).toMatch(/not an issue in this environment/);
    expect(j[5].faults[0]).toBe("No IssueID.");
  });
  it("a message over 400 is a fault the preview can put right", () => {
    const rows = rowsOf(`${A},Deferred,,${"x".repeat(401)},,,,`);
    const [j] = judgeRows(rows, known(issue(A)));
    expect(j.state).toBe("fault");
    expect(j.fixable).toBe(true);
    rows[0].message = "Thanks, logged.";
    expect(judgeRows(rows, known(issue(A)))[0].state).toBe("ready");
  });
  it("the same id twice faults both rows", () => {
    const j = judgeRows(rowsOf(`${A},Resolved,,Thanks,,,,`, `${A},Deferred,,Later,,,,`), known(issue(A)));
    expect(j.every((x) => x.state === "fault" && x.faults.some((f) => /more than once/.test(f)))).toBe(true);
  });
  it("a duplicate needs a parent that is here, is not itself, and is not a duplicate", () => {
    const k = known(issue(A), issue(B), issue(C, { status: "merged", parentId: B }), issue(D));
    const f = (line: string, also: string[] = []) => judgeRows(rowsOf(line, ...also), k)[0];
    expect(f(`${A},Duplicate,,Thanks,,,,`).faults[0]).toMatch(/needs DuplicateOfID/);
    expect(f(`${A},Duplicate,,Thanks,,,${A},`).faults[0]).toMatch(/duplicate of itself/);
    expect(f(`${A},Duplicate,,Thanks,,,99999999-9999-4999-8999-999999999999,`).faults[0]).toMatch(/DuplicateOfID is not an issue/);
    expect(f(`${A},Duplicate,,Thanks,,,${C},`).faults[0]).toMatch(/itself a duplicate/);
    // the parent is made a duplicate by this same file
    expect(f(`${A},Duplicate,,Thanks,,,${D},`, [`${D},Duplicate,,Thanks,,,${B},`]).faults[0]).toMatch(/itself a duplicate/);
    // a parent resolved in the same file is the usual case, and fine
    const ok = f(`${A},Duplicate,Bug fix,Thanks,,,${B},`, [`${B},Resolved,Bug fix,Fixed,1.0.0,2026-12-03,,`]);
    expect(ok.state).toBe("ready");
    expect(ok.steps[0]).toEqual({ kind: "merge", parentId: B });
  });
  it("an issue already merged is only answered as a duplicate of the same parent", () => {
    const k = known(issue(A, { status: "merged", parentId: B }), issue(B, { title: "The parent" }), issue(C));
    expect(judgeRows(rowsOf(`${A},Resolved,,Thanks,,,,`), k)[0].faults[0]).toMatch(/already merged into “The parent”/);
    expect(judgeRows(rowsOf(`${A},Duplicate,,Thanks,,,${C},`), k)[0].faults[0]).toMatch(/already merged/);
    const same = judgeRows(rowsOf(`${A},Duplicate,,Thanks,,,${B},`), k)[0];
    expect(same.state).toBe("ready");
    expect(same.steps.map((s) => s.kind)).toEqual(["message"]);
  });
  it("a withdrawn issue is a note, not a fault", () => {
    const [j] = judgeRows(rowsOf(`${A},Declined,,Thanks,,,,`), known(issue(A, { status: "withdrawn" })));
    expect(j.state).toBe("withdrawn");
    expect(j.notes[0]).toMatch(/withdrew/);
    expect(j.steps.length).toBeGreaterThan(0);
  });
  it("says when it replaces a resolution line", () => {
    const [j] = judgeRows(rowsOf(`${A},Resolved,Bug fix,Thanks,1.0.0,,,`), known(issue(A, { resolution: "typed by hand" })));
    expect(j.notes).toEqual(["Replaces the resolution line “typed by hand”."]);
  });
  it("counts the rows, and knows a file from another environment", () => {
    const rows = rowsOf(`${A},Resolved,,Thanks,,,,`, `${B},,,,,,,`, `${C},Fixed,,Thanks,,,,`);
    const j = judgeRows(rows, known(issue(A), issue(B), issue(C)));
    expect(tallyLine(j)).toBe("3 rows: 1 ready, 1 with faults, 1 no answer");
    expect(fromElsewhere(j)).toBe(false);
    expect(fromElsewhere(judgeRows(rows, known()))).toBe(true);
  });
});

describe("applying", () => {
  const fakeIo = (log: string[], failOn = ""): ApplyIo => {
    const step = (name: string) => {
      if (name.startsWith(failOn) && failOn !== "") throw new Error("server said no");
      log.push(name);
    };
    return {
      setStatus: async (id, to) => step(`status ${id.slice(0, 1)} ${to}`),
      merge: async (c, p) => step(`merge ${c.slice(0, 1)} into ${p.slice(0, 1)}`),
      setResolution: async (id, line) => step(`line ${id.slice(0, 1)} ${line}`),
      message: async (id, text, audience) => step(`${audience} ${id.slice(0, 1)} ${text}`),
    };
  };
  it("runs the steps in order, and a second run of the file changes nothing", async () => {
    const k = known(issue(A));
    const rows = rowsOf(`${A},Resolved,Bug fix,Thanks. Fixed.,1.0.0,2026-12-03,,Filter state`);
    const log: string[] = [];
    const r = await applyRow(judgeRows(rows, k)[0], fakeIo(log));
    expect(r).toEqual({ id: A, ok: true, error: "", messageWritten: true });
    expect(log).toEqual(["status 1 done", "line 1 Bug fix, released in 1.0.0 on 3 Dec 2026", "reporter 1 Thanks. Fixed.", "internal 1 Filter state"]);
    const again = judgeRows(rows, k)[0];
    expect(again.state).toBe("applied");
    expect(again.steps).toEqual([]);
  });
  it("a refused step stops the row; applying again runs only what is owed", async () => {
    const k = known(issue(A));
    const rows = rowsOf(`${A},Deferred,Enhancement,Thanks. Logged.,,,,Revisit later`);
    const log: string[] = [];
    const r = await applyRow(judgeRows(rows, k)[0], fakeIo(log, "reporter"));
    expect(r.ok).toBe(false);
    expect(r.error).toBe("The message was refused: server said no");
    expect(r.messageWritten).toBe(false);
    expect(log).toEqual(["status 1 deferred", "line 1 Enhancement"]);
    const owed = judgeRows(rows, k)[0];
    expect(owed.steps.map((s) => s.kind)).toEqual(["message", "note"]);
    const log2: string[] = [];
    expect((await applyRow(owed, fakeIo(log2))).ok).toBe(true);
    expect(log2).toEqual(["reporter 1 Thanks. Logged.", "internal 1 Revisit later"]);
  });
  it("a duplicate runs the merge in place of a status change", async () => {
    const k = known(issue(A), issue(B));
    const log: string[] = [];
    await applyRow(judgeRows(rowsOf(`${A},Duplicate,Bug fix,Thanks,,,${B},`), k)[0], fakeIo(log));
    expect(log).toEqual(["merge 1 into 2", "line 1 Bug fix", "reporter 1 Thanks"]);
    expect(k.get(A)?.status).toBe("merged");
    expect(stepsFor(rowsOf(`${A},Duplicate,Bug fix,Thanks,,,${B},`)[0], k.get(A) as KnownIssue)).toEqual([]);
  });
});

describe("one card per person", () => {
  const kat = { email: "Kat@x.com", name: "Kat" };
  const ellen = { email: "ellen@x.com", name: "Ellen" };
  const ans = (issueId: string, title: string, audience: { email: string; name: string }[], parentId = "") => ({ issueId, title, outcome: "Resolved", message: `About ${title}.`, parentId, audience });
  it("lists a person's answers on one card", () => {
    const cards = cardsFor([ans(A, "First", [kat]), ans(B, "Second", [kat, ellen])]);
    expect(cards.map((c) => [c.email, c.count])).toEqual([["kat@x.com", 2], ["ellen@x.com", 1]]);
    expect(cards[0].subject).toBe("Updates on your LeanBoard reports");
    expect(cards[0].text).toBe("2 reports you raised or follow have an answer.\n\n▸ First · Resolved\n\nAbout First.\n\n▸ Second · Resolved\n\nAbout Second.");
    expect(cards[1].text.startsWith("A report you raised or follow has an answer.")).toBe(true);
  });
  it("a duplicate's reporter hears their own row, not the parent's as well", () => {
    // Ellen reported B, a duplicate of A; the merge made her a follower of A
    const cards = cardsFor([ans(A, "Parent", [kat, ellen]), ans(B, "Child", [ellen], A)]);
    const e = cards.find((c) => c.email === "ellen@x.com");
    expect(e?.count).toBe(1);
    expect(e?.text).toContain("▸ Child");
    expect(e?.text).not.toContain("▸ Parent");
    expect(cards.find((c) => c.email === "kat@x.com")?.text).toContain("▸ Parent");
  });
  it("more than twenty answers split into numbered cards", () => {
    const many = Array.from({ length: 23 }, (_, n) => ans(`id-${n}`, `Report ${n}`, [kat]));
    const cards = cardsFor(many);
    expect(cards.map((c) => [c.subject, c.count])).toEqual([
      ["Updates on your LeanBoard reports (1 of 2)", 20],
      ["Updates on your LeanBoard reports (2 of 2)", 3],
    ]);
    expect(cards[1].text.startsWith("23 reports you raised or follow have an answer.")).toBe(true);
  });
  it("nobody to tell, no card", () => {
    expect(cardsFor([ans(A, "Mine", [])])).toEqual([]);
  });
});
