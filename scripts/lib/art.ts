// Pixel-Hintergründe für die Rooms (Grafik-Schritt).
// Gezeichnet wird in einen Puffer aus Palettenindizes (C64-Palette), 320×180 – dieselbe Größe wie die Bühne.
// Jede Szene richtet sich nach den Hotspot-Rechtecken aus content/rooms/*.yaml: Was man antippen kann,
// muss man auch sehen.
import { glyph, letteringChars } from "../../src/engine/lettering/glyphs";
import type { Pt } from "../../src/engine/lettering/raster";
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

// Fremde Werke an den Wänden: Tag, Throw-up oder Wildstyle – gezeichnet aus denselben
// Buchstaben-Skeletten wie die Werke des Spielers, nur direkt in der Szene und in jeder Größe.
export type GraffitiStyle = "tag" | "throwup" | "wildstyle";

export type GraffitiColors = {
  fill: number;
  fill2?: number; // zweite Farbe für einen Fade
  outline: number;
  second?: number; // Second Outline
  shade?: number; // 3D
  background?: number;
};

type Seg = [Pt, Pt];

// Ecken abrunden (für Bubble-Formen).
function smooth(pts: Pt[], iterations: number): Pt[] {
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    if (out.length < 3) return out;
    const next: Pt[] = [out[0]!];
    for (let i = 0; i < out.length - 1; i++) {
      const [ax, ay] = out[i]!;
      const [bx, by] = out[i + 1]!;
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(out[out.length - 1]!);
    out = next;
  }
  return out;
}

const STYLE = {
  tag: { r: 0.16, adv: 4.3, slant: 0.34, round: 0, jitter: 0.12, arrows: false, swoosh: true },
  throwup: { r: 1.05, adv: 4.7, slant: 0.06, round: 3, jitter: 0.04, arrows: false, swoosh: false },
  wildstyle: { r: 0.42, adv: 4.2, slant: 0.3, round: 0, jitter: 0.06, arrows: true, swoosh: false },
} as const;

