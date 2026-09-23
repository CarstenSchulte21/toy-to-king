// Erzeugt die Raumbilder als PNG in public/art/. Läuft bei Bedarf: npm run art
// Zu jedem Raum entsteht zusätzlich eine Nachtfassung (<room>-night.png) aus derselben Szene.
import { mkdirSync, writeFileSync } from "node:fs";
import { ART_H, ART_W, rng, toNight, toRgba } from "./lib/art";
import { encodePng } from "./lib/png";
import { NIGHT_OVERLAYS, SCENES, drawRoom } from "./lib/rooms-art";

const outDir = "public/art";
mkdirSync(outDir, { recursive: true });
for (const id of Object.keys(SCENES)) {
  const art = drawRoom(id)!;
  writeFileSync(`${outDir}/${id}.png`, encodePng(toRgba(art), ART_W, ART_H));
  const night = toNight(art);
  NIGHT_OVERLAYS[id]?.(night, rng(id.length + 11));
  writeFileSync(`${outDir}/${id}-night.png`, encodePng(toRgba(night), ART_W, ART_H));
  console.log(`✔ ${outDir}/${id}.png (+ Nacht)`);
}
