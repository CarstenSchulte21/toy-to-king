// Prüft alle Inhaltsdateien und baut daraus das Content-Bundle für das Spiel.
// Reine Funktion ohne Dateizugriff – dadurch vollständig testbar.
// Fehlermeldungen sind für Einsteiger geschrieben: Datei, Stelle, Problem, Vorschlag.
import YAML from "yaml";
import type { z } from "zod";
import {
  ALLOWED_PLACEHOLDERS,
  MAX_TEXT_LENGTH,
  MIN_HOTSPOT_SIZE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  configSchema,
  factsFileSchema,
  npcSchema,
  roomSchema,
  type Condition,
  type Effect,
  type Fact,
  type GameConfig,
  type GameContent,
  type Npc,
  type Room,
  type TextVariants,
} from "../../src/engine/content-schema";

export type ContentFile = { path: string; text: string };
export type ValidationResult = { content: GameContent | null; errors: string[]; warnings: string[] };

const CONFIG_PATH = "content/config.yaml";
const FACTS_PATH = "content/facts.yaml";

export function validateContent(files: ContentFile[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let config: GameConfig | null = null;
  const rooms: Record<string, Room> = {};
  const npcs: Record<string, Npc> = {};
  const facts: Record<string, Fact> = {};
  const fileOf: Record<string, string> = {};
  // Dateien mit Fehlern – Verweise darauf nicht zusätzlich als „fehlt" melden.
  const broken = { rooms: new Set<string>(), npcs: new Set<string>(), facts: false };

  if (!files.some((f) => f.path === CONFIG_PATH)) {
    errors.push(`${CONFIG_PATH} fehlt. Dort steht u. a. der Start-Room (start_room).`);
  }

  for (const file of files) {
    const kind = kindOf(file.path);
    const data = parseYaml(file, errors);
    if (data === undefined) {
      markBroken(kind, file.path, broken);
      continue;
    }

    if (kind === "config") {
      const parsed = configSchema.safeParse(data);
      if (parsed.success) config = parsed.data;
      else pushIssues(file.path, data, parsed.error.issues, errors);
    } else if (kind === "facts") {
      const parsed = factsFileSchema.safeParse(data);
      if (!parsed.success) {
        pushIssues(file.path, data, parsed.error.issues, errors);
        broken.facts = true;
        continue;
      }
      for (const fact of parsed.data) {
        if (facts[fact.id]) errors.push(`${file.path}: Die Info "${fact.id}" gibt es zweimal.`);
        facts[fact.id] = fact;
      }
    } else if (kind === "room" || kind === "npc") {
      const parsed = (kind === "room" ? roomSchema : npcSchema).safeParse(data);
      if (!parsed.success) {
        pushIssues(file.path, data, parsed.error.issues, errors);
        markBroken(kind, file.path, broken);
        continue;
      }
      const item = parsed.data;
      const expectedId = fileStem(file.path);
      if (item.id !== expectedId) {
        errors.push(
          `${file.path}: Die id "${item.id}" passt nicht zum Dateinamen. Sie muss "${expectedId}" heißen.`,
        );
        continue;
      }
      const target = (kind === "room" ? rooms : npcs) as Record<string, Room | Npc>;
      const key = `${kind}:${item.id}`;
      if (target[item.id]) {
        errors.push(`${file.path}: "${item.id}" gibt es schon in ${fileOf[key]}.`);
        continue;
      }
      target[item.id] = item;
      fileOf[key] = file.path;
    } else {
      warnings.push(`${file.path}: Diese Datei wird (noch) nicht verwendet.`);
    }
  }

  const ids = {
    rooms: Object.keys(rooms),
    npcs: Object.keys(npcs),
    facts: Object.keys(facts),
  };
  const refs = new RefChecker(ids, broken, errors);

  if (config) refs.room(CONFIG_PATH, "start_room", config.start_room);

  // --- Rooms ---
  for (const room of Object.values(rooms)) {
    const file = fileOf[`room:${room.id}`]!;
    checkVariants(`${file}, Beschreibung`, room.description, refs, warnings, errors);

    const seen = new Set<string>();
    for (const h of room.hotspots) {
      const where = `${file}, Hotspot "${h.id}"`;
      if (seen.has(h.id)) errors.push(`${where}: Diese id gibt es in diesem Room zweimal.`);
      seen.add(h.id);
      checkRect(where, h.rect, errors, warnings);
      if (h.gehen !== undefined) refs.room(where, "gehen", h.gehen);
      if (h.sprechen !== undefined) refs.npc(where, "sprechen", h.sprechen);
      refs.conditions(where, h.if);
      checkVariants(`${where}, untersuchen`, h.untersuchen, refs, warnings, errors);
    }
  }

  // --- Infos ---
  const learnable = new Set<string>();
  for (const fact of Object.values(facts)) {
    const where = `${FACTS_PATH}, Info "${fact.id}"`;
    if (fact.source !== "welt") refs.npc(where, "source", fact.source);
    checkTexts(where, [fact.title, fact.text], warnings, errors);
  }

  // --- NPCs und Dialoge ---
  for (const npc of Object.values(npcs)) {
    const file = fileOf[`npc:${npc.id}`]!;
    const room = rooms[npc.room];
    refs.room(file, "room", npc.room);
    if (room) {
      const hotspot = room.hotspots.find((h) => h.id === npc.hotspot);
      if (!hotspot) {
        errors.push(
          `${file}: "hotspot" zeigt auf "${npc.hotspot}" – den gibt es im Room "${npc.room}" nicht.${suggest(
            npc.hotspot,
            room.hotspots.map((h) => h.id),
          )}`,
        );
      } else if (hotspot.sprechen !== npc.id) {
        warnings.push(
          `${file}: Der Hotspot "${npc.hotspot}" hat kein "sprechen: ${npc.id}" – so kann man ${npc.name} nicht ansprechen.`,
        );
      }
    }

    const nodeIds = Object.keys(npc.dialogue.nodes);
    const nodeRef = (where: string, target: string) => {
      if (!npc.dialogue.nodes[target]) {
        errors.push(`${where}: Den Knoten "${target}" gibt es nicht.${suggest(target, nodeIds)}`);
      }
    };

    const starts =
      typeof npc.dialogue.start === "string"
        ? [{ node: npc.dialogue.start, if: undefined }]
        : npc.dialogue.start;
    for (const s of starts) {
      nodeRef(`${file}, start`, s.node);
      refs.conditions(`${file}, start`, s.if, npc);
    }

    for (const [nodeId, node] of Object.entries(npc.dialogue.nodes)) {
      const where = `${file}, Knoten "${nodeId}"`;
      checkTexts(where, toArray(node.text), warnings, errors);
      refs.effects(where, node.effects, npc, learnable, warnings);
      if (node.next !== undefined) nodeRef(where, node.next);
      (node.options ?? []).forEach((o, i) => {
        const at = `${where}, Option ${i + 1} („${o.text.slice(0, 30)}")`;
        checkTexts(at, [o.text, ...(o.show_locked ? [o.show_locked] : [])], warnings, errors);
        refs.conditions(at, o.if, npc);
        refs.effects(at, o.effects, npc, learnable, warnings);
        if (o.next !== undefined) nodeRef(at, o.next);
        if (o.once && o.id === undefined) {
          warnings.push(
            `${at}: "once" ohne "id" – ändert sich die Reihenfolge der Optionen, geht der Merker verloren.`,
          );
        }
      });
    }

    for (const unreachable of unreachableNodes(npc)) {
      warnings.push(`${file}: Den Knoten "${unreachable}" erreicht man von "start" aus nie.`);
    }
  }

  // Auch Untersuchen-Texte können Infos lehren.
  for (const room of Object.values(rooms)) {
    for (const v of variantList(room.description))
      for (const e of v.effects ?? []) collectLearn(e, learnable);
    for (const h of room.hotspots) {
      for (const v of variantList(h.untersuchen)) for (const e of v.effects ?? []) collectLearn(e, learnable);
    }
  }
  for (const factId of ids.facts) {
    if (!learnable.has(factId))
      warnings.push(`${FACTS_PATH}, Info "${factId}": Diese Info kann man nirgends lernen.`);
  }

  const ok = errors.length === 0 && config !== null;
  return { content: ok ? { config: config!, rooms, npcs, facts } : null, errors, warnings };
}

// ---------------------------------------------------------------------------

type Kind = "config" | "facts" | "room" | "npc" | "other";

function kindOf(path: string): Kind {
  if (path === CONFIG_PATH) return "config";
  if (path === FACTS_PATH) return "facts";
  if (path.startsWith("content/rooms/")) return "room";
  if (path.startsWith("content/npcs/")) return "npc";
  return "other";
}

type Broken = { rooms: Set<string>; npcs: Set<string>; facts: boolean };

function markBroken(kind: Kind, path: string, broken: Broken) {
  if (kind === "room") broken.rooms.add(fileStem(path));
  if (kind === "npc") broken.npcs.add(fileStem(path));
  if (kind === "facts") broken.facts = true;
}

// Prüft Verweise auf Rooms, NPCs und Infos – mit Tippfehler-Vorschlag.
class RefChecker {
  constructor(
    private ids: { rooms: string[]; npcs: string[]; facts: string[] },
    private broken: Broken,
    private errors: string[],
  ) {}

  room(where: string, field: string, id: string) {
    if (this.ids.rooms.includes(id) || this.broken.rooms.has(id)) return;
    this.errors.push(
      `${where}: "${field}" zeigt auf "${id}" – diesen Room gibt es nicht.${suggest(id, this.ids.rooms)}`,
    );
  }

  npc(where: string, field: string, id: string) {
    if (this.ids.npcs.includes(id) || this.broken.npcs.has(id)) return;
    this.errors.push(
      `${where}: "${field}" zeigt auf "${id}" – diesen NPC gibt es nicht.${suggest(id, this.ids.npcs)}`,
    );
  }

  fact(where: string, field: string, id: string) {
    if (this.ids.facts.includes(id) || this.broken.facts) return;
    this.errors.push(
      `${where}: "${field}" zeigt auf "${id}" – diese Info steht nicht in ${FACTS_PATH}.${suggest(id, this.ids.facts)}`,
    );
  }

  conditions(where: string, conditions: Condition[] | undefined, npc?: Npc) {
    for (const c of conditions ?? []) {
      if ("visited" in c) this.room(where, "visited", c.visited);
      if ("fact" in c) this.fact(where, "fact", c.fact);
      if ("not_fact" in c) this.fact(where, "not_fact", c.not_fact);
      if ("trust_min" in c) {
        if (typeof c.trust_min === "number") {
          if (!npc)
            this.errors.push(
              `${where}: "trust_min" ohne NPC geht nur in Gesprächen. Schreib { npc: …, value: … }.`,
            );
        } else {
          this.npc(where, "trust_min.npc", c.trust_min.npc);
        }
      }
    }
  }

  effects(
    where: string,
    effects: Effect[] | undefined,
    npc: Npc | undefined,
    learnable: Set<string>,
    warnings: string[],
  ) {
    for (const e of effects ?? []) {
      if ("learn" in e) {
        this.fact(where, "learn", e.learn);
        learnable.add(e.learn);
      }
      if ("trust" in e) {
        if (!npc) this.errors.push(`${where}: "trust" geht nur in Gesprächen.`);
        else if (npc.trust === false)
          warnings.push(`${where}: "${npc.name}" hat keinen Vertrauenswert – "trust" wirkt hier nicht.`);
      }
    }
  }
}

function collectLearn(effect: Effect, learnable: Set<string>) {
  if ("learn" in effect) learnable.add(effect.learn);
}

function checkVariants(
  where: string,
  variants: TextVariants | undefined,
  refs: RefChecker,
  warnings: string[],
  errors: string[],
) {
  checkTexts(where, allTexts(variants), warnings, errors);
  for (const v of variantList(variants)) {
    refs.conditions(where, v.if);
    for (const e of v.effects ?? []) {
      if ("learn" in e) refs.fact(where, "learn", e.learn);
      if ("trust" in e) errors.push(`${where}: "trust" geht nur in Gesprächen.`);
    }
  }
}

function checkRect(
  where: string,
  rect: [number, number, number, number],
  errors: string[],
  warnings: string[],
) {
  const [x, y, w, h] = rect;
  if (w < 1 || h < 1) {
    errors.push(`${where}: Breite und Höhe in rect müssen mindestens 1 sein.`);
  } else if (x < 0 || y < 0 || x + w > STAGE_WIDTH || y + h > STAGE_HEIGHT) {
    errors.push(
      `${where}: rect [${rect.join(", ")}] ragt aus der Bühne (${STAGE_WIDTH}×${STAGE_HEIGHT}). ` +
        `x + breite darf höchstens ${STAGE_WIDTH}, y + höhe höchstens ${STAGE_HEIGHT} sein.`,
    );
  } else if (w < MIN_HOTSPOT_SIZE || h < MIN_HOTSPOT_SIZE) {
    warnings.push(
      `${where}: Mit ${w}×${h} Pixeln ist der Hotspot auf dem Handy schwer zu treffen (mind. 16×16).`,
    );
  }
}

function checkTexts(where: string, texts: string[], warnings: string[], errors: string[]) {
  for (const t of texts) {
    if (t.length > MAX_TEXT_LENGTH) {
      warnings.push(
        `${where}: Text hat ${t.length} Zeichen (max. ${MAX_TEXT_LENGTH}) und passt nicht in eine Textbox. Tipp: auf zwei Texte aufteilen. „${t.slice(0, 40)}…"`,
      );
    }
    for (const match of t.matchAll(/\{([^}]*)\}/g)) {
      const name = match[1]!;
      if (!(ALLOWED_PLACEHOLDERS as readonly string[]).includes(name)) {
        errors.push(`${where}: Unbekannter Platzhalter {${name}}. Erlaubt sind nur {name} und {crew}.`);
      } else if (name === "crew") {
        warnings.push(`${where}: {crew} ist erst ab M5 gefüllt – bis dahin bleibt die Stelle leer.`);
      }
    }
  }
}

