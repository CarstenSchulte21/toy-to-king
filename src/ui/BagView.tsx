"use client";
// Tasche (F1.4): Caps, Dosen und Farben, die man hat.
import { paletteIndex, type GameContent, type GameState } from "@/engine";
import { rgbCss } from "./paint";

export function BagView(props: { content: GameContent; state: GameState; onClose: () => void }) {
  const { content, state } = props;
  const items = Object.entries(state.items)
    .filter(([id, count]) => count > 0 && content.items[id])
    .map(([id, count]) => ({ ...content.items[id]!, count }));
  const groups = [
    { kind: "cap", title: "Caps" },
    { kind: "dose", title: "Druck" },
    { kind: "color", title: "Farben" },
  ] as const;
  return (
    <div className="overlay blackbook">
      <div className="bb-head">
        <span className="bb-title">Tasche</span>
        <button className="small-btn close-btn" aria-label="Schließen" onPointerUp={props.onClose}>
          ×
        </button>
      </div>
      <div className="bb-list">
        {groups.map((g) => (
          <div key={g.kind}>
            <p className="bag-group">{g.title}</p>
            {items
              .filter((i) => i.kind === g.kind)
              .map((i) => (
                <div key={i.id} className="bb-entry">
                  <span className="bb-entry-title">
                    {i.color && (
                      <i className="bag-swatch" style={{ background: rgbCss(paletteIndex(i.color)) }} />
                    )}
                    {i.name}
                    {i.count > 1 ? ` ×${i.count}` : ""}
                  </span>
                  <p>{i.text}</p>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
