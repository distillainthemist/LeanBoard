import { describe, expect, it } from "vitest";
import { NO_SEATS, needSeats, seatWords, waitingEmails } from "../docs/reviewerSeatsModel";

const P = (name: string, email: string) => ({ name, email });

// R1 walk, item 1 (2026-11-26): a reviewer may be anyone, but only the
// Owners & Approvers group and the controllers can open a draft.
describe("who needs a seat to review", () => {
  const insiders = ["olive@x.com", "CARL@x.com"];
  it("someone in the group, or a controller, needs none", () => {
    expect(needSeats([P("Olive", "Olive@x.com"), P("Carl", "carl@x.com")], insiders)).toEqual([]);
  });
  it("someone from outside does", () => {
    expect(needSeats([P("Olive", "olive@x.com"), P("Rita", "rita@x.com")], insiders)).toEqual([P("Rita", "rita@x.com")]);
  });
  it("one person named twice is seated once, and a reviewer with no email is left", () => {
    expect(needSeats([P("Rita", "rita@x.com"), P("Rita again", "RITA@x.com"), P("No mail", "")], insiders)).toEqual([P("Rita", "rita@x.com")]);
  });
  it("a name that is blank shows as the address", () => {
    expect(needSeats([P("", "sam@x.com")], insiders)).toEqual([P("sam@x.com", "sam@x.com")]);
  });
  it("nobody is seated on a guess when the group could not be read", () => {
    expect(needSeats([P("Rita", "rita@x.com")], null)).toEqual([]);
  });
});

describe("what the submit dialog says about seats", () => {
  it("says nothing when everyone could open the draft, or was let in", () => {
    expect(seatWords(NO_SEATS)).toBe("");
    expect(seatWords({ seated: [P("Rita", "rita@x.com")], requested: [], unable: "" })).toBe("");
  });
  it("names the reviewers the owner has been asked to let in", () => {
    expect(seatWords({ seated: [], requested: [P("Rita", "rita@x.com"), P("Sam", "sam@x.com")], unable: "" })).toBe(
      "Rita, Sam cannot open the draft yet: the document's owner has been asked to let them in, and they are told once that is done."
    );
  });
  it("carries the reason nobody could be seated", () => {
    expect(seatWords({ seated: [], requested: [], unable: "No editors group is set up." })).toBe("No editors group is set up.");
  });
  it("a reviewer still waiting is left out of the review-request card", () => {
    expect(waitingEmails({ seated: [P("A", "a@x.com")], requested: [P("Rita", "Rita@X.com")], unable: "" })).toEqual(["rita@x.com"]);
  });
});
