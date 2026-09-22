"use client";
// Sprühen 2.0 (M3.5): Sketch wählen, dann Ebene für Ebene die Führungslinie nachfahren.
// Die Oberfläche sammelt nur die Fingerbahnen – was dabei herauskommt, rechnet die Engine
// (dieselbe Rechnung für die Live-Ansicht und für das gespeicherte Werk).
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  PASS_LABELS,
  decorFor,
  WORK_H,
  WORK_W,
  letteringFor,
  passTimeLimit,
  renderSketch,
  renderWork,
  sprayChoices,
  type Action,
  type Fact,
  type GameContent,
  type GameEvent,
  type GameState,
  type PassKind,
  type Stroke,
  type WorkColors,
  type WorkDraft,
} from "@/engine";
import { paintWall, paintWork, rgbCss, toCanvas } from "./paint";

type SprayAction = Extract<Action, { type: "SPRAY" }>;
type Phase =
  | { kind: "sketch" }
  | { kind: "pass"; index: number }
  | { kind: "result"; text: string; hints: string[]; xp: number }
  | { kind: "error"; message: string };

const TYPE_LABELS: Record<string, string> = {
  rolltor: "Rolltor",
  legale_wand: "Legale Wand",
  hauswand: "Hauswand",
  heaven_spot: "Heaven Spot",
  zug: "Zug",
};
const HOLD_SAMPLE_MS = 50; // Finger steht: trotzdem regelmäßig messen, sonst merkt keiner das Verweilen

