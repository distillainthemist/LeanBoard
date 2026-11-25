// A card left inside the picture's delay is saved WITH its picture
// (programme E8, 2026-11-25): the flush draws what is waiting first.

import { describe, expect, it } from "vitest";
import { flushPendingSnapshots, SnapshotScheduler } from "../../../shared/export/png";
import { flushPendingSaves, saver } from "../saver";

describe("leaving a card with an edit just made", () => {
  it("the save carries the picture of THAT edit, not the one before", () => {
    const saved: [string, string][] = [];
    const s = saver({ onSave: (json, svg) => saved.push([json, svg]) });
    let picture = "<svg>first</svg>";
    const snaps = new SnapshotScheduler(() => s.onSnapshot(picture));
    // an earlier edit, drawn and saved in its own time
    s.save("doc-1");
    snaps.schedule();
    flushPendingSaves();
    expect(saved).toEqual([["doc-1", "<svg>first</svg>"]]);
    // a second edit, and the card is left at once: the picture is still on its delay
    picture = "<svg>second</svg>";
    s.save("doc-2");
    snaps.schedule();
    flushPendingSaves();
    expect(saved[saved.length - 1]).toEqual(["doc-2", "<svg>second</svg>"]);
    snaps.cancel();
  });

  it("draws only what is waiting, once", () => {
    let drawn = 0;
    const a = new SnapshotScheduler(() => drawn++);
    const b = new SnapshotScheduler(() => drawn++);
    a.schedule();
    expect(flushPendingSnapshots()).toBe(1);
    expect(flushPendingSnapshots()).toBe(0);
    expect(drawn).toBe(1);
    // a cancelled picture (its editor was destroyed) is not drawn
    b.schedule();
    b.cancel();
    expect(flushPendingSnapshots()).toBe(0);
    expect(drawn).toBe(1);
  });

  it("a picture that cannot be drawn never stops the save", () => {
    const saved: string[] = [];
    const s = saver({ onSave: (json) => saved.push(json) });
    const bad = new SnapshotScheduler(() => {
      throw new Error("no layout");
    });
    s.save("doc");
    bad.schedule();
    flushPendingSaves();
    expect(saved).toEqual(["doc"]);
  });
});
