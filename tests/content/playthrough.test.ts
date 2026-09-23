// Automatischer Durchlauf durch alle echten Inhalte (SPEC 7, M2):
// Probiert systematisch jede Antwort in jedem Gespräch aus und prüft,
// ob jede Info erreichbar ist, ob man überall weiterkommt und wie viel Vertrauen möglich ist.
import { readContentFiles } from "../helpers/content-files";
import { describe, expect, it } from "vitest";
import { validateContent } from "../../scripts/lib/validate-content";
import {
  createNewGame,
  buildLettering,
  comfortableSpeed,
  passesFor,
  hasRank,
  rankAt,
  rateWork,
  renderWork,
  timeLeftShare,
  xpForWork,
  xpGain,
  traceGuide,
  reduce,
  trustOf,
  visibleHotspots,
  mapPlaces,
  viewDialogue,
  type Action,
  type GameContent,
  type GameState,
} from "@/engine";

function loadContent(): GameContent {
  const r = validateContent(readContentFiles());
  if (!r.content) throw new Error(r.errors.join("\n"));
  return r.content;
}

type Cursor = { npc: string; node: string } | null;
type Explored = {
  learned: Set<string>;
  items: Set<string>;
  maxTrust: number;
  unlockedHotspots: Set<string>;
  stuck: string[];
  states: number;
};

const NOW = "2026-01-01T00:00:00.000Z";

// Probiert alle Gesprächsverläufe mit einem NPC aus – auch mehrere Gespräche hintereinander.
function exploreNpc(content: GameContent, seed: GameState, npcId: string): Explored {
  const npc = content.npcs[npcId]!;
  const out: Explored = {
    learned: new Set(),
    items: new Set(),
    maxTrust: 0,
    unlockedHotspots: new Set(),
    stuck: [],
    states: 0,
  };
  const queue: { state: GameState; cursor: Cursor }[] = [
    { state: { ...seed, room: npc.room }, cursor: null },
  ];
  const seen = new Set<string>();
  const key = (s: GameState, c: Cursor) =>
    JSON.stringify([
      Object.keys(s.facts).sort(),
      s.trust[npcId],
      Object.keys(s.flags).sort(),
      [...s.usedOnce].sort(),
      c,
    ]);

  const step = (state: GameState, action: Action, cursor: Cursor) => {
    const r = reduce(state, action, content, NOW);
    let next: Cursor = cursor;
    for (const e of r.events) {
      if (e.type === "DIALOGUE") next = { npc: e.npc, node: e.node };
      if (e.type === "DIALOGUE_END") next = null;
      if (e.type === "WARNING") out.stuck.push(`${JSON.stringify(action)}: ${e.message}`);
    }
    queue.push({ state: r.state, cursor: next });
  };

  while (queue.length > 0) {
    const { state, cursor } = queue.shift()!;
    const k = key(state, cursor);
    if (seen.has(k)) continue;
    seen.add(k);
    out.states++;
    Object.keys(state.facts).forEach((f) => out.learned.add(f));
    Object.keys(state.items).forEach((i) => out.items.add(i));
    state.newlyVisible.forEach((h) => out.unlockedHotspots.add(h));
    out.maxTrust = Math.max(out.maxTrust, trustOf(state, content, npcId));

    if (cursor === null) {
      step(state, { type: "INTERACT", hotspot: npc.hotspot, verb: "sprechen" }, cursor);
      continue;
    }
    const view = viewDialogue(state, content, cursor.npc, cursor.node)!;
    if (view.mode === "next") step(state, { type: "CONTINUE_DIALOGUE", ...cursor }, cursor);
    if (view.mode === "end") queue.push({ state, cursor: null });
    if (view.mode === "options") {
      const open = view.options.filter((o) => !o.locked);
      if (open.length === 0) out.stuck.push(`${cursor.npc}.${cursor.node}: keine wählbare Antwort`);
      for (const o of open) step(state, { type: "CHOOSE_OPTION", ...cursor, option: o.index }, cursor);
    }
  }
  return out;
}

