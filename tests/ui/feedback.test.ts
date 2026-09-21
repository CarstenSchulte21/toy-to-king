import { describe, expect, it } from "vitest";
import { buildFeedbackText } from "@/ui/feedback";

describe("buildFeedbackText", () => {
  const date = new Date("2026-09-21T18:00:00Z");

  it("hängt die Stelle im Spiel an", () => {
    const text = buildFeedbackText("KRUX klingt zu hart.", {
      room: "Unterführung",
      npc: "KRUX",
      node: "hub",
      line: "Was?",
      version: "abc1234",
      date,
    });
    expect(text).toContain("KRUX klingt zu hart.");
    expect(text).toContain("Room: Unterführung");
    expect(text).toContain("Gespräch: KRUX / Knoten hub");
    expect(text).toContain('Zeile: „Was?"');
    expect(text).toContain("Version: abc1234");
  });

  it("kommt ohne Gespräch und ohne Text aus", () => {
    const text = buildFeedbackText("  ", { room: "Hinterhof", version: "lokal", date });
    expect(text).toContain("(kein Text)");
    expect(text).not.toContain("Gespräch:");
  });
});
