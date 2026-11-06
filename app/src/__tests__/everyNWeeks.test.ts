// Every N weeks (issue round 2026-11-06, #1): the fortnightly cadence
// with an interval — `weeks mod N` from the anchor's week; 2 = a fortnight.
import { describe, expect, it } from "vitest";
import { cadenceFromConfig, cadenceLabel, generateInstances, parseIntervalWeeks } from "../../../shared/schema/recurrence";
import { cadenceChoice, emptyDraft, parseWizardDraft, serializeWizardDraft } from "../../../controls/MeetingWizard/types";

const dates = (config: Record<string, unknown>, finalIso: string, daysPrior: number): string[] => {
  const cad = cadenceFromConfig(config, new Date(2026, 0, 5));
  const finalDate = new Date(`${finalIso}T00:00:00`);
  return generateInstances({ ...cad, finalDate, daysPrior }, [], new Date(0)).map((i) => i.date).sort();
};

describe("every N weeks", () => {
  it("parses the interval: whole weeks 2–12, anything else a fortnight", () => {
    expect(parseIntervalWeeks(undefined)).toBe(2);
    expect(parseIntervalWeeks("")).toBe(2);
    expect(parseIntervalWeeks("abc")).toBe(2);
    expect(parseIntervalWeeks(4)).toBe(4);
    expect(parseIntervalWeeks("5")).toBe(5);
    expect(parseIntervalWeeks(1)).toBe(2);
    expect(parseIntervalWeeks(40)).toBe(12);
  });

  it("a 4-weekly Tuesday falls every fourth week from the anchor's week", () => {
    const cfg = { category: "fortnightly", daysOfWeek: "Tue", baseStartDate: "2026-01-06", intervalWeeks: 4 };
    expect(dates(cfg, "2026-03-31", 90)).toEqual(["2026-01-06", "2026-02-03", "2026-03-03", "2026-03-31"]);
  });

  it("a plain fortnight is unchanged", () => {
    const cfg = { category: "fortnightly", daysOfWeek: "Tue", baseStartDate: "2026-01-06" };
    expect(dates(cfg, "2026-02-03", 28)).toEqual(["2026-01-06", "2026-01-20", "2026-02-03"]);
  });

  it("names the cadence for people", () => {
    expect(cadenceLabel("fortnightly")).toBe("Fortnightly");
    expect(cadenceLabel("fortnightly", 2)).toBe("Fortnightly");
    expect(cadenceLabel("fortnightly", "3")).toBe("Every 3 weeks");
    expect(cadenceLabel("weekly")).toBe("Weekly");
  });

  it("the wizard stores it as fortnightly + intervalWeeks, and a fortnight writes no interval", () => {
    const d = emptyDraft();
    d.title = "Peer learning";
    d.category = "fortnightly";
    d.daysOfWeek = "Wed";
    d.intervalWeeks = 5;
    const json = serializeWizardDraft(d);
    const cfg = (JSON.parse(json) as { config: Record<string, unknown> }).config;
    expect(cfg.category).toBe("fortnightly");
    expect(cfg.intervalWeeks).toBe(5);
    const back = parseWizardDraft(json);
    expect(back.intervalWeeks).toBe(5);
    expect(cadenceChoice(back.category, back.intervalWeeks)).toBe("nweeks");
    back.intervalWeeks = 2;
    const plain = (JSON.parse(serializeWizardDraft(back)) as { config: Record<string, unknown> }).config;
    expect("intervalWeeks" in plain).toBe(false);
    expect(cadenceChoice("fortnightly", 2)).toBe("fortnightly");
  });
});
