import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateContent, type ContentFile } from "../../scripts/lib/validate-content";

const config = `start_room: hof\n`;

function room(body: string, id = "hof"): ContentFile {
  return { path: `content/rooms/${id}.yaml`, text: `id: ${id}\nname: Hof\nhotspots:\n${body}` };
}

function run(...rooms: ContentFile[]) {
  return validateContent([{ path: "content/config.yaml", text: config }, ...rooms]);
}

const okHotspot = `  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    untersuchen: "Eine Tonne."\n`;

describe("validateContent", () => {
  it("akzeptiert gültigen Inhalt", () => {
    const r = run(room(okHotspot));
    expect(r.errors).toEqual([]);
    expect(r.content?.rooms.hof?.hotspots[0]?.id).toBe("tonne");
  });

  it("akzeptiert die echten Inhalte aus content/", () => {
    const read = (p: string) => ({ path: p, text: readFileSync(p, "utf8") });
    const files = [
      read("content/config.yaml"),
      ...readdirSync("content/rooms").map((f) => read(`content/rooms/${f}`)),
    ];
    const r = validateContent(files);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("meldet kaputtes YAML mit Zeilennummer", () => {
    const r = run({ path: "content/rooms/hof.yaml", text: "id: hof\nname: Hof\n hotspots: [" });
    expect(r.errors[0]).toMatch(/content\/rooms\/hof\.yaml, Zeile \d+: Die Datei ist kein gültiges YAML/);
  });

  it("meldet fehlende Pflichtfelder mit lesbarer Stelle", () => {
    const r = run(room(`  - id: tonne\n    rect: [10, 10, 30, 30]\n    untersuchen: "x"\n`));
    expect(r.errors).toEqual(['content/rooms/hof.yaml, Hotspot "tonne", Feld "label": Pflichtfeld fehlt.']);
  });

  it("meldet Tippfehler in Feldnamen", () => {
    const r = run(room(`  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    untersuchn: "x"\n`));
    expect(r.errors).toEqual([
      'content/rooms/hof.yaml, Hotspot "tonne": Unbekanntes Feld "untersuchn". Meintest du "untersuchen"?',
    ]);
  });

  it("zeigt bei Textvarianten genau auf die falsche Stelle", () => {
    const r = run(
      room(
        `  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    untersuchen:\n      - if: [{flag: a}]\n        txt: "x"\n`,
      ),
    );
    expect(r.errors.join("\n")).toContain(
      'Feld "untersuchen", Eintrag 1: Unbekanntes Feld "txt". Meintest du "text"?',
    );
  });

  it("meldet gemischte Texte und Varianten verständlich", () => {
    const r = run(
      room(
        `  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    untersuchen:\n      - if: [{flag: a}]\n        text: "x"\n      - "y"\n`,
      ),
    );
    expect(r.errors.join("\n")).toContain("nicht gemischt");
  });

  it("meldet bei vertipptem Pflichtfeld nur den Tippfehler", () => {
    const r = run(
      room(`  - id: tonne\n    lable: Tonne\n    rect: [10, 10, 30, 30]\n    untersuchen: "x"\n`),
    );
    expect(r.errors).toEqual([
      'content/rooms/hof.yaml, Hotspot "tonne": Unbekanntes Feld "lable". Meintest du "label"?',
    ]);
  });

  it("verlangt mindestens ein Verb", () => {
    const r = run(room(`  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n`));
    expect(r.errors.join("\n")).toContain("mindestens ein Verb");
  });

  it("meldet doppelte Hotspot-IDs", () => {
    const r = run(room(okHotspot + okHotspot));
    expect(r.errors.join("\n")).toContain("zweimal");
  });

  it("meldet unbekannte gehen-Ziele mit Tippfehler-Vorschlag", () => {
    const r = run(
      room(`  - id: tor\n    label: Tor\n    rect: [0, 0, 20, 20]\n    gehen: strase\n`),
      room(`  - id: laterne\n    label: Laterne\n    rect: [0, 0, 20, 20]\n    gehen: hof\n`, "strasse"),
    );
    expect(r.errors).toContain(
      'content/rooms/hof.yaml, Hotspot "tor": "gehen" zeigt auf "strase" – diesen Room gibt es nicht. Meintest du "strasse"?',
    );
  });

  it("meldet einen fehlenden Start-Room", () => {
    const r = validateContent([{ path: "content/config.yaml", text: "start_room: hoff\n" }, room(okHotspot)]);
    expect(r.errors.join("\n")).toContain('Meintest du "hof"?');
  });

  it("meldet rect außerhalb der Bühne", () => {
    const r = run(
      room(`  - id: tonne\n    label: Tonne\n    rect: [300, 10, 30, 30]\n    untersuchen: "x"\n`),
    );
    expect(r.errors.join("\n")).toContain("ragt aus der Bühne");
  });

  it("meldet id, die nicht zum Dateinamen passt", () => {
    const r = run({ path: "content/rooms/hinterhof.yaml", text: `id: hof\nname: Hof\nhotspots: []\n` });
    expect(r.errors.join("\n")).toContain('muss "hinterhof" heißen');
  });

  it("meldet unbekannte Platzhalter", () => {
    const r = run(
      room(`  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    untersuchen: "Hi {spieler}"\n`),
    );
    expect(r.errors.join("\n")).toContain("Unbekannter Platzhalter {spieler}");
  });

  it("meldet visited auf unbekannten Room", () => {
    const r = run(
      room(
        `  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    if: [{visited: strase}]\n    untersuchen: "x"\n`,
      ),
    );
    expect(r.errors.join("\n")).toContain('"visited" zeigt auf "strase"');
  });

  it("meldet unbekannte Bedingungen", () => {
    const r = run(
      room(
        `  - id: tonne\n    label: Tonne\n    rect: [10, 10, 30, 30]\n    if: [{flg: x}]\n    untersuchen: "x"\n`,
      ),
    );
    expect(r.errors.join("\n")).toMatch(/Bedingung|flg/);
  });

  it("warnt bei zu langen Texten, {crew} und kleinen Hotspots, ohne den Build zu stoppen", () => {
    const long = "a".repeat(121);
    const r = run(
      room(
        `  - id: tonne\n    label: Tonne\n    rect: [10, 10, 10, 10]\n    untersuchen: ["${long}", "Hi {crew}"]\n`,
      ),
    );
    expect(r.errors).toEqual([]);
    expect(r.content).not.toBeNull();
    expect(r.warnings.join("\n")).toContain("121 Zeichen");
    expect(r.warnings.join("\n")).toContain("{crew}");
    expect(r.warnings.join("\n")).toContain("schwer zu treffen");
  });
});
