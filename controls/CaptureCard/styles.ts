// CaptureCard stylesheet — a flat table over the shared kit.

export const CAPTURE_CSS = `
.ltk-cc-th-sort { cursor: pointer; user-select: none; }
.ltk-cc-th-sort:hover { text-decoration: underline; }
.ltk-cc-sortglyph { font-size: 10px; }

.ltk-cc-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 12px;
  overflow: hidden;
}
.ltk-cc-tablewrap { flex: 1; min-height: 0; overflow: auto; }
/* the table fits its container (card-responsiveness-review-2026-10-30,
   R1): min-width: max-content made the minimum width the sum of the
   column caps, so four text columns overflowed a tile and scrolled a
   phone sideways; the head and the row label stay put while the rest
   scrolls */
.ltk-cc-table { border-collapse: separate; border-spacing: 0; min-width: 100%; width: 100%; height: 100%; }
.ltk-cc-table thead th { position: sticky; top: 0; background: var(--ltk-bg); z-index: 2; }
.ltk-cc-table td.ltk-cc-rowhead, .ltk-cc-table td.ltk-cr-source, .ltk-cc-table td.ltk-vr-charter { position: sticky; left: 0; background: var(--ltk-bg); z-index: 1; }
.ltk-cc-table thead th:first-child { left: 0; z-index: 3; }
.ltk-cc-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ltk-muted);
  text-align: left;
  padding: 4px 12px 6px 4px;
  border-bottom: 2px solid var(--ltk-hairline);
}
.ltk-cc-table td {
  font-size: 13px;
  padding: 7px 12px 7px 4px;
  border-bottom: 1px solid var(--ltk-hairline);
  vertical-align: top;
  max-width: 260px;
  overflow-wrap: break-word;
}
/* simple (no-list) cards scale their text up to fill the box */
.ltk-cc-simple td {
  font-size: var(--cc-font, 15px);
  vertical-align: middle;
  padding: 6px 16px 6px 4px;
  max-width: none; /* the big text needs the column's whole width (R4) */
}
.ltk-cc-simple th {
  font-size: calc(var(--cc-font, 15px) * 0.5);
}
.ltk-cc-simple .ltk-cc-rowhead { font-size: var(--cc-font, 15px); }

.ltk-cc-row { cursor: pointer; }
.ltk-cc-row:hover td { background: var(--ltk-hairline); }
.ltk-cc-row.ltk-readonly { cursor: default; }
/* Row-head labels can be full sentences (question-style cards), so they wrap
   within a generous column instead of forcing one long line — the general
   td max-width above is overridden here so the label gets the room. */
.ltk-cc-rowhead {
  font-weight: 600;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
  min-width: 140px;
  width: 38%;
  max-width: 460px;
}
.ltk-cc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--ltk-hairline);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 12px;
  margin: 1px 3px 1px 0;
  white-space: nowrap;
}
.ltk-cc-chip img { width: 14px; height: 14px; object-fit: contain; }
/* a person column: names as chips; its dialog field stacks chips over the search */
.ltk-cc-person { white-space: nowrap; }
.ltk-cc-people { display: flex; flex-direction: column; gap: 6px; }
.ltk-cc-empty { color: var(--ltk-muted); }
.ltk-cc-flag { color: var(--ltk-accent); font-size: 15px; }
.ltk-cc-add {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 2px dashed var(--ltk-hairline);
  border-radius: 6px;
  background: none;
  color: var(--ltk-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  min-height: 40px;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease;
}
.ltk-cc-add:hover { border-color: var(--ltk-accent); color: var(--ltk-accent); }
/* the add row (addRow.ts): a blank row at the foot of the table, typed
   into in place. It stays in view while the rows scroll, and it never
   takes the height the rows are stretched over */
.ltk-cc-table tfoot td {
  position: sticky; bottom: 0; z-index: 2;
  background: var(--ltk-bg);
  border-top: 2px solid var(--ltk-hairline); border-bottom: none;
  height: 1px; vertical-align: middle;
  font-size: 13px; padding: 6px 12px 6px 4px;
}
.ltk-cc-incell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ltk-cc-in {
  width: 100%; min-width: 64px; box-sizing: border-box;
  font: inherit; font-size: 13px; color: var(--ltk-fg);
  background: var(--ltk-bg);
  border: 1px solid var(--ltk-hairline); border-radius: 6px;
  padding: 6px 8px; min-height: 34px;
}
.ltk-cc-in:focus { outline: 2px solid var(--ltk-accent); outline-offset: -1px; }
.ltk-cc-in::placeholder { color: var(--ltk-muted); }
.ltk-cc-intick { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; cursor: pointer; }
.ltk-cc-intick input { width: 18px; height: 18px; margin: 0; accent-color: var(--ltk-accent); }
.ltk-cc-inlast { display: flex; align-items: flex-start; gap: 6px; }
.ltk-cc-inlast > .ltk-cc-incell { flex: 1 1 auto; }
.ltk-cc-addgo {
  flex: none; width: 34px; height: 34px; border-radius: 6px;
  border: 1px solid var(--ltk-hairline); background: var(--ltk-bg); color: var(--ltk-fg);
  font: inherit; font-size: 16px; font-weight: 600; cursor: pointer;
}
.ltk-cc-addgo:hover { border-color: var(--ltk-accent); color: var(--ltk-accent); }
.ltk-cc-addrow .ltk-who-box { display: flex; }
`;
