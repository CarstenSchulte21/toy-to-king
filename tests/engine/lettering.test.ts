// Schriftzug, Simulation und Bild (M3.5, SPEC-M3.5 Abschnitt 2 und 3).
import { describe, expect, it } from "vitest";
import { glyph, letteringChars } from "@/engine/lettering/glyphs";
import { bbox, count, WORK_H, WORK_W } from "@/engine/lettering/raster";
import {
  TRANSPARENT,
  buildLettering,
  comfortableSpeed,
  passTimeLimit,
  passesFor,
  renderLettering,
  traceGuide,
  type Look,
  type PassKind,
  type Stroke,
} from "@/engine/lettering";
import { tagBody } from "@/engine/lettering/layout";
import { simulateStrokes } from "@/engine/lettering/render";

const LOOKS: Look[] = ["tag", "straight", "bubble"];
const widths: Record<PassKind, number> = { line: 1, fill: 3, outline: 2 };

function render(name: string, look: Look, strokes: Stroke[], flow = 10, w: Partial<typeof widths> = {}) {
  const l = buildLettering(name, look, 5);
  return renderLettering(l, {
    colors: { line: 0, fill: [7], outline: 0 },
    flow,
    seed: 5,
    passes: passesFor(look).map((kind) => ({ kind, width: { ...widths, ...w }[kind], strokes })),
  });
}

describe("Buchstaben", () => {
  it("jedes Zeichen des Namensschemas hat ein Skelett", () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_ÄÖÜß") expect(glyph(ch), ch).not.toBeNull();
  });

  it("Name wird groß geschrieben, unbekannte Zeichen fallen weg, notfalls TOY", () => {
    expect(letteringChars("kraze")).toEqual(["K", "R", "A", "Z", "E"]);
    expect(letteringChars("ŁŁ")).toEqual(["T", "O", "Y"]);
  });

  it("auch 16 Zeichen passen in jedem Style auf die Wand", () => {
    for (const look of LOOKS) {
      const l = buildLettering("ABCDEFGHIJKLMNOP", look, 1);
      for (const g of l.groups) {
        const b = bbox(g.body)!;
        expect(b.x0, look).toBeGreaterThan(0);
        expect(b.x1, look).toBeLessThan(WORK_W - 1);
        expect(b.y0, look).toBeGreaterThan(0);
        expect(b.y1, look).toBeLessThan(WORK_H - 1);
      }
    }
  });

  it("gleiche Saat, gleicher Schriftzug – andere Saat, anderer", () => {
    const a = buildLettering("KRAZE", "bubble", 1).groups[0]!.body;
    const b = buildLettering("KRAZE", "bubble", 1).groups[0]!.body;
    const c = buildLettering("KRAZE", "bubble", 2).groups[0]!.body;
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(Buffer.from(a).equals(Buffer.from(c))).toBe(false);
  });

  it("Bubble: ein Körper je Buchstabe (für die Überlappung), sonst einer für alles", () => {
    expect(buildLettering("KRAZE", "bubble", 1).groups).toHaveLength(5);
    expect(buildLettering("KRAZE", "straight", 1).groups).toHaveLength(1);
    expect(passesFor("tag")).toEqual(["line"]);
    expect(passesFor("bubble")).toEqual(["fill", "outline"]);
  });

  it("breiter Cap macht den Tag dicker", () => {
    const l = buildLettering("KRAZE", "tag", 1);
    expect(count(tagBody(l, 4))).toBeGreaterThan(count(tagBody(l, 1)) * 2);
  });
});

