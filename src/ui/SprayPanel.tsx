"use client";
// Sprüh-Menü (M3): Style, Cap und Dose wählen – dann sprühen.
// Was man über Material weiß, steht direkt darunter: dafür ist das Blackbook da.
import { useState } from "react";
import type { Fact, SprayChoices } from "@/engine";

const TYPE_LABELS: Record<string, string> = {
  rolltor: "Rolltor",
  legale_wand: "Legale Wand",
  hauswand: "Hauswand",
  heaven_spot: "Heaven Spot",
  zug: "Zug",
};

export function SprayPanel(props: {
  title: string;
  choices: SprayChoices;
  tips: Fact[];
  onSpray: (style: string, cap: string, dose: string) => void;
  onClose: () => void;
}) {
  const { choices } = props;
  const only = <T extends { id: string }>(list: T[]) => (list.length === 1 ? list[0]!.id : null);
  const [style, setStyle] = useState<string | null>(null);
  const [cap, setCap] = useState<string | null>(only(choices.caps));
  const [dose, setDose] = useState<string | null>(only(choices.doses));
  const [reason, setReason] = useState<string | null>(null);
  const ready = style && cap && dose;

  return (
    <div className="overlay spray">
      <div className="bb-head">
        <span className="bb-title">Sprühen: {props.title}</span>
        <button className="small-btn" onPointerUp={props.onClose}>
          Zu
        </button>
      </div>
      <p className="spray-spot">
        {TYPE_LABELS[choices.spot.type] ?? choices.spot.type} · Risiko: {choices.spot.risk}
      </p>

      <Row label="Style">
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
      </Row>
      <Row label="Cap">
        {choices.caps.map((c) => (
          <button key={c.id} className={`chip ${cap === c.id ? "on" : ""}`} onPointerUp={() => setCap(c.id)}>
            {c.name}
          </button>
        ))}
      </Row>
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

      {reason && <p className="spray-reason">{reason}</p>}
      {!reason && !ready && <p className="spray-spot">Wähl Style, Cap und Dose.</p>}

      <button
        className="btn spray-go"
        disabled={!ready}
        onPointerUp={() => ready && props.onSpray(style, cap, dose)}
      >
        Sprühen
      </button>

      {props.tips.length > 0 && (
        <div className="spray-tips">
          <span className="spray-tips-title">Aus deinem Blackbook:</span>
          {props.tips.map((t) => (
            <p key={t.id}>{t.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="spray-row">
      <span className="spray-label">{props.label}</span>
      <div className="chips">{props.children}</div>
    </div>
  );
}
