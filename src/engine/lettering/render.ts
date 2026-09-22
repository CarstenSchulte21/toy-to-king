// Nachfahren simulieren und das Werk als Bild (Palettenindex) zusammensetzen.
//
// Regeln (SPEC-M3.5, Abschnitt 2):
// - Jeder Knoten der Führungslinie sammelt Farbe, solange der Finger näher als TOLERANCE ist.
//   Menge pro Millisekunde = Flow der Dose / 1000. Ab 1 gilt die Stelle als gedeckt.
// - Bleibt der Finger am Stück zu lange fast stehen, läuft die Farbe: Drip.
// - Der Cap bestimmt die Breite: Fill-in erreicht nur Pixel bis REACH × halbe Strichbreite,
//   Outline und Tag werden mit breitem Cap fett und bekommen Overspray.
import {
  buildLettering,
  cached,
  decorFor,
  nodesNear,
  passesFor,
  ringOf,
  tagBody,
  type Lettering,
  type Look,
  type PassKind,
} from "./layout";
import { TRANSPARENT } from "./palette";
import {
  N,
  WORK_H,
  WORK_W,
  bbox,
  dilate,
  emptyMask,
  erode,
  minus,
  pixelNoise,
  rng,
  shift,
  stampDisc,
  union,
  type Box,
  type Mask,
} from "./raster";

export const TOLERANCE = 7;
// Drips: Bleibt der Finger innerhalb von DWELL_RADIUS px, gilt er als stehend. Nach
// DRIP_AT_MS_TIMES_FLOW / Flow ms am Stück läuft die Farbe (High Pressure nach 350 ms, Low nach knapp 900 ms).
export const DWELL_RADIUS = 4;
export const DRIP_AT_MS_TIMES_FLOW = 3500;
export const REACH = [0.45, 0.75, 1.35, 1.7] as const; // Fill-in: erreichbarer Abstand je Cap-Breite
export const OUTLINE_THICKNESS = [1, 2, 3, 4] as const;
const OVERSPRAY = [0, 0, 0.06, 0.14] as const; // Outline und Tag
const FILL_OVERSPRAY = [0, 0, 0, 0.09] as const;
const MAX_STEP_MS = 120; // längere Pausen zwischen zwei Messpunkten zählen nicht als Sprühen
const IDEAL_EXPOSURE = 2;

// Wie viel Farbe ein Pixel braucht, schwankt leicht (0,5–1,0): Wenig Farbe ergibt ein fleckiges Bild
// statt gar keins.
const NEED = new Float32Array(N);
for (let i = 0; i < N; i++) NEED[i] = 0.5 + 0.5 * pixelNoise(i, 4711);

export type Stroke = number[]; // x, y, t, x, y, t … (t in ms seit Start der Ebene)
export type Drip = { node: number; strength: number };
export type PassInput = { kind: PassKind; width: number; strokes: Stroke[] };
export type RenderInput = {
  colors: { line?: number; fill?: number[]; outline?: number; second?: number; background?: number };
  flow: number;
  passes: PassInput[];
  ideal?: boolean;
  seed: number;
};
export type PassStats = {
  kind: PassKind;
  width: number;
  coverage: number;
  drips: number;
  exposure: Float32Array;
};
export type RenderResult = { pixels: Uint8Array; stats: PassStats[] };

// Zeit pro Ebene. Angenehmes Tempo ist 7 × Flow in px/s (High Pressure ≈ 70, Low Pressure ≈ 28) –
// dabei bekommt jede Stelle etwa doppelt so viel Farbe wie nötig. Dazu 50 % Luft, 3 s Anlauf und
// 1,2 s je Buchstabe: Jeder Buchstabe heißt neu ansetzen, und lange Namen werden klein und fummelig
// (Tester-Feedback: auf dem Handy wurde es bei langen Namen zu knapp).
export function comfortableSpeed(flow: number): number {
  return 7 * flow;
}

export const SECONDS_PER_LETTER = 1.2;

export function passTimeLimit(l: Lettering, flow: number): number {
  const seconds =
    (l.guideLength / comfortableSpeed(Math.max(1, flow))) * 1.5 + 3 + SECONDS_PER_LETTER * l.chars.length;
  return Math.round(Math.min(60, Math.max(8, seconds)) * 1000);
}

