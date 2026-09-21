import { describe, expect, it } from "vitest";
import {
  createNewGame,
  reduce,
  viewDialogue,
  type Action,
  type GameContent,
  type GameEvent,
  type GameState,
} from "@/engine";

const NOW = "2026-01-01T00:00:00.000Z";

// Kleiner Test-Inhalt: Kalle verrät den Zaun erst ab Vertrauen 2, der Zaun-Hotspot erscheint mit der Info.
const content: GameContent = {
  config: {
    start_room: "hof",
    trust_labels: ["Fremder", "Gesehen", "Bekannt", "Respekt", "Vertraut", "Family"],
  },
  rooms: {
    hof: {
      id: "hof",
      name: "Hof",
      hotspots: [
        { id: "kalle", label: "Kalle", rect: [0, 0, 20, 20], sprechen: "mentor" },
        { id: "brandt", label: "Polizistin", rect: [30, 0, 20, 20], sprechen: "streife" },
        {
          id: "zaun",
          label: "Zaun",
          rect: [60, 0, 20, 20],
          if: [{ fact: "zaun" }],
          untersuchen: "Ein Loch.",
        },
      ],
    },
  },
  facts: {
    zaun: { id: "zaun", category: "spot", title: "Loch im Zaun", text: "Hinten rechts.", source: "mentor" },
    hall: { id: "hall", category: "spot", title: "Hall", text: "Legal.", source: "mentor" },
  },
  npcs: {
    mentor: {
      id: "mentor",
      name: "Kalle",
      role: "Mentor",
      room: "hof",
      hotspot: "kalle",
      trust: { start: 0 },
      dialogue: {
        start: [{ if: [{ flag: "kennt" }], node: "wieder" }, { node: "erstes" }],
        nodes: {
          erstes: {
            text: ["{name}. Du bist das also.", "Na."],
            effects: [{ set_flag: "kennt" }, { learn: "hall" }],
            next: "hub",
          },
          wieder: { text: "Wieder da.", next: "hub" },
          hub: {
            text: "Was willst du?",
            options: [
              { text: "Ehrlich sein.", id: "ehrlich", once: true, effects: [{ trust: 1 }], next: "hub" },
              { text: "Blackbook zeigen.", id: "bb", once: true, effects: [{ trust: 1 }], next: "hub" },
              {
                text: "Bessere Spots?",
                if: [{ trust_min: 2 }],
                show_locked: "Noch nicht.",
                next: "zaun",
              },
              { text: "Geheim.", if: [{ flag: "nie" }], next: "hub" },
              { text: "Angeben.", effects: [{ trust: -3 }], next: "hub" },
              { text: "Tschüss.", end: true },
            ],
          },
          zaun: { text: "Hinten rechts.", effects: [{ learn: "zaun" }], end: true },
        },
      },
    },
    streife: {
      id: "streife",
      name: "Frau Brandt",
      role: "Streife",
      room: "hof",
      hotspot: "brandt",
      trust: false,
      dialogue: {
        start: "hallo",
        nodes: { hallo: { text: "Na.", options: [{ text: "Hi.", effects: [{ trust: 2 }], end: true }] } },
      },
    },
  },
};

