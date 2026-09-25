// Risiko (M4b): Zeit, Heat, Wanted, Buff und Crossen.
// Gewürfelt wird aus einer Saat – deshalb lässt sich jeder Ausgang gezielt herstellen und prüfen.
import { describe, expect, it } from "vitest";
import {
  advanceTime,
  bumpHeat,
  createNewGame,
  heatOf,
  passDays,
  riskFor,
  roll,
  rollOutcome,
  setWanted,
  turnOfDay,
  weekdayOf,
  stepsLeft,
  type GameContent,
  type Spot,
  type GameState,
} from "@/engine";

const risk: NonNullable<GameContent["risk"]> = {
  phases: ["Tag", "Abend", "Nacht"],
  weekdays: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
  heat_labels: ["ruhig", "beobachtet", "heiß", "verbrannt"],
  wanted_labels: ["unauffällig", "bekannt", "gesucht", "ganz oben"],
  risk_labels: ["kaum was", "geht schon", "wird eng", "Selbstmord"],
  time: { steps_per_day: 12, room: 1, travel: 2, talk: 1, work: 3, marker: 1 },
  base: { legale_wand: 0, rolltor: 0.25, hauswand: 0.15, heaven_spot: 0.4, zug: 0.45 },
  per_heat: 0.12,
  per_wanted: 0.1,
  per_phase: [0.15, 0, -0.15],
  slow_max: 0.15,
  cap: 0.85,
  caught_share: 0.34,
  heat_per_work: 1,
  heat_per_caught: 3,
  heat_decay: 1,
  buff_per_day: { rolltor: 0.2, hauswand: 0.1, heaven_spot: 0.05, zug: 0.15, legale_wand: 0 },
  buff_weekday: { day: "mo", type: "rolltor" },
  wanted_relief_legal: 1,
  cross_per_day: 0.2,
  cross_max_quality: 1,
  station_room: "wache",
  texts: {
    escaped: ["Weg hier."],
    caught: ["Erwischt."],
    buffed: "{spot}: weg.",
    crossed: "{spot}: gecrosst.",
    day: "{weekday}, Tag {day}.",
    hide_out: ["Einen Tag nichts."],
    no_time: "Schluss für heute.",
  },
};

const spot = (id: string, type: "rolltor" | "legale_wand" | "zug") => ({
  id,
  name: id,
  type,
  room: "r",
  hotspot: "h",
  fits: ["tag"],
  fit_hint: "…",
  risk: "mittel" as const,
});

const content = {
  config: { start_room: "r" },
  rooms: { r: { id: "r", name: "R", hotspots: [] } },
  npcs: {},
  facts: {},
  items: {},
  spray: null,
  spots: {
    rolltore: spot("rolltore", "rolltor"),
    hall: spot("hall", "legale_wand"),
    waggon: spot("waggon", "zug"),
  },
  map: null,
  progress: null,
  risk,
  economy: null,
} as unknown as GameContent;

function game(extra: Partial<GameState> = {}): GameState {
  return { ...createNewGame(content, "TESTER", "2026-01-01T00:00:00.000Z"), ...extra };
}

const work = (quality: number) => ({
  style: "tag",
  colors: { line: "schwarz" },
  dose: "low",
  passes: [],
  seed: 1,
  quality,
  at: "2026-01-01T00:00:00.000Z",
});

