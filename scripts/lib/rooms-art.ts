// Die sieben Szenen. Jede Funktion malt einen Room; die Objekte liegen dort, wo in
// content/rooms/*.yaml die Hotspots sind.
//
// Nach dem Tester-Feedback („zu detaillos, Figuren wie Strichmännchen") ist alles in Schichten
// gebaut: Flächen mit Verlauf und Dithering, dann Kanten mit Licht und Schatten, dann Kleinkram
// (Kabel, Risse, Müll, Unkraut, Plakate). Die Leute kommen als Sprites aus figures.ts.
import {
  ART_H,
  ART_W,
  C,
  box,
  bricks,
  cable,
  crack,
  disc,
  dither,
  frame,
  gradient,
  grain,
  hline,
  line,
  newArt,
  piece,
  pipe,
  poster,
  puddle,
  px,
  rect,
  rng,
  shutter,
  tags,
  vline,
  weeds,
  word,
  type Art,
} from "./art";
import { BRANDT, KALLE, KRUX, SIBEL, character } from "./figures";

type Scene = (R: () => number) => Art;

// Boden mit Kante, Körnung und ein paar Rissen.
function ground(a: Art, y: number, base: number, speck: number, R: () => number): void {
  rect(a, 0, y, ART_W, ART_H - y, base);
  hline(a, 0, y, ART_W, C.grey);
  hline(a, 0, y + 1, ART_W, C.dark_grey);
  dither(a, 0, y + 2, ART_W, 6, base, speck, 0.25);
  grain(a, 0, y + 2, ART_W, ART_H - y - 2, speck, 0.05, R);
  for (let k = 0; k < 3; k++)
    crack(a, 20 + Math.floor(R() * 280), y + 4, 6 + Math.floor(R() * 10), C.black, R);
}

// Fenster mit Rahmen, Scheibe und Gardine.
function windowAt(a: Art, x: number, y: number, w: number, h: number, lit: boolean, R: () => number): void {
  box(a, x - 2, y - 2, w + 4, h + 4, C.grey, C.light_grey, C.dark_grey);
  rect(a, x, y, w, h, lit ? C.yellow : C.dark_grey);
  if (lit) {
    dither(a, x, y, w, Math.floor(h / 2), C.yellow, C.orange, 0.3);
    rect(a, x + 1, y + 1, Math.max(2, Math.floor(w / 3)), h - 2, C.white);
  } else {
    dither(a, x, y, w, h, C.dark_grey, C.blue, 0.35);
  }
  vline(a, x + Math.floor(w / 2), y, h, C.dark_grey);
  hline(a, x, y + Math.floor(h / 2), w, C.dark_grey);
  if (R() < 0.4) hline(a, x, y + h - 1, w, C.light_grey);
}

function at(a: Art, x: number, y: number): number {
  return a[Math.max(0, Math.min(ART_H - 1, y)) * ART_W + Math.max(0, Math.min(ART_W - 1, x))]!;
}

// Lichtkegel unter einer Lampe: wird nach unten breiter und schwächer.
function lightCone(a: Art, x: number, y: number, w: number, h: number, c: number): void {
  for (let j = 0; j < h; j++) {
    const t = j / h;
    const half = (w / 2) * (0.3 + t);
    dither(a, Math.round(x - half), y + j, Math.round(half * 2), 1, at(a, x, y + j), c, 0.35 * (1 - t));
  }
}

