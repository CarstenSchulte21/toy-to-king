// Pixel-Hintergründe für die Rooms (Grafik-Schritt).
// Gezeichnet wird in einen Puffer aus Palettenindizes (C64-Palette), 320×180 – dieselbe Größe wie die Bühne.
// Jede Szene richtet sich nach den Hotspot-Rechtecken aus content/rooms/*.yaml: Was man antippen kann,
// muss man auch sehen.
import { glyph, letteringChars } from "../../src/engine/lettering/glyphs";
import { PALETTE, type PaletteKey } from "../../src/engine/lettering/palette";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../../src/engine/content-schema";

export const ART_W = STAGE_WIDTH;
export const ART_H = STAGE_HEIGHT;

export type Art = Uint8Array;

const INDEX = Object.fromEntries(PALETTE.map((p, i) => [p.key, i])) as Record<PaletteKey, number>;
export const C = INDEX;

// Deterministischer Zufall: gleiche Saat, gleiches Bild.
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function newArt(fill: number): Art {
  return new Uint8Array(ART_W * ART_H).fill(fill);
}

export function px(a: Art, x: number, y: number, c: number): void {
  if (x < 0 || y < 0 || x >= ART_W || y >= ART_H) return;
  a[(y | 0) * ART_W + (x | 0)] = c;
}

export function get(a: Art, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= ART_W || y >= ART_H) return 0;
  return a[(y | 0) * ART_W + (x | 0)]!;
}

export function rect(a: Art, x: number, y: number, w: number, h: number, c: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(a, i, j, c);
}

export function frame(a: Art, x: number, y: number, w: number, h: number, c: number): void {
  for (let i = x; i < x + w; i++) {
    px(a, i, y, c);
    px(a, i, y + h - 1, c);
  }
  for (let j = y; j < y + h; j++) {
    px(a, x, j, c);
    px(a, x + w - 1, j, c);
  }
}

export function hline(a: Art, x: number, y: number, w: number, c: number): void {
  for (let i = x; i < x + w; i++) px(a, i, y, c);
}

export function vline(a: Art, x: number, y: number, h: number, c: number): void {
  for (let j = y; j < y + h; j++) px(a, x, j, c);
}

export function line(a: Art, x0: number, y0: number, x1: number, y1: number, c: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= steps; k++)
    px(a, Math.round(x0 + ((x1 - x0) * k) / steps), Math.round(y0 + ((y1 - y0) * k) / steps), c);
}

export function disc(a: Art, cx: number, cy: number, r: number, c: number): void {
  for (let j = Math.floor(cy - r); j <= cy + r; j++)
    for (let i = Math.floor(cx - r); i <= cx + r; i++)
      if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) px(a, i, j, c);
}

// Körnung: streut einzelne Pixel in einen Bereich, damit Flächen nicht tot wirken.
export function grain(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
  density: number,
  R: () => number,
): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (R() < density) px(a, i, j, c);
}

// Farbverlauf mit Dithering (Bayer 4×4) – für Himmel und Wände.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function gradient(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
): void {
  for (let j = y; j < y + h; j++) {
    const t = (j - y) / Math.max(1, h - 1);
    for (let i = x; i < x + w; i++) {
      const thr = (BAYER[(j % 4) * 4 + (i % 4)]! + 0.5) / 16;
      px(a, i, j, t > thr ? bottom : top);
    }
  }
}

export function bricks(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  brick: number,
  accent: number,
  mortar: number,
  R: () => number,
): void {
  for (let j = y; j < y + h; j++) {
    const row = Math.floor((j - y) / 7);
    const off = row % 2 ? 8 : 0;
    for (let i = x; i < x + w; i++) {
      const isMortar = (j - y) % 7 === 6 || (i + off) % 16 === 15;
      px(a, i, j, isMortar ? mortar : (Math.floor((i + off) / 16) + row) % 7 === 0 ? accent : brick);
      if (!isMortar && R() < 0.02) px(a, i, j, accent);
    }
  }
}

// Rolltor: waagerechte Lamellen mit Lichtkante
export function shutter(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  light: number,
  dark: number,
): void {
  for (let j = y; j < y + h; j++) {
    const band = (j - y) % 6;
    hline(a, x, j, w, band === 0 ? light : band === 5 ? dark : base);
  }
}

