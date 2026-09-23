// Die C64-Palette des Spiels. Werke werden als Palettenindex gespeichert, nicht als RGB.
export const PALETTE = [
  { key: "black", rgb: [0, 0, 0] },
  { key: "white", rgb: [255, 255, 255] },
  { key: "red", rgb: [136, 0, 0] },
  { key: "cyan", rgb: [170, 255, 238] },
  { key: "purple", rgb: [204, 68, 204] },
  { key: "green", rgb: [0, 204, 85] },
  { key: "blue", rgb: [0, 0, 170] },
  { key: "yellow", rgb: [238, 238, 119] },
  { key: "orange", rgb: [221, 136, 85] },
  { key: "brown", rgb: [102, 68, 0] },
  { key: "light_red", rgb: [255, 119, 119] },
  { key: "dark_grey", rgb: [51, 51, 51] },
  { key: "grey", rgb: [119, 119, 119] },
  { key: "light_green", rgb: [170, 255, 102] },
  { key: "light_blue", rgb: [0, 136, 255] },
  { key: "light_grey", rgb: [187, 187, 187] },
  // Zweite Hälfte (32 statt 16 Farben): Zwischentöne für Haut, Stoff, Metall und Nacht.
  // Die ersten 16 bleiben unverändert – gespeicherte Werke sehen damit genauso aus wie vorher.
  { key: "skin_light", rgb: [255, 204, 153] },
  { key: "skin", rgb: [221, 153, 102] },
  { key: "skin_dark", rgb: [170, 102, 68] },
  { key: "skin_deep", rgb: [119, 68, 51] },
  { key: "grey_darker", rgb: [34, 34, 34] },
  { key: "grey_mid", rgb: [85, 85, 85] },
  { key: "grey_soft", rgb: [153, 153, 153] },
  { key: "grey_pale", rgb: [221, 221, 221] },
  { key: "navy", rgb: [34, 51, 102] },
  { key: "steel", rgb: [68, 102, 170] },
  { key: "sky", rgb: [102, 204, 255] },
  { key: "moss", rgb: [85, 119, 51] },
  { key: "forest", rgb: [34, 85, 51] },
  { key: "tan", rgb: [187, 136, 85] },
  { key: "dark_brown", rgb: [68, 51, 34] },
  { key: "rust", rgb: [170, 68, 34] },
] as const;

export type PaletteKey = (typeof PALETTE)[number]["key"];
export const PALETTE_KEYS = PALETTE.map((p) => p.key) as unknown as readonly [PaletteKey, ...PaletteKey[]];

// Index 255 = durchsichtig (dort ist die Wand zu sehen).
export const TRANSPARENT = 255;

export function paletteIndex(key: PaletteKey): number {
  return PALETTE.findIndex((p) => p.key === key);
}