// Welche Knoten erreicht man, wenn man bei "start" beginnt und allen next-Verweisen folgt?
function unreachableNodes(npc: Npc): string[] {
  const nodes = npc.dialogue.nodes;
  const starts =
    typeof npc.dialogue.start === "string" ? [npc.dialogue.start] : npc.dialogue.start.map((s) => s.node);
  const seen = new Set<string>();
  const queue = [...starts];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id) || !nodes[id]) continue;
    seen.add(id);
    const node = nodes[id]!;
    if (node.next) queue.push(node.next);
    for (const o of node.options ?? []) if (o.next) queue.push(o.next);
  }
  return Object.keys(nodes).filter((id) => !seen.has(id));
}

function parseYaml(file: ContentFile, errors: string[]): unknown {
  const doc = YAML.parseDocument(file.text);
  if (doc.errors.length > 0) {
    const e = doc.errors[0]!;
    const line = e.linePos?.[0]?.line;
    errors.push(
      `${file.path}${line ? `, Zeile ${line}` : ""}: Die Datei ist kein gültiges YAML. ` +
        `Häufige Ursachen: falsche Einrückung, oder ein Text mit Doppelpunkt ohne Anführungszeichen. (${e.code})`,
    );
    return undefined;
  }
  return doc.toJS();
}

