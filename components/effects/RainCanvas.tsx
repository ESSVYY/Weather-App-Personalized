"use client";

import { memo, useEffect, useRef } from "react";

export const RainCanvas = memo(function RainCanvas({ intensity, wind, quality }: { intensity: number; wind: number; quality: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (quality === "battery" || intensity <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0; let running = !document.hidden;
    const dpr = Math.min(window.devicePixelRatio, quality === "high" ? 1.7 : 1.2);
    const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const count = Math.min(150, Math.round((quality === "high" ? 105 : 65) * Math.max(.25, intensity)));
    const drops = Array.from({ length: count }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, length: 7 + Math.random() * 15, speed: 8 + Math.random() * 12, alpha: .08 + Math.random() * .2 }));
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const slant = Math.max(-6, Math.min(6, (wind - 180) / 30));
      for (const drop of drops) {
        ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x + slant, drop.y + drop.length);
        ctx.strokeStyle = `rgba(190, 218, 230, ${drop.alpha})`; ctx.lineWidth = .7; ctx.stroke();
        drop.y += drop.speed; drop.x += slant * .11;
        if (drop.y > innerHeight + 20) { drop.y = -20; drop.x = Math.random() * innerWidth; }
      }
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => { running = !document.hidden; cancelAnimationFrame(frame); if (running) draw(); };
    window.addEventListener("resize", resize); document.addEventListener("visibilitychange", visibility); draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", visibility); };
  }, [intensity, quality, wind]);
  return <canvas ref={canvasRef} className="rain-canvas" aria-hidden />;
});
