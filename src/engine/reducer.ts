// Der Reducer: nimmt Spielstand + Aktion und liefert den neuen Spielstand + Ereignisse.
// Er verändert nichts direkt und zeigt nichts an. Die Oberfläche zeigt, was in den Ereignissen steht.
// Gleicher Spielstand + gleiche Aktion = immer gleiches Ergebnis. Deshalb lässt sich alles testen.
import type { GameContent } from "./content-schema";
import { enterNode, findNode, onceKey, optionViews, startNode } from "./dialogue";
import {
  applyEffects,
  availableVerbs,
  currentRoom,
  isHotspotVisible,
  renderText,
  resolveText,
  trustOf,
  visibleHotspotKeys,
  type Verb,
} from "./logic";
import { isSpotKnown, mapPlaces, rateSpray, sprayChoices, sprayResultText } from "./spray";
import { createNewGame, validatePlayerName, type GameState } from "./state";

export type Action =
  | { type: "NEW_GAME"; playerName: string }
  | { type: "ENTER_ROOM"; room: string }
  | { type: "INTERACT"; hotspot: string; verb: Verb }
  | { type: "CHOOSE_OPTION"; npc: string; node: string; option: number }
  | { type: "CONTINUE_DIALOGUE"; npc: string; node: string }
  | { type: "MARK_FACTS_SEEN"; facts: string[] }
  | { type: "SEEN_HOTSPOTS"; keys: string[] }
  | { type: "TRAVEL"; room: string }
  | { type: "SPRAY"; spot: string; style: string; cap: string; dose: string }
  | { type: "TICK"; seconds: number };

export type GameEvent =
  | { type: "TEXT"; lines: string[] }
  | { type: "ROOM_ENTERED"; room: string; firstVisit: boolean }
  | { type: "DIALOGUE"; npc: string; node: string }
  | { type: "DIALOGUE_END"; npc: string }
  | { type: "FACT_LEARNED"; fact: string; title: string }
  | { type: "TRUST_CHANGED"; npc: string; from: number; to: number }
  | { type: "ITEM_GAINED"; item: string; name: string }
  | { type: "SPRAY_OPEN"; spot: string }
  | { type: "SPRAYED"; spot: string; quality: number; label: string }
  | { type: "WARNING"; message: string };

export type ReduceResult = { state: GameState; events: GameEvent[] };

const unchanged = (state: GameState, message: string): ReduceResult => ({
  state,
  events: [{ type: "WARNING", message }],
});

// Aktionen, die nur Markierungen aufräumen – dabei entsteht nichts Neues.
const HOUSEKEEPING = new Set<Action["type"]>(["MARK_FACTS_SEEN", "SEEN_HOTSPOTS", "TICK", "NEW_GAME"]);

export function reduce(
  state: GameState,
  action: Action,
  content: GameContent,
  now: string = new Date().toISOString(),
): ReduceResult {
  const result = reduceAction(state, action, content, now);
  if (result.state === state) return result;

  let next = result.state;
  const events = [...result.events];

  if (!HOUSEKEEPING.has(action.type)) {
    // Neue Infos und Vertrauensänderungen als Ereignisse melden, damit die Oberfläche Hinweise zeigen kann.
    for (const factId of Object.keys(next.facts)) {
      if (!state.facts[factId]) {
        events.push({ type: "FACT_LEARNED", fact: factId, title: content.facts[factId]?.title ?? factId });
      }
    }
    for (const [item, count] of Object.entries(next.items)) {
      if (count > (state.items[item] ?? 0)) {
        events.push({ type: "ITEM_GAINED", item, name: content.items[item]?.name ?? item });
      }
    }
    for (const npcId of Object.keys(next.trust)) {
      const from = trustOf(state, content, npcId);
      const to = trustOf(next, content, npcId);
      if (from !== to) events.push({ type: "TRUST_CHANGED", npc: npcId, from, to });
    }
    // Hotspots, die durch diese Aktion sichtbar wurden, einmal hervorheben (SPEC 5, Punkt 9).
    const before = visibleHotspotKeys(state, content);
    const fresh = [...visibleHotspotKeys(next, content)].filter(
      (k) => !before.has(k) && !next.newlyVisible.includes(k),
    );
    if (fresh.length > 0) next = { ...next, newlyVisible: [...next.newlyVisible, ...fresh] };
  }

  if (action.type !== "TICK") next = { ...next, meta: { ...next.meta, updatedAt: now } };
  return { state: next, events };
}

