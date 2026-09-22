// Die sieben Szenen. Jede Funktion malt einen Room; die Objekte liegen dort, wo in
// content/rooms/*.yaml die Hotspots sind.
import {
  ART_H,
  ART_W,
  C,
  bricks,
  disc,
  frame,
  gradient,
  grain,
  hline,
  line,
  newArt,
  person,
  piece,
  px,
  rect,
  rng,
  shutter,
  tags,
  vline,
  type Art,
} from "./art";

type Scene = (R: () => number) => Art;

// Asphalt, Schotter, Gehweg: Boden mit Körnung und heller Kante.
function ground(a: Art, y: number, base: number, speck: number, R: () => number): void {
  rect(a, 0, y, ART_W, ART_H - y, base);
  hline(a, 0, y, ART_W, C.grey);
  grain(a, 0, y + 1, ART_W, ART_H - y - 1, speck, 0.06, R);
}

// Fenster in einer Hauswand
function windows(
  a: Art,
  x: number,
  y: number,
  cols: number,
  rows: number,
  gapX: number,
  gapY: number,
  lit: number,
  R: () => number,
): void {
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const wx = x + c * gapX;
      const wy = y + r * gapY;
      rect(a, wx, wy, 8, 10, R() < 0.3 ? lit : C.dark_grey);
      frame(a, wx - 1, wy - 1, 10, 12, C.black);
    }
  }
}

const hinterhof: Scene = (R) => {
  const a = newArt(C.brown);
  gradient(a, 0, 0, ART_W, 26, C.light_blue, C.cyan); // Himmelstreifen über dem Hof
  bricks(a, 0, 26, ART_W, 124, C.brown, C.red, C.grey, R);
  windows(a, 40, 34, 3, 1, 26, 0, C.yellow, R);
  ground(a, 150, C.dark_grey, C.grey, R);

  // Mülltonnen [20,110,70,50]
  for (let k = 0; k < 3; k++) {
    const x = 22 + k * 23;
    rect(a, x, 116, 20, 44, k === 1 ? C.green : C.dark_grey);
    rect(a, x, 110, 21, 7, C.light_green);
    frame(a, x, 110, 21, 50, C.black);
    vline(a, x + 10, 120, 36, C.black);
  }
  // Garagentor [110,60,90,90] mit gebufftem Fleck
  shutter(a, 110, 60, 90, 90, C.grey, C.light_grey, C.dark_grey);
  frame(a, 110, 60, 90, 90, C.black);
  rect(a, 124, 78, 62, 44, C.light_grey);
  grain(a, 124, 78, 62, 44, C.grey, 0.25, R);
  // Feuerleiter [215,20,30,120]
  vline(a, 218, 20, 120, C.dark_grey);
  vline(a, 242, 20, 120, C.dark_grey);
  for (let y = 24; y < 140; y += 8) hline(a, 218, y, 25, C.grey);
  // Stromkasten [255,100,30,45]
  rect(a, 255, 100, 30, 45, C.light_grey);
  frame(a, 255, 100, 30, 45, C.black);
  rect(a, 259, 106, 9, 6, C.yellow);
  rect(a, 271, 118, 10, 8, C.red);
  // Kalle auf der Kiste [150,105,30,55]
  rect(a, 148, 138, 30, 22, C.brown);
  frame(a, 148, 138, 30, 22, C.black);
  person(a, 150, 105, 55, C.blue, C.orange, C.dark_grey, { sitting: true });
  // Durchgang [295,60,25,100]
  rect(a, 295, 60, 25, 100, C.black);
  frame(a, 295, 60, 25, 100, C.dark_grey);
  return a;
};

