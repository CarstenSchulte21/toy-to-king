// Der Reducer: nimmt Spielstand + Aktion und liefert den neuen Spielstand + Ereignisse.
// Er verändert nichts direkt und zeigt nichts an. Die Oberfläche zeigt, was in den Ereignissen steht.
// Gleicher Spielstand + gleiche Aktion = immer gleiches Ergebnis. Deshalb lässt sich alles testen.
import type { GameContent } from "./content-schema";
import {
  applyEffects,
  availableVerbs,
  currentRoom,
  isHotspotVisible,
  renderText,
  resolveText,
  type Verb,
} from "./logic";
import { createNewGame, validatePlayerName, type GameState } from "./state";

export type Action =
  | { type: "NEW_GAME"; playerName: string }
  | { type: "ENTER_ROOM"; room: string }
  | { type: "INTERACT"; hotspot: string; verb: Verb }
  | { type: "TICK"; seconds: number };

export type GameEvent =
  | { type: "TEXT"; lines: string[] }
  | { type: "ROOM_ENTERED"; room: string; firstVisit: boolean }
  | { type: "WARNING"; message: string };

export type ReduceResult = { state: GameState; events: GameEvent[] };

const unchanged = (state: GameState, message: string): ReduceResult => ({
  state,
  events: [{ type: "WARNING", message }],
});

export function reduce(
  state: GameState,
  action: Action,
  content: GameContent,
  now: string = new Date().toISOString(),
): ReduceResult {
  switch (action.type) {
    case "NEW_GAME": {
      const check = validatePlayerName(action.playerName);
      if (!check.ok) return unchanged(state, `Ungültiger Name: ${check.error}`);
      const fresh = createNewGame(content, check.name, now);
      return enterRoom(fresh, content.config.start_room, content, now);
    }
    case "ENTER_ROOM":
      return enterRoom(state, action.room, content, now);
    case "INTERACT":
      return interact(state, action.hotspot, action.verb, content, now);
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

function enterRoom(state: GameState, roomId: string, content: GameContent, now: string): ReduceResult {
  const room = content.rooms[roomId];
  if (!room) return unchanged(state, `Unbekannter Room "${roomId}".`);

  const firstVisit = !state.visited.includes(roomId);
  let next: GameState = {
    ...state,
    room: roomId,
    visited: firstVisit ? [...state.visited, roomId] : state.visited,
    meta: { ...state.meta, updatedAt: now },
  };
  const events: GameEvent[] = [{ type: "ROOM_ENTERED", room: roomId, firstVisit }];

  // Die Beschreibung erscheint beim ersten Betreten.
  if (firstVisit) {
    const text = resolveText(room.description, next);
    if (text) {
      next = applyEffects(next, text.effects);
      events.push({ type: "TEXT", lines: text.lines.map((l) => renderText(l, next)) });
    }
  }
  return { state: next, events };
}

function interact(
  state: GameState,
  hotspotId: string,
  verb: Verb,
  content: GameContent,
  now: string,
): ReduceResult {
  const room = currentRoom(state, content);
  const hotspot = room?.hotspots.find((h) => h.id === hotspotId);
  if (!room || !hotspot)
    return unchanged(state, `Unbekannter Hotspot "${hotspotId}" in Room "${state.room}".`);
  if (!isHotspotVisible(hotspot, state))
    return unchanged(state, `Hotspot "${hotspotId}" ist gerade nicht sichtbar.`);
  if (!availableVerbs(hotspot).includes(verb)) {
    return unchanged(state, `Hotspot "${hotspotId}" kann nicht "${verb}".`);
  }

  if (verb === "gehen") return enterRoom(state, hotspot.gehen!, content, now);

  const text = resolveText(hotspot.untersuchen, state);
  if (!text) return unchanged(state, `Für "${hotspotId}" passt gerade kein Text.`);
  let next = applyEffects(state, text.effects);
  if (next !== state) next = { ...next, meta: { ...next.meta, updatedAt: now } };
  return { state: next, events: [{ type: "TEXT", lines: text.lines.map((l) => renderText(l, next)) }] };
}
