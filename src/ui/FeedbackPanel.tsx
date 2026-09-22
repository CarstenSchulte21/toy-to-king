"use client";
// Feedback-Button (M2-6): Freitext + Kontext, verschickt über das Teilen-Menü des Handys.
// Kein Server, kein Login, nichts wird gespeichert.
import { useState } from "react";
import { buildFeedbackText, type FeedbackContext } from "./feedback";

export function FeedbackPanel(props: { context: FeedbackContext; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const send = async () => {
    const text = buildFeedbackText(message, props.context);
    try {
      if (navigator.share) {
        await navigator.share({ title: "TOY TO KING – Feedback", text });
        props.onClose();
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus("Kopiert. Füg den Text in eine Nachricht ein.");
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler.
      if ((error as Error).name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("Kopiert. Füg den Text in eine Nachricht ein.");
      } catch {
        setStatus("Teilen ging nicht. Mach bitte einen Screenshot.");
      }
    }
  };

  return (
    <div className="feedback-panel" role="dialog" aria-label="Feedback">
      <h2>Feedback</h2>
      <p className="feedback-where">
        Stelle: {props.context.room}
        {props.context.npc ? ` · ${props.context.npc}` : ""}
        {props.context.line
          ? ` · „${props.context.line.slice(0, 60)}${props.context.line.length > 60 ? "…" : ""}"`
          : ""}
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Was passt nicht? Was klingt unecht? Was fehlt?"
        rows={4}
        autoFocus
      />
      {status && <p className="feedback-status">{status}</p>}
      <div className="feedback-buttons">
        <button onClick={props.onClose}>Abbrechen</button>
        <button className="primary" onClick={send}>
          Senden
        </button>
      </div>
    </div>
  );
}
