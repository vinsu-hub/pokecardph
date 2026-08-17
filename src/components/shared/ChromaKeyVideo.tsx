"use client";

import { useEffect, useRef } from "react";

/**
 * Real per-frame background removal for the Pikachu sprite sheet, which
 * bakes each frame onto a near-white (#F8FAFC) card background rather than
 * true alpha (see D:\CODING\remotion\src\pikachu\spritesheet.tsx's own
 * comment). Replaces the earlier `mix-blend-mode: multiply` approach, which
 * only hid that near-white padding when whatever sat behind it was also
 * uniformly light — true of the old flat overlay tint, false now that the
 * backdrop can be a real, colorful blurred photo of the previous page (the
 * sprite's own box became visible again once that changed). Drawing to a
 * canvas and keying near-white pixels to transparent is backdrop-agnostic,
 * so it can't regress the same way if the backdrop design changes again.
 *
 * The source `<video>` stays mounted (autoplay drives the actual decode/
 * playback clock) but visually hidden; the canvas mirrors its frames.
 */
const KEY_COLOR = { r: 248, g: 250, b: 252 }; // #F8FAFC
const KEY_THRESHOLD = 18; // color-distance fully keyed to transparent
const KEY_FEATHER = 14; // extra distance the alpha ramps over, softening edges instead of a hard cutout

export function ChromaKeyVideo({
  src,
  loop,
  videoKey,
  className,
}: {
  src: string;
  loop: boolean;
  /** Forces the underlying <video> to remount so a fresh clip always starts at frame 0. */
  videoKey: string | number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let raf = 0;
    let cancelled = false;

    function draw() {
      if (cancelled) return;
      if (video!.readyState >= 2 && video!.videoWidth > 0) {
        if (canvas!.width !== video!.videoWidth || canvas!.height !== video!.videoHeight) {
          canvas!.width = video!.videoWidth;
          canvas!.height = video!.videoHeight;
        }
        ctx!.drawImage(video!, 0, 0);
        const frame = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - KEY_COLOR.r;
          const dg = data[i + 1] - KEY_COLOR.g;
          const db = data[i + 2] - KEY_COLOR.b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist < KEY_THRESHOLD) {
            data[i + 3] = 0;
          } else if (dist < KEY_THRESHOLD + KEY_FEATHER) {
            data[i + 3] = Math.round((255 * (dist - KEY_THRESHOLD)) / KEY_FEATHER);
          }
        }
        ctx!.putImageData(frame, 0, 0);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [src]);

  return (
    <>
      <video
        ref={videoRef}
        key={videoKey}
        autoPlay
        loop={loop}
        muted
        playsInline
        className="hidden"
        src={src}
      />
      <canvas ref={canvasRef} className={className} />
    </>
  );
}
