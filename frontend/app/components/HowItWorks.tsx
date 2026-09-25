"use client";

import React, { useRef, useEffect } from "react";
import styles from "../page.module.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionGlow from "./SectionGlow";
import { registerGsapPlugins } from "./GsapProvider";

interface Step {
  num: string;
  glyph: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    glyph: "<",
    title: "Detect",
    description: "A new CVE lands in the feed.",
  },
  {
    num: "02",
    glyph: "%",
    title: "Investigate",
    description: "Rust scans the repo for real usage, not just presence.",
  },
  {
    num: "03",
    glyph: "*",
    title: "Assess",
    description: "Exposure is classified: unused, low-risk, or critical.",
  },
  {
    num: "04",
    glyph: "+",
    title: "Remediate",
    description: "Dephyr opens a Pull Request with the fix.",
  },
  {
    num: "05",
    glyph: ">",
    title: "Verify",
    description: "CI runs. If it fails, Dephyr reads the logs and patches again.",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    registerGsapPlugins();

    const el = sectionRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Animate section header
      gsap.from(".hiw-header", {
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      // Animate line progress
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scrollTrigger: {
              trigger: el,
              start: "top 65%",
              end: "bottom 80%",
              scrub: 0.6,
            },
            scaleX: 1,
            ease: "none",
          }
        );
      }

      // Stagger nodes
      gsap.from(".hiw-node", {
        scrollTrigger: {
          trigger: el,
          start: "top 68%",
          toggleActions: "play none none reverse",
        },
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.75,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="product" ref={sectionRef} className={styles.fullWidthSection}>
      <SectionGlow position="top-center" />
      <div className={styles.sectionContainer}>
        <div className={`${styles.sectionHeader} hiw-header`}>
          <div className={styles.sectionBadge}>Agent Loop</div>
          <h2 className={styles.sectionHeading}>How It Works</h2>
          <p className={styles.sectionSubhead}>
            Dephyr doesn't just flag a vulnerability. It runs a closed loop until
            the fix is verified.
          </p>
        </div>

        <div className={styles.hiwSequenceContainer}>
          {/* Connecting progress line behind nodes on desktop */}
          <div ref={lineRef} className={styles.hiwProgressLine} aria-hidden="true" />

          <div className={styles.hiwNodesGrid}>
            {STEPS.map((step) => (
              <div key={step.title} className={`${styles.hiwNode} hiw-node`}>
                <div className={styles.hiwGlyphBox}>
                  <span className={styles.hiwGlyph}>{step.glyph}</span>
                  <span className={styles.hiwStepNum}>{step.num}</span>
                </div>
                <h3 className={styles.hiwTitle}>{step.title}</h3>
                <p className={styles.hiwDescription}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
