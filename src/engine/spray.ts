// Sprühen, Spots und Karte (M3), Sprühen 2.0 (M3.5, SPEC-M3.5).
// Ein Werk entsteht aus Sketch (Style, Farben, Dose) und den Fingerbahnen je Ebene.
// Die Qualität ergibt sich aus dem, was dabei an der Wand passiert: Deckung, Cap, Drips, Spot.
import type { GameContent, Item, Spot, Style } from "./content-schema";
import {
  buildLettering,
  paletteIndex,
  passesFor,
  renderLettering,
  renderPreview,
  type Lettering,
  type PassKind,
  type PassStats,
  type RenderResult,
  type Stroke,
} from "./lettering";
import { evaluateAll, renderText } from "./logic";
import type { GameState, Work, WorkColors } from "./state";

export type Quality = 0 | 1 | 2 | 3;

export type SprayRating = {
  quality: Quality;
  label: string;
  hints: string[]; // was nicht gepasst hat – höchstens zwei, damit man daraus lernt
};

export type StyleChoice = {
  id: string;
  name: string;
  look: Style["look"];
  passes: PassKind[];
  available: boolean;
  reason?: string;
};
export type ItemChoice = { id: string; name: string; count: number; width?: number; color?: number };
export type SprayChoices = {
  spot: Spot;
  styles: StyleChoice[];
  caps: ItemChoice[];
  doses: ItemChoice[];
  colors: ItemChoice[];
};

export const PASS_LABELS: Record<PassKind, string> = { line: "Linie", fill: "Fill-in", outline: "Outline" };

// Ein Spot ist bekannt, wenn seine Bedingung erfüllt ist (meist: die passende Info).
export function isSpotKnown(spot: Spot, state: GameState, content: GameContent): boolean {
  return evaluateAll(spot.if, state, { content });
}

export function knownSpots(state: GameState, content: GameContent): Spot[] {
  return Object.values(content.spots).filter((s) => isSpotKnown(s, state, content));
}

function owned(state: GameState, content: GameContent, kind: Item["kind"]): ItemChoice[] {
  return Object.entries(state.items)
    .filter(([id, count]) => count > 0 && content.items[id]?.kind === kind)
    .map(([id, count]) => {
      const item = content.items[id]!;
      return {
        id,
        name: item.name,
        count,
        ...(item.width !== undefined ? { width: item.width } : {}),
        ...(item.color !== undefined ? { color: paletteIndex(item.color) } : {}),
      };
    });
}

// Warum ein Style gerade nicht geht – oder null, wenn er geht.
export function styleBlocker(
  state: GameState,
  content: GameContent,
  style: Style,
  spot: Spot,
): string | null {
  if (!evaluateAll(style.if, state, { content })) return style.locked_hint ?? "Das kannst du noch nicht.";
  const missing = (style.requires ?? []).filter((item) => (state.items[item] ?? 0) === 0);
  if (missing.length > 0) return style.requires_hint ?? "Dafür fehlt dir Material.";
  if (style.only_at && !style.only_at.includes(spot.id)) return style.only_at_hint ?? "Nicht an diesem Spot.";
  return null;
}

export function sprayChoices(state: GameState, content: GameContent, spotId: string): SprayChoices | null {
  const spot = content.spots[spotId];
  if (!spot || !content.spray) return null;
  const styles = content.spray.styles.map((s): StyleChoice => {
    const reason = styleBlocker(state, content, s, spot);
    const base = { id: s.id, name: s.name, look: s.look, passes: passesFor(s.look) };
    return reason === null ? { ...base, available: true } : { ...base, available: false, reason };
  });
  return {
    spot,
    styles,
    caps: owned(state, content, "cap"),
    doses: owned(state, content, "dose"),
    colors: owned(state, content, "color"),
  };
}

// ---------- Werk berechnen ----------

const colorIndex = (content: GameContent, id: string | undefined): number | undefined => {
  const key = id ? content.items[id]?.color : undefined;
  return key ? paletteIndex(key) : undefined;
};

export function resolveColors(content: GameContent, colors: WorkColors) {
  const fill = (colors.fill ?? [])
    .map((c) => colorIndex(content, c))
    .filter((c): c is number => c !== undefined);
  const one = (id: string | undefined, key: "line" | "outline" | "second" | "background") => {
    const value = colorIndex(content, id);
    return value === undefined ? {} : { [key]: value };
  };
  return {
    ...one(colors.line, "line"),
    ...(fill.length ? { fill } : {}),
    ...one(colors.outline, "outline"),
    ...one(colors.second, "second"),
    ...one(colors.background, "background"),
  };
}