describe("Zeit", () => {
  it("ein Tag hat drei Abschnitte, danach ist der nächste Tag dran", () => {
    let s = game();
    expect([s.day, s.phase]).toEqual([1, 0]);
    s = advanceTime(s, content, 4);
    expect([s.day, s.phase]).toEqual([1, 1]);
    s = advanceTime(s, content, 4);
    expect([s.day, s.phase]).toEqual([1, 2]);
    s = advanceTime(s, content, 4);
    expect([s.day, s.phase]).toEqual([2, 0]);
  });

  it("kleine Schritte bleiben im selben Abschnitt", () => {
    let s = game();
    s = advanceTime(s, content, 1);
    expect([s.step, s.phase]).toEqual([1, 0]);
    s = advanceTime(s, content, 2);
    expect([s.step, s.phase]).toEqual([3, 0]);
    s = advanceTime(s, content, 1);
    expect([s.step, s.phase]).toEqual([4, 1]);
  });

  it("ein Werk kurz vor Mitternacht reicht in den nächsten Tag hinein", () => {
    const s = advanceTime(game(), content, 14);
    expect([s.day, s.step, s.phase]).toEqual([2, 2, 0]);
  });

  it("der Rest des Tages ist ablesbar", () => {
    expect(stepsLeft(game(), content)).toBe(12);
    expect(stepsLeft(advanceTime(game(), content, 5), content)).toBe(7);
  });

  it("Tag 1 ist ein Montag, Tag 8 wieder", () => {
    expect(weekdayOf(1)).toBe("mo");
    expect(weekdayOf(7)).toBe("so");
    expect(weekdayOf(8)).toBe("mo");
  });
});

describe("Risiko", () => {
  it("an der legalen Wand passiert nie etwas", () => {
    const view = riskFor(content, game(), content.spots.hall!);
    expect(view.chance).toBe(0);
  });

  it("Heat, Wanted und Tageszeit schlagen auf", () => {
    const base = riskFor(content, { ...game(), phase: 1 }, content.spots.rolltore!);
    expect(base.chance).toBeCloseTo(0.25);

    const hot = riskFor(
      content,
      { ...game(), phase: 1, heat: { rolltore: 2 }, wanted: 1 },
      content.spots.rolltore!,
    );
    expect(hot.chance).toBeCloseTo(0.25 + 0.24 + 0.1);
  });

  it("nachts ist es am selben Spot ruhiger als am Tag", () => {
    const day = riskFor(content, { ...game(), phase: 0 }, content.spots.waggon!);
    const night = riskFor(content, { ...game(), phase: 2 }, content.spots.waggon!);
    expect(night.chance).toBeLessThan(day.chance);
  });

  it("Trödeln kostet", () => {
    const quick = riskFor(content, game(), content.spots.rolltore!, 0);
    const slow = riskFor(content, game(), content.spots.rolltore!, 1);
    expect(slow.chance).toBeCloseTo(quick.chance + 0.15);
  });

  it("nie über der Obergrenze", () => {
    const view = riskFor(
      content,
      { ...game(), phase: 0, heat: { waggon: 3 }, wanted: 3 },
      content.spots.waggon!,
      1,
    );
    expect(view.chance).toBeLessThanOrEqual(0.85);
  });

  it("ohne Chance passiert nichts, bei voller Chance immer etwas", () => {
    expect(rollOutcome(content, 0, 1)).toBe("clean");
    const outcomes = new Set<string>();
    for (let seed = 1; seed < 200; seed++) outcomes.add(rollOutcome(content, 1, seed));
    expect(outcomes).toEqual(new Set(["escaped", "caught"]));
  });

  it("knapp entkommen ist häufiger als erwischt werden", () => {
    let caught = 0;
    for (let seed = 1; seed < 2000; seed++) if (rollOutcome(content, 1, seed) === "caught") caught++;
    expect(caught).toBeGreaterThan(400);
    expect(caught).toBeLessThan(900);
  });

  it("gleiche Saat, gleicher Wurf", () => {
    expect(roll(42, "incident")).toBe(roll(42, "incident"));
    expect(roll(42, "incident")).not.toBe(roll(43, "incident"));
  });
});

