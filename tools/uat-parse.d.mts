export interface ParsedUatCase {
  id: string;
  title: string;
  journey: string;
  persona: string;
  modules: string[];
  preconditions: string;
  steps: string[];
  expected: string;
}
export interface ParsedUatScript {
  title: string;
  journeys: { title: string; cases: ParsedUatCase[] }[];
  errors: string[];
}
export function parseUatMarkdown(text: string, componentKey: string, knownPersonas?: string[]): ParsedUatScript;
export function caseHash(c: ParsedUatCase): string;
