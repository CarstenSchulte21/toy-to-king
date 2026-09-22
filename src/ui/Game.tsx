"use client";
// Das Spiel: verbindet Engine, Speichern und Oberfläche.
// Keine Spielregeln hier – jede Handlung geht als Aktion an die Engine (reduce),
// die Oberfläche zeigt nur den neuen Stand und die Ereignisse an.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import contentJson from "@/generated/content.json";
import {
  createNewGame,
  nextRank,
  rankOf,
  reduce,
  viewDialogue,
  type Action,
  type GameContent,
  type GameEvent,
  type GameState,
} from "@/engine";
import { LocalStorageSaveStore, createAutosaver, loadGame } from "@/save/SaveStore";
import { BagView } from "./BagView";
import { Blackbook } from "./Blackbook";
import { DebugPanel, type FontChoice } from "./DebugPanel";
import { DialoguePanel } from "./DialoguePanel";
import { buildVersion, type FeedbackContext } from "./feedback";
import { FeedbackPanel } from "./FeedbackPanel";
import { MapView } from "./MapView";
import { RoomView } from "./RoomView";
import { ConfirmNewGame, MainMenu, NameEntry, PauseMenu, RankUp, TextBox } from "./Screens";
import { SprayScene } from "./SprayScene";
import { Stage, useStageScale } from "./Stage";

const content = contentJson as unknown as GameContent;
const SLOT = "main";
const TICK_SECONDS = 15;
const TOAST_MS = 2600;

type Screen = "loading" | "menu" | "confirm-new" | "name" | "play";
// Wo man gerade im Gespräch steht. Gehört der Oberfläche, nicht dem Spielstand (SPEC 4.1).
type Cursor = { npc: string; node: string; seq: number } | null;
type Toast = { id: number; text: string };