const hinterhof: Scene = (R) => {
  const a = newArt(C.brown);
  gradient(a, 0, 0, ART_W, 22, C.steel, C.sky);
  dither(a, 0, 14, ART_W, 8, C.cyan, C.light_grey, 0.4);
  bricks(a, 0, 22, ART_W, 128, C.tan, C.rust, C.grey_soft, R);
  dither(a, 0, 22, ART_W, 26, C.tan, C.dark_brown, 0.35);
  dither(a, 0, 130, ART_W, 20, C.tan, C.dark_brown, 0.3);
  for (let k = 0; k < 4; k++)
    crack(
      a,
      30 + Math.floor(R() * 260),
      40 + Math.floor(R() * 60),
      12 + Math.floor(R() * 14),
      C.dark_grey,
      R,
    );
  ground(a, 150, C.grey_mid, C.grey_soft, R);

  windowAt(a, 40, 30, 14, 16, false, R);
  windowAt(a, 70, 30, 14, 16, true, R);
  pipe(a, 96, 22, 128, C.grey, C.light_grey, C.dark_grey);
  cable(a, 0, 30, 96, 26, 6, C.black);
  tags(a, 214, 126, 80, 22, [C.black, C.white], 3, R);

  // Mülltonnen [20,110,70,50]
  for (let k = 0; k < 3; k++) {
    const x = 20 + k * 24;
    const body = k === 1 ? C.green : C.dark_grey;
    const light = k === 1 ? C.light_green : C.grey;
    box(a, x, 116, 22, 44, body, light, C.black);
    box(a, x - 1, 110, 24, 7, body, light, C.black);
    vline(a, x + 11, 122, 34, C.black);
    rect(a, x + 4, 128, 6, 5, C.white);
    if (k === 2) {
      disc(a, x + 9, 106, 5, C.light_grey);
      rect(a, x + 3, 106, 13, 6, C.light_grey);
      frame(a, x + 3, 104, 13, 8, C.dark_grey);
    }
  }
  weeds(a, 92, 160, 5, C.green, R);
  puddle(a, 214, 168, 14, 4, C.black, C.grey);

  // Garagentor [110,60,90,90]
  rect(a, 108, 54, 94, 7, C.dark_grey);
  hline(a, 108, 54, 94, C.grey);
  shutter(a, 110, 60, 90, 90, C.grey, C.light_grey, C.dark_grey);
  frame(a, 110, 60, 90, 90, C.black);
  rect(a, 126, 74, 60, 46, C.light_grey);
  dither(a, 126, 74, 60, 46, C.light_grey, C.grey, 0.35);
  word(a, 132, 84, 22, "TOY", C.grey, C.light_grey, 0.2);
  rect(a, 148, 142, 14, 4, C.dark_grey);
  disc(a, 155, 144, 2, C.black);

  // Feuerleiter [215,20,30,120]
  rect(a, 212, 60, 36, 4, C.dark_grey);
  hline(a, 212, 60, 36, C.grey);
  for (let x = 214; x < 246; x += 4) vline(a, x, 52, 8, C.dark_grey);
  for (const x of [218, 242]) {
    vline(a, x, 20, 120, C.grey);
    vline(a, x + 1, 20, 120, C.dark_grey);
  }
  for (let y = 24; y < 142; y += 7) {
    hline(a, 218, y, 26, C.light_grey);
    hline(a, 218, y + 1, 26, C.dark_grey);
  }

  // Stromkasten [255,100,30,45]
  box(a, 255, 100, 30, 45, C.light_grey, C.white, C.grey);
  rect(a, 259, 106, 10, 7, C.yellow);
  px(a, 263, 108, C.black);
  px(a, 264, 110, C.black);
  rect(a, 272, 118, 9, 8, C.red);
  hline(a, 256, 122, 28, C.grey);
  cable(a, 270, 100, 242, 70, 4, C.black);

  // Kiste und Kalle [150,105,30,55]
  box(a, 142, 136, 36, 24, C.tan, C.orange, C.dark_brown);
  hline(a, 144, 142, 32, C.black);
  hline(a, 144, 150, 32, C.black);
  character(a, 152, 100, 60, KALLE);
  box(a, 180, 148, 14, 12, C.light_grey, C.white, C.grey);

  // Durchgang [295,60,25,100]
  rect(a, 295, 60, 25, 100, C.black);
  vline(a, 295, 60, 100, C.dark_grey);
  dither(a, 296, 60, 10, 100, C.black, C.dark_grey, 0.2);
  return a;
};

