"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "../page.module.css";
import { scrollToSection, registerGsapPlugins } from "./GsapProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface StatConfig {
  glyph: string;
  target: number;
  suffix: string;
  decimals: number;
  label: string;
  delay: string;
}

const STATS: StatConfig[] = [
  {
    glyph: "<",
    target: 118,
    suffix: "ms",
    decimals: 0,
    label: "Scan Latency",
    delay: "0.5s",
  },
  {
    glyph: "%",
    target: 99.4,
    suffix: "%",
    decimals: 1,
    label: "Remediation Success",
    delay: "0.58s",
  },
  {
    glyph: "*",
    target: 24,
    suffix: "/7",
    decimals: 0,
    label: "Autonomous Monitoring",
    delay: "0.66s",
  },
  {
    glyph: "#",
    target: 5.2,
    suffix: "K",
    decimals: 1,
    label: "CVEs Investigated",
    delay: "0.74s",
  },
];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function Hero() {
  const [displayValues, setDisplayValues] = useState<string[]>(() =>
    STATS.map((s) => (0).toFixed(s.decimals))
  );

  const statsRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);

  // IntersectionObserver for count-up stats
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setDisplayValues(STATS.map((s) => s.target.toFixed(s.decimals)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          observer.disconnect();

          const startTime = performance.now();

          STATS.forEach((stat, i) => {
            const duration = 1500 + i * 80;
            const startOffset = 480 + i * 90;

            const tick = (now: number) => {
              const elapsed = now - (startTime + startOffset);
              if (elapsed < 0) {
                requestAnimationFrame(tick);
                return;
              }

              const progress = Math.min(elapsed / duration, 1);
              const eased = easeOutCubic(progress);
              const currentValue = eased * stat.target;

              setDisplayValues((prev) => {
                const next = [...prev];
                next[i] = currentValue.toFixed(stat.decimals);
                return next;
              });

              if (progress < 1) {
                requestAnimationFrame(tick);
              } else {
                setDisplayValues((prev) => {
                  const next = [...prev];
                  next[i] = stat.target.toFixed(stat.decimals);
                  return next;
                });
              }
            };

            requestAnimationFrame(tick);
          });
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section id="home" className={styles.homeSection}>

      {/* 2) Hero Center */}
      <main className={styles.hero}>
        {/* Trust row */}
        <div
          className={`${styles.trustRow} ${styles.anim}`}
          style={{ "--d": "0.05s" } as React.CSSProperties}
        >
          <div className={styles.avatarGroup}>
            <div className={styles.avatarRing} title="GitHub">
              <div className={styles.innerCircle}>
                <i className={`fa-brands fa-github ${styles.trustIcon}`} />
              </div>
            </div>
            <div className={styles.avatarRing} title="Security Shield">
              <div className={styles.innerCircle}>
                <i className={`fa-solid fa-shield-halved ${styles.trustIcon}`} />
              </div>
            </div>
            <div className={styles.avatarRing} title="Git">
              <div className={styles.innerCircle}>
                <i className={`fa-brands fa-git-alt ${styles.trustIcon}`} />
              </div>
            </div>
          </div>
          <div className={styles.trustPill}>
            <span className={styles.trustText}>
              Investigating CVEs across 2000+ repositories
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className={styles.headline}>
          <span className={styles.headlineLine}>Security That</span>
          <span className={styles.headlineLine}>Fixes Itself</span>
        </h1>

        {/* Subhead */}
        <p
          className={`${styles.subhead} ${styles.anim}`}
          style={{ "--d": "0.28s" } as React.CSSProperties}
        >
          An autonomous agent that investigates vulnerable dependencies, opens
          the fix, and keeps iterating until CI passes.
        </p>

        {/* CTA */}
        <Link
          href="/dashboard"
          className={styles.ctaButton}
          style={{ "--d": "0.4s" } as React.CSSProperties}
        >
          Get Started
        </Link>
      </main>

      {/* 3) Stats Footer */}
      <footer ref={statsRef} className={styles.statsFooter}>
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`${styles.statItem} ${styles.anim}`}
            style={{ "--d": stat.delay } as React.CSSProperties}
          >
            <div className={styles.statGlyph}>{stat.glyph}</div>
            <div className={styles.statValue}>
              {displayValues[i]}
              {stat.suffix}
            </div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </footer>
    </section>
  );
}