// Wissen weitergeben: Was man bei einem NPC lernt, öffnet vielleicht etwas bei einem anderen.
// Wiederholen, bis nichts Neues mehr dazukommt.
function explore(content: GameContent) {
  const known = new Set<string>();
  const result = {
    learned: known,
    items: new Set<string>(),
    maxTrust: {} as Record<string, number>,
    unlockedHotspots: new Set<string>(),
    stuck: [] as string[],
    states: 0,
  };
  let changed = true;
  while (changed) {
    changed = false;
    const seed = createNewGame(content, "TESTER", NOW);
    seed.facts = Object.fromEntries([...known].map((f) => [f, { new: false }]));
    for (const npcId of Object.keys(content.npcs)) {
      const r = exploreNpc(content, seed, npcId);
      result.states += r.states;
      result.stuck.push(...r.stuck);
      r.items.forEach((i) => result.items.add(i));
      r.unlockedHotspots.forEach((h) => result.unlockedHotspots.add(h));
      result.maxTrust[npcId] = Math.max(result.maxTrust[npcId] ?? 0, r.maxTrust);
      for (const f of r.learned) {
        if (!known.has(f)) {
          known.add(f);
          changed = true;
        }
      }
    }
  }
  result.stuck = [...new Set(result.stuck)];
  return result;
}

function reachableRooms(content: GameContent): Set<string> {
  const seen = new Set<string>();
  const queue = [content.config.start_room];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const h of content.rooms[id]?.hotspots ?? []) if (h.gehen) queue.push(h.gehen);
    // Über die Karte erreichbare Orte (Schnellreise, sobald die Info bekannt ist).
    for (const p of content.map?.places ?? []) if (p.if) queue.push(p.room);
  }
  return seen;
}

describe("Durchlauf durch die echten Inhalte", () => {
  const content = loadContent();
  const result = explore(content);

  it("hat alle Gesprächsverläufe durchprobiert", () => {
    expect(result.states).toBeGreaterThan(0);
  });

  it("jede Info ist erreichbar", () => {
    expect([...result.learned].sort()).toEqual(Object.keys(content.facts).sort());
  });

  it("man bleibt nirgends hängen", () => {
    expect(result.stuck).toEqual([]);
  });

  it("bei Kalle, Sibel und KRUX kommt man auf Vertrauen 2", () => {
    expect(result.maxTrust.mentor).toBeGreaterThanOrEqual(2);
    expect(result.maxTrust.laden).toBeGreaterThanOrEqual(2);
    expect(result.maxTrust.rivale).toBeGreaterThanOrEqual(2);
  });

  it("Infos schalten Hotspots frei: Zaun und Kamera", () => {
    expect(result.unlockedHotspots).toContain("unterfuehrung.zaunloch");
    expect(result.unlockedHotspots).toContain("strasse.kamera");
  });

  it("alles Material ist erreichbar", () => {
    expect([...result.items].sort()).toEqual(Object.keys(content.items).sort());
  });

  it("an jedem Spot ist mit erreichbarem Material Qualität 3 möglich (sauber nachgefahren)", () => {
    const has = (id: string) => result.items.has(id);
    const doses = Object.values(content.items).filter((i) => i.kind === "dose" && has(i.id));
    const colors = Object.values(content.items).filter((i) => i.kind === "color" && has(i.id));
    for (const spot of Object.values(content.spots)) {
      let best = 0;
      // Gesperrte Styles (Ränge ab M4) zählen hier nicht.
      // Styles, die nur über Ränge oder das KRUX-Gespräch gesperrt sind, erreicht man im Spiel.
      const styles = content.spray!.styles.filter(
        (s) =>
          (s.requires ?? []).every(has) &&
          (!s.only_at || s.only_at.includes(spot.id)) &&
          (s.if ?? []).every((c) => "rank_min" in c || "flag" in c),
      );
      for (const style of styles) {
        for (const dose of doses) {
          const passes = passesFor(style.look).map((kind) => {
            const cap = (style.caps[kind] ?? []).find(has);
            const l = buildLettering("PLAYER", style.look, 3);
            return cap ? { kind, cap, strokes: traceGuide(l, comfortableSpeed(dose.flow!)) } : null;
          });
          if (passes.some((p) => p === null)) continue;
          const work = {
            style: style.id,
            colors: { line: colors[0]!.id, fill: [colors[1]!.id], outline: colors[0]!.id },
            dose: dose.id,
            passes: passes.map((p) => p!),
            seed: 3,
          };
          const stats = renderWork(content, "PLAYER", work)!.stats;
          best = Math.max(best, rateWork(content, spot, style, work, stats).quality);
        }
      }
      expect(best, spot.id).toBe(3);
    }
  });

  it("alle Rooms und alle NPCs sind vom Start aus erreichbar", () => {
    const rooms = reachableRooms(content);
    // Die Wache betritt man nie freiwillig – dorthin bringt einen nur das Erwischtwerden.
    const station = content.risk?.station_room;
    const walkable = Object.keys(content.rooms).filter((r) => r !== station);
    expect([...rooms].sort()).toEqual(walkable.sort());
    for (const npc of Object.values(content.npcs)) expect(rooms).toContain(npc.room);
  });

  it("von der Wache kommt man wieder weg", () => {
    const station = content.risk?.station_room;
    expect(station).toBeTruthy();
    const room = content.rooms[station!];
    expect(room).toBeTruthy();
    expect(room!.hotspots.some((h) => h.gehen !== undefined)).toBe(true);
  });
});

