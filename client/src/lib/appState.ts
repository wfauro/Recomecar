export type Protocol = "alivio" | "mapa" | "constrangimento" | "proximo";
export type Level = "2" | "10" | "calma";
export type Theme = "dark" | "light";

export type AppState = {
  level: Level;
  completedStep: number;
  protocol: Protocol;
  journeyStep: number;
  theme: Theme;
};

/** Number of steps of the encounter for a given level/protocol. */
export type StepCounter = (level: Level, protocol: Protocol) => number;

export function defaultState(): AppState {
  return { level: "10", completedStep: 0, protocol: "mapa", journeyStep: 0, theme: "dark" };
}

/**
 * Turns whatever was stored into a valid AppState.
 *
 * Only an encounter in progress survives a reload. A finished encounter is
 * never restored as "finished": it comes back as a fresh encounter, so the app
 * keeps no record of past encounters. Stored fields that no longer exist
 * (e.g. lastVisitedAt) are dropped.
 */
export function normalizeState(raw: unknown, stepCount: StepCounter): AppState {
  const fallback = defaultState();
  if (!raw || typeof raw !== "object") return fallback;
  const parsed = raw as Record<string, unknown>;

  const level: Level = parsed.level === "2" || parsed.level === "10" || parsed.level === "calma" ? parsed.level : fallback.level;
  const protocol: Protocol =
    parsed.protocol === "alivio" || parsed.protocol === "mapa" || parsed.protocol === "constrangimento" || parsed.protocol === "proximo"
      ? parsed.protocol
      : fallback.protocol;
  let completedStep = typeof parsed.completedStep === "number" ? Math.max(0, parsed.completedStep) : 0;
  let journeyStep = typeof parsed.journeyStep === "number" ? Math.max(0, Math.min(3, parsed.journeyStep)) : 0;

  if (completedStep >= stepCount(level, protocol)) {
    completedStep = 0;
    journeyStep = Math.min(journeyStep, 2);
  }

  return { level, completedStep, protocol, journeyStep, theme: parsed.theme === "light" ? "light" : "dark" };
}

/** True when the person left in the middle of an encounter. */
export function hasEncounterInProgress(state: AppState, totalSteps: number): boolean {
  return state.journeyStep >= 2 && state.completedStep > 0 && state.completedStep < totalSteps;
}

/** Closes the encounter: nothing is kept as "concluded". Theme, level and protocol stay. */
export function closeEncounter(state: AppState): AppState {
  return { ...state, completedStep: 0, journeyStep: 1 };
}

/** Starts a new encounter with the same preferences. */
export function startNewEncounter(state: AppState): AppState {
  return { ...state, completedStep: 0, journeyStep: 2 };
}
