// Auftragsarbeiten (M5b): Jemand will ein bestimmtes Werk an einem bestimmten Spot,
// bis zu einem bestimmten Tag, und zahlt nach Qualität.
//
// Warum das die richtige Geldquelle ist: Man malt ohnehin. Neu ist nur, dass es diesmal
// eine Vorgabe gibt statt freier Wahl – und dass am Ende jemand zahlt.
import type { GameContent, OrderDef } from "./content-schema";
import type { GameState, Work } from "./state";

export type OrderView = {
  def: OrderDef;
  /** Tag, an dem der Auftrag abläuft. */
  due: number;
  /** Tage bis zur Frist; negativ heißt abgelaufen. */
  daysLeft: number;
  done: boolean;
};

export function orderDef(content: GameContent, id: string): OrderDef | undefined {
  return content.orders?.list.find((o) => o.id === id);
}

/** Der Auftrag, den man gerade hat – oder null. Man hat immer höchstens einen. */
export function activeOrder(state: GameState, content: GameContent): OrderView | null {
  const open = state.order;
  if (!open) return null;
  const def = orderDef(content, open.id);
  if (!def) return null;
  return {
    def,
    due: open.due,
    daysLeft: open.due - (state.day ?? 1),
    done: false,
  };
}

/** Kann man diesen Auftrag gerade annehmen? */
export function canTake(state: GameState, content: GameContent, id: string): boolean {
  if (state.order) return false;
  if (state.doneOrders?.includes(id)) return false;
  return orderDef(content, id) !== undefined;
}

export function takeOrder(state: GameState, content: GameContent, id: string): GameState {
  const def = orderDef(content, id);
  if (!def || !canTake(state, content, id)) return state;
  return { ...state, order: { id, due: (state.day ?? 1) + def.days } };
}

/**
 * Was ein Werk einbringt. Der Auftrag zählt nur, wenn Spot und Style stimmen und
 * die Frist noch läuft. Unter der Mindestqualität zahlt niemand.
 */
export function payFor(def: OrderDef, work: Pick<Work, "style" | "quality">): number {
  if (work.style !== def.style) return 0;
  return def.pay[Math.max(0, Math.min(3, work.quality))] ?? 0;
}

export type OrderResult = {
  state: GameState;
  paid: number;
  /** Warum es kein Geld gab – nur gesetzt, wenn paid 0 ist und ein Auftrag betroffen war. */
  reason?: string;
};

/**
 * Nach einem Werk prüfen, ob damit ein Auftrag erfüllt ist.
 * Passt der Spot nicht, bleibt der Auftrag offen – man hat einfach woanders gemalt.
 */
export function settleOrder(
  state: GameState,
  content: GameContent,
  spotId: string,
  work: Pick<Work, "style" | "quality">,
): OrderResult {
  const open = activeOrder(state, content);
  if (!open || open.def.spot !== spotId) return { state, paid: 0 };

  const texts = content.orders?.texts;
  const clear = (paid: number): GameState => ({
    ...state,
    money: (state.money ?? 0) + paid,
    order: undefined,
    doneOrders: [...(state.doneOrders ?? []), open.def.id],
  });

  if (open.daysLeft < 0) {
    return { state: clear(0), paid: 0, reason: texts?.too_late ?? "Zu spät." };
  }
  const paid = payFor(open.def, work);
  if (paid <= 0) {
    return {
      state: clear(0),
      paid: 0,
      reason: open.def.reject ?? texts?.rejected ?? "Dafür zahlt er nicht.",
    };
  }
  return { state: clear(paid), paid };
}

/** Abgelaufene Aufträge fallen beim Tageswechsel weg. */
export function expireOrders(state: GameState, content: GameContent): { state: GameState; lost?: OrderDef } {
  const open = activeOrder(state, content);
  if (!open || open.daysLeft >= 0) return { state };
  return {
    state: { ...state, order: undefined, doneOrders: [...(state.doneOrders ?? []), open.def.id] },
    lost: open.def,
  };
}