describe("Aufstieg (M4a)", () => {
  const content = loadContent();

  it("jeder Rang ist der Reihe nach erreichbar, King zum Schluss", () => {
    const has = () => true;
    const reached: string[] = [];
    let xp = 0;
    const best: Record<string, number> = {};
    const doses = Object.values(content.items).filter((i) => i.kind === "dose");
    // Immer das Werk sprühen, das gerade am meisten bringt – mit dem, was der Rang freigibt.
    for (let round = 0; round < 60; round++) {
      const rank = rankAt(content, xp);
      if (rank && !reached.includes(rank.id)) reached.push(rank.id);
      let bestGain = 0;
      let bestSpot = "";
      let bestXp = 0;
      for (const spot of Object.values(content.spots)) {
        for (const style of content.spray!.styles) {
          if (!(style.requires ?? []).every(has)) continue;
          if (style.only_at && !style.only_at.includes(spot.id)) continue;
          // Gesperrt, solange der Rang fehlt. Flags (KRUX) gelten ab dem nötigen Rang als erreichbar.
          const locked = (style.if ?? []).some(
            (c) => "rank_min" in c && !hasRank({ xp } as GameState, content, c.rank_min),
          );
          if (locked) continue;
          for (const dose of doses) {
            const l = buildLettering("PLAYER", style.look, 3);
            const passes = passesFor(style.look).map((kind) => ({
              kind,
              cap: (style.caps[kind] ?? [])[0]!,
              strokes: traceGuide(l, comfortableSpeed(dose.flow!)),
            }));
            const work = {
              style: style.id,
              colors: { line: "farbe_schwarz", fill: ["farbe_chrom"], outline: "farbe_schwarz" },
              dose: dose.id,
              passes,
              seed: 3,
            };
            const stats = renderWork(content, "PLAYER", work)!.stats;
            const quality = rateWork(content, spot, style, work, stats).quality;
            const value = xpForWork(content, spot, style, quality, timeLeftShare(l, content, work));
            const gain = xpGain(content, value, best[spot.id] ?? 0);
            if (gain > bestGain) {
              bestGain = gain;
              bestSpot = spot.id;
              bestXp = value;
            }
          }
        }
      }
      if (bestGain <= 0) break;
      best[bestSpot] = Math.max(best[bestSpot] ?? 0, bestXp);
      xp += bestGain;
    }
    expect(reached).toEqual(content.progress!.ranks.map((r) => r.id));
  }, 120_000);
});

