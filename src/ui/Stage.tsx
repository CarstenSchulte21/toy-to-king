"use client";
// Die Bühne: immer 320×180 logische Pixel, ganzzahlig so groß wie möglich skaliert (SPEC 6).
import { useEffect, useState, type ReactNode } from "react";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/engine";

function computeScale(): number {
  const vv = window.visualViewport;
  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;
  const fit = Math.min(w / STAGE_WIDTH, h / STAGE_HEIGHT);
  // Ganzzahlig für saubere Pixel; nur auf sehr kleinen Fenstern notfalls kleiner als 1.
  return fit >= 1 ? Math.floor(fit) : fit;
}

export function useStageScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return scale;
}

export function Stage({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <div className="stage-outer">
      <div className="stage-frame" style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}>
        <div
          className="stage"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
