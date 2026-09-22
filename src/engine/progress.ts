// Aufstieg (M4a, SPEC-M4a): XP aus Werken und der Rang, der daraus folgt.
//
// XP eines Werks = Style-Wert × Qualitätsfaktor × Spot-Faktor × (1 + Tempo-Bonus).
// Angerechnet wird nur die Verbesserung gegenüber dem bisher besten Werk an diesem Spot –
// sonst gibt es einen kleinen Anteil als Übung.
import type { GameContent, Rank, Spot, Style } from "./content-schema";
import { passTimeLimit, type Lettering } from "./lettering";
import type { GameState, Work } from "./state";
import type { WorkDraft } from "./spray";

export function ranks(content: GameContent): Rank[] {
  return [...(content.progress?.ranks ?? [])].sort((a, b) => a.xp - b.xp);
}

export function rankAt(content: GameContent, xp: number): Rank | null {
  const list = ranks(content);
  let current: Rank | null = null;
  for (const r of list) if (xp >= r.xp) current = r;
  return current ?? list[0] ?? null;
}

export function rankOf(state: GameState, content: GameContent): Rank | null {
  return rankAt(content, state.xp ?? 0);
}

export function nextRank(content: GameContent, xp: number): Rank | null {
  return ranks(content).find((r) => r.xp > xp) ?? null;
}

// Hat man mindestens diesen Rang? Unbekannte Ränge gelten als nicht erreicht.
export function hasRank(state: GameState, content: GameContent, rankId: string): boolean {
  const target = ranks(content).find((r) => r.id === rankId);
  return target !== undefined && (state.xp ?? 0) >= target.xp;
}

// Anteil der Zeit, die beim Nachfahren übrig blieb (0 = keine, 1 = alles) – Mittel über alle Ebenen.
export function timeLeftShare(
  lettering: Lettering,
  content: GameContent,
  work: Pick<Work | WorkDraft, "dose" | "passes">,
): number {
  const limit = passTimeLimit(lettering, content.items[work.dose]?.flow ?? 4);
  const shares = work.passes.map((p) => {
    const last = p.strokes.reduce((max, s) => Math.max(max, s[s.length - 1] ?? 0), 0);
    return Math.max(0, Math.min(1, 1 - last / limit));
  });
  return shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : 0;
}

export function xpForWork(
  content: GameContent,
  spot: Spot,
  style: Style,
  quality: number,
  timeLeft = 0,
): number {
  const p = content.progress;
  if (!p) return 0;
  const base = style.xp ?? 0;
  const quality_factor = p.quality_factors[Math.max(0, Math.min(3, quality))] ?? 0;
  const spot_factor = p.spot_factors[spot.type] ?? 1;
  const tempo = quality >= p.tempo_min_quality ? p.tempo_bonus_max * timeLeft : 0;
  return Math.round(base * quality_factor * spot_factor * (1 + tempo));
}

// Was ein Werk wirklich einbringt: die Verbesserung, mindestens aber der Übungsanteil.
export function xpGain(content: GameContent, xp: number, bestBefore: number): number {
  const share = content.progress?.repeat_share ?? 0;
  return xp > bestBefore ? xp - bestBefore : Math.round(xp * share);
}
