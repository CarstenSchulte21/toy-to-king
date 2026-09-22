// Zeichnet Wände und Werke (Palettenindex aus der Engine) in ein Canvas.
import { PALETTE, TRANSPARENT, WORK_H, WORK_W } from "@/engine";

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

// Wand je Spot-Typ – reine Deko, deshalb in der Oberfläche statt in der Engine.
export function paintWall(buf: Uint8ClampedArray, type: string, seed = 1): void {
  const R = rng(seed);
  const put = (x: number, y: number, c: RGB) => {
    const i = (y * WORK_W + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  for (let y = 0; y < WORK_H; y++) {
    for (let x = 0; x < WORK_W; x++) {
      const n = R();
      let c: RGB;
      if (type === "rolltor") {
        const band = y % 7;
        c = band === 0 ? C.light_grey! : band === 6 ? C.dark_grey! : C.grey!;
        if (y > WORK_H - 10) c = y === WORK_H - 10 ? C.light_grey! : C.dark_grey!;
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
      } else {
        // Beton (Hall, Brücke)
        c = type === "heaven_spot" ? C.dark_grey! : C.grey!;
        if (n < 0.015) c = type === "heaven_spot" ? C.black! : C.dark_grey!;
        else if (n > 0.99) c = C.light_grey!;
        if (x % 80 === 79) c = C.dark_grey!;
        if (y > WORK_H - 8) c = C.dark_grey!;
      }
      put(x, y, c);
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
