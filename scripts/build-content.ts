// Liest alle YAML-Dateien aus content/, prüft sie und schreibt src/generated/content.json.
// Läuft automatisch vor "npm run dev" und "npm run build". Einzeln: npm run content:check
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { validateContent, type ContentFile } from "./lib/validate-content";

const root = process.cwd();

function collect(dir: string): ContentFile[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    if (!/\.ya?ml$/.test(entry.name)) return [];
    return [{ path: relative(root, full).split("\\").join("/"), text: readFileSync(full, "utf8") }];
  });
}

const files = collect(join(root, "content")).sort((a, b) => a.path.localeCompare(b.path));
const { content, errors, warnings } = validateContent(files);

for (const w of warnings) console.warn(`⚠ Warnung: ${w}`);
if (errors.length > 0 || !content) {
  for (const e of errors) console.error(`✖ Fehler: ${e}`);
  console.error(`\nInhalte fehlerhaft: ${errors.length} Fehler. Bitte korrigieren, dann erneut starten.`);
  process.exit(1);
}

mkdirSync(join(root, "src/generated"), { recursive: true });
writeFileSync(join(root, "src/generated/content.json"), JSON.stringify(content, null, 2) + "\n");
console.log(
  `✔ Inhalte ok: ${Object.keys(content.rooms).length} Room(s), ${files.length} Datei(en)` +
    (warnings.length ? `, ${warnings.length} Warnung(en)` : "") +
    ".",
);
