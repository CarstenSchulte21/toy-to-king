// Liest alle echten Inhaltsdateien – wie scripts/build-content.ts.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentFile } from "../../scripts/lib/validate-content";

export function readContentFiles(dir = "content"): ContentFile[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).split("\\").join("/");
    if (entry.isDirectory()) return readContentFiles(path);
    return /\.ya?ml$/.test(entry.name) ? [{ path, text: readFileSync(path, "utf8") }] : [];
  });
}
