"use client";
// Hauptmenü, Namenseingabe, Textbox und Pausenmenü – alles innerhalb der 320×180-Bühne.
import { useState, type FormEvent } from "react";
import { validatePlayerName } from "@/engine";

export function MainMenu(props: { canContinue: boolean; onContinue: () => void; onNewGame: () => void }) {
  return (
    <div className="screen menu">
      <h1 className="title">TOY TO KING</h1>
      <div className="menu-buttons">
        {props.canContinue && (
          <button className="btn" onClick={props.onContinue}>
            Weiterspielen
          </button>
        )}
        <button className="btn" onClick={props.onNewGame}>
          Neues Spiel
        </button>
      </div>
    </div>
  );
}

export function ConfirmNewGame(props: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="screen menu">
      <p className="menu-text">Neues Spiel starten? Dein bisheriger Spielstand wird überschrieben.</p>
      <div className="menu-buttons">
        <button className="btn" onClick={props.onYes}>
          Ja, neu starten
        </button>
        <button className="btn" onClick={props.onNo}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export function NameEntry(props: { onDone: (name: string) => void; onBack: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const check = validatePlayerName(value);
    if (!check.ok) setError(check.error);
    else props.onDone(check.name);
  };

  return (
    <form className="screen name-entry" onSubmit={submit}>
      <label className="menu-text" htmlFor="writer-name">
        Dein Writer-Name
      </label>
      <input
        id="writer-name"
        className="name-input"
        value={value}
        maxLength={16}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
      />
      <p className={error ? "hint error" : "hint"}>{error ?? "2–16 Zeichen: Buchstaben, Ziffern, - und _"}</p>
      <div className="menu-buttons row">
        <button type="button" className="btn" onClick={props.onBack}>
          Zurück
        </button>
        <button type="submit" className="btn">
          Los
        </button>
      </div>
    </form>
  );
}

export function TextBox(props: { line: string; more: boolean; onNext: () => void }) {
  return (
    <div className="textbox-layer" onPointerUp={props.onNext}>
      <div className="textbox">
        <p>{props.line}</p>
        <span className="textbox-next">{props.more ? "▼" : "■"}</span>
      </div>
    </div>
  );
}

export function PauseMenu(props: { onResume: () => void; onMainMenu: () => void }) {
  return (
    <div className="overlay">
      <div className="screen menu">
        <p className="menu-text">Pause</p>
        <div className="menu-buttons">
          <button className="btn" onClick={props.onResume}>
            Weiter
          </button>
          <button className="btn" onClick={props.onMainMenu}>
            Hauptmenü
          </button>
        </div>
      </div>
    </div>
  );
}

// Aufstieg (M4a): kurzer Bildschirm mit neuem Rang und dem, was jetzt neu ist.
export function RankUp(props: {
  title: string;
  name: string;
  text?: string;
  unlocks?: string;
  onClose: () => void;
}) {
  return (
    <div className="screen overlay rank-up">
      <p className="rank-up-title">{props.title}</p>
      <p className="title">{props.name}</p>
      {props.text && <p className="menu-text">{props.text}</p>}
      {props.unlocks && <p className="rank-up-unlocks">Neu: {props.unlocks}</p>}
      <button className="btn" onPointerUp={props.onClose}>
        Weiter
      </button>
    </div>
  );
}

// Zwischenfall beim Sprühen (M4b): knapp entkommen oder erwischt.
// Bewusst kurz und ohne Zeigefinger – was weh tut, sind Material und Zeit, nicht der Ton.
export function Incident(props: { kind: "escaped" | "caught"; lines: string[]; onClose: () => void }) {
  return (
    <div className={`screen overlay incident incident-${props.kind}`}>
      <p className="title">{props.kind === "caught" ? "Erwischt" : "Knapp"}</p>
      {props.lines.map((line, i) => (
        <p className="menu-text" key={i}>
          {line}
        </p>
      ))}
      <button className="btn" onPointerUp={props.onClose}>
        {props.kind === "caught" ? "Raus hier" : "Weiter"}
      </button>
    </div>
  );
}
