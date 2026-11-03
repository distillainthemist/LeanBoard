import { describe, expect, it } from "vitest";
import {
  addMonths,
  cleanBody,
  excludeReason,
  groupMeetings,
  htmlToText,
  isInternal,
  lookupTargets,
  minutesBetween,
  normalise,
  normaliseAll,
  periodProblem,
  recurrenceText,
  wallClock,
  weekdayOf,
  type GraphEvent,
  type GraphRecurrence,
} from "../cadence/model";
import { buildExport, exportJson, exportSheets, CONFIDENTIAL_SUBJECT, type ExportInput } from "../cadence/exportDoc";
import { readXlsx, writeXlsx } from "../../../shared/export/xlsx";

const DOMAINS = ["pecheydistilling.com"];

function ev(over: Partial<GraphEvent> = {}): GraphEvent {
  return {
    id: "e1",
    subject: "Weekly ops review",
    start: { dateTime: "2026-11-03T09:00:00.0000000", timeZone: "Australia/Brisbane" },
    end: { dateTime: "2026-11-03T10:30:00.0000000", timeZone: "Australia/Brisbane" },
    isAllDay: false,
    type: "singleInstance",
    seriesMasterId: null,
    sensitivity: "normal",
    showAs: "busy",
    isCancelled: false,
    responseStatus: { response: "accepted" },
    organizer: { emailAddress: { name: "Ann Org", address: "Ann@PecheyDistilling.com" } },
    attendees: [
      { type: "required", status: { response: "none" }, emailAddress: { name: "Ann Org", address: "ann@pecheydistilling.com" } },
      { type: "required", status: { response: "accepted" }, emailAddress: { name: "Bob In", address: "bob@pecheydistilling.com" } },
      { type: "optional", status: { response: "tentativelyAccepted" }, emailAddress: { name: "Cat Out", address: "cat@supplier.example" } },
      { type: "resource", status: { response: "accepted" }, emailAddress: { name: "Room 1", address: "room1@pecheydistilling.com" } },
    ],
    location: { displayName: "Boardroom" },
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    body: { contentType: "text", content: "Agenda\r\n1. KPIs\r\n" },
    categories: ["Ops"],
    importance: "normal",
    webLink: "https://outlook.office365.com/x",
    ...over,
  };
}

describe("dropping and flagging", () => {
  it("drops cancelled and declined meetings, keeps everything else", () => {
    expect(excludeReason(ev({ isCancelled: true }))).toBe("cancelled");
    expect(excludeReason(ev({ responseStatus: { response: "declined" } }))).toBe("declined");
    expect(excludeReason(ev({ responseStatus: { response: "tentativelyAccepted" } }))).toBeNull();
    const r = normaliseAll([ev({ id: "a" }), ev({ id: "b", isCancelled: true }), ev({ id: "c", responseStatus: { response: "declined" } }), ev({ id: "d", type: "seriesMaster" })], { internalDomains: DOMAINS });
    expect(r.meetings.map((m) => m.key)).toEqual(["a"]);
    expect(r.excluded).toEqual({ cancelled: 1, declined: 1 });
  });

  it("flags personal, private and confidential by default, not normal", () => {
    for (const s of ["personal", "private", "confidential"]) expect(normalise(ev({ sensitivity: s }), { internalDomains: DOMAINS }).confidentialByDefault).toBe(true);
    expect(normalise(ev({ sensitivity: "normal" }), { internalDomains: DOMAINS }).confidentialByDefault).toBe(false);
    expect(normalise(ev({ sensitivity: undefined }), { internalDomains: DOMAINS }).confidentialByDefault).toBe(false);
  });
});

