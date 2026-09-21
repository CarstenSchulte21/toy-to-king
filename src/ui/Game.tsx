"use client";
// Das Spiel: verbindet Engine, Speichern und Oberfläche.
// Keine Spielregeln hier – jede Handlung geht als Aktion an die Engine (reduce),
// die Oberfläche zeigt nur den neuen Stand und die Ereignisse an.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import contentJson from "@/generated/content.json";
import {
  createNewGame,
  reduce,
  type Action,
  type GameContent,
  type GameEvent,
  type GameState,
} from "@/engine";
import { LocalStorageSaveStore, createAutosaver, loadGame } from "@/save/SaveStore";
import { DebugPanel, type FontChoice } from "./DebugPanel";
import { RoomView } from "./RoomView";
import { ConfirmNewGame, MainMenu, NameEntry, PauseMenu, TextBox } from "./Screens";
import { Stage, useStageScale } from "./Stage";

const content = contentJson as unknown as GameContent;
const SLOT = "main";
const TICK_SECONDS = 15;

type Screen = "loading" | "menu" | "confirm-new" | "name" | "play";

export function Game() {
  const scale = useStageScale();
  const store = useMemo(() => new LocalStorageSaveStore(), []);
  const autosaver = useMemo(() => createAutosaver(store, SLOT), [store]);

  const [screen, setScreen] = useState<Screen>("loading");
  const [state, setState] = useState<GameState | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [debug, setDebug] = useState(false);
  const [outlines, setOutlines] = useState(false);
  const [font, setFont] = useState<FontChoice>("vt323");
  const stateRef = useRef<GameState | null>(null);

  const commit = useCallback(
    (next: GameState) => {
      stateRef.current = next;
      setState(next);
      autosaver.schedule(next);
    },
    [autosaver],
  );

  const handleEvents = useCallback((events: GameEvent[]) => {
    const text = events.flatMap((e) => (e.type === "TEXT" ? e.lines : []));
    if (text.length > 0) setLines((queue) => [...queue, ...text]);
    const warn = events.flatMap((e) => (e.type === "WARNING" ? [e.message] : []));
    if (warn.length > 0) {
      warn.forEach((w) => console.warn(w));
      setWarnings((list) => [...list, ...warn].slice(-20));
    }
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      const current = stateRef.current;
      if (!current) return;
      const result = reduce(current, action, content);
      if (result.state !== current) commit(result.state);
      handleEvents(result.events);
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

  const startNewGame = (name: string) => {
    const now = new Date().toISOString();
    const result = reduce(
      createNewGame(content, name, now),
      { type: "NEW_GAME", playerName: name },
      content,
      now,
    );
    setLines([]);
    commit(result.state);
    handleEvents(result.events);
    setScreen("play");
  };

  const toMainMenu = () => {
    void autosaver.flush();
    setPaused(false);
    setLines([]);
    setScreen("menu");
  };

  const room = state ? content.rooms[state.room] : undefined;

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
              onVerb={(hotspot, verb) => dispatch({ type: "INTERACT", hotspot: hotspot.id, verb })}
            />
            <div className="hud">
              <button className="hud-btn" aria-label="Menü" onPointerUp={() => setPaused(true)}>
                ≡
              </button>
              <span className="hud-name">{state.player.name}</span>
            </div>
            {lines.length > 0 && (
              <TextBox line={lines[0]!} more={lines.length > 1} onNext={() => setLines((q) => q.slice(1))} />
            )}
            {paused && <PauseMenu onResume={() => setPaused(false)} onMainMenu={toMainMenu} />}
          </>
        )}
      </Stage>

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
