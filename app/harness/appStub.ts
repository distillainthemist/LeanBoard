// Harness stand-in for "@microsoft/power-apps/app": a signed-in person,
// so `detectHost()` settles as hosted and the stores run against the
// in-memory Dataverse (dataverseStub.ts). `?as=<objectId>` signs in as
// someone else a page has seeded.
const as = new URLSearchParams(location.search).get("as") ?? "u1";
export async function getContext() {
  return {
    user: { objectId: as, fullName: as === "u1" ? "O'Brien, Ben" : as, userPrincipalName: `${as}@example.test`, tenantId: "harness" },
    app: { appId: "harness", environmentId: "harness", queryParams: {} as Record<string, string> },
  };
}
