// Gespräche mit NPCs (SPEC 4.2, Regeln 5–8).
// Wo man im Gespräch gerade steht (NPC, Knoten), merkt sich die Oberfläche – das ist kein Spielstand.
// Die Engine berechnet, was man sieht, und was eine Antwort bewirkt.
import type { DialogueNode, DialogueOption, GameContent, Npc } from "./content-schema";
import { applyEffects, evaluateAll, renderText, trustLabel, trustOf, type Ctx } from "./logic";
import type { GameState } from "./state";

export type DialogueOptionView = {
  index: number; // Position im Inhalt – bleibt stabil, auch wenn andere Optionen ausgeblendet sind
  text: string;
  locked: boolean;
  hint?: string;
};

export type DialogueView = {
  npcId: string;
  name: string;
  role: string;
  trust: { level: number; label: string } | null;
  lines: string[];
  // Was nach dem letzten Satz passiert: Antworten wählen, weitertippen oder Gespräch zu Ende.
  mode: "options" | "next" | "end";
  options: DialogueOptionView[];
};

export function onceKey(npcId: string, nodeId: string, option: DialogueOption, index: number): string {
  return `${npcId}.${nodeId}.${option.id ?? index}`;
}

export function findNode(
  content: GameContent,
  npcId: string,
  nodeId: string,
): { npc: Npc; node: DialogueNode } | null {
  const npc = content.npcs[npcId];
  const node = npc?.dialogue.nodes[nodeId];
  return npc && node ? { npc, node } : null;
}

export function startNode(state: GameState, content: GameContent, npc: Npc): string | null {
  const start = npc.dialogue.start;
  if (typeof start === "string") return start;
  const ctx: Ctx = { content, npc: npc.id };
  return start.find((s) => evaluateAll(s.if, state, ctx))?.node ?? null;
}

// Betritt einen Knoten: Knoten-Effekte werden einmal pro Betreten ausgeführt.
export function enterNode(state: GameState, content: GameContent, npcId: string, nodeId: string): GameState {
  const found = findNode(content, npcId, nodeId);
  if (!found) return state;
  return applyEffects(state, found.node.effects, { content, npc: npcId });
}

// Welche Optionen sieht der Spieler? Nicht erfüllte Bedingungen blenden aus – außer bei show_locked.
export function optionViews(
  state: GameState,
  content: GameContent,
  npcId: string,
  nodeId: string,
): DialogueOptionView[] {
  const found = findNode(content, npcId, nodeId);
  if (!found) return [];
  const ctx: Ctx = { content, npc: npcId };
  const views: DialogueOptionView[] = [];
  (found.node.options ?? []).forEach((option, index) => {
    if (option.once && state.usedOnce.includes(onceKey(npcId, nodeId, option, index))) return;
    const ok = evaluateAll(option.if, state, ctx);
    if (ok) views.push({ index, text: renderText(option.text, state), locked: false });
    else if (option.show_locked) {
      views.push({
        index,
        text: renderText(option.text, state),
        locked: true,
        hint: renderText(option.show_locked, state),
      });
    }
  });
  return views;
}

export function viewDialogue(
  state: GameState,
  content: GameContent,
  npcId: string,
  nodeId: string,
): DialogueView | null {
  const found = findNode(content, npcId, nodeId);
  if (!found) return null;
  const { npc, node } = found;
  const level = trustOf(state, content, npcId);
  return {
    npcId,
    name: npc.name,
    role: npc.role,
    trust: npc.trust === false ? null : { level, label: trustLabel(content, level) },
    lines: (typeof node.text === "string" ? [node.text] : node.text).map((l) => renderText(l, state)),
    mode: node.options ? "options" : node.next ? "next" : "end",
    options: optionViews(state, content, npcId, nodeId),
  };
}
