// Bedingungen, Effekte und Texte – die Bausteine, aus denen die Spielregeln bestehen.
// Jeder Bedingungs- und Effekttyp ist ein eigener Fall im switch. Neue Typen kommen als weiterer Fall dazu.
import type { Condition, Effect, GameContent, Hotspot, Room, TextVariants } from "./content-schema";
import type { GameState } from "./state";

// Kontext: Welcher NPC ist im Gespräch? Nötig für "trust_min: 2" und "trust: 1" ohne Namen.
export type Ctx = { content: GameContent; npc?: string };

export const MAX_TRUST = 5;

// Aktuelles Vertrauen eines NPC – solange nichts passiert ist, der Startwert aus dem Inhalt.
export function trustOf(state: GameState, content: GameContent, npcId: string): number {
  const stored = state.trust[npcId];
  if (stored !== undefined) return stored;
  const npc = content.npcs[npcId];
  return npc && npc.trust !== false ? npc.trust.start : 0;
}

export function evaluateCondition(condition: Condition, state: GameState, ctx: Ctx): boolean {
  if ("flag" in condition) return state.flags[condition.flag] === true;
  if ("not_flag" in condition) return state.flags[condition.not_flag] !== true;
  if ("visited" in condition) return state.visited.includes(condition.visited);
  if ("fact" in condition) return state.facts[condition.fact] !== undefined;
  if ("not_fact" in condition) return state.facts[condition.not_fact] === undefined;
  if ("has" in condition) return (state.items[condition.has] ?? 0) > 0;
  if ("sprayed" in condition) return state.works[condition.sprayed] !== undefined;
  if ("trust_min" in condition) {
    const t = condition.trust_min;
    const npc = typeof t === "number" ? ctx.npc : t.npc;
    const value = typeof t === "number" ? t : t.value;
    return npc !== undefined && trustOf(state, ctx.content, npc) >= value;
  }
  return false;
}

// Alle Bedingungen müssen erfüllt sein (UND). Keine Bedingungen = erfüllt.
export function evaluateAll(conditions: Condition[] | undefined, state: GameState, ctx: Ctx): boolean {
  return (conditions ?? []).every((c) => evaluateCondition(c, state, ctx));
}

export function applyEffect(state: GameState, effect: Effect, ctx: Ctx): GameState {
  if ("set_flag" in effect) {
    if (state.flags[effect.set_flag]) return state;
    return { ...state, flags: { ...state.flags, [effect.set_flag]: true } };
  }
  if ("clear_flag" in effect) {
    if (!state.flags[effect.clear_flag]) return state;
    const flags = { ...state.flags };
    delete flags[effect.clear_flag];
    return { ...state, flags };
  }
  if ("learn" in effect) {
    // Einmal gelernt bleibt gelernt – und gilt nur beim ersten Mal als neu.
    if (state.facts[effect.learn]) return state;
    return { ...state, facts: { ...state.facts, [effect.learn]: { new: true } } };
  }
  if ("give" in effect) {
    return { ...state, items: { ...state.items, [effect.give]: (state.items[effect.give] ?? 0) + 1 } };
  }
  if ("trust" in effect) {
    const npcId = ctx.npc;
    const npc = npcId ? ctx.content.npcs[npcId] : undefined;
    if (!npcId || !npc || npc.trust === false) return state;
    const current = trustOf(state, ctx.content, npcId);
    const next = Math.min(MAX_TRUST, Math.max(0, current + effect.trust));
    if (next === current) return state;
    return { ...state, trust: { ...state.trust, [npcId]: next } };
  }
  return state;
}

export function applyEffects(state: GameState, effects: Effect[] | undefined, ctx: Ctx): GameState {
  return (effects ?? []).reduce((s, e) => applyEffect(s, e, ctx), state);
}

// Sucht die passende Textvariante: erste Variante, deren Bedingungen erfüllt sind (SPEC 4.3).
export function resolveText(
  variants: TextVariants | undefined,
  state: GameState,
  ctx: Ctx,
): { lines: string[]; effects: Effect[] } | null {
  if (variants === undefined) return null;
  if (typeof variants === "string") return { lines: [variants], effects: [] };
  if (variants.every((v): v is string => typeof v === "string")) return { lines: variants, effects: [] };
  for (const v of variants) {
    if (typeof v === "string") continue;
    if (evaluateAll(v.if, state, ctx)) {
      return { lines: typeof v.text === "string" ? [v.text] : v.text, effects: v.effects ?? [] };
    }
  }
  return null;
}

// Ersetzt {name} und {crew} durch die Namen des Spielers (SPEC 4.4).
export function renderText(text: string, state: GameState): string {
  return text.replace(/\{name\}/g, state.player.name).replace(/\{crew\}/g, state.player.crew ?? "");
}

export function isHotspotVisible(hotspot: Hotspot, state: GameState, content: GameContent): boolean {
  return evaluateAll(hotspot.if, state, { content });
}

export function visibleHotspots(room: Room, state: GameState, content: GameContent): Hotspot[] {
  return room.hotspots.filter((h) => isHotspotVisible(h, state, content));
}

// Alle sichtbaren Hotspots im ganzen Spiel als "room.hotspot" – für das Erkennen neu freigeschalteter Stellen.
export function visibleHotspotKeys(state: GameState, content: GameContent): Set<string> {
  const keys = new Set<string>();
  for (const room of Object.values(content.rooms)) {
    for (const h of visibleHotspots(room, state, content)) keys.add(`${room.id}.${h.id}`);
  }
  return keys;
}

export type Verb = "sprechen" | "sprühen" | "untersuchen" | "gehen";
export const VERB_LABELS: Record<Verb, string> = {
  sprechen: "Sprechen",
  sprühen: "Sprühen",
  untersuchen: "Untersuchen",
  gehen: "Gehen",
};

// Nur die Verben, die der Hotspot wirklich hat, landen im Menü.
export function availableVerbs(hotspot: Hotspot): Verb[] {
  const verbs: Verb[] = [];
  if (hotspot.sprechen !== undefined) verbs.push("sprechen");
  if (hotspot.sprühen !== undefined) verbs.push("sprühen");
  if (hotspot.untersuchen !== undefined) verbs.push("untersuchen");
  if (hotspot.gehen !== undefined) verbs.push("gehen");
  return verbs;
}

export function currentRoom(state: GameState, content: GameContent): Room | undefined {
  return content.rooms[state.room];
}

export function trustLabel(content: GameContent, level: number): string {
  return content.config.trust_labels?.[level] ?? `Vertrauen ${level}`;
}
