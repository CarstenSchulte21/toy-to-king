// Schemas für alle Spielinhalte (SPEC 4.2–4.4).
// Die TypeScript-Typen werden direkt aus den Schemas abgeleitet – so können Inhalt und Code nicht auseinanderlaufen.
// M1: Rooms und Hotspots. M2: NPCs, Dialoge und Infos.
import { z } from "zod";
import { LOOKS, PASS_KINDS } from "./lettering/layout";
import { PALETTE_KEYS } from "./lettering/palette";

z.config(z.locales.de());

export const STAGE_WIDTH = 320;
export const STAGE_HEIGHT = 180;
export const MAX_TEXT_LENGTH = 120;
export const MIN_HOTSPOT_SIZE = 16;
export const ALLOWED_PLACEHOLDERS = ["name", "crew"] as const;

// Risiko (M4b): Ein Tag hat drei Abschnitte, die Woche sieben Tage.
export const PHASES = ["tag", "abend", "nacht"] as const;
export const WEEKDAYS = ["mo", "di", "mi", "do", "fr", "sa", "so"] as const;
export type Phase = (typeof PHASES)[number];
export type Weekday = (typeof WEEKDAYS)[number];

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
    z.strictObject({ rank_min: id }), // Rang aus progress.yaml (M4a)
    // Risiko (M4b)
    z.strictObject({ wanted_min: z.number().int().min(0).max(3) }),
    z.strictObject({ wanted_max: z.number().int().min(0).max(3) }),
    z.strictObject({ phase: z.enum(PHASES) }),
    z.strictObject({ not_phase: z.enum(PHASES) }),
    z.strictObject({ weekday: z.enum(WEEKDAYS) }),
    z.strictObject({ heat_min: z.strictObject({ spot: id, value: z.number().int().min(0).max(3) }) }),
    z.strictObject({ money_min: z.number().int().min(0) }),
  ],
  {
    error:
      "Unbekannte Bedingung. Erlaubt: flag, not_flag, visited, fact, not_fact, trust_min, has, sprayed, " +
      "rank_min, wanted_min, wanted_max, phase, not_phase, weekday, heat_min, money_min.",
  },
);

export const effectSchema = z.union(
  [
    z.strictObject({ set_flag: id }),
    z.strictObject({ clear_flag: id }),
    z.strictObject({ learn: id }),
    z.strictObject({ trust: z.number().int().min(-5).max(5) }),
    z.strictObject({ give: id }),
    z.strictObject({ wanted: z.number().int().min(-3).max(3) }), // M4b
    z.strictObject({ advance_day: z.literal(true) }), // M4b: abtauchen kostet einen ganzen Tag
    z.strictObject({ money: z.number().int().min(-99).max(99) }), // M5a
  ],
  {
    error:
      "Unbekannter Effekt. Erlaubt: set_flag, clear_flag, learn, trust, give, wanted, advance_day, money.",
  },
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

const rect = z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()], {
  error: "Ein Rechteck braucht genau vier ganze Zahlen: [x, y, breite, höhe].",
});

export const hotspotSchema = z
  .strictObject({
    id,
    label: text,
    rect,
    if: z.array(conditionSchema).optional(),
    untersuchen: textVariantsSchema.optional(),
    gehen: id.optional(),
    sprechen: id.optional(),
    sprühen: id.optional(),
    kaufen: z.literal(true).optional(), // M5a: Hier kann man einkaufen
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

export const ITEM_KINDS = ["cap", "dose", "color", "marker"] as const;

export const itemSchema = z
  .strictObject({
    id,
    name: text,
    kind: z.enum(ITEM_KINDS, { error: `kind ist eine von ${ITEM_KINDS.join(", ")}.` }),
    text,
    width: z.number().int().min(1).max(4).optional(), // Caps und Marker: 1 schmal … 4 sehr breit
    flow: z.number().positive().max(30).optional(), // Dosen und Marker: Farbe pro Sekunde
    color: z.enum(PALETTE_KEYS, { error: `color muss eine von ${PALETTE_KEYS.join(", ")} sein.` }).optional(),
    price: z.number().int().min(0).optional(), // was es bei Sibel kostet (M5a); ohne Preis nicht käuflich
    keeps: z.literal(true).optional(), // Marker: hält den Buff länger aus (Wachsmarker)
  })
  .superRefine((item, ctx) => {
    // Ein Marker ist Dose und Cap in einem: Er braucht beides.
    const need: Record<string, string[]> = {
      cap: ["width"],
      dose: ["flow"],
      color: ["color"],
      marker: ["width", "flow", "color"],
    };
    const fields = need[item.kind]!;
    for (const field of fields) {
      if (item[field as "width" | "flow" | "color"] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `Ein Gegenstand mit kind "${item.kind}" braucht "${field}".`,
        });
      }
    }
    for (const other of ["width", "flow", "color"] as const) {
      if (!fields.includes(other) && item[other] !== undefined) {
        const owners = Object.entries(need)
          .filter(([, f]) => f.includes(other))
          .map(([k]) => `"${k}"`)
          .join(" und ");
        ctx.addIssue({
          code: "custom",
          path: [other],
          message: `"${other}" gibt es nur bei kind ${owners}.`,
        });
      }
    }
    if (item.keeps !== undefined && item.kind !== "marker") {
      ctx.addIssue({ code: "custom", path: ["keeps"], message: '"keeps" gibt es nur bei kind "marker".' });
    }
  });