const strasse: Scene = (R) => {
  const a = newArt(C.grey);
  gradient(a, 0, 0, ART_W, 40, C.light_blue, C.cyan);
  rect(a, 0, 28, ART_W, 122, C.grey); // Häuserzeile
  bricks(a, 0, 28, 140, 122, C.red, C.brown, C.grey, R);
  rect(a, 140, 28, 180, 122, C.light_grey);
  windows(a, 20, 36, 3, 1, 30, 0, C.yellow, R);
  windows(a, 232, 34, 2, 1, 40, 0, C.cyan, R);
  ground(a, 150, C.dark_grey, C.grey, R);
  hline(a, 0, 162, ART_W, C.grey); // Bordsteinkante

  // Rolltore [40,60,90,80]
  shutter(a, 40, 60, 90, 80, C.grey, C.light_grey, C.dark_grey);
  frame(a, 40, 60, 90, 80, C.black);
  rect(a, 40, 54, 90, 7, C.dark_grey);
  // Laternenmast [140,20,16,130]
  rect(a, 145, 20, 6, 130, C.dark_grey);
  rect(a, 138, 20, 22, 6, C.light_grey);
  rect(a, 141, 26, 16, 4, C.yellow);
  // Farbenladen [180,50,50,90]
  rect(a, 180, 50, 50, 90, C.dark_grey);
  rect(a, 184, 56, 42, 54, C.cyan);
  frame(a, 184, 56, 42, 54, C.black);
  rect(a, 180, 44, 50, 8, C.red);
  for (let k = 0; k < 6; k++)
    rect(
      a,
      188 + k * 6,
      60 + (k % 2) * 8,
      4,
      12,
      [C.yellow, C.white, C.purple, C.green, C.orange, C.light_blue][k]!,
    );
  rect(a, 200, 110, 14, 30, C.brown); // Tür
  // Kamera [200,28,20,16]
  rect(a, 205, 30, 13, 9, C.dark_grey);
  frame(a, 205, 30, 13, 9, C.black);
  rect(a, 200, 32, 6, 5, C.black);
  rect(a, 210, 26, 3, 5, C.dark_grey); // Halterung
  px(a, 202, 34, C.red);
  px(a, 203, 34, C.red);
  // Frau Brandt [240,90,30,70]
  person(a, 240, 90, 70, C.blue, C.orange, C.black);
  // Wege
  rect(a, 0, 60, 20, 100, C.black);
  rect(a, 290, 70, 30, 90, C.black);
  frame(a, 290, 70, 30, 90, C.dark_grey);
  return a;
};

const farbenladen: Scene = (R) => {
  const a = newArt(C.light_grey);
  rect(a, 0, 0, ART_W, 18, C.grey); // Decke
  for (let x = 30; x < ART_W; x += 90) rect(a, x, 6, 40, 4, C.white);
  ground(a, 150, C.brown, C.orange, R);

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
  // Regal Low Pressure [10,20,80,120] und Regal High Pressure [95,20,60,120]
  for (const [x, w] of [
    [10, 80],
    [95, 60],
  ] as [number, number][]) {
    rect(a, x, 20, w, 120, C.brown);
    frame(a, x, 20, w, 120, C.black);
    for (let shelf = 0; shelf < 5; shelf++) {
      const y = 26 + shelf * 23;
      hline(a, x + 1, y + 18, w - 2, C.dark_grey);
      for (let i = x + 4; i < x + w - 6; i += 7) {
        const c = cans[Math.floor(R() * cans.length)]!;
        rect(a, i, y, 5, 17, c);
        hline(a, i, y, 5, C.light_grey);
        px(a, i + 2, y - 1, C.dark_grey);
      }
    }
  }
  // Cap-Kiste [170,110,40,25]
  rect(a, 170, 110, 40, 25, C.brown);
  frame(a, 170, 110, 40, 25, C.black);
  for (let k = 0; k < 12; k++)
    disc(a, 174 + (k % 6) * 6, 116 + Math.floor(k / 6) * 8, 2, [C.white, C.red, C.yellow, C.black][k % 4]!);
  // Pinnwand [220,25,50,50]
  rect(a, 220, 25, 50, 50, C.brown);
  frame(a, 220, 25, 50, 50, C.black);
  for (let k = 0; k < 6; k++) {
    const nx = 224 + (k % 3) * 15;
    const ny = 29 + Math.floor(k / 3) * 22;
    rect(a, nx, ny, 12, 16, C.white);
    hline(a, nx + 2, ny + 4, 8, C.dark_grey);
    hline(a, nx + 2, ny + 8, 6, C.dark_grey);
  }
  // Theke und Sibel [240,85,35,70]
  rect(a, 215, 120, 105, 22, C.dark_grey);
  hline(a, 215, 120, 105, C.light_grey);
  person(a, 240, 85, 60, C.purple, C.orange, C.black);
  // Tür zur Straße [290,60,30,100]
  rect(a, 292, 60, 28, 100, C.cyan);
  frame(a, 292, 60, 28, 100, C.black);
  disc(a, 297, 110, 2, C.yellow);
  return a;
};

