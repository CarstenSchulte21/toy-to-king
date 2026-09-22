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
        <button className="small-btn" onPointerUp={props.onClose}>
          Zu
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
                {work ? <Pips value={work.quality} /> : "Spot"}
              </span>
            );
          })}
        </button>
      ))}
      <p className="map-hint">Neue Orte kommen dazu, wenn du von ihnen hörst.</p>
    </div>
  );
}

export function Pips({ value }: { value: number }) {
  return (
    <span className="quality" aria-label={`Qualität ${value} von 3`}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= value ? "pip on" : "pip"} />
      ))}
    </span>
  );
}
