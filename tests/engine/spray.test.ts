import { describe, expect, it } from "vitest";
import * as E from "@/engine";
import {
  createNewGame,
  mapPlaces,
  rateSpray,
  reduce,
  sprayChoices,
  type GameContent,
  type GameState,
} from "@/engine";

const NOW = "2026-01-01T00:00:00.000Z";

const content: GameContent = {
  config: { start_room: "strasse", start_items: { standard_cap: 1, low_pressure: 1 } },
  rooms: {
    strasse: {
      id: "strasse",
      name: "Straße",
      hotspots: [
        {
          id: "rolltore",
          label: "Rolltore",
          rect: [0, 0, 30, 30],
          sprühen: "rolltore",
          untersuchen: [{ if: [{ sprayed: "rolltore" }], text: "Dein Werk." }, { text: "Leer." }],
        },
        { id: "sibel", label: "Sibel", rect: [40, 0, 20, 20], sprechen: "laden" },
      ],
    },
    hall: {
      id: "hall",
      name: "Hall",
      hotspots: [{ id: "wand", label: "Wand", rect: [0, 0, 30, 30], sprühen: "hall" }],
    },
  },
  npcs: {
    laden: {
      id: "laden",
      name: "Sibel",
      role: "Farbenladen",
      room: "strasse",
      hotspot: "sibel",
      trust: { start: 0 },
      dialogue: {
        start: "hallo",
        nodes: {
          hallo: {
            text: "Hier.",
            options: [
              {
                text: "Skinny?",
                if: [{ not_flag: "hat_skinny" }],
                effects: [{ give: "skinny_cap" }, { set_flag: "hat_skinny" }],
                end: true,
              },
              { text: "Fat?", effects: [{ give: "fat_cap" }], end: true },
              { text: "High?", effects: [{ give: "high_pressure" }], end: true },
            ],
          },
        },
      },
    },
  },
  facts: {
    hall: { id: "hall", category: "spot", title: "Hall", text: "Legal.", source: "laden" },
  },
  items: {
    standard_cap: { id: "standard_cap", name: "Standard-Cap", kind: "cap", text: "." },
    skinny_cap: { id: "skinny_cap", name: "Skinny Cap", kind: "cap", text: "." },
    fat_cap: { id: "fat_cap", name: "Fat Cap", kind: "cap", text: "." },
    low_pressure: { id: "low_pressure", name: "Low Pressure", kind: "dose", text: "." },
    high_pressure: { id: "high_pressure", name: "High Pressure", kind: "dose", text: "." },
  },
  spray: {
    quality_labels: ["wackelig", "geht so", "sauber", "richtig stark"],
    result: "Dein {style} an {spot}: {quality}.",
    styles: [
      {
        id: "tag",
        name: "Tag",
        ideal_caps: ["skinny_cap", "standard_cap"],
        ideal_dose: "egal",
        cap_hint: "Tag-Cap.",
      },
      {
        id: "throwup",
        name: "Throw-up",
        ideal_caps: ["fat_cap"],
        ideal_dose: "high_pressure",
        cap_hint: "Fat Cap fürs Fill-in.",
        dose_hint: "High Pressure deckt schneller.",
      },
      {
        id: "piece",
        name: "Piece",
        ideal_caps: ["fat_cap"],
        ideal_dose: "low_pressure",
        requires: ["skinny_cap"],
        requires_hint: "Für die Outline brauchst du einen Skinny Cap.",
        cap_hint: "Fat Cap fürs Fill-in.",
        dose_hint: "Low Pressure für Details.",
        top_label: "Burner",
      },
    ],
  },
  spots: {
    rolltore: {
      id: "rolltore",
      name: "den Rolltoren",
      type: "rolltor",
      room: "strasse",
      hotspot: "rolltore",
      fits: ["tag", "throwup"],
      fit_hint: "Für ein Piece ist das Rolltor zu unruhig.",
      risk: "mittel",
    },
    hall: {
      id: "hall",
      name: "der Hall",
      type: "legale_wand",
      room: "hall",
      hotspot: "wand",
      fits: ["piece"],
      fit_hint: "An der Hall zählen Pieces.",
      risk: "kein",
      if: [{ fact: "hall" }],
    },
  },
  map: {
    title: "Bezirk",
    places: [
      { room: "strasse", pos: [10, 10] },
      { room: "hall", pos: [50, 50], if: [{ fact: "hall" }] },
    ],
  },
};