function reduceAction(state: GameState, action: Action, content: GameContent, now: string): ReduceResult {
  switch (action.type) {
    case "NEW_GAME": {
      const check = validatePlayerName(action.playerName);
      if (!check.ok) return unchanged(state, `Ungültiger Name: ${check.error}`);
      const fresh = createNewGame(content, check.name, now);
      return enterRoom(fresh, content.config.start_room, content);
    }
    case "ENTER_ROOM":
      return enterRoom(state, action.room, content);
    case "INTERACT":
      return interact(state, action.hotspot, action.verb, content);
    case "CHOOSE_OPTION":
      return chooseOption(state, action, content);
    case "CONTINUE_DIALOGUE": {
      const found = findNode(content, action.npc, action.node);
      if (!found) return unchanged(state, `Unbekannter Knoten "${action.node}" bei "${action.npc}".`);
      if (!found.node.next) return unchanged(state, `Knoten "${action.node}" hat kein "next".`);
      return goToNode(state, content, action.npc, found.node.next);
    }
    case "TRAVEL": {
      if (!mapPlaces(state, content).some((p) => p.room === action.room)) {
        return unchanged(state, `"${action.room}" ist auf der Karte noch nicht bekannt.`);
      }
      return enterRoom(state, action.room, content);
    }
    case "SPRAY":
      return spray(state, action, content, now);
    case "MARK_FACTS_SEEN": {
      const toMark = action.facts.filter((f) => state.facts[f]?.new);
      if (toMark.length === 0) return { state, events: [] };
      const facts = { ...state.facts };
      for (const f of toMark) facts[f] = { new: false };
      return { state: { ...state, facts }, events: [] };
    }
    case "SEEN_HOTSPOTS": {
      const remaining = state.newlyVisible.filter((k) => !action.keys.includes(k));
      if (remaining.length === state.newlyVisible.length) return { state, events: [] };
      return { state: { ...state, newlyVisible: remaining }, events: [] };
    }
    case "TICK": {
      const seconds = Math.min(Math.max(0, Math.floor(action.seconds)), 3600);
      if (seconds === 0) return { state, events: [] };
      return {
        state: { ...state, meta: { ...state.meta, playSeconds: state.meta.playSeconds + seconds } },
        events: [],
      };
    }
  }
}

function enterRoom(state: GameState, roomId: string, content: GameContent): ReduceResult {
  const room = content.rooms[roomId];
  if (!room) return unchanged(state, `Unbekannter Room "${roomId}".`);

  const firstVisit = !state.visited.includes(roomId);
  let next: GameState = {
    ...state,
    room: roomId,
    visited: firstVisit ? [...state.visited, roomId] : state.visited,
  };
  const events: GameEvent[] = [{ type: "ROOM_ENTERED", room: roomId, firstVisit }];

  // Die Beschreibung erscheint beim ersten Betreten.
  if (firstVisit) {
    const text = resolveText(room.description, next, { content });
    if (text) {
      next = applyEffects(next, text.effects, { content });
      events.push({ type: "TEXT", lines: text.lines.map((l) => renderText(l, next)) });
    }
  }
  return { state: next, events };
}

