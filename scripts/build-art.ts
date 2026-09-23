// Erzeugt die Raumbilder als PNG in public/art/. Läuft bei Bedarf: npm run art
// Zu jedem Raum entsteht zusätzlich eine Nachtfassung (<room>-night.png) aus derselben Szene.
import { mkdirSync, writeFileSync } from "node:fs";
import { ART_H, ART_W, toNight, toRgba } from "./lib/art";
import { encodePng } from "./lib/png";
import { SCENES, drawRoom } from "./lib/rooms-art";

const outDir = "public/art";
mkdirSync(outDir, { recursive: true });
for (const id of Object.keys(SCENES)) {
  const art = drawRoom(id)!;
  writeFileSync(`${outDir}/${id}.png`, encodePng(toRgba(art), ART_W, ART_H));
  writeFileSync(`${outDir}/${id}-night.png`, encodePng(toRgba(toNight(art)), ART_W, ART_H));
  console.log(`✔ ${outDir}/${id}.png (+ Nacht)`);
}
