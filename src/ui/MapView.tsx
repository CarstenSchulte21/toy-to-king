"use client";
// Bezirkskarte (M3): bekannte Orte, Spots und eigene Werke – Tippen reist dorthin.
import { mapPlaces, type GameContent, type GameState } from "@/engine";

export function MapView(props: {
  content: GameContent;
  state: GameState;
  onTravel: (room: string) => void;
  onClose: () => void;
}) {
  const { content, state } = props;
  const places = mapPlaces(state, content);
  return (
    <div className="overlay map">
      <div className="map-streets" aria-hidden />
      <div className="bb-head map-head">
        <span className="bb-title">{content.map?.title ?? "Karte"}</span>
        <button className="small-btn close-btn" aria-label="Schließen" onPointerUp={props.onClose}>
          ×
        </button>
      </div>
      {places.map((p) => (
        <button
          key={p.room}
          className={`map-place ${p.current ? "current" : ""}`}
          style={{ left: p.pos[0], top: p.pos[1] }}
          onPointerUp={() => (p.current ? props.onClose() : props.onTravel(p.room))}
        >
          <span className="map-dot" />
          <span className="map-name">{p.name}</span>
          {p.spots.map((s) => {
            const work = state.works[s.id];
            return (
              <span key={s.id} className={`map-spot ${work ? "done" : ""}`}>
                {work ? <Pips value={work.quality} label={qualityWord(content, work.quality)} /> : "Spot"}
              </span>
            );
          })}
        </button>
      ))}
      <p className="map-hint">Neue Orte kommen dazu, wenn du von ihnen hörst.</p>
    </div>
  );
}

/**
 * Die Qualität eines Werks. Als Wort, wo Platz ist – als drei Punkte, wo keiner ist.
 * Der Tester konnte mit den Punkten allein nichts anfangen ("drei leere Vierecke").
 */
export function Pips({ value, label }: { value: number; label?: string }) {
  const title = label ? `Qualität: ${label}` : `Qualität ${value} von 3`;
  if (label) return <span className="quality-word">{label}</span>;
  return (
    <span className="quality" aria-label={title} title={title}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= value ? "pip on" : "pip"} />
      ))}
    </span>
  );
}

export function qualityWord(content: GameContent, value: number): string {
  return content.spray?.quality_labels[Math.max(0, Math.min(3, value))] ?? `${value}/3`;
}
