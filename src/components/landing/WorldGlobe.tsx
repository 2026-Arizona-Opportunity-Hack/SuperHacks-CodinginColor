"use client";
import { useEffect, useRef, useState } from "react";
import { geoGraticule10, geoOrthographic, geoPath, geoDistance, type GeoPermissibleObjects } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

/** Phoenix, AZ, where Coding in Color's classrooms are. */
const PHOENIX: [number, number] = [-112.074, 33.448];
const SIZE = 400;
const R = SIZE / 2 - 8;

/**
 * A real world map (Natural Earth country outlines from world-atlas) on an orthographic globe.
 * It spins slowly, can be dragged, highlights Phoenix, and stays still for reduced-motion users.
 * The map data is bundled and lazy-loaded, so there are no third-party requests.
 */
export function WorldGlobe({ label }: { label: string }) {
  const landRef = useRef<SVGPathElement>(null);
  const bordersRef = useRef<SVGPathElement>(null);
  const graticuleRef = useRef<SVGPathElement>(null);
  const pinRef = useRef<SVGGElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduce" ||
      document.documentElement.dataset.lite === "on";

    import("world-atlas/countries-110m.json").then((mod) => {
      if (disposed) return;
      const world = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection }>;
      const land = feature(world, world.objects.countries) as GeoPermissibleObjects;
      const borders = mesh(world, world.objects.countries, (a, b) => a !== b) as GeoPermissibleObjects;
      const graticule = geoGraticule10();

      // Start with Phoenix facing the viewer, slightly tilted like a desk globe.
      let rotation: [number, number, number] = [-PHOENIX[0] - 25, -18, 0];
      const projection = geoOrthographic().scale(R).translate([SIZE / 2, SIZE / 2]).clipAngle(90).precision(0.6);
      const path = geoPath(projection);

      const draw = () => {
        projection.rotate(rotation);
        landRef.current?.setAttribute("d", path(land) ?? "");
        bordersRef.current?.setAttribute("d", path(borders) ?? "");
        graticuleRef.current?.setAttribute("d", path(graticule) ?? "");
        // Hide the pin when Phoenix rotates to the far side of the globe.
        const center: [number, number] = [-rotation[0], -rotation[1]];
        const visible = geoDistance(PHOENIX, center) < Math.PI / 2 - 0.05;
        const [x, y] = projection(PHOENIX) ?? [0, 0];
        if (pinRef.current) {
          pinRef.current.setAttribute("transform", `translate(${x},${y})`);
          pinRef.current.style.opacity = visible ? "1" : "0";
        }
      };

      // Drag to spin.
      const svg = landRef.current?.ownerSVGElement;
      let dragging: { x: number; y: number; rot: [number, number, number] } | null = null;
      const down = (e: PointerEvent) => {
        dragging = { x: e.clientX, y: e.clientY, rot: [...rotation] as [number, number, number] };
        svg?.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        const k = 0.35;
        rotation = [dragging.rot[0] + (e.clientX - dragging.x) * k, Math.max(-60, Math.min(60, dragging.rot[1] - (e.clientY - dragging.y) * k)), 0];
        draw();
      };
      const up = () => (dragging = null);
      svg?.addEventListener("pointerdown", down);
      svg?.addEventListener("pointermove", move);
      svg?.addEventListener("pointerup", up);
      svg?.addEventListener("pointercancel", up);

      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(64, now - last);
        last = now;
        if (!dragging && document.visibilityState === "visible") {
          rotation = [rotation[0] + dt * 0.012, rotation[1], 0]; // ~12° per second
          draw();
        }
        raf = requestAnimationFrame(tick);
      };

      draw();
      setReady(true);
      if (!reduce) raf = requestAnimationFrame(tick);

      cleanup = () => {
        svg?.removeEventListener("pointerdown", down);
        svg?.removeEventListener("pointermove", move);
        svg?.removeEventListener("pointerup", up);
        svg?.removeEventListener("pointercancel", up);
      };
    });

    let cleanup = () => {};
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, []);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing" role="img" aria-label={label}>
      <defs>
        <radialGradient id="ocean" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="rgb(var(--brand) / .30)" />
          <stop offset="0.7" stopColor="rgb(var(--brand) / .12)" />
          <stop offset="1" stopColor="rgb(var(--brand) / .22)" />
        </radialGradient>
        <radialGradient id="shine" cx="32%" cy="26%" r="45%">
          <stop offset="0" stopColor="white" stopOpacity=".28" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* atmosphere halo */}
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R + 6} fill="none" stroke="rgb(var(--brand) / .18)" strokeWidth="10" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#ocean)" stroke="rgb(var(--brand) / .45)" strokeWidth="1" />
      <path ref={graticuleRef} fill="none" stroke="rgb(var(--brand) / .16)" strokeWidth=".6" />
      <path ref={landRef} fill="rgb(var(--brand) / .55)" stroke="none" style={{ transition: "opacity .6s", opacity: ready ? 1 : 0 }} />
      <path ref={bordersRef} fill="none" stroke="rgb(var(--surface) / .55)" strokeWidth=".5" strokeLinejoin="round" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#shine)" pointerEvents="none" />
      <g ref={pinRef} style={{ transition: "opacity .3s", opacity: 0 }} filter="url(#glow)">
        <circle r="14" fill="rgb(var(--accent) / .25)">
          <animate attributeName="r" values="5;16;5" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".9;0;.9" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle r="5" fill="rgb(var(--accent))" stroke="white" strokeWidth="1.8" />
        <text x="10" y="-9" fontSize="12" fontWeight="700" fill="rgb(var(--ink))" stroke="rgb(var(--bg))" strokeWidth="3" paintOrder="stroke">
          Phoenix, AZ
        </text>
      </g>
    </svg>
  );
}