// Ein Schriftzug aus den Buchstaben-Skeletten der Engine – für fremde Werke an den Wänden.
// Erst dicker in der Outline-Farbe, dann dünner in der Füllfarbe: das ergibt eine Outline.
export function word(
  a: Art,
  x: number,
  y: number,
  h: number,
  text: string,
  fill: number,
  outline: number,
  slant = 0,
  thin = false,
): number {
  const chars = letteringChars(text);
  const u = h / 6;
  const adv = 5 * u;
  const r = Math.max(1.2, 0.85 * u);
  const draw = (radius: number, color: number) => {
    chars.forEach((ch, i) => {
      const cx = x + i * adv + 2 * u;
      for (const stroke of glyph(ch)!) {
        for (let k = 0; k < stroke.length - 1; k++) {
          const [gx0, gy0] = stroke[k]!;
          const [gx1, gy1] = stroke[k + 1]!;
          const p0 = [cx + (gx0 - 2) * u - (gy0 - 3) * u * slant, y + gy0 * u];
          const p1 = [cx + (gx1 - 2) * u - (gy1 - 3) * u * slant, y + gy1 * u];
          const steps = Math.max(1, Math.ceil(Math.hypot(p1[0]! - p0[0]!, p1[1]! - p0[1]!)));
          for (let t = 0; t <= steps; t++) {
            disc(
              a,
              p0[0]! + ((p1[0]! - p0[0]!) * t) / steps,
              p0[1]! + ((p1[1]! - p0[1]!) * t) / steps,
              radius,
              color,
            );
          }
        }
      }
    });
  };
  if (!thin) draw(r + 1.3, outline);
  draw(thin ? Math.max(0.6, r * 0.55) : r, fill);
  return chars.length * adv;
}

// Ein fremdes Werk an der Wand: farbiger Block mit Outline – Deko, kein eigenes Werk.
export function piece(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fill: number,
  outline: number,
  R: () => number,
  background?: number,
): void {
  if (background !== undefined) {
    rect(a, x + 3, y, w - 6, h, background);
    rect(a, x, y + 3, w, h - 6, background);
    for (const [cx, cy] of [
      [x + 3, y + 3],
      [x + w - 4, y + 3],
      [x + 3, y + h - 4],
      [x + w - 4, y + h - 4],
    ] as [number, number][])
      disc(a, cx, cy, 3.5, background);
    for (let k = 0; k < 4; k++) {
      const sx = x + 4 + Math.floor(R() * (w - 8));
      const sy = y + 4 + Math.floor(R() * (h - 8));
      hline(a, sx - 1, sy, 3, C.white);
      vline(a, sx, sy - 1, 3, C.white);
    }
  }
  const chars = letteringChars(text).length;
  const letterH = Math.max(10, Math.min(h - 10, ((w - 10) / (chars * 5)) * 6, 30));
  const used = chars * 5 * (letterH / 6);
  word(a, x + (w - used) / 2 + 1, y + (h - letterH) / 2, letterH, text, fill, outline, 0.12);
}

// Tags an einer Wand: kleine Handstyles, dazwischen ein paar Kritzel.
const TAG_WORDS = ["SEB", "ZINK", "MOA", "ARO", "KEV", "NIL", "RAS", "TOY", "EMI", "LUK"];
export function tags(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: number[],
  count: number,
  R: () => number,
): void {
  // In Zeilen verteilt, damit sich die Tags nicht zu einem Knäuel überlagern.
  const rows = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(w / 46))));
  const rowH = h / rows;
  for (let k = 0; k < count; k++) {
    const c = colors[Math.floor(R() * colors.length)]!;
    const text = TAG_WORDS[Math.floor(R() * TAG_WORDS.length)]!;
    const size = Math.min(8 + Math.floor(R() * 6), Math.max(7, rowH - 4));
    const used = text.length * 5 * (size / 6);
    const row = k % rows;
    const col = Math.floor(k / rows);
    const perRow = Math.ceil(count / rows);
    const slot = w / perRow;
    const tx = x + col * slot + R() * Math.max(1, slot - used);
    const ty = y + row * rowH + R() * Math.max(1, rowH - size - 2);
    word(a, tx, ty, size, text, c, c, 0.3 + R() * 0.2, true);
    if (R() < 0.5) line(a, tx - 2, ty + size + 1, tx + used, ty + size - 1, c);
  }
}

