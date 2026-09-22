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
] as const;

export type PaletteKey = (typeof PALETTE)[number]["key"];
export const PALETTE_KEYS = PALETTE.map((p) => p.key) as unknown as readonly [PaletteKey, ...PaletteKey[]];

// Index 255 = durchsichtig (dort ist die Wand zu sehen).
export const TRANSPARENT = 255;

export function paletteIndex(key: PaletteKey): number {
  return PALETTE.findIndex((p) => p.key === key);
}
