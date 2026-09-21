// Schemas für alle Spielinhalte (SPEC 4.2–4.4).
// Die TypeScript-Typen werden direkt aus den Schemas abgeleitet – so können Inhalt und Code nicht auseinanderlaufen.
// M1: Rooms und Hotspots. M2: NPCs, Dialoge und Infos.
import { z } from "zod";

z.config(z.locales.de());

export const STAGE_WIDTH = 320;
export const STAGE_HEIGHT = 180;
export const MAX_TEXT_LENGTH = 120;
export const MIN_HOTSPOT_SIZE = 16;
export const ALLOWED_PLACEHOLDERS = ["name", "crew"] as const;

const id = z
  .string()
  .regex(
    /^[a-z0-9_]+$/,
    "IDs bestehen nur aus Kleinbuchstaben, Ziffern und _ (keine Umlaute, keine Leerzeichen).",
  );

const text = z.string().min(1, "Text darf nicht leer sein.");

// Bedingungen – jede Bedingung ist ein Objekt mit genau einem Schlüssel.
const trustLevel = z.number().int().min(0).max(5);

export const conditionSchema = z.union(
  [
    z.strictObject({ flag: id }),
    z.strictObject({ not_flag: id }),
    z.strictObject({ visited: id }),
    z.strictObject({ fact: id }),
    z.strictObject({ not_fact: id }),
    z.strictObject({ trust_min: z.union([trustLevel, z.strictObject({ npc: id, value: trustLevel })]) }),
    z.strictObject({ has: id }),
    z.strictObject({ sprayed: id }),
  ],
  {
    error: "Unbekannte Bedingung. Erlaubt: flag, not_flag, visited, fact, not_fact, trust_min, has, sprayed.",
  },
);

export const effectSchema = z.union(
  [
    z.strictObject({ set_flag: id }),
    z.strictObject({ clear_flag: id }),
    z.strictObject({ learn: id }),
    z.strictObject({ trust: z.number().int().min(-5).max(5) }),
    z.strictObject({ give: id }),
  ],
  { error: "Unbekannter Effekt. Erlaubt: set_flag, clear_flag, learn, trust, give." },
);

const lines = z.union([text, z.array(text).min(1)], {
  error: "Erwartet: ein Text oder eine Liste von Texten.",
});

export const textVariantSchema = z.strictObject({
  if: z.array(conditionSchema).optional(),
  text: lines,
  effects: z.array(effectSchema).optional(),
});

export type TextVariant = z.infer<typeof textVariantSchema>;
export type TextVariants = string | string[] | TextVariant[];

// Ein Text, mehrere Textboxen nacheinander, oder Varianten (erste passende gewinnt).
// Von Hand geprüft statt als Zod-Union, damit Fehler genau auf die falsche Stelle zeigen.
export const textVariantsSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    const shape =
      'Erwartet: ein Text, eine Liste von Texten oder eine Liste von Varianten mit "if" und "text".';
    if (typeof value === "string") {
      if (value.length === 0) ctx.addIssue({ code: "custom", message: "Text darf nicht leer sein." });
      return;
    }
    if (!Array.isArray(value) || value.length === 0) {
      ctx.addIssue({ code: "custom", message: shape });
      return;
    }
    const allStrings = value.every((v) => typeof v === "string");
    const allObjects = value.every((v) => typeof v === "object" && v !== null && !Array.isArray(v));
    if (!allStrings && !allObjects) {
      ctx.addIssue({
        code: "custom",
        message:
          'Entweder nur Texte oder nur Varianten mit "if"/"text" – nicht gemischt. Tipp: auch der Standardtext braucht "- text:".',
      });
      return;
    }
    value.forEach((v, i) => {
      if (typeof v === "string") {
        if (v.length === 0)
          ctx.addIssue({ code: "custom", message: "Text darf nicht leer sein.", path: [i] });
        return;
      }
      const r = textVariantSchema.safeParse(v);
      if (!r.success)
        for (const issue of r.error.issues) ctx.addIssue({ ...issue, path: [i, ...issue.path] } as never);
    });
  })
  .transform((v) => v as TextVariants);

export const hotspotSchema = z
  .strictObject({
    id,
    label: text,
    rect: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()], {
      error: "rect braucht genau vier ganze Zahlen: [x, y, breite, höhe].",
    }),
    if: z.array(conditionSchema).optional(),
    untersuchen: textVariantsSchema.optional(),
    gehen: id.optional(),
    sprechen: id.optional(),
    sprühen: id.optional(),
  })
  .refine(
    (h) =>
      h.untersuchen !== undefined ||
      h.gehen !== undefined ||
      h.sprechen !== undefined ||
      h.sprühen !== undefined,
    { error: "Hotspot braucht mindestens ein Verb: untersuchen, gehen, sprechen oder sprühen." },
  );

export const roomSchema = z.strictObject({
  id,
  name: text,
  description: textVariantsSchema.optional(),
  background: z.string().optional(),
  hotspots: z.array(hotspotSchema),
});

export const configSchema = z.strictObject({
  start_room: id,
  trust_labels: z.array(text).length(6, "trust_labels braucht genau 6 Stufen (0–5).").optional(),
  categories: z.record(z.string(), text).optional(),
  empty_category_text: text.optional(),
  start_items: z.record(id, z.number().int().min(1)).optional(),
});

// ---------- M3: Material, Sprühen, Spots, Karte ----------

