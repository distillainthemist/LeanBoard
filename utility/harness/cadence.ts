// Screenshot harness for the Cadence Current State screens: a stub scan
// with a made-up calendar, no connector. Serve with `npx vite` from
// utility/ and open /harness/cadence.html.
import "../src/style.css";
import { parseTask } from "../src/cadence/share";
import { mountCadence } from "../src/cadence/screen";
import type { GraphEvent } from "../src/cadence/model";

const at = (day: number, h: number, m = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30 + day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};
const person = (name: string, address: string, type = "required", response = "accepted") => ({ type, status: { response }, emailAddress: { name, address } });
const team = [person("Ann Org", "ann@example.com"), person("Bob In", "bob@example.com"), person("Cat Out", "cat@supplier.test", "optional", "none")];

const events: GraphEvent[] = [];
for (let w = 0; w < 4; w++) {
  events.push({ id: `ops${w}`, subject: "Weekly operations review", type: "occurrence", seriesMasterId: "OPS", start: { dateTime: at(2 + w * 7, 9) }, end: { dateTime: at(2 + w * 7, 10) }, organizer: { emailAddress: { name: "Ann Org", address: "ann@example.com" } }, attendees: team, location: { displayName: "Boardroom" }, onlineMeetingProvider: "teamsForBusiness", sensitivity: "normal", responseStatus: { response: "accepted" } });
  for (const d of [0, 1, 2, 3, 4]) events.push({ id: `tier${w}${d}`, subject: "Tier 2 huddle", type: "occurrence", seriesMasterId: "TIER", start: { dateTime: at(d + w * 7, 8) }, end: { dateTime: at(d + w * 7, 8, 15) }, attendees: team.slice(0, 2), location: { displayName: "Floor board" }, sensitivity: "normal", responseStatus: { response: "accepted" } });
}
events.push({ id: "hr", subject: "Performance conversation", type: "singleInstance", start: { dateTime: at(10, 14) }, end: { dateTime: at(10, 15) }, sensitivity: "private", attendees: [person("Dan", "dan@example.com")], responseStatus: { response: "organizer" } });
events.push({ id: "sup", subject: "Supplier quarterly review", type: "singleInstance", start: { dateTime: at(12, 11) }, end: { dateTime: at(12, 12, 30) }, attendees: team, location: { displayName: "" }, onlineMeetingProvider: "teamsForBusiness", sensitivity: "normal", responseStatus: { response: "tentativelyAccepted" } });
events.push({ id: "gone", subject: "Cancelled sync", isCancelled: true, start: { dateTime: at(13, 9) }, end: { dateTime: at(13, 10) } });

mountCadence(document.getElementById("app")!, () => location.reload(), {
  viewer: { name: "Harness Person", upn: "me@example.com" },
  // ?utool=cadence&umonths=-3&usendto=boss@example.com plays a task link
  task: parseTask({}, location.search),
  mail: async (to, subject, html, files) => {
    (window as unknown as { sent: unknown[] }).sent = [...((window as unknown as { sent?: unknown[] }).sent ?? []), { to, subject, html, files: files.map((f) => `${f.name} ${f.content.length}`) }];
    await new Promise((r) => setTimeout(r, 300));
    return "";
  },
  scan: async (o) => {
    o.progress("Reading your calendar… 30 meetings so far");
    await new Promise((r) => setTimeout(r, 300));
    return {
      events,
      masters: new Map([
        ["OPS", { pattern: { type: "weekly", interval: 1, daysOfWeek: ["tuesday"] }, range: { type: "noEnd" } }],
        ["TIER", { pattern: { type: "weekly", interval: 1, daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"] }, range: { type: "noEnd" } }],
      ]),
      road: "graph",
      warnings: [],
    };
  },
});