export const itemsFileSchema = z.array(itemSchema);

// M3.5: Styles mit eigener Form. Die Ebenen ergeben sich aus der Form (Tag: line; sonst fill, outline).
export const TOOLS = ["can", "marker"] as const;

export const styleSchema = z.strictObject({
  id,
  name: text,
  tool: z.enum(TOOLS).default("can"), // M5a: Tags macht man mit dem Marker
  look: z.enum(LOOKS, { error: `look muss eine von ${LOOKS.join(", ")} sein.` }),
  caps: z.partialRecord(z.enum(PASS_KINDS), z.array(id).min(1)), // ideale Caps je Ebene
  if: z.array(conditionSchema).optional(), // ohne erfüllte Bedingung gesperrt
  locked_hint: text.optional(),
  requires: z.array(id).optional(), // Gegenstände, ohne die der Style nicht geht
  requires_hint: text.optional(),
  only_at: z.array(id).optional(), // nur an diesen Spots
  only_at_hint: text.optional(),
  top_label: text.optional(), // eigener Name für die beste Stufe, z. B. "Burner"
  xp: z.number().int().min(0).optional(), // Grundwert für die XP (M4a)
});

export const spraySchema = z.strictObject({
  styles: z.array(styleSchema).min(1),
  quality_labels: z.array(text).length(4, "quality_labels braucht genau 4 Stufen (0–3)."),
  result: text, // Ergebnissatz mit {style}, {spot} und {quality}
  hints: z.strictObject({
    gaps: text, // Lücken trotz passendem Cap
    gaps_low: text, // Lücken mit Low Pressure
    reach: text, // Cap fürs Fill-in zu dünn
    fat_line: text, // Cap für Outline oder Tag zu breit
    drips: text,
  }),
});

export const SPOT_TYPES = ["zug", "heaven_spot", "legale_wand", "rolltor", "hauswand"] as const;
export const RISK_LEVELS = ["kein", "niedrig", "mittel", "hoch"] as const;
// Was man beim Sprühen vor sich hat. Ohne Angabe richtet es sich nach dem Spot-Typ.
export const SURFACES = ["rolltor", "hauswand", "beton", "zug", "mast", "kasten", "blech", "tonne"] as const;