// Risiko (M4b) am echten Inhalt: Wer erwischt wird, verliert Material und Zeit –
// aber nicht sein Werk und nicht seinen Fortschritt.
describe("Risiko (M4b)", () => {
  const content = loadContent();

  function sprayAt(state: GameState, spotId: string, seed: number) {
    const spot = content.spots[spotId]!;
    const style = content.spray!.styles.find((s) => s.id === "tag")!;
    const dose = Object.values(content.items).find((i) => i.kind === "dose")!;
    const color = Object.values(content.items).find((i) => i.kind === "color")!;
    const cap = (style.caps.line ?? [])[0]!;
    const lettering = buildLettering(state.player.name, style.look, 3);
    const action: Action = {
      type: "SPRAY",
      spot: spotId,
      style: style.id,
      colors: { line: color.id },
      dose: dose.id,
      passes: [{ kind: "line", cap, strokes: traceGuide(lettering, comfortableSpeed(dose.flow!)) }],
      seed,
    };
    const ready: GameState = {
      ...state,
      room: spot.room,
      items: { ...state.items, [dose.id]: 1, [color.id]: 1, [cap]: 1 },
    };
    return reduce(ready, action, content, NOW);
  }

  function withFacts(): GameState {
    const s = createNewGame(content, "TESTER", NOW);
    return { ...s, facts: Object.fromEntries(Object.keys(content.facts).map((f) => [f, { new: false }])) };
  }

  it("Sprühen schiebt die Zeit weiter", () => {
    const before = withFacts();
    // Saat suchen, bei der nichts passiert – dann zählt nur der Zeitfortschritt.
    for (let seed = 1; seed < 400; seed++) {
      const r = sprayAt(before, "rolltore", seed);
      if (r.events.some((e) => e.type === "ESCAPED" || e.type === "CAUGHT")) continue;
      expect(r.state.phase).toBe(before.phase + 1);
      return;
    }
    throw new Error("keine Saat ohne Zwischenfall gefunden");
  });

  it("Erwischtwerden bringt auf die Wache, kostet Farbe und den Rest des Tages", () => {
    const before: GameState = { ...withFacts(), wanted: 3, heat: { rolltore: 3 }, phase: 0 };
    for (let seed = 1; seed < 400; seed++) {
      const r = sprayAt(before, "rolltore", seed);
      const caught = r.events.find((e) => e.type === "CAUGHT");
      if (!caught) continue;
      expect(r.state.room).toBe(content.risk!.station_room);
      expect(r.state.day).toBe(before.day + 1);
      expect(r.state.phase).toBe(0);
      expect(caught.lost.length).toBeGreaterThan(0);
      // Das Werk bleibt an der Wand, die XP bleiben auch.
      expect(r.state.works.rolltore).toBeDefined();
      expect(r.state.xp).toBeGreaterThanOrEqual(before.xp);
      return;
    }
    throw new Error("keine Saat mit Erwischtwerden gefunden");
  });

  it("nachts ist der Graffitistore zu – weder über die Straße noch über die Karte", () => {
    const tag: GameState = { ...withFacts(), room: "strasse", phase: 0 };
    const night: GameState = { ...tag, phase: 2 };
    const strasse = content.rooms.strasse!;
    const ids = (s: GameState) => visibleHotspots(strasse, s, content).map((h) => h.id);
    expect(ids(tag)).toContain("zum_laden");
    expect(ids(tag)).not.toContain("laden_zu");
    expect(ids(night)).not.toContain("zum_laden");
    expect(ids(night)).toContain("laden_zu");
    expect(mapPlaces(night, content).map((p) => p.room)).not.toContain("farbenladen");
    expect(mapPlaces(tag, content).map((p) => p.room)).toContain("farbenladen");
    // Und wer es trotzdem versucht, kommt nicht rein.
    const r = reduce(night, { type: "TRAVEL", room: "farbenladen" }, content, NOW);
    expect(r.state.room).toBe("strasse");
  });

  it("ein Werk an der Hall senkt das Wanted", () => {
    const before: GameState = { ...withFacts(), wanted: 2 };
    const r = sprayAt(before, "hall", 7);
    expect(r.state.wanted).toBe(1);
    expect(r.events.some((e) => e.type === "CAUGHT" || e.type === "ESCAPED")).toBe(false);
  });
});
