// Geld, Kaufen und Verbrauch (M5a).
import { describe, expect, it } from "vitest";
import {
  allowanceFor,
  buy,
  createNewGame,
  isCareful,
  paintFor,
  shopOffers,
  spendPaint,
  type GameContent,
  type GameState,
} from "@/engine";

const economy: NonNullable<GameContent["economy"]> = {
  start_money: 8,
  allowance: { day: "sa", amount: 10, text: "Taschengeld: {amount} €." },
  careful_from_wanted: 2,
  careful_kinds: ["cap", "marker"],
  careful_colors: ["schwarz"],
  careful_text: "Nicht diese Woche.",
  paint_per_color: 1,
  texts: {
    bought: "{item} für {price} €.",
    too_expensive: "Dafür reicht es nicht.",
    no_paint: "Die Farbe ist alle.",
    shop_title: "LADEN",
    shop_empty: "Nichts da.",
  },
};

const items = {
  schwarz: { id: "schwarz", name: "Schwarz", kind: "color", color: "black", text: "…", price: 2 },
  rot: { id: "rot", name: "Rot", kind: "color", color: "red", text: "…", price: 4 },
  gold: { id: "gold", name: "Gold", kind: "color", color: "yellow", text: "…" }, // ohne Preis
  skinny: { id: "skinny", name: "Skinny", kind: "cap", width: 1, text: "…", price: 1 },
  t_tip: {
    id: "t_tip",
    name: "T-Tip",
    kind: "marker",
    width: 1,
    flow: 5,
    color: "black",
    text: "…",
    price: 4,
  },
};

const content = {
  config: { start_room: "r" },
  rooms: { r: { id: "r", name: "R", hotspots: [] } },
  npcs: {},
  facts: {},
  items,
  spray: null,
  spots: {},
  map: null,
  progress: null,
  risk: null,
  economy,
} as unknown as GameContent;

const game = (extra: Partial<GameState> = {}): GameState => ({
  ...createNewGame(content, "TESTER", "2026-01-01T00:00:00.000Z"),
  ...extra,
});

describe("Geld", () => {
  it("man startet mit dem Startgeld", () => {
    expect(game().money).toBe(8);
  });

  it("Taschengeld gibt es nur am Zahltag", () => {
    // Tag 1 ist Montag, Tag 6 ist Samstag.
    expect(allowanceFor(content, 1, 5)).toBe(0);
    expect(allowanceFor(content, 1, 6)).toBe(10);
    // Wer eine ganze Woche verschläft, bekommt es trotzdem – aber nur einmal pro Woche.
    expect(allowanceFor(content, 1, 13)).toBe(20);
  });
});

describe("Kaufen", () => {
  it("nur was einen Preis hat, liegt im Laden", () => {
    const ids = shopOffers(game(), content).map((o) => o.item.id);
    expect(ids).toContain("schwarz");
    expect(ids).not.toContain("gold");
  });

  it("kaufen kostet Geld und legt den Gegenstand in die Tasche", () => {
    const r = buy(game(), content, "rot");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.money).toBe(4);
    expect(r.state.items.rot).toBe(1);
  });

  it("was zu teuer ist, kauft man nicht", () => {
    const r = buy(game({ money: 1 }), content, "rot");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Dafür reicht es nicht.");
  });

  it("ab Wanted 2 gibt es nur noch das Unauffällige", () => {
    const hot = game({ wanted: 2 });
    expect(isCareful(hot, content)).toBe(true);
    const ids = shopOffers(hot, content).map((o) => o.item.id);
    expect(ids).toContain("schwarz"); // unauffällig
    expect(ids).toContain("skinny"); // Werkzeug
    expect(ids).toContain("t_tip"); // Werkzeug
    expect(ids).not.toContain("rot"); // zu bunt
    const r = buy(hot, content, "rot");
    expect(r.ok).toBe(false);
  });
});

describe("Verbrauch", () => {
  it("jede benutzte Farbe zählt einmal, auch wenn sie mehrfach vorkommt", () => {
    expect(paintFor({ fill: ["rot", "rot"], outline: "rot" })).toEqual(["rot"]);
    expect(paintFor({ fill: ["rot"], outline: "schwarz" }).sort()).toEqual(["rot", "schwarz"]);
  });

  it("verbrauchte Farbe verschwindet aus der Tasche, wenn sie alle ist", () => {
    const s = game({ items: { rot: 2, schwarz: 1 } });
    const after = spendPaint(s, content, ["rot", "schwarz"]);
    expect(after.items.rot).toBe(1);
    expect(after.items.schwarz).toBeUndefined();
  });
});
