// Kaufen und Geld (M5a). Reines TypeScript, keine Oberfläche.
import type { GameContent, Item } from "./content-schema";
import { weekdayOf } from "./risk";
import type { GameState } from "./state";

export type Offer = {
  item: Item;
  price: number;
  affordable: boolean;
  owned: number;
};

/** Verkauft Sibel gerade alles – oder will sie keinen Ärger? */
export function isCareful(state: GameState, content: GameContent): boolean {
  const eco = content.economy;
  if (!eco) return false;
  return (state.wanted ?? 0) >= eco.careful_from_wanted;
}

function sellsNow(item: Item, state: GameState, content: GameContent): boolean {
  const eco = content.economy!;
  if (!isCareful(state, content)) return true;
  if (eco.careful_kinds.includes(item.kind)) return true;
  return eco.careful_colors.includes(item.id);
}

/** Was heute im Laden liegt. Ohne Preis gibt es nichts zu kaufen. */
export function shopOffers(state: GameState, content: GameContent): Offer[] {
  if (!content.economy) return [];
  return Object.values(content.items)
    .filter((i) => i.price !== undefined && sellsNow(i, state, content))
    .map((item) => ({
      item,
      price: item.price!,
      affordable: (state.money ?? 0) >= item.price!,
      owned: state.items[item.id] ?? 0,
    }));
}

export type BuyResult = { ok: true; state: GameState; price: number } | { ok: false; error: string };

export function buy(state: GameState, content: GameContent, itemId: string): BuyResult {
  const eco = content.economy;
  const item = content.items[itemId];
  if (!eco || !item || item.price === undefined) return { ok: false, error: "Das gibt es hier nicht." };
  if (!sellsNow(item, state, content)) return { ok: false, error: eco.careful_text };
  if ((state.money ?? 0) < item.price) return { ok: false, error: eco.texts.too_expensive };
  return {
    ok: true,
    price: item.price,
    state: {
      ...state,
      money: (state.money ?? 0) - item.price,
      items: {
        ...state.items,
        [itemId]: (state.items[itemId] ?? 0) + (item.kind === "color" ? canUnits(content) : 1),
      },
    },
  };
}

/** Taschengeld: einmal pro Woche an einem festen Tag, für jeden übersprungenen Zahltag einmal. */
export function allowanceFor(content: GameContent, fromDay: number, toDay: number): number {
  const eco = content.economy;
  if (!eco) return 0;
  let sum = 0;
  for (let day = fromDay + 1; day <= toDay; day++) {
    if (weekdayOf(day) === eco.allowance.day) sum += eco.allowance.amount;
  }
  return sum;
}

// ---------- Farbe mit Füllstand (M5b) ----------
//
// Farben stehen in `items` nicht als Zahl der Dosen, sondern als **Einheiten**. Eine gekaufte
// Dose bringt `can_units` Einheiten; ein Werk zieht so viel ab, wie sein Style braucht. Damit
// reicht eine Dose für mehrere Throw-ups, aber nicht für zwei Pieces – und man sieht in der
// Tasche, wie viel noch drin ist. Caps, Dosen und Marker bleiben Stückzahlen.

export function canUnits(content: GameContent): number {
  return content.economy?.can_units ?? 1;
}

/** Wie viel von dieser Farbe noch da ist, in Einheiten. */
export function paintLeft(state: GameState, colorId: string): number {
  return state.items[colorId] ?? 0;
}

/** Füllstand zum Anzeigen: ganze Dosen und der Rest als Anteil (0…1). */
export function fillOf(state: GameState, content: GameContent, colorId: string) {
  const per = canUnits(content);
  const units = paintLeft(state, colorId);
  return {
    units,
    cans: units / per,
    share: per > 0 ? Math.min(1, (units % per || (units ? per : 0)) / per) : 0,
  };
}

/** Was ein Werk dieses Styles je benutzter Farbe kostet. */
export function paintCost(content: GameContent, styleId: string): number {
  const style = content.spray?.styles.find((s) => s.id === styleId);
  return style?.paint ?? content.economy?.paint_per_color ?? 0;
}

/** Reicht die Farbe für dieses Werk? */
export function hasPaintFor(state: GameState, content: GameContent, colorId: string, styleId: string) {
  return paintLeft(state, colorId) >= paintCost(content, styleId);
}

/** Welche Farben ein Werk kostet – ohne Doppelte. */
export function paintFor(colors: {
  line?: string;
  fill?: string[];
  outline?: string;
  second?: string;
  background?: string;
}): string[] {
  const all = [colors.line, ...(colors.fill ?? []), colors.outline, colors.second, colors.background];
  return [...new Set(all.filter((c): c is string => c !== undefined))];
}

/** Farbe abziehen. Was leer ist, verschwindet aus der Tasche. */
export function spendPaint(
  state: GameState,
  content: GameContent,
  colorIds: string[],
  styleId: string,
): GameState {
  const per = paintCost(content, styleId);
  if (per === 0 || colorIds.length === 0) return state;
  const items = { ...state.items };
  for (const id of colorIds) {
    const left = (items[id] ?? 0) - per;
    if (left > 0) items[id] = left;
    else delete items[id];
  }
  return { ...state, items };
}
