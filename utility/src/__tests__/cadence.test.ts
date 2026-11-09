import { describe, expect, it } from "vitest";
import {
  addMonths,
  cleanBody,
  excludeReason,
  groupMeetings,
  hoursBefore,
  htmlToText,
  instantOf,
  isInternal,
  isShortNotice,
  minutesBetween,
  normalise,
  noticeText,
  toWall,
  normaliseAll,
  periodProblem,
  recurrenceText,
  wallClock,
  weekdayOf,
  type GraphEvent,
  type GraphRecurrence,
  type GraphSeriesMaster,
} from "../cadence/model";
import { buildExport, exportJson, exportSheets, CONFIDENTIAL_SUBJECT, type ExportInput } from "../cadence/exportDoc";
import { readXlsx, writeXlsx } from "../../../shared/export/xlsx";
import { parseTask, recipientProblem, relativePeriodText, taskLink, taskPeriod, taskPeriodText, taskProblem, summaryHtml, toBase64 } from "../cadence/share";

const DOMAINS = ["pecheydistilling.com"];
const ZONE = "Australia/Brisbane"; // UTC+10, no DST
const CTX = { internalDomains: DOMAINS, timeZone: ZONE };

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
    createdDateTime: "2026-10-27T22:00:00Z", // 2026-10-28T08:00 Brisbane: 145 h before the start
    lastModifiedDateTime: "2026-10-27T22:05:00Z",
    ...over,
  };
}

describe("dropping and flagging", () => {
  it("drops cancelled and declined meetings, keeps everything else", () => {
    expect(excludeReason(ev({ isCancelled: true }))).toBe("cancelled");
    expect(excludeReason(ev({ responseStatus: { response: "declined" } }))).toBe("declined");
    expect(excludeReason(ev({ responseStatus: { response: "tentativelyAccepted" } }))).toBeNull();
    const r = normaliseAll([ev({ id: "a" }), ev({ id: "b", isCancelled: true }), ev({ id: "c", responseStatus: { response: "declined" } }), ev({ id: "d", type: "seriesMaster" })], CTX);
    expect(r.meetings.map((m) => m.key)).toEqual(["a"]);
    expect(r.excluded).toEqual({ cancelled: 1, declined: 1 });
  });

  it("flags personal, private and confidential by default, not normal", () => {
    for (const s of ["personal", "private", "confidential"]) expect(normalise(ev({ sensitivity: s }), CTX).confidentialByDefault).toBe(true);
    expect(normalise(ev({ sensitivity: "normal" }), CTX).confidentialByDefault).toBe(false);
    expect(normalise(ev({ sensitivity: undefined }), CTX).confidentialByDefault).toBe(false);
  });
});

describe("normalise", () => {
  it("reads times as wall clock, with weekday and duration", () => {
    const m = normalise(ev(), CTX);
    expect(m.start).toBe("2026-11-03T09:00");
    expect(m.end).toBe("2026-11-03T10:30");
    expect(m.weekday).toBe("Tuesday");
    expect(m.durationMinutes).toBe(90);
    expect(m.kind).toBe("one-off");
    expect(wallClock(undefined)).toBe("");
    expect(minutesBetween("2026-11-03T00:00", "2026-11-05T00:00")).toBe(2880);
    expect(weekdayOf("2026-11-08")).toBe("Sunday");
  });

  it("lists the organizer once, as organizer, with roles, responses and internal flags — no directory lookup", () => {
    const m = normalise(ev(), CTX);
    expect(m.attendees.map((a) => [a.email, a.role, a.response, a.internal])).toEqual([
      ["ann@pecheydistilling.com", "organizer", "organizer", true],
      ["bob@pecheydistilling.com", "required", "accepted", true],
      ["cat@supplier.example", "optional", "tentativelyAccepted", false],
      ["room1@pecheydistilling.com", "resource", "accepted", true],
    ]);
    expect(Object.keys(m.attendees[1]).sort()).toEqual(["email", "internal", "name", "response", "role"]);
  });

  it("marks an occurrence recurring and keeps its series key", () => {
    const m = normalise(ev({ type: "occurrence", seriesMasterId: "S" }), CTX);
    expect(m.kind).toBe("recurring");
    expect(m.seriesKey).toBe("S");
  });

  it("reads internal by the domain and its sub-domains", () => {
    expect(isInternal("x@sub.pecheydistilling.com", DOMAINS)).toBe(true);
    expect(isInternal("x@notpecheydistilling.com", DOMAINS)).toBe(false);
  });
});

