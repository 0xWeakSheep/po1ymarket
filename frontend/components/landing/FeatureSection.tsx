"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";
import { PanelShell } from "@/components/ui/PanelShell";

const FEATURES = [
  {
    title: "Typed Request",
    desc: "Structure your market query with typed fields. No free-form guesswork—every parameter is validated before it hits the recommendation pipeline.",
  },
  {
    title: "Ranked Sources",
    desc: "Evidence URLs are scored by resolution relevance, not just keyword match. Tier-1 sources surface first; context links follow.",
  },
  {
    title: "Live API",
    desc: "Wire the frontend directly to the NestJS recommendation backend. Set NEXT_PUBLIC_API_BASE_URL and the console graduates from mock to live instantly.",
  },
  {
    title: "Resolution Relevance",
    desc: "Scoring separates narrative energy from actual resolution evidence. Know which sources matter before the market resolves.",
  },
];

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FeatureSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (getPrefersReducedMotion()) return;

    const section = sectionRef.current;
    const cards = cardsRef.current.filter(Boolean);
    if (!section || cards.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(cards, {
        y: 80,
        opacity: 0,
        scale: 0.96,
        ease: "power3.out",
        duration: 0.8,
        stagger: 0.12,
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative mx-auto w-full max-w-[1100px] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mb-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300/85 sm:text-[11px]">
          [ Features ]
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          How it works
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            ref={(el) => {
              if (el) cardsRef.current[i] = el;
            }}
          >
            <PanelShell className="h-full p-6 sm:p-8">
              <div className="flex h-full flex-col">
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-slate-500">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300/80">{f.desc}</p>
              </div>
            </PanelShell>
          </div>
        ))}
      </div>
    </section>
  );
}
