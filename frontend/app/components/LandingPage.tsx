"use client";

import React, { useState, useEffect } from "react";
import styles from "../page.module.css";
import Header from "./Header";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import WhyDephyr from "./WhyDephyr";
import CaseStudy from "./CaseStudy";
import ContactCTA from "./ContactCTA";
import { registerGsapPlugins } from "./GsapProvider";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import SmoothScroll from "./SmoothScroll";
import HeroBackground from "./HeroBackground";

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState<
    "home" | "product" | "case-studies" | "contact"
  >("home");

  // Track active section via ScrollTrigger
  useEffect(() => {
    registerGsapPlugins();

    const sections = [
      { id: "home", key: "home" as const },
      { id: "product", key: "product" as const },
      { id: "case-studies", key: "case-studies" as const },
      { id: "contact", key: "contact" as const },
    ];

    const triggers: ScrollTrigger[] = [];

    sections.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const trigger = ScrollTrigger.create({
        trigger: el,
        start: "top 45%",
        end: "bottom 45%",
        onEnter: () => setActiveSection(key),
        onEnterBack: () => setActiveSection(key),
      });

      triggers.push(trigger);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, []);

  const handleNavClick = (sectionId: string) => {
    const map: Record<string, "home" | "product" | "case-studies" | "contact"> = {
      home: "home",
      product: "product",
      "case-studies": "case-studies",
      contact: "contact",
    };
    if (map[sectionId]) {
      setActiveSection(map[sectionId]);
    }

    const smoother = ScrollSmoother.get();
    if (smoother) {
      smoother.scrollTo(`#${sectionId}`, true, sectionId === "home" ? "top 0px" : "top 96px");
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - (sectionId === "home" ? 0 : 96);
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <div className={styles.page}>
      {/* Fixed Hero Background Video Layer */}
      <HeroBackground />

      {/* Soft top gradient fade behind nav */}
      <div className={styles.navTopFade} aria-hidden="true" />

      {/* Floating Header OUTSIDE smooth-wrapper for perfect fixed positioning & z-index */}
      <Header activeSection={activeSection} onNavClick={handleNavClick} />

      {/* GSAP ScrollSmoother exact DOM structure */}
      <SmoothScroll>
        <div id="smooth-wrapper" className={styles.smoothWrapper}>
          <div id="smooth-content" className={styles.smoothContent}>
            {/* Section 1: Hero (#home) */}
            <Hero />

            {/* Section 2: How It Works (#product) */}
            <HowItWorks />

            {/* Section 3: Why Dephyr (#why) */}
            <WhyDephyr />

            {/* Section 4: See It In Action (#case-studies) */}
            <CaseStudy />

            {/* Section 5: Closing CTA & Footer (#contact) */}
            <ContactCTA />
          </div>
        </div>
      </SmoothScroll>
    </div>
  );
}
