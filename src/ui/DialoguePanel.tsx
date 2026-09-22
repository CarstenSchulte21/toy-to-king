"use client";
// Gesprächsansicht (M2-3): Porträt, Name, Vertrauen, Text Zeile für Zeile, dann Antworten.
import { useEffect, useState } from "react";
import type { DialogueView } from "@/engine";

const CHARS_PER_TICK = 2;
const TICK_MS = 16;

export function DialoguePanel(props: {
  view: DialogueView;
  onChoose: (index: number) => void;
  onContinue: () => void;
  onLeave: () => void;
  onFeedback: (line: string) => void;
  // Hinweise wie „Neu im Blackbook" erscheinen im Gespräch unter dem Text statt über ihm.
  notices: string[];
}) {
  const { view } = props;
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = view.lines[lineIndex] ?? "";
  const typing = shown < line.length;
  const lastLine = lineIndex >= view.lines.length - 1;
  const showOptions = lastLine && !typing && view.mode === "options";

  // Schreibmaschinen-Effekt – Tippen zeigt sofort den ganzen Satz.
  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => setShown((n) => Math.min(line.length, n + CHARS_PER_TICK)), TICK_MS);
    return () => clearInterval(id);
  }, [typing, line.length]);

  const tapText = () => {
    if (typing) return setShown(line.length);
    if (!lastLine) {
      setLineIndex((i) => i + 1);
      setShown(0);
      return;
    }
    if (view.mode === "next") props.onContinue();
    if (view.mode === "end") props.onLeave();
  };

  return (
    <div className="dialogue">
      <div className="dialogue-head">
        <div className="portrait" aria-hidden>
          {initials(view.name)}
        </div>
        <div className="dialogue-who">
          <span className="dialogue-name">{view.name}</span>
          <span className="dialogue-role">{view.role}</span>
          {view.trust && (
            <span className="trust" title={`Vertrauen: ${view.trust.label}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= view.trust!.level ? "pip on" : "pip"} />
              ))}
              <span className="trust-label">{view.trust.label}</span>
            </span>
          )}
        </div>
        <button className="small-btn" onPointerUp={() => props.onFeedback(line)}>
          Feedback
        </button>
        <button className="small-btn" onPointerUp={props.onLeave}>
          Gehen
        </button>
      </div>

      <div className="dialogue-text" onPointerUp={tapText}>
        <p>{line.slice(0, shown)}</p>
        {props.notices.map((n, i) => (
          <p key={i} className="dialogue-notice">
            {n}
          </p>
        ))}
        {!showOptions && <span className="textbox-next">{lastLine && view.mode === "end" ? "■" : "▼"}</span>}
      </div>

      {showOptions && (
        <ul className="options">
          {view.options.map((o) => (
            <li key={o.index}>
              <button
                className={o.locked ? "option locked" : "option"}
                disabled={o.locked}
                onPointerUp={() => !o.locked && props.onChoose(o.index)}
              >
                <span>{o.text}</span>
                {o.locked && o.hint && <span className="option-hint">{o.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
