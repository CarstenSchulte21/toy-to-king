// Zeichnet Wände und Werke (Palettenindex aus der Engine) in ein Canvas.
import { PALETTE, TRANSPARENT, WORK_H, WORK_W, type Frame } from "@/engine";

type RGB = readonly [number, number, number];
const C = Object.fromEntries(PALETTE.map((p) => [p.key, p.rgb])) as Record<string, RGB>;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// Was neben der bemalbaren Fläche liegt: der Hof, die Straße, das Gleis. Absichtlich flau –
// es soll klar sein, dass dort nichts hingehört.
function backdrop(type: string, x: number, y: number, n: number, f: Rect): RGB {
  if (type === "tonne") {
    // Links und rechts stehen die anderen beiden Tonnen. Du taggst die mittlere.
    const gap = Math.round(f.w * 0.12);
    const near = x > f.x - f.w - gap && x < f.x + f.w + gap + f.w;
    const body = near && y > f.y + 6 && y < f.y + f.h;
    if (body) return x % 22 < 3 ? C.black! : C.dark_grey!;
    return n < 0.03 ? C.dark_grey! : C.black!;
  }
  if (type === "mast") {
    // Nachtstraße hinter dem Mast: dunkel, unten der Gehweg.
    if (y > WORK_H - 24) return y % 9 < 2 ? C.dark_grey! : C.grey!;
    return n < 0.02 ? C.dark_grey! : C.black!;
  }
  return n < 0.03 ? C.dark_grey! : C.black!;
}

type Rect = { x: number; y: number; w: number; h: number };

// Wand je Spot-Typ – reine Deko, deshalb in der Oberfläche statt in der Engine.
// Mit `frame` füllt der Untergrund nur diesen Ausschnitt: eine Tonne ist keine Wand.
export function paintWall(buf: Uint8ClampedArray, type: string, seed = 1, frame?: Frame): void {
  const R = rng(seed);
  const f: Rect = frame ?? { x: 0, y: 0, w: WORK_W, h: WORK_H };
  const put = (x: number, y: number, c: RGB) => {
    const i = (y * WORK_W + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  for (let py = 0; py < WORK_H; py++) {
    for (let px = 0; px < WORK_W; px++) {
      const n = R();
      if (px < f.x || py < f.y || px >= f.x + f.w || py >= f.y + f.h) {
        put(px, py, backdrop(type, px, py, n, f));
        continue;
      }
      // Ab hier in Koordinaten der bemalbaren Fläche.
      const x = px - f.x;
      const y = py - f.y;
      const w = f.w;
      const h = f.h;
      let c: RGB;
      if (type === "rolltor") {
        const band = y % 7;
        c = band === 0 ? C.light_grey! : band === 6 ? C.dark_grey! : C.grey!;
        if (y > h - 10) c = y === h - 10 ? C.light_grey! : C.dark_grey!;
        if (n < 0.008) c = C.dark_grey!;
      } else if (type === "hauswand") {
        const row = Math.floor(y / 7);
        const off = row % 2 ? 8 : 0;
        const mortar = y % 7 === 6 || (x + off) % 16 === 15;
        c = mortar ? C.grey! : (Math.floor((x + off) / 16) + row) % 7 === 0 ? C.red! : C.brown!;
        if (!mortar && n < 0.02) c = C.red!;
      } else if (type === "zug") {
        // Waggon: Blechfelder mit Nieten, unten das Fahrwerk
        c = C.light_grey!;
        if (x % 64 === 0 || y === 20 || y === 150) c = C.grey!;
        if ((x % 64 === 4 || x % 64 === 60) && y % 12 === 6) c = C.dark_grey!;
        if (y > 150) c = y % 8 < 2 ? C.grey! : C.black!;
        if (n < 0.01) c = C.grey!;
      } else if (type === "mast") {
        // Laternenmast: rundes Metall, in der Mitte hell, an den Rändern dunkel.
        const t = Math.abs(x - w / 2) / (w / 2);
        c = t < 0.25 ? C.light_grey! : t < 0.6 ? C.grey! : C.dark_grey!;
        if (n < 0.01) c = C.dark_grey!;
        // Aufkleberreste: abgerissene Kanten, keine sauberen Rechtecke
        const sx = x % 96;
        const sy = y % 110;
        if (sy > 28 && sy < 58 && sx > 18 && sx < 58 && (sx + sy) % 7 !== 0) {
          c = n < 0.35 ? C.white! : n < 0.8 ? C.light_grey! : C.grey!;
        }
        if (y > h - 14) c = C.dark_grey!;
      } else if (type === "kasten") {
        // Stromkasten: lackiertes Blech mit Kante und Schrauben.
        c = C.light_grey!;
        if (x < 6 || x > w - 7 || y < 6 || y > h - 7) c = C.grey!;
        if (y === 8 || y === h - 9) c = C.white!;
        if ((x - 14) % 140 < 3 && (y - 14) % 130 < 3) c = C.dark_grey!;
        if (n < 0.012) c = C.grey!;
      } else if (type === "blech") {
        // Waggontür: lackiert, eine senkrechte Fuge, unten Dreck.
        c = C.grey!;
        if (Math.abs(x - w / 2) < 2) c = C.dark_grey!;
        if (y < 10 || y > h - 12) c = C.dark_grey!;
        if (n < 0.02) c = y > h - 40 ? C.brown! : C.light_grey!;
      } else if (type === "tonne") {
        // Mülltonne: Kunststoff mit senkrechten Rippen, oben der Deckel.
        const rib = Math.max(3, Math.round(w / 9));
        c = x % rib < Math.max(1, rib / 6) ? C.dark_grey! : C.green!;
        if (n < 0.02) c = C.light_green!;
        const lid = Math.max(6, Math.round(h * 0.09));
        if (y < lid) c = C.dark_grey!;
        if (y === lid) c = C.black!;
        if (y > h - Math.max(4, h * 0.05)) c = C.black!;
        if (x < 2 || x > w - 3) c = C.black!;
      } else {
        // Beton (Hall, Brücke)
        c = type === "heaven_spot" ? C.dark_grey! : C.grey!;
        if (n < 0.015) c = type === "heaven_spot" ? C.black! : C.dark_grey!;
        else if (n > 0.99) c = C.light_grey!;
        if (x % 80 === 79) c = C.dark_grey!;
        if (y > h - 8) c = C.dark_grey!;
      }
      put(px, py, c);
    }
  }
}

export function paintWork(buf: Uint8ClampedArray, pixels: Uint8Array): void {
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i]!;
    if (v === TRANSPARENT) continue;
    const c = PALETTE[v]!.rgb;
    buf[i * 4] = c[0];
    buf[i * 4 + 1] = c[1];
    buf[i * 4 + 2] = c[2];
    buf[i * 4 + 3] = 255;
  }
}

export function rgbCss(index: number): string {
  const c = PALETTE[index]?.rgb ?? [0, 0, 0];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function toCanvas(canvas: HTMLCanvasElement, buf: Uint8ClampedArray): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.putImageData(new ImageData(buf as Uint8ClampedArray<ArrayBuffer>, WORK_W, WORK_H), 0, 0);
}
