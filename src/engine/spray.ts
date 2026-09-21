// Sprühen, Spots und Karte (M3, SPEC-M3).
// Die Qualität eines Werks folgt einer einfachen, lernbaren Regel:
// +1 passender Cap, +1 passende Dose, +1 Style passt zum Spot → 0 bis 3 Punkte.
import type { GameContent, Spot, Style } from "./content-schema";
import { evaluateAll, renderText } from "./logic";
import type { GameState } from "./state";

export type Quality = 0 | 1 | 2 | 3;

export type SprayRating = {
  quality: Quality;
  label: string;
  hints: string[]; // was nicht gepasst hat – höchstens zwei, damit man daraus lernt
};

export type StyleChoice = { id: string; name: string; available: boolean; reason?: string };
export type ItemChoice = { id: string; name: string; count: number };
export type SprayChoices = {
  spot: Spot;
  styles: StyleChoice[];
  caps: ItemChoice[];
  doses: ItemChoice[];
};

// Ein Spot ist bekannt, wenn seine Bedingung erfüllt ist (meist: die passende Info).
export function isSpotKnown(spot: Spot, state: GameState, content: GameContent): boolean {
  return evaluateAll(spot.if, state, { content });
}

export function knownSpots(state: GameState, content: GameContent): Spot[] {
  return Object.values(content.spots).filter((s) => isSpotKnown(s, state, content));
}

function owned(state: GameState, content: GameContent, kind: "cap" | "dose"): ItemChoice[] {
  return Object.entries(state.items)
    .filter(([id, count]) => count > 0 && content.items[id]?.kind === kind)
    .map(([id, count]) => ({ id, name: content.items[id]!.name, count }));
}

export function sprayChoices(state: GameState, content: GameContent, spotId: string): SprayChoices | null {
  const spot = content.spots[spotId];
  if (!spot || !content.spray) return null;
  const styles = content.spray.styles.map((s): StyleChoice => {
    const missing = (s.requires ?? []).filter((item) => (state.items[item] ?? 0) === 0);
    return missing.length === 0
      ? { id: s.id, name: s.name, available: true }
      : { id: s.id, name: s.name, available: false, reason: s.requires_hint ?? "Dafür fehlt dir Material." };
  });
  return { spot, styles, caps: owned(state, content, "cap"), doses: owned(state, content, "dose") };
}

export function rateSpray(
  content: GameContent,
  spot: Spot,
  style: Style,
  cap: string,
  dose: string,
): SprayRating {
  const rules = content.spray!;
  const hints: string[] = [];
  let quality = 0;
  if (style.ideal_caps.includes(cap)) quality++;
  else hints.push(style.cap_hint);
  if (style.ideal_dose === "egal" || style.ideal_dose === dose) quality++;
  else if (style.dose_hint) hints.push(style.dose_hint);
  if (spot.fits.includes(style.id)) quality++;
  else hints.push(spot.fit_hint);
  const q = quality as Quality;
  const label = q === 3 && style.top_label ? style.top_label : rules.quality_labels[q]!;
  return { quality: q, label, hints: hints.slice(0, 2) };
}

// Der Ergebnissatz nach dem Sprühen, z. B. „Dein Throw-up an den Rolltoren: sauber."
export function sprayResultText(
  content: GameContent,
  state: GameState,
  spot: Spot,
  style: Style,
  label: string,
): string {
  const template = content
    .spray!.result.replace(/\{style\}/g, style.name)
    .replace(/\{spot\}/g, spot.name)
    .replace(/\{quality\}/g, label);
  return renderText(template, state);
}

export type MapPlace = { room: string; name: string; pos: [number, number]; current: boolean; spots: Spot[] };

// Orte auf der Karte: sichtbar, wenn man dort war oder die Bedingung erfüllt ist.
export function mapPlaces(state: GameState, content: GameContent): MapPlace[] {
  if (!content.map) return [];
  const known = knownSpots(state, content);
  return content.map.places
    .filter(
      (p) => state.visited.includes(p.room) || (p.if !== undefined && evaluateAll(p.if, state, { content })),
    )
    .filter((p) => content.rooms[p.room])
    .map((p) => ({
      room: p.room,
      name: content.rooms[p.room]!.name,
      pos: p.pos,
      current: state.room === p.room,
      spots: known.filter((s) => s.room === p.room),
    }));
}