const KNOWN_KEYS = [
  ...Object.keys(roomSchema.shape),
  ...Object.keys(configSchema.shape),
  ...Object.keys(npcSchema.shape),
  "label",
  "rect",
  "if",
  "untersuchen",
  "gehen",
  "sprechen",
  "text",
  "effects",
  "flag",
  "not_flag",
  "visited",
  "fact",
  "not_fact",
  "trust_min",
  "npc",
  "value",
  "set_flag",
  "clear_flag",
  "learn",
  "category",
  "title",
  "source",
  "options",
  "next",
  "end",
  "once",
  "show_locked",
  "start",
  "nodes",
  "node",
];

function pushIssues(file: string, data: unknown, issues: z.core.$ZodIssue[], errors: string[]) {
  // Hat ein Objekt einen falsch geschriebenen Schlüssel, sind Folgefehler an derselben Stelle nur Rauschen.
  const typoPaths = new Set(
    issues.filter((i) => i.code === "unrecognized_keys").map((i) => i.path.join(".")),
  );
  for (const issue of issues) {
    if (issue.code === "custom" && typoPaths.has(issue.path.join("."))) continue;
    const missing = issue.code === "invalid_type" && /undefined/.test(issue.message);
    // Fehlt ein Feld, das daneben falsch geschrieben steht, reicht der Tippfehler-Hinweis.
    if (missing && typoPaths.has(issue.path.slice(0, -1).join("."))) continue;
    for (const i of resolveUnion(issue)) {
      let message = missing ? "Pflichtfeld fehlt." : i.message;
      if (issue.code === "unrecognized_keys") {
        message = issue.keys.map((k) => `Unbekanntes Feld "${k}".${suggest(k, KNOWN_KEYS)}`).join(" ");
      }
      errors.push(`${file}, ${describePath(data, i.path)}: ${message}`);
    }
  }
}