describe("normalise", () => {
  it("reads times as wall clock, with weekday and duration", () => {
    const m = normalise(ev(), { internalDomains: DOMAINS });
    expect(m.start).toBe("2026-11-03T09:00");
    expect(m.end).toBe("2026-11-03T10:30");
    expect(m.weekday).toBe("Tuesday");
    expect(m.durationMinutes).toBe(90);
    expect(m.kind).toBe("one-off");
    expect(wallClock(undefined)).toBe("");
    expect(minutesBetween("2026-11-03T00:00", "2026-11-05T00:00")).toBe(2880);
    expect(weekdayOf("2026-11-08")).toBe("Sunday");
  });

  it("lists the organizer once, as organizer, with roles, responses, internal flags and directory details", () => {
    const people = new Map([["bob@pecheydistilling.com", { jobTitle: "Ops Manager", department: "Operations" }]]);
    const m = normalise(ev(), { internalDomains: DOMAINS, people });
    expect(m.attendees.map((a) => [a.email, a.role, a.response, a.internal])).toEqual([
      ["ann@pecheydistilling.com", "organizer", "organizer", true],
      ["bob@pecheydistilling.com", "required", "accepted", true],
      ["cat@supplier.example", "optional", "tentativelyAccepted", false],
      ["room1@pecheydistilling.com", "resource", "accepted", true],
    ]);
    expect(m.attendees[1].jobTitle).toBe("Ops Manager");
    expect(m.attendees[1].department).toBe("Operations");
    expect(m.attendees[2].jobTitle).toBe("");
  });

  it("marks an occurrence recurring and keeps its series key", () => {
    const m = normalise(ev({ type: "occurrence", seriesMasterId: "S" }), { internalDomains: DOMAINS });
    expect(m.kind).toBe("recurring");
    expect(m.seriesKey).toBe("S");
  });

  it("looks up internal people only, never rooms", () => {
    expect(lookupTargets([ev()], DOMAINS)).toEqual(["ann@pecheydistilling.com", "bob@pecheydistilling.com"]);
    expect(isInternal("x@sub.pecheydistilling.com", DOMAINS)).toBe(true);
    expect(isInternal("x@notpecheydistilling.com", DOMAINS)).toBe(false);
  });
});

describe("cleanBody", () => {
  it("strips the Teams join block and keeps the agenda", () => {
    const teams = [
      "Agenda: KPIs and actions",
      "",
      "________________________________________________________________________________",
      "Microsoft Teams Need help?<https://aka.ms/JoinTeamsMeeting>",
      "Join the meeting now<https://teams.microsoft.com/l/meetup-join/19%3ameeting>",
      "Meeting ID: 123 456 789",
      "Passcode: abc123",
      "________________________________________________________________________________",
    ].join("\r\n");
    expect(cleanBody(teams)).toBe("Agenda: KPIs and actions");
  });

  it("strips Zoom details and stray join lines but keeps the rest whole", () => {
    const zoom = "Please bring the plan.\n\nJoin Zoom Meeting\nhttps://us02web.zoom.us/j/123\nMeeting ID: 1\nOne tap mobile";
    expect(cleanBody(zoom)).toBe("Please bring the plan.");
    expect(cleanBody("Line one\nhttps://zoom.us/j/9 join here\nLine two")).toBe("Line one\nLine two");
    const long = "x".repeat(50000);
    expect(cleanBody(long)).toHaveLength(50000); // full length (decision 5)
  });

  it("turns HTML into text for the typed fallback", () => {
    expect(htmlToText("<p>One</p><p>Two &amp; three<br>four</p>")).toBe("One\nTwo & three\nfour\n");
    expect(cleanBody("<div>Hi</div><div>Join Microsoft Teams Meeting</div><div>link</div>", true)).toBe("Hi");
  });
});

describe("recurrenceText", () => {
  const r = (pattern: GraphRecurrence["pattern"], range?: GraphRecurrence["range"]): string => recurrenceText({ pattern, range });
  it("reads every pattern Graph returns", () => {
    expect(r({ type: "weekly", interval: 1, daysOfWeek: ["thursday", "tuesday"] }, { type: "endDate", endDate: "2026-12-18" })).toBe("Weekly on Tue, Thu until 2026-12-18");
    expect(r({ type: "weekly", interval: 2, daysOfWeek: ["monday"] }, { type: "noEnd" })).toBe("Every 2 weeks on Mon");
    expect(r({ type: "daily", interval: 1 })).toBe("Daily");
    expect(r({ type: "daily", interval: 3 }, { type: "numbered", numberOfOccurrences: 10 })).toBe("Every 3 days, 10 times");
    expect(r({ type: "absoluteMonthly", interval: 1, dayOfMonth: 15 })).toBe("Monthly on day 15");
    expect(r({ type: "relativeMonthly", interval: 1, index: "second", daysOfWeek: ["tuesday"] })).toBe("Monthly on the second Tue");
    expect(r({ type: "absoluteYearly", interval: 1, dayOfMonth: 3, month: 11 })).toBe("Yearly on 3 Nov");
    expect(r({ type: "relativeYearly", interval: 1, index: "last", daysOfWeek: ["friday"], month: 6 })).toBe("Yearly on the last Fri of Jun");
    expect(recurrenceText(undefined)).toBe("");
  });
});

