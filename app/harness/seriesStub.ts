// Harness stand-in for src/store/series (no Dataverse): an in-memory cell
// store with the same surface the grid uses.
export interface SeriesCell { key: string; date: string; shift: string; value: string }
const cells = new Map<string, SeriesCell & { boardId: string; cardId: string }>();
const k = (b: string, c: string, x: { key: string; date: string; shift: string }) => `${b}|${c}|${x.key}|${x.date}|${x.shift}`;
export function seed(boardId: string, cardId: string, list: SeriesCell[]): void {
  for (const c of list) cells.set(k(boardId, cardId, c), { ...c, boardId, cardId });
}
export async function listSeries(boardId: string, cardId: string, from: string, to: string): Promise<SeriesCell[]> {
  return [...cells.values()].filter((c) => c.boardId === boardId && c.cardId === cardId && c.date >= from && c.date <= to);
}
export async function listSeriesByPrefix(boardId: string, cardId: string, prefix: string, to: string): Promise<SeriesCell[]> {
  return [...cells.values()].filter((c) => c.boardId === boardId && c.cardId === cardId && c.key.startsWith(prefix) && c.date <= to);
}
export async function hasAnySeries(): Promise<boolean> { return true; }
export async function applySeries(boardId: string, cardId: string, put: SeriesCell[], del: SeriesCell[] = []): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  for (const c of put) cells.set(k(boardId, cardId, c), { ...c, boardId, cardId });
  for (const c of del) cells.delete(k(boardId, cardId, c));
  console.log("applySeries", boardId, cardId, put, del);
}
export async function latestSeriesCell(boardId: string, cardId: string, key = ""): Promise<SeriesCell | null> {
  const mine = [...cells.values()].filter((c) => c.boardId === boardId && c.cardId === cardId && c.value !== "" && (key !== "" ? c.key === key : !c.key.startsWith("spec:")));
  mine.sort((a, b) => (a.date + a.shift < b.date + b.shift ? -1 : 1));
  return mine.pop() ?? null;
}
export async function listBoardSeries(boardId: string, from: string, to: string): Promise<(SeriesCell & { cardId: string })[]> {
  return [...cells.values()].filter((c) => c.boardId === boardId && c.date >= from && c.date <= to);
}
export async function listBoardSpec(boardId: string, prefix: string, to: string): Promise<(SeriesCell & { cardId: string })[]> {
  return [...cells.values()].filter((c) => c.boardId === boardId && c.key.startsWith(prefix) && c.date <= to);
}