// Bei "entweder A oder B" meldet Zod nur "ungültig". Wir suchen die Variante, die fast gepasst hat,
// und melden deren konkreten Fehler – das hilft beim Korrigieren mehr.
function resolveUnion(issue: z.core.$ZodIssue): { path: PropertyKey[]; message: string }[] {
  if (issue.code === "invalid_union" && "errors" in issue && issue.errors.length > 0) {
    const best = [...issue.errors].sort((a, b) => a.length - b.length)[0]!;
    if (best.length > 0 && best.every((i) => i.path.length > 0)) {
      return best.flatMap((i) =>
        resolveUnion({ ...i, path: [...issue.path, ...i.path] } as z.core.$ZodIssue),
      );
    }
  }
  return [{ path: issue.path, message: issue.message }];
}

// Macht aus einem technischen Pfad (hotspots.2.rect) eine lesbare Stelle (Hotspot "rolltor", Feld "rect").
function describePath(data: unknown, path: PropertyKey[]): string {
  if (path.length === 0) return "oberste Ebene";
  const parts: string[] = [];
  let node: unknown = data;
  for (let i = 0; i < path.length; i++) {
    const key = path[i]!;
    const next = path[i + 1];
    if (key === "hotspots" && typeof next === "number") {
      const hotspot = (node as { hotspots?: { id?: unknown }[] })?.hotspots?.[next];
      parts.push(typeof hotspot?.id === "string" ? `Hotspot "${hotspot.id}"` : `Hotspot Nr. ${next + 1}`);
      node = hotspot;
      i++;
      continue;
    }
    if (key === "nodes" && typeof next === "string") {
      parts.push(`Knoten "${next}"`);
      node = (node as { nodes?: Record<string, unknown> })?.nodes?.[next];
      i++;
      continue;
    }
    if (key === "options" && typeof next === "number") {
      parts.push(`Option ${next + 1}`);
      node = (node as { options?: unknown[] })?.options?.[next];
      i++;
      continue;
    }
    if (typeof key === "number" && i === 0 && Array.isArray(data)) {
      const item = (data as { id?: unknown }[])[key];
      parts.push(typeof item?.id === "string" ? `Info "${item.id}"` : `Eintrag ${key + 1}`);
      node = item;
      continue;
    }
    if (typeof key === "number") parts.push(`Eintrag ${key + 1}`);
    else parts.push(`Feld "${String(key)}"`);
    node = (node as Record<PropertyKey, unknown> | undefined)?.[key];
  }
  return parts.join(", ");
}

type Variant = { if?: Condition[]; effects?: Effect[] };

function variantList(variants: TextVariants | undefined): Variant[] {
  if (variants === undefined || typeof variants === "string") return [];
  return variants.filter((v): v is Exclude<typeof v, string> => typeof v !== "string");
}

export function allTexts(variants: TextVariants | undefined): string[] {
  if (variants === undefined) return [];
  if (typeof variants === "string") return [variants];
  return variants.flatMap((v) => (typeof v === "string" ? [v] : toArray(v.text)));
}

function toArray(text: string | string[]): string[] {
  return typeof text === "string" ? [text] : text;
}

function fileStem(path: string): string {
  return path
    .split("/")
    .pop()!
    .replace(/\.ya?ml$/, "");
}

function suggest(value: string, options: string[]): string {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const o of options) {
    const d = levenshtein(value, o);
    if (d < bestDistance) {
      best = o;
      bestDistance = d;
    }
  }
  return best !== null && bestDistance > 0 && bestDistance <= Math.max(2, Math.floor(value.length / 3))
    ? ` Meintest du "${best}"?`
    : "";
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length]!;
}
