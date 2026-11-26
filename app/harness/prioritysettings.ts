// Settings → Priorities on the in-memory Dataverse (the seed of
// priorities.html): the pillar list by year — in 2027 a new sub-pillar
// can be said to FOLLOW one that ended in 2026.
import "../src/style.css";
import { detectHost } from "../src/runtime";
import { renderPrioritiesSettings } from "../src/priorities/settingsTab";
import { seed } from "./prioritiesSeed";

void (async () => {
  await detectHost();
  await seed();
  const save = document.getElementById("save") as HTMLButtonElement;
  const state = document.getElementById("state")!;
  let run: (() => Promise<void>) | null = null;
  save.addEventListener("click", () => {
    state.textContent = "Saving…";
    void run?.().then(() => (state.textContent = "Saved"));
  });
  await renderPrioritiesSettings(
    document.getElementById("host")!,
    { whoId: "u1", who: "O'Brien, Ben", email: "u1@example.test", site: "Weipa", department: "", area: "", role: "superadmin", active: true },
    {
      markDirty: () => {
        save.disabled = false;
        state.textContent = "Unsaved changes";
      },
      markClean: () => {
        save.disabled = true;
      },
      registerSave: (fn) => {
        run = fn;
      },
      isDirty: () => !save.disabled,
      saveCurrent: async () => {
        await run?.();
      },
    }
  );
})();
