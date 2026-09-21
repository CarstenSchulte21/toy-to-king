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
  if (content.rooms[state.room]) return state;
  return { ...state, room: content.config.start_room };
}
