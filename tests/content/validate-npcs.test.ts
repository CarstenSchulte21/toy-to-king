import { describe, expect, it } from "vitest";
import { validateContent, type ContentFile } from "../../scripts/lib/validate-content";

const config: ContentFile = { path: "content/config.yaml", text: "start_room: hof\n" };
const room: ContentFile = {
  path: "content/rooms/hof.yaml",
  text: `id: hof
name: Hof
hotspots:
  - id: kalle
    label: Kalle
    rect: [10, 10, 30, 30]
    sprechen: mentor
  - id: zaun
    label: Zaun
    rect: [50, 10, 30, 30]
    if: [{fact: zaun}]
    untersuchen: "Ein Zaun."
`,
};
const facts: ContentFile = {
  path: "content/facts.yaml",
  text: `- id: zaun
  category: spot
  title: Zaun
  text: "Loch im Zaun."
  source: mentor
`,
};

function npc(nodes: string, extra = ""): ContentFile {
  return {
    path: "content/npcs/mentor.yaml",
    text: `id: mentor
name: Kalle
role: Mentor
room: hof
hotspot: kalle
trust:
  start: 0
${extra}dialogue:
  start: hallo
  nodes:
${nodes}`,
  };
}

const okNodes = `    hallo:
      text: "Na."
      options:
        - text: "Erzähl."
          effects: [{trust: 1}, {learn: zaun}]
          next: info
        - text: "Tschüss."
          end: true
    info:
      text: ["Zaun.", "Hinten rechts."]
      end: true
`;

const run = (...extra: ContentFile[]) => validateContent([config, room, facts, ...extra]);

describe("validateContent – NPCs, Dialoge, Infos", () => {
  it("akzeptiert einen gültigen Dialog", () => {
    const r = run(npc(okNodes));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.content?.npcs.mentor?.name).toBe("Kalle");
    expect(r.content?.facts.zaun?.title).toBe("Zaun");
  });

  it("meldet fehlende Knoten mit Vorschlag", () => {
    const r = run(npc(okNodes.replace("next: info", "next: inf")));
    expect(r.errors.join("\n")).toContain('Den Knoten "inf" gibt es nicht. Meintest du "info"?');
  });

  it("meldet unbekannte Infos", () => {
    const r = run(npc(okNodes.replace("learn: zaun", "learn: zaum")));
    expect(r.errors.join("\n")).toContain(
      '"learn" zeigt auf "zaum" – diese Info steht nicht in content/facts.yaml. Meintest du "zaun"?',
    );
  });

  it("meldet einen NPC-Hotspot, den es nicht gibt", () => {
    const r = run({ ...npc(okNodes), text: npc(okNodes).text.replace("hotspot: kalle", "hotspot: kale") });
    expect(r.errors.join("\n")).toContain('Meintest du "kalle"?');
  });

  it("verlangt pro Knoten genau eins von options / next / end", () => {
    const r = run(
      npc(okNodes.replace('      text: ["Zaun.", "Hinten rechts."]\n      end: true', '      text: "Zaun."')),
    );
    expect(r.errors.join("\n")).toContain('Knoten "info"');
    expect(r.errors.join("\n")).toContain('genau eins: "options", "next" oder "end: true"');
  });

  it("verlangt pro Option next oder end", () => {
    const r = run(npc(okNodes.replace("          end: true\n    info:", "    info:")));
    expect(r.errors.join("\n")).toContain("Option 2: Eine Option braucht genau eins");
  });

  it("meldet eine unbekannte Quelle einer Info", () => {
    const r = validateContent([
      config,
      room,
      { ...facts, text: facts.text.replace("source: mentor", "source: mentr") },
      npc(okNodes),
    ]);
    expect(r.errors.join("\n")).toContain(
      '"source" zeigt auf "mentr" – diesen NPC gibt es nicht. Meintest du "mentor"?',
    );
  });

  it("trust_min ohne NPC geht außerhalb von Gesprächen nicht", () => {
    const r = validateContent([
      config,
      { ...room, text: room.text.replace("if: [{fact: zaun}]", "if: [{trust_min: 2}]") },
      facts,
      npc(okNodes),
    ]);
    expect(r.errors.join("\n")).toContain('"trust_min" ohne NPC geht nur in Gesprächen');
  });

  it("warnt bei unerreichbaren Knoten, once ohne id und nie lernbaren Infos", () => {
    const nodes = `    hallo:
      text: "Na."
      options:
        - text: "Einmal."
          once: true
          end: true
    vergessen:
      text: "Keiner kommt hierher."
      end: true
`;
    const r = run(npc(nodes));
    expect(r.errors).toEqual([]);
    const w = r.warnings.join("\n");
    expect(w).toContain('Den Knoten "vergessen" erreicht man von "start" aus nie.');
    expect(w).toContain('"once" ohne "id"');
    expect(w).toContain('Info "zaun": Diese Info kann man nirgends lernen.');
  });

  it("warnt, wenn trust bei einem NPC ohne Vertrauenswert benutzt wird", () => {
    const f = npc(okNodes);
    const r = run({ ...f, text: f.text.replace("trust:\n  start: 0\n", "trust: false\n") });
    expect(r.warnings.join("\n")).toContain('"Kalle" hat keinen Vertrauenswert');
  });

  it("warnt, wenn der Hotspot des NPC kein sprechen hat", () => {
    const r = validateContent([
      config,
      { ...room, text: room.text.replace("    sprechen: mentor", '    untersuchen: "x"') },
      facts,
      npc(okNodes),
    ]);
    expect(r.warnings.join("\n")).toContain('hat kein "sprechen: mentor"');
  });
});