export function styleOf(content: GameContent, styleId: string): Style | undefined {
  return content.spray?.styles.find((s) => s.id === styleId);
}

export function letteringFor(
  content: GameContent,
  playerName: string,
  styleId: string,
  seed: number,
): Lettering | null {
  const style = styleOf(content, styleId);
  return style ? buildLettering(playerName, style.look, seed) : null;
}

export type WorkDraft = {
  style: string;
  colors: WorkColors;
  dose: string;
  passes: { kind: PassKind; cap: string; strokes: Stroke[] }[];
  seed: number;
  ideal?: true;
};

// Das Bild eines Werks (auch halb fertig, für die Live-Ansicht beim Nachfahren).
export function renderWork(
  content: GameContent,
  playerName: string,
  work: WorkDraft | Work,
): RenderResult | null {
  const l = letteringFor(content, playerName, work.style, work.seed);
  if (!l) return null;
  return renderLettering(l, {
    colors: resolveColors(content, work.colors),
    flow: content.items[work.dose]?.flow ?? 4,
    seed: work.seed,
    ...(work.ideal ? { ideal: true } : {}),
    passes: work.passes.map((p) => ({
      kind: p.kind,
      width: content.items[p.cap]?.width ?? 2,
      strokes: p.strokes,
    })),
  });
}

// Vorschau im Sketch: so sähe das Werk ohne Fehler aus.
export function renderSketch(
  content: GameContent,
  playerName: string,
  styleId: string,
  colors: WorkColors,
  seed: number,
): Uint8Array | null {
  const style = styleOf(content, styleId);
  return style ? renderPreview(playerName, style.look, seed, resolveColors(content, colors)) : null;
}

// ---------- Bewerten ----------

const THRESHOLDS = [0.5, 0.72, 0.88] as const;
const WRONG_CAP_PENALTY = 0.15;
const DRIP_PENALTY = 0.04;
const MAX_DRIP_PENALTY = 0.2;

export function rateWork(
  content: GameContent,
  spot: Spot,
  style: Style,
  work: Pick<WorkDraft, "dose" | "passes">,
  stats: PassStats[],
): SprayRating {
  const rules = content.spray!;
  const hints: string[] = [];
  let penalty = 0;
  let drips = 0;
  let gaps = false;
  for (const [i, pass] of work.passes.entries()) {
    const s = stats[i];
    const ideal = style.caps[pass.kind] ?? [];
    const capOk = ideal.includes(pass.cap);
    if (!capOk) {
      penalty += WRONG_CAP_PENALTY;
      const width = content.items[pass.cap]?.width ?? 2;
      const tooThin =
        pass.kind === "fill" && width < Math.min(...ideal.map((c) => content.items[c]?.width ?? 3));
      hints.push(
        tooThin ? rules.hints.reach : pass.kind === "fill" ? rules.hints.gaps : rules.hints.fat_line,
      );
    }
    drips += s?.drips ?? 0;
    if (capOk && (s?.coverage ?? 0) < 0.9) gaps = true;
  }
  if (drips > 0) hints.push(rules.hints.drips);
  if (gaps) hints.push((content.items[work.dose]?.flow ?? 10) < 6 ? rules.hints.gaps_low : rules.hints.gaps);
  penalty += Math.min(MAX_DRIP_PENALTY, drips * DRIP_PENALTY);
  const coverage = stats.length ? stats.reduce((sum, s) => sum + s.coverage, 0) / stats.length : 0;
  const score = coverage - penalty;
  let quality = THRESHOLDS.filter((t) => score >= t).length as Quality;
  if (!spot.fits.includes(style.id)) {
    hints.push(spot.fit_hint);
    quality = Math.min(quality, 2) as Quality;
  }
  const label = quality === 3 && style.top_label ? style.top_label : rules.quality_labels[quality]!;
  return { quality, label, hints: [...new Set(hints)].slice(0, 2) };
}

// Der Ergebnissatz nach dem Sprühen, z. B. „Bubble an den Rolltoren: sauber."
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

// ---------- Karte ----------

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
