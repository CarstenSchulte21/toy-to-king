import { describe, expect, it } from "vitest";
import {
  SaveFormatError,
  applyEffect,
  availableVerbs,
  createNewGame,
  evaluateAll,
  evaluateCondition,
  fitToContent,
  migrate,
  reduce,
  renderText,
  resolveText,
  validatePlayerName,
  visibleHotspots,
  type GameContent,
  type GameState,
} from "@/engine";

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
};

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
    expect(s.schemaVersion).toBe(1);
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
  it("setzt auf den Start-Room zurück, wenn es den Room nicht mehr gibt", () => {
    expect(fitToContent(game({ room: "weg" }), content).room).toBe("hof");
    const s = game();
    expect(fitToContent(s, content)).toBe(s);
  });
});
