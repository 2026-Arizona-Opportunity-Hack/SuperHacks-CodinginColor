"use client";
/**
 * Walking crowd, adapted from "Skiper 39 · Canvas Crowd" by Skiper UI (@gurvinder-singh02, https://gxuri.me),
 * itself inspired by https://codepen.io/zadvorsky/pen/xxwbBQV. Illustrations: Open Peeps by Pablo Stanley
 * (https://www.openpeeps.com, CC0). Skiper UI's free licence requires attribution, given here, in the
 * landing-page footer credit and in the README.
 *
 * Local changes: the sprite sheet is served from /crowd (no third-party requests, CSP-friendly);
 * sprites showing a knife are excluded for a site used by teenagers; reduced-motion and lite-mode
 * users get a still frame; the animation pauses while off-screen; typed instead of `any`.
 */
import { gsap } from "gsap";
import { useEffect, useRef } from "react";

type Rect = [number, number, number, number];
type Peep = {
  rect: Rect;
  width: number;
  height: number;
  x: number;
  y: number;
  anchorY: number;
  scaleX: number;
  walk: gsap.core.Timeline | null;
};

export function CrowdCanvas({
  src = "/crowd/open-peeps.png",
  rows = 15,
  cols = 7,
  exclude = [],
  scale = 1,
  className = "",
}: {
  src?: string;
  /** Sprites per row of the sheet (the original component calls this `rows`). */
  rows?: number;
  cols?: number;
  /** Sprite indexes to leave out. */
  exclude?: number[];
  /** Size of each person relative to the sprite sheet (the original draws them at 1). */
  scale?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.motion === "reduce" || root.dataset.lite === "on";

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const stage = { width: 0, height: 0 };
    const img = new Image();
    const all: Peep[] = [];
    const available: Peep[] = [];
    const crowd: Peep[] = [];
    let ticking = false;
    let disposed = false;

    const reset = (peep: Peep) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = (100 - 250 * gsap.parseEase("power2.in")(Math.random())) * scale;
      const startY = stage.height - peep.height + offsetY;
      const startX = direction === 1 ? -peep.width : stage.width + peep.width;
      const endX = direction === 1 ? stage.width : 0;
      peep.scaleX = direction;
      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;
      return { startY, endX };
    };

    const walk = (peep: Peep, { startY, endX }: { startY: number; endX: number }) => {
      const xDuration = 10;
      const yDuration = 0.25;
      const tl = gsap.timeline();
      tl.timeScale(rand(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
      tl.to(peep, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 * scale }, 0);
      return tl;
    };

    const add = (): Peep => {
      const peep = available.splice((Math.random() * available.length) | 0, 1)[0];
      peep.walk = walk(peep, reset(peep)).eventCallback("onComplete", () => {
        crowd.splice(crowd.indexOf(peep), 1);
        available.push(peep);
        add();
      });
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      for (const p of crowd) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scaleX, 1);
        ctx.drawImage(img, p.rect[0], p.rect[1], p.rect[2], p.rect[3], 0, 0, p.width, p.height);
        ctx.restore();
      }
      ctx.restore();
    };

    const resize = () => {
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      canvas.width = stage.width * devicePixelRatio;
      canvas.height = stage.height * devicePixelRatio;
      crowd.forEach((p) => p.walk?.kill());
      crowd.length = 0;
      available.length = 0;
      available.push(...all);
      while (available.length) add().walk?.progress(Math.random());
      if (still) {
        crowd.forEach((p) => p.walk?.pause());
        render();
      }
    };

    const setTicking = (on: boolean) => {
      if (still || on === ticking) return;
      ticking = on;
      if (on) {
        gsap.ticker.add(render);
        crowd.forEach((p) => p.walk?.resume());
      } else {
        gsap.ticker.remove(render);
        crowd.forEach((p) => p.walk?.pause());
      }
    };

    // Only animate while visible: saves battery on school Chromebooks.
    const io = new IntersectionObserver(([entry]) => setTicking(entry.isIntersecting), { rootMargin: "100px" });

    img.onload = () => {
      if (disposed) return;
      const w = img.naturalWidth / rows;
      const h = img.naturalHeight / cols;
      for (let i = 0; i < rows * cols; i++) {
        if (exclude.includes(i)) continue;
        all.push({ rect: [(i % rows) * w, ((i / rows) | 0) * h, w, h], width: w * scale, height: h * scale, x: 0, y: 0, anchorY: 0, scaleX: 1, walk: null });
      }
      resize();
      io.observe(canvas);
    };
    img.src = src;

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(render);
      crowd.forEach((p) => p.walk?.kill());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, rows, cols, scale]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
