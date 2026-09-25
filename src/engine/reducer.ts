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
import { passesFor, type PassKind, type Stroke } from "./lettering";
import { rankOf, timeLeftShare, xpForWork, xpGain } from "./progress";
import {
  advanceTime,
  costOf,
  nextMorning,
  type TimeCost,
  bumpHeat,
  passDays,
  riskFor,
  rollOutcome,
  setWanted,
  weekdayName,
  type Outcome,
} from "./risk";
import {
  isSpotKnown,
  spotBlocker,
  mapPlaces,
  rateWork,
  renderWork,
  letteringFor,
  sprayChoices,
  sprayResultText,
  styleOf,
  type WorkDraft,
} from "./spray";
import { allowanceFor, buy, paintFor, spendPaint } from "./shop";
import { createNewGame, validatePlayerName, type GameState, type WorkColors } from "./state";

export type Action =
  | { type: "NEW_GAME"; playerName: string }
  | { type: "ENTER_ROOM"; room: string }
  | { type: "INTERACT"; hotspot: string; verb: Verb }
  | { type: "CHOOSE_OPTION"; npc: string; node: string; option: number }
  | { type: "CONTINUE_DIALOGUE"; npc: string; node: string }
  | { type: "MARK_FACTS_SEEN"; facts: string[] }
  | { type: "SEEN_HOTSPOTS"; keys: string[] }
  | { type: "TRAVEL"; room: string }
  | {
      type: "SPRAY";
      spot: string;
      style: string;
      colors: WorkColors;
      dose: string;
      passes: { kind: PassKind; cap: string; strokes: Stroke[] }[];
      seed: number;
    }
  | { type: "BUY"; item: string }
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
  | { type: "SHOP_OPEN" }
  | {
      type: "SPRAYED";
      spot: string;
      quality: number;
      label: string;
      text: string;
      hints: string[];
      xp: number;
    }
  | { type: "XP_GAINED"; amount: number; total: number }
  | { type: "RANK_UP"; rank: string; name: string; text?: string; unlocks?: string }
  | { type: "ESCAPED"; lines: string[]; wanted: number }
  | { type: "CAUGHT"; lines: string[]; wanted: number; lost: string[]; room: string }
  | { type: "DAY_STARTED"; day: number; weekday: string; text: string; buffed: string[]; crossed: string[] }
  | { type: "PHASE_CHANGED"; day: number; phase: number }
  | { type: "BOUGHT"; item: string; name: string; price: number; money: number }
  | { type: "ALLOWANCE"; amount: number; money: number; text: string }
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

  // Tageswechsel: Heat kühlt ab, die Stadt bufft, NOX crosst. Egal, wodurch der Tag vorbei ist.
  if ((next.day ?? 1) > (state.day ?? 1)) {
    const turn = passDays(next, content, state.day ?? 1);
    next = turn.state;
    const texts = content.risk?.texts;
    events.push({
      type: "DAY_STARTED",
      day: next.day,
      weekday: weekdayName(content, next.day),
      text: (texts?.day ?? "Tag {day}.")
        .replace("{day}", String(next.day))
        .replace("{weekday}", weekdayName(content, next.day)),
      buffed: turn.buffed,
      crossed: turn.crossed,
    });
    for (const spotId of turn.buffed) {
      const name = content.spots[spotId]?.name ?? spotId;
      events.push({ type: "TEXT", lines: [(texts?.buffed ?? "{spot}: weg.").replace("{spot}", name)] });
    }
    const amount = allowanceFor(content, state.day ?? 1, next.day);
    if (amount > 0) {
      next = { ...next, money: (next.money ?? 0) + amount };
      events.push({
        type: "ALLOWANCE",
        amount,
        money: next.money,
        text: (content.economy?.allowance.text ?? "{amount} €").replace("{amount}", String(amount)),
      });
    }
    for (const spotId of turn.crossed) {
      const name = content.spots[spotId]?.name ?? spotId;
      events.push({ type: "TEXT", lines: [(texts?.crossed ?? "{spot}: gecrosst.").replace("{spot}", name)] });
    }
  } else if ((next.phase ?? 0) !== (state.phase ?? 0)) {
    events.push({ type: "PHASE_CHANGED", day: next.day, phase: next.phase });
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
      return enterRoom(fresh, content.config.start_room, content, null);
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
      return enterRoom(state, action.room, content, "travel");
    }
    case "SPRAY":
      return spray(state, action, content, now);
    case "BUY": {
      if (!content.economy) return unchanged(state, "Hier gibt es nichts zu kaufen.");
      const here = content.rooms[state.room]?.hotspots.some((h) => h.kaufen === true);
      if (!here) return unchanged(state, "Hier verkauft dir keiner was.");
      const result = buy(state, content, action.item);
      if (!result.ok) return unchanged(state, result.error);
      const item = content.items[action.item]!;
      return {
        state: result.state,
        events: [
          {
            type: "BOUGHT",
            item: item.id,
            name: item.name,
            price: result.price,
            money: result.state.money,
          },
        ],
      };
    }
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

