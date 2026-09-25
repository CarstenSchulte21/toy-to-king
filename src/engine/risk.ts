// Risiko (M4b): Zeit, Heat, Wanted, Erwischtwerden, Buff und Crossen.
// Reines TypeScript, keine Zufallsquelle von außen: Gewürfelt wird aus einer Saat,
// damit jeder Durchlauf reproduzierbar und testbar bleibt.
import type { GameContent, Spot, Weekday } from "./content-schema";
import { WEEKDAYS } from "./content-schema";
import type { GameState } from "./state";

export const PHASE_COUNT = 3;

// Zeit vergeht durch alles, was man tut – nicht nur durchs Malen. Ein Tag ist eine feste Zahl
// von Schritten; welches Drittel man gerade ist, ergibt Tag, Abend oder Nacht.
const DEFAULT_TIME = { steps_per_day: 12, room: 1, travel: 2, talk: 1, work: 3, marker: 1 };

export function timeRules(content: GameContent): typeof DEFAULT_TIME {
  return content.risk?.time ?? DEFAULT_TIME;
}

export type TimeCost = "room" | "travel" | "talk" | "work" | "marker";

export function costOf(content: GameContent, what: TimeCost): number {
  return timeRules(content)[what];
}

export function stepsPerDay(content: GameContent): number {
  return timeRules(content).steps_per_day;
}

export function phaseOfStep(step: number, perDay: number): number {
  return Math.min(PHASE_COUNT - 1, Math.max(0, Math.floor((step * PHASE_COUNT) / perDay)));
}

/** Wie viele Schritte der Tag noch hergibt. */
export function stepsLeft(state: GameState, content: GameContent): number {
  return Math.max(0, stepsPerDay(content) - (state.step ?? 0));
}

/** Tag 1 ist ein Montag. */
export function weekdayOf(day: number): Weekday {
  return WEEKDAYS[(day - 1) % 7]!;
}

export function phaseName(content: GameContent, phase: number): string {
  return content.risk?.phases[phase] ?? `Abschnitt ${phase + 1}`;
}

export function weekdayName(content: GameContent, day: number): string {
  const index = (day - 1) % 7;
  return content.risk?.weekdays[index] ?? WEEKDAYS[index]!;
}

export function heatOf(state: GameState, spotId: string): number {
  return state.heat?.[spotId] ?? 0;
}

export function heatLabel(content: GameContent, level: number): string {
  return content.risk?.heat_labels[Math.min(3, Math.max(0, level))] ?? `Heat ${level}`;
}

export function wantedLabel(content: GameContent, level: number): string {
  return content.risk?.wanted_labels[Math.min(3, Math.max(0, level))] ?? `Wanted ${level}`;
}