describe("Nachfahren", () => {
  it("sauberes Nachfahren deckt in jedem Style fast alles", () => {
    for (const look of LOOKS) {
      const l = buildLettering("KRAZE", look, 5);
      const r = render("KRAZE", look, traceGuide(l, comfortableSpeed(10)));
      for (const s of r.stats) expect(s.coverage, `${look} ${s.kind}`).toBeGreaterThan(0.95);
    }
  });

  it("ohne Striche bleibt alles durchsichtig", () => {
    const r = render("KRAZE", "bubble", []);
    expect(r.pixels.every((p) => p === TRANSPARENT)).toBe(true);
    expect(r.stats.map((s) => s.coverage)).toEqual([0, 0]);
  });

  it("Skinny Cap fürs Fill-in lässt die Ränder frei", () => {
    const l = buildLettering("KRAZE", "bubble", 5);
    const r = render("KRAZE", "bubble", traceGuide(l, comfortableSpeed(10)), 10, { fill: 1 });
    expect(r.stats[0]!.coverage).toBeLessThan(0.6);
  });

  it("nach Ablauf der Zeit kommt keine Farbe mehr an", () => {
    const l = buildLettering("KRAZE", "tag", 5);
    const limit = passTimeLimit(l, 10);
    const late = traceGuide(l, comfortableSpeed(10)).map((s) =>
      s.map((v, i) => (i % 3 === 2 ? v + limit : v)),
    );
    expect(render("KRAZE", "tag", late).stats[0]!.coverage).toBe(0);
  });

  it("lange Namen bekommen mehr Zeit – pro Buchstabe", () => {
    const short = passTimeLimit(buildLettering("TREN", "bubble", 5), 10);
    const long = passTimeLimit(buildLettering("KALLEMANN12345", "bubble", 5), 10);
    expect(long - short).toBeGreaterThanOrEqual(10 * 1000);
  });

  it("Low Pressure hat mehr Zeit als High Pressure", () => {
    const l = buildLettering("KRAZE", "bubble", 5);
    expect(passTimeLimit(l, 4)).toBeGreaterThan(passTimeLimit(l, 10));
  });

  it("Drips nur beim Stehenbleiben – und mit High Pressure früher als mit Low Pressure", () => {
    const l = buildLettering("KRAZE", "straight", 5);
    const [x, y] = [l.nodes[40]!, l.nodes[41]!];
    const hold = (ms: number): Stroke[] => [
      Array.from({ length: ms / 50 + 1 }, (_, k) => [x, y, k * 50]).flat(),
    ];
    expect(simulateStrokes(l, hold(300), 10, 20000).drips).toHaveLength(0);
    expect(simulateStrokes(l, hold(500), 10, 20000).drips).toHaveLength(1);
    expect(simulateStrokes(l, hold(500), 4, 20000).drips).toHaveLength(0);
    expect(simulateStrokes(l, hold(1000), 4, 20000).drips).toHaveLength(1);
  });

  it("Farbe landet nur in der Nähe der Führungslinie", () => {
    const r = render("KRAZE", "tag", [[0, 0, 0, 5, 5, 50, 10, 10, 100]]);
    expect(r.stats[0]!.coverage).toBe(0);
  });
});

// Bemalbare Fläche (M5a-Nachbesserung): Ein Tag auf einer Mülltonne ist so groß wie die Tonne,
// und am Mast steht er quer.
describe("Bemalbare Fläche", () => {
  const box = (l: ReturnType<typeof buildLettering>) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < l.nodeCount; k++) {
      const x = l.nodes[k * 2]!;
      const y = l.nodes[k * 2 + 1]!;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };

  it("ohne Fläche bleibt alles wie vorher", () => {
    const a = buildLettering("RUBIX", "tag", 5);
    const b = buildLettering("RUBIX", "tag", 5, undefined);
    expect(box(a)).toEqual(box(b));
  });

  it("der Schriftzug bleibt in der Fläche", () => {
    const frame = { x: 125, y: 14, w: 70, h: 156, rot: 0 } as const;
    const b = box(buildLettering("RUBIX", "tag", 5, frame));
    expect(b.x0).toBeGreaterThanOrEqual(frame.x);
    expect(b.y0).toBeGreaterThanOrEqual(frame.y);
    expect(b.x1).toBeLessThanOrEqual(frame.x + frame.w);
    expect(b.y1).toBeLessThanOrEqual(frame.y + frame.h);
  });

  it("auf einer kleinen Fläche wird der Tag kleiner, nicht abgeschnitten", () => {
    const gross = box(buildLettering("RUBIX", "tag", 5));
    const klein = box(buildLettering("RUBIX", "tag", 5, { x: 125, y: 14, w: 70, h: 156, rot: 0 }));
    expect(klein.w).toBeLessThan(gross.w * 0.5);
    // Das Seitenverhältnis bleibt – sonst wäre der Name verzerrt.
    expect(klein.w / klein.h).toBeCloseTo(gross.w / gross.h, 1);
  });

  it("quer heißt hochkant: am Mast ist der Tag höher als breit", () => {
    const quer = box(buildLettering("RUBIX", "tag", 5, { x: 122, y: 8, w: 76, h: 164, rot: 90 }));
    expect(quer.h).toBeGreaterThan(quer.w * 2);
    expect(quer.x1).toBeLessThanOrEqual(122 + 76);
    expect(quer.y1).toBeLessThanOrEqual(8 + 164);
  });

  it("die Führungslinie wird mitverkleinert, nicht nur das Bild", () => {
    const gross = buildLettering("RUBIX", "tag", 5);
    const klein = buildLettering("RUBIX", "tag", 5, { x: 125, y: 14, w: 70, h: 156, rot: 0 });
    expect(klein.guideLength).toBeLessThan(gross.guideLength);
  });
});
