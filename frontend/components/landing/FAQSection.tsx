"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { PanelShell } from "@/components/ui/PanelShell";

const FAQS = [
  {
    q: "Is this using live backend data?",
    a: (
      <>
        When you set{" "}
        <span className="font-mono text-xs text-emerald-300/90">NEXT_PUBLIC_API_BASE_URL</span>{" "}
        in{" "}
        <span className="font-mono text-xs text-emerald-300/90">frontend/.env.local</span>, the
        Query Console on the dashboard calls the Nest recommendation API. Without that, the console
        stays disabled for live queries.
      </>
    ),
  },
  {
    q: "Where is the console?",
    a: (
      <>
        Open{" "}
        <Link href="/dashboard" className="text-cyan-300/90 underline-offset-4 hover:underline">
          /dashboard
        </Link>{" "}
        for the full workbench: overview, Query Console, and API reference in one flow.
      </>
    ),
  },
  {
    q: "What happens after a query is typed?",
    a: "The request is validated against the typed schema, then forwarded to the recommendation service. Sources are ranked by resolution relevance and returned as a tiered list.",
  },
  {
    q: "Can I run this without a backend?",
    a: "Yes. The frontend ships with a mock-first mode. Features and the console UI are fully usable before you wire the live API.",
  },
];

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (getPrefersReducedMotion()) return;

    const section = sectionRef.current;
    const items = itemsRef.current.filter(Boolean);
    if (!section || items.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(items, {
        y: 120,
        opacity: 0,
        scale: 0.88,
        rotateX: 18,
        rotateY: (i) => (i % 2 === 0 ? -28 : 28),
        rotateZ: (i) => (i % 2 === 0 ? -6 : 6),
        transformOrigin: "center bottom",
        ease: "power3.out",
        duration: 1.1,
        stagger: {
          each: 0.12,
          from: "start",
        },
        scrollTrigger: {
          trigger: section,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative mx-auto w-full max-w-[1100px] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mb-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300/85 sm:text-[11px]">
          [ FAQ ]
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          Common questions
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2" style={{ perspective: "1000px" }}>
        {FAQS.map((faq, i) => (
          <div
            key={faq.q}
            ref={(el) => {
              if (el) itemsRef.current[i] = el;
            }}
          >
            <PanelShell
              energyBorder
              className="h-full p-6 backdrop-blur-sm"
            >
              <h3 className="text-lg font-medium text-white">{faq.q}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300/80">{faq.a}</p>
            </PanelShell>
          </div>
        ))}
      </div>
    </section>
  );
}
