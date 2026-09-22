// Der Spielstand (SPEC 4.1) – alles, was gespeichert wird.
// Offene Textboxen und Menüs gehören NICHT hierher, die verwaltet die Oberfläche.
import { z } from "zod";
import type { GameContent } from "./content-schema";

export const SCHEMA_VERSION = 3;

const passKind = z.enum(["line", "fill", "outline"]);

// Farben eines Werks: Gegenstands-IDs der Dosen (kind "color").
export const workColorsSchema = z.object({
  line: z.string().optional(),
  fill: z.array(z.string()).max(2).optional(),
  outline: z.string().optional(),
});

// Ein Werk (ab v3): Sketch, Material und die Fingerbahnen je Ebene. Das Bild wird daraus berechnet.
export const workSchema = z.object({
  style: z.string(),
  colors: workColorsSchema,
  dose: z.string(),
  passes: z.array(z.object({ kind: passKind, cap: z.string(), strokes: z.array(z.array(z.number())) })),
  seed: z.number().int(),
  quality: z.number().int().min(0).max(3),
  at: z.string(),
  ideal: z.literal(true).optional(), // aus einem alten Spielstand übernommen: ohne Fehler zeichnen
});

export const sketchSchema = z.object({
  style: z.string(),
  colors: workColorsSchema,
  dose: z.string(),
  caps: z.record(z.string(), z.string()),
});

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
  works: z.record(z.string(), workSchema), // eigene Werke je Spot (ab v2, neues Format ab v3)
  lastSketch: sketchSchema.optional(), // zuletzt benutzter Sketch (ab v3)
  meta: z.object({ createdAt: z.string(), updatedAt: z.string(), playSeconds: z.number() }),
});

export type GameState = z.infer<typeof gameStateSchema>;
export type Work = z.infer<typeof workSchema>;
export type WorkColors = z.infer<typeof workColorsSchema>;
export type Sketch = z.infer<typeof sketchSchema>;

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
