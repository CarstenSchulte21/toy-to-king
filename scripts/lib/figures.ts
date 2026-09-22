// Die Leute im Spiel. Nach dem Tester-Feedback („eher Strichfiguren") sind es richtige Sprites:
// Gesicht, Frisur, Kleidung mit Licht und Schatten, Hände, Schuhe – und außen herum eine schwarze
// Kontur, damit die Figur vor jeder Wand steht.
import { C, disc, hline, newArt, px, rect, vline, type Art } from "./art";

const EMPTY = 255;

type Body = {
  skin: number;
  skinShade: number;
  hair: number;
  top: number; // Jacke, Pulli, Uniform
  topLight: number;
  topDark: number;
  pants: number;
  pantsDark: number;
  shoes: number;
};

export type Pose = "stehend" | "sitzend" | "theke";

export type Figure = Body & {
  pose?: Pose;
  cap?: number; // Mütze oder Kappe
  hood?: boolean; // Kapuze auf
  beard?: number;
  apron?: number; // Schürze
  stripes?: number; // Reflexstreifen auf der Uniform
  badge?: number;
  can?: number; // Dose in der Hand
  ponytail?: boolean;
  backpack?: number;
};

// Zeichnet die Figur in einen eigenen kleinen Puffer und setzt sie danach mit Kontur ins Bild.
export function character(a: Art, x: number, y: number, h: number, f: Figure): void {
  const s = newArt(EMPTY);
  const u = h / 60; // alles ist an einer 60-Pixel-Figur bemessen
  const P = (n: number) => Math.round(n * u);
  const cx = 40; // Mitte im Hilfspuffer
  const top = 10;
  const pose = f.pose ?? "stehend";

  const headR = P(7);
  const headY = top + headR;
  const neckY = headY + headR - P(1);
  const shoulderY = neckY + P(3);
  const hipY = shoulderY + P(21);
  const footY = top + P(60);
  const shoulderW = P(18);
  const waistW = P(14);

  // ----- Beine und Schuhe -----
  if (pose !== "theke") {
    const legW = P(6);
    if (pose === "sitzend") {
      // Oberschenkel waagerecht nach vorn, Unterschenkel senkrecht runter
      for (const dy of [0, P(5)]) {
        rect(s, cx - P(6), hipY - P(2) + dy, P(16), P(5), f.pants);
        hline(s, cx - P(6), hipY - P(2) + dy, P(16), f.pantsDark);
      }
      for (const dx of [P(4), P(9)]) {
        rect(s, cx + dx, hipY + P(6), legW - P(1), footY - hipY - P(10), f.pants);
        vline(s, cx + dx + legW - P(2), hipY + P(6), footY - hipY - P(10), f.pantsDark);
      }
      for (const dx of [P(3), P(8)]) {
        rect(s, cx + dx, footY - P(5), P(7), P(4), f.shoes);
        hline(s, cx + dx, footY - P(2), P(7), C.dark_grey);
      }
    } else {
      for (const dx of [-P(6), P(1)]) {
        rect(s, cx + dx, hipY - P(2), legW, footY - P(6) - hipY + P(2), f.pants);
        vline(s, cx + dx + legW - 1, hipY - P(2), footY - P(6) - hipY + P(2), f.pantsDark);
        vline(
          s,
          cx + dx + 1,
          hipY + P(2),
          footY - P(10) - hipY,
          f.pants === C.black ? C.dark_grey : f.pantsDark,
        );
      }
      // Lücke zwischen den Beinen
      vline(s, cx - P(1), hipY + P(2), footY - P(8) - hipY, C.black);
      for (const dx of [-P(7), P(1)]) {
        rect(s, cx + dx, footY - P(5), P(9), P(5), f.shoes);
        hline(s, cx + dx, footY - P(2), P(9), C.dark_grey);
        px(s, cx + dx + P(8), footY - P(4), C.dark_grey);
      }
    }
  }

  // ----- Oberkörper: Schultern breiter als Taille -----
  for (let j = shoulderY; j <= hipY; j++) {
    const t = (j - shoulderY) / Math.max(1, hipY - shoulderY);
    const w = Math.round(shoulderW - (shoulderW - waistW) * t);
    hline(s, cx - Math.floor(w / 2), j, w, f.top);
    px(s, cx - Math.floor(w / 2), j, f.topLight);
    px(s, cx - Math.floor(w / 2) + w - 1, j, f.topDark);
    if (j > shoulderY + P(1) && j < hipY - P(1)) px(s, cx + Math.floor(w / 4), j, f.topDark);
  }
  hline(s, cx - Math.floor(waistW / 2), hipY - P(1), waistW, C.black); // Gürtel
  hline(s, cx - Math.floor(shoulderW / 2), shoulderY, shoulderW, f.topLight); // Schulterkante
  vline(s, cx, shoulderY + P(2), hipY - shoulderY - P(3), f.topDark); // Reißverschluss

  if (f.apron !== undefined) {
    rect(s, cx - P(6), shoulderY + P(6), P(12), hipY - shoulderY - P(4), f.apron);
    hline(s, cx - P(6), shoulderY + P(6), P(12), C.white);
  }
  if (f.stripes !== undefined) {
    hline(s, cx - Math.floor(shoulderW / 2) + 1, shoulderY + P(8), shoulderW - 2, f.stripes);
    hline(s, cx - Math.floor(shoulderW / 2) + 1, shoulderY + P(10), shoulderW - 2, f.stripes);
  }
  if (f.backpack !== undefined) {
    rect(s, cx + Math.floor(shoulderW / 2) - P(2), shoulderY + P(2), P(6), P(12), f.backpack);
    hline(s, cx + Math.floor(shoulderW / 2) - P(2), shoulderY + P(2), P(6), C.dark_grey);
  }

  // ----- Arme -----
  const armW = P(5);
  const armTop = shoulderY + P(1);
  const armLen = pose === "theke" ? P(14) : P(18);
  for (const side of [-1, 1] as const) {
    const ax =
      side < 0 ? cx - Math.floor(shoulderW / 2) - armW + P(1) : cx + Math.floor(shoulderW / 2) - P(1);
    rect(s, ax, armTop, armW, armLen, f.top);
    vline(s, side < 0 ? ax : ax + armW - 1, armTop, armLen, side < 0 ? f.topLight : f.topDark);
    // Hand
    disc(s, ax + armW / 2, armTop + armLen + P(1), P(2.2), f.skin);
    px(s, Math.round(ax + armW / 2) + 1, armTop + armLen + P(1), f.skinShade);
  }
  if (f.can !== undefined) {
    const hx = cx + Math.floor(shoulderW / 2) + P(1);
    rect(s, hx, armTop + armLen + P(2), P(4), P(7), f.can);
    hline(s, hx, armTop + armLen + P(2), P(4), C.light_grey);
    px(s, hx + P(2), armTop + armLen + P(1), C.dark_grey);
  }

  // ----- Kopf -----
  rect(s, cx - P(2), neckY - P(2), P(4), P(4), f.skinShade); // Hals
  disc(s, cx, headY, headR, f.skin);
  rect(s, cx - headR + P(1), headY - P(1), P(12), P(6), f.skin);
  // Wange und Kinn schattieren
  for (let j = headY - P(1); j < headY + headR; j++) px(s, cx + headR - P(2), j, f.skinShade);
  // Augen, Braue, Mund, Ohr
  const eyeY = headY - P(1);
  px(s, cx - P(3), eyeY, C.black);
  px(s, cx + P(2), eyeY, C.black);
  px(s, cx - P(4), eyeY - P(2), f.hair);
  px(s, cx - P(3), eyeY - P(2), f.hair);
  px(s, cx + P(1), eyeY - P(2), f.hair);
  px(s, cx + P(2), eyeY - P(2), f.hair);
  hline(s, cx - P(2), headY + P(3), P(4), f.skinShade);
  px(s, cx - headR + P(1), headY + P(1), f.skinShade);
  if (f.beard !== undefined) {
    // Nur Kinn und Wangenrand, nicht das halbe Gesicht
    for (let j = headY + P(3); j < headY + headR; j++) {
      const t = (j - (headY + P(3))) / Math.max(1, headR - P(3));
      const w = Math.round(P(8) * (1 - t * 0.55));
      hline(s, cx - Math.floor(w / 2), j, w, f.beard);
    }
    px(s, cx - P(5), headY + P(2), f.beard);
    px(s, cx + P(4), headY + P(2), f.beard);
  }

  // Frisur, Mütze, Kapuze
  if (f.hood) {
    disc(s, cx, headY - P(1), headR + P(2), f.top);
    disc(s, cx, headY - P(1), headR + P(1), f.topDark);
    disc(s, cx + P(1), headY + P(1), headR - P(1), f.skinShade); // Gesicht im Schatten
    hline(s, cx - P(3), eyeY, P(2), C.black);
    hline(s, cx + P(2), eyeY, P(2), C.black);
    hline(s, cx - P(1), headY + P(3), P(3), C.black); // Mund
    rect(s, cx - P(3), headY + headR - P(1), P(3), P(5), f.topLight); // Kordel
    rect(s, cx + P(1), headY + headR - P(1), P(3), P(4), f.topLight);
  } else if (f.cap !== undefined) {
    for (let j = headY - headR - P(1); j <= headY - P(2); j++) {
      const t = (j - (headY - headR - P(1))) / Math.max(1, headR);
      const w = Math.round((headR * 2 - P(1)) * Math.min(1, 0.6 + t));
      hline(s, cx - Math.floor(w / 2), j, w, f.cap);
    }
    hline(s, cx - headR - P(2), headY - P(3), headR * 2 + P(3), f.cap); // Schirm
    hline(s, cx - headR - P(2), headY - P(2), headR * 2 + P(3), C.dark_grey);
    px(s, cx - P(3), eyeY, C.black);
    px(s, cx + P(2), eyeY, C.black);
    if (f.badge !== undefined) rect(s, cx - P(1), headY - headR + P(1), P(3), P(3), f.badge);
  } else {
    for (let j = headY - headR - P(1); j <= headY + P(1); j++) {
      const dy = (j - headY) / headR;
      const w = Math.round(headR * 2 * Math.sqrt(Math.max(0, 1 - dy * dy)) + P(1));
      if (j < headY - P(2) || true) hline(s, cx - Math.floor(w / 2), j, w, f.hair);
    }
    disc(s, cx, headY + P(1), headR - P(1), f.skin); // Gesicht wieder frei
    rect(s, cx - headR, headY - P(3), P(3), P(6), f.hair); // Seitenpartie
    rect(s, cx + headR - P(3), headY - P(3), P(3), P(6), f.hair);
    px(s, cx - P(3), eyeY, C.black);
    px(s, cx + P(2), eyeY, C.black);
    hline(s, cx - P(2), headY + P(3), P(4), f.skinShade);
    if (f.ponytail) {
      rect(s, cx + headR - P(1), headY - P(1), P(4), P(12), f.hair);
      disc(s, cx + headR + P(1), headY + P(10), P(2), f.hair);
    }
  }

  // ----- Mit Kontur ins Bild setzen -----
  const W = 80;
  const H = 90;
  const ox = x - Math.round(cx - h * 0.15);
  const oy = y - top;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const v = s[j * 320 + i]!;
      if (v === EMPTY) continue;
      // Kontur: leere Nachbarn schwarz färben
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as [number, number][]) {
        if (s[(j + dy) * 320 + i + dx] === EMPTY) px(a, ox + i + dx, oy + j + dy, C.black);
      }
    }
  }
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const v = s[j * 320 + i]!;
      if (v !== EMPTY) px(a, ox + i, oy + j, v);
    }
  }
}

