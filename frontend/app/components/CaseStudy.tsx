"use client";

import React, { useRef, useEffect } from "react";
import styles from "../page.module.css";
import gsap from "gsap";
import { registerGsapPlugins } from "./GsapProvider";
import SectionGlow from "./SectionGlow";

interface LogEvent {
  step: string;
  icon: string;
  badge: string;
  badgeType: "warn" | "info" | "error" | "success" | "action";
  text: string;
  detail?: string;
}

const EVENTS: LogEvent[] = [
  {
    step: "00:02",
    icon: "🚨",
    badge: "ALERT",
    badgeType: "warn",
    text: "Critical vulnerability detected",
    detail: "CVE-2026-4891 in example-lib < 2.4.0",
  },
  {
    step: "00:15",
    icon: "🔍",
    badge: "STATIC",
    badgeType: "info",
    text: "Investigating repository...",
    detail: "AST scan: 2 calls to parseQuery() detected",
  },
  {
    step: "00:28",
    icon: "🧠",
    badge: "ANALYSIS",
    badgeType: "warn",
    text: "Exposure classified: HIGH",
    detail: "Tainted user request param flows into vulnerable API",
  },
  {
    step: "00:44",
    icon: "🔧",
    badge: "GIT",
    badgeType: "action",
    text: "Opening Pull Request #42",
    detail: "Bumped example-lib to 2.4.1 + migrated options param",
  },
  {
    step: "01:10",
    icon: "❌",
    badge: "CI FAIL",
    badgeType: "error",
    text: "CI failed — TypeError: expected 2 arguments, got 3",
    detail: "Failing call site: src/api/query.js:84",
  },
  {
    step: "01:22",
    icon: "🧠",
    badge: "DIAGNOSIS",
    badgeType: "info",
    text: "Re-investigating failure...",
    detail: "API signature change identified; preparing patch",
  },
  {
    step: "01:38",
    icon: "🔧",
    badge: "COMMIT",
    badgeType: "action",
    text: "Pushing follow-up patch",
    detail: "Updated call signature to parseQuery(input, options)",
  },
  {
    step: "01:56",
    icon: "✅",
    badge: "CI PASS",
    badgeType: "success",
    text: "CI passed",
    detail: "All 84 tests green. Remediation verified.",
  },
];

export default function CaseStudy() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    registerGsapPlugins();

    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Header entrance
      gsap.from(".case-header", {
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      const mm = gsap.matchMedia();

      // Desktop zoom entrance (scale 0.7 -> 1)
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".case-terminal",
          { scale: 0.7, y: 60, opacity: 0.6, transformOrigin: "50% 50%" },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".case-terminal",
              start: "top 95%",
              end: "top 30%",
              scrub: 1,
            },
          }
        );
      });

      // Mobile zoom entrance (scale 0.85 -> 1)
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".case-terminal",
          { scale: 0.85, y: 40, opacity: 0.6, transformOrigin: "50% 50%" },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".case-terminal",
              start: "top 95%",
              end: "top 30%",
              scrub: 1,
            },
          }
        );
      });

      // Staggered log items reveal
      gsap.from(".case-log-item", {
        scrollTrigger: {
          trigger: ".case-terminal",
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
        y: 18,
        opacity: 0,
        stagger: 0.09,
        duration: 0.6,
        ease: "power2.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="case-studies" ref={sectionRef} className={styles.fullWidthSection}>
      <SectionGlow position="center-right" />
      <div className={styles.sectionContainer}>
        <div className={`${styles.sectionHeader} case-header`}>
          <div className={styles.sectionBadge}>Remediation Stream</div>
          <h2 className={styles.sectionHeading}>Watch It Fix Its Own Fix</h2>
          <p className={styles.sectionSubhead}>
            A real remediation cycle — from detection to a passing build.
          </p>
        </div>

        <div className={`${styles.terminalCard} case-terminal`}>
          {/* Terminal Header Bar */}
          <div className={styles.terminalBar}>
            <div className={styles.terminalDots}>
              <span className={`${styles.terminalDot} ${styles.dotRed}`} />
              <span className={`${styles.terminalDot} ${styles.dotYellow}`} />
              <span className={`${styles.terminalDot} ${styles.dotGreen}`} />
            </div>
            <div className={styles.terminalTitle}>
              agent-session — repo-c (PR #42)
            </div>
            <div className={styles.terminalStatus}>
              <span className={styles.terminalLivePulse} />
              AUTONOMOUS
            </div>
          </div>

          {/* Terminal Log Stream */}
          <div className={styles.terminalLogs}>
            {EVENTS.map((evt, idx) => (
              <div
                key={idx}
                className={`${styles.terminalLogLine} case-log-item`}
              >
                <div className={styles.logLeft}>
                  <span className={styles.logStep}>{evt.step}</span>
                  <span
                    className={`${styles.logBadge} ${
                      styles[`badge_${evt.badgeType}`]
                    }`}
                  >
                    {evt.badge}
                  </span>
                  <span className={styles.logText}>{evt.text}</span>
                </div>
                {evt.detail && (
                  <div className={styles.logDetail}>{evt.detail}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
