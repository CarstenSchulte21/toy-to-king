"use client";
// Zeigt einen Room mit seinen Hotspots und dem Verbmenü.
// Ohne Hintergrundbild (M1/M2) werden Hotspots als beschriftete Platzhalter-Kästen gezeichnet,
// sonst wäre auf einem leeren Bildschirm nichts zu finden.
import { useState, type PointerEvent } from "react";
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  VERB_LABELS,
  availableVerbs,
  visibleHotspots,
  type GameContent,
  type GameState,
  type Hotspot,
  type Room,
  type Verb,
} from "@/engine";

type Menu = { hotspot: Hotspot; x: number; y: number } | null;

const MENU_WIDTH = 84;
const MENU_ITEM_HEIGHT = 18;

export function RoomView(props: {
  content: GameContent;
  room: Room;
  state: GameState;
  scale: number;
  outlines: boolean;
  onVerb: (hotspot: Hotspot, verb: Verb) => void;
}) {
  const { content, room, state, scale, outlines, onVerb } = props;
  const [menu, setMenu] = useState<Menu>(null);
  const placeholder = !room.background;
  const hotspots = visibleHotspots(room, state, content);

  const openMenu = (event: PointerEvent, hotspot: Hotspot) => {
    event.stopPropagation();
    const stage = (event.currentTarget as HTMLElement).closest(".stage")!.getBoundingClientRect();
    const x = (event.clientX - stage.left) / scale;
    const y = (event.clientY - stage.top) / scale;
    const verbs = availableVerbs(hotspot);
    const height = (verbs.length + 1) * MENU_ITEM_HEIGHT + 4;
    setMenu({
      hotspot,
      x: Math.min(Math.max(2, x - MENU_WIDTH / 2), STAGE_WIDTH - MENU_WIDTH - 2),
      y: Math.min(Math.max(2, y - height / 2), STAGE_HEIGHT - height - 2),
    });
  };

  return (
    <div className="room" onPointerUp={() => setMenu(null)}>
      {placeholder ? (
        <div className="room-placeholder">
          <span className="room-name">{room.name}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Pixel-Art braucht exakte Größe ohne Optimierung
        <img className="room-bg" src={`/art/${room.background}`} alt={room.name} draggable={false} />
      )}

      {hotspots.map((h) => {
        const [x, y, w, hgt] = h.rect;
        const classes = [
          "hotspot",
          placeholder ? "hotspot-placeholder" : "",
          outlines ? "hotspot-outline" : "",
        ];
        return (
          <button
            key={h.id}
            className={classes.join(" ")}
            style={{ left: x, top: y, width: w, height: hgt }}
            onPointerUp={(e) => openMenu(e, h)}
            aria-label={h.label}
          >
            {(placeholder || outlines) && <span className="hotspot-label">{h.label}</span>}
          </button>
        );
      })}

      {menu && (
        <div
          className="verb-menu"
          style={{ left: menu.x, top: menu.y, width: MENU_WIDTH }}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div className="verb-menu-title">{menu.hotspot.label}</div>
          {availableVerbs(menu.hotspot).map((verb) => (
            <button
              key={verb}
              className="verb"
              style={{ height: MENU_ITEM_HEIGHT }}
              onPointerUp={(e) => {
                e.stopPropagation();
                setMenu(null);
                onVerb(menu.hotspot, verb);
              }}
            >
              {VERB_LABELS[verb]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
