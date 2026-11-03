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
  return {
    level: "10",
    completedStep: 0,
    protocol: "mapa",
    journeyStep: 0,
    theme: "dark",
  };
}

/**
 * Turns whatever was stored into a valid AppState.
 *
 * Journey states:
 * 0 = starting point
 * 1 = rhythm selection
 * 2 = encounter
 * 3 = completed encounter during the current flow
 *
 * A finished encounter is never restored as completed.
 * It returns to the starting point with no journey stage marked as done.
 */
export function normalizeState(
  raw: unknown,
  stepCount: StepCounter,
): AppState {
  const fallback = defaultState();

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const parsed = raw as Record<string, unknown>;

  const level: Level =
    parsed.level === "2" ||
    parsed.level === "10" ||
    parsed.level === "calma"
      ? parsed.level
      : fallback.level;

  const protocol: Protocol =
    parsed.protocol === "alivio" ||
    parsed.protocol === "mapa" ||
    parsed.protocol === "constrangimento" ||
    parsed.protocol === "proximo"
      ? parsed.protocol
      : fallback.protocol;

  let completedStep =
    typeof parsed.completedStep === "number"
      ? Math.max(0, parsed.completedStep)
      : 0;

  let journeyStep =
    typeof parsed.journeyStep === "number"
      ? Math.max(0, Math.min(3, parsed.journeyStep))
      : 0;

  const totalSteps = stepCount(level, protocol);

  /*
   * A finished encounter is never restored as completed.
   * It returns to the beginning of the journey.
   */
  if (completedStep >= totalSteps) {
    completedStep = 0;
    journeyStep = 0;
  }

  /*
   * If there are completed encounter steps, the person is
   * still in the encounter stage.
   */
  if (completedStep > 0) {
    journeyStep = 2;
  }

  /*
   * No encounter steps completed means that no stage can be
   * shown as completed or as an encounter in progress.
   */
  if (completedStep === 0 && journeyStep >= 2) {
    journeyStep = journeyStep === 1 ? 1 : 0;
  }

  return {
    level,
    completedStep,
    protocol,
    journeyStep,
    theme: parsed.theme === "light" ? "light" : "dark",
  };
}

/** True when the person left in the middle of an encounter. */
export function hasEncounterInProgress(
  state: AppState,
  totalSteps: number,
): boolean {
  return (
    state.journeyStep >= 2 &&
    state.completedStep > 0 &&
    state.completedStep < totalSteps
  );
}

/**
 * Closes the encounter without keeping any journey stage marked
 * as completed or in progress.
 */
export function closeEncounter(state: AppState): AppState {
  return {
    ...state,
    completedStep: 0,
    journeyStep: 0,
  };
}

/** Starts a new encounter with the same preferences. */
/** Restarts the journey from the beginning with no stage selected. */
export function startNewEncounter(state: AppState): AppState {
  return {
    ...state,
    completedStep: 0,
    journeyStep: 0,
  };
}