describe("grouping and period", () => {
  it("puts series first by size, then one-offs by start; a renamed exception keeps the series subject", () => {
    const evs = [
      ev({ id: "o1", subject: "One-off", start: { dateTime: "2026-11-02T08:00:00" }, end: { dateTime: "2026-11-02T08:30:00" } }),
      ev({ id: "s1", type: "occurrence", seriesMasterId: "S", start: { dateTime: "2026-11-03T09:00:00" }, end: { dateTime: "2026-11-03T09:30:00" } }),
      ev({ id: "s2", type: "occurrence", seriesMasterId: "S", start: { dateTime: "2026-11-10T09:00:00" }, end: { dateTime: "2026-11-10T09:30:00" } }),
      ev({ id: "s3", type: "exception", seriesMasterId: "S", subject: "Ops review (moved)", start: { dateTime: "2026-11-17T09:00:00" }, end: { dateTime: "2026-11-17T09:30:00" } }),
    ];
    const { meetings } = normaliseAll(evs, { internalDomains: DOMAINS });
    const masters = new Map([["S", { pattern: { type: "weekly", interval: 1, daysOfWeek: ["tuesday"] } }]]);
    const groups = groupMeetings(meetings, masters);
    expect(groups.map((g) => [g.kind, g.subject, g.meetings.length])).toEqual([
      ["series", "Weekly ops review", 3],
      ["one-off", "One-off", 1],
    ]);
    expect(groups[0].recurrence).toBe("Weekly on Tue");
    expect(groupMeetings(meetings, new Map())[0].recurrence).toBe("Recurring");
  });

  it("allows 1 day to 12 months, refuses the rest", () => {
    expect(periodProblem("2026-11-03", "2026-11-03")).toBeNull();
    expect(periodProblem("2025-11-03", "2026-11-03")).toBeNull();
    expect(periodProblem("2025-11-01", "2026-11-03")).toMatch(/12 months/);
    expect(periodProblem("2026-11-04", "2026-11-03")).toMatch(/before/);
    expect(periodProblem("", "2026-11-03")).toMatch(/both/);
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-11-03", -12)).toBe("2025-11-03");
  });
});

