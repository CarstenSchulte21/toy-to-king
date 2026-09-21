"use client";
// Blackbook (M2-4): alle Insider-Infos, nach Kategorien. Neue Einträge sind markiert, bis man sie gesehen hat.
import { useEffect, useState } from "react";
import { FACT_CATEGORIES, type FactCategory, type GameContent, type GameState } from "@/engine";

export function Blackbook(props: {
  content: GameContent;
  state: GameState;
  onSeen: (facts: string[]) => void;
  onClose: () => void;
}) {
  const { content, state } = props;
  const learned = Object.keys(state.facts)
    .map((id) => content.facts[id])
    .filter((f) => f !== undefined);
  const firstWithNew = FACT_CATEGORIES.find((c) =>
    learned.some((f) => f.category === c && state.facts[f.id]?.new),
  );
  const [tab, setTab] = useState<FactCategory>(firstWithNew ?? "spot");

  const entries = learned.filter((f) => f.category === tab);
  const unseen = entries.filter((f) => state.facts[f.id]?.new).map((f) => f.id);
  const unseenKey = unseen.join(",");

  // Was man im geöffneten Reiter sieht, gilt als gelesen. Die Markierung bleibt sichtbar, bis man wechselt.
  const { onSeen } = props;
  useEffect(() => {
    if (unseenKey) onSeen(unseenKey.split(","));
  }, [unseenKey, onSeen]);
  const [highlight] = useState(() => new Set(learned.filter((f) => state.facts[f.id]?.new).map((f) => f.id)));

  const label = (c: FactCategory) => content.config.categories?.[c] ?? c;

  return (
    <div className="overlay blackbook">
      <div className="bb-head">
        <span className="bb-title">Blackbook</span>
        <button className="small-btn" onPointerUp={props.onClose}>
          Zu
        </button>
      </div>
      <div className="bb-tabs">
        {FACT_CATEGORIES.map((c) => {
          const count = learned.filter((f) => f.category === c).length;
          const hasNew = learned.some((f) => f.category === c && highlight.has(f.id));
          return (
            <button key={c} className={c === tab ? "bb-tab active" : "bb-tab"} onPointerUp={() => setTab(c)}>
              {label(c)} {count > 0 ? count : ""}
              {hasNew && c !== tab ? "*" : ""}
            </button>
          );
        })}
      </div>
      <div className="bb-list">
        {entries.length === 0 && (
          <p className="hint">{content.config.empty_category_text ?? "Noch nichts."}</p>
        )}
        {entries.map((f) => (
          <div key={f.id} className="bb-entry">
            <span className="bb-entry-title">
              {highlight.has(f.id) && <span className="bb-new">NEU </span>}
              {f.title}
            </span>
            <p>{f.text}</p>
            <span className="bb-source">– {content.npcs[f.source]?.name ?? f.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
