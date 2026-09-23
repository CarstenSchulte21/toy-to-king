// Die Leute im Spiel. Nach dem Tester-Feedback („zu kindlich, Gesichter sind Punkte und ein Strich")
// sind die Sprites erwachsener gebaut: kleinerer Kopf im Verhältnis zum Körper, Gesicht mit Lidschatten,
// Augenweiß, Braue, Nase, Lippen und Kinnpartie – in vier Hauttönen aus der erweiterten Palette.
import { C, disc, hline, newArt, px, rect, vline, type Art } from "./art";

const EMPTY = 255;

type Body = {
  skin: number;
  skinLight: number;
  skinShade: number;
  skinDeep: number;
  hair: number;
  hairLight: number;
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
  capDark?: number;
  beanie?: boolean; // Mütze ohne Schirm
  hood?: boolean;
  stubble?: number; // Dreitagebart
  beard?: number; // Vollbart
  apron?: number;
  stripes?: number; // Reflexstreifen
  badge?: number;
  can?: number; // Dose in der Hand
  ponytail?: boolean;
  backpack?: number;
  age?: boolean; // Falten
};

export function character(a: Art, x: number, y: number, h: number, f: Figure): void {
  const s = newArt(EMPTY);
  const u = h / 60;
  const P = (n: number) => Math.max(1, Math.round(n * u));
  const cx = 40;
  const top = 8;
  const pose = f.pose ?? "stehend";

  // Erwachsene Proportionen: Kopf gut ein Sechstel der Gesamthöhe.
  const headW = P(11);
  const headH = P(13);
  const headX = cx - Math.floor(headW / 2);
  const headY = top;
  const chinY = headY + headH;
  const shoulderY = chinY + P(3);
  const hipY = shoulderY + P(20);
  const footY = top + P(60);
  const shoulderW = P(20);
  const waistW = P(15);

  // ---------- Beine ----------
  if (pose !== "theke") {
    const legW = P(7);
    if (pose === "sitzend") {
      for (let k = 0; k < 2; k++) {
        rect(s, cx - P(7), hipY - P(2) + k * P(5), P(17), P(5), f.pants);
        hline(s, cx - P(7), hipY - P(2) + k * P(5), P(17), f.pantsDark);
      }
      for (const dx of [P(4), P(10)]) {
        rect(s, cx + dx, hipY + P(6), legW - P(2), footY - hipY - P(10), f.pants);
        vline(s, cx + dx + legW - P(3), hipY + P(6), footY - hipY - P(10), f.pantsDark);
      }
      for (const dx of [P(3), P(9)]) {
        rect(s, cx + dx, footY - P(5), P(7), P(4), f.shoes);
        hline(s, cx + dx, footY - P(2), P(7), C.grey_mid);
      }
    } else {
      for (const dx of [-P(7), P(1)]) {
        rect(s, cx + dx, hipY - P(2), legW, footY - P(5) - hipY, f.pants);
        vline(s, cx + dx, hipY - P(2), footY - P(5) - hipY, f.pantsDark);
        vline(s, cx + dx + legW - 1, hipY - P(2), footY - P(5) - hipY, f.pantsDark);
        vline(s, cx + dx + 2, hipY + P(2), footY - P(11) - hipY, f.pants);
      }
      vline(s, cx - P(1), hipY + P(1), footY - P(8) - hipY, C.black);
      for (const dx of [-P(8), P(1)]) {
        rect(s, cx + dx, footY - P(4), P(9), P(4), f.shoes);
        hline(s, cx + dx, footY - P(1), P(9), C.grey_mid);
        px(s, cx + dx + P(8), footY - P(3), C.grey_mid);
      }
    }
  }

  // ---------- Oberkörper ----------
  for (let j = shoulderY; j <= hipY; j++) {
    const t = (j - shoulderY) / Math.max(1, hipY - shoulderY);
    const w = Math.round(shoulderW - (shoulderW - waistW) * t);
    hline(s, cx - Math.floor(w / 2), j, w, f.top);
    px(s, cx - Math.floor(w / 2), j, f.topLight);
    px(s, cx - Math.floor(w / 2) + 1, j, f.topLight);
    px(s, cx + Math.floor(w / 2) - 1, j, f.topDark);
    px(s, cx + Math.floor(w / 2) - 2, j, f.topDark);
  }
  hline(s, cx - Math.floor(shoulderW / 2), shoulderY, shoulderW, f.topLight);
  hline(s, cx - Math.floor(shoulderW / 2) + 1, shoulderY + 1, shoulderW - 2, f.topLight);
  vline(s, cx, shoulderY + P(3), hipY - shoulderY - P(4), f.topDark); // Reißverschluss
  hline(s, cx - Math.floor(waistW / 2), hipY - P(1), waistW, C.black); // Gürtel
  px(s, cx, hipY - P(1), C.grey_soft); // Schnalle

  // Kragen
  hline(s, cx - P(3), shoulderY, P(7), f.topDark);
  px(s, cx - P(3), shoulderY + 1, f.topDark);
  px(s, cx + P(3), shoulderY + 1, f.topDark);

  if (f.apron !== undefined) {
    rect(s, cx - P(7), shoulderY + P(6), P(14), hipY - shoulderY - P(4), f.apron);
    hline(s, cx - P(7), shoulderY + P(6), P(14), C.white);
    vline(s, cx - P(7), shoulderY + P(6), hipY - shoulderY - P(4), C.white);
  }
  if (f.stripes !== undefined) {
    hline(s, cx - Math.floor(shoulderW / 2) + 1, shoulderY + P(7), shoulderW - 2, f.stripes);
    hline(s, cx - Math.floor(shoulderW / 2) + 2, shoulderY + P(9), shoulderW - 4, f.stripes);
    rect(s, cx - Math.floor(shoulderW / 2) + 1, shoulderY + P(2), P(4), P(3), C.grey_darker); // Funkgerät
  }
  if (f.backpack !== undefined) {
    rect(s, cx + Math.floor(shoulderW / 2) - P(2), shoulderY + P(2), P(6), P(13), f.backpack);
    hline(s, cx + Math.floor(shoulderW / 2) - P(2), shoulderY + P(2), P(6), C.dark_brown);
    vline(s, cx + Math.floor(shoulderW / 2) - P(2), shoulderY + P(2), P(13), C.tan);
  }

  // ---------- Arme ----------
  const armW = P(6);
  const armTop = shoulderY + P(1);
  const armLen = pose === "theke" ? P(13) : P(19);
  for (const side of [-1, 1] as const) {
    const ax =
      side < 0 ? cx - Math.floor(shoulderW / 2) - armW + P(2) : cx + Math.floor(shoulderW / 2) - P(2);
    rect(s, ax, armTop, armW, armLen, f.top);
    vline(s, side < 0 ? ax : ax + armW - 1, armTop, armLen, side < 0 ? f.topLight : f.topDark);
    hline(s, ax, armTop + armLen - P(3), armW, f.topDark); // Ärmelbund
    rect(s, ax + 1, armTop + armLen, armW - 2, P(4), f.skin);
    px(s, ax + 1, armTop + armLen + 1, f.skinLight);
    px(s, ax + armW - 2, armTop + armLen + P(2), f.skinShade);
  }
  if (f.can !== undefined) {
    const hx = cx + Math.floor(shoulderW / 2) + P(1);
    const hy = armTop + armLen + P(1);
    rect(s, hx, hy, P(5), P(8), f.can);
    vline(s, hx, hy, P(8), C.grey_pale);
    vline(s, hx + P(4), hy, P(8), C.grey_mid);
    rect(s, hx + P(1), hy - P(2), P(3), P(2), C.grey_soft); // Cap auf der Dose
  }

  // ---------- Kopf ----------
  rect(s, cx - P(2), chinY - P(1), P(4), P(4), f.skinShade); // Hals
  hline(s, cx - P(2), chinY - P(1), P(4), f.skinDeep); // Schatten unterm Kinn

  for (let j = 0; j < headH; j++) {
    const t = j / (headH - 1);
    let w = headW;
    if (t < 0.18) w = headW - Math.round((0.18 - t) * P(10));
    if (t > 0.62) w = headW - Math.round((t - 0.62) * P(9));
    const x0 = cx - Math.floor(w / 2);
    hline(s, x0, headY + j, w, f.skin);
    px(s, x0, headY + j, f.skinLight);
    px(s, x0 + 1, headY + j, f.skinLight);
    px(s, x0 + w - 1, headY + j, f.skinShade);
    px(s, x0 + w - 2, headY + j, f.skinShade);
  }
  px(s, headX - 1, headY + P(6), f.skin); // Ohren
  px(s, headX - 1, headY + P(7), f.skinShade);
  px(s, headX + headW, headY + P(6), f.skinShade);

  // Augenpartie
  const eyeY = headY + P(6);
  for (const ex of [cx - P(3), cx + P(1)]) {
    hline(s, ex, eyeY - 1, P(3), f.skinShade); // Lidschatten
    hline(s, ex, eyeY, P(3), C.white);
    px(s, ex + 1, eyeY, C.black);
    px(s, ex, eyeY + 1, f.skinShade);
  }
  hline(s, cx - P(4), eyeY - P(2), P(4), f.hair); // Brauen
  hline(s, cx + P(1), eyeY - P(2), P(4), f.hair);

  // Nase und Mund
  vline(s, cx, eyeY + P(1), P(2), f.skinShade);
  px(s, cx - 1, eyeY + P(2), f.skinDeep);
  hline(s, cx - P(2), eyeY + P(4), P(4), f.skinDeep);
  hline(s, cx - P(1), eyeY + P(5), P(3), f.skinLight); // Unterlippe

  if (f.age) {
    px(s, cx - P(4), eyeY + P(2), f.skinShade);
    px(s, cx + P(3), eyeY + P(2), f.skinShade);
    hline(s, cx - P(4), headY + P(3), P(3), f.skinShade);
  }
  if (f.stubble !== undefined) {
    for (let j = eyeY + P(3); j < chinY; j++)
      for (let i = cx - P(4); i < cx + P(4); i++) if ((i + j) % 2 === 0) px(s, i, j, f.stubble);
  }
  if (f.beard !== undefined) {
    // Bart mit Struktur: zwei Töne im Wechsel, Mund bleibt frei
    for (let j = eyeY + P(4); j < chinY + P(1); j++) {
      const t = (j - (eyeY + P(4))) / Math.max(1, chinY - eyeY - P(3));
      const w = Math.round(P(8) * (1 - t * 0.35));
      for (let i = cx - Math.floor(w / 2); i < cx - Math.floor(w / 2) + w; i++)
        px(s, i, j, (i + j) % 2 === 0 ? f.beard : f.skinShade);
    }
    hline(s, cx - P(3), eyeY + P(3), P(6), f.beard); // Schnurrbart
    hline(s, cx - P(2), eyeY + P(4), P(4), f.skinDeep); // Mund
    px(s, cx - P(2), eyeY + P(5), f.beard);
    px(s, cx + P(1), eyeY + P(5), f.beard);
  }

  // ---------- Kopfbedeckung und Haare ----------
  if (f.hood) {
    // Kapuze: hinten hoch, vorne eine Öffnung, unten am Kragen breit
    for (let j = headY - P(5); j < chinY + P(3); j++) {
      const t = (j - (headY - P(5))) / (headH + P(8));
      const w = Math.round(headW + P(3) + Math.sin(Math.min(1, t) * Math.PI) * P(7));
      hline(s, cx - Math.floor(w / 2), j, w, f.topDark);
      hline(s, cx - Math.floor(w / 2) + 1, j, P(2), f.top);
      px(s, cx + Math.floor(w / 2) - 1, j, C.black);
    }
    // Gesichtsöffnung
    for (let j = headY + P(1); j < chinY; j++) {
      const t = (j - (headY + P(1))) / Math.max(1, headH - P(1));
      const w = Math.round(headW - P(1) - Math.abs(t - 0.45) * P(5));
      hline(s, cx - Math.floor(w / 2) + P(1), j, w, f.skinShade);
      px(s, cx - Math.floor(w / 2) + P(1), j, f.skin);
    }
    for (const ex of [cx - P(2), cx + P(2)]) {
      hline(s, ex, eyeY, P(2), C.grey_pale);
      px(s, ex, eyeY, C.black);
    }
    hline(s, cx - P(3), eyeY - P(2), P(3), C.black); // Brauen im Schatten
    hline(s, cx + P(1), eyeY - P(2), P(3), C.black);
    hline(s, cx - P(1), eyeY + P(4), P(3), f.skinDeep);
    rect(s, cx - P(4), chinY + P(2), P(3), P(5), f.topLight); // Kordeln
    rect(s, cx + P(2), chinY + P(2), P(3), P(4), f.topLight);
  } else if (f.cap !== undefined) {
    const capDark = f.capDark ?? f.cap;
    if (f.beanie) {
      // Mütze: sitzt eng, unten ein umgeschlagener Rand
      for (let j = headY - P(4); j <= headY + P(4); j++) {
        const t = (j - (headY - P(4))) / P(8);
        const w = Math.round(headW * Math.min(1, 0.5 + t * 0.9) + P(1));
        hline(s, cx - Math.floor(w / 2), j, w, f.cap);
        px(s, cx - Math.floor(w / 2), j, capDark);
        px(s, cx + Math.floor(w / 2) - 1, j, capDark);
      }
      hline(s, headX - P(1), headY + P(3), headW + P(2), f.cap);
      hline(s, headX - P(1), headY + P(4), headW + P(2), capDark);
      for (let i = headX; i < headX + headW; i += 3) px(s, i, headY - P(2), capDark); // Strickmuster
    } else {
      for (let j = headY - P(3); j <= headY + P(4); j++) {
        const t = (j - (headY - P(3))) / P(7);
        const w = Math.round(headW * Math.min(1, 0.55 + t * 0.8) + P(1));
        hline(s, cx - Math.floor(w / 2), j, w, f.cap);
        px(s, cx - Math.floor(w / 2), j, capDark);
        px(s, cx + Math.floor(w / 2) - 1, j, capDark);
      }
      hline(s, headX - P(3), headY + P(4), headW + P(5), f.cap); // Schirm
      hline(s, headX - P(3), headY + P(5), headW + P(5), capDark);
    }
    if (f.badge !== undefined) {
      rect(s, cx - P(2), headY - P(1), P(4), P(3), f.badge);
      px(s, cx, headY, C.black);
    }
  } else {
    for (let j = headY - P(2); j < headY + P(5); j++) {
      const t = (j - (headY - P(2))) / P(7);
      const w = Math.round(headW * Math.min(1, 0.6 + t * 0.7) + P(1));
      hline(s, cx - Math.floor(w / 2), j, w, f.hair);
    }
    hline(s, cx - P(3), headY - P(1), P(5), f.hairLight); // Lichtkante im Haar
    vline(s, headX, headY + P(3), P(5), f.hair); // Koteletten
    vline(s, headX + headW - 1, headY + P(3), P(5), f.hair);
    if (f.ponytail) {
      rect(s, headX + headW - P(1), headY + P(2), P(4), P(13), f.hair);
      vline(s, headX + headW - P(1), headY + P(2), P(13), f.hairLight);
      disc(s, headX + headW + P(1), headY + P(15), P(2), f.hair);
    }
  }

  // ---------- Mit schwarzer Kontur ins Bild ----------
  const W = 80;
  const H = 96;
  const ox = x - Math.round(cx - h * 0.15);
  const oy = y - top;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (s[j * 320 + i]! === EMPTY) continue;
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
  skin: C.skin,
  skinLight: C.skin_light,
  skinShade: C.skin_dark,
  skinDeep: C.skin_deep,
  hair: C.grey_mid,
  hairLight: C.grey_soft,
  top: C.steel,
  topLight: C.light_blue,
  topDark: C.navy,
  pants: C.grey_mid,
  pantsDark: C.grey_darker,
  shoes: C.grey_darker,
  cap: C.grey_darker,
  capDark: C.black,
  beanie: true,
  beard: C.grey_soft,
  stubble: undefined,
  age: true,
  can: C.light_grey,
  pose: "sitzend",
};