describe("notice given", () => {
  it("turns instants into the zone's wall clock and back, across a DST change", () => {
    expect(toWall("2026-10-27T22:00:00Z", ZONE)).toBe("2026-10-28T08:00");
    expect(toWall(undefined, ZONE)).toBe("");
    expect(toWall("not a time", ZONE)).toBe("");
    expect(instantOf("2026-10-28T08:00", ZONE)).toBe(Date.parse("2026-10-27T22:00:00Z"));
    // Auckland: NZDT (+13) after 2026-09-27, NZST (+12) before
    expect(instantOf("2026-11-03T09:00", "Pacific/Auckland")).toBe(Date.parse("2026-11-02T20:00:00Z"));
    expect(instantOf("2026-09-01T09:00", "Pacific/Auckland")).toBe(Date.parse("2026-08-31T21:00:00Z"));
    // the morning the clocks go forward: 03:00 NZDT is 14:00Z the day before
    expect(instantOf("2026-09-27T03:00", "Pacific/Auckland")).toBe(Date.parse("2026-09-26T14:00:00Z"));
    expect(toWall("2026-09-26T14:00:00Z", "Pacific/Auckland")).toBe("2026-09-27T03:00");
    expect(Number.isNaN(instantOf("", ZONE))).toBe(true);
    // an unknown zone falls back to UTC rather than throwing
    expect(toWall("2026-10-27T22:00:00Z", "Mars/Olympus")).toBe("2026-10-27T22:00");
    expect(instantOf("2026-10-27T22:00", "Mars/Olympus")).toBe(Date.parse("2026-10-27T22:00:00Z"));
  });

  it("counts hours of notice and flags under 24 h, negative when added afterwards", () => {
    expect(hoursBefore("2026-10-27T22:00:00Z", "2026-11-03T09:00", ZONE)).toBe(145);
    expect(hoursBefore("2026-11-03T05:30:00Z", "2026-11-03T09:00", ZONE)).toBe(-6.5);
    expect(hoursBefore(undefined, "2026-11-03T09:00", ZONE)).toBeNull();
    expect(hoursBefore("2026-11-03T05:30:00Z", "", ZONE)).toBeNull();
    expect(isShortNotice(23.9)).toBe(true);
    expect(isShortNotice(24)).toBe(false);
    expect(isShortNotice(-1)).toBe(true);
    expect(isShortNotice(null)).toBe(false);
    expect(noticeText(null)).toBe("");
    expect(noticeText(-2)).toBe("added after it started");
    expect(noticeText(0.4)).toBe("under 1 h notice");
    expect(noticeText(5.4)).toBe("5 h notice");
    expect(noticeText(47)).toBe("47 h notice");
    expect(noticeText(145)).toBe("6 d notice");
  });

  it("gives a one-off its invite's notice, an occurrence none, a moved occurrence the move's", () => {
    const one = normalise(ev(), CTX);
    expect(one).toMatchObject({ created: "2026-10-28T08:00", lastModified: "2026-10-28T08:05", noticeHours: 145, shortNotice: false });
    const late = normalise(ev({ createdDateTime: "2026-11-01T23:30:00Z" }), CTX); // 09:30 the day before
    expect(late).toMatchObject({ noticeHours: 23.5, shortNotice: true });
    const occ = normalise(ev({ type: "occurrence", seriesMasterId: "S" }), CTX);
    expect(occ).toMatchObject({ created: "2026-10-28T08:00", noticeHours: null, shortNotice: false });
    const moved = normalise(ev({ type: "exception", seriesMasterId: "S", lastModifiedDateTime: "2026-11-01T21:00:00Z" }), CTX); // 07:00 the day before
    expect(moved).toMatchObject({ noticeHours: 26, shortNotice: false });
    const none = normalise(ev({ createdDateTime: undefined, lastModifiedDateTime: undefined }), CTX);
    expect(none).toMatchObject({ created: "", lastModified: "", noticeHours: null, shortNotice: false });
  });

  it("reads a series' notice from its master: creation to the first meeting ever; null without the master", () => {
    const evs = [
      ev({ id: "s1", type: "occurrence", seriesMasterId: "S", start: { dateTime: "2026-11-03T09:00:00" }, end: { dateTime: "2026-11-03T09:30:00" } }),
      ev({ id: "o1", start: { dateTime: "2026-11-04T09:00:00" }, end: { dateTime: "2026-11-04T09:30:00" }, createdDateTime: "2026-11-03T22:00:00Z" }),
    ];
    const { meetings } = normaliseAll(evs, CTX);
    // created 2026-10-26T20:00Z = 06:00 on the 27th Brisbane, first meeting 09:00 that day: 3 h
    const master: GraphSeriesMaster = { createdDateTime: "2026-10-26T20:00:00Z", start: { dateTime: "2026-10-27T09:00:00.0000000", timeZone: ZONE } };
    const [series, oneOff] = groupMeetings(meetings, new Map([["S", master]]), CTX);
    expect(series).toMatchObject({ kind: "series", created: "2026-10-27T06:00", firstStart: "2026-10-27T09:00", noticeHours: 3, shortNotice: true });
    expect(oneOff).toMatchObject({ kind: "one-off", created: "2026-11-04T08:00", firstStart: "2026-11-04T09:00", noticeHours: 1, shortNotice: true });
    const [bare] = groupMeetings(meetings, new Map(), CTX);
    // the occurrence's inherited created time stands in, but no first start means no notice
    expect(bare).toMatchObject({ created: "2026-10-28T08:00", firstStart: "", noticeHours: null, shortNotice: false });
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
    const { meetings } = normaliseAll(evs, CTX);
    const masters = new Map<string, GraphSeriesMaster>([["S", { recurrence: { pattern: { type: "weekly", interval: 1, daysOfWeek: ["tuesday"] } } }]]);
    const groups = groupMeetings(meetings, masters, CTX);
    expect(groups.map((g) => [g.kind, g.subject, g.meetings.length])).toEqual([
      ["series", "Weekly ops review", 3],
      ["one-off", "One-off", 1],
    ]);
    expect(groups[0].recurrence).toBe("Weekly on Tue");
    expect(groupMeetings(meetings, new Map(), CTX)[0].recurrence).toBe("Recurring");
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
    const { meetings, excluded } = normaliseAll(evs, CTX);
    const groups = groupMeetings(
      meetings,
      new Map<string, GraphSeriesMaster>([
        ["S", { recurrence: { pattern: { type: "weekly", interval: 1, daysOfWeek: ["tuesday"] } }, createdDateTime: "2026-10-26T20:00:00Z", start: { dateTime: "2026-10-27T09:00:00.0000000", timeZone: ZONE } }],
      ]),
      CTX
    );
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
    // notice is timing, so a masked meeting keeps it: created 2026-10-28T08:00 → start 14:00 on the 4th = 174 h
    expect(p).toMatchObject({ created: "2026-10-28T08:00", lastModified: "2026-10-28T08:05", noticeHours: 174, shortNotice: false });
    expect(doc.about.counts).toMatchObject({ shortNoticeMeetings: 0, shortNoticeSeries: 1 });
    expect(doc.about.fields.noticeHours).toContain("Hours of notice");
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
    // the series' own notice: created 06:00 on 2026-10-27 Brisbane for a 09:00 first meeting
    expect(doc.series[0]).toMatchObject({ created: "2026-10-27T06:00", firstStart: "2026-10-27T09:00", noticeHours: 3, shortNotice: true });
    expect(doc.meetings[0]).toMatchObject({ noticeHours: null, shortNotice: false });
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
    expect(meetings.rows[0]).toEqual(expect.arrayContaining(["created", "lastModified", "noticeHours", "shortNotice"]));
    expect(back.find((s) => s.name === "Series")!.rows[0]).toEqual(expect.arrayContaining(["created", "firstStart", "noticeHours", "shortNotice"]));
    expect(meetings.rows.length).toBe(4);
    const flat = back.flatMap((s) => s.rows.flat()).join("|");
    expect(flat).not.toContain("HR matter");
    expect(flat).not.toContain("secret detail");
    const attendees = back.find((s) => s.name === "Attendees")!;
    expect(attendees.rows.length).toBe(1 + 4 + 4); // header + two exported series occurrences × 4; the masked one has none
  });

  it("writes the email summary built from the export: figures, series by hours, masking as the file", () => {
    const html = summaryHtml(buildExport(input()), { note: "For the <ops> review" });
    expect(html).toContain("from Ben");
    expect(html).toContain("2026-11-01 to 2026-11-30");
    expect(html).toContain("3 meetings exported: 1 recurring series and 1 one-off, 2.5 h in all");
    expect(html).toContain("1 confidential");
    expect(html).toContain("1 on short notice (under 24 h)");
    expect(html).toContain("<td>Weekly ops review</td><td>Weekly on Tue</td><td>2</td><td>1.5</td>");
    expect(html).toContain("For the &lt;ops&gt; review");
    expect(html).not.toContain("HR matter");
    expect(html).not.toContain("secret detail");
    const masked = summaryHtml(buildExport(input({ confidential: new Set(["s2"]) })));
    expect(masked).toContain(`<td>${CONFIDENTIAL_SUBJECT}</td>`);
    expect(masked).not.toContain("Weekly ops review");
  });
});