describe("Heat und Wanted", () => {
  it("Heat steigt und ist bei 3 gedeckelt", () => {
    let s = game();
    for (let i = 0; i < 5; i++) s = bumpHeat(s, "rolltore", 1);
    expect(heatOf(s, "rolltore")).toBe(3);
  });

  it("Heat kühlt über Nacht ab, Wanted nicht", () => {
    const s: GameState = { ...game(), heat: { rolltore: 2 }, wanted: 2, day: 2 };
    const turn = turnOfDay(s, content, 2);
    expect(heatOf(turn.state, "rolltore")).toBe(1);
    expect(turn.state.wanted).toBe(2);
  });

  it("Wanted bleibt zwischen 0 und 3", () => {
    expect(setWanted(game(), -5).wanted).toBe(0);
    expect(setWanted(game(), 9).wanted).toBe(3);
  });
});

describe("Buff und Crossen", () => {
  it("montags sind die Rolltore leer", () => {
    const s: GameState = { ...game(), works: { rolltore: work(3) }, day: 8 };
    const turn = turnOfDay(s, content, 8); // Tag 8 ist wieder Montag
    expect(turn.buffed).toContain("rolltore");
    expect(turn.state.works.rolltore).toBeUndefined();
  });

  it("an der legalen Wand bufft niemand", () => {
    const s: GameState = { ...game(), works: { hall: work(3) }, day: 8 };
    let current = s;
    for (let day = 2; day <= 40; day++) current = turnOfDay(current, content, day).state;
    expect(current.works.hall).toBeDefined();
  });

  it("ein gutes Werk wird nie gecrosst, ein schlechtes irgendwann schon", () => {
    let good: GameState = { ...game(), works: { hall: work(3) } };
    for (let day = 2; day <= 60; day++) good = turnOfDay(good, content, day).state;
    expect(good.works.hall).toBeDefined();

    let crossedSomewhere = false;
    for (let day = 2; day <= 60; day++) {
      const turn = turnOfDay({ ...game(), works: { hall: work(1) } }, content, day);
      if (turn.crossed.includes("hall")) crossedSomewhere = true;
    }
    expect(crossedSomewhere).toBe(true);
  });

  it("mehrere Tage auf einmal werden alle abgearbeitet", () => {
    const s: GameState = { ...game(), heat: { waggon: 3 }, day: 4 };
    const turn = passDays(s, content, 1);
    expect(heatOf(turn.state, "waggon")).toBe(0);
  });
});

// Die Nacht soll sich lohnen: Zuschläge am Spot, die an der Lage hängen.
describe("Zuschläge aufs Risiko", () => {
  const guarded = {
    id: "laden",
    name: "dem Rolltor",
    type: "rolltor",
    room: "strasse",
    hotspot: "rolltore",
    fits: ["tag"],
    fit_hint: "…",
    risk: "mittel",
    risk_mod: [
      { if: [{ not_phase: "nacht" }], by: 0.3, hint: "Die Streife steht daneben." },
      { if: [{ flag: "licht_aus" }], by: -0.25, hint: "Die Laterne ist aus." },
    ],
  } as unknown as Spot;

  it("tagsüber macht die Streife den Spot deutlich gefährlicher", () => {
    const tags = riskFor(content, game({ phase: 0 }), guarded);
    const nachts = riskFor(content, game({ phase: 2 }), guarded);
    expect(tags.chance).toBeGreaterThan(nachts.chance);
    expect(tags.reasons.map((r) => r.text)).toContain("Die Streife steht daneben.");
  });

  it("Licht aus hilft, und der Grund steht dabei", () => {
    const hell = riskFor(content, game({ phase: 2 }), guarded);
    const dunkel = riskFor(content, game({ phase: 2, flags: { licht_aus: true } }), guarded);
    expect(dunkel.chance).toBeLessThan(hell.chance);
    expect(dunkel.reasons.map((r) => r.text)).toContain("Die Laterne ist aus.");
    expect(dunkel.reasons.every((r) => r.by < 0)).toBe(true);
  });

  it("ohne passende Lage gibt es keine Gründe zu zeigen", () => {
    const plain = { ...guarded, risk_mod: undefined } as unknown as Spot;
    expect(riskFor(content, game({ phase: 2 }), plain).reasons).toEqual([]);
  });
});