/** Deterministischer Wurf aus Saat und Stichwort: gleiche Eingabe, gleicher Wert. */
export function roll(seed: number, salt: string): number {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export type RiskView = { chance: number; level: number; label: string };

/**
 * Wie wahrscheinlich ist ein Zwischenfall an diesem Spot – mit dem aktuellen Heat,
 * dem eigenen Wanted und zur aktuellen Tageszeit? `slowShare` (0…1) ist der Anteil der
 * Zeit, den man beim Nachfahren gebraucht hat: Wer trödelt, wird eher gesehen.
 */
export function riskFor(
  content: GameContent,
  state: GameState,
  spot: Spot,
  slowShare = 0,
): RiskView {
  const rules = content.risk;
  if (!rules) return { chance: 0, level: 0, label: "" };
  const base = rules.base[spot.type] ?? 0;
  if (base <= 0) return { chance: 0, level: 0, label: rules.risk_labels[0]! };

  const phase = Math.min(PHASE_COUNT - 1, Math.max(0, state.phase ?? 0));
  const chance = Math.max(
    0,
    Math.min(
      rules.cap,
      base +
        rules.per_heat * heatOf(state, spot.id) +
        rules.per_wanted * (state.wanted ?? 0) +
        (rules.per_phase[phase] ?? 0) +
        rules.slow_max * Math.min(1, Math.max(0, slowShare)),
    ),
  );
  // Vier Stufen für die Anzeige: unter 15 %, unter 35 %, unter 60 %, darüber.
  const level = chance < 0.15 ? 0 : chance < 0.35 ? 1 : chance < 0.6 ? 2 : 3;
  return { chance, level, label: rules.risk_labels[level]! };
}

export type Outcome = "clean" | "escaped" | "caught";

/** Zwei von drei Zwischenfällen enden im knappen Entkommen, einer im Erwischtwerden. */
export function rollOutcome(content: GameContent, chance: number, seed: number): Outcome {
  if (chance <= 0) return "clean";
  if (roll(seed, "incident") >= chance) return "clean";
  const caughtShare = content.risk?.caught_share ?? 1 / 3;
  return roll(seed, "caught") < caughtShare ? "caught" : "escaped";
}

/** Nächster Abschnitt. Nach der Nacht beginnt der nächste Tag. */
/** Zeit vergehen lassen. Läuft der Tag dabei über, beginnt der nächste. */
export function advanceTime(state: GameState, content: GameContent, cost: number): GameState {
  if (cost <= 0) return state;
  const perDay = stepsPerDay(content);
  let step = (state.step ?? 0) + cost;
  let day = state.day ?? 1;
  while (step >= perDay) {
    step -= perDay;
    day += 1;
  }
  return { ...state, day, step, phase: phaseOfStep(step, perDay) };
}

/** Der nächste Morgen – nach dem Erwischtwerden oder beim Untertauchen. */
export function nextMorning(state: GameState): GameState {
  return { ...state, day: (state.day ?? 1) + 1, step: 0, phase: 0 };
}

export function isLastPhase(state: GameState): boolean {
  return (state.phase ?? 0) >= PHASE_COUNT - 1;
}

export type DayTurn = { state: GameState; buffed: string[]; crossed: string[] };

/**
 * Was über Nacht passiert: Heat kühlt ab, die Stadt bufft, und NOX crosst, was schlecht ist.
 * Wird für jeden übersprungenen Tag einmal ausgeführt.
 */
export function turnOfDay(state: GameState, content: GameContent, day: number): DayTurn {
  const rules = content.risk;
  if (!rules) return { state, buffed: [], crossed: [] };

  // Heat kühlt ab
  const heat: Record<string, number> = {};
  for (const [spotId, value] of Object.entries(state.heat ?? {})) {
    const next = Math.max(0, value - rules.heat_decay);
    if (next > 0) heat[spotId] = next;
  }

  const buffed: string[] = [];
  const crossed: string[] = [];
  const works = { ...state.works };
  const weekday = weekdayOf(day);

  for (const [spotId, work] of Object.entries(state.works)) {
    const spot = content.spots[spotId];
    if (!spot) continue;
    const seed = day * 1000 + spotId.length;

    // Buff: an einem festen Wochentag sicher, sonst je nach Spot-Typ mit kleiner Chance.
    const weeklyBuff = rules.buff_weekday && rules.buff_weekday.day === weekday && rules.buff_weekday.type === spot.type;
    const buffChance = weeklyBuff ? 1 : (rules.buff_per_day[spot.type] ?? 0);
    if (buffChance > 0 && roll(seed, `buff:${spotId}`) < buffChance) {
      delete works[spotId];
      delete heat[spotId];
      buffed.push(spotId);
      continue;
    }
    // Crossen: nur, was schlecht ist. Über ein gutes Werk malt keiner.
    if (work.quality <= rules.cross_max_quality && roll(seed, `cross:${spotId}`) < rules.cross_per_day) {
      delete works[spotId];
      crossed.push(spotId);
    }
  }

  return { state: { ...state, heat, works }, buffed, crossed };
}

/** Alle Tageswechsel zwischen zwei Ständen abarbeiten. */
export function passDays(state: GameState, content: GameContent, fromDay: number): DayTurn {
  let current = state;
  const buffed: string[] = [];
  const crossed: string[] = [];
  for (let day = fromDay + 1; day <= (state.day ?? 1); day++) {
    const turn = turnOfDay(current, content, day);
    current = turn.state;
    buffed.push(...turn.buffed);
    crossed.push(...turn.crossed);
  }
  return { state: current, buffed, crossed };
}

export function bumpHeat(state: GameState, spotId: string, by: number): GameState {
  const next = Math.min(3, heatOf(state, spotId) + by);
  if (next === heatOf(state, spotId)) return state;
  return { ...state, heat: { ...(state.heat ?? {}), [spotId]: next } };
}

export function setWanted(state: GameState, value: number): GameState {
  const next = Math.min(3, Math.max(0, value));
  if (next === (state.wanted ?? 0)) return state;
  return { ...state, wanted: next };
}
