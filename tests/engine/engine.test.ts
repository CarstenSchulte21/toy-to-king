import { describe, expect, it } from "vitest";
import {
  SaveFormatError,
  availableVerbs,
  createNewGame,
  fitToContent,
  migrate,
  rankOf,
  reduce,
  renderText,
  validatePlayerName,
  type GameContent,
  type GameState,
} from "@/engine";
import * as E from "@/engine";

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-01T00:05:00.000Z";

const content: GameContent = {
  config: { start_room: "hof" },
  rooms: {
    hof: {
      id: "hof",
      name: "Hof",
      description: "Hi {name}.",
      hotspots: [
        {
          id: "tonne",
          label: "Tonne",
          rect: [0, 0, 20, 20],
          untersuchen: ["Eine Tonne.", "Mit {name}s Tag."],
        },
        {
          id: "zettel",
          label: "Zettel",
          rect: [30, 0, 20, 20],
          untersuchen: [
            { if: [{ flag: "gelesen" }], text: "Kennst du schon." },
            { text: "Ein Zettel.", effects: [{ set_flag: "gelesen" }] },
          ],
        },
        {
          id: "geheim",
          label: "Geheim",
          rect: [60, 0, 20, 20],
          if: [{ flag: "gelesen" }],
          untersuchen: "Da!",
        },
        { id: "tor", label: "Tor", rect: [90, 0, 20, 20], gehen: "strasse", untersuchen: "Ein Tor." },
      ],
    },
    strasse: { id: "strasse", name: "Straße", hotspots: [] },
  },
  npcs: {},
  facts: {},
  items: {},
  spray: null,
  spots: {},
  map: null,
  progress: null,
};

// Kurzformen mit festem Kontext für die Tests ohne Gespräch.
const ctx = { content };
const evaluateCondition = (c: E.Condition, s: GameState) => E.evaluateCondition(c, s, ctx);
const evaluateAll = (c: E.Condition[] | undefined, s: GameState) => E.evaluateAll(c, s, ctx);
const applyEffect = (s: GameState, e: E.Effect) => E.applyEffect(s, e, ctx);
const resolveText = (v: E.TextVariants | undefined, s: GameState) => E.resolveText(v, s, ctx);
const visibleHotspots = (r: E.Room, s: GameState) => E.visibleHotspots(r, s, content);

function game(overrides: Partial<GameState> = {}): GameState {
  return { ...createNewGame(content, "KRAZE", NOW), ...overrides };
}

