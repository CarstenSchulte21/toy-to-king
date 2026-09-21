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
  roomSchema,
  type Condition,
  type GameConfig,
  type GameContent,
  type Room,
  type TextVariants,
} from "../../src/engine/content-schema";

export type ContentFile = { path: string; text: string };
export type ValidationResult = { content: GameContent | null; errors: string[]; warnings: string[] };

export function validateContent(files: ContentFile[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let config: GameConfig | null = null;
  const rooms: Record<string, Room> = {};
  const roomFiles: Record<string, string> = {};
  const brokenRooms = new Set<string>(); // Rooms mit Fehlern – Verweise darauf nicht doppelt melden

  const configFile = files.find((f) => f.path === "content/config.yaml");
  if (!configFile) errors.push("content/config.yaml fehlt. Dort steht u. a. der Start-Room (start_room).");

  for (const file of files) {
    const data = parseYaml(file, errors);
    if (data === undefined) {
      if (file.path.startsWith("content/rooms/")) brokenRooms.add(fileStem(file.path));
      continue;
    }

    if (file.path === "content/config.yaml") {
      const parsed = configSchema.safeParse(data);
      if (parsed.success) config = parsed.data;
      else pushIssues(file.path, data, parsed.error.issues, errors);
      continue;
    }

    if (file.path.startsWith("content/rooms/")) {
      const parsed = roomSchema.safeParse(data);
      if (!parsed.success) {
        pushIssues(file.path, data, parsed.error.issues, errors);
        brokenRooms.add(fileStem(file.path));
        continue;
      }
      const room = parsed.data;
      const expectedId = fileStem(file.path);
      if (room.id !== expectedId) {
        errors.push(
          `${file.path}: Die id "${room.id}" passt nicht zum Dateinamen. Sie muss "${expectedId}" heißen.`,
        );
        continue;
      }
      if (rooms[room.id]) {
        errors.push(`${file.path}: Den Room "${room.id}" gibt es schon in ${roomFiles[room.id]}.`);
        continue;
      }
      rooms[room.id] = room;
      roomFiles[room.id] = file.path;
      continue;
    }

    warnings.push(`${file.path}: Diese Datei wird (noch) nicht verwendet.`);
  }

  const roomIds = Object.keys(rooms);

  if (config && !rooms[config.start_room] && !brokenRooms.has(config.start_room)) {
    errors.push(
      `content/config.yaml: start_room zeigt auf "${config.start_room}" – diesen Room gibt es nicht.${suggest(config.start_room, roomIds)}`,
    );
  }

  for (const room of Object.values(rooms)) {
    const file = roomFiles[room.id]!;
    checkTexts(`${file}, Beschreibung`, room.description, warnings, errors);

    const seen = new Set<string>();
    for (const h of room.hotspots) {
      const where = `${file}, Hotspot "${h.id}"`;
      if (seen.has(h.id)) errors.push(`${where}: Diese id gibt es in diesem Room zweimal.`);
      seen.add(h.id);

      const [x, y, w, hgt] = h.rect;
      if (w < 1 || hgt < 1) {
        errors.push(`${where}: Breite und Höhe in rect müssen mindestens 1 sein.`);
      } else if (x < 0 || y < 0 || x + w > STAGE_WIDTH || y + hgt > STAGE_HEIGHT) {
        errors.push(
          `${where}: rect [${h.rect.join(", ")}] ragt aus der Bühne (${STAGE_WIDTH}×${STAGE_HEIGHT}). ` +
            `x + breite darf höchstens ${STAGE_WIDTH}, y + höhe höchstens ${STAGE_HEIGHT} sein.`,
        );
      } else if (w < MIN_HOTSPOT_SIZE || hgt < MIN_HOTSPOT_SIZE) {
        warnings.push(
          `${where}: Mit ${w}×${hgt} Pixeln ist der Hotspot auf dem Handy schwer zu treffen (mind. 16×16).`,
        );
      }

      if (h.gehen !== undefined && !rooms[h.gehen] && !brokenRooms.has(h.gehen)) {
        errors.push(
          `${where}: "gehen" zeigt auf "${h.gehen}" – diesen Room gibt es nicht.${suggest(h.gehen, roomIds)}`,
        );
      }
      checkConditions(where, h.if, roomIds, errors);
      checkTexts(`${where}, untersuchen`, h.untersuchen, warnings, errors);
      if (Array.isArray(h.untersuchen)) {
        for (const v of h.untersuchen) {
          if (typeof v !== "string") checkConditions(where, v.if, roomIds, errors);
        }
      }
    }
  }

  const ok = errors.length === 0 && config !== null;
  return { content: ok ? { config: config!, rooms } : null, errors, warnings };
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

const KNOWN_KEYS = [
  ...Object.keys(roomSchema.shape),
  ...Object.keys(configSchema.shape),
  "label",
  "rect",
  "if",
  "untersuchen",
  "gehen",
  "text",
  "effects",
  "flag",
  "not_flag",
  "visited",
  "set_flag",
  "clear_flag",
];

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
    if (key === "hotspots" && typeof path[i + 1] === "number") {
      const index = path[i + 1] as number;
      const hotspot = (node as { hotspots?: { id?: unknown }[] })?.hotspots?.[index];
      parts.push(typeof hotspot?.id === "string" ? `Hotspot "${hotspot.id}"` : `Hotspot Nr. ${index + 1}`);
      node = hotspot;
      i++;
      continue;
    }
    if (typeof key === "number") parts.push(`Eintrag ${key + 1}`);
    else parts.push(`Feld "${String(key)}"`);
    node = (node as Record<PropertyKey, unknown> | undefined)?.[key];
  }
  return parts.join(", ");
}

function checkConditions(
  where: string,
  conditions: Condition[] | undefined,
  roomIds: string[],
  errors: string[],
) {
  for (const c of conditions ?? []) {
    if ("visited" in c && !roomIds.includes(c.visited)) {
      errors.push(
        `${where}: Bedingung "visited" zeigt auf "${c.visited}" – diesen Room gibt es nicht.${suggest(c.visited, roomIds)}`,
      );
    }
  }
}

function checkTexts(where: string, variants: TextVariants | undefined, warnings: string[], errors: string[]) {
  for (const t of allTexts(variants)) {
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

export function allTexts(variants: TextVariants | undefined): string[] {
  if (variants === undefined) return [];
  if (typeof variants === "string") return [variants];
  return variants.flatMap((v) =>
    typeof v === "string" ? [v] : typeof v.text === "string" ? [v.text] : v.text,
  );
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
  return best !== null && bestDistance <= Math.max(2, Math.floor(value.length / 3))
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
