// Aus dem Writer-Namen wird ein Schriftzug: Führungslinien (Skelett), Buchstabenkörper und
// für jeden Pixel der nächste Punkt der Führungslinie. Daraus rechnen Simulation und Bild.
import { chaikin, glyph, letteringChars } from "./glyphs";
import {
  N,
  WORK_H,
  WORK_W,
  bbox,
  dilate,
  emptyMask,
  erode,
  minus,
  rng,
  stampDisc,
  stampPolygon,
  stampPolyline,
  type Box,
  type Mask,
  type Pt,
} from "./raster";

export const LOOKS = ["tag", "straight", "bubble", "bombing", "piece", "wildstyle"] as const;
export type Look = (typeof LOOKS)[number];
export const PASS_KINDS = ["line", "fill", "outline"] as const;
export type PassKind = (typeof PASS_KINDS)[number];

// Ebenen je Style, in der Reihenfolge, in der gesprüht wird.
export function passesFor(look: Look): PassKind[] {
  return look === "tag" ? ["line"] : ["fill", "outline"];
}

export type Shape = "tag" | "straight" | "bubble" | "bomb" | "piece" | "wild";

function shapeOf(look: Look): Shape {
  if (look === "bombing") return "bomb";
  if (look === "wildstyle") return "wild";
  if (look === "piece") return "piece";
  return look;
}

// Was zu einem Style automatisch dazugehört (M4a): Background, 3D-Tiefe, Second Outline, Splits.
export type Decor = { background: boolean; depth: number; second: boolean; splits: boolean };
const DECOR: Record<Shape, Decor> = {
  tag: { background: false, depth: 0, second: false, splits: false },
  straight: { background: false, depth: 0, second: false, splits: false },
  bubble: { background: false, depth: 0, second: false, splits: false },
  bomb: { background: true, depth: 3, second: false, splits: false },
  piece: { background: true, depth: 4, second: true, splits: true },
  wild: { background: true, depth: 4, second: true, splits: true },
};
export function decorFor(look: Look): Decor {
  return DECOR[shapeOf(look)];
}

// Kantige Styles: Buchstaben mit Schräge, dazu Arrows an den Enden, Spitzen an Ecken und
// bei Wildstyle Connections zwischen den Buchstaben. Arrows und Spitzen gehören zur
// Führungslinie, damit man sie mit nachfährt und der Cap sie erreicht.
const XSTYLE: Record<
  "bomb" | "piece" | "wild",
  {
    lw: number;
    adv: number;
    xs: number;
    slant: number;
    rot: number;
    bounce: number;
    arrows: number;
    spikes: number;
    conn: boolean;
    bevel: number;
  }
> = {
  bomb: {
    lw: 2.3,
    adv: 6.0,
    xs: 1.2,
    slant: 0.16,
    rot: 0.06,
    bounce: 0.3,
    arrows: 0,
    spikes: 0,
    conn: false,
    bevel: 1,
  },
  piece: {
    lw: 1.9,
    adv: 5.7,
    xs: 1.15,
    slant: 0.2,
    rot: 0.08,
    bounce: 0.4,
    arrows: 0.45,
    spikes: 0.2,
    conn: false,
    bevel: 0,
  },
  wild: {
    lw: 1.5,
    adv: 5.0,
    xs: 1.1,
    slant: 0.26,
    rot: 0.2,
    bounce: 0.8,
    arrows: 0.8,
    spikes: 0.45,
    conn: true,
    bevel: 0,
  },
};

// Strichstärke eines Tags je Cap-Breite (1 Skinny … 4 NY Fat), als halber Durchmesser in Pixeln.
export const TAG_RADIUS = [0.8, 1.15, 1.9, 2.7] as const;

export type Group = {
  strokes: Pt[][];
  discs: [number, number, number][];
  r: number; // halbe Strichbreite des Körpers
  nodeStart: number;
  nodeEnd: number;
  body: Mask;
  nearest: Int32Array; // nächster Knoten der Führungslinie je Pixel (-1 = zu weit weg)
  dist: Float32Array; // Abstand zu diesem Knoten
  box: Box;
  scan: Box; // Bereich, in dem überhaupt etwas passieren kann (Körper plus Reichweite)
};

export type Lettering = {
  look: Look;
  shape: Shape;
  chars: string[];
  groups: Group[];
  nodes: Float32Array; // x, y je Knoten
  nodeCount: number;
  guideLength: number; // Länge aller Führungslinien in Pixeln
  fadeTop: number;
  fadeBottom: number;
  cache: Map<string, Mask>;
  grid: Map<number, number[]>;
};

const NODE_SPACING = 2;
const GRID = 8;

type RawGroup = { strokes: Pt[][]; discs: [number, number, number][]; polys: Pt[][]; r: number };