export const SIBEL: Figure = {
  skin: C.skin,
  skinLight: C.skin_light,
  skinShade: C.skin_dark,
  skinDeep: C.skin_deep,
  hair: C.grey_darker,
  hairLight: C.grey_mid,
  top: C.light_red,
  topLight: C.white,
  topDark: C.red,
  pants: C.navy,
  pantsDark: C.grey_darker,
  shoes: C.black,
  apron: C.purple,
  ponytail: true,
  pose: "theke",
};

export const KRUX: Figure = {
  skin: C.skin_dark,
  skinLight: C.skin,
  skinShade: C.skin_deep,
  skinDeep: C.dark_brown,
  hair: C.black,
  hairLight: C.grey_darker,
  top: C.grey_mid,
  topLight: C.grey_soft,
  topDark: C.grey_darker,
  pants: C.grey_darker,
  pantsDark: C.black,
  shoes: C.black,
  hood: true,
  backpack: C.dark_brown,
  can: C.purple,
};

export const BRANDT: Figure = {
  skin: C.skin_light,
  skinLight: C.white,
  skinShade: C.skin,
  skinDeep: C.skin_dark,
  hair: C.dark_brown,
  hairLight: C.tan,
  top: C.navy,
  topLight: C.steel,
  topDark: C.black,
  pants: C.navy,
  pantsDark: C.grey_darker,
  shoes: C.black,
  cap: C.navy,
  capDark: C.black,
  badge: C.yellow,
  stripes: C.grey_soft,
};