function run(state: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (const a of actions) {
    const r = reduce(s, a, content, NOW);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

const fresh = () => createNewGame(content, "KRAZE", NOW);
const talk: Action = { type: "INTERACT", hotspot: "kalle", verb: "sprechen" };
const choose = (option: number, node = "hub"): Action => ({
  type: "CHOOSE_OPTION",
  npc: "mentor",
  node,
  option,
});

describe("Gespräche", () => {
  it("startet mit dem ersten passenden Start-Knoten und führt Knoten-Effekte aus", () => {
    const r = run(fresh(), talk);
    expect(r.events).toContainEqual({ type: "DIALOGUE", npc: "mentor", node: "erstes" });
    expect(r.events).toContainEqual({ type: "FACT_LEARNED", fact: "hall", title: "Hall" });
    expect(r.state.flags.kennt).toBe(true);
    expect(r.state.facts.hall).toEqual({ new: true });
    // Beim zweiten Mal anderer Start
    expect(run(r.state, talk).events).toContainEqual({ type: "DIALOGUE", npc: "mentor", node: "wieder" });
  });

  it("zeigt den Dialog mit Namen, Vertrauensstufe und Zeilen", () => {
    const s = run(fresh(), talk).state;
    const view = viewDialogue(s, content, "mentor", "erstes")!;
    expect(view.lines).toEqual(["KRAZE. Du bist das also.", "Na."]);
    expect(view.trust).toEqual({ level: 0, label: "Fremder" });
    expect(view.mode).toBe("next");
  });

  it("CONTINUE_DIALOGUE folgt next", () => {
    const r = run(fresh(), talk, { type: "CONTINUE_DIALOGUE", npc: "mentor", node: "erstes" });
    expect(r.events.at(-1)).toEqual({ type: "DIALOGUE", npc: "mentor", node: "hub" });
  });

  it("blendet Optionen aus, zeigt gesperrte mit Hinweis", () => {
    const view = viewDialogue(fresh(), content, "mentor", "hub")!;
    expect(view.options.map((o) => o.text)).toEqual([
      "Ehrlich sein.",
      "Blackbook zeigen.",
      "Bessere Spots?",
      "Angeben.",
      "Tschüss.",
    ]);
    expect(view.options[2]).toEqual({ index: 2, text: "Bessere Spots?", locked: true, hint: "Noch nicht." });
  });

  it("gesperrte oder ausgeblendete Optionen lassen sich nicht wählen", () => {
    const s = fresh();
    expect(run(s, choose(2)).state).toBe(s);
    expect(run(s, choose(3)).events[0]?.type).toBe("WARNING");
  });

  it("Vertrauen wächst, schaltet frei, und die Info macht einen Hotspot sichtbar", () => {
    const r = run(fresh(), talk, choose(0), choose(1));
    expect(r.state.trust.mentor).toBe(2);
    expect(r.events).toContainEqual({ type: "TRUST_CHANGED", npc: "mentor", from: 0, to: 1 });
    expect(r.events).toContainEqual({ type: "TRUST_CHANGED", npc: "mentor", from: 1, to: 2 });
    expect(viewDialogue(r.state, content, "mentor", "hub")!.options[2]?.locked).toBe(false);

    const r2 = run(r.state, choose(2));
    expect(r2.state.facts.zaun).toEqual({ new: true });
    expect(r2.state.newlyVisible).toEqual(["hof.zaun"]);
    expect(r2.events).toContainEqual({ type: "DIALOGUE", npc: "mentor", node: "zaun" });
  });

  it("once-Optionen verschwinden nach dem Wählen", () => {
    const s = run(fresh(), choose(0)).state;
    expect(s.usedOnce).toEqual(["mentor.hub.ehrlich"]);
    expect(viewDialogue(s, content, "mentor", "hub")!.options.map((o) => o.index)).not.toContain(0);
    expect(run(s, choose(0)).events[0]?.type).toBe("WARNING");
  });

  it("Vertrauen bleibt zwischen 0 und 5", () => {
    const s = run(fresh(), choose(4)).state;
    expect(s.trust.mentor ?? 0).toBe(0);
  });

  it("end beendet das Gespräch", () => {
    expect(run(fresh(), choose(5)).events).toEqual([{ type: "DIALOGUE_END", npc: "mentor" }]);
  });

  it("NPCs ohne Vertrauenswert ignorieren trust", () => {
    const s = fresh();
    const r = run(
      s,
      { type: "INTERACT", hotspot: "brandt", verb: "sprechen" },
      {
        type: "CHOOSE_OPTION",
        npc: "streife",
        node: "hallo",
        option: 0,
      },
    );
    expect(r.state.trust.streife).toBeUndefined();
    expect(viewDialogue(s, content, "streife", "hallo")!.trust).toBeNull();
  });

  it("MARK_FACTS_SEEN und SEEN_HOTSPOTS räumen Markierungen auf", () => {
    const s = run(fresh(), talk, choose(0), choose(1), choose(2)).state;
    const seen = run(
      s,
      { type: "MARK_FACTS_SEEN", facts: ["zaun", "hall"] },
      { type: "SEEN_HOTSPOTS", keys: ["hof.zaun"] },
    );
    expect(seen.state.facts).toEqual({ hall: { new: false }, zaun: { new: false } });
    expect(seen.state.newlyVisible).toEqual([]);
    expect(seen.events).toEqual([]);
  });

  it("gelernte Infos bleiben beim erneuten Lernen unverändert", () => {
    const s = run(fresh(), talk).state;
    const again = run({ ...s, flags: {} }, talk);
    expect(again.events.some((e) => e.type === "FACT_LEARNED")).toBe(false);
  });
});