function layoutTag(chars: string[], R: () => number): RawGroup[] {
  const n = chars.length;
  const u = Math.min(5, 260 / (n * 4.4));
  const adv = 4.4 * u;
  const slant = 0.38;
  const totalW = (n - 1) * adv + 4 * u + 6 * u * slant;
  const x0 = (WORK_W - totalW) / 2;
  const yTop = (WORK_H - 6 * u) / 2 - 8;
  const strokes: Pt[][] = [];
  chars.forEach((ch, i) => {
    const dy = (R() - 0.5) * u;
    const cx = x0 + i * adv + 2 * u + 3 * u * slant;
    const cy = yTop + 3 * u + dy;
    for (const st of glyph(ch)!) {
      strokes.push(
        st.map(([gx, gy]) => {
          const px = (gx - 2) * u;
          const py = (gy - 3) * u;
          return [cx + px - py * slant + (R() - 0.5) * 0.7 * u, cy + py + (R() - 0.5) * 0.7 * u];
        }),
      );
    }
  });
  // Schwung unter dem Tag
  const by = yTop + 6 * u + 5;
  const a: Pt = [x0 - 4, by + 2];
  const c: Pt = [x0 + totalW * 0.5, by + 7];
  const b: Pt = [x0 + totalW + 6, by - 4];
  const swoosh: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    swoosh.push([
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
    ]);
  }
  strokes.push(swoosh);
  return [{ strokes, discs: [], polys: [], r: TAG_RADIUS[3] }];
}

function layoutStraight(chars: string[], R: () => number): RawGroup[] {
  const n = chars.length;
  const u = Math.min(7, 280 / (n * 6 + 2));
  const adv = 6 * u;
  const totalW = (n - 1) * adv + 4 * u;
  const x0 = (WORK_W - totalW) / 2;
  const yTop = (WORK_H - 6 * u) / 2 - 6;
  const strokes: Pt[][] = [];
  chars.forEach((ch, i) => {
    const dy = (R() - 0.5) * 1.2 * u;
    const rot = (R() - 0.5) * 0.2;
    const cx = x0 + i * adv + 2 * u;
    const cy = yTop + 3 * u + dy;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    for (const st of glyph(ch)!) {
      strokes.push(
        st.map(([gx, gy]) => {
          const px = (gx - 2) * u;
          const py = (gy - 3) * u;
          return [cx + px * cs - py * sn, cy + px * sn + py * cs];
        }),
      );
    }
  });
  return [{ strokes, discs: [], polys: [], r: 0.95 * u }];
}

function layoutBubble(chars: string[], R: () => number): RawGroup[] {
  const n = chars.length;
  const u = Math.min(8, 286 / (n * 4.7 + 3));
  const adv = 4.7 * u;
  const totalW = (n - 1) * adv + 3.6 * u;
  const x0 = (WORK_W - totalW) / 2;
  const cyBase = WORK_H / 2 - 4;
  return chars.map((ch, i) => {
    const dy = (i % 2 ? 1 : -1) * 0.45 * u + (R() - 0.5) * 0.5 * u;
    const rot = (R() - 0.5) * 0.26;
    const sc = 0.9 + R() * 0.2;
    const cx = x0 + i * adv + 1.8 * u;
    const cy = cyBase + dy;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    const r = 1.3 * u * sc;
    const strokes: Pt[][] = [];
    const discs: [number, number, number][] = [];
    for (const st of glyph(ch, true)!) {
      const pts = chaikin(
        st.map(([gx, gy]): Pt => {
          const px = (gx - 2) * 0.9 * u * sc;
          const py = (gy - 3) * u * sc;
          return [cx + px * cs - py * sn, cy + px * sn + py * cs];
        }),
        3,
      );
      strokes.push(pts);
      const a = pts[0]!;
      const b = pts[pts.length - 1]!;
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1) {
        discs.push([a[0], a[1], 1.2 * r], [b[0], b[1], 1.2 * r]);
      }
    }
    return { strokes, discs, polys: [], r };
  });
}

