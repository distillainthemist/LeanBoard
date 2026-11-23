import { describe, it, expect, afterEach } from "vitest";
import { splitUatLibraries, setUatHidden, isUatHidden, visibleLinks, withHiddenLinks, uatTitle } from "../docs/uatLibraries";
import { linkCount } from "../docs/rows";
import { parseLibraryConfig, serializeLibraryConfig } from "../docs/model";

const lib = (listId: string, uatOnly?: boolean) => ({ listId, config: { uatOnly } });

describe("UAT-only libraries (2026-11-23)", () => {
  afterEach(() => setUatHidden([]));

  it("someone outside UAT mode is not shown a UAT-only library; someone in it sees every one", () => {
    const libs = [lib("A"), lib("B", true), lib("C", false)];
    expect(splitUatLibraries(libs, false)).toEqual({ visible: [libs[0], libs[2]], hidden: ["B"] });
    expect(splitUatLibraries(libs, true)).toEqual({ visible: libs, hidden: [] });
  });

  it("the tick rides the library's config, and only when set", () => {
    expect(parseLibraryConfig("").uatOnly).toBeUndefined();
    const cfg = parseLibraryConfig(JSON.stringify({ title: "Trial", uatOnly: true }));
    expect(cfg.uatOnly).toBe(true);
    expect(JSON.parse(serializeLibraryConfig(cfg))).toEqual({ title: "Trial", uatOnly: true });
    expect(serializeLibraryConfig({ ...cfg, uatOnly: false })).not.toContain("uatOnly");
    // a stored rendition folder is left alone, though nothing reads it
    expect(JSON.parse(serializeLibraryConfig(parseLibraryConfig('{"renditionPath":"Renditions"}')))).toEqual({ renditionPath: "Renditions" });
  });

  it("a link into a hidden library is hidden entirely, whatever the id's casing or braces", () => {
    setUatHidden(["{AAAA-1111}"]);
    expect(isUatHidden("aaaa-1111")).toBe(true);
    expect(isUatHidden("bbbb")).toBe(false);
    const links = [
      { uid: "1", listId: "aaaa-1111", name: "Trial doc" },
      { uid: "2", listId: "bbbb", name: "Real doc" },
      { uid: "3", listId: "", name: "Other site" },
    ];
    expect(visibleLinks(links).map((l) => l.uid)).toEqual(["2", "3"]);
    // the register's count agrees with the pane
    expect(linkCount(JSON.stringify(links))).toBe(2);
    setUatHidden([]);
    expect(visibleLinks(links)).toBe(links);
    expect(linkCount(JSON.stringify(links))).toBe(3);
  });

  it("a save by someone outside UAT keeps the links they were not shown", () => {
    setUatHidden(["aaaa"]);
    const original = [
      { uid: "1", listId: "AAAA" },
      { uid: "2", listId: "bbbb" },
    ];
    const edited = [{ uid: "9", listId: "cccc" }];
    expect(withHiddenLinks(original, edited).map((l) => l.uid)).toEqual(["9", "1"]);
  });

  it("the name carries a UAT tag for those who see it", () => {
    expect(uatTitle("Standards")).toBe("Standards · UAT");
  });
});