export function Game() {
  const scale = useStageScale();
  const store = useMemo(() => new LocalStorageSaveStore(), []);
  const autosaver = useMemo(() => createAutosaver(store, SLOT), [store]);

  const [screen, setScreen] = useState<Screen>("loading");
  const [state, setState] = useState<GameState | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paused, setPaused] = useState(false);
  const [blackbook, setBlackbook] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [spraySpot, setSpraySpot] = useState<{ spot: string; title: string } | null>(null);
  const [rankUp, setRankUp] = useState<Extract<GameEvent, { type: "RANK_UP" }> | null>(null);
  const [feedback, setFeedback] = useState<FeedbackContext | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [debug, setDebug] = useState(false);
  const [outlines, setOutlines] = useState(false);
  const [font, setFont] = useState<FontChoice>("vt323");
  const stateRef = useRef<GameState | null>(null);
  const seqRef = useRef(0);

  const commit = useCallback(
    (next: GameState) => {
      stateRef.current = next;
      setState(next);
      autosaver.schedule(next);
    },
    [autosaver],
  );

  const toast = useCallback((text: string) => {
    const id = ++seqRef.current;
    setToasts((list) => [...list, { id, text }].slice(-3));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const handleEvents = useCallback(
    (events: GameEvent[]) => {
      for (const e of events) {
        switch (e.type) {
          case "TEXT":
            setLines((queue) => [...queue, ...e.lines]);
            break;
          case "DIALOGUE":
            setCursor({ npc: e.npc, node: e.node, seq: ++seqRef.current });
            break;
          case "DIALOGUE_END":
            setCursor(null);
            break;
          case "FACT_LEARNED":
            toast(`Neu im Blackbook: ${e.title}`);
            break;
          case "ITEM_GAINED":
            toast(`Neu in der Tasche: ${e.name}`);
            break;
          case "SPRAY_OPEN": {
            const spot = content.spots[e.spot];
            const hotspot = spot
              ? content.rooms[spot.room]?.hotspots.find((h) => h.id === spot.hotspot)
              : undefined;
            setSpraySpot({ spot: e.spot, title: hotspot?.label ?? e.spot });
            break;
          }
          case "RANK_UP":
            setRankUp(e);
            break;
          case "XP_GAINED":
            break;
          case "SPRAYED":
            // Das Ergebnis zeigt die Sprüh-Szene selbst.
            break;
          case "TRUST_CHANGED": {
            const name = content.npcs[e.npc]?.name ?? e.npc;
            toast(e.to > e.from ? `${name} vertraut dir mehr.` : `${name} vertraut dir weniger.`);
            break;
          }
          case "WARNING":
            console.warn(e.message);
            setWarnings((list) => [...list, e.message].slice(-20));
            break;
        }
      }
    },
    [toast],
  );

  const dispatch = useCallback(
    (action: Action): GameEvent[] => {
      const current = stateRef.current;
      if (!current) return [];
      const result = reduce(current, action, content);
      if (result.state !== current) commit(result.state);
      handleEvents(result.events);
      return result.events;
    },
    [commit, handleEvents],
  );

  // Beim Start: Spielstand laden, Debug-Modus aus der Adresse lesen.
  useEffect(() => {
    loadGame(store, SLOT, content).then((result) => {
      setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
      stateRef.current = result.state;
      setState(result.state);
      if (result.warning) setWarnings((list) => [...list, result.warning!]);
      setScreen("menu");
    });
  }, [store]);

  // Spielzeit zählen, solange gespielt wird.
  useEffect(() => {
    if (screen !== "play" || paused) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") dispatch({ type: "TICK", seconds: TICK_SECONDS });
    }, TICK_SECONDS * 1000);
    return () => clearInterval(id);
  }, [screen, paused, dispatch]);

  // Beim Verlassen der Seite sofort speichern.
  useEffect(() => {
    const flush = () => void autosaver.flush();
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [autosaver]);

  const resetOverlays = () => {
    setLines([]);
    setCursor(null);
    setPaused(false);
    setBlackbook(false);
    setMapOpen(false);
    setBagOpen(false);
    setSpraySpot(null);
    setRankUp(null);
  };

  const startNewGame = (name: string) => {
    const now = new Date().toISOString();
    const result = reduce(
      createNewGame(content, name, now),
      { type: "NEW_GAME", playerName: name },
      content,
      now,
    );
    resetOverlays();
    commit(result.state);
    handleEvents(result.events);
    setScreen("play");
  };

  const toMainMenu = () => {
    void autosaver.flush();
    resetOverlays();
    setScreen("menu");
  };

  const markFactsSeen = useCallback(
    (facts: string[]) => dispatch({ type: "MARK_FACTS_SEEN", facts }),
    [dispatch],
  );
  const markHotspotsSeen = useCallback(
    (keys: string[]) => dispatch({ type: "SEEN_HOTSPOTS", keys }),
    [dispatch],
  );

  const openFeedback = (line?: string) => {
    if (!state) return;
    setFeedback({
      room: content.rooms[state.room]?.name ?? state.room,
      npc: cursor ? content.npcs[cursor.npc]?.name : undefined,
      node: cursor?.node,
      line,
      version: buildVersion(),
      date: new Date(),
    });
  };

  const room = state ? content.rooms[state.room] : undefined;
  const rank = state ? rankOf(state, content) : null;
  const upcoming = state ? nextRank(content, state.xp) : null;
  const rankProgress =
    state && rank && upcoming
      ? Math.max(0, Math.min(1, (state.xp - rank.xp) / Math.max(1, upcoming.xp - rank.xp)))
      : 1;
  const dialogue = state && cursor ? viewDialogue(state, content, cursor.npc, cursor.node) : null;
  const hasNewFacts = state ? Object.values(state.facts).some((f) => f.new) : false;
  const materialTips = state
    ? Object.keys(state.facts)
        .map((id) => content.facts[id])
        .filter((f): f is NonNullable<typeof f> => f !== undefined && f.category === "material")
    : [];
  const overlayOpen =
    lines.length > 0 ||
    dialogue !== null ||
    paused ||
    blackbook ||
    mapOpen ||
    bagOpen ||
    spraySpot !== null ||
    rankUp !== null ||
    feedback !== null;

  return (
    <div className={`game font-${font}`}>
      <Stage scale={scale}>
        {screen === "loading" && <div className="screen menu" />}
        {screen === "menu" && (
          <MainMenu
            canContinue={state !== null}
            onContinue={() => setScreen("play")}
            onNewGame={() => setScreen(state ? "confirm-new" : "name")}
          />
        )}
        {screen === "confirm-new" && (
          <ConfirmNewGame onYes={() => setScreen("name")} onNo={() => setScreen("menu")} />
        )}
        {screen === "name" && <NameEntry onDone={startNewGame} onBack={() => setScreen("menu")} />}
        {screen === "play" && state && room && (
          <>
            <RoomView
              content={content}
              room={room}
              state={state}
              scale={scale}
              outlines={outlines}
              active={!overlayOpen}
              onVerb={(hotspot, verb) => dispatch({ type: "INTERACT", hotspot: hotspot.id, verb })}
              onSeenHotspots={markHotspotsSeen}
            />
            {!dialogue && (
              <div className="hud">
                <div className="hud-left">
                  <button className="hud-btn" aria-label="Menü" onPointerUp={() => setPaused(true)}>
                    ≡
                  </button>
                  <button
                    className="hud-btn hud-bb"
                    aria-label="Blackbook"
                    onPointerUp={() => setBlackbook(true)}
                  >
                    Blackbook{hasNewFacts && <span className="badge" />}
                  </button>
                  {content.map && (
                    <button
                      className="hud-btn hud-bb"
                      aria-label="Karte"
                      onPointerUp={() => setMapOpen(true)}
                    >
                      Karte
                    </button>
                  )}
                  <button className="hud-btn hud-bb" aria-label="Tasche" onPointerUp={() => setBagOpen(true)}>
                    Tasche
                  </button>
                </div>
                <span className="hud-name">
                  {state.player.name}
                  {rank && (
                    <span className="hud-rank">
                      {rank.name}
                      <i className="hud-xp">
                        <i style={{ width: `${Math.round(rankProgress * 100)}%` }} />
                      </i>
                    </span>
                  )}
                </span>
              </div>
            )}
            {dialogue && cursor && (
              <DialoguePanel
                key={cursor.seq}
                view={dialogue}
                onChoose={(option) =>
                  dispatch({ type: "CHOOSE_OPTION", npc: cursor.npc, node: cursor.node, option })
                }
                onContinue={() => dispatch({ type: "CONTINUE_DIALOGUE", npc: cursor.npc, node: cursor.node })}
                onLeave={() => setCursor(null)}
                onFeedback={openFeedback}
                notices={toasts.map((t) => t.text)}
              />
            )}
            {lines.length > 0 && !dialogue && (
              <TextBox line={lines[0]!} more={lines.length > 1} onNext={() => setLines((q) => q.slice(1))} />
            )}
            {blackbook && (
              <Blackbook
                content={content}
                state={state}
                onSeen={markFactsSeen}
                onClose={() => setBlackbook(false)}
              />
            )}
            {mapOpen && (
              <MapView
                content={content}
                state={state}
                onTravel={(target) => {
                  setMapOpen(false);
                  dispatch({ type: "TRAVEL", room: target });
                }}
                onClose={() => setMapOpen(false)}
              />
            )}
            {bagOpen && <BagView content={content} state={state} onClose={() => setBagOpen(false)} />}
            {spraySpot && (
              <SprayScene
                key={spraySpot.spot}
                content={content}
                state={state}
                spot={spraySpot.spot}
                title={spraySpot.title}
                tips={materialTips}
                onSpray={(action) => dispatch(action)}
                onClose={() => setSpraySpot(null)}
              />
            )}
            {/* Der Aufstieg wartet, bis das Ergebnis an der Wand weggeklickt ist. */}
            {rankUp && !spraySpot && content.progress && (
              <RankUp
                title={content.progress.rank_up_title}
                name={rankUp.name}
                {...(rankUp.text ? { text: rankUp.text } : {})}
                {...(rankUp.unlocks ? { unlocks: rankUp.unlocks } : {})}
                onClose={() => setRankUp(null)}
              />
            )}
            {paused && (
              <PauseMenu
                onResume={() => setPaused(false)}
                onFeedback={() => {
                  setPaused(false);
                  openFeedback(lines[0]);
                }}
                onMainMenu={toMainMenu}
              />
            )}
            {!dialogue && !blackbook && !mapOpen && !bagOpen && !spraySpot && (
              <div className="toasts" aria-live="polite">
                {toasts.map((t) => (
                  <div key={t.id} className="toast">
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Stage>

      {feedback && <FeedbackPanel context={feedback} onClose={() => setFeedback(null)} />}

      <div className="rotate-hint">
        <p>Dreh dein Handy</p>
        <p className="rotate-icon">↻</p>
      </div>

      {debug && (
        <DebugPanel
          state={state}
          warnings={warnings}
          outlines={outlines}
          onOutlines={setOutlines}
          font={font}
          onFont={setFont}
          onDeleteSave={() => {
            autosaver.cancel();
            void store.clear(SLOT).then(() => window.location.reload());
          }}
        />
      )}
    </div>
  );
}