export const itemSchema = z.strictObject({
  id,
  name: text,
  kind: z.enum(["cap", "dose"], { error: 'kind ist "cap" oder "dose".' }),
  text,
});
export const itemsFileSchema = z.array(itemSchema);

export const styleSchema = z.strictObject({
  id,
  name: text,
  ideal_caps: z.array(id).min(1),
  ideal_dose: z.union([id, z.literal("egal")]),
  requires: z.array(id).optional(), // Gegenstände, ohne die der Style nicht geht (Piece: Skinny für die Outline)
  requires_hint: text.optional(),
  cap_hint: text,
  dose_hint: text.optional(),
  top_label: text.optional(), // eigener Name für die beste Stufe, z. B. "Burner" beim Piece
});

export const spraySchema = z.strictObject({
  styles: z.array(styleSchema).min(1),
  quality_labels: z.array(text).length(4, "quality_labels braucht genau 4 Stufen (0–3)."),
  result: text, // Ergebnissatz mit {style}, {spot} und {quality}
});

export const SPOT_TYPES = ["zug", "heaven_spot", "legale_wand", "rolltor", "hauswand"] as const;
export const RISK_LEVELS = ["kein", "niedrig", "mittel", "hoch"] as const;

export const spotSchema = z.strictObject({
  id,
  name: text,
  type: z.enum(SPOT_TYPES, { error: `type muss eine von ${SPOT_TYPES.join(", ")} sein.` }),
  room: id,
  hotspot: id,
  fits: z.array(id).min(1),
  fit_hint: text,
  risk: z.enum(RISK_LEVELS, { error: `risk muss eine von ${RISK_LEVELS.join(", ")} sein.` }),
  if: z.array(conditionSchema).optional(),
});
export const spotsFileSchema = z.array(spotSchema);

const pos = z.tuple([z.number().int(), z.number().int()], {
  error: "pos braucht zwei ganze Zahlen: [x, y].",
});

export const mapSchema = z.strictObject({
  title: text,
  places: z.array(
    z.strictObject({
      room: id,
      pos,
      if: z.array(conditionSchema).optional(), // ohne Bedingung: sichtbar, sobald man dort war
    }),
  ),
});

export const FACT_CATEGORIES = ["spot", "risiko", "crews", "material", "szene"] as const;

export const factSchema = z.strictObject({
  id,
  category: z.enum(FACT_CATEGORIES, { error: `Kategorie muss eine von ${FACT_CATEGORIES.join(", ")} sein.` }),
  title: text,
  text,
  source: id,
});
export const factsFileSchema = z.array(factSchema);

// Eine Antwortoption des Spielers. Führt entweder weiter (next) oder beendet das Gespräch (end).
export const optionSchema = z
  .strictObject({
    text,
    id: id.optional(),
    if: z.array(conditionSchema).optional(),
    show_locked: text.optional(),
    effects: z.array(effectSchema).optional(),
    once: z.literal(true).optional(),
    next: id.optional(),
    end: z.literal(true).optional(),
  })
  .refine((o) => (o.next !== undefined) !== (o.end === true), {
    error: 'Eine Option braucht genau eins: "next" (weiter zu Knoten) oder "end: true" (Gespräch endet).',
  });

// Ein Dialogknoten: was der NPC sagt, und wie es danach weitergeht.
export const dialogueNodeSchema = z
  .strictObject({
    text: lines,
    effects: z.array(effectSchema).optional(),
    options: z.array(optionSchema).min(1).optional(),
    next: id.optional(),
    end: z.literal(true).optional(),
  })
  .refine(
    (n) => [n.options !== undefined, n.next !== undefined, n.end === true].filter(Boolean).length === 1,
    {
      error: 'Ein Knoten braucht genau eins: "options", "next" oder "end: true".',
    },
  );

export const npcSchema = z.strictObject({
  id,
  name: text,
  role: text,
  room: id,
  hotspot: id,
  trust: z.union([z.strictObject({ start: trustLevel }), z.literal(false)], {
    error: 'trust ist entweder "{ start: 0 }" (Zahl 0–5) oder "false" (kein Vertrauenswert).',
  }),
  dialogue: z.strictObject({
    start: z.union([
      id,
      z.array(z.strictObject({ if: z.array(conditionSchema).optional(), node: id })).min(1),
    ]),
    nodes: z.record(id, dialogueNodeSchema),
  }),
});

export type Condition = z.infer<typeof conditionSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type Hotspot = z.infer<typeof hotspotSchema>;
export type Room = z.infer<typeof roomSchema>;
export type GameConfig = z.infer<typeof configSchema>;
export type Fact = z.infer<typeof factSchema>;
export type FactCategory = (typeof FACT_CATEGORIES)[number];
export type DialogueOption = z.infer<typeof optionSchema>;
export type DialogueNode = z.infer<typeof dialogueNodeSchema>;
export type Npc = z.infer<typeof npcSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Style = z.infer<typeof styleSchema>;
export type SprayRules = z.infer<typeof spraySchema>;
export type Spot = z.infer<typeof spotSchema>;
export type MapConfig = z.infer<typeof mapSchema>;

export type GameContent = {
  config: GameConfig;
  rooms: Record<string, Room>;
  npcs: Record<string, Npc>;
  facts: Record<string, Fact>;
  items: Record<string, Item>;
  spray: SprayRules | null;
  spots: Record<string, Spot>;
  map: MapConfig | null;
};