describe("task link", () => {
  const host = { appId: "app-1", environmentId: "env-1", tenantId: "ten-1" };
  const task = { months: -3, sendTo: "Ann@PecheyDistilling.com", note: "Q4 cadence" };

  it("builds a player link that parses back to the same task", () => {
    const url = taskLink(task, host);
    expect(url.startsWith("https://apps.powerapps.com/play/e/env-1/app/app-1?tenantId=ten-1&")).toBe(true);
    const q = Object.fromEntries(new URL(url).searchParams);
    expect(parseTask(q, "")).toEqual({ months: -3, sendTo: "ann@pecheydistilling.com", note: "Q4 cadence" });
    // case-blind host keys; the page query as the mobile road
    expect(parseTask({ UTOOL: "Cadence", UMONTHS: "1", USENDTO: "bob@pecheydistilling.com" }, "")).toEqual({ months: 1, sendTo: "bob@pecheydistilling.com", note: "" });
    expect(parseTask({}, "?utool=cadence&umonths=-12&usendto=bob%40pecheydistilling.com")?.months).toBe(-12);
    expect(taskLink(task, null, "http://localhost:5181/index.html#/x")).toBe("http://localhost:5181/index.html?utool=cadence&umonths=-3&usendto=ann%40pecheydistilling.com&unote=Q4+cadence");
  });

  it("carries fixed dates instead of the relative period when both are set", () => {
    const fixed = { months: -1, from: "2026-10-01", to: "2026-10-31", sendTo: "ann@pecheydistilling.com", note: "" };
    const url = taskLink(fixed, host);
    const q = Object.fromEntries(new URL(url).searchParams);
    expect(q).toMatchObject({ ufrom: "2026-10-01", uto: "2026-10-31" });
    expect(q.umonths).toBeUndefined();
    const back = parseTask(q, "")!;
    expect(taskPeriod(back, "2026-11-05")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(taskPeriodText(back)).toBe("2026-10-01 to 2026-10-31");
    expect(taskPeriod({ months: -3, sendTo: "a@b.com", note: "" }, "2026-11-05")).toEqual({ from: "2026-08-05", to: "2026-11-05" });
    expect(taskPeriod({ months: 2, sendTo: "a@b.com", note: "" }, "2026-11-05")).toEqual({ from: "2026-11-05", to: "2027-01-05" });
    // the screen's rules: one date alone, inverted, or over 12 months is refused
    expect(parseTask({ utool: "cadence", ufrom: "2026-10-01", usendto: "a@b.com" }, "")).toBeNull();
    expect(parseTask({ utool: "cadence", ufrom: "2026-10-31", uto: "2026-10-01", usendto: "a@b.com" }, "")).toBeNull();
    expect(parseTask({ utool: "cadence", ufrom: "2025-01-01", uto: "2026-10-01", usendto: "a@b.com" }, "")).toBeNull();
    expect(taskProblem({ ...fixed, to: "2026-09-01" }, DOMAINS)).toMatch(/before/);
  });

  it("refuses a link that does not hold together", () => {
    expect(parseTask({}, "")).toBeNull();
    expect(parseTask({ utool: "other", usendto: "a@b.com" }, "")).toBeNull();
    expect(parseTask({ utool: "cadence", umonths: "13", usendto: "a@b.com" }, "")).toBeNull();
    expect(parseTask({ utool: "cadence", umonths: "0", usendto: "a@b.com" }, "")).toBeNull();
    expect(parseTask({ utool: "cadence", usendto: "not-an-email" }, "")).toBeNull();
    expect(parseTask({ utool: "cadence", usendto: "a@b.com" }, "")?.months).toBe(-1); // default: last month
  });

  it("sends only to people inside the organisation, and never to yourself", () => {
    expect(recipientProblem("bob@pecheydistilling.com", DOMAINS, "ben@pecheydistilling.com")).toBeNull();
    expect(recipientProblem("bob@ops.pecheydistilling.com", DOMAINS)).toBeNull();
    expect(recipientProblem("cat@supplier.example", DOMAINS)).toMatch(/Only people in/);
    expect(recipientProblem("Ben@PecheyDistilling.com", DOMAINS, "ben@pecheydistilling.com")).toMatch(/That is you/);
    expect(recipientProblem("", DOMAINS)).toMatch(/Enter/);
    expect(taskProblem({ months: -1, sendTo: "bob@pecheydistilling.com", note: "x".repeat(301) }, DOMAINS)).toMatch(/note/);
    expect(relativePeriodText(-1)).toBe("the last month");
    expect(relativePeriodText(3)).toBe("the next 3 months");
  });

  it("encodes attachment bytes as base64, across chunk boundaries", () => {
    const big = new Uint8Array(70000).map((_, i) => i % 251);
    const back = Uint8Array.from(atob(toBase64(big)), (c) => c.charCodeAt(0));
    expect(back).toEqual(big);
    expect(toBase64(new TextEncoder().encode("{}"))).toBe("e30=");
  });
});
