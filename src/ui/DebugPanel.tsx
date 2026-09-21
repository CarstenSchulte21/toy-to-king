"use client";
// Debug-Panel für Tests (F11.5), nur mit ?debug=1 in der Adresse.
import { useState } from "react";
import type { GameState } from "@/engine";

export type FontChoice = "vt323" | "pixelify";

export function DebugPanel(props: {
  state: GameState | null;
  warnings: string[];
  outlines: boolean;
  onOutlines: (value: boolean) => void;
  font: FontChoice;
  onFont: (value: FontChoice) => void;
  onDeleteSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="debug-toggle" onClick={() => setOpen(true)}>
        DEBUG
      </button>
    );
  }
  return (
    <div className="debug-panel">
      <div className="debug-row">
        <strong>Debug</strong>
        <button onClick={() => setOpen(false)}>Schließen</button>
      </div>
      <label className="debug-row">
        <input
          type="checkbox"
          checked={props.outlines}
          onChange={(e) => props.onOutlines(e.target.checked)}
        />
        Hotspot-Umrisse
      </label>
      <label className="debug-row">
        Schrift:
        <select value={props.font} onChange={(e) => props.onFont(e.target.value as FontChoice)}>
          <option value="vt323">VT323</option>
          <option value="pixelify">Pixelify Sans</option>
        </select>
      </label>
      <button
        className="debug-row"
        onClick={() => {
          if (window.confirm("Spielstand wirklich löschen?")) props.onDeleteSave();
        }}
      >
        Spielstand löschen
      </button>
      {props.warnings.length > 0 && (
        <>
          <strong>Warnungen</strong>
          <pre>{props.warnings.join("\n")}</pre>
        </>
      )}
      <strong>Spielstand</strong>
      <pre>{props.state ? JSON.stringify(props.state, null, 2) : "– kein Spiel –"}</pre>
    </div>
  );
}
