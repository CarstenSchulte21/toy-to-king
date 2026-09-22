// Eigene kleine Rasterung ohne Canvas: Masken sind Uint8Arrays in Werkgröße (1 = Pixel gesetzt).
// Ein Pixel gilt als getroffen, wenn sein Mittelpunkt in der Form liegt.
export const WORK_W = 320;
export const WORK_H = 180;
export const N = WORK_W * WORK_H;

export type Mask = Uint8Array;
export type Pt = [number, number];

export const emptyMask = (): Mask => new Uint8Array(N);

function clampBox(x0: number, y0: number, x1: number, y1: number) {
  return {
    x0: Math.max(0, Math.floor(x0)),
    y0: Math.max(0, Math.floor(y0)),
    x1: Math.min(WORK_W - 1, Math.ceil(x1)),
    y1: Math.min(WORK_H - 1, Math.ceil(y1)),
  };
}

// Abstand eines Punktes zu einer Strecke.
export function distToSegment(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - a[0]) * dx + (py - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - px;
  const y = a[1] + t * dy - py;
  return Math.sqrt(x * x + y * y);
}

// Strich mit runden Enden (Kapsel) in die Maske setzen.
export function stampCapsule(m: Mask, a: Pt, b: Pt, r: number): void {
  const box = clampBox(
    Math.min(a[0], b[0]) - r - 1,
    Math.min(a[1], b[1]) - r - 1,
    Math.max(a[0], b[0]) + r + 1,
    Math.max(a[1], b[1]) + r + 1,
  );
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (distToSegment(x + 0.5, y + 0.5, a, b) <= r) m[y * WORK_W + x] = 1;
    }
  }
}

export function stampDisc(m: Mask, c: Pt, r: number): void {
  stampCapsule(m, c, c, r);
}

export function stampPolyline(m: Mask, pts: Pt[], r: number): void {
  if (pts.length === 1) stampDisc(m, pts[0]!, r);
  for (let i = 0; i < pts.length - 1; i++) stampCapsule(m, pts[i]!, pts[i + 1]!, r);
}

// Kreisförmiges Wachsen um r Pixel.
export function dilate(m: Mask, r: number): Mask {
  if (r <= 0) return m.slice();
  const out = emptyMask();
  const offs: Pt[] = [];
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r * 0.6) offs.push([dx, dy]);
  for (let y = 0; y < WORK_H; y++) {
    for (let x = 0; x < WORK_W; x++) {
      if (!m[y * WORK_W + x]) continue;
      for (const [dx, dy] of offs) {
        const X = x + dx;
        const Y = y + dy;
        if (X >= 0 && Y >= 0 && X < WORK_W && Y < WORK_H) out[Y * WORK_W + X] = 1;
      }
    }
  }
  return out;
}

export function invert(m: Mask): Mask {
  const out = emptyMask();
  for (let i = 0; i < N; i++) out[i] = m[i] ? 0 : 1;
  return out;
}

export function erode(m: Mask, r: number): Mask {
  if (r <= 0) return m.slice();
  return minus(m, dilate(invert(m), r));
}

export function minus(a: Mask, b: Mask): Mask {
  const out = emptyMask();
  for (let i = 0; i < N; i++) out[i] = a[i] && !b[i] ? 1 : 0;
  return out;
}

export function union(a: Mask, b: Mask): Mask {
  const out = emptyMask();
  for (let i = 0; i < N; i++) out[i] = a[i] || b[i] ? 1 : 0;
  return out;
}

export function shift(m: Mask, sx: number, sy: number): Mask {
  const out = emptyMask();
  for (let y = 0; y < WORK_H; y++) {
    for (let x = 0; x < WORK_W; x++) {
      if (!m[y * WORK_W + x]) continue;
      const X = x + sx;
      const Y = y + sy;
      if (X >= 0 && Y >= 0 && X < WORK_W && Y < WORK_H) out[Y * WORK_W + X] = 1;
    }
  }
  return out;
}

export function count(m: Mask): number {
  let c = 0;
  for (let i = 0; i < N; i++) c += m[i]!;
  return c;
}

export type Box = { x0: number; y0: number; x1: number; y1: number };

export function bbox(m: Mask): Box | null {
  let x0 = WORK_W;
  let y0 = WORK_H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < WORK_H; y++) {
    for (let x = 0; x < WORK_W; x++) {
      if (!m[y * WORK_W + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

// Deterministischer Zufall (xorshift) – gleiche Saat, gleiches Bild.
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// Zufallswert je Pixel, ohne Reihenfolge-Abhängigkeit (für Overspray).
export function pixelNoise(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
