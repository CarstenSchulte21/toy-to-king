// Raumbilder (Grafik-Schritt): Jeder Room hat sein Bild, und die Bilder entstehen reproduzierbar.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateContent } from "../../scripts/lib/validate-content";
import { ART_H, ART_W, toRgba } from "../../scripts/lib/art";
import { encodePng } from "../../scripts/lib/png";
import { DARK_ROOMS, SCENES, drawRoom } from "../../scripts/lib/rooms-art";
import { readContentFiles } from "../helpers/content-files";

const content = validateContent(readContentFiles()).content!;

describe("Raumbilder", () => {
  it("jeder Room hat ein Hintergrundbild, und das Bild liegt in public/art", () => {
    for (const room of Object.values(content.rooms)) {
      expect(room.background, room.id).toBe(`${room.id}.png`);
      expect(() => readFileSync(`public/art/${room.background}`), room.id).not.toThrow();
    }
  });

  it("zu jedem Bild gibt es eine Szene, und sie wird immer gleich gezeichnet", () => {
    for (const id of Object.keys(content.rooms)) {
      expect(SCENES[id], id).toBeDefined();
      const png = encodePng(toRgba(drawRoom(id)!), ART_W, ART_H);
      expect(Buffer.compare(png, readFileSync(`public/art/${id}.png`)), id).toBe(0);
    }
  });

  it("zu jedem Raum gibt es eine Nachtfassung", () => {
    for (const id of Object.keys(content.rooms)) {
      expect(() => readFileSync(`public/art/${id}-night.png`), id).not.toThrow();
    }
  });

  // Der Lichtschalter an der Laterne muss man sehen, sonst ist er nur eine Zahl.
  it("wo man das Licht ausmachen kann, gibt es auch ein Bild dafür", () => {
    for (const id of DARK_ROOMS) {
      expect(SCENES[id], id).toBeDefined();
      expect(() => readFileSync(`public/art/${id}-dark.png`), id).not.toThrow();
      const hell = encodePng(toRgba(drawRoom(id)!), ART_W, ART_H);
      const dunkel = encodePng(toRgba(drawRoom(id, 7, { lightOff: true })!), ART_W, ART_H);
      expect(Buffer.compare(hell, dunkel), `${id}: Licht aus sieht aus wie Licht an`).not.toBe(0);
    }
  });

  it("die Bilder haben die Größe der Bühne", () => {
    for (const id of Object.keys(content.rooms)) {
      const png = readFileSync(`public/art/${id}.png`);
      expect(png.readUInt32BE(16), id).toBe(ART_W);
      expect(png.readUInt32BE(20), id).toBe(ART_H);
    }
  });
});
