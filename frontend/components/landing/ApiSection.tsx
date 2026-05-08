"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";
import { PanelShell } from "@/components/ui/PanelShell";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ApiSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (getPrefersReducedMotion()) return;

    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;

    const ctx = gsap.context(() => {
      gsap.from(card, {
        y: 60,
        opacity: 0,
        ease: "power3.out",
        duration: 0.8,
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
      id="api"
      className="relative mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
    >
      <div ref={cardRef}>
        <PanelShell className="p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-slate-500">
            [ API ]
          </p>
          <h2 className="mt-3 text-sm font-medium uppercase tracking-[0.28em] text-slate-200">
            API reference
          </h2>
          <p className="mt-4 font-mono text-sm text-white">
            POST /api/v1/recommendations
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300/85">
            Implemented by the Nest service in{" "}
            <span className="font-mono text-xs text-slate-400">backend/</span>. The Next app only
            serializes the form, calls this endpoint from the browser, and renders the JSON
            response — no prediction or ranking logic lives in the frontend bundle.
          </p>
        </PanelShell>
      </div>
    </section>
  );
}