describe("export", () => {
  function input(over: Partial<ExportInput> = {}): ExportInput {
    const evs = [
      ev({ id: "s1", type: "occurrence", seriesMasterId: "S", start: { dateTime: "2026-11-03T09:00:00" }, end: { dateTime: "2026-11-03T10:00:00" } }),
      ev({ id: "s2", type: "occurrence", seriesMasterId: "S", start: { dateTime: "2026-11-10T09:00:00" }, end: { dateTime: "2026-11-10T09:30:00" } }),
      ev({ id: "p1", subject: "HR matter", sensitivity: "private", start: { dateTime: "2026-11-04T14:00:00" }, end: { dateTime: "2026-11-04T15:00:00" }, body: { contentType: "text", content: "secret detail" } }),
      ev({ id: "x1", subject: "Unticked", start: { dateTime: "2026-11-05T14:00:00" }, end: { dateTime: "2026-11-05T15:00:00" } }),
    ];
    const { meetings, excluded } = normaliseAll(evs, { internalDomains: DOMAINS });
    const groups = groupMeetings(meetings, new Map([["S", { pattern: { type: "weekly", interval: 1, daysOfWeek: ["tuesday"] } }]]));
    return {
      groups,
      included: new Set(["s1", "s2", "p1"]),
      confidential: new Set(meetings.filter((m) => m.confidentialByDefault).map((m) => m.key)),
      excluded: { ...excluded, cancelled: 2 },
      period: { from: "2026-11-01", to: "2026-11-30" },
      timeZone: "Australia/Brisbane",
      internalDomains: DOMAINS,
      generatedAt: "2026-11-03T08:00:00Z",
      generatedBy: "Ben",
      appVersion: "test",
      road: "graph",
      ...over,
    };
  }

  it("masks a confidential meeting to timing only and leaves unticked meetings out", () => {
    const doc = buildExport(input());
    expect(doc.meetings.map((m) => m.meetingId + ":" + m.subject)).toEqual(["M1:Weekly ops review", "M2:" + CONFIDENTIAL_SUBJECT, "M3:Weekly ops review"]);
    const p = doc.meetings[1];
    expect(p).toMatchObject({ confidential: true, start: "2026-11-04T14:00", end: "2026-11-04T15:00", durationMinutes: 60, body: "", location: "", organizer: null, attendees: [], attendeeCount: null, sensitivity: "" });
    const text = exportJson(doc);
    expect(text).not.toContain("HR matter");
    expect(text).not.toContain("secret detail");
    expect(text).not.toContain("Unticked");
    expect(doc.about.counts).toMatchObject({ meetingsListed: 4, meetingsExported: 3, untickedByReviewer: 1, droppedCancelled: 2, confidential: 1, series: 1, oneOffs: 1, hoursExported: 2.5 });
  });

  it("builds series rows with ids, counts, hours and the typical duration", () => {
    const doc = buildExport(input());
    expect(doc.series).toEqual([
      expect.objectContaining({ seriesId: "S1", subject: "Weekly ops review", recurrence: "Weekly on Tue", occurrencesInPeriod: 2, hoursInPeriod: 1.5, typicalDurationMinutes: 45, firstInPeriod: "2026-11-03T09:00", lastInPeriod: "2026-11-10T09:00", distinctAttendees: 3 }),
    ]);
    expect(doc.meetings[0]).toMatchObject({ seriesId: "S1", kind: "recurring", attendeeCount: 3, internalCount: 2, externalCount: 1, recurrence: "Weekly on Tue" });
  });

  it("masks the whole series row when one exported occurrence is confidential, and unmasks when the flag is cleared", () => {
    const masked = buildExport(input({ confidential: new Set(["s2"]) }));
    expect(masked.series[0]).toMatchObject({ subject: CONFIDENTIAL_SUBJECT, confidential: true, organizer: null, distinctAttendees: null, recurrence: "Weekly on Tue" });
    const open = buildExport(input({ confidential: new Set() }));
    expect(open.meetings.find((m) => m.start === "2026-11-04T14:00")?.subject).toBe("HR matter");
  });

  it("writes the same content as a workbook that reads back, with no confidential detail", async () => {
    const doc = buildExport(input());
    const sheets = exportSheets(doc);
    expect(sheets.map((s) => s.name)).toEqual(["About", "Series", "Meetings", "Attendees"]);
    type Zlib = { inflateRawSync: (b: Uint8Array) => Uint8Array };
    const zlib = (await import(/* @vite-ignore */ "node:" + "zlib")) as unknown as Zlib;
    const back = await readXlsx(writeXlsx(sheets), async (d) => new Uint8Array(zlib.inflateRawSync(d)));
    const meetings = back.find((s) => s.name === "Meetings")!;
    expect(meetings.rows[0].slice(0, 5)).toEqual(["meetingId", "seriesId", "kind", "confidential", "subject"]);
    expect(meetings.rows.length).toBe(4);
    const flat = back.flatMap((s) => s.rows.flat()).join("|");
    expect(flat).not.toContain("HR matter");
    expect(flat).not.toContain("secret detail");
    const attendees = back.find((s) => s.name === "Attendees")!;
    expect(attendees.rows.length).toBe(1 + 4 + 4); // header + two exported series occurrences × 4; the masked one has none
  });
});
