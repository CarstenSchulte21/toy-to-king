// Der Spielstand (SPEC 4.1) – alles, was gespeichert wird.
// Offene Textboxen und Menüs gehören NICHT hierher, die verwaltet die Oberfläche.
import { z } from "zod";
import type { GameContent } from "./content-schema";

export const SCHEMA_VERSION = 2;

export const gameStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  player: z.object({ name: z.string(), crew: z.string().nullable() }),
  room: z.string(),
  visited: z.array(z.string()),
  flags: z.record(z.string(), z.literal(true)),
  facts: z.record(z.string(), z.object({ new: z.boolean() })),
  trust: z.record(z.string(), z.number()),
  usedOnce: z.array(z.string()),
  newlyVisible: z.array(z.string()),
  items: z.record(z.string(), z.number()), // Tasche: Caps und Dosen (ab v2)
  works: z.record(
    z.string(),
    z.object({
      style: z.string(),
      cap: z.string(),
      dose: z.string(),
      quality: z.number().int().min(0).max(3),
      at: z.string(),
    }),
  ), // eigene Werke je Spot (ab v2)
  meta: z.object({ createdAt: z.string(), updatedAt: z.string(), playSeconds: z.number() }),
});

export type GameState = z.infer<typeof gameStateSchema>;
export type Work = GameState["works"][string];

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

// Regeln für Writer- und Crew-Namen (SPEC 4.4).
export function validatePlayerName(input: string): NameCheck {
  const name = input.trim();
  if (name.length < 2) return { ok: false, error: "Mindestens 2 Zeichen." };
  if (name.length > 16) return { ok: false, error: "Höchstens 16 Zeichen." };
  if (!/^[\p{L}\p{N}_-]+$/u.test(name)) {
    return { ok: false, error: "Nur Buchstaben, Ziffern, - und _. Keine Leerzeichen." };
  }
  return { ok: true, name };
}

// Startzustand für ein neues Spiel. Der Name muss vorher mit validatePlayerName geprüft sein.
export function createNewGame(content: GameContent, playerName: string, now: string): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    player: { name: playerName, crew: null },
    room: content.config.start_room,
    visited: [],
    flags: {},
    facts: {},
    trust: {},
    usedOnce: [],
    newlyVisible: [],
    items: { ...(content.config.start_items ?? {}) },
    works: {},
    meta: { createdAt: now, updatedAt: now, playSeconds: 0 },
  };
}
