"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

const LEFT_WORDS = [
  "SIGNAL",
  "POLYMARKET", //基准词
  "RANK",
  "RESOLUTION",
  "MARKET",
  
  "WORKBENCH",
  "INGEST",
  "PIPELINE",
  "SCORE",
  "LATENCY",
  "NEST",
  "JSON",
];

const RIGHT_WORDS = [
  "FETCH",
  "SOURCES", //基准词
  "EVIDENCE",
  "TYPED",
  "ORACLE",
  "CONTRACT",
  "VOLUME",
  "TRADE",
  "BET",
  "RESOLVE",
  "VERIFY",
  "PROOF",
];

export function DualWaveBackground() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    gsap.registerPlugin(ScrollTrigger);

    const leftColumn = wrapper.querySelector(".wave-column-left") as HTMLElement | null;
    const rightColumn = wrapper.querySelector(".wave-column-right") as HTMLElement | null;
    if (!leftColumn || !rightColumn) return;

    const leftTexts = gsap.utils.toArray<HTMLElement>(
      leftColumn.querySelectorAll(".animated-text")
    );
    const rightTexts = gsap.utils.toArray<HTMLElement>(
      rightColumn.querySelectorAll(".animated-text")
    );
    if (leftTexts.length === 0 || rightTexts.length === 0) return;

    const leftQuickSetters = leftTexts.map((text) =>
      gsap.quickTo(text, "x", { duration: 0.6, ease: "power4.out" })
    );
    const rightQuickSetters = rightTexts.map((text) =>
      gsap.quickTo(text, "x", { duration: 0.6, ease: "power4.out" })
    );

    const waveNumber = 2;
    const waveSpeed = 1;

    function calculateRanges() {
      const maxLeftWidth = Math.max(...leftTexts.map((t) => t.offsetWidth));
      const maxRightWidth = Math.max(...rightTexts.map((t) => t.offsetWidth));
      return {
        left: {
          minX: 0,
          maxX: leftColumn!.offsetWidth - maxLeftWidth,
        },
        right: {
          minX: 0,
          maxX: rightColumn!.offsetWidth - maxRightWidth,
        },
      };
    }

    let ranges = calculateRanges();

    function setInitialPositions(
      texts: HTMLElement[],
      range: { minX: number; maxX: number },
      multiplier: number
    ) {
      const rangeSize = range.maxX - range.minX;
      texts.forEach((text, index) => {
        const initialPhase = waveNumber * index - Math.PI / 2;
        const initialWave = Math.sin(initialPhase);
        const initialProgress = (initialWave + 1) / 2;
        const startX =
          (range.minX + initialProgress * rangeSize) * multiplier;
        gsap.set(text, { x: startX });
      });
    }

    setInitialPositions(leftTexts, ranges.left, 1);
    setInitialPositions(rightTexts, ranges.right, -1);

    function findClosestToViewportCenter() {
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let minDistance = Infinity;
      leftTexts.forEach((text, index) => {
        const rect = text.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      return closestIndex;
    }

    function updateColumn(
      texts: HTMLElement[],
      setters: ReturnType<typeof gsap.quickTo>[],
      range: { minX: number; maxX: number },
      progress: number,
      focusedIndex: number,
      multiplier: number
    ) {
      const rangeSize = range.maxX - range.minX;
      texts.forEach((text, index) => {
        const phase =
          waveNumber * index +
          waveSpeed * progress * Math.PI * 2 -
          Math.PI / 2;
        const wave = Math.sin(phase);
        const cycleProgress = (wave + 1) / 2;
        const finalX =
          (range.minX + cycleProgress * rangeSize) * multiplier;
        setters[index](finalX);

        if (index === focusedIndex) {
          text.classList.add("focused");
        } else {
          text.classList.remove("focused");
        }
      });
    }

    const st = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: () => {
        const progress = window.scrollY / (window.innerHeight || 1);
        const focusedIndex = findClosestToViewportCenter();
        updateColumn(
          leftTexts,
          leftQuickSetters,
          ranges.left,
          progress,
          focusedIndex,
          1
        );
        updateColumn(
          rightTexts,
          rightQuickSetters,
          ranges.right,
          progress,
          focusedIndex,
          -1
        );
      },
    });

    const handleResize = () => {
      ranges = calculateRanges();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      st.kill();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const leftWords = Array.from(
    { length: 28 },
    (_, i) => LEFT_WORDS[i % LEFT_WORDS.length]
  );
  const rightWords = Array.from(
    { length: 28 },
    (_, i) => RIGHT_WORDS[i % RIGHT_WORDS.length]
  );

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed inset-0 z-0 hidden select-none md:flex"
      style={{ gap: "22vw", padding: "0 2.5rem" }}
    >
      <div className="wave-column-left flex h-full flex-1 flex-col justify-between py-10">
        {leftWords.map((word, i) => (
          <div
            key={`l-${i}`}
            className="animated-text w-max font-mono text-[clamp(0.85rem,2vw,1.4rem)] font-medium uppercase leading-[0.7] tracking-[0.1em] text-slate-500/30 transition-colors duration-300"
          >
            {word}
          </div>
        ))}
      </div>
      <div className="wave-column-right flex h-full flex-1 flex-col items-end justify-between py-10">
        {rightWords.map((word, i) => (
          <div
            key={`r-${i}`}
            className="animated-text w-max font-mono text-[clamp(0.85rem,2vw,1.4rem)] font-medium uppercase leading-[0.7] tracking-[0.1em] text-slate-500/30 transition-colors duration-300"
          >
            {word}
          </div>
        ))}
      </div>
    </div>
  );
}
