// Kontrollbild für die Marker-Spots: links der Sprüh-Bildschirm, rechts das Werk so groß,
// wie es im Raum sitzt. Nur zum Hinsehen – gehört nicht zum Spiel.
import { readFileSync, writeFileSync } from "node:fs";
import { PALETTE, TRANSPARENT, WORK_H, WORK_W, frameOf, renderWork, type GameContent } from "../src/engine";
import { paintWall } from "../src/ui/paint";
import { drawRoom } from "./lib/rooms-art";
import { encodePng } from "./lib/png";

const content = JSON.parse(readFileSync("src/generated/content.json", "utf8")) as GameContent;
const NAME = "RUBIX";

const spots = Object.values(content.spots).filter((s) => s.tool === "marker");
const COLS = spots.length;
const CELL_W = WORK_W;
const CELL_H = WORK_H;
const W = COLS * (CELL_W + 4);
const H = CELL_H + 4 + 120;
const img = new Uint8Array(W * H).fill(0);

const put = (x: number, y: number, v: number) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  img[y * W + x] = v;
};

spots.forEach((spot, col) => {
  const ox = col * (CELL_W + 4) + 2;
  const frame = frameOf(spot);
  const work = {
    style: "tag",
    colors: { fill: ["farbe_schwarz"], outline: "farbe_schwarz" },
    dose: "t_tip",
    seed: 3,
    ideal: true as const,
    passes: [{ kind: "line" as const, cap: "t_tip", strokes: [] }],
  };
  const res = renderWork(content, NAME, work, frame);
  if (!res) return;

  // Links: die ganze Arbeitsfläche, Untergrund wie im Sprüh-Bildschirm.
  const wall = new Uint8ClampedArray(WORK_W * WORK_H * 4);
  paintWall(wall, spot.surface ?? spot.type, 7, frame);
  const near = (r: number, g: number, b: number) => {
    let best = 0;
    let bd = Infinity;
    PALETTE.forEach((p, i) => {
      const d = (p.rgb[0] - r) ** 2 + (p.rgb[1] - g) ** 2 + (p.rgb[2] - b) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  for (let y = 0; y < WORK_H; y++) {
    for (let x = 0; x < WORK_W; x++) {
      const i = y * WORK_W + x;
      const v = res.pixels[i]!;
      put(ox + x, 2 + y, v === TRANSPARENT ? near(wall[i * 4]!, wall[i * 4 + 1]!, wall[i * 4 + 2]!) : v);
    }
  }
  if (frame) {
    for (let x = 0; x < frame.w; x++) {
      put(ox + frame.x + x, 2 + frame.y, 1);
      put(ox + frame.x + x, 2 + frame.y + frame.h - 1, 1);
    }
    for (let y = 0; y < frame.h; y++) {
      put(ox + frame.x, 2 + y + frame.y, 1);
      put(ox + frame.x + frame.w - 1, 2 + y + frame.y, 1);
    }
  }

  // Rechts unten: das Werk auf die Größe im Raum gerechnet.
  let x0 = WORK_W;
  let y0 = WORK_H;
  let x1 = -1;
  let y1 = -1;
  res.pixels.forEach((v, i) => {
    if (v === TRANSPARENT) return;
    const x = i % WORK_W;
    const y = (i / WORK_W) | 0;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  const place = spot.place;
  if (x1 < 0 || !place) return;
  const iw = x1 - x0 + 1;
  const ih = y1 - y0 + 1;
  const s = Math.min(place[2] / iw, place[3] / ih);
  const dw = Math.max(1, Math.round(iw * s));
  const dh = Math.max(1, Math.round(ih * s));
  const bx = ox + 6;
  const by = CELL_H + 20;
  for (let y = 0; y < place[3]; y++) for (let x = 0; x < place[2]; x++) put(bx + x, by + y, 12);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const v = res.pixels[(y0 + Math.floor((y / dh) * ih)) * WORK_W + x0 + Math.floor((x / dw) * iw)]!;
      if (v !== TRANSPARENT) put(bx + x, by + y, v);
    }
  }
  console.log(
    `${spot.id.padEnd(14)} Tinte ${String(iw).padStart(3)}×${String(ih).padStart(3)} → im Raum ${dw}×${dh} auf ${place[2]}×${place[3]}`,
  );
});

const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < img.length; i++) {
  const c = PALETTE[img[i]!]!.rgb;
  rgba[i * 4] = c[0];
  rgba[i * 4 + 1] = c[1];
  rgba[i * 4 + 2] = c[2];
  rgba[i * 4 + 3] = 255;
}
writeFileSync("/mnt/user-data/outputs/spot-check.png", encodePng(rgba, W, H));
console.log("spot-check.png geschrieben");

const ROOMS = ["hinterhof", "strasse", "abstellgleis", "unterfuehrung"];
const ZOOM = 3;

const RW = 320 * ZOOM;
const RH = 180 * ZOOM * ROOMS.length;
const out = new Uint8Array(RW * RH * 4);

ROOMS.forEach((roomId, row) => {
  const art = drawRoom(roomId, 7);
  if (!art) return;
  const px = new Uint8Array(320 * 180);
  for (let i = 0; i < px.length; i++) px[i] = art[i]!;

  for (const spot of Object.values(content.spots)) {
    if (spot.room !== roomId || !spot.place) continue;
    const res = renderWork(
      content,
      NAME,
      {
        style: "tag",
        colors: { fill: ["farbe_schwarz"], outline: "farbe_schwarz" },
        dose: "t_tip",
        seed: 3,
        ideal: true,
        passes: [{ kind: "line", cap: "t_tip", strokes: [] }],
      },
      frameOf(spot),
    );
    if (!res) continue;
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1;
    let y1 = -1;
    res.pixels.forEach((v, i) => {
      if (v === TRANSPARENT) return;
      const x = i % WORK_W;
      const y = (i / WORK_W) | 0;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    });
    if (x1 < 0) continue;
    const iw = x1 - x0 + 1;
    const ih = y1 - y0 + 1;
    const [px0, py0, pw, ph] = spot.place;
    const s = Math.min(pw / iw, ph / ih);
    const dw = Math.max(1, Math.round(iw * s));
    const dh = Math.max(1, Math.round(ih * s));
    const dx = px0 + Math.round((pw - dw) / 2);
    const dy = py0 + Math.round((ph - dh) / 2);
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const v = res.pixels[(y0 + Math.floor((y / dh) * ih)) * WORK_W + x0 + Math.floor((x / dw) * iw)]!;
        if (v !== TRANSPARENT && dx + x < 320 && dy + y < 180) px[(dy + y) * 320 + dx + x] = v;
      }
    }
  }

  for (let y = 0; y < 180 * ZOOM; y++) {
    for (let x = 0; x < RW; x++) {
      const c = PALETTE[px[Math.floor(y / ZOOM) * 320 + Math.floor(x / ZOOM)]!]!.rgb;
      const o = ((row * 180 * ZOOM + y) * RW + x) * 4;
      out[o] = c[0];
      out[o + 1] = c[1];
      out[o + 2] = c[2];
      out[o + 3] = 255;
    }
  }
});

writeFileSync("/mnt/user-data/outputs/place-check.png", encodePng(out, RW, RH));
console.log("place-check.png geschrieben");