export const spotSchema = z.strictObject({
  id,
  name: text,
  type: z.enum(SPOT_TYPES, { error: `type muss eine von ${SPOT_TYPES.join(", ")} sein.` }),
  room: id,
  hotspot: id,
  fits: z.array(id).min(1),
  fit_hint: text,
  risk: z.enum(RISK_LEVELS, { error: `risk muss eine von ${RISK_LEVELS.join(", ")} sein.` }),
  tool: z.enum(TOOLS).optional(), // M5a: Auf glatten Flächen geht nur der Marker
  surface: z.enum(SURFACES).optional(), // M5a: Untergrund im Sprüh-Bildschirm
  // Bemalbare Fläche innerhalb der Arbeitsfläche (320×180). Ohne Angabe: die ganze Fläche.
  // Ein Mast oder eine Tonne ist kleiner als eine Wand – sonst ragt der Tag darüber hinaus.
  frame: rect.optional(),
  rot: z.literal(90).optional(), // Der Schriftzug steht quer, z. B. längs am Mast
  // Wo das fertige Werk im Raum sitzt (Raumkoordinaten). Ohne Angabe: das Rechteck des Hotspots.
  place: rect.optional(),
  // `if` heißt: Kennt man den Spot überhaupt? `when` heißt: Geht er gerade?
  // Ein Spot, den man kennt, verschwindet nicht mehr kommentarlos – er sagt, warum er nicht geht.
  if: z.array(conditionSchema).optional(),
  when: z.array(conditionSchema).optional(),
  when_hint: text.optional(),
  // Zuschläge aufs Risiko, die an Bedingungen hängen: die Streife vor dem Laden, das Licht aus.
  risk_mod: z
    .array(
      z.strictObject({
        if: z.array(conditionSchema).min(1),
        by: z.number().min(-1).max(1),
        hint: text,
      }),
    )
    .optional(),
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

// ---------- M4a: Aufstieg ----------

export const rankSchema = z.strictObject({
  id,
  name: text,
  xp: z.number().int().min(0),
  text: text.optional(), // ein Satz beim Aufstieg
  unlocks: text.optional(), // was jetzt neu ist
});

export const progressSchema = z.strictObject({
  ranks: z.array(rankSchema).min(2),
  quality_factors: z.array(z.number().min(0)).length(4, "quality_factors braucht genau 4 Stufen (0–3)."),
  spot_factors: z.partialRecord(z.enum(SPOT_TYPES), z.number().min(0)),
  tempo_bonus_max: z.number().min(0).max(1),
  tempo_min_quality: z.number().int().min(0).max(3),
  repeat_share: z.number().min(0).max(1),
  rank_up_title: text, // Überschrift auf dem Aufstiegs-Bildschirm
});

// Risiko-Regeln (M4b): Wie wahrscheinlich ist es, dass an einem Spot etwas passiert?
const share = z.number().min(0).max(1);

export const riskSchema = z.strictObject({
  phases: z.array(text).length(3, "phases braucht genau drei Namen: Tag, Abend, Nacht."),
  weekdays: z.array(text).length(7, "weekdays braucht genau sieben Namen, beginnend mit Montag."),
  heat_labels: z.array(text).length(4, "heat_labels braucht genau vier Stufen (0–3)."),
  wanted_labels: z.array(text).length(4, "wanted_labels braucht genau vier Stufen (0–3)."),
  risk_labels: z.array(text).length(4, "risk_labels braucht genau vier Stufen für die Anzeige im Sketch."),
  base: z.partialRecord(z.enum(SPOT_TYPES), share),
  per_heat: share,
  per_wanted: share,
  per_phase: z.array(z.number().min(-1).max(1)).length(3, "per_phase braucht genau drei Werte."),
  // Wie viel Zeit was kostet. Ein Tag hat steps_per_day Schritte, gedrittelt in Tag, Abend, Nacht.
  time: z.strictObject({
    steps_per_day: z.number().int().min(3).max(60),
    room: z.number().int().min(0).max(10), // ein Raum weiter gehen
    travel: z.number().int().min(0).max(10), // quer durch den Bezirk über die Karte
    talk: z.number().int().min(0).max(10), // jemanden ansprechen
    work: z.number().int().min(0).max(10), // ein Werk mit der Dose
    marker: z.number().int().min(0).max(10), // ein Tag mit dem Marker
  }),
  slow_max: share, // Aufschlag, wenn man lange an der Wand steht
  cap: share, // Obergrenze
  caught_share: share, // Anteil der Zwischenfälle, die im Erwischtwerden enden
  heat_per_work: z.number().int().min(0).max(3),
  heat_per_caught: z.number().int().min(0).max(3),
  heat_decay: z.number().int().min(0).max(3),
  buff_per_day: z.partialRecord(z.enum(SPOT_TYPES), share),
  buff_weekday: z.strictObject({ day: z.enum(WEEKDAYS), type: z.enum(SPOT_TYPES) }).optional(),
  wanted_relief_legal: z.number().int().min(0).max(3), // Werk an der legalen Wand senkt Wanted
  cross_per_day: share,
  cross_max_quality: z.number().int().min(0).max(3),
  station_room: id, // Raum, in dem man nach dem Erwischtwerden aufwacht
  // Flags, die nur bis zum nächsten Morgen halten – die Stadt repariert die Laterne.
  nightly_flags: z.array(id).optional(),
  texts: z.strictObject({
    escaped: lines,
    caught: lines,
    buffed: text, // {spot} wird ersetzt
    crossed: text, // {spot} wird ersetzt
    day: text, // {day} und {weekday}
    hide_out: lines,
    no_time: text,
  }),
});

// Geld und Verbrauch (M5a).
export const economySchema = z.strictObject({
  start_money: z.number().int().min(0),
  allowance: z.strictObject({
    day: z.enum(WEEKDAYS),
    amount: z.number().int().min(0),
    text, // {amount}
  }),
  careful_from_wanted: z.number().int().min(0).max(3),
  careful_kinds: z.array(z.enum(ITEM_KINDS)),
  careful_colors: z.array(id),
  careful_text: text,
  paint_per_color: z.number().int().min(0).max(3),
  texts: z.strictObject({
    bought: text, // {item}, {price}
    too_expensive: text,
    no_paint: text,
    shop_title: text,
    shop_empty: text,
  }),
});

export const FACT_CATEGORIES = ["spot", "risiko", "crews", "material", "szene"] as const;

export const factSchema = z.strictObject({
  id,
  category: z.enum(FACT_CATEGORIES, { error: `Kategorie muss eine von ${FACT_CATEGORIES.join(", ")} sein.` }),
  title: text,
  text,
  source: id.optional(), // fehlt, wenn man die Info selbst gefunden hat (M5a)
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
export type Rank = z.infer<typeof rankSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type Risk = z.infer<typeof riskSchema>;
export type Economy = z.infer<typeof economySchema>;

export type GameContent = {
  config: GameConfig;
  rooms: Record<string, Room>;
  npcs: Record<string, Npc>;
  facts: Record<string, Fact>;
  items: Record<string, Item>;
  spray: SprayRules | null;
  spots: Record<string, Spot>;
  map: MapConfig | null;
  progress: Progress | null;
  risk: Risk | null;
  economy: Economy | null;
};