function enterRoom(
  state: GameState,
  roomId: string,
  content: GameContent,
  cost: TimeCost | null = "room",
): ReduceResult {
  const room = content.rooms[roomId];
  if (!room) return unchanged(state, `Unbekannter Room "${roomId}".`);

  const firstVisit = !state.visited.includes(roomId);
  // Der Weg kostet Zeit – außer man steht schon da (Spielstart, Wache nach dem Erwischtwerden).
  const moved = state.room !== roomId;
  let next: GameState = {
    ...(cost && moved ? advanceTime(state, content, costOf(content, cost)) : state),
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
    // Der Spot ist bekannt, geht aber gerade nicht: sagen, was fehlt, statt ihn zu verstecken.
    const blocked = spotBlocker(spot, state, content);
    if (blocked) return { state, events: [{ type: "TEXT", lines: [blocked] }] };
    return { state, events: [{ type: "SPRAY_OPEN", spot: spot.id }] };
  }

  if (verb === "kaufen") {
    if (!content.economy) return unchanged(state, "Hier gibt es nichts zu kaufen.");
    return { state, events: [{ type: "SHOP_OPEN" }] };
  }

  if (verb === "sprechen") {
    const npc = content.npcs[hotspot.sprechen!];
    if (!npc) return unchanged(state, `Unbekannter NPC "${hotspot.sprechen}".`);
    const node = startNode(state, content, npc);
    if (!node) return unchanged(state, `${npc.name}: Kein Start-Knoten passt gerade.`);
    // Ein Gespräch kostet einmal Zeit, egal wie lang es wird. Wer nachfragt, soll nicht zahlen.
    return goToNode(advanceTime(state, content, costOf(content, "talk")), content, npc.id, node);
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

function toLines(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

const MAX_SAMPLES = 12000; // Zahlen je Werk – schützt den Spielstand vor riesigen Fingerbahnen

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
  const blocked = spotBlocker(spot, state, content);
  if (blocked) return unchanged(state, blocked);
  const styleChoice = choices.styles.find((s) => s.id === action.style);
  if (!styleChoice?.available) return unchanged(state, `Style "${action.style}" geht gerade nicht.`);
  const style = styleOf(content, action.style)!;

  const hasColor = (id: string | undefined) => id !== undefined && choices.colors.some((c) => c.id === id);
  const { colors } = action;
  // Marker (M5a): Ein Marker ist Dose, Cap und Farbe in einem. Line, Dose und Cap
  // müssen deshalb derselbe Marker sein, den man auch dabeihat.
  if (style.tool === "marker") {
    const marker = choices.markers.find((m) => m.id === colors.line);
    if (!marker) return unchanged(state, "Dafür brauchst du einen Marker aus deiner Tasche.");
    if (action.dose !== marker.id || action.passes.some((p) => p.cap !== marker.id)) {
      return unchanged(state, "Mit dem Marker malst du in einem – kein extra Cap, keine extra Dose.");
    }
  } else if (style.look === "tag") {
    if (!hasColor(colors.line)) return unchanged(state, "Für den Tag fehlt eine Farbe, die du hast.");
  } else {
    const fill = colors.fill ?? [];
    if (fill.length < 1 || fill.length > 2 || !fill.every(hasColor))
      return unchanged(state, "Fürs Fill-in braucht es 1–2 Farben aus deiner Tasche.");
    if (!hasColor(colors.outline)) return unchanged(state, "Für die Outline fehlt eine Farbe, die du hast.");
  }
  for (const extra of [colors.second, colors.background]) {
    if (extra !== undefined && !hasColor(extra)) return unchanged(state, "Die Farbe hast du nicht.");
  }
  if (style.tool !== "marker" && !choices.doses.some((d) => d.id === action.dose))
    return unchanged(state, `Dose "${action.dose}" hast du nicht.`);
  const expected = passesFor(style.look);
  if (action.passes.length !== expected.length || action.passes.some((p, i) => p.kind !== expected[i]))
    return unchanged(state, `Ebenen passen nicht zum Style: erwartet ${expected.join(", ")}.`);
  if (style.tool !== "marker") {
    for (const p of action.passes) {
      if (!choices.caps.some((c) => c.id === p.cap)) return unchanged(state, `Cap "${p.cap}" hast du nicht.`);
    }
  }
  const numbers = action.passes.reduce((sum, p) => sum + p.strokes.reduce((n, s) => n + s.length, 0), 0);
  const badStroke = action.passes.some((p) =>
    p.strokes.some((s) => s.length % 3 !== 0 || s.some((v) => !Number.isFinite(v))),
  );
  if (badStroke || numbers > MAX_SAMPLES) return unchanged(state, "Die Fingerbahnen sind ungültig.");
  if (!Number.isInteger(action.seed)) return unchanged(state, "Ungültige Saat.");

  const draft: WorkDraft = {
    style: style.id,
    colors: {
      ...(style.look === "tag" ? { line: colors.line } : { fill: colors.fill, outline: colors.outline }),
      ...(colors.second !== undefined ? { second: colors.second } : {}),
      ...(colors.background !== undefined ? { background: colors.background } : {}),
    },
    dose: action.dose,
    passes: action.passes.map((p) => ({
      kind: p.kind,
      cap: p.cap,
      strokes: p.strokes.map((s) => s.map((v, i) => (i % 3 === 2 ? Math.round(v) : Math.round(v * 2) / 2))),
    })),
    seed: action.seed,
  };
  const result = renderWork(content, state.player.name, draft)!;
  const rating = rateWork(content, spot, style, draft, result.stats);

  // Aufstieg (M4a): XP für das Werk, angerechnet wird die Verbesserung an diesem Spot.
  const lettering = letteringFor(content, state.player.name, style.id, draft.seed);
  const xp = lettering
    ? xpForWork(content, spot, style, rating.quality, timeLeftShare(lettering, content, draft))
    : 0;
  const bestBefore = state.best[spot.id] ?? 0;
  const gain = xpGain(content, xp, bestBefore);
  const totalXp = (state.xp ?? 0) + gain;
  const rankBefore = rankOf(state, content);

  // Material (M5a): Je benutzter Farbe geht eine Dose weg. Marker verbrauchen nichts.
  const paint = style.tool === "marker" ? [] : paintFor(draft.colors);
  let next: GameState = {
    ...spendPaint(state, content, paint),
    works: { ...state.works, [spot.id]: { ...draft, quality: rating.quality, at: now } },
    best: { ...state.best, [spot.id]: Math.max(bestBefore, xp) },
    xp: totalXp,
    lastSketch: {
      style: style.id,
      colors: draft.colors,
      dose: action.dose,
      caps: {
        ...(state.lastSketch?.caps ?? {}),
        ...Object.fromEntries(action.passes.map((p) => [p.kind, p.cap])),
      },
    },
  };
  const rankAfter = rankOf(next, content);
  const events: GameEvent[] = [
    {
      type: "SPRAYED",
      spot: spot.id,
      quality: rating.quality,
      label: rating.label,
      text: sprayResultText(content, next, spot, style, rating.label),
      hints: rating.hints,
      xp: gain,
    },
  ];
  if (gain > 0) events.push({ type: "XP_GAINED", amount: gain, total: totalXp });
  if (rankAfter && rankAfter.id !== rankBefore?.id) {
    events.push({
      type: "RANK_UP",
      rank: rankAfter.id,
      name: rankAfter.name,
      ...(rankAfter.text ? { text: rankAfter.text } : {}),
      ...(rankAfter.unlocks ? { unlocks: rankAfter.unlocks } : {}),
    });
  }

  // Risiko (M4b): Erst ist das Werk fertig, dann entscheidet sich, ob jemand hingeguckt hat.
  const rules = content.risk;
  if (rules) {
    const slow = lettering ? 1 - timeLeftShare(lettering, content, draft) : 0;
    const view = riskFor(content, state, spot, slow);
    const outcome: Outcome = rollOutcome(content, view.chance, action.seed);
    next = bumpHeat(next, spot.id, rules.heat_per_work);

    if (outcome === "escaped") {
      next = setWanted(next, (next.wanted ?? 0) + 1);
      events.push({ type: "ESCAPED", lines: toLines(rules.texts.escaped), wanted: next.wanted });
    } else if (outcome === "caught") {
      next = setWanted(next, (next.wanted ?? 0) + 1);
      next = bumpHeat(next, spot.id, rules.heat_per_caught);
      next = { ...next, caught: (next.caught ?? 0) + 1 };
      // Die Farben dieses Werks sind weg – Werkzeug bleibt. Sonst stünde man ohne Marker da
      // und könnte als Toy gar nicht mehr malen (M5a).
      const lost = usedColors(draft.colors).filter(
        (id) => content.items[id]?.kind === "color" && (next.items[id] ?? 0) > 0,
      );
      if (lost.length > 0) {
        const items = { ...next.items };
        for (const id of lost) delete items[id];
        next = { ...next, items };
      }
      // Der Rest des Tages ist weg, und man wacht auf der Wache auf.
      next = { ...nextMorning(next), room: rules.station_room };
      events.push({
        type: "CAUGHT",
        lines: toLines(rules.texts.caught),
        wanted: next.wanted,
        lost: lost.map((id) => content.items[id]?.name ?? id),
        room: rules.station_room,
      });
    } else {
      next = advanceTime(next, content, costOf(content, spot.tool === "marker" ? "marker" : "work"));
    }
    // An der legalen Wand malen heißt: Man war einen Abschnitt lang jemand, den keiner sucht.
    if (spot.type === "legale_wand" && rules.wanted_relief_legal > 0) {
      next = setWanted(next, (next.wanted ?? 0) - rules.wanted_relief_legal);
    }
  }
  return { state: next, events };
}

/** Alle Farb-IDs, die in einem Werk stecken – ohne Doppelte. */
function usedColors(colors: WorkColors): string[] {
  const all = [colors.line, ...(colors.fill ?? []), colors.outline, colors.second, colors.background];
  return [...new Set(all.filter((c): c is string => c !== undefined))];
}
