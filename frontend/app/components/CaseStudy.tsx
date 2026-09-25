"use client";

import React, { useRef, useEffect } from "react";
import styles from "../page.module.css";
import gsap from "gsap";
import { registerGsapPlugins } from "./GsapProvider";
import SectionGlow from "./SectionGlow";


const InteractiveDotGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    
    // Support for high DPI (Retina) displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const dots: Dot[] = [];
    const spacing = 28; // Spacing between dots
    const mouse = { x: -1000, y: -1000, radius: 160 }; // Interaction radius

    class Dot {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      size: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = 0;
        this.vy = 0;
        this.size = 1; // Dot radius
      }

      update() {
        const dx = mouse.x - this.baseX;
        const dy = mouse.y - this.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Repel from mouse
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          
          // Repulsion strength
          const pushX = forceDirectionX * force * 15; 
          const pushY = forceDirectionY * force * 15;

          this.vx -= pushX;
          this.vy -= pushY;
        }

        // Spring physics: return to base position
        this.vx += (this.baseX - this.x) * 0.05; // Spring strength
        this.vy += (this.baseY - this.y) * 0.05;
        
        // Damping/Friction for the "wavy" settling effect
        this.vx *= 0.82;
        this.vy *= 0.82;

        this.x += this.vx;
        this.y += this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // Dot color and opacity
        ctx.fill();
      }
    }

    const initGrid = () => {
      dots.length = 0;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          dots.push(new Dot(x, y));
        }
      }
    };

    initGrid();

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < dots.length; i++) {
        dots[i].update();
        dots[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initGrid();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        // Gradient mask to fade dots at the exact top and bottom of the section
        maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)"
      }}
    />
  );
};


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
      <InteractiveDotGrid />
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
