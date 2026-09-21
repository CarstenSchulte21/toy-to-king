// Gespeicherte Spielstände prüfen und – wenn sich das Format ändert – auf die neue Version bringen.
import type { GameContent } from "./content-schema";
import { SCHEMA_VERSION, gameStateSchema, type GameState } from "./state";

export class SaveFormatError extends Error {}

// Jede Stufe baut einen Spielstand eine Version weiter. Neue Versionen kommen hier als weitere Stufe dazu.
const STEPS: Record<number, (s: Record<string, unknown>, content?: GameContent) => Record<string, unknown>> =
  {
    // v1 → v2 (M3): Tasche mit Startausrüstung, noch keine Werke.
    1: (s, content) => ({
      ...s,
      schemaVersion: 2,
      items: { ...(content?.config.start_items ?? {}) },
      works: {},
    }),
  };

export function migrate(saved: unknown, content?: GameContent): GameState {
  if (typeof saved !== "object" || saved === null || !("schemaVersion" in saved)) {
    throw new SaveFormatError("Spielstand hat kein schemaVersion-Feld.");
  }
  let current = saved as Record<string, unknown>;
  while (current.schemaVersion !== SCHEMA_VERSION) {
    const version = current.schemaVersion;
    const step = typeof version === "number" ? STEPS[version] : undefined;
    if (!step) throw new SaveFormatError(`Unbekannte Spielstand-Version ${String(version)}.`);
    current = step(current, content);
  }
  const parsed = gameStateSchema.safeParse(current);
  if (!parsed.success) throw new SaveFormatError("Spielstand ist beschädigt.");
  return parsed.data;
}

// Inhalte ändern sich während der Entwicklung. Steht ein Spielstand in einem Room,
// den es nicht mehr gibt, geht es im Start-Room weiter statt mit einem Fehler.
export function fitToContent(state: GameState, content: GameContent): GameState {
  let next = state;
  if (!content.rooms[next.room]) next = { ...next, room: content.config.start_room };
  // Infos, die aus dem Inhalt gestrichen wurden, verschwinden auch aus dem Blackbook.
  const known = Object.keys(next.facts).filter((f) => content.facts[f]);
  if (known.length !== Object.keys(next.facts).length) {
    next = { ...next, facts: Object.fromEntries(known.map((f) => [f, next.facts[f]!])) };
  }
  // Dasselbe für Werke an Spots, die es nicht mehr gibt.
  const spots = Object.keys(next.works).filter((s) => content.spots[s]);
  if (spots.length !== Object.keys(next.works).length) {
    next = { ...next, works: Object.fromEntries(spots.map((s) => [s, next.works[s]!])) };
  }
  return next;
}
