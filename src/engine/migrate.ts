// Gespeicherte Spielstände prüfen und – wenn sich das Format ändert – auf die neue Version bringen.
import type { GameContent } from "./content-schema";
import { SCHEMA_VERSION, gameStateSchema, type GameState } from "./state";

export class SaveFormatError extends Error {}

export function migrate(saved: unknown): GameState {
  if (typeof saved !== "object" || saved === null || !("schemaVersion" in saved)) {
    throw new SaveFormatError("Spielstand hat kein schemaVersion-Feld.");
  }
  const version = (saved as { schemaVersion: unknown }).schemaVersion;
  // Künftige Versionen: hier Schritt für Schritt von alt nach neu umbauen (v1 → v2 → …).
  if (version !== SCHEMA_VERSION) {
    throw new SaveFormatError(`Unbekannte Spielstand-Version ${String(version)}.`);
  }
  const parsed = gameStateSchema.safeParse(saved);
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
  return next;
}
