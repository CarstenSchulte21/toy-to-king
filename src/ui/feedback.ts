// Feedback-Text mit Kontext (M2-6, F11.4) – damit klar ist, an welcher Stelle etwas nicht passt.

export type FeedbackContext = {
  room: string;
  npc?: string;
  node?: string;
  line?: string;
  version: string;
  date: Date;
};

export function buildFeedbackText(message: string, ctx: FeedbackContext): string {
  const parts = [
    `TOY TO KING – Feedback`,
    ``,
    message.trim() || "(kein Text)",
    ``,
    `— Stelle —`,
    `Room: ${ctx.room}`,
  ];
  if (ctx.npc) parts.push(`Gespräch: ${ctx.npc}${ctx.node ? ` / Knoten ${ctx.node}` : ""}`);
  if (ctx.line) parts.push(`Zeile: „${ctx.line}"`);
  parts.push(`Version: ${ctx.version}`, `Datum: ${ctx.date.toLocaleString("de-DE")}`);
  return parts.join("\n");
}

export function buildVersion(): string {
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 7) : "lokal";
}
