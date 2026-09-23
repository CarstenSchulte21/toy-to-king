import { describe, expect, it } from "vitest";
import * as E from "@/engine";
import {
  buildLettering,
  comfortableSpeed,
  createNewGame,
  mapPlaces,
  reduce,
  renderWork,
  sprayChoices,
  traceGuide,
  type GameContent,
  type GameState,
  type PassKind,
  type Stroke,
} from "@/engine";

const NOW = "2026-01-01T00:00:00.000Z";

const content: GameContent = {
  config: { start_room: "strasse", start_items: { standard_cap: 1, low_pressure: 1, schwarz: 1, chrom: 1 } },
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
              { text: "Rest?", effects: [{ give: "ny_fat" }, { give: "gelb" }], end: true },
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
    standard_cap: { id: "standard_cap", name: "Standard-Cap", kind: "cap", width: 2, text: "." },
    skinny_cap: { id: "skinny_cap", name: "Skinny Cap", kind: "cap", width: 1, text: "." },
    fat_cap: { id: "fat_cap", name: "Fat Cap", kind: "cap", width: 3, text: "." },
    ny_fat: { id: "ny_fat", name: "NY Fat", kind: "cap", width: 4, text: "." },
    low_pressure: { id: "low_pressure", name: "Low Pressure", kind: "dose", flow: 4, text: "." },
    high_pressure: { id: "high_pressure", name: "High Pressure", kind: "dose", flow: 10, text: "." },
    schwarz: { id: "schwarz", name: "Schwarz", kind: "color", color: "black", text: "." },
    chrom: { id: "chrom", name: "Chrom", kind: "color", color: "light_grey", text: "." },
    gelb: { id: "gelb", name: "Gelb", kind: "color", color: "yellow", text: "." },
  },
  spray: {
    quality_labels: ["wackelig", "geht so", "sauber", "richtig stark"],
    result: "Dein {style} an {spot}: {quality}.",
    hints: {
      gaps: "Lücken.",
      gaps_low: "Low braucht Zeit.",
      reach: "Zu dünn fürs Fill-in.",
      fat_line: "Zu fett.",
      drips: "Läuft.",
    },
    styles: [
      { id: "tag", name: "Tag", tool: "can" as const, look: "tag", caps: { line: ["skinny_cap", "standard_cap"] } },
      {
        id: "bubble",
        name: "Bubble",
        tool: "can" as const, look: "bubble",
        caps: { fill: ["fat_cap", "ny_fat"], outline: ["skinny_cap", "standard_cap"] },
      },
      {
        id: "piece",
        name: "Piece",
        tool: "can" as const, look: "piece",
        caps: { fill: ["fat_cap"], outline: ["skinny_cap"] },
        if: [{ flag: "rang_piece" }],
        locked_hint: "Noch nicht.",
        only_at: ["hall"],
        only_at_hint: "Nur an der Hall.",
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
      fits: ["tag", "bubble"],
      fit_hint: "Für ein Piece ist das Rolltor zu unruhig.",
      risk: "mittel",
    },
    hall: {
      id: "hall",
      name: "der Hall",
      type: "legale_wand",
      room: "hall",
      hotspot: "wand",
      fits: ["bubble", "piece"],
      fit_hint: "An der Hall taggt man nicht.",
      risk: "kein",
      if: [{ fact: "hall" }],
    },
  },
  progress: {
    rank_up_title: "Neuer Rang",
    ranks: [
      { id: "toy", name: "Toy", xp: 0 },
      { id: "tagger", name: "Tagger", xp: 40, text: "Weiter so.", unlocks: "Bubble" },
      { id: "king", name: "King", xp: 500 },
    ],
    quality_factors: [0, 0.5, 1, 1.5],
    spot_factors: { rolltor: 1, legale_wand: 1, hauswand: 1.2, heaven_spot: 1.6, zug: 1.6 },
    tempo_bonus_max: 0.3,
    tempo_min_quality: 2,
    repeat_share: 0.2,
  },
  map: {
    title: "Bezirk",
    places: [
      { room: "strasse", pos: [10, 10] },
      { room: "hall", pos: [50, 50], if: [{ fact: "hall" }] },
    ],
  },
  risk: null,
  economy: null,
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
type Pass = { kind: PassKind; cap: string; strokes: Stroke[] };
const BUBBLE_COLORS = { fill: ["chrom"], outline: "schwarz" };
const spray = (
  spot: string,
  style: string,
  passes: Pass[],
  dose = "high_pressure",
  colors: E.WorkColors = style === "tag" ? { line: "schwarz" } : BUBBLE_COLORS,
): E.Action => ({ type: "SPRAY", spot, style, colors, dose, passes, seed: 7 });

// Nachfahren wie ein ruhiger Spieler: gleichmäßig, im angenehmen Tempo der Dose.
const trace = (style: string, speedFactor = 1, dose = "high_pressure") => {
  const look = content.spray!.styles.find((s) => s.id === style)!.look;
  const l = buildLettering("KRAZE", look, 7);
  return traceGuide(l, comfortableSpeed(content.items[dose]!.flow!) * speedFactor);
};
const bubblePasses = (
  fillCap = "fat_cap",
  outlineCap = "standard_cap",
  speed = 1,
  dose = "high_pressure",
): Pass[] => [
  { kind: "fill", cap: fillCap, strokes: trace("bubble", speed, dose) },
  { kind: "outline", cap: outlineCap, strokes: trace("bubble", speed, dose) },
];
// Alles Material aus dem Laden holen.
const equipped = () => run(fresh(), ...ask(0), ...ask(1), ...ask(2), ...ask(3)).state;
const lastSprayed = (events: E.GameEvent[]) =>
  events.find((e): e is Extract<E.GameEvent, { type: "SPRAYED" }> => e.type === "SPRAYED")!;

describe("Material", () => {
  it("Startausrüstung aus der config, mit Farben", () => {
    expect(fresh().items).toEqual({ standard_cap: 1, low_pressure: 1, schwarz: 1, chrom: 1 });
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

describe("Sprühen 2.0", () => {
  it("Sprühen öffnet die Sprüh-Szene nur an bekannten Spots", () => {
    expect(run(fresh(), { type: "INTERACT", hotspot: "rolltore", verb: "sprühen" }).events).toEqual([
      { type: "SPRAY_OPEN", spot: "rolltore" },
    ]);
  });

  it("zeigt nur eigenes Material und Farben; gesperrte Styles mit Grund", () => {
    const c = sprayChoices(fresh(), content, "rolltore")!;
    expect(c.caps.map((x) => [x.id, x.width])).toEqual([["standard_cap", 2]]);
    expect(c.doses.map((x) => x.id)).toEqual(["low_pressure"]);
    expect(c.colors.map((x) => [x.id, x.color])).toEqual([
      ["schwarz", 0],
      ["chrom", 15],
    ]);
    expect(c.styles.find((s) => s.id === "piece")).toMatchObject({ available: false, reason: "Noch nicht." });
    expect(c.styles.find((s) => s.id === "bubble")).toMatchObject({
      available: true,
      passes: ["fill", "outline"],
    });
    const unlocked = { ...fresh(), flags: { rang_piece: true as const } };
    expect(sprayChoices(unlocked, content, "rolltore")!.styles.find((s) => s.id === "piece")).toMatchObject({
      available: false,
      reason: "Nur an der Hall.",
    });
  });

  it("sauberes Nachfahren mit den richtigen Caps ergibt Qualität 3", () => {
    const r = run(equipped(), spray("rolltore", "bubble", bubblePasses()));
    const e = lastSprayed(r.events);
    expect(e.quality).toBe(3);
    expect(e.label).toBe("richtig stark");
    expect(e.text).toBe("Dein Bubble an den Rolltoren: richtig stark.");
    expect(e.hints).not.toContain("Läuft.");
  });

  it("Skinny Cap fürs Fill-in erreicht den Rand nicht", () => {
    const r = run(equipped(), spray("rolltore", "bubble", bubblePasses("skinny_cap")));
    const e = lastSprayed(r.events);
    expect(e.quality).toBeLessThan(3);
    expect(e.hints[0]).toBe("Zu dünn fürs Fill-in.");
    const stats = renderWork(content, "KRAZE", r.state.works.rolltore!)!.stats;
    expect(stats[0]!.coverage).toBeLessThan(0.7);
  });

  it("NY Fat für die Outline wird zu fett", () => {
    const e = lastSprayed(
      run(equipped(), spray("rolltore", "bubble", bubblePasses("fat_cap", "ny_fat"))).events,
    );
    expect(e.hints).toContain("Zu fett.");
    expect(e.quality).toBeLessThan(3);
  });

  it("High Pressure und stehen bleiben: Drips", () => {
    // Alle 20 Messpunkte eine halbe Sekunde stehen bleiben.
    const halting = (strokes: Stroke[]) =>
      strokes.map((st) => {
        const out: number[] = [];
        let pause = 0;
        for (let i = 0; i < st.length; i += 3) {
          out.push(st[i]!, st[i + 1]!, st[i + 2]! + pause);
          if (i % 60 === 57) {
            // Finger steht: die Oberfläche meldet dann alle 50 ms die gleiche Stelle.
            for (let k = 0; k < 10; k++) {
              pause += 50;
              out.push(st[i]!, st[i + 1]!, st[i + 2]! + pause);
            }
          }
        }
        return out;
      });
    const passes = bubblePasses().map((p) => ({ ...p, strokes: halting(p.strokes) }));
    const r = run(equipped(), spray("rolltore", "bubble", passes));
    expect(lastSprayed(r.events).hints).toContain("Läuft.");
    expect(renderWork(content, "KRAZE", r.state.works.rolltore!)!.stats[0]!.drips).toBeGreaterThan(0);
  });

  it("Low Pressure verzeiht: gleiche Pausen, keine Drips", () => {
    const pausing = (strokes: Stroke[]) =>
      strokes.map((st) => {
        const [x, y, t] = st.slice(-3) as [number, number, number];
        return [...st, ...Array.from({ length: 10 }, (_, k) => [x, y, t + 50 * (k + 1)]).flat()];
      });
    const passes = bubblePasses("fat_cap", "standard_cap", 1, "low_pressure").map((p) => ({
      ...p,
      strokes: pausing(p.strokes),
    }));
    const r = run(equipped(), spray("rolltore", "bubble", passes, "low_pressure"));
    expect(lastSprayed(r.events).hints).not.toContain("Läuft.");
  });

  it("Low Pressure und zu schnell: Lücken mit passendem Hinweis", () => {
    const e = lastSprayed(
      run(
        equipped(),
        spray(
          "rolltore",
          "bubble",
          bubblePasses("fat_cap", "standard_cap", 2.5, "low_pressure"),
          "low_pressure",
        ),
      ).events,
    );
    expect(e.hints).toContain("Low braucht Zeit.");
    expect(e.quality).toBeLessThan(3);
  });

  it("ohne Nachfahren bleibt die Wand leer: Qualität 0", () => {
    const e = lastSprayed(
      run(
        equipped(),
        spray("rolltore", "bubble", [
          { kind: "fill", cap: "fat_cap", strokes: [] },
          { kind: "outline", cap: "standard_cap", strokes: [] },
        ]),
      ).events,
    );
    expect(e.quality).toBe(0);
  });

  it("Style passt nicht zum Spot: höchstens 2, mit Hinweis", () => {
    const s = { ...equipped(), room: "hall", facts: { hall: { new: false } } };
    const tag = [{ kind: "line" as const, cap: "skinny_cap", strokes: trace("tag") }];
    const e = lastSprayed(run(s, spray("hall", "tag", tag)).events);
    expect(e.quality).toBeLessThanOrEqual(2);
    expect(e.hints).toContain("An der Hall taggt man nicht.");
  });

  it("Piece an der Hall: Burner als beste Stufe", () => {
    const s = {
      ...equipped(),
      room: "hall",
      facts: { hall: { new: false } },
      flags: { rang_piece: true as const },
    };
    const passes: Pass[] = [
      { kind: "fill", cap: "fat_cap", strokes: trace("piece") },
      { kind: "outline", cap: "skinny_cap", strokes: trace("piece") },
    ];
    expect(lastSprayed(run(s, spray("hall", "piece", passes)).events).label).toBe("Burner");
  });

  it("speichert das Werk mit Sketch, merkt sich den Sketch und setzt sprayed", () => {
    const r = run(equipped(), spray("rolltore", "bubble", bubblePasses()));
    expect(r.state.works.rolltore).toMatchObject({
      style: "bubble",
      colors: BUBBLE_COLORS,
      dose: "high_pressure",
      seed: 7,
      quality: 3,
    });
    expect(r.state.lastSketch).toEqual({
      style: "bubble",
      colors: BUBBLE_COLORS,
      dose: "high_pressure",
      caps: { fill: "fat_cap", outline: "standard_cap" },
    });
    const look = run(r.state, { type: "INTERACT", hotspot: "rolltore", verb: "untersuchen" });
    expect(look.events).toEqual([{ type: "TEXT", lines: ["Dein Werk."] }]);
  });

  it("das Bild ist nach Speichern und Laden identisch", () => {
    const r = run(equipped(), spray("rolltore", "bubble", bubblePasses()));
    const saved = JSON.parse(JSON.stringify(r.state)) as GameState;
    const a = renderWork(content, "KRAZE", r.state.works.rolltore!)!.pixels;
    const b = renderWork(content, "KRAZE", saved.works.rolltore!)!.pixels;
    expect(Buffer.from(b).equals(Buffer.from(a))).toBe(true);
  });

  it("lehnt ab: fremdes Material, fremde Farbe, gesperrter Style, falsche Ebenen, falscher Ort, kaputte Bahnen", () => {
    const s = fresh();
    const tag = (cap: string, strokes: Stroke[] = []) => [{ kind: "line" as const, cap, strokes }];
    for (const a of [
      spray("rolltore", "tag", tag("fat_cap"), "low_pressure"),
      spray("rolltore", "tag", tag("standard_cap"), "high_pressure"),
      spray("rolltore", "tag", tag("standard_cap"), "low_pressure", { line: "gelb" }),
      spray("rolltore", "piece", bubblePasses("standard_cap"), "low_pressure"),
      spray("rolltore", "bubble", tag("standard_cap"), "low_pressure"),
      spray("rolltore", "bubble", bubblePasses("standard_cap"), "low_pressure", {
        fill: [],
        outline: "schwarz",
      }),
      spray("rolltore", "tag", tag("standard_cap", [[1, 2]]), "low_pressure"),
      spray("hall", "tag", tag("standard_cap"), "low_pressure"),
      spray("mond", "tag", tag("standard_cap"), "low_pressure"),
    ]) {
      const r = run(s, a);
      expect(r.state).toBe(s);
      expect(r.events[0]?.type).toBe("WARNING");
    }
  });

  it("neues Sprühen ersetzt das eigene Werk", () => {
    const r = run(
      equipped(),
      spray("rolltore", "bubble", bubblePasses("skinny_cap")),
      spray("rolltore", "bubble", bubblePasses()),
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
