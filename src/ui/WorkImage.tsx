"use client";
// Das eigene Werk am Spot: aus Sketch und Fingerbahnen neu berechnet, verkleinert im Hotspot.
import { useEffect, useMemo, useRef } from "react";
import { TRANSPARENT, WORK_W, renderWork, type GameContent, type Work } from "@/engine";
import { PALETTE } from "@/engine";

export function WorkImage(props: { content: GameContent; name: string; work: Work }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const image = useMemo(() => {
    const result = renderWork(props.content, props.name, props.work);
    if (!result) return null;
    const px = result.pixels;
    let x0 = WORK_W;
    let y0 = Infinity;
    let x1 = -1;
    let y1 = -1;
    for (let i = 0; i < px.length; i++) {
      if (px[i] === TRANSPARENT) continue;
      const x = i % WORK_W;
      const y = (i / WORK_W) | 0;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const buf = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = px[(y + y0) * WORK_W + x + x0]!;
        if (v === TRANSPARENT) continue;
        const c = PALETTE[v]!.rgb;
        const o = (y * w + x) * 4;
        buf[o] = c[0];
        buf[o + 1] = c[1];
        buf[o + 2] = c[2];
        buf[o + 3] = 255;
      }
    }
    return { buf, w, h };
  }, [props.content, props.name, props.work]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !image) return;
    canvas.width = image.w;
    canvas.height = image.h;
    canvas
      .getContext("2d")
      ?.putImageData(new ImageData(image.buf as Uint8ClampedArray<ArrayBuffer>, image.w, image.h), 0, 0);
  }, [image]);

  if (!image) return null;
  return <canvas ref={ref} className="work-image" aria-hidden />;
}
