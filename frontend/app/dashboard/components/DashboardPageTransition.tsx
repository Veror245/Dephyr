"use client";

import React, { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function DashboardPageTransition({
  children,
}: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(containerRef.current, { opacity: 1, y: 0 });
      return;
    }

    // Cancel in-flight transitions on rapid route changes
    gsap.killTweensOf(containerRef.current);
    const panels = containerRef.current.querySelectorAll(
      ".rounded-panel, .dashboard-card"
    );
    gsap.killTweensOf(panels);

    // Initial state
    gsap.set(containerRef.current, { opacity: 0, y: 10 });
    if (panels.length > 0) {
      gsap.set(panels, { opacity: 0, y: 12 });
    }

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
    });

    // Content container fades in and glides up smoothly
    tl.to(containerRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.32,
      clearProps: "opacity,transform",
    });

    // Stagger child cards slightly for an assembled feel
    if (panels.length > 0) {
      tl.to(
        panels,
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: 0.045,
          clearProps: "opacity,transform",
        },
        "-=0.24"
      );
    }

    return () => {
      if (containerRef.current) {
        gsap.killTweensOf(containerRef.current);
        const activePanels = containerRef.current.querySelectorAll(
          ".rounded-panel, .dashboard-card"
        );
        gsap.killTweensOf(activePanels);
      }
    };
  }, [pathname]);

  return (
    <div ref={containerRef} className="dashboard-page-transition w-full">
      {children}
    </div>
  );
}