const strasse: Scene = (R) => {
  const a = newArt(C.grey);
  gradient(a, 0, 0, ART_W, 34, C.steel, C.sky);
  for (let k = 0; k < 3; k++) {
    const cx = 40 + k * 110;
    const cy = 12 + (k % 2) * 5;
    disc(a, cx, cy, 7, C.white);
    disc(a, cx + 8, cy + 2, 5, C.white);
    disc(a, cx - 7, cy + 2, 4, C.white);
  }
  bricks(a, 0, 26, 150, 124, C.rust, C.dark_brown, C.grey_soft, R);
  dither(a, 0, 26, 150, 18, C.rust, C.dark_brown, 0.3);
  rect(a, 150, 26, 170, 124, C.grey_pale);
  dither(a, 150, 26, 170, 124, C.grey_pale, C.grey_soft, 0.35);
  dither(a, 150, 26, 170, 14, C.grey_soft, C.grey_mid, 0.4);
  hline(a, 150, 26, 170, C.dark_grey);
  vline(a, 150, 26, 124, C.dark_grey);
  windowAt(a, 16, 34, 14, 16, false, R);
  windowAt(a, 46, 34, 14, 16, true, R);
  windowAt(a, 240, 36, 16, 18, false, R);
  windowAt(a, 276, 36, 16, 18, true, R);
  ground(a, 150, C.grey_mid, C.grey_soft, R);
  hline(a, 0, 164, ART_W, C.grey);
  hline(a, 0, 165, ART_W, C.light_grey);
  rect(a, 0, 166, ART_W, 14, C.dark_grey);
  for (let x = 10; x < ART_W; x += 40) rect(a, x, 173, 16, 2, C.light_grey);
  disc(a, 60, 170, 5, C.grey);
  frame(a, 55, 166, 11, 9, C.dark_grey);

  // Rolltore [40,60,90,80]
  rect(a, 36, 52, 98, 9, C.dark_grey);
  hline(a, 36, 52, 98, C.grey);
  shutter(a, 40, 60, 90, 80, C.grey, C.light_grey, C.dark_grey);
  frame(a, 40, 60, 90, 80, C.black);
  rect(a, 78, 132, 14, 5, C.dark_grey);
  disc(a, 85, 134, 2, C.black);
  rect(a, 44, 141, 82, 3, C.dark_grey);
  poster(a, 12, 74, 18, 24, C.white, C.dark_grey, R);
  poster(a, 12, 104, 18, 20, C.yellow, C.black, R);

  // Laternenmast [140,20,16,130]
  rect(a, 144, 26, 7, 130, C.dark_grey);
  vline(a, 145, 26, 130, C.grey);
  box(a, 136, 20, 24, 7, C.light_grey, C.white, C.grey);
  rect(a, 139, 27, 18, 4, C.yellow);
  lightCone(a, 147, 31, 64, 44, C.yellow);
  rect(a, 140, 150, 15, 6, C.dark_grey);

  // Farbenladen [180,50,50,90]
  box(a, 176, 42, 58, 11, C.red, C.light_red, C.black);
  word(a, 181, 44, 8, "FARBEN", C.white, C.black);
  box(a, 178, 56, 54, 56, C.dark_grey, C.grey, C.black);
  rect(a, 182, 60, 46, 48, C.cyan);
  dither(a, 182, 60, 46, 48, C.cyan, C.white, 0.3);
  for (let row = 0; row < 3; row++) {
    hline(a, 182, 72 + row * 14, 46, C.dark_grey);
    for (let k = 0; k < 6; k++) {
      const cx = 185 + k * 7;
      rect(
        a,
        cx,
        64 + row * 14,
        5,
        8,
        [C.red, C.yellow, C.purple, C.green, C.orange, C.light_blue][(k + row) % 6]!,
      );
      hline(a, cx, 64 + row * 14, 5, C.light_grey);
    }
  }
  box(a, 196, 112, 22, 38, C.tan, C.orange, C.dark_brown);
  disc(a, 213, 132, 2, C.yellow);
  rect(a, 176, 112, 20, 38, C.dark_grey);
  dither(a, 176, 112, 20, 38, C.dark_grey, C.black, 0.3);

  // Kamera [200,28,20,16]
  rect(a, 212, 24, 4, 8, C.dark_grey);
  box(a, 203, 30, 15, 10, C.dark_grey, C.grey, C.black);
  rect(a, 199, 32, 5, 6, C.black);
  px(a, 201, 34, C.light_grey);
  px(a, 205, 33, C.red);
  px(a, 206, 33, C.red);

  character(a, 242, 86, 74, BRANDT);

  rect(a, 0, 60, 20, 100, C.black);
  dither(a, 0, 60, 20, 100, C.black, C.dark_grey, 0.25);
  rect(a, 290, 70, 30, 90, C.black);
  frame(a, 290, 70, 30, 90, C.dark_grey);
  dither(a, 291, 70, 12, 90, C.black, C.dark_grey, 0.2);
  return a;
};

