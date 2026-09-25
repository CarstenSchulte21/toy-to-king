"use client";
// Zeigt einen Room mit seinen Hotspots und dem Verbmenü.
// Ohne Hintergrundbild (M1/M2) werden Hotspots als beschriftete Platzhalter-Kästen gezeichnet,
// sonst wäre auf einem leeren Bildschirm nichts zu finden.
import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  verbLabel,
  availableVerbs,
  visibleHotspots,
  type GameContent,
  type GameState,
  type Hotspot,
  type Room,
  type Spot,
  type Verb,
} from "@/engine";
import { Pips } from "./MapView";
import { WorkImage } from "./WorkImage";

type Menu = { hotspot: Hotspot; x: number; y: number } | null;

// Wo das Werk sitzt: auf der mittleren Tonne, längs am Mast – nicht über dem ganzen Hotspot.
// Ohne `place` bleibt es wie bisher im Rechteck des Hotspots.
function placeStyle(spot: Spot | undefined, rect: Hotspot["rect"]): CSSProperties | undefined {
  if (!spot?.place) return undefined;
  const [px, py, pw, ph] = spot.place;
  return { left: px - rect[0], top: py - rect[1], width: pw, height: ph, inset: "auto" };
}

const MENU_WIDTH = 84;
const MENU_ITEM_HEIGHT = 18;

export function RoomView(props: {
  content: GameContent;
  room: Room;
  state: GameState;
  scale: number;
  outlines: boolean;
  // Solange ein Gespräch oder Menü offen ist, wird nichts als „gesehen" markiert.
  active: boolean;
  onVerb: (hotspot: Hotspot, verb: Verb) => void;
  onSeenHotspots: (keys: string[]) => void;
}) {
  const { content, room, state, scale, outlines, active, onVerb, onSeenHotspots } = props;
  const [menu, setMenu] = useState<Menu>(null);
  const placeholder = !room.background;
  const hotspots = visibleHotspots(room, state, content);
  // Räume, für die es eine Fassung "Licht aus" gibt – nur wenn der Schalter auch umgelegt ist.
  const darkRooms = new Set(state.flags.licht_aus ? ["strasse"] : []);

  // Neu freigeschaltete Hotspots glitzern einmal kurz auf (F2.8), danach gelten sie als gesehen.
  const fresh = hotspots.map((h) => `${room.id}.${h.id}`).filter((k) => state.newlyVisible.includes(k));
  const freshKey = fresh.join(",");
  useEffect(() => {
    if (!active || !freshKey) return;
    const id = setTimeout(() => onSeenHotspots(freshKey.split(",")), 2400);
    return () => clearTimeout(id);
  }, [active, freshKey, onSeenHotspots]);

  const openMenu = (event: PointerEvent, hotspot: Hotspot) => {
    event.stopPropagation();
    const stage = (event.currentTarget as HTMLElement).closest(".stage")!.getBoundingClientRect();
    const x = (event.clientX - stage.left) / scale;
    const y = (event.clientY - stage.top) / scale;
    const verbs = availableVerbs(hotspot, state, content);
    const height = (verbs.length + 1) * MENU_ITEM_HEIGHT + 4;
    setMenu({
      hotspot,
      x: Math.min(Math.max(2, x - MENU_WIDTH / 2), STAGE_WIDTH - MENU_WIDTH - 2),
      y: Math.min(Math.max(2, y - height / 2), STAGE_HEIGHT - height - 2),
    });
  };

  // Nachts zeigt jeder Raum seine dunkle Fassung (M4b), und wer das Licht ausgemacht hat,
  // sieht noch weniger. Die Dateien entstehen mit "npm run art".
  const night = (state.phase ?? 0) >= 2;
  const background =
    night && room.background
      ? room.background.replace(/\.png$/, darkRooms.has(room.id) ? "-dark.png" : "-night.png")
      : room.background;

  return (
    <div className="room" onPointerUp={() => setMenu(null)}>
      {placeholder ? (
        <div className="room-placeholder">
          <span className="room-name">{room.name}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Pixel-Art braucht exakte Größe ohne Optimierung
        <img className="room-bg" src={`/art/${background}`} alt={room.name} draggable={false} />
      )}

      {hotspots.map((h) => {
        const [x, y, w, hgt] = h.rect;
        const classes = [
          "hotspot",
          placeholder ? "hotspot-placeholder" : "",
          outlines ? "hotspot-outline" : "",
          active && fresh.includes(`${room.id}.${h.id}`) ? "hotspot-new" : "",
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
            {h.sprühen && state.works[h.sprühen] && (
              <>
                <span className="work" style={placeStyle(content.spots[h.sprühen], h.rect)}>
                  <WorkImage
                    content={content}
                    name={state.player.name}
                    work={state.works[h.sprühen]!}
                    spot={content.spots[h.sprühen]}
                  />
                </span>
                <span className="work-pips">
                  <Pips value={state.works[h.sprühen]!.quality} />
                </span>
              </>
            )}
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
          {availableVerbs(menu.hotspot, state, content).map((verb) => (
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
              {verbLabel(verb, menu.hotspot, content)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
