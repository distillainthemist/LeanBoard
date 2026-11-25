// The stale mark's picture (programme D1): a small clock, drawn — the
// "◷" character came out at a fraction of the caption's size (Ben,
// 2026-11-25: "mark works, but is too small"). It scales with the text
// beside it (1.3em) and takes the text's colour.

const NS = "http://www.w3.org/2000/svg";

/** A clock sized to the text around it. `words`: what it stands for
 *  ("No reading for 9 weeks") — its accessible name and tooltip. */
export function staleMark(words: string): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "app-stalemark");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", words);
  const title = document.createElementNS(NS, "title");
  title.textContent = words;
  const face = document.createElementNS(NS, "circle");
  face.setAttribute("cx", "12");
  face.setAttribute("cy", "12");
  face.setAttribute("r", "9");
  const hands = document.createElementNS(NS, "path");
  hands.setAttribute("d", "M12 6.5V12l3.5 2.5");
  for (const part of [face, hands]) {
    part.setAttribute("fill", "none");
    part.setAttribute("stroke", "currentColor");
    part.setAttribute("stroke-width", "2.4");
    part.setAttribute("stroke-linecap", "round");
    part.setAttribute("stroke-linejoin", "round");
  }
  svg.append(title, face, hands);
  return svg;
}

/** The mark with its words beside it: "◷ No reading for 9 weeks". */
export function staleTag(words: string, cls: string): HTMLElement {
  const tag = document.createElement("span");
  tag.className = cls;
  tag.append(staleMark(words), document.createTextNode(words));
  return tag;
}