describe("validatePlayerName", () => {
  it.each(["AB", "Kraze_01", "ÖZI", "a-b", "x".repeat(16)])("akzeptiert %s", (n) => {
    expect(validatePlayerName(n)).toEqual({ ok: true, name: n });
  });
  it("entfernt Leerzeichen am Rand", () => {
    expect(validatePlayerName("  KRAZE ")).toEqual({ ok: true, name: "KRAZE" });
  });
  it.each([
    ["A", "Mindestens 2"],
    ["x".repeat(17), "Höchstens 16"],
    ["zwei worte", "Keine Leerzeichen"],
    ["<b>", "Nur Buchstaben"],
  ])("lehnt %s ab", (n, msg) => {
    const r = validatePlayerName(n);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
});

describe("createNewGame", () => {
  it("startet im Start-Room mit Namen und ohne Crew", () => {
    const s = createNewGame(content, "KRAZE", NOW);
    expect(s.room).toBe("hof");
    expect(s.player).toEqual({ name: "KRAZE", crew: null });
    expect(s.visited).toEqual([]);
    expect(s.schemaVersion).toBe(4);
    expect(s.works).toEqual({});
  });
});

describe("Bedingungen", () => {
  const s = game({ flags: { a: true }, visited: ["hof"] });
  it("flag / not_flag", () => {
    expect(evaluateCondition({ flag: "a" }, s)).toBe(true);
    expect(evaluateCondition({ flag: "b" }, s)).toBe(false);
    expect(evaluateCondition({ not_flag: "a" }, s)).toBe(false);
    expect(evaluateCondition({ not_flag: "b" }, s)).toBe(true);
  });
  it("visited", () => {
    expect(evaluateCondition({ visited: "hof" }, s)).toBe(true);
    expect(evaluateCondition({ visited: "strasse" }, s)).toBe(false);
  });
  it("UND-Verknüpfung, leere Liste ist erfüllt", () => {
    expect(evaluateAll([], s)).toBe(true);
    expect(evaluateAll(undefined, s)).toBe(true);
    expect(evaluateAll([{ flag: "a" }, { visited: "hof" }], s)).toBe(true);
    expect(evaluateAll([{ flag: "a" }, { visited: "strasse" }], s)).toBe(false);
  });
});

describe("Effekte", () => {
  it("set_flag und clear_flag", () => {
    const s1 = applyEffect(game(), { set_flag: "x" });
    expect(s1.flags.x).toBe(true);
    const s2 = applyEffect(s1, { clear_flag: "x" });
    expect(s2.flags.x).toBeUndefined();
  });
  it("ändert nichts, wenn schon erledigt", () => {
    const s = game();
    expect(applyEffect(s, { clear_flag: "x" })).toBe(s);
    const s1 = applyEffect(s, { set_flag: "x" });
    expect(applyEffect(s1, { set_flag: "x" })).toBe(s1);
  });
});

describe("Texte", () => {
  it("einzelner Text und Liste", () => {
    expect(resolveText("a", game())?.lines).toEqual(["a"]);
    expect(resolveText(["a", "b"], game())?.lines).toEqual(["a", "b"]);
    expect(resolveText(undefined, game())).toBeNull();
  });
  it("erste passende Variante gewinnt, samt Effekten", () => {
    const variants = content.rooms.hof!.hotspots[1]!.untersuchen;
    expect(resolveText(variants, game())).toEqual({
      lines: ["Ein Zettel."],
      effects: [{ set_flag: "gelesen" }],
    });
    expect(resolveText(variants, game({ flags: { gelesen: true } }))?.lines).toEqual(["Kennst du schon."]);
  });
  it("keine passende Variante → null", () => {
    expect(resolveText([{ if: [{ flag: "nie" }], text: "x" }], game())).toBeNull();
  });
  it("ersetzt {name} und {crew}", () => {
    expect(renderText("Yo {name} von {crew}.", game())).toBe("Yo KRAZE von .");
    expect(renderText("{crew}!", game({ player: { name: "K", crew: "HMK" } }))).toBe("HMK!");
  });
});

describe("Hotspots", () => {
  it("unsichtbar, solange die Bedingung fehlt", () => {
    const room = content.rooms.hof!;
    expect(visibleHotspots(room, game()).map((h) => h.id)).not.toContain("geheim");
    expect(visibleHotspots(room, game({ flags: { gelesen: true } })).map((h) => h.id)).toContain("geheim");
  });
  it("zeigt nur vorhandene Verben", () => {
    const [tonne, , , tor] = content.rooms.hof!.hotspots;
    expect(availableVerbs(tonne!)).toEqual(["untersuchen"]);
    expect(availableVerbs(tor!)).toEqual(["untersuchen", "gehen"]);
  });
});

describe("reduce", () => {
  it("NEW_GAME startet mit Namen und zeigt die Beschreibung", () => {
    const { state, events } = reduce(
      game({ flags: { alt: true } }),
      { type: "NEW_GAME", playerName: " KRAZE " },
      content,
      NOW,
    );
    expect(state.player.name).toBe("KRAZE");
    expect(state.flags).toEqual({});
    expect(state.visited).toEqual(["hof"]);
    expect(events).toContainEqual({ type: "TEXT", lines: ["Hi KRAZE."] });
  });

  it("NEW_GAME mit ungültigem Namen ändert nichts", () => {
    const s = game();
    const { state, events } = reduce(s, { type: "NEW_GAME", playerName: "x" }, content, NOW);
    expect(state).toBe(s);
    expect(events[0]?.type).toBe("WARNING");
  });

  it("ENTER_ROOM merkt besuchte Rooms, Beschreibung nur beim ersten Mal", () => {
    const first = reduce(game(), { type: "ENTER_ROOM", room: "hof" }, content, LATER);
    expect(first.state.visited).toEqual(["hof"]);
    expect(first.state.meta.updatedAt).toBe(LATER);
    expect(first.events).toContainEqual({ type: "ROOM_ENTERED", room: "hof", firstVisit: true });
    const second = reduce(first.state, { type: "ENTER_ROOM", room: "hof" }, content, LATER);
    expect(second.events.some((e) => e.type === "TEXT")).toBe(false);
  });

  it("ENTER_ROOM mit unbekanntem Room ändert nichts", () => {
    const s = game();
    const r = reduce(s, { type: "ENTER_ROOM", room: "mond" }, content, NOW);
    expect(r.state).toBe(s);
    expect(r.events[0]?.type).toBe("WARNING");
  });

  it("untersuchen zeigt Text mit Namen und ändert den Stand nicht", () => {
    const s = game();
    const r = reduce(s, { type: "INTERACT", hotspot: "tonne", verb: "untersuchen" }, content, NOW);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: "TEXT", lines: ["Eine Tonne.", "Mit KRAZEs Tag."] }]);
  });

  it("untersuchen führt Effekte aus und macht Hotspots sichtbar", () => {
    const r1 = reduce(game(), { type: "INTERACT", hotspot: "zettel", verb: "untersuchen" }, content, LATER);
    expect(r1.state.flags.gelesen).toBe(true);
    expect(r1.state.meta.updatedAt).toBe(LATER);
    const r2 = reduce(r1.state, { type: "INTERACT", hotspot: "zettel", verb: "untersuchen" }, content, LATER);
    expect(r2.events).toEqual([{ type: "TEXT", lines: ["Kennst du schon."] }]);
    const r3 = reduce(r1.state, { type: "INTERACT", hotspot: "geheim", verb: "untersuchen" }, content, LATER);
    expect(r3.events).toEqual([{ type: "TEXT", lines: ["Da!"] }]);
  });

  it("unsichtbare Hotspots lassen sich nicht benutzen", () => {
    const s = game();
    const r = reduce(s, { type: "INTERACT", hotspot: "geheim", verb: "untersuchen" }, content, NOW);
    expect(r.state).toBe(s);
    expect(r.events[0]?.type).toBe("WARNING");
  });

  it("gehen wechselt den Room", () => {
    const r = reduce(game(), { type: "INTERACT", hotspot: "tor", verb: "gehen" }, content, NOW);
    expect(r.state.room).toBe("strasse");
    expect(r.state.visited).toContain("strasse");
  });

  it("unbekannter Hotspot oder fehlendes Verb ändert nichts", () => {
    const s = game();
    expect(reduce(s, { type: "INTERACT", hotspot: "ufo", verb: "untersuchen" }, content, NOW).state).toBe(s);
    const r = reduce(s, { type: "INTERACT", hotspot: "tonne", verb: "gehen" }, content, NOW);
    expect(r.state).toBe(s);
    expect(r.events[0]?.type).toBe("WARNING");
  });

  it("TICK zählt Spielzeit und begrenzt Ausreißer", () => {
    const s = game();
    expect(reduce(s, { type: "TICK", seconds: 15 }, content).state.meta.playSeconds).toBe(15);
    expect(reduce(s, { type: "TICK", seconds: 99999 }, content).state.meta.playSeconds).toBe(3600);
    expect(reduce(s, { type: "TICK", seconds: -5 }, content).state).toBe(s);
  });
});