export function SprayScene(props: {
  content: GameContent;
  state: GameState;
  spot: string;
  title: string;
  tips: Fact[];
  onSpray: (action: SprayAction) => GameEvent[];
  onClose: () => void;
}) {
  const { content, state } = props;
  const choices = sprayChoices(state, content, props.spot)!;
  const name = state.player.name;
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000) + 1);
  const [phase, setPhase] = useState<Phase>({ kind: "sketch" });

  // ---------- Sketch ----------
  const initial = useMemo(() => {
    const last = state.lastSketch;
    const hasColor = (id?: string) => !!id && choices.colors.some((c) => c.id === id);
    const firstStyle =
      choices.styles.find((s) => s.available && s.id === last?.style) ??
      choices.styles.find((s) => s.available && s.look === "bubble") ??
      choices.styles.find((s) => s.available);
    const c0 = choices.colors[0]?.id;
    const c1 = choices.colors[1]?.id ?? c0;
    return {
      style: firstStyle?.id ?? null,
      line: hasColor(last?.colors.line) ? last!.colors.line! : c0,
      fill: last?.colors.fill?.every(hasColor) && last.colors.fill.length ? last.colors.fill : c1 ? [c1] : [],
      outline: hasColor(last?.colors.outline) ? last!.colors.outline! : c0,
      second: hasColor(last?.colors.second) ? last!.colors.second : undefined,
      background: hasColor(last?.colors.background) ? last!.colors.background : undefined,
      dose: choices.doses.some((d) => d.id === last?.dose) ? last!.dose : (choices.doses[0]?.id ?? null),
      caps: Object.fromEntries(
        (["line", "fill", "outline"] as PassKind[]).map((k) => [
          k,
          choices.caps.some((c) => c.id === last?.caps[k]) ? last!.caps[k]! : (choices.caps[0]?.id ?? ""),
        ]),
      ) as Record<PassKind, string>,
    };
    // Nur beim Öffnen – danach gehört der Sketch dem Spieler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [style, setStyle] = useState<string | null>(initial.style);
  const [line, setLine] = useState(initial.line);
  const [fill, setFill] = useState<string[]>(initial.fill);
  const [outline, setOutline] = useState(initial.outline);
  const [second, setSecond] = useState<string | undefined>(initial.second);
  const [background, setBackground] = useState<string | undefined>(initial.background);
  const [dose, setDose] = useState<string | null>(initial.dose);
  const [caps, setCaps] = useState<Record<PassKind, string>>(initial.caps);
  const [reason, setReason] = useState<string | null>(null);

  const styleChoice = choices.styles.find((s) => s.id === style);
  const isTag = styleChoice?.look === "tag";
  const decor = styleChoice ? decorFor(styleChoice.look) : null;
  const colors = useMemo<WorkColors>(
    () => ({
      ...(isTag ? { line } : { fill, outline }),
      ...(decor?.second && second ? { second } : {}),
      ...(decor?.background && background ? { background } : {}),
    }),
    [isTag, line, fill, outline, decor?.second, decor?.background, second, background],
  );
  const passKinds: PassKind[] = styleChoice?.passes ?? [];
  const ready = !!styleChoice?.available && !!dose && (isTag ? !!line : fill.length > 0 && !!outline);

  const toggleFill = (id: string) =>
    setFill((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id].slice(-2)));

  // ---------- Nachfahren ----------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wall = useMemo(() => {
    const buf = new Uint8ClampedArray(WORK_W * WORK_H * 4);
    paintWall(buf, choices.spot.type, 7);
    return buf;
  }, [choices.spot.type]);
  const lettering = style ? letteringFor(content, name, style, seed) : null;
  const flow = dose ? (content.items[dose]?.flow ?? 4) : 4;
  const limit = lettering ? passTimeLimit(lettering, flow) : 10000;

  const done = useRef<WorkDraft["passes"]>([]);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const t0 = useRef<number | null>(null);
  const lastPos = useRef<[number, number]>([0, 0]);
  const dirty = useRef(true);
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(1); // Anteil der Restzeit
  const [capHint, setCapHint] = useState(false);

  const passIndex = phase.kind === "pass" ? phase.index : -1;
  const passKind = passIndex >= 0 ? passKinds[passIndex] : undefined;

  const draft = useCallback(
    (withCurrent: boolean): WorkDraft => ({
      style: style ?? "",
      colors,
      dose: dose ?? "",
      seed,
      passes: [
        ...done.current,
        ...(withCurrent && passKind
          ? [{ kind: passKind, cap: caps[passKind], strokes: strokes.current }]
          : []),
      ],
    }),
    [style, colors, dose, seed, passKind, caps],
  );

  const drawFrame = useCallback(
    (pixels: Uint8Array | null, guide?: { exposure: Float32Array }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const buf = wall.slice();
      if (pixels) paintWork(buf, pixels);
      if (guide && lettering) {
        // Führungslinie: nur da, wo noch zu wenig Farbe ist
        for (let k = 0; k < lettering.nodeCount; k += 2) {
          if ((guide.exposure[k] ?? 0) >= 1) continue;
          const x = Math.round(lettering.nodes[k * 2]!);
          const y = Math.round(lettering.nodes[k * 2 + 1]!);
          if (x < 0 || y < 0 || x >= WORK_W || y >= WORK_H) continue;
          const i = (y * WORK_W + x) * 4;
          buf[i] = 238;
          buf[i + 1] = 238;
          buf[i + 2] = 119;
        }
      }
      toCanvas(canvas, buf);
    },
    [wall, lettering],
  );

  // Sketch-Vorschau
  const preview = useMemo(
    () => (style && phase.kind === "sketch" ? renderSketch(content, name, style, colors, seed) : null),
    [content, name, style, colors, seed, phase.kind],
  );
  useEffect(() => {
    if (phase.kind === "sketch") drawFrame(preview);
  }, [phase.kind, preview, drawFrame]);

  const finishPass = useCallback(() => {
    if (phase.kind !== "pass" || !passKind) return;
    drawing.current = false;
    done.current = [...done.current, { kind: passKind, cap: caps[passKind], strokes: strokes.current }];
    strokes.current = [];
    t0.current = null;
    setStarted(false);
    setLeft(1);
    dirty.current = true;
    if (phase.index + 1 < passKinds.length) {
      setPhase({ kind: "pass", index: phase.index + 1 });
      return;
    }
    const events = props.onSpray({
      type: "SPRAY",
      spot: props.spot,
      style: style!,
      colors,
      dose: dose!,
      passes: done.current,
      seed,
    });
    const sprayed = events.find((e) => e.type === "SPRAYED");
    if (sprayed?.type === "SPRAYED") {
      setPhase({ kind: "result", text: sprayed.text, hints: sprayed.hints, xp: sprayed.xp });
    } else {
      const warning = events.find((e) => e.type === "WARNING");
      setPhase({ kind: "error", message: warning?.type === "WARNING" ? warning.message : "Das ging nicht." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, passKind, caps, passKinds.length, style, dose, seed, props.onSpray, props.spot]);

  // Live-Ansicht und Zeit beim Nachfahren
  useEffect(() => {
    if (phase.kind !== "pass") return;
    let frame = 0;
    const loop = () => {
      if (dirty.current) {
        dirty.current = false;
        const result = renderWork(content, name, draft(true));
        const current = result?.stats[phase.index];
        drawFrame(result?.pixels ?? null, current ? { exposure: current.exposure } : undefined);
      }
      if (t0.current !== null) {
        const elapsed = performance.now() - t0.current;
        setLeft(Math.max(0, 1 - elapsed / limit));
        if (elapsed >= limit) {
          finishPass();
          return;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    dirty.current = true;
    frame = requestAnimationFrame(loop);
    const hold = setInterval(() => {
      if (!drawing.current || t0.current === null) return;
      const s = strokes.current[strokes.current.length - 1];
      if (!s) return;
      s.push(lastPos.current[0], lastPos.current[1], Math.round(performance.now() - t0.current));
      dirty.current = true;
    }, HOLD_SAMPLE_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(hold);
    };
  }, [phase, content, name, draft, drawFrame, limit, finishPass]);

  // Ergebnis anzeigen
  useEffect(() => {
    if (phase.kind !== "result") return;
    const result = renderWork(content, name, draft(false));
    drawFrame(result?.pixels ?? null);
  }, [phase.kind, content, name, draft, drawFrame]);

  const toWork = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(((e.clientX - rect.left) / rect.width) * WORK_W * 2) / 2,
      Math.round(((e.clientY - rect.top) / rect.height) * WORK_H * 2) / 2,
    ];
  };
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (phase.kind !== "pass" || !passKind) return;
    if (!caps[passKind]) {
      setCapHint(true);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (t0.current === null) {
      t0.current = performance.now();
      setStarted(true);
    }
    const [x, y] = toWork(e);
    lastPos.current = [x, y];
    drawing.current = true;
    strokes.current = [...strokes.current, [x, y, Math.round(performance.now() - t0.current)]];
    dirty.current = true;
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || t0.current === null) return;
    const [x, y] = toWork(e);
    lastPos.current = [x, y];
    strokes.current[strokes.current.length - 1]!.push(x, y, Math.round(performance.now() - t0.current));
    dirty.current = true;
  };
  const onUp = () => {
    drawing.current = false;
  };

  const startSpraying = () => {
    if (!ready) return;
    done.current = [];
    strokes.current = [];
    setPhase({ kind: "pass", index: 0 });
  };
  const again = () => {
    done.current = [];
    strokes.current = [];
    setPhase({ kind: "sketch" });
  };

  // ---------- Darstellung ----------
  const Swatch = (p: { id: string; on: boolean; onPick: () => void; mark?: string }) => {
    const c = choices.colors.find((x) => x.id === p.id)!;
    return (
      <button
        className={`swatch ${p.on ? "on" : ""}`}
        style={{ background: rgbCss(c.color ?? 0) }}
        aria-label={c.name}
        title={c.name}
        onPointerUp={p.onPick}
      >
        {p.mark}
      </button>
    );
  };
  const colorName = (id?: string) => choices.colors.find((c) => c.id === id)?.name ?? "keine";

  return (
    <div className={`overlay spray-scene phase-${phase.kind}`}>
      <canvas
        ref={canvasRef}
        width={WORK_W}
        height={WORK_H}
        className="spray-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />

      {phase.kind === "sketch" && (
        <>
          <div className="sketch-panel">
            <div className="sketch-head">
              <span className="bb-title">Sketch</span>
              <button className="small-btn" onPointerUp={props.onClose}>
                Zu
              </button>
            </div>
            <div className="chips">
              {choices.styles.map((s) => (
                <button
                  key={s.id}
                  className={`chip ${style === s.id ? "on" : ""} ${s.available ? "" : "locked"}`}
                  onPointerUp={() => {
                    if (!s.available) return setReason(s.reason ?? null);
                    setReason(null);
                    setStyle(s.id);
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {isTag ? (
              <Row label="Farbe" value={colorName(line)}>
                {choices.colors.map((c) => (
                  <Swatch key={c.id} id={c.id} on={line === c.id} onPick={() => setLine(c.id)} />
                ))}
              </Row>
            ) : (
              <>
                <Row label="Fill-in" value={fill.map(colorName).join(" → ") || "–"}>
                  {choices.colors.map((c) => (
                    <Swatch
                      key={c.id}
                      id={c.id}
                      on={fill.includes(c.id)}
                      mark={
                        fill.length > 1 && fill.includes(c.id) ? String(fill.indexOf(c.id) + 1) : undefined
                      }
                      onPick={() => toggleFill(c.id)}
                    />
                  ))}
                </Row>
                <Row label="Outline" value={colorName(outline)}>
                  {choices.colors.map((c) => (
                    <Swatch key={c.id} id={c.id} on={outline === c.id} onPick={() => setOutline(c.id)} />
                  ))}
                </Row>
              </>
            )}
            {decor?.second && (
              <Row label="2. Outline" value={colorName(second)}>
                {choices.colors.map((c) => (
                  <Swatch
                    key={c.id}
                    id={c.id}
                    on={second === c.id}
                    onPick={() => setSecond(second === c.id ? undefined : c.id)}
                  />
                ))}
              </Row>
            )}
            {decor?.background && (
              <Row label="Background" value={colorName(background)}>
                {choices.colors.map((c) => (
                  <Swatch
                    key={c.id}
                    id={c.id}
                    on={background === c.id}
                    onPick={() => setBackground(background === c.id ? undefined : c.id)}
                  />
                ))}
              </Row>
            )}
          </div>
          <div className="sketch-dose">
            <Row label="Dose">
              {choices.doses.map((d) => (
                <button
                  key={d.id}
                  className={`chip ${dose === d.id ? "on" : ""}`}
                  onPointerUp={() => setDose(d.id)}
                >
                  {d.name}
                </button>
              ))}
            </Row>
          </div>
          <div className="sketch-info">
            <span>
              {props.title} · {TYPE_LABELS[choices.spot.type] ?? choices.spot.type} · Risiko:{" "}
              {choices.spot.risk}
            </span>
            <button className="small-btn" onPointerUp={() => setSeed((s) => (s % 999_983) + 17)}>
              Anders
            </button>
          </div>
          <button className="btn spray-go" disabled={!ready} onPointerUp={startSpraying}>
            An die Wand
          </button>
          {reason && <p className="sketch-reason">{reason}</p>}
          {!reason && props.tips.length > 0 && (
            <div className="sketch-tips">
              {props.tips.slice(0, 2).map((t) => (
                <p key={t.id}>{t.text}</p>
              ))}
            </div>
          )}
        </>
      )}

      {phase.kind === "pass" && passKind && (
        <>
          <div className="pass-bar">
            <span className="pass-name">
              {PASS_LABELS[passKind]}
              {passKinds.length > 1 ? ` ${phase.index + 1}/${passKinds.length}` : ""}
            </span>
            <span className="pass-colors">
              {(passKind === "line" ? [line] : passKind === "fill" ? fill : [outline]).map((id) => (
                <i
                  key={id}
                  style={{ background: rgbCss(choices.colors.find((c) => c.id === id)?.color ?? 0) }}
                />
              ))}
            </span>
            {!started ? (
              <div className="chips">
                {choices.caps.map((c) => (
                  <button
                    key={c.id}
                    className={`chip ${caps[passKind] === c.id ? "on" : ""}`}
                    onPointerUp={() => {
                      setCapHint(false);
                      setCaps((all) => ({ ...all, [passKind]: c.id }));
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="pass-cap">{choices.caps.find((c) => c.id === caps[passKind])?.name}</span>
            )}
            <span className="pass-time">
              <i style={{ width: `${Math.round(left * 100)}%` }} />
            </span>
            <span className="pass-seconds">{Math.ceil((left * limit) / 1000)} s</span>
            <button className="small-btn" onPointerUp={finishPass}>
              Fertig
            </button>
          </div>
          {!started && (
            <p className="pass-hint">
              {capHint
                ? "Erst einen Cap wählen."
                : "Fahr die gelbe Linie nach. Die Zeit läuft ab der ersten Berührung."}
            </p>
          )}
          <button className="small-btn pass-abort" onPointerUp={props.onClose}>
            Abbrechen
          </button>
        </>
      )}

      {(phase.kind === "result" || phase.kind === "error") && (
        <div className="spray-result">
          <p className="spray-result-text">
            {phase.kind === "result" ? phase.text : phase.message}
            {phase.kind === "result" && phase.xp > 0 && <span className="spray-xp">+{phase.xp} XP</span>}
          </p>
          {phase.kind === "result" && phase.hints.map((h) => <p key={h}>{h}</p>)}
          <div className="menu-buttons row">
            <button className="btn" onPointerUp={again}>
              Nochmal
            </button>
            <button className="btn" onPointerUp={props.onClose}>
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row(props: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="sketch-row">
      <span className="sketch-label">
        {props.label}
        {props.value ? <em>{props.value}</em> : null}
      </span>
      <div className="chips">{props.children}</div>
    </div>
  );
}
