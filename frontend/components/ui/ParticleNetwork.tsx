"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  opacity: number;
  colorPhase: number;
}

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (getPrefersReducedMotion()) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Color palette: cyan, violet, emerald
    const colors = [
      { r: 34, g: 211, b: 238 },   // cyan-400
      { r: 139, g: 92, b: 246 },   // violet-500
      { r: 52, g: 211, b: 153 },   // emerald-400
    ];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas!.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    // Particle count based on screen size
    const particleCount = Math.min(
      Math.floor((width * height) / 25000),
      120
    );
    const connectionDistance = 140;
    const mouseDistance = 180;

    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const baseRadius = Math.random() * 1.5 + 0.5;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: baseRadius,
        baseRadius,
        opacity: Math.random() * 0.5 + 0.2,
        colorPhase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    function lerpColor(a: typeof colors[0], b: typeof colors[0], t: number) {
      return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
      };
    }

    function getColor(phase: number) {
      const cycle = (phase + time * 0.3) % (Math.PI * 2);
      const normalized = cycle / (Math.PI * 2);
      const segment = normalized * 3;
      const idx = Math.floor(segment);
      const t = segment - idx;
      const c1 = colors[idx % 3];
      const c2 = colors[(idx + 1) % 3];
      return lerpColor(c1, c2, t);
    }

    function animate() {
      time += 0.008;
      ctx!.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      // Update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseDistance && dist > 0) {
          const force = (mouseDistance - dist) / mouseDistance;
          p.vx += (dx / dist) * force * 0.15;
          p.vy += (dy / dist) * force * 0.15;
        }

        // Damping
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Minimum movement
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed < 0.05) {
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
        }

        // Pulsing radius
        p.radius = p.baseRadius + Math.sin(time * 2 + p.colorPhase) * 0.3;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.12;
            const c1 = getColor(p1.colorPhase);
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${opacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const color = getColor(p.colorPhase);
        const pulse = Math.sin(time * 1.5 + p.colorPhase) * 0.15;

        // Glow
        const glowRadius = p.radius * 4;
        const gradient = ctx!.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, glowRadius
        );
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${p.opacity + pulse})`);
        gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${(p.opacity + pulse) * 0.3})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx!.beginPath();
        ctx!.fillStyle = gradient;
        ctx!.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${p.opacity + pulse + 0.3})`;
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const handleResize = () => {
      resize();
    };

    canvas!.addEventListener("mousemove", handleMouseMove);
    canvas!.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas!.removeEventListener("mousemove", handleMouseMove);
      canvas!.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 z-0"
      style={{ touchAction: "none" }}
    />
  );
}
