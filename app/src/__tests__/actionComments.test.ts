// Editing a comment (issue 10, 2026-11-16): its author, for a day — and
// the store's merge, so a save never drops what someone else wrote.

import { describe, expect, it } from "vitest";
import { ActionComment, canEditComment, editComment, mergeComments, newComment, sanitizeAction } from "../../../shared/schema/actions";

const HOUR = 3600000;
const ben = { whoId: "u-ben", who: "Ben" };
const sue = { whoId: "u-sue", who: "Sue" };
const t0 = Date.parse("2026-11-16T02:00:00.000Z");
const at = (h: number) => new Date(t0 + h * HOUR).toISOString();

describe("who may change a comment, and for how long", () => {
  it("gives a new comment an id and its moment", () => {
    const c = newComment(sue, "  Routine meetings set up  ", "2026-11-16", at(0));
    expect(c.text).toBe("Routine meetings set up");
    expect(c.id).toMatch(/^c/);
    expect(c.at).toBe(at(0));
    expect(c.when).toBe("2026-11-16");
  });

  it("lets the author edit for 24 hours, nobody else ever", () => {
    const c = newComment(sue, "x", "2026-11-16", at(0));
    expect(canEditComment(c, "u-sue", t0 + HOUR)).toBe(true);
    expect(canEditComment(c, "u-sue", t0 + 23.9 * HOUR)).toBe(true);
    expect(canEditComment(c, "u-sue", t0 + 24 * HOUR)).toBe(false);
    expect(canEditComment(c, "u-ben", t0 + HOUR)).toBe(false);
    expect(canEditComment(c, "", t0 + HOUR)).toBe(false);
  });

  it("lets an older comment, which carries only its day, change on that day", () => {
    const old: ActionComment = { whoId: "u-sue", who: "Sue", when: "2026-11-16", text: "x" };
    expect(canEditComment(old, "u-sue", t0, "2026-11-16")).toBe(true);
    expect(canEditComment(old, "u-sue", t0, "2026-11-17")).toBe(false);
  });

  it("stamps an edit and gives an old comment an id", () => {
    const old: ActionComment = { whoId: "u-sue", when: "2026-11-16", text: "Managment" };
    const next = editComment(old, " Management ", at(1));
    expect(next.text).toBe("Management");
    expect(next.editedAt).toBe(at(1));
    expect(next.id).toMatch(/^c/);
    expect(old.id).toBeUndefined();
  });

  it("keeps the new fields through a read", () => {
    const c = editComment(newComment(sue, "x", "2026-11-16", at(0)), "y", at(1));
    const back = sanitizeAction({ id: "a", comments: [c, { whoId: "u", when: "2026-01-01", text: "old" } as ActionComment] });
    expect(back.comments[0]).toEqual(c);
    expect(back.comments[1]).toEqual({ whoId: "u", who: undefined, when: "2026-01-01", text: "old" });
  });
});

describe("the comments a save writes", () => {
  const now = t0 + 2 * HOUR;
  const today = "2026-11-16";
  const merge = (stored: ActionComment[], mine: ActionComment[], who = "u-sue") => mergeComments(stored, mine, who, now, today);

  it("keeps what someone else wrote since this screen loaded", () => {
    const a = newComment(sue, "mine", today, at(0));
    const b = newComment(ben, "Ben's, added meanwhile", today, at(1));
    const added = newComment(sue, "and another", today, at(2));
    expect(merge([a, b], [a, added]).map((c) => c.text)).toEqual(["mine", "Ben's, added meanwhile", "and another"]);
  });

  it("writes the author's edit, and never undoes someone else's later one", () => {
    const mineOld = newComment(sue, "tpyo", today, at(0));
    const mineNew = editComment(mineOld, "typo", at(1));
    expect(merge([mineOld], [mineNew])[0].text).toBe("typo");
    const bens = newComment(ben, "first wording", today, at(0));
    const bensEdited = editComment(bens, "better wording", at(1));
    expect(merge([bensEdited], [bens])[0].text).toBe("better wording");
  });

  it("drops the author's own comment they deleted here, inside its day", () => {
    const a = newComment(sue, "said in haste", today, at(0));
    const b = newComment(ben, "stays", today, at(0));
    expect(merge([a, b], [b]).map((c) => c.text)).toEqual(["stays"]);
  });

  it("never drops a comment that is past its day, whoever's screen is stale", () => {
    const old = newComment(sue, "the record", "2026-11-10", "2026-11-10T02:00:00.000Z");
    expect(merge([old], []).map((c) => c.text)).toEqual(["the record"]);
  });

  it("does not bring back a comment its author removed elsewhere", () => {
    const bens = newComment(ben, "withdrawn by Ben", today, at(0));
    expect(merge([], [bens])).toEqual([]);
  });

  it("replaces an old comment edited here rather than doubling it", () => {
    const old: ActionComment = { whoId: "u-sue", who: "Sue", when: today, text: "Managment file" };
    const fixed = editComment(old, "Management file", at(1));
    expect(merge([old], [fixed]).map((c) => c.text)).toEqual(["Management file"]);
  });

  it("matches old comments, which have no id, by who, day and words", () => {
    const one: ActionComment = { whoId: "u-ben", who: "Ben", when: "2026-10-01", text: "noted" };
    const copy: ActionComment = { ...one };
    expect(merge([one], [copy])).toEqual([copy]);
  });

  it("writes this screen's copy untouched when nobody is signed in", () => {
    const a = newComment(sue, "x", today, at(0));
    expect(mergeComments([newComment(ben, "y", today, at(0))], [a], "", now, today)).toEqual([a]);
  });
});