export function toRgba(art: Art): Uint8Array {
  const out = new Uint8Array(ART_W * ART_H * 4);
  for (let i = 0; i < art.length; i++) {
    const rgb = PALETTE[art[i]!]!.rgb;
    out[i * 4] = rgb[0];
    out[i * 4 + 1] = rgb[1];
    out[i * 4 + 2] = rgb[2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

// ---------- Werkzeuge für detailliertere Szenen (nach Tester-Feedback) ----------

// Zwei Farben mischen (Bayer 4×4). ratio 0 = nur a, 1 = nur b. So entstehen Zwischentöne,
// die es in der Palette nicht gibt – wie in den Adventures der 80er.
export function dither(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  c1: number,
  c2: number,
  ratio: number,
): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      const thr = (BAYER[(j % 4) * 4 + (i % 4)]! + 0.5) / 16;
      px(a, i, j, ratio > thr ? c2 : c1);
    }
}

// Ein Körper mit Licht oben/links, Schatten unten/rechts und schwarzer Kontur.
export function box(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  light: number,
  dark: number,
  outline = C.black,
): void {
  rect(a, x, y, w, h, base);
  hline(a, x + 1, y + 1, w - 2, light);
  vline(a, x + 1, y + 1, h - 2, light);
  hline(a, x + 1, y + h - 2, w - 2, dark);
  vline(a, x + w - 2, y + 1, h - 2, dark);
  frame(a, x, y, w, h, outline);
}

// Hängendes Kabel zwischen zwei Punkten.
export function cable(a: Art, x0: number, y0: number, x1: number, y1: number, sag: number, c: number): void {
  const steps = Math.max(2, Math.abs(x1 - x0));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag;
    px(a, Math.round(x), Math.round(y), c);
    px(a, Math.round(x), Math.round(y) + 1, c);
  }
}

// Fallrohr an einer Wand.
export function pipe(
  a: Art,
  x: number,
  y: number,
  h: number,
  base: number,
  light: number,
  dark: number,
): void {
  rect(a, x, y, 5, h, base);
  vline(a, x + 1, y, h, light);
  vline(a, x + 4, y, h, dark);
  for (let j = y + 12; j < y + h; j += 26) {
    hline(a, x - 1, j, 7, dark);
    hline(a, x - 1, j + 1, 7, base);
  }
}

// Plakat oder Aushang mit angedeuteten Textzeilen.
export function poster(
  a: Art,
  x: number,
  y: number,
  w: number,
  h: number,
  paper: number,
  ink: number,
  R: () => number,
): void {
  box(a, x, y, w, h, paper, C.white, C.grey);
  for (let j = y + 4; j < y + h - 3; j += 3)
    hline(a, x + 3, j, Math.max(3, Math.floor((w - 6) * (0.4 + R() * 0.6))), ink);
  if (R() < 0.5) px(a, x + w - 2, y + h - 2, C.grey);
}

// Pfütze mit Spiegelung.
export function puddle(
  a: Art,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  c: number,
  glint: number,
): void {
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) px(a, cx + i, cy + j, c);
  hline(a, cx - Math.floor(rx / 2), cy - Math.floor(ry / 3), Math.max(2, rx), glint);
}

// Unkraut, Gras, Gestrüpp.
export function weeds(a: Art, x: number, y: number, count: number, c: number, R: () => number): void {
  for (let k = 0; k < count; k++) {
    const bx = x + Math.floor(R() * 10) - 5;
    const h = 3 + Math.floor(R() * 5);
    for (let j = 0; j < h; j++) px(a, bx + Math.round(Math.sin(j * 0.8) * 1.5), y - j, c);
  }
}

// Riss in Wand oder Boden.
export function crack(a: Art, x: number, y: number, len: number, c: number, R: () => number): void {
  let cx = x;
  let cy = y;
  for (let k = 0; k < len; k++) {
    px(a, cx, cy, c);
    cy += 1;
    cx += R() < 0.5 ? -1 : R() < 0.5 ? 0 : 1;
  }
}
