"use client";

import { useEffect, useRef, useState } from "react";

const LEFT_WORDS = [
  "SIGNAL",
  "POLYMARKET",
  "RANK",
  "RESOLUTION",
  "MARKET",
  "FETCH",
  "SOURCES",
  "EVIDENCE",
];

const RIGHT_WORDS = [
  "ORACLE",
  "CONTRACT",
  "VOLUME",
  "TRADE",
  "RESOLVE",
  "VERIFY",
  "PROOF",
  "SCORE",
];

interface FlashItem {
  index: number;
  side: "left" | "right";
  intensity: number;
  color: "cyan" | "violet" | "emerald" | "white";
}

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DualWaveBackground() {
  const [flashes, setFlashes] = useState<FlashItem[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (getPrefersReducedMotion()) return;

    const leftCount = 16;
    const rightCount = 16;

    function scheduleFlash() {
      const delay = Math.random() * 1500 + 800;
      const timer = setTimeout(() => {
        const side: "left" | "right" = Math.random() > 0.5 ? "left" : "right";
        const count = side === "left" ? leftCount : rightCount;
        const index = Math.floor(Math.random() * count);
        const intensity = Math.random();
        const colors: FlashItem["color"][] = ["cyan", "violet", "emerald", "white"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const flash: FlashItem = { index, side, intensity, color };
        setFlashes((prev) => [...prev.slice(-8), flash]);

        const duration = intensity > 0.7 ? 1600 : intensity > 0.4 ? 1200 : 900;
        const removeTimer = setTimeout(() => {
          setFlashes((prev) => prev.filter((f) => f !== flash));
        }, duration + 80);
        timersRef.current.push(removeTimer);

        scheduleFlash();
      }, delay);
      timersRef.current.push(timer);
    }

    for (let i = 0; i < 2; i++) {
      setTimeout(() => scheduleFlash(), i * 400);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const leftWords = Array.from(
    { length: 16 },
    (_, i) => LEFT_WORDS[i % LEFT_WORDS.length]
  );
  const rightWords = Array.from(
    { length: 16 },
    (_, i) => RIGHT_WORDS[i % RIGHT_WORDS.length]
  );

  function isFlashing(side: "left" | "right", index: number): FlashItem | undefined {
    return flashes.find((f) => f.side === side && f.index === index);
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden select-none md:flex"
      style={{ gap: "22vw", padding: "0 2.5rem" }}
    >
      <div className="flex h-full flex-1 flex-col justify-between py-16">
        {leftWords.map((word, i) => {
          const flash = isFlashing("left", i);
          return (
            <div
              key={`l-${i}`}
              className={`w-max font-mono text-[clamp(0.85rem,2vw,1.4rem)] font-medium uppercase leading-[0.7] tracking-[0.1em] transition-none ${
                flash
                  ? `flash-active flash-${flash.color} ${
                      flash.intensity > 0.7 ? "flash-glitch" : ""
                    }`
                  : "text-slate-500/[0.025]"
              }`}
              style={
                flash
                  ? {
                      animationDuration:
                        flash.intensity > 0.7
                          ? "600ms"
                          : flash.intensity > 0.4
                            ? "450ms"
                            : "320ms",
                    }
                  : undefined
              }
            >
              {word}
            </div>
          );
        })}
      </div>
      <div className="flex h-full flex-1 flex-col items-end justify-between py-16">
        {rightWords.map((word, i) => {
          const flash = isFlashing("right", i);
          return (
            <div
              key={`r-${i}`}
              className={`w-max font-mono text-[clamp(0.85rem,2vw,1.4rem)] font-medium uppercase leading-[0.7] tracking-[0.1em] transition-none ${
                flash
                  ? `flash-active flash-${flash.color} ${
                      flash.intensity > 0.7 ? "flash-glitch" : ""
                    }`
                  : "text-slate-500/[0.025]"
              }`}
              style={
                flash
                  ? {
                      animationDuration:
                        flash.intensity > 0.7
                          ? "600ms"
                          : flash.intensity > 0.4
                            ? "450ms"
                            : "320ms",
                    }
                  : undefined
              }
            >
              {word}
            </div>
          );
        })}
      </div>
    </div>
  );
}