function nearestNode(l: Lettering, x: number, y: number, radius: number): number {
  let best = -1;
  let bestD = Infinity;
  for (const k of nodesNear(l, x, y, radius)) {
    const d = Math.hypot(l.nodes[k * 2]! - x, l.nodes[k * 2 + 1]! - y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

export function simulateStrokes(
  l: Lettering,
  strokes: Stroke[],
  flow: number,
  limitMs: number,
): { exposure: Float32Array; drips: Drip[] } {
  const exposure = new Float32Array(l.nodeCount);
  const drips: Drip[] = [];
  const rate = flow / 1000;
  const dripAfter = DRIP_AT_MS_TIMES_FLOW / Math.max(1, flow);
  for (const s of strokes) {
    // Verweilen: Solange der Finger im kleinen Kreis um den Ankerpunkt bleibt, läuft die Zeit.
    let dwellMs = 0;
    let ax = s[0] ?? 0;
    let ay = s[1] ?? 0;
    const endDwell = (nx: number, ny: number) => {
      if (dwellMs >= dripAfter) {
        const node = nearestNode(l, ax, ay, TOLERANCE);
        if (node >= 0) drips.push({ node, strength: (dwellMs - dripAfter) / 100 });
      }
      dwellMs = 0;
      ax = nx;
      ay = ny;
    };
    for (let i = 3; i + 2 < s.length; i += 3) {
      const x0 = s[i - 3]!;
      const y0 = s[i - 2]!;
      const t0 = s[i - 1]!;
      const x1 = s[i]!;
      const y1 = s[i + 1]!;
      const t1 = Math.min(s[i + 2]!, limitMs);
      if (t0 >= limitMs) break;
      const dt = Math.max(0, Math.min(MAX_STEP_MS, t1 - t0));
      if (dt === 0) continue;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(len / 2));
      const amount = (dt / steps) * rate;
      for (let k = 0; k < steps; k++) {
        const f = (k + 0.5) / steps;
        for (const node of nodesNear(l, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, TOLERANCE)) {
          exposure[node]! += amount;
        }
      }
      if (Math.hypot(x1 - ax, y1 - ay) <= DWELL_RADIUS) dwellMs += dt;
      else endDwell(x1, y1);
    }
    endDwell(0, 0);
  }
  return { exposure, drips: dedupeDrips(l, drips) };
}

// Aus einer Stelle läuft nur ein Drip, auch wenn mehrere Knoten dort zu viel abbekommen haben.
function dedupeDrips(l: Lettering, drips: Drip[]): Drip[] {
  const kept: Drip[] = [];
  for (const d of [...drips].sort((a, b) => b.strength - a.strength || a.node - b.node)) {
    const x = l.nodes[d.node * 2]!;
    const y = l.nodes[d.node * 2 + 1]!;
    const near = kept.some(
      (k) => Math.abs(l.nodes[k.node * 2]! - x) < 5 && Math.abs(l.nodes[k.node * 2 + 1]! - y) < 8,
    );
    if (!near) kept.push(d);
  }
  return kept;
}

// Wolke hinter dem Schriftzug: Rechteck mit runden Beulen an den Rändern.
function cloudMask(b: Box, R: () => number): Mask {
  const m = emptyMask();
  const pad = 10;
  for (let y = Math.max(0, b.y0 - pad / 2); y <= Math.min(WORK_H - 1, b.y1 + pad / 2); y++) {
    for (let x = Math.max(0, b.x0 - pad); x <= Math.min(WORK_W - 1, b.x1 + pad); x++) m[y * WORK_W + x] = 1;
  }
  for (let x = b.x0 - pad; x <= b.x1 + pad; x += 11) {
    for (const y of [b.y0 - pad / 2, b.y1 + pad / 2]) stampDisc(m, [x, y], 8 + R() * 8);
  }
  for (const x of [b.x0 - pad, b.x1 + pad]) stampDisc(m, [x, (b.y0 + b.y1) / 2], 12 + R() * 8);
  return m;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const WHITE = 1;
const BLACK = 0;
const DARK_GREY = 11;

function forBox(b: { x0: number; y0: number; x1: number; y1: number }, f: (i: number) => void): void {
  for (let y = b.y0; y <= b.y1; y++) {
    const row = y * WORK_W;
    for (let x = b.x0; x <= b.x1; x++) f(row + x);
  }
}

export function renderLettering(l: Lettering, input: RenderInput): RenderResult {
  const px = new Uint8Array(N).fill(TRANSPARENT);
  const put = (i: number, c: number) => {
    px[i] = c;
  };
  const paint = (m: Mask, color: number) => {
    for (let i = 0; i < N; i++) if (m[i]) put(i, color);
  };
  const passes = input.passes.map((p) => {
    const limit = passTimeLimit(l, input.flow);
    if (input.ideal) {
      return { ...p, exposure: new Float32Array(l.nodeCount).fill(IDEAL_EXPOSURE), drips: [] as Drip[] };
    }
    return { ...p, ...simulateStrokes(l, p.strokes, input.flow, limit) };
  });
  const find = (kind: PassKind) => passes.find((p) => p.kind === kind);
  const stats: PassStats[] = [];

  // Farbe läuft nach unten, bis unter die gesprühte Fläche.
  const drawDrips = (drips: Drip[], painted: Mask, color: number) => {
    for (const d of drips) {
      const x = Math.round(l.nodes[d.node * 2]!);
      let y = Math.round(l.nodes[d.node * 2 + 1]!);
      if (x < 0 || x >= WORK_W) continue;
      while (y + 1 < WORK_H && painted[(y + 1) * WORK_W + x]) y++;
      const len = 3 + Math.min(10, Math.round(d.strength * 2));
      for (let k = 1; k <= len && y + k < WORK_H; k++) put((y + k) * WORK_W + x, color);
      const end = Math.min(WORK_H - 1, y + len);
      if (x + 1 < WORK_W) put(end * WORK_W + x + 1, color);
    }
  };

  if (l.shape === "tag") {
    const pass = find("line");
    const color = input.colors.line ?? BLACK;
    if (pass) {
      const g = l.groups[0]!;
      const body = tagBody(l, pass.width);
      const covered = new Uint8Array(N);
      let total = 0;
      let hit = 0;
      const w = Math.min(4, Math.max(1, pass.width)) - 1;
      if (OVERSPRAY[w]! > 0) {
        const halo = cached(l, `tag-halo:${pass.width}`, () => minus(dilate(body, 3), body));
        for (let i = 0; i < N; i++) {
          const n = g.nearest[i]!;
          if (halo[i] && n >= 0 && pass.exposure[n]! >= 1 && pixelNoise(i, input.seed) < OVERSPRAY[w]!)
            put(i, color);
        }
      }
      for (let i = 0; i < N; i++) {
        if (!body[i]) continue;
        total++;
        const n = g.nearest[i]!;
        if (n >= 0 && pass.exposure[n]! >= NEED[i]!) {
          covered[i] = 1;
          hit++;
          put(i, color);
        }
      }
      drawDrips(pass.drips, covered, color);
      stats.push({
        kind: "line",
        width: pass.width,
        coverage: total ? hit / total : 0,
        drips: pass.drips.length,
        exposure: pass.exposure,
      });
    }
    return { pixels: px, stats };
  }

  // Straight Letter und Bubble: Fill-in, dann Outline, dazu Shadow und Highlights.
  const fill = find("fill");
  const outline = find("outline");
  const fillColors = input.colors.fill?.length ? input.colors.fill : [15];
  const outlineColor = input.colors.outline ?? BLACK;
  const shadowColor = outlineColor === BLACK ? DARK_GREY : BLACK;
  const fadeColor = (i: number): number => {
    if (fillColors.length === 1) return fillColors[0]!;
    const x = i % WORK_W;
    const y = (i / WORK_W) | 0;
    const t =
      Math.max(0, Math.min(1, (y - l.fadeTop) / Math.max(1, l.fadeBottom - l.fadeTop))) *
      (fillColors.length - 1);
    const k = Math.floor(t);
    const thr = (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16;
    return fillColors[Math.min(fillColors.length - 1, t - k > thr ? k + 1 : k)]!;
  };

  const fw = fill ? Math.min(4, Math.max(1, fill.width)) - 1 : 0;
  const ow = outline ? Math.min(4, Math.max(1, outline.width)) - 1 : 0;
  const thickness = OUTLINE_THICKNESS[ow]!;
  const perGroup = l.groups.map((g, gi) => {
    const fillCov = new Uint8Array(N);
    const ringCov = new Uint8Array(N);
    const ring = outline ? ringOf(l, gi, thickness) : null;
    const reach = g.r * REACH[fw]! + 0.5;
    let bodyTotal = 0;
    let bodyHit = 0;
    let ringTotal = 0;
    let ringHit = 0;
    forBox(g.scan, (i) => {
      const n = g.nearest[i]!;
      if (g.body[i]) {
        bodyTotal++;
        if (fill && n >= 0 && fill.exposure[n]! >= NEED[i]! && g.dist[i]! <= reach) {
          fillCov[i] = 1;
          bodyHit++;
        }
      }
      if (ring && ring[i]) {
        ringTotal++;
        if (outline && n >= 0 && outline.exposure[n]! >= NEED[i]!) {
          ringCov[i] = 1;
          ringHit++;
        }
      }
    });
    return { g, gi, fillCov, ringCov, bodyTotal, bodyHit, ringTotal, ringHit };
  });

  // Was schon an der Wand ist – darauf bauen Background, Second Outline, 3D und Shadow auf.
  const outer = new Uint8Array(N);
  for (const p of perGroup)
    forBox(p.g.scan, (i) => {
      if (p.fillCov[i] || p.ringCov[i]) outer[i] = 1;
    });
  const decor = decorFor(l.look);
  const anything = outer.some((v) => v === 1);

  // Background: Wolke hinter dem Schriftzug, mit ein paar Sternen (Bombing, Piece, Wildstyle)
  if (decor.background && input.colors.background !== undefined && anything) {
    const box = bbox(dilate(outer, 2 + decor.depth));
    if (box) {
      const cloud = cached(l, `cloud:${decor.depth}`, () => cloudMask(box, rng(input.seed + 3)));
      paint(minus(dilate(cloud, 1), cloud), BLACK);
      paint(cloud, input.colors.background);
      const R = rng(input.seed + 11);
      for (let k = 0; k < 7; k++) {
        const sx = Math.floor(box.x0 - 12 + R() * (box.x1 - box.x0 + 24));
        const sy = Math.floor(box.y0 - 10 + R() * (box.y1 - box.y0 + 20));
        for (let d = -2; d <= 2; d++) {
          if (sx + d >= 0 && sx + d < WORK_W && sy >= 0 && sy < WORK_H) put(sy * WORK_W + sx + d, WHITE);
          if (sy + d >= 0 && sy + d < WORK_H && sx >= 0 && sx < WORK_W) put((sy + d) * WORK_W + sx, WHITE);
        }
      }
    }
  }

  // Second Outline: heller Rand um alles
  if (decor.second && input.colors.second !== undefined && anything) {
    paint(dilate(outer, 3), BLACK);
    paint(dilate(outer, 2), input.colors.second);
  }

  // 3D-Block oder einfacher Shadow
  if (decor.depth > 0 && anything) {
    let ext: Mask = emptyMask();
    for (let k = 1; k <= decor.depth; k++) ext = union(ext, shift(outer, k, k));
    ext = minus(ext, outer);
    paint(minus(dilate(ext, 1), outer), outlineColor);
    paint(ext, shadowColor);
  } else {
    const off = l.shape === "bubble" ? 3 : 2;
    for (let y = 0; y + off < WORK_H; y++) {
      for (let x = 0; x + off < WORK_W; x++) {
        const i = y * WORK_W + x;
        if (outer[i]) put((y + off) * WORK_W + x + off, shadowColor);
      }
    }
  }

  for (const p of perGroup) {
    const { g, gi } = p;
    // Overspray: NY Fat beim Fill-in, breite Caps bei der Outline
    if (fill && FILL_OVERSPRAY[fw]! > 0) {
      const reach = g.r * REACH[fw]! + 1.5;
      forBox(g.scan, (i) => {
        const n = g.nearest[i]!;
        if (
          !g.body[i] &&
          n >= 0 &&
          g.dist[i]! <= reach &&
          fill.exposure[n]! >= 1 &&
          pixelNoise(i, input.seed + gi) < FILL_OVERSPRAY[fw]!
        )
          put(i, fadeColor(i));
      });
    }
    if (outline && OVERSPRAY[ow]! > 0) {
      const halo = cached(l, `halo:${gi}:${thickness}`, () =>
        minus(dilate(g.body, thickness + 4), dilate(g.body, thickness)),
      );
      forBox(g.scan, (i) => {
        const n = g.nearest[i]!;
        if (
          halo[i] &&
          n >= 0 &&
          outline.exposure[n]! >= 1 &&
          pixelNoise(i, input.seed + 7 + gi) < OVERSPRAY[ow]!
        )
          put(i, outlineColor);
      });
    }
    // Fill-in mit Fade, bei Piece und Wildstyle mit Splits
    const splitColor = input.colors.second ?? WHITE;
    forBox(g.scan, (i) => {
      if (!p.fillCov[i]) return;
      const x = i % WORK_W;
      const y = (i / WORK_W) | 0;
      put(i, decor.splits && (x + y * 2) % 26 < 2 ? splitColor : fadeColor(i));
    });
    // Highlights: Lichtkante oben links im Buchstaben
    const inner = cached(l, `inner:${gi}`, () => erode(g.body, 2));
    const ymax = g.box.y0 + (g.box.y1 - g.box.y0) * 0.45;
    const xmax = g.box.x0 + (g.box.x1 - g.box.x0) * 0.55;
    for (let y = Math.max(1, g.box.y0); y < ymax; y++) {
      for (let x = Math.max(1, g.box.x0); x < xmax; x++) {
        const i = y * WORK_W + x;
        if (inner[i] && p.fillCov[i] && (!inner[i - WORK_W] || !inner[i - 1])) put(i, WHITE);
      }
    }
    // Outline zuletzt – eine fette Outline frisst ins Fill-in
    forBox(g.scan, (i) => {
      if (p.ringCov[i]) put(i, outlineColor);
    });
  }

  const painted = new Uint8Array(N);
  for (const p of perGroup)
    forBox(p.g.scan, (i) => {
      if (p.fillCov[i] || p.ringCov[i]) painted[i] = 1;
    });
  if (fill) drawDrips(fill.drips, painted, fillColors[fillColors.length - 1]!);
  if (outline) drawDrips(outline.drips, painted, outlineColor);

  const sum = (f: (p: (typeof perGroup)[number]) => number) => perGroup.reduce((s, p) => s + f(p), 0);
  if (fill) {
    const total = sum((p) => p.bodyTotal);
    stats.push({
      kind: "fill",
      width: fill.width,
      coverage: total ? sum((p) => p.bodyHit) / total : 0,
      drips: fill.drips.length,
      exposure: fill.exposure,
    });
  }
  if (outline) {
    const total = sum((p) => p.ringTotal);
    stats.push({
      kind: "outline",
      width: outline.width,
      coverage: total ? sum((p) => p.ringHit) / total : 0,
      drips: outline.drips.length,
      exposure: outline.exposure,
    });
  }
  return { pixels: px, stats };
}

// Ideale Caps je Ebene für die Vorschau: Fat fürs Fill-in, Standard für Outline, Skinny für den Tag.
export const PREVIEW_WIDTH: Record<PassKind, number> = { line: 1, fill: 3, outline: 2 };

export function renderPreview(
  name: string,
  look: Look,
  seed: number,
  colors: RenderInput["colors"],
): Uint8Array {
  const l = buildLettering(name, look, seed);
  return renderLettering(l, {
    colors,
    flow: 1,
    ideal: true,
    seed,
    passes: passesFor(look).map((kind) => ({ kind, width: PREVIEW_WIDTH[kind], strokes: [] })),
  }).pixels;
}

// Ein gleichmäßiges Nachfahren aller Führungslinien – für Tests und die Demo.
export function traceGuide(l: Lettering, speed: number, stepMs = 16): Stroke[] {
  const strokes: Stroke[] = [];
  let t = 0;
  for (const g of l.groups) {
    for (const st of g.strokes) {
      const s: Stroke = [];
      for (let i = 0; i < st.length; i++) {
        const [x, y] = st[i]!;
        if (i === 0) {
          s.push(x, y, t);
          continue;
        }
        const [px, py] = st[i - 1]!;
        const len = Math.hypot(x - px, y - py);
        const steps = Math.max(1, Math.ceil(len / ((speed * stepMs) / 1000)));
        for (let k = 1; k <= steps; k++) {
          t += (len / steps / speed) * 1000;
          s.push(px + ((x - px) * k) / steps, py + ((y - py) * k) / steps, Math.round(t));
        }
      }
      strokes.push(s);
      t += 150; // Finger absetzen
    }
  }
  return strokes;
}