function layoutX(chars: string[], shape: "bomb" | "piece" | "wild", R: () => number): RawGroup[] {
  const P = XSTYLE[shape];
  const n = chars.length;
  const u = Math.min(7, 250 / (n * P.adv + 3));
  const lw = P.lw * u;
  const r = lw / 2;
  const adv = P.adv * u;
  const totalW = (n - 1) * adv + 4 * u * P.xs;
  const x0 = (WORK_W - totalW) / 2;
  const yMid = WORK_H / 2 - 6;
  const strokes: Pt[][] = [];
  const polys: Pt[][] = [];
  const ends: [Pt, Pt][] = [];

  chars.forEach((ch, i) => {
    const dy = (R() - 0.5) * 2 * P.bounce * u;
    const rot = (R() - 0.5) * 2 * P.rot;
    const cx = x0 + i * adv + 2 * u * P.xs;
    const cy = yMid + dy;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    const tf = ([gx, gy]: Pt): Pt => {
      const py = (gy - 3) * u;
      const px = (gx - 2) * u * P.xs - py * P.slant;
      return [cx + px * cs - py * sn, cy + px * sn + py * cs];
    };
    for (const st of glyph(ch)!) {
      const pts = P.bevel ? chaikin(st.map(tf), P.bevel) : st.map(tf);
      const closed =
        Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 1;
      // Arrows an offenen Enden: Spitze als Polygon, Mittellinie verlängert die Führungslinie.
      const withArrows = [...pts];
      if (!closed) {
        for (const [inner, tip, atStart] of [
          [pts[1], pts[0], true],
          [pts[pts.length - 2], pts[pts.length - 1], false],
        ] as [Pt | undefined, Pt, boolean][]) {
          if (!inner || R() > P.arrows) continue;
          const dx = tip[0] - inner[0];
          const dy2 = tip[1] - inner[1];
          const len = Math.hypot(dx, dy2) || 1;
          const ux = dx / len;
          const uy = dy2 / len;
          const w = 1.25 * r;
          const reach = 1.7 * r;
          const end: Pt = [tip[0] + ux * reach, tip[1] + uy * reach];
          polys.push([
            end,
            [tip[0] - uy * w + ux * 0.2 * r, tip[1] + ux * w + uy * 0.2 * r],
            [tip[0] + uy * w + ux * 0.2 * r, tip[1] - ux * w + uy * 0.2 * r],
          ]);
          const guideTip: Pt = [tip[0] + ux * reach * 0.6, tip[1] + uy * reach * 0.6];
          if (atStart) withArrows.unshift(guideTip);
          else withArrows.push(guideTip);
        }
      }
      strokes.push(withArrows);
      // Spitzen an Ecken
      for (let k = 1; k < pts.length - 1; k++) {
        if (R() > P.spikes) continue;
        const [px, py] = pts[k]!;
        const [ax, ay] = pts[k - 1]!;
        const [bx, by] = pts[k + 1]!;
        const la = Math.hypot(px - ax, py - ay) || 1;
        const lb = Math.hypot(px - bx, py - by) || 1;
        let ox = (px - ax) / la + (px - bx) / lb;
        let oy = (py - ay) / la + (py - by) / lb;
        const lo = Math.hypot(ox, oy);
        if (lo < 0.3) continue;
        ox /= lo;
        oy /= lo;
        const w = 0.7 * r;
        const tip = 1.6 * r;
        polys.push([
          [px + ox * tip, py + oy * tip],
          [px - oy * w, py + ox * w],
          [px + oy * w, py - ox * w],
        ]);
      }
    }
    ends.push([tf([4, 2.2]), tf([0, 4])]);
  });

  // Connections: Bögen zwischen den Buchstaben
  if (P.conn) {
    for (let i = 0; i < ends.length - 1; i++) {
      const a = ends[i]![0];
      const b = ends[i + 1]![1];
      const c: Pt = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 1.5 * u];
      const curve: Pt[] = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        curve.push([
          (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
          (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
        ]);
      }
      strokes.push(curve);
    }
  }
  return [{ strokes, discs: [], polys, r }];
}

// Punkte entlang der Linien, höchstens NODE_SPACING auseinander.
function sampleNodes(strokes: Pt[][]): Pt[] {
  const out: Pt[] = [];
  for (const st of strokes) {
    if (st.length === 1) out.push(st[0]!);
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i]!;
      const b = st[i + 1]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.ceil(len / NODE_SPACING));
      for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
        const t = s / steps;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
  }
  return out;
}

function strokeLength(strokes: Pt[][]): number {
  let sum = 0;
  for (const st of strokes)
    for (let i = 0; i < st.length - 1; i++)
      sum += Math.hypot(st[i + 1]![0] - st[i]![0], st[i + 1]![1] - st[i]![1]);
  return sum;
}

const memo = new Map<string, Lettering>();