// Die vier Leute aus dem Spiel.
export const KALLE: Figure = {
  skin: C.orange,
  skinShade: C.brown,
  hair: C.dark_grey,
  beard: C.dark_grey,
  top: C.blue,
  topLight: C.light_blue,
  topDark: C.black,
  pants: C.dark_grey,
  pantsDark: C.black,
  shoes: C.black,
  cap: C.dark_grey,
  can: C.light_grey,
  pose: "sitzend",
};

export const SIBEL: Figure = {
  skin: C.orange,
  skinShade: C.brown,
  hair: C.black,
  top: C.light_red,
  topLight: C.white,
  topDark: C.red,
  pants: C.blue,
  pantsDark: C.black,
  shoes: C.black,
  apron: C.purple,
  ponytail: true,
  pose: "theke",
};

export const KRUX: Figure = {
  skin: C.orange,
  skinShade: C.brown,
  hair: C.black,
  top: C.dark_grey,
  topLight: C.grey,
  topDark: C.black,
  pants: C.black,
  pantsDark: C.black,
  shoes: C.dark_grey,
  hood: true,
  backpack: C.brown,
  can: C.purple,
};

export const BRANDT: Figure = {
  skin: C.orange,
  skinShade: C.brown,
  hair: C.brown,
  top: C.blue,
  topLight: C.light_blue,
  topDark: C.black,
  pants: C.blue,
  pantsDark: C.black,
  shoes: C.black,
  cap: C.blue,
  badge: C.yellow,
  stripes: C.light_grey,
};