const unterfuehrung: Scene = (R) => {
  const a = newArt(C.dark_grey);
  rect(a, 0, 0, ART_W, 24, C.black); // Decke
  for (const x of [70, 200]) {
    rect(a, x, 18, 26, 5, C.yellow);
    grain(a, x - 12, 24, 50, 24, C.yellow, 0.05, R);
  }
  rect(a, 0, 24, ART_W, 126, C.grey);
  grain(a, 0, 24, ART_W, 126, C.dark_grey, 0.05, R);
  ground(a, 150, C.dark_grey, C.grey, R);

  // Wand voller Tags [20,30,65,110]
  tags(a, 18, 30, 68, 110, [C.black, C.white, C.light_red, C.cyan, C.yellow], 8, R);
  // KRUX' Piece [90,30,120,90]
  piece(a, 90, 34, 120, 82, "KRUX", C.purple, C.black, R);
  tags(a, 92, 118, 116, 24, [C.black, C.white], 4, R);
  // Linke Wand [0,40,16,100] – frei, da darf man malen
  rect(a, 0, 40, 16, 100, C.light_grey);
  frame(a, 0, 40, 16, 100, C.grey);
  // KRUX [215,85,30,75]
  person(a, 215, 85, 75, C.dark_grey, C.orange, C.black, { hood: true });
  // Aufgebogener Zaun [266,90,35,60]
  rect(a, 266, 90, 35, 60, C.black);
  for (let x = 266; x < 301; x += 5) line(a, x, 90, x + 4, 150, C.light_grey);
  for (let x = 266; x < 301; x += 5) line(a, x + 4, 90, x, 150, C.light_grey);
  rect(a, 274, 104, 18, 36, C.black);
  // Zur Straße [304,50,16,110]
  rect(a, 304, 50, 16, 110, C.cyan);
  return a;
};

const jugendzentrum: Scene = (R) => {
  const a = newArt(C.grey);
  gradient(a, 0, 0, ART_W, 28, C.light_blue, C.cyan);
  rect(a, 0, 28, ART_W, 122, C.light_grey); // Betonwand
  grain(a, 0, 28, ART_W, 122, C.grey, 0.04, R);
  ground(a, 150, C.dark_grey, C.grey, R);

  // Die Hall [20,30,190,110] – Piece an Piece
  const fills = [C.yellow, C.light_red, C.cyan, C.light_green];
  const names = ["SEB", "ZINK", "MOA", "ARO"];
  const backs = [C.purple, C.blue, C.red, C.green];
  let x = 22;
  let k = 0;
  while (x < 190 && k < 4) {
    const w = 44 + Math.floor(R() * 8);
    piece(a, x, 34 + Math.floor(R() * 6), w, 58, names[k]!, fills[k]!, C.black, R, backs[k]!);
    x += w + 3;
    k++;
  }
  tags(a, 22, 116, 186, 26, [C.black, C.white, C.purple], 6, R);
  // Altes Piece [220,35,80,70]
  piece(a, 220, 40, 80, 62, "TOY", C.orange, C.brown, R, C.light_grey);
  grain(a, 220, 40, 80, 62, C.light_grey, 0.22, R); // verblasst
  // Karton mit Dosen [225,120,45,35]
  rect(a, 225, 120, 45, 35, C.brown);
  frame(a, 225, 120, 45, 35, C.black);
  for (let i = 0; i < 5; i++)
    rect(a, 228 + i * 8, 112, 5, 12, [C.red, C.white, C.green, C.light_blue, C.yellow][i]!);
  // Zur Straße [0,60,16,100]
  rect(a, 0, 60, 16, 100, C.black);
  return a;
};

