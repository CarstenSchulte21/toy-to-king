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