const farbenladen: Scene = (R) => {
  const a = newArt(C.light_grey);
  rect(a, 0, 0, ART_W, 16, C.grey);
  dither(a, 0, 0, ART_W, 16, C.grey, C.dark_grey, 0.3);
  rect(a, 0, 16, ART_W, 134, C.grey_pale);
  dither(a, 0, 100, ART_W, 50, C.grey_pale, C.grey_soft, 0.35);
  rect(a, 0, 148, ART_W, 32, C.grey);
  dither(a, 0, 148, ART_W, 32, C.grey, C.light_grey, 0.4);
  for (let k = -4; k < 10; k++) line(a, 160 + k * 26, 148, 160 + k * 90, ART_H, C.dark_grey);
  for (let j = 0; j < 4; j++) hline(a, 0, 152 + j * 8 + j * j, ART_W, C.dark_grey);
  for (let x = 46; x < ART_W; x += 96) {
    box(a, x - 1, 7, 46, 7, C.white, C.white, C.grey);
    lightCone(a, x + 22, 14, 96, 50, C.white);
  }

  const cans = [
    C.red,
    C.yellow,
    C.green,
    C.light_blue,
    C.purple,
    C.white,
    C.orange,
    C.cyan,
    C.light_red,
    C.light_green,
  ];
  for (const [x, w, label] of [
    [8, 84, "LOW"],
    [95, 62, "HIGH"],
  ] as [number, number, string][]) {
    box(a, x, 20, w, 122, C.tan, C.orange, C.dark_brown);
    word(a, x + 6, 23, 9, label, C.white, C.black);
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = 38 + shelf * 25;
      rect(a, x + 2, y + 20, w - 4, 3, C.dark_grey);
      hline(a, x + 2, y + 20, w - 4, C.light_grey);
      for (let i = x + 4; i < x + w - 7; i += 8) {
        const c = cans[Math.floor(R() * cans.length)]!;
        rect(a, i, y, 6, 20, c);
        vline(a, i, y, 20, C.white);
        vline(a, i + 5, y, 20, C.dark_grey);
        rect(a, i + 1, y - 3, 4, 3, C.light_grey);
        hline(a, i, y + 12, 6, C.black);
      }
    }
  }

  // Cap-Kiste [170,110,40,25]
  box(a, 170, 110, 40, 26, C.tan, C.orange, C.dark_brown);
  rect(a, 172, 112, 36, 4, C.dark_grey);
  for (let k = 0; k < 14; k++) {
    const cx = 174 + (k % 7) * 5;
    const cy = 120 + Math.floor(k / 7) * 7;
    disc(a, cx, cy, 2, [C.white, C.red, C.yellow, C.black, C.light_blue][k % 5]!);
    px(a, cx, cy - 1, C.light_grey);
  }

  // Pinnwand [220,25,50,50]
  box(a, 220, 25, 50, 50, C.tan, C.orange, C.dark_brown);
  poster(a, 223, 29, 15, 18, C.white, C.dark_grey, R);
  poster(a, 241, 29, 16, 14, C.yellow, C.black, R);
  poster(a, 223, 50, 20, 20, C.white, C.dark_grey, R);
  poster(a, 247, 46, 19, 24, C.cyan, C.blue, R);
  for (const [x, y] of [
    [229, 29],
    [248, 29],
    [231, 50],
    [255, 46],
  ] as [number, number][])
    px(a, x, y, C.red);

  // Theke [215,120,...] und Sibel [240,85,35,70]
  character(a, 243, 82, 68, SIBEL);
  box(a, 214, 118, 106, 26, C.tan, C.orange, C.dark_brown);
  hline(a, 216, 123, 102, C.dark_grey);
  box(a, 286, 102, 28, 17, C.light_grey, C.white, C.grey);
  rect(a, 289, 105, 22, 6, C.dark_grey);
  for (let k = 0; k < 3; k++) rect(a, 290 + k * 7, 113, 5, 3, C.grey);
  box(a, 220, 106, 18, 13, C.light_grey, C.white, C.grey);

  // Tür zur Straße [290,60,30,100]
  rect(a, 292, 44, 28, 6, C.dark_grey);
  box(a, 292, 50, 28, 96, C.cyan, C.white, C.blue);
  dither(a, 294, 54, 24, 88, C.cyan, C.white, 0.35);
  disc(a, 297, 104, 2, C.yellow);
  disc(a, 306, 47, 2, C.light_grey);
  return a;
};