const bruecke: Scene = (R) => {
  const a = newArt(C.blue);
  gradient(a, 0, 0, ART_W, 110, C.purple, C.blue); // Abendhimmel
  for (let k = 0; k < 30; k++) px(a, Math.floor(R() * ART_W), Math.floor(R() * 40), C.white);
  // Stadt unten
  for (let x = 0; x < ART_W; x += 14) {
    const h = 14 + Math.floor(R() * 26);
    rect(a, x, 110 - h, 12, h, C.dark_grey);
    for (let wy = 110 - h + 3; wy < 106; wy += 6) if (R() < 0.5) rect(a, x + 3, wy, 3, 3, C.yellow);
  }
  rect(a, 0, 100, ART_W, 12, C.black); // Straße unter der Brücke
  // Brückenblech [60,40,180,60] mit Geländer
  rect(a, 0, 112, ART_W, 68, C.dark_grey);
  rect(a, 50, 34, 200, 78, C.grey);
  frame(a, 50, 34, 200, 78, C.black);
  for (let x = 56; x < 246; x += 24) vline(a, x, 36, 74, C.dark_grey);
  rect(a, 60, 40, 180, 60, C.light_grey);
  grain(a, 60, 40, 180, 60, C.grey, 0.08, R);
  for (let x = 62; x < 240; x += 30) disc(a, x, 44, 1, C.dark_grey);
  // Aussicht [250,20,60,50]
  rect(a, 250, 20, 60, 50, C.black);
  rect(a, 252, 22, 56, 46, C.blue);
  for (let k = 0; k < 18; k++) px(a, 254 + Math.floor(R() * 52), 24 + Math.floor(R() * 42), C.yellow);
  frame(a, 250, 20, 60, 50, C.light_grey);
  // Runter zur Straße [0,110,40,70]
  for (let k = 0; k < 7; k++) rect(a, 0, 112 + k * 10, 40 - k * 4, 6, C.grey);
  return a;
};

const abstellgleis: Scene = (R) => {
  const a = newArt(C.black);
  gradient(a, 0, 0, ART_W, 46, C.black, C.blue); // Nacht
  for (let k = 0; k < 40; k++) px(a, Math.floor(R() * ART_W), Math.floor(R() * 40), C.white);
  rect(a, 0, 46, ART_W, 104, C.dark_grey);
  grain(a, 0, 46, ART_W, 104, C.grey, 0.05, R);
  ground(a, 140, C.dark_grey, C.light_grey, R); // Schotter

  // Waggon [40,50,200,80]
  rect(a, 40, 50, 200, 80, C.grey);
  frame(a, 40, 50, 200, 80, C.black);
  rect(a, 40, 50, 200, 10, C.dark_grey);
  hline(a, 40, 96, 200, C.dark_grey);
  for (let x = 48; x < 232; x += 28) rect(a, x, 62, 20, 16, C.black); // Fenster
  for (let x = 44; x < 238; x += 12) px(a, x, 100, C.dark_grey); // Nieten
  rect(a, 50, 130, 30, 8, C.black);
  rect(a, 200, 130, 30, 8, C.black);
  disc(a, 58, 138, 5, C.dark_grey);
  disc(a, 72, 138, 5, C.dark_grey);
  disc(a, 208, 138, 5, C.dark_grey);
  disc(a, 222, 138, 5, C.dark_grey);
  // Gleise [250,120,60,50]
  for (let k = 0; k < 6; k++) rect(a, 248, 122 + k * 9, 64, 3, C.brown);
  line(a, 250, 120, 262, 170, C.light_grey);
  line(a, 300, 120, 312, 170, C.light_grey);
  // Zurück durch den Zaun [0,60,20,110]
  rect(a, 0, 60, 20, 110, C.black);
  for (let y = 60; y < 170; y += 6) line(a, 0, y, 20, y + 6, C.grey);
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
