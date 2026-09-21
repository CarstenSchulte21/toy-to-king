// Bedingungen, Effekte und Texte – die Bausteine, aus denen die Spielregeln bestehen.
// Jeder Bedingungs- und Effekttyp ist ein eigener Fall im switch. Neue Typen (M2: fact, trust …)
// kommen als weiterer Fall dazu, ohne den Rest umzubauen.
import type { Condition, Effect, GameContent, Hotspot, Room, TextVariants } from "./content-schema";
import type { GameState } from "./state";

// Welcher Schlüssel steckt in einer Bedingung wie { flag: "x" }?
function kindOf<T extends object>(item: T): keyof T {
  return Object.keys(item)[0] as keyof T;
}

export function evaluateCondition(condition: Condition, state: GameState): boolean {
  const kind = kindOf(condition);
  switch (kind) {
    case "flag":
      return state.flags[(condition as { flag: string }).flag] === true;
    case "not_flag":
      return state.flags[(condition as { not_flag: string }).not_flag] !== true;
    case "visited":
      return state.visited.includes((condition as { visited: string }).visited);
    default:
      return false;
  }
}

// Alle Bedingungen müssen erfüllt sein (UND). Keine Bedingungen = erfüllt.
export function evaluateAll(conditions: Condition[] | undefined, state: GameState): boolean {
  return (conditions ?? []).every((c) => evaluateCondition(c, state));
}

export function applyEffect(state: GameState, effect: Effect): GameState {
  const kind = kindOf(effect);
  switch (kind) {
    case "set_flag": {
      const flag = (effect as { set_flag: string }).set_flag;
      if (state.flags[flag]) return state;
      return { ...state, flags: { ...state.flags, [flag]: true } };
    }
    case "clear_flag": {
      const flag = (effect as { clear_flag: string }).clear_flag;
      if (!state.flags[flag]) return state;
      const flags = { ...state.flags };
      delete flags[flag];
      return { ...state, flags };
    }
    default:
      return state;
  }
}

export function applyEffects(state: GameState, effects: Effect[] | undefined): GameState {
  return (effects ?? []).reduce(applyEffect, state);
}

// Sucht die passende Textvariante: erste Variante, deren Bedingungen erfüllt sind (SPEC 4.3).
export function resolveText(
  variants: TextVariants | undefined,
  state: GameState,
): { lines: string[]; effects: Effect[] } | null {
  if (variants === undefined) return null;
  if (typeof variants === "string") return { lines: [variants], effects: [] };
  if (variants.every((v): v is string => typeof v === "string")) return { lines: variants, effects: [] };
  for (const v of variants) {
    if (typeof v === "string") continue;
    if (evaluateAll(v.if, state)) {
      return { lines: typeof v.text === "string" ? [v.text] : v.text, effects: v.effects ?? [] };
    }
  }
  return null;
}

// Ersetzt {name} und {crew} durch die Namen des Spielers (SPEC 4.4).
export function renderText(text: string, state: GameState): string {
  return text.replace(/\{name\}/g, state.player.name).replace(/\{crew\}/g, state.player.crew ?? "");
}

export function isHotspotVisible(hotspot: Hotspot, state: GameState): boolean {
  return evaluateAll(hotspot.if, state);
}

export function visibleHotspots(room: Room, state: GameState): Hotspot[] {
  return room.hotspots.filter((h) => isHotspotVisible(h, state));
}

export type Verb = "untersuchen" | "gehen";
export const VERB_LABELS: Record<Verb, string> = { untersuchen: "Untersuchen", gehen: "Gehen" };

// Nur die Verben, die der Hotspot wirklich hat, landen im Menü.
export function availableVerbs(hotspot: Hotspot): Verb[] {
  const verbs: Verb[] = [];
  if (hotspot.untersuchen !== undefined) verbs.push("untersuchen");
  if (hotspot.gehen !== undefined) verbs.push("gehen");
  return verbs;
}

export function currentRoom(state: GameState, content: GameContent): Room | undefined {
  return content.rooms[state.room];
}
