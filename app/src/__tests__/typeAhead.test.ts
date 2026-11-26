// The one type-ahead builder's rules (shared/ui/typeAhead.ts, backlog
// programme tranche 5, 2026-11-27): when the slow source is asked, what
// the line under the options says, and where an arrow key lands.

import { describe, expect, it } from "vitest";
import { nextActive, remotePhase, typeAheadNote } from "../../../shared/ui/typeAhead";
import { directoryExtras, heldMatches } from "../docs/peopleField";

const words = { minChars: 3, noneWords: "No one matches.", searching: "Searching…", failed: "The search failed." };

describe("when the slow source is asked", () => {
  it("is off without one", () => {
    expect(remotePhase("ann", false, 3, { q: "", state: "idle" })).toBe("off");
  });

  it("waits for three letters", () => {
    expect(remotePhase("an", true, 3, { q: "", state: "idle" })).toBe("short");
  });

  it("is waiting until the question for THIS text has been put", () => {
    expect(remotePhase("ann", true, 3, { q: "", state: "idle" })).toBe("waiting");
    expect(remotePhase("anne", true, 3, { q: "ann", state: "done" })).toBe("waiting");
  });

  it("follows the question once it is the box's own", () => {
    expect(remotePhase("ann", true, 3, { q: "ann", state: "busy" })).toBe("busy");
    expect(remotePhase("ann", true, 3, { q: "ann", state: "done" })).toBe("done");
    expect(remotePhase("ann", true, 3, { q: "ann", state: "failed" })).toBe("failed");
  });
});

describe("the line under the options", () => {
  it("says it is searching while the directory is out, even beside held matches", () => {
    expect(typeAheadNote("waiting", 2, words)).toBe("Searching…");
    expect(typeAheadNote("busy", 0, words)).toBe("Searching…");
  });

  it("says a failed search failed, and keeps the held matches", () => {
    expect(typeAheadNote("failed", 2, words)).toBe("The search failed.");
  });

  it("asks for more letters only when nothing held matches", () => {
    expect(typeAheadNote("short", 0, words)).toBe("Keep typing to search further (3 letters).");
    expect(typeAheadNote("short", 1, words)).toBe("");
  });

  it("says nothing matches only when both sources came back empty", () => {
    expect(typeAheadNote("done", 0, words)).toBe("No one matches.");
    expect(typeAheadNote("done", 3, words)).toBe("");
    expect(typeAheadNote("off", 0, words)).toBe("No one matches.");
  });

  it("says how many held matches the cap left out", () => {
    expect(typeAheadNote("off", 12, { ...words, cut: 7 })).toBe("7 more. Type more of the name.");
    expect(typeAheadNote("done", 12, { ...words, cut: 7 })).toBe("7 more. Type more of the name.");
  });
});

describe("an arrow key", () => {
  it("lights the first row going down and the last going up, from none", () => {
    expect(nextActive(-1, 4, 1)).toBe(0);
    expect(nextActive(-1, 4, -1)).toBe(3);
  });

  it("wraps at the ends", () => {
    expect(nextActive(3, 4, 1)).toBe(0);
    expect(nextActive(0, 4, -1)).toBe(3);
    expect(nextActive(1, 4, 1)).toBe(2);
  });

  it("lights nothing in an empty list", () => {
    expect(nextActive(2, 0, 1)).toBe(-1);
  });
});

describe("the Documents people box", () => {
  const group = [
    { mail: "ann@x.test", displayName: "Ann Ray" },
    { mail: "bo@x.test", displayName: "Bo Lind" },
    { mail: "", displayName: "No Address" },
  ];

  it("lists the whole group for an empty box, less those without an address", () => {
    expect(heldMatches(group, "", []).map((p) => p.displayName)).toEqual(["Ann Ray", "Bo Lind"]);
  });

  it("matches a held person by name or by address", () => {
    expect(heldMatches(group, "lind", []).map((p) => p.mail)).toEqual(["bo@x.test"]);
    expect(heldMatches(group, "ann@", []).map((p) => p.mail)).toEqual(["ann@x.test"]);
  });

  it("does not offer someone already picked", () => {
    expect(heldMatches(group, "", ["ann@x.test"]).map((p) => p.mail)).toEqual(["bo@x.test"]);
  });

  it("lists from the directory only people the group did not already give", () => {
    const hits = [
      { mail: "Ann@x.test", displayName: "Ann Ray" },
      { mail: "cy@x.test", displayName: "Cy Moss" },
      { mail: "cy@x.test", displayName: "Cy Moss (twice)" },
      { mail: "", displayName: "Nobody" },
      { mail: "di@x.test", displayName: "Di Park" },
    ];
    expect(directoryExtras(hits, group, ["di@x.test"]).map((p) => p.displayName)).toEqual(["Cy Moss"]);
  });
});