const unterfuehrung: Scene = (R) => {
  const a = newArt(C.dark_grey);
  rect(a, 0, 0, ART_W, 22, C.black);
  for (let x = 12; x < ART_W; x += 48) {
    rect(a, x, 0, 10, 22, C.dark_grey);
    vline(a, x, 0, 22, C.grey);
  }
  rect(a, 0, 20, ART_W, 4, C.dark_grey);
  rect(a, 0, 24, ART_W, 126, C.grey_soft);
  dither(a, 0, 24, ART_W, 40, C.grey_soft, C.grey_pale, 0.3);
  dither(a, 0, 110, ART_W, 40, C.grey_soft, C.grey_mid, 0.45);
  grain(a, 0, 24, ART_W, 126, C.dark_grey, 0.04, R);
  for (const x of [66, 206]) {
    rect(a, x, 16, 28, 6, C.yellow);
    frame(a, x - 1, 15, 30, 8, C.black);
    lightCone(a, x + 14, 22, 74, 50, C.yellow);
  }
  ground(a, 150, C.grey_mid, C.grey_soft, R);
  puddle(a, 120, 166, 22, 5, C.black, C.grey);
  puddle(a, 250, 172, 16, 4, C.black, C.grey);

  tags(a, 18, 30, 68, 108, [C.black, C.white, C.light_red, C.cyan, C.yellow], 9, R);
  piece(a, 90, 34, 120, 82, "KRUX", C.purple, C.black, R, C.blue);
  tags(a, 92, 120, 116, 24, [C.black, C.white], 3, R);
  rect(a, 0, 40, 16, 100, C.light_grey);
  dither(a, 0, 40, 16, 100, C.light_grey, C.grey, 0.3);
  frame(a, 0, 40, 16, 100, C.dark_grey);

  character(a, 216, 82, 78, KRUX);
  box(a, 238, 140, 12, 13, C.tan, C.orange, C.dark_brown);

  // Aufgebogener Zaun [266,90,35,60]
  rect(a, 264, 88, 40, 64, C.black);
  for (let x = 264; x < 304; x += 5) {
    line(a, x, 88, x + 5, 152, C.light_grey);
    line(a, x + 5, 88, x, 152, C.grey);
  }
  rect(a, 272, 104, 20, 40, C.black);
  line(a, 272, 104, 280, 96, C.light_grey);
  line(a, 292, 104, 286, 96, C.light_grey);
  weeds(a, 270, 152, 4, C.green, R);

  rect(a, 304, 50, 16, 110, C.cyan);
  dither(a, 304, 50, 16, 110, C.cyan, C.white, 0.4);
  return a;
};

const jugendzentrum: Scene = (R) => {
  const a = newArt(C.grey);
  gradient(a, 0, 0, ART_W, 26, C.steel, C.sky);
  disc(a, 250, 12, 8, C.white);
  disc(a, 262, 14, 6, C.white);
  rect(a, 0, 22, ART_W, 6, C.dark_grey);
  hline(a, 0, 22, ART_W, C.grey);
  rect(a, 0, 28, ART_W, 122, C.grey_pale);
  dither(a, 0, 28, ART_W, 122, C.grey_pale, C.grey_soft, 0.3);
  dither(a, 0, 120, ART_W, 30, C.grey_soft, C.grey_mid, 0.35);
  grain(a, 0, 28, ART_W, 122, C.grey, 0.03, R);
  ground(a, 150, C.grey_mid, C.grey_soft, R);
  for (let x = 6; x < ART_W; x += 46) rect(a, x, 170, 24, 2, C.light_grey);

  const fills = [C.yellow, C.light_red, C.cyan, C.light_green];
  const backs = [C.purple, C.blue, C.red, C.green];
  const names = ["SEB", "ZINK", "MOA", "ARO"];
  let x = 20;
  for (let k = 0; k < 4; k++) {
    const w = 44 + Math.floor(R() * 8);
    piece(a, x, 32 + Math.floor(R() * 6), w, 62, names[k]!, fills[k]!, C.black, R, backs[k]!);
    x += w + 2;
  }
  tags(a, 22, 110, 186, 30, [C.black, C.white, C.purple], 5, R);
  piece(a, 220, 38, 80, 64, "TOY", C.orange, C.brown, R, C.light_grey);
  // Verblasst: nur einzelne Pixel ausbleichen, nicht die Fläche übermalen
  grain(a, 222, 40, 76, 60, C.light_grey, 0.3, R);
  grain(a, 222, 40, 76, 60, C.grey, 0.12, R);

  box(a, 225, 120, 46, 34, C.tan, C.orange, C.dark_brown);
  rect(a, 227, 122, 42, 4, C.dark_grey);
  for (let i = 0; i < 6; i++) {
    const cx = 228 + i * 7;
    rect(a, cx, 110, 5, 14, [C.red, C.white, C.green, C.light_blue, C.yellow, C.purple][i]!);
    vline(a, cx, 110, 14, C.light_grey);
    rect(a, cx + 1, 107, 3, 3, C.light_grey);
  }
  weeds(a, 300, 158, 6, C.green, R);
  box(a, 150, 132, 46, 6, C.tan, C.orange, C.dark_brown);
  rect(a, 154, 138, 4, 12, C.dark_grey);
  rect(a, 188, 138, 4, 12, C.dark_grey);

  rect(a, 0, 60, 16, 100, C.black);
  dither(a, 0, 60, 16, 100, C.black, C.dark_grey, 0.25);
  return a;
};

