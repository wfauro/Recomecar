import { describe, expect, it } from "vitest";
import {
  closeEncounter,
  defaultState,
  hasEncounterInProgress,
  normalizeState,
  startNewEncounter,
  type AppState,
} from "./appState";

const threeSteps = () => 3;

describe("normalizeState", () => {
  it("returns the default state for missing or invalid data", () => {
    expect(normalizeState(null, threeSteps)).toEqual(defaultState());
    expect(normalizeState("x", threeSteps)).toEqual(defaultState());
    expect(normalizeState(undefined, threeSteps)).toEqual(defaultState());
  });

  it("falls back for unknown level and protocol", () => {
    const state = normalizeState({ level: "99", protocol: "nope" }, threeSteps);
    expect(state.level).toBe("10");
    expect(state.protocol).toBe("mapa");
  });

  it("restores an encounter in progress as it was", () => {
    const state = normalizeState({ level: "2", protocol: "alivio", completedStep: 1, journeyStep: 2, theme: "light" }, threeSteps);
    expect(state).toEqual({ level: "2", protocol: "alivio", completedStep: 1, journeyStep: 2, theme: "light" });
  });

  it("never restores a finished encounter as finished", () => {
    const state = normalizeState({ completedStep: 3, journeyStep: 3, theme: "light", level: "calma", protocol: "proximo" }, threeSteps);
    expect(state.completedStep).toBe(0);
    expect(state.journeyStep).toBe(0);
    expect(state.theme).toBe("light");
    expect(state.level).toBe("calma");
    expect(state.protocol).toBe("proximo");
  });

  it("drops lastVisitedAt so no absence can be computed", () => {
    const state = normalizeState({ completedStep: 1, journeyStep: 2, lastVisitedAt: 1 }, threeSteps);
    expect(Object.keys(state)).not.toContain("lastVisitedAt");
  });

  it("uses the step count of the stored level and protocol", () => {
    const counter = (level: string) => (level === "2" ? 2 : 3);
    expect(normalizeState({ level: "2", completedStep: 2, journeyStep: 3 }, counter).completedStep).toBe(0);
    expect(normalizeState({ level: "10", completedStep: 2, journeyStep: 2 }, counter).completedStep).toBe(2);
  });
});

describe("hasEncounterInProgress", () => {
  const base: AppState = { ...defaultState(), journeyStep: 2 };
  it("is true only between the first and the last step", () => {
    expect(hasEncounterInProgress({ ...base, completedStep: 0 }, 3)).toBe(false);
    expect(hasEncounterInProgress({ ...base, completedStep: 1 }, 3)).toBe(true);
    expect(hasEncounterInProgress({ ...base, completedStep: 2 }, 3)).toBe(true);
    expect(hasEncounterInProgress({ ...base, completedStep: 3, journeyStep: 3 }, 3)).toBe(false);
  });
  it("is false before the encounter is chosen", () => {
    expect(hasEncounterInProgress({ ...base, journeyStep: 1, completedStep: 1 }, 3)).toBe(false);
  });
});

describe("closeEncounter", () => {
  const finished: AppState = { level: "calma", protocol: "constrangimento", completedStep: 3, journeyStep: 3, theme: "light" };

  it("keeps theme, level and protocol", () => {
    const closed = closeEncounter(finished);
    expect(closed.theme).toBe("light");
    expect(closed.level).toBe("calma");
    expect(closed.protocol).toBe("constrangimento");
  });

  it("leaves nothing recorded as concluded or in progress", () => {
    const closed = closeEncounter(finished);
    expect(closed.completedStep).toBe(0);
    expect(closed.journeyStep).toBe(0);
    expect(hasEncounterInProgress(closed, 3)).toBe(false);
  });

  it("does not mutate its input", () => {
    const copy = { ...finished };
    closeEncounter(finished);
    expect(finished).toEqual(copy);
  });
});

describe("startNewEncounter", () => {
  it("restarts the steps and keeps preferences", () => {
    const next = startNewEncounter({
      level: "2",
      protocol: "alivio",
      completedStep: 2,
      journeyStep: 2,
      theme: "light",
    });

    expect(next).toEqual({
      level: "2",
      protocol: "alivio",
      completedStep: 0,
      journeyStep: 0,
      theme: "light",
    });
  });
});
