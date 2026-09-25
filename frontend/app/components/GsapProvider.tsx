"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

let isRegistered = false;

export function registerGsapPlugins() {
  if (typeof window !== "undefined" && !isRegistered) {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    isRegistered = true;
  }
}

export function scrollToSection(sectionId: string, offsetY = 80) {
  if (typeof window === "undefined") return;
  registerGsapPlugins();

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const target = document.getElementById(sectionId);
  if (!target) return;

  if (prefersReduced) {
    const top = target.getBoundingClientRect().top + window.scrollY - offsetY;
    window.scrollTo({ top, behavior: "auto" });
    return;
  }

  gsap.to(window, {
    duration: 1.1,
    scrollTo: { y: target, offsetY },
    ease: "power3.inOut",
  });
}

export default function GsapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    registerGsapPlugins();
  }, []);

  return <>{children}</>;
}