const bruecke: Scene = (R) => {
  const a = newArt(C.blue);
  gradient(a, 0, 0, ART_W, 60, C.purple, C.navy);
  dither(a, 0, 40, ART_W, 26, C.blue, C.black, 0.4);
  for (let k = 0; k < 40; k++) px(a, Math.floor(R() * ART_W), Math.floor(R() * 36), C.white);
  disc(a, 280, 20, 7, C.light_grey);
  disc(a, 277, 18, 6, C.blue);

  for (let x = 0; x < ART_W; x += 13) {
    const h = 16 + Math.floor(R() * 30);
    rect(a, x, 100 - h, 11, h, C.black);
    dither(a, x, 100 - h, 11, h, C.black, C.dark_grey, 0.3);
    for (let wy = 100 - h + 3; wy < 96; wy += 6)
      for (let wx = x + 2; wx < x + 9; wx += 4) if (R() < 0.45) rect(a, wx, wy, 2, 3, C.yellow);
  }
  rect(a, 0, 100, ART_W, 14, C.black);
  for (let k = 0; k < 6; k++) {
    const cx = Math.floor(R() * ART_W);
    rect(a, cx, 104, 4, 2, C.yellow);
    rect(a, cx + 10, 108, 4, 2, C.light_red);
  }

  rect(a, 0, 112, ART_W, 68, C.dark_grey);
  dither(a, 0, 112, ART_W, 20, C.dark_grey, C.grey, 0.3);
  dither(a, 0, 150, ART_W, 30, C.dark_grey, C.black, 0.4);
  rect(a, 46, 30, 208, 84, C.grey);
  frame(a, 46, 30, 208, 84, C.black);
  dither(a, 46, 30, 208, 12, C.grey, C.light_grey, 0.4);
  for (let x = 52; x < 250; x += 26) {
    vline(a, x, 32, 80, C.dark_grey);
    vline(a, x + 1, 32, 80, C.light_grey);
  }
  rect(a, 60, 40, 180, 60, C.light_grey);
  dither(a, 60, 40, 180, 60, C.light_grey, C.grey, 0.25);
  frame(a, 60, 40, 180, 60, C.dark_grey);
  for (let x = 64; x < 238; x += 22) {
    disc(a, x, 44, 1, C.dark_grey);
    disc(a, x, 96, 1, C.dark_grey);
  }
  for (let k = 0; k < 3; k++) crack(a, 80 + Math.floor(R() * 140), 46, 8 + Math.floor(R() * 8), C.grey, R);
  rect(a, 0, 24, ART_W, 5, C.dark_grey);
  hline(a, 0, 24, ART_W, C.light_grey);
  for (let x = 6; x < ART_W; x += 18) vline(a, x, 29, 6, C.dark_grey);

  box(a, 250, 20, 60, 50, C.black, C.grey, C.black);
  rect(a, 252, 22, 56, 46, C.blue);
  dither(a, 252, 22, 56, 46, C.blue, C.black, 0.45);
  for (let k = 0; k < 26; k++) px(a, 254 + Math.floor(R() * 52), 24 + Math.floor(R() * 42), C.yellow);
  hline(a, 252, 56, 56, C.dark_grey);

  for (let k = 0; k < 8; k++) {
    const w = 40 - k * 4;
    rect(a, 0, 112 + k * 8, w, 5, C.grey);
    hline(a, 0, 112 + k * 8, w, C.light_grey);
    hline(a, 0, 116 + k * 8, w, C.dark_grey);
  }
  line(a, 40, 108, 4, 172, C.light_grey);
  line(a, 41, 108, 5, 172, C.dark_grey);
  return a;
};

