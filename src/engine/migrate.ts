// Gespeicherte Spielstände prüfen und – wenn sich das Format ändert – auf die neue Version bringen.
import type { GameContent } from "./content-schema";
import { xpForWork } from "./progress";
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
    // v2 → v3 (M3.5): Werke bekommen Farben und Fingerbahnen. Alte Werke werden fehlerfrei übernommen,
    // aus Throw-up und Hollow wird Bubble. Die Start-Farben kommen in die Tasche.
    2: (s, content) => {
      const oldWorks = (s.works ?? {}) as Record<
        string,
        { style?: string; dose?: string; quality?: number; at?: string }
      >;
      const styleMap: Record<string, string> = { throwup: "bubble", hollow: "bubble" };
      const colors = Object.entries(content?.config.start_items ?? {})
        .filter(([id]) => content?.items[id]?.kind === "color")
        .map(([id]) => id);
      const works = Object.fromEntries(
        Object.entries(oldWorks).map(([spot, w]) => {
          const style = styleMap[w.style ?? ""] ?? w.style ?? "tag";
          return [
            spot,
            {
              style,
              colors: {
                line: colors[0],
                fill: colors.length > 1 ? [colors[1]!] : colors.slice(0, 1),
                outline: colors[0],
              },
              dose: w.dose ?? "low_pressure",
              passes: [],
              seed: 1,
              quality: w.quality ?? 0,
              at: w.at ?? "",
              ideal: true,
            },
          ];
        }),
      );
      const items = { ...((s.items ?? {}) as Record<string, number>) };
      for (const c of colors) items[c] = Math.max(items[c] ?? 0, content!.config.start_items![c]!);
      return { ...s, schemaVersion: 3, works, items };
    },
    // v3 → v4 (M4a): XP für die Werke, die es schon gibt. Ohne Tempo-Bonus, den kennen wir nachträglich nicht.
    3: (s, content) => {
      const works = (s.works ?? {}) as Record<string, { style?: string; quality?: number }>;
      const best: Record<string, number> = {};
      let xp = 0;
      for (const [spotId, work] of Object.entries(works)) {
        const spot = content?.spots[spotId];
        const style = content?.spray?.styles.find((st) => st.id === work.style);
        if (!content || !spot || !style) continue;
        const value = xpForWork(content, spot, style, work.quality ?? 0);
        best[spotId] = value;
        xp += value;
      }
      return { ...s, schemaVersion: 4, xp, best };
    },
    // v4 → v5 (M4b): Die Welt bekommt Zeit und Risiko. Wer schon gespielt hat, fängt bei Tag 1 an,
    // ohne Heat und ohne Wanted – man wird nicht rückwirkend für etwas gesucht.
    4: (s) => ({ ...s, schemaVersion: 5, day: 1, phase: 0, heat: {}, wanted: 0, caught: 0 }),
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
  // Werke und Bestwerte zu Spots oder Styles, die es nicht mehr gibt, fallen weg.
  const styles = new Set(content.spray?.styles.map((s) => s.id) ?? []);
  const spots = Object.keys(next.works).filter((s) => content.spots[s] && styles.has(next.works[s]!.style));
  if (spots.length !== Object.keys(next.works).length) {
    next = { ...next, works: Object.fromEntries(spots.map((s) => [s, next.works[s]!])) };
  }
  const heat = Object.keys(next.heat ?? {}).filter((s) => content.spots[s]);
  if (heat.length !== Object.keys(next.heat ?? {}).length) {
    next = { ...next, heat: Object.fromEntries(heat.map((s) => [s, next.heat[s]!])) };
  }
  const best = Object.keys(next.best).filter((s) => content.spots[s]);
  if (best.length !== Object.keys(next.best).length) {
    next = { ...next, best: Object.fromEntries(best.map((s) => [s, next.best[s]!])) };
  }
  return next;
}