function run(state: GameState, ...actions: E.Action[]) {
  let s = state;
  const events: E.GameEvent[] = [];
  for (const a of actions) {
    const r = reduce(s, a, content, NOW);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

const fresh = () => ({ ...createNewGame(content, "KRAZE", NOW), visited: ["strasse"] });
const ask = (option: number): E.Action[] => [
  { type: "INTERACT", hotspot: "sibel", verb: "sprechen" },
  { type: "CHOOSE_OPTION", npc: "laden", node: "hallo", option },
];
const spray = (spot: string, style: string, cap: string, dose: string): E.Action => ({
  type: "SPRAY",
  spot,
  style,
  cap,
  dose,
});

describe("Material", () => {
  it("Startausrüstung aus der config", () => {
    expect(fresh().items).toEqual({ standard_cap: 1, low_pressure: 1 });
  });

  it("give legt Material in die Tasche und meldet es", () => {
    const r = run(fresh(), ...ask(0));
    expect(r.state.items.skinny_cap).toBe(1);
    expect(r.events).toContainEqual({ type: "ITEM_GAINED", item: "skinny_cap", name: "Skinny Cap" });
  });

  it("has prüft die Tasche", () => {
    const s = run(fresh(), ...ask(0)).state;
    expect(E.evaluateCondition({ has: "skinny_cap" }, s, { content })).toBe(true);
    expect(E.evaluateCondition({ has: "fat_cap" }, s, { content })).toBe(false);
  });
});

describe("Sprühen", () => {
  it("Sprühen öffnet das Menü nur an bekannten Spots", () => {
    expect(run(fresh(), { type: "INTERACT", hotspot: "rolltore", verb: "sprühen" }).events).toEqual([
      { type: "SPRAY_OPEN", spot: "rolltore" },
    ]);
  });

  it("zeigt nur eigenes Material; Piece ohne Skinny Cap mit Begründung gesperrt", () => {
    const c = sprayChoices(fresh(), content, "rolltore")!;
    expect(c.caps.map((x) => x.id)).toEqual(["standard_cap"]);
    expect(c.doses.map((x) => x.id)).toEqual(["low_pressure"]);
    expect(c.styles.find((s) => s.id === "piece")).toEqual({
      id: "piece",
      name: "Piece",
      available: false,
      reason: "Für die Outline brauchst du einen Skinny Cap.",
    });
  });

  it("Qualität: +1 Cap, +1 Dose, +1 Spot – mit Hinweisen zu dem, was nicht passt", () => {
    const spot = content.spots.rolltore!;
    const [, throwup, piece] = content.spray!.styles;
    expect(rateSpray(content, spot, throwup!, "fat_cap", "high_pressure")).toEqual({
      quality: 3,
      label: "richtig stark",
      hints: [],
    });
    expect(rateSpray(content, spot, throwup!, "standard_cap", "low_pressure")).toEqual({
      quality: 1,
      label: "geht so",
      hints: ["Fat Cap fürs Fill-in.", "High Pressure deckt schneller."],
    });
    expect(rateSpray(content, content.spots.hall!, piece!, "fat_cap", "low_pressure").label).toBe("Burner");
    expect(rateSpray(content, spot, piece!, "fat_cap", "low_pressure").hints).toEqual([
      "Für ein Piece ist das Rolltor zu unruhig.",
    ]);
  });

  it("speichert das Werk, meldet das Ergebnis und setzt sprayed", () => {
    const r = run(fresh(), spray("rolltore", "tag", "standard_cap", "low_pressure"));
    expect(r.state.works.rolltore).toMatchObject({ style: "tag", quality: 3, cap: "standard_cap" });
    expect(r.events).toContainEqual({
      type: "SPRAYED",
      spot: "rolltore",
      quality: 3,
      label: "richtig stark",
    });
    expect(r.events).toContainEqual({ type: "TEXT", lines: ["Dein Tag an den Rolltoren: richtig stark."] });
    const look = run(r.state, { type: "INTERACT", hotspot: "rolltore", verb: "untersuchen" });
    expect(look.events).toEqual([{ type: "TEXT", lines: ["Dein Werk."] }]);
  });

  it("lehnt ab: fremdes Material, gesperrter Style, falscher Ort, unbekannter Spot", () => {
    const s = fresh();
    for (const a of [
      spray("rolltore", "tag", "fat_cap", "low_pressure"),
      spray("rolltore", "piece", "standard_cap", "low_pressure"),
      spray("hall", "tag", "standard_cap", "low_pressure"),
      spray("mond", "tag", "standard_cap", "low_pressure"),
    ]) {
      const r = run(s, a);
      expect(r.state).toBe(s);
      expect(r.events[0]?.type).toBe("WARNING");
    }
  });

  it("neues Sprühen ersetzt das eigene Werk", () => {
    const r = run(
      fresh(),
      spray("rolltore", "throwup", "standard_cap", "low_pressure"),
      ...ask(1),
      ...ask(2),
      spray("rolltore", "throwup", "fat_cap", "high_pressure"),
    );
    expect(r.state.works.rolltore?.quality).toBe(3);
  });
});

describe("Karte", () => {
  it("zeigt besuchte Orte und Orte, deren Info man kennt", () => {
    expect(mapPlaces(fresh(), content).map((p) => p.room)).toEqual(["strasse"]);
    const knows = { ...fresh(), facts: { hall: { new: false } } };
    const places = mapPlaces(knows, content);
    expect(places.map((p) => p.room)).toEqual(["strasse", "hall"]);
    expect(places[1]!.spots.map((s) => s.id)).toEqual(["hall"]);
    expect(places[0]!.current).toBe(true);
  });

  it("TRAVEL nur zu bekannten Orten", () => {
    const s = fresh();
    expect(run(s, { type: "TRAVEL", room: "hall" }).state).toBe(s);
    const knows = { ...s, facts: { hall: { new: false } } };
    expect(run(knows, { type: "TRAVEL", room: "hall" }).state.room).toBe("hall");
  });
});