// Baut den Schriftzug. Gleicher Name, Style und Saat ergeben immer denselben Schriftzug.
export function buildLettering(name: string, look: Look, seed: number): Lettering {
  const key = `${name}|${look}|${seed}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const chars = letteringChars(name);
  const shape = shapeOf(look);
  const R = rng(seed);
  const raw =
    shape === "tag"
      ? layoutTag(chars, R)
      : shape === "bubble"
        ? layoutBubble(chars, R)
        : shape === "straight"
          ? layoutStraight(chars, R)
          : layoutX(chars, shape, R);

  const allNodes: Pt[] = [];
  const groups: Group[] = raw.map((g) => {
    const nodes = sampleNodes(g.strokes);
    const nodeStart = allNodes.length;
    allNodes.push(...nodes);
    const body = emptyMask();
    const bodyR = shape === "tag" ? TAG_RADIUS[0] : g.r;
    for (const st of g.strokes) stampPolyline(body, st, bodyR);
    for (const [x, y, r] of g.discs) stampDisc(body, [x, y], r);
    for (const poly of g.polys) stampPolygon(body, poly);

    // Nächster Knoten je Pixel – bis zur größten Reichweite plus Overspray-Rand.
    const nearest = new Int32Array(N).fill(-1);
    const dist = new Float32Array(N).fill(Infinity);
    const reachMax = g.r * 1.8 + 10;
    nodes.forEach(([nx, ny], k) => {
      const x0 = Math.max(0, Math.floor(nx - reachMax));
      const x1 = Math.min(WORK_W - 1, Math.ceil(nx + reachMax));
      const y0 = Math.max(0, Math.floor(ny - reachMax));
      const y1 = Math.min(WORK_H - 1, Math.ceil(ny + reachMax));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x + 0.5 - nx, y + 0.5 - ny);
          const i = y * WORK_W + x;
          if (d <= reachMax && d < dist[i]!) {
            dist[i] = d;
            nearest[i] = nodeStart + k;
          }
        }
      }
    });
    const box = bbox(body) ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
    const margin = Math.ceil(reachMax) + 2;
    return {
      strokes: g.strokes,
      discs: g.discs,
      r: g.r,
      nodeStart,
      nodeEnd: allNodes.length,
      body,
      nearest,
      dist,
      box,
      scan: {
        x0: Math.max(0, box.x0 - margin),
        y0: Math.max(0, box.y0 - margin),
        x1: Math.min(WORK_W - 1, box.x1 + margin),
        y1: Math.min(WORK_H - 1, box.y1 + margin),
      },
    };
  });

  const nodes = new Float32Array(allNodes.length * 2);
  const grid = new Map<number, number[]>();
  allNodes.forEach(([x, y], k) => {
    nodes[k * 2] = x;
    nodes[k * 2 + 1] = y;
    const cell = Math.floor(x / GRID) + Math.floor(y / GRID) * 64;
    const list = grid.get(cell);
    if (list) list.push(k);
    else grid.set(cell, [k]);
  });

  const fadeTop = Math.min(...groups.map((g) => g.box.y0));
  const fadeBottom = Math.max(...groups.map((g) => g.box.y1));
  const lettering: Lettering = {
    look,
    shape,
    chars,
    groups,
    nodes,
    nodeCount: allNodes.length,
    guideLength: groups.reduce((sum, g) => sum + strokeLength(g.strokes), 0),
    fadeTop,
    fadeBottom,
    cache: new Map(),
    grid,
  };
  memo.set(key, lettering);
  if (memo.size > 24) memo.delete(memo.keys().next().value!);
  return lettering;
}

// Knoten in der Nähe eines Punktes (für die Simulation).
export function nodesNear(l: Lettering, x: number, y: number, radius: number): number[] {
  const out: number[] = [];
  const cx0 = Math.floor((x - radius) / GRID);
  const cx1 = Math.floor((x + radius) / GRID);
  const cy0 = Math.floor((y - radius) / GRID);
  const cy1 = Math.floor((y + radius) / GRID);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      for (const k of l.grid.get(cx + cy * 64) ?? []) {
        const dx = l.nodes[k * 2]! - x;
        const dy = l.nodes[k * 2 + 1]! - y;
        if (dx * dx + dy * dy <= radius * radius) out.push(k);
      }
    }
  }
  return out;
}

// Masken, die mehrfach gebraucht werden, nur einmal rechnen.
export function cached(l: Lettering, key: string, make: () => Mask): Mask {
  let m = l.cache.get(key);
  if (!m) {
    m = make();
    l.cache.set(key, m);
  }
  return m;
}

export function tagBody(l: Lettering, width: number): Mask {
  return cached(l, `tag:${width}`, () => {
    const m = emptyMask();
    const r = TAG_RADIUS[Math.min(4, Math.max(1, width)) - 1]!;
    for (const st of l.groups[0]!.strokes) stampPolyline(m, st, r);
    return m;
  });
}

// Outline als Ring um den Körper. Ab Fat Cap frisst sie nach innen ins Fill-in.
export function ringOf(l: Lettering, g: number, thickness: number): Mask {
  return cached(l, `ring:${g}:${thickness}`, () => {
    const body = l.groups[g]!.body;
    return minus(dilate(body, thickness), erode(body, Math.max(0, thickness - 2)));
  });
}