function interact(state: GameState, hotspotId: string, verb: Verb, content: GameContent): ReduceResult {
  const room = currentRoom(state, content);
  const hotspot = room?.hotspots.find((h) => h.id === hotspotId);
  if (!room || !hotspot)
    return unchanged(state, `Unbekannter Hotspot "${hotspotId}" in Room "${state.room}".`);
  if (!isHotspotVisible(hotspot, state, content)) {
    return unchanged(state, `Hotspot "${hotspotId}" ist gerade nicht sichtbar.`);
  }
  if (!availableVerbs(hotspot, state, content).includes(verb))
    return unchanged(state, `Hotspot "${hotspotId}" kann nicht "${verb}".`);

  if (verb === "gehen") return enterRoom(state, hotspot.gehen!, content);

  if (verb === "sprühen") {
    const spot = content.spots[hotspot.sprühen!];
    if (!spot || !isSpotKnown(spot, state, content))
      return unchanged(state, `Hier kann man (noch) nicht sprühen.`);
    return { state, events: [{ type: "SPRAY_OPEN", spot: spot.id }] };
  }

  if (verb === "sprechen") {
    const npc = content.npcs[hotspot.sprechen!];
    if (!npc) return unchanged(state, `Unbekannter NPC "${hotspot.sprechen}".`);
    const node = startNode(state, content, npc);
    if (!node) return unchanged(state, `${npc.name}: Kein Start-Knoten passt gerade.`);
    return goToNode(state, content, npc.id, node);
  }

  const text = resolveText(hotspot.untersuchen, state, { content });
  if (!text) return unchanged(state, `Für "${hotspotId}" passt gerade kein Text.`);
  const next = applyEffects(state, text.effects, { content });
  return { state: next, events: [{ type: "TEXT", lines: text.lines.map((l) => renderText(l, next)) }] };
}

function goToNode(state: GameState, content: GameContent, npcId: string, nodeId: string): ReduceResult {
  if (!findNode(content, npcId, nodeId))
    return unchanged(state, `Unbekannter Knoten "${nodeId}" bei "${npcId}".`);
  return {
    state: enterNode(state, content, npcId, nodeId),
    events: [{ type: "DIALOGUE", npc: npcId, node: nodeId }],
  };
}

function chooseOption(
  state: GameState,
  action: Extract<Action, { type: "CHOOSE_OPTION" }>,
  content: GameContent,
): ReduceResult {
  const found = findNode(content, action.npc, action.node);
  const option = found?.node.options?.[action.option];
  if (!found || !option) return unchanged(state, `Unbekannte Option ${action.option} in "${action.node}".`);

  // Nochmal prüfen: Nur erlaubte, nicht gesperrte Optionen dürfen gewählt werden.
  const view = optionViews(state, content, action.npc, action.node).find((o) => o.index === action.option);
  if (!view || view.locked)
    return unchanged(state, `Option ${action.option} in "${action.node}" ist gerade nicht wählbar.`);

  let next = applyEffects(state, option.effects, { content, npc: action.npc });
  if (option.once)
    next = { ...next, usedOnce: [...next.usedOnce, onceKey(action.npc, action.node, option, action.option)] };

  if (option.end || !option.next) {
    return { state: next, events: [{ type: "DIALOGUE_END", npc: action.npc }] };
  }
  return goToNode(next, content, action.npc, option.next);
}

function spray(
  state: GameState,
  action: Extract<Action, { type: "SPRAY" }>,
  content: GameContent,
  now: string,
): ReduceResult {
  const choices = sprayChoices(state, content, action.spot);
  if (!choices) return unchanged(state, `Unbekannter Spot "${action.spot}".`);
  const { spot } = choices;
  if (state.room !== spot.room) return unchanged(state, `Für "${spot.name}" musst du vor Ort sein.`);
  if (!isSpotKnown(spot, state, content)) return unchanged(state, `"${spot.name}" kennst du noch nicht.`);
  const styleChoice = choices.styles.find((s) => s.id === action.style);
  if (!styleChoice?.available) return unchanged(state, `Style "${action.style}" geht gerade nicht.`);
  if (!choices.caps.some((c) => c.id === action.cap))
    return unchanged(state, `Cap "${action.cap}" hast du nicht.`);
  if (!choices.doses.some((d) => d.id === action.dose))
    return unchanged(state, `Dose "${action.dose}" hast du nicht.`);

  const style = content.spray!.styles.find((s) => s.id === action.style)!;
  const rating = rateSpray(content, spot, style, action.cap, action.dose);
  const next: GameState = {
    ...state,
    works: {
      ...state.works,
      [spot.id]: { style: style.id, cap: action.cap, dose: action.dose, quality: rating.quality, at: now },
    },
  };
  return {
    state: next,
    events: [
      { type: "SPRAYED", spot: spot.id, quality: rating.quality, label: rating.label },
      { type: "TEXT", lines: [sprayResultText(content, next, spot, style, rating.label), ...rating.hints] },
    ],
  };
}
