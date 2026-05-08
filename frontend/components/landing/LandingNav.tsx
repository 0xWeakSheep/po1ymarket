"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SECTIONS = ["intro", "faq"];

export function LandingNav() {
  const [activeSection, setActiveSection] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.hash.replace("#", "") || "intro";
    }
    return "intro";
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const linkBase =
    "relative cursor-pointer transition-colors duration-200 hover:text-slate-200";
  const linkInactive = "text-slate-400";
  const linkActive =
    "text-white after:absolute after:bottom-[-3px] after:left-0 after:h-[1px] after:w-full after:bg-white/80";

  const isAnchorActive = (href: string) => activeSection === href.slice(1);

  return (
    <nav className="sticky top-4 z-30 mx-auto flex w-full max-w-[1480px] items-center justify-between rounded-full px-4 py-3 text-sm text-slate-300  sm:px-6">
      <Link
        href="/"
        className="font-mono text-[11px] uppercase tracking-[0.34em] text-slate-100 transition-colors hover:text-white"
      >
        po1market
      </Link>
      <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.22em] sm:text-[11px]">
        <a
          href="#intro"
          className={`${linkBase} ${
            isAnchorActive("#intro") ? linkActive : linkInactive
          }`}
        >
          Intro
        </a>
        <Link
          href="/dashboard"
          className={`${linkBase} ${linkInactive}`}
        >
          Workbench
        </Link>
        <Link
          href="#api"
          className={`${linkBase} ${linkInactive}`}
        >
          API
        </Link>
        <a
          href="#faq"
          className={`${linkBase} ${
            isAnchorActive("#faq") ? linkActive : linkInactive
          }`}
        >
          FAQ
        </a>
      </div>
    </nav>
  );
}