const abstellgleis: Scene = (R) => {
  const a = newArt(C.black);
  gradient(a, 0, 0, ART_W, 44, C.black, C.navy);
  for (let k = 0; k < 50; k++) px(a, Math.floor(R() * ART_W), Math.floor(R() * 40), C.white);
  rect(a, 292, 10, 3, 36, C.dark_grey);
  box(a, 286, 6, 14, 5, C.light_grey, C.white, C.grey);
  lightCone(a, 293, 11, 96, 64, C.yellow);
  rect(a, 0, 44, ART_W, 96, C.dark_grey);
  dither(a, 0, 44, ART_W, 20, C.dark_grey, C.black, 0.4);
  for (let x = 0; x < ART_W; x += 14) disc(a, x, 46, 5 + Math.floor(R() * 3), C.black);
  grain(a, 0, 44, ART_W, 96, C.grey, 0.03, R);
  ground(a, 138, C.grey_mid, C.grey_soft, R);
  for (let k = 0; k < 90; k++) px(a, Math.floor(R() * ART_W), 140 + Math.floor(R() * 38), C.grey);

  // Waggon [40,50,200,80]
  box(a, 38, 48, 204, 84, C.grey, C.light_grey, C.dark_grey);
  rect(a, 40, 50, 200, 12, C.dark_grey);
  dither(a, 40, 62, 200, 32, C.grey, C.light_grey, 0.3);
  dither(a, 40, 96, 200, 34, C.grey, C.dark_grey, 0.35);
  hline(a, 40, 94, 200, C.dark_grey);
  hline(a, 40, 95, 200, C.light_grey);
  for (let x = 48; x < 232; x += 28) {
    box(a, x, 64, 22, 18, C.black, C.dark_grey, C.black);
    dither(a, x + 1, 65, 20, 16, C.black, C.blue, 0.25);
  }
  for (let x = 44; x < 240; x += 10) {
    px(a, x, 100, C.light_grey);
    px(a, x, 128, C.dark_grey);
  }
  box(a, 130, 96, 18, 34, C.dark_grey, C.grey, C.black);
  vline(a, 139, 100, 26, C.black);
  rect(a, 48, 132, 40, 8, C.black);
  rect(a, 194, 132, 40, 8, C.black);
  for (const cx of [58, 78, 204, 224]) {
    disc(a, cx, 140, 6, C.dark_grey);
    disc(a, cx, 140, 3, C.black);
  }
  tags(a, 158, 102, 74, 24, [C.white, C.light_red], 2, R);

  // Gleise [250,120,60,50]
  for (let k = 0; k < 7; k++) {
    const y = 122 + k * 8;
    const shift = k * 2;
    rect(a, 246 + shift, y, 66 - shift, 4, C.brown);
    hline(a, 246 + shift, y, 66 - shift, C.orange);
  }
  line(a, 252, 120, 266, 178, C.light_grey);
  line(a, 253, 120, 267, 178, C.grey);
  line(a, 302, 120, 316, 178, C.light_grey);
  line(a, 303, 120, 317, 178, C.grey);
  weeds(a, 240, 150, 6, C.green, R);
  weeds(a, 288, 168, 5, C.green, R);

  rect(a, 0, 58, 22, 114, C.black);
  for (let y = 58; y < 172; y += 5) {
    line(a, 0, y, 22, y + 8, C.grey);
    line(a, 0, y + 8, 22, y, C.dark_grey);
  }
  rect(a, 2, 96, 16, 40, C.black);
  return a;
};

export const SCENES: Record<string, Scene> = {
  hinterhof,
  strasse,
  farbenladen,
  unterfuehrung,
  jugendzentrum,
  bruecke,
  abstellgleis,
};

export function drawRoom(id: string, seed = 7): Art | null {
  const scene = SCENES[id];
  return scene ? scene(rng(seed)) : null;
}
