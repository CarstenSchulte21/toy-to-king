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
  itemsFileSchema,
  mapSchema,
  npcSchema,
  roomSchema,
  spotsFileSchema,
  spraySchema,
  type Condition,
  type Effect,
  type Fact,
  type GameConfig,
  type GameContent,
  type Item,
  type MapConfig,
  type Npc,
  type Room,
  type Spot,
  type SprayRules,
  type TextVariants,
} from "../../src/engine/content-schema";

export type ContentFile = { path: string; text: string };
export type ValidationResult = { content: GameContent | null; errors: string[]; warnings: string[] };

const CONFIG_PATH = "content/config.yaml";
const FACTS_PATH = "content/facts.yaml";
const ITEMS_PATH = "content/items.yaml";
const SPRAY_PATH = "content/spray.yaml";
const SPOTS_PATH = "content/spots.yaml";
const MAP_PATH = "content/map.yaml";

export function validateContent(files: ContentFile[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let config: GameConfig | null = null;
  const rooms: Record<string, Room> = {};
  const npcs: Record<string, Npc> = {};
  const facts: Record<string, Fact> = {};
  const items: Record<string, Item> = {};
  const spots: Record<string, Spot> = {};
  let spray: SprayRules | null = null;
  let map: MapConfig | null = null;
  const fileOf: Record<string, string> = {};
  // Dateien mit Fehlern – Verweise darauf nicht zusätzlich als „fehlt" melden.
  const broken: Broken = {
    rooms: new Set(),
    npcs: new Set(),
    facts: false,
    items: false,
    spots: false,
    spray: false,
  };

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
    } else if (kind === "items" || kind === "spots") {
      const parsed = (kind === "items" ? itemsFileSchema : spotsFileSchema).safeParse(data);
      if (!parsed.success) {
        pushIssues(file.path, data, parsed.error.issues, errors);
        broken[kind] = true;
        continue;
      }
      const target = (kind === "items" ? items : spots) as Record<string, Item | Spot>;
      for (const entry of parsed.data) {
        if (target[entry.id]) errors.push(`${file.path}: "${entry.id}" gibt es zweimal.`);
        target[entry.id] = entry;
      }
    } else if (kind === "spray") {
      const parsed = spraySchema.safeParse(data);
      if (parsed.success) spray = parsed.data;
      else {
        pushIssues(file.path, data, parsed.error.issues, errors);
        broken.spray = true;
      }
    } else if (kind === "map") {
      const parsed = mapSchema.safeParse(data);
      if (parsed.success) map = parsed.data;
      else pushIssues(file.path, data, parsed.error.issues, errors);
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

  const rules = spray as SprayRules | null;
  const mapConfig = map as MapConfig | null;
  const ids = {
    rooms: Object.keys(rooms),
    npcs: Object.keys(npcs),
    facts: Object.keys(facts),
    items: Object.keys(items),
    spots: Object.keys(spots),
    styles: rules ? rules.styles.map((s) => s.id) : [],
  };
  const refs = new RefChecker(ids, broken, errors);

  if (config) {
    refs.room(CONFIG_PATH, "start_room", config.start_room);
    for (const item of Object.keys(config.start_items ?? {})) refs.item(CONFIG_PATH, "start_items", item);
  }

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
      if (h.sprühen !== undefined) refs.spot(where, "sprühen", h.sprühen);
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

  // --- Material, Sprühen, Spots, Karte (M3) ---
  const obtainable = new Set<string>(Object.keys(config?.start_items ?? {}));
  for (const item of Object.values(items)) {
    checkTexts(`${ITEMS_PATH}, "${item.id}"`, [item.name, item.text], warnings, errors);
  }
  if (rules) {
    const seenStyles = new Set<string>();
    for (const s of rules.styles) {
      const where = `${SPRAY_PATH}, Style "${s.id}"`;
      if (seenStyles.has(s.id)) errors.push(`${where}: Diesen Style gibt es zweimal.`);
      seenStyles.add(s.id);
      for (const c of s.ideal_caps) refs.item(where, "ideal_caps", c);
      if (s.ideal_dose !== "egal") refs.item(where, "ideal_dose", s.ideal_dose);
      for (const r of s.requires ?? []) refs.item(where, "requires", r);
      if (s.requires && !s.requires_hint) {
        warnings.push(`${where}: "requires" ohne "requires_hint" – der Spieler erfährt nicht, was fehlt.`);
      }
      const texts = [s.name, s.cap_hint, s.dose_hint, s.requires_hint].filter((x): x is string => !!x);
      checkTexts(where, texts, warnings, errors);
    }
    checkTexts(`${SPRAY_PATH}, quality_labels`, rules.quality_labels, warnings, errors);
    const unknown = [...rules.result.matchAll(/\{([^}]*)\}/g)]
      .map((m) => m[1]!)
      .filter((n) => !["style", "spot", "quality", "name"].includes(n));
    if (unknown.length > 0) {
      errors.push(
        `${SPRAY_PATH}, result: Unbekannte Platzhalter ${unknown.map((u) => `{${u}}`).join(", ")}. ` +
          `Erlaubt: {style}, {spot}, {quality}, {name}.`,
      );
    }
  } else if (Object.keys(spots).length > 0 && !broken.spray) {
    errors.push(`${SPRAY_PATH} fehlt – ohne Sprüh-Regeln kann man an den Spots nicht sprühen.`);
  }
  for (const spot of Object.values(spots)) {
    const where = `${SPOTS_PATH}, Spot "${spot.id}"`;
    refs.room(where, "room", spot.room);
    for (const s of spot.fits) refs.style(where, "fits", s);
    refs.conditions(where, spot.if);
    checkTexts(where, [spot.name, spot.fit_hint], warnings, errors);
    const room = rooms[spot.room];
    const hotspot = room?.hotspots.find((h) => h.id === spot.hotspot);
    if (room && !hotspot) {
      const hint = suggest(
        spot.hotspot,
        room.hotspots.map((h) => h.id),
      );
      errors.push(
        `${where}: "hotspot" zeigt auf "${spot.hotspot}" – den gibt es im Room "${spot.room}" nicht.${hint}`,
      );
    } else if (hotspot && hotspot.sprühen !== spot.id) {
      warnings.push(
        `${where}: Der Hotspot "${spot.hotspot}" hat kein "sprühen: ${spot.id}" – dort kann man nicht sprühen.`,
      );
    }
  }
  for (const place of mapConfig?.places ?? []) {
    const where = `${MAP_PATH}, Ort "${place.room}"`;
    refs.room(where, "room", place.room);
    refs.conditions(where, place.if);
    const [x, y] = place.pos;
    if (x < 0 || y < 0 || x > STAGE_WIDTH || y > STAGE_HEIGHT) {
      errors.push(`${where}: pos [${x}, ${y}] liegt außerhalb der Karte (${STAGE_WIDTH}×${STAGE_HEIGHT}).`);
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
  collectGives(npcs, obtainable);
  for (const item of ids.items) {
    if (!obtainable.has(item))
      warnings.push(`${ITEMS_PATH}, "${item}": Diesen Gegenstand bekommt man nirgends.`);
  }
  for (const factId of ids.facts) {
    if (!learnable.has(factId))
      warnings.push(`${FACTS_PATH}, Info "${factId}": Diese Info kann man nirgends lernen.`);
  }

  const ok = errors.length === 0 && config !== null;
  return {
    content: ok ? { config: config!, rooms, npcs, facts, items, spray: rules, spots, map: mapConfig } : null,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------

type Kind = "config" | "facts" | "items" | "spray" | "spots" | "map" | "room" | "npc" | "other";

function kindOf(path: string): Kind {
  if (path === CONFIG_PATH) return "config";
  if (path === FACTS_PATH) return "facts";
  if (path === ITEMS_PATH) return "items";
  if (path === SPRAY_PATH) return "spray";
  if (path === SPOTS_PATH) return "spots";
  if (path === MAP_PATH) return "map";
  if (path.startsWith("content/rooms/")) return "room";
  if (path.startsWith("content/npcs/")) return "npc";
  return "other";
}

type Broken = {
  rooms: Set<string>;
  npcs: Set<string>;
  facts: boolean;
  items: boolean;
  spots: boolean;
  spray: boolean;
};

function collectGives(npcs: Record<string, Npc>, obtainable: Set<string>) {
  for (const npc of Object.values(npcs)) {
    for (const node of Object.values(npc.dialogue.nodes)) {
      for (const e of node.effects ?? []) if ("give" in e) obtainable.add(e.give);
      for (const o of node.options ?? [])
        for (const e of o.effects ?? []) if ("give" in e) obtainable.add(e.give);
    }
  }
}

function markBroken(kind: Kind, path: string, broken: Broken) {
  if (kind === "room") broken.rooms.add(fileStem(path));
  if (kind === "npc") broken.npcs.add(fileStem(path));
  if (kind === "facts") broken.facts = true;
  if (kind === "items") broken.items = true;
  if (kind === "spots") broken.spots = true;
  if (kind === "spray") broken.spray = true;
}

// Prüft Verweise auf Rooms, NPCs und Infos – mit Tippfehler-Vorschlag.
class RefChecker {
  constructor(
    private ids: {
      rooms: string[];
      npcs: string[];
      facts: string[];
      items: string[];
      spots: string[];
      styles: string[];
    },
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

  item(where: string, field: string, id: string) {
    if (this.ids.items.includes(id) || this.broken.items) return;
    this.errors.push(
      `${where}: "${field}" zeigt auf "${id}" – diesen Gegenstand gibt es nicht in ${ITEMS_PATH}.${suggest(id, this.ids.items)}`,
    );
  }

  spot(where: string, field: string, id: string) {
    if (this.ids.spots.includes(id) || this.broken.spots) return;
    this.errors.push(
      `${where}: "${field}" zeigt auf "${id}" – diesen Spot gibt es nicht in ${SPOTS_PATH}.${suggest(id, this.ids.spots)}`,
    );
  }

  style(where: string, field: string, id: string) {
    if (this.ids.styles.includes(id) || this.broken.spray) return;
    this.errors.push(
      `${where}: "${field}" zeigt auf "${id}" – diesen Style gibt es nicht in ${SPRAY_PATH}.${suggest(id, this.ids.styles)}`,
    );
  }

  conditions(where: string, conditions: Condition[] | undefined, npc?: Npc) {
    for (const c of conditions ?? []) {
      if ("visited" in c) this.room(where, "visited", c.visited);
      if ("fact" in c) this.fact(where, "fact", c.fact);
      if ("not_fact" in c) this.fact(where, "not_fact", c.not_fact);
      if ("has" in c) this.item(where, "has", c.has);
      if ("sprayed" in c) this.spot(where, "sprayed", c.sprayed);
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
      if ("give" in e) this.item(where, "give", e.give);
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
      if ("give" in e) refs.item(where, "give", e.give);
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
  ...["sprühen", "has", "sprayed", "give", "kind", "styles", "ideal_caps", "ideal_dose", "requires"],
  ...["requires_hint", "cap_hint", "dose_hint", "top_label", "quality_labels", "result", "type"],
  ...["hotspot", "room", "fits", "fit_hint", "risk", "places", "pos", "start_items"],
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