export function graffiti(
  a: Art,
  x: number,
  y: number,
  h: number,
  text: string,
  style: GraffitiStyle,
  colors: GraffitiColors,
  R: () => number,
): number {
  const P = STYLE[style];
  const chars = letteringChars(text);
  const u = h / 6;
  const adv = P.adv * u;
  // Tags sind Striche aus einer dünnen Cap: gleichbleibend schmal, sonst werden sie zu Klecksen.
  const radius = style === "tag" ? Math.max(0.9, 0.09 * h) : P.r * u;
  const width = chars.length * adv;

  // Alle Striche einsammeln – inklusive Arrows und Connections.
  const segs: Seg[] = [];
  const push = (pts: Pt[]) => {
    const smoothed = P.round ? smooth(pts, P.round) : pts;
    for (let i = 0; i < smoothed.length - 1; i++) segs.push([smoothed[i]!, smoothed[i + 1]!]);
  };
  chars.forEach((ch, i) => {
    const cx = x + i * adv + 2 * u;
    const jitter = () => (R() - 0.5) * 2 * P.jitter * u;
    const tf = ([gx, gy]: Pt): Pt => {
      const py = (gy - 3) * u;
      return [cx + (gx - 2) * u - py * P.slant + jitter(), y + h / 2 + py + jitter()];
    };
    for (const stroke of glyph(ch)!) {
      const pts = stroke.map(tf);
      push(pts);
      if (!P.arrows) continue;
      const closed = Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 1;
      if (closed) continue;
      // Arrows: Spitze verlängern, dazu zwei Widerhaken
      for (const [inner, tip] of [
        [pts[1], pts[0]],
        [pts[pts.length - 2], pts[pts.length - 1]],
      ] as [Pt | undefined, Pt][]) {
        if (!inner || R() > 0.55) continue;
        const dx = tip[0] - inner[0];
        const dy = tip[1] - inner[1];
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const end: Pt = [tip[0] + ux * 1.5 * u, tip[1] + uy * 1.5 * u];
        segs.push([tip, end]);
        for (const sign of [-1, 1]) {
          const bx = end[0] - ux * 1.1 * u + sign * uy * 0.9 * u;
          const by = end[1] - uy * 1.1 * u - sign * ux * 0.9 * u;
          segs.push([end, [bx, by]]);
        }
      }
    }
    // Connections zwischen den Buchstaben
    if (P.arrows && i < chars.length - 1) {
      segs.push([
        [cx + 1.6 * u, y + h * 0.62],
        [cx + adv - 1.6 * u, y + h * 0.42],
      ]);
    }
  });

  const stroke = (r: number, color: number, dx = 0, dy = 0) => {
    for (const [p0, p1] of segs) {
      const steps = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])));
      for (let t = 0; t <= steps; t++)
        disc(a, p0[0] + ((p1[0] - p0[0]) * t) / steps + dx, p0[1] + ((p1[1] - p0[1]) * t) / steps + dy, r, color);
    }
  };

  if (colors.background !== undefined) {
    const pad = Math.max(3, u);
    rect(a, x - pad, y - pad / 2, width + pad, h + pad, colors.background);
    for (let k = 0; k < 4; k++) {
      const sx = Math.round(x - pad + R() * (width + pad));
      const sy = Math.round(y - pad / 2 + R() * (h + pad));
      hline(a, sx - 1, sy, 3, C.white);
      vline(a, sx, sy - 1, 3, C.white);
    }
  }
  if (colors.shade !== undefined) stroke(radius + 1.4, colors.shade, Math.max(2, u * 0.5), Math.max(2, u * 0.5));
  if (colors.second !== undefined) stroke(radius + 2.8, colors.second);
  if (style !== "tag") stroke(radius + 1.4, colors.outline);
  else if (colors.outline !== colors.fill) stroke(radius + 0.8, colors.outline);
  stroke(radius, colors.fill);

  // Fade: untere Hälfte der Füllung umfärben
  if (colors.fill2 !== undefined) {
    for (let j = Math.floor(y); j < y + h; j++) {
      const t = (j - y) / h;
      for (let i = Math.floor(x - u); i < x + width + u; i++) {
        if (get(a, i, j) !== colors.fill) continue;
        const thr = (BAYER[(j % 4) * 4 + (i % 4)]! + 0.5) / 16;
        if (t > thr) px(a, i, j, colors.fill2);
      }
    }
  }
  // Highlights auf der Füllung
  if (style !== "tag") {
    for (let j = Math.floor(y); j < y + h * 0.5; j++)
      for (let i = Math.floor(x); i < x + width; i++)
        if (get(a, i, j) === colors.fill && get(a, i - 1, j - 1) === colors.outline && R() < 0.5) px(a, i, j, C.white);
  }
  // Schwung unter dem Tag
  if (P.swoosh) {
    const by = y + h + Math.max(1, u * 0.6);
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const sx = x - u + (width + 2 * u) * t;
      const sy = by + Math.sin(Math.PI * t) * u * 0.9 - t * u * 0.8;
      disc(a, sx, sy, radius, colors.fill);
    }
  }
  return width;
}

// Tags an einer Wand: kleine Handstyles, dazwischen ein paar Kritzel.
const TAG_WORDS = ["TREN", "SANS", "HBF"];
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
    const size = Math.min(12 + Math.floor(R() * 6), Math.max(10, rowH - 3));
    const used = text.length * 4.3 * (size / 6);
    const row = k % rows;
    const col = Math.floor(k / rows);
    const perRow = Math.ceil(count / rows);
    const slot = w / perRow;
    const tx = x + col * slot + R() * Math.max(1, slot - used);
    const ty = y + row * rowH + R() * Math.max(1, rowH - size - 4);
    graffiti(a, tx, ty, size, text, "tag", { fill: c, outline: c }, R);
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