describe("migrate", () => {
  it("lädt einen gültigen Spielstand", () => {
    const s = game();
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("lehnt Unsinn, fremde Versionen und beschädigte Stände ab", () => {
    expect(() => migrate(null)).toThrow(SaveFormatError);
    expect(() => migrate({ foo: 1 })).toThrow(SaveFormatError);
    expect(() => migrate({ ...game(), schemaVersion: 99 })).toThrow(/Version 99/);
    expect(() => migrate({ ...game(), visited: "hof" })).toThrow(/beschädigt/);
  });
  it("bringt Spielstände aus M1/M2 (v1) auf den neuesten Stand – mit Startausrüstung, ohne Werke", () => {
    const v1: Record<string, unknown> = { ...game(), schemaVersion: 1 };
    delete v1.items;
    delete v1.works;
    const withStart = { ...content, config: { ...content.config, start_items: { standard_cap: 1 } } };
    const migrated = migrate(v1, withStart);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.items).toEqual({ standard_cap: 1 });
    expect(migrated.works).toEqual({});
    expect(migrated.player.name).toBe("KRAZE");
  });
  it("bringt Spielstände aus M3 (v2) auf v3 – alte Werke fehlerfrei, Start-Farben in die Tasche", () => {
    const withColors: GameContent = {
      ...content,
      config: { ...content.config, start_items: { standard_cap: 1, schwarz: 1, chrom: 1 } },
      items: {
        standard_cap: { id: "standard_cap", name: "Standard-Cap", kind: "cap", width: 2, text: "." },
        schwarz: { id: "schwarz", name: "Schwarz", kind: "color", color: "black", text: "." },
        chrom: { id: "chrom", name: "Chrom", kind: "color", color: "light_grey", text: "." },
      },
    };
    const v2 = {
      ...game(),
      schemaVersion: 2,
      items: { standard_cap: 1, low_pressure: 1 },
      works: {
        rolltore: { style: "throwup", cap: "fat_cap", dose: "high_pressure", quality: 3, at: "2026-01-01" },
        hall: { style: "hollow", cap: "skinny_cap", dose: "low_pressure", quality: 2, at: "2026-01-02" },
      },
    };
    const m = migrate(JSON.parse(JSON.stringify(v2)), withColors);
    expect(m.schemaVersion).toBe(4);
    expect(m.items).toEqual({ standard_cap: 1, low_pressure: 1, schwarz: 1, chrom: 1 });
    expect(m.works.rolltore).toEqual({
      style: "bubble",
      colors: { line: "schwarz", fill: ["chrom"], outline: "schwarz" },
      dose: "high_pressure",
      passes: [],
      seed: 1,
      quality: 3,
      at: "2026-01-01",
      ideal: true,
    });
    expect(m.works.hall?.style).toBe("bubble");
  });
  it("bringt Spielstände aus M3.5 (v3) auf v4 – XP für vorhandene Werke", () => {
    const withProgress: GameContent = {
      ...content,
      spray: {
        quality_labels: ["a", "b", "c", "d"],
        result: "{style}",
        hints: { gaps: ".", gaps_low: ".", reach: ".", fat_line: ".", drips: "." },
        styles: [
          { id: "bubble", name: "Bubble", look: "bubble", caps: { fill: ["f"], outline: ["o"] }, xp: 30 },
        ],
      },
      spots: {
        wand: {
          id: "wand",
          name: "der Wand",
          type: "hauswand",
          room: "hof",
          hotspot: "tor",
          fits: ["bubble"],
          fit_hint: ".",
          risk: "kein",
        },
      },
      progress: {
        rank_up_title: "Neuer Rang",
        ranks: [
          { id: "toy", name: "Toy", xp: 0 },
          { id: "tagger", name: "Tagger", xp: 30 },
        ],
        quality_factors: [0, 0.5, 1, 1.5],
        spot_factors: { hauswand: 1.2 },
        tempo_bonus_max: 0.3,
        tempo_min_quality: 2,
        repeat_share: 0.2,
      },
    };
    const v3: Record<string, unknown> = {
      ...game(),
      schemaVersion: 3,
      works: {
        wand: {
          style: "bubble",
          colors: { fill: ["chrom"], outline: "schwarz" },
          dose: "low_pressure",
          passes: [],
          seed: 1,
          quality: 3,
          at: "2026-01-01",
          ideal: true,
        },
      },
    };
    delete v3.xp;
    delete v3.best;
    const m = migrate(v3, withProgress);
    expect(m.schemaVersion).toBe(4);
    expect(m.xp).toBe(54); // 30 × 1,5 × 1,2
    expect(m.best.wand).toBe(54);
    expect(rankOf(m, withProgress)?.id).toBe("tagger");
  });

  it("setzt auf den Start-Room zurück, wenn es den Room nicht mehr gibt", () => {
    expect(fitToContent(game({ room: "weg" }), content).room).toBe("hof");
    const s = game();
    expect(fitToContent(s, content)).toBe(s);
  });
});
