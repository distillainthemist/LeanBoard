// Stylesheet for the Fishbone card, bundled into the JS and injected at
// runtime, so hover states, cursors and typography travel with the card —
// including into the snapshot, which inlines this same string.

export const FISHBONE_CSS = `
.fb-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 420px;
  font-family: inherit;
  font-size: 12px;
  color: #1b1b1b;
  background: transparent;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* ---------- read-only badge (floats over the stage) ---------- */
.fb-ro-badge {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 5;
  padding: 2px 8px;
  background: #ffe6cc;
  color: #8a4b00;
  border: 1px solid #f0b070;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

/* ---------- stage / svg ---------- */
.fb-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: #fdfdfd;
}
/* a tile has no 420 px to give: the diagram fits whatever height the
   stage has (card-responsiveness-review-2026-10-30; the "corner of the
   canvas" on a phone and a short wall slot) */
.ltk-tile .fb-root { min-height: 0; }
[data-ltk-tier="phone"] .fb-root { min-height: 0; }

/* ---------- the list a phone shows in place of the diagram ----------
   (tranche 6, G1): the host stamps its width tier; under 480 px the
   diagram's cause text is 4 to 6 px, so the same fishbone reads as the
   problem, then each bone with its causes under it */
.fb-outline { display: none; }
[data-ltk-tier="phone"] .fb-stage { display: none; }
[data-ltk-tier="phone"] .fb-outline {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 12px 12px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.35;
}
.ltk-tile .fb-outline { overflow: hidden !important; gap: 6px !important; font-size: 12.5px !important; }
.fb-ol-problem {
  border: 1.5px solid var(--fb-diagram, #141414);
  border-radius: 8px;
  padding: 8px 10px;
  background: #f4f4f4;
}
.fb-ol-problem-h { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.fb-ol-problem-t { font-weight: 600; }
.fb-ol-empty, .fb-ol-none { color: #77736b; font-weight: 400; font-style: italic; }
.fb-ol-none { font-size: 12.5px; padding: 2px 0 2px 16px; }
.fb-ol-bone { display: flex; flex-direction: column; gap: 3px; }
.fb-ol-bone-h {
  display: flex; align-items: baseline; gap: 8px;
  font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 1.5px solid var(--fb-diagram, #141414);
  padding-bottom: 2px;
}
.fb-ol-count { font-weight: 600; color: #77736b; }
.fb-ol-cause { display: flex; align-items: flex-start; gap: 8px; padding: 5px 4px; border-radius: 6px; min-height: 32px; box-sizing: border-box; }
.ltk-tile .fb-ol-cause { padding: 1px 4px; min-height: 0; }
.fb-ol-cause.fb-clickable:hover { background: #f1efea; }
.fb-ol-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; }
.ltk-tile .fb-ol-dot { margin-top: 4px; width: 8px; height: 8px; }
.fb-ol-text { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.fb-ol-votes { flex: none; font-size: 12px; font-weight: 600; color: #55524b; white-space: nowrap; }
.fb-ol-add {
  align-self: flex-start; font: inherit; font-size: 13px; color: #55524b;
  background: none; border: 1px dashed #c9c5bb; border-radius: 6px; padding: 6px 10px; min-height: 32px; cursor: pointer;
}
.fb-ol-add:hover { border-color: #55524b; color: #1b1b1b; }
.ltk-tile .fb-ol-add { display: none !important; }
.fb-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ---------- spine & head ---------- */
.fb-spine {
  stroke-width: 3.5;
  stroke-linecap: round;
}
.fb-head-box {
  stroke-width: 2;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12));
}
.fb-head-cap {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.fb-head-text {
  font-size: 14px;
  font-weight: 600;
}
.fb-placeholder {
  fill: #9aa7b3;
  font-style: italic;
  font-weight: 400;
}

/* ---------- bones ---------- */
.fb-bone-line {
  stroke-width: 2.25;
  stroke-linecap: round;
}
/* wide invisible strip along the bone — click anywhere on it to add a cause */
.fb-bone-hit {
  stroke: transparent;
  stroke-width: 18;
  stroke-linecap: round;
}
.fb-bone-hit:hover ~ .fb-add .fb-add-circle,
.fb-add.fb-clickable:hover .fb-add-circle {
  fill: var(--fb-diagram, #1b1b1b);
}
.fb-bone-hit:hover ~ .fb-add .fb-add-plus,
.fb-add.fb-clickable:hover .fb-add-plus {
  stroke: #ffffff;
}
.fb-cat-label {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.fb-cat-label.fb-clickable:hover {
  text-decoration: underline;
}

/* refined add button: outlined circle that fills on hover */
.fb-add-circle {
  fill: #ffffff;
  stroke: var(--fb-diagram, #1b1b1b);
  stroke-width: 1.75;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.15));
  transition: fill 0.12s ease;
}
.fb-add-plus {
  fill: none;
  stroke: var(--fb-diagram, #1b1b1b);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke 0.12s ease;
}
.fb-add-hidden {
  display: none;
}

/* ---------- causes / chips ---------- */
.fb-leader {
  stroke: #c9cdd1;
  stroke-width: 1.25;
}
.fb-chip-box {
  stroke-width: 1.5;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.1));
}
.fb-chip-text {
  font-size: 12px;
  font-weight: 500;
}
.fb-vote-badge {
  opacity: 0.9;
}
.fb-vote-text {
  fill: #fff;
  font-size: 10px;
  font-weight: 700;
}
.fb-status-glyph {
  font-size: 12px;
  font-weight: 800;
}
.fb-chip.fb-clickable:hover .fb-chip-box {
  stroke-width: 2.5;
}

/* ---------- drag & drop ---------- */
.fb-chip.fb-dragging {
  opacity: 0.75;
}
.fb-bone-line.fb-drop-target {
  stroke-width: 4.5;
}

/* tile mode (shared .ltk-tile contract): a board tile shows the diagram
   only — the read-only badge and the ⊕ add affordances are authoring chrome */
.ltk-tile .fb-ro-badge,
.ltk-tile .fb-add { display: none !important; }

/* ---------- interactivity ---------- */
.fb-clickable {
  cursor: pointer;
}
.fb-readonly .fb-clickable {
  cursor: default;
}

/* ---------- dialog ---------- */
.fb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.fb-dialog {
  width: 320px;
  max-width: 90%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  padding: 16px;
  box-sizing: border-box;
}
.fb-dialog-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1b1b1b;
}
.fb-field-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin: 10px 0 4px;
}
.fb-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
  font-family: inherit;
  font-size: 12px;
}
.fb-input:focus {
  outline: none;
  border-color: #0a5ca8;
  box-shadow: 0 0 0 2px rgba(10, 92, 168, 0.15);
}
.fb-textarea {
  resize: vertical;
  min-height: 56px;
}

.fb-vote-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.fb-char-count {
  font-size: 11px;
  color: #8a8a8a;
  text-align: right;
  margin-top: 3px;
}
.fb-char-count-max {
  color: #d13438;
  font-weight: 600;
}
.fb-vote-input {
  width: 70px;
  text-align: center;
}
.fb-step {
  width: 30px;
  padding: 6px 0;
  font-weight: 700;
}

/* segmented status control (on-state colours applied inline from inputs) */
.fb-seg {
  display: flex;
  gap: 6px;
}
.fb-seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f7f7f7;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
}
.fb-seg-btn.fb-seg-on {
  font-weight: 700;
}

.fb-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.fb-footer-left {
  margin-right: auto;
}
.fb-btn {
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
.fb-btn:hover {
  background: #f0f0f0;
}
.fb-btn-primary {
  background: #0a5ca8;
  border-color: #084a86;
  color: #fff;
}
.fb-btn-primary:hover {
  background: #084a86;
}
.fb-btn-danger {
  border-color: #d13438;
  color: #d13438;
}
.fb-btn-danger:hover {
  background: #fde7e7;
}
`;
