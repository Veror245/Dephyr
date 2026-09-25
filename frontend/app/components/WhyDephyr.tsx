"use client";

import React, { useRef, useEffect } from "react";
import styles from "../page.module.css";
import gsap from "gsap";
import { registerGsapPlugins } from "./GsapProvider";
import SectionGlow from "./SectionGlow";

// --------------------------------------------------------
// Interactive Wavy Dot Grid Background
// --------------------------------------------------------
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

// --------------------------------------------------------
// Main Section Component
// --------------------------------------------------------
const SCANNER_POINTS = [
  "Flags the package.",
  "Leaves investigation to you.",
  "Stops at the alert.",
];

const DEPHYR_POINTS = [
  "Traces whether the vulnerable code path is actually used.",
  "Opens the Pull Request itself.",
  "Watches CI and fixes its own failures.",
];

export default function WhyDephyr() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    registerGsapPlugins();

    const el = sectionRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Header entrance
      gsap.from(".why-header", {
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

      // Left column slide from left
      gsap.from(".why-col-left", {
        scrollTrigger: {
          trigger: el,
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
        x: -30,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
      });

      // Right column slide from right
      gsap.from(".why-col-right", {
        scrollTrigger: {
          trigger: el,
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
        x: 30,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="why" ref={sectionRef} className={styles.fullWidthSection}>
      {/* Background Layers */}
      <InteractiveDotGrid />
      <SectionGlow position="bottom-left" />

      {/* Ambient HUD Elements */}
      <div className={styles.hudLeft}>
        <div className={styles.hudLine}></div>
        <div className={styles.hudWords}>
          <span>DETECT</span>
          <span>ANALYZE</span>
          <span>PATCH</span>
          <span>SECURE</span>
        </div>
      </div>

      <div className={styles.hudRight}>
        <div className={styles.ambientCrosshair} style={{ position: "relative" }}>+</div>
        <div className={styles.hudTextRight}>
          LESS NOISE<br />MORE IMPACT
        </div>
      </div>

      <div className={`${styles.ambientCrosshair} ${styles.crosshair1}`}>+</div>
      <div className={`${styles.ambientCrosshair} ${styles.crosshair2}`}>+</div>

      {/* Content Container */}
      <div className={styles.sectionContainer} style={{ position: "relative", zIndex: 10 }}>
        <div className={`${styles.sectionHeader} why-header`}>
          <div className={styles.sectionBadge}>Paradigm Shift</div>
          <h2 className={styles.sectionHeading}>
            A Scanner Tells You. Dephyr Handles It.
          </h2>
          <p className={styles.sectionSubhead}>
            Stop sifting through alert noise. Let the agent verify reachability and
            execute the fix.
          </p>
        </div>

        <div className={styles.whyComparisonGrid}>
          {/* Left Column: Traditional Scanner */}
          <div className={`${styles.whyCard} ${styles.whyCardScanner} why-col-left`}>
            <div className={styles.whyCardHeader}>
              <span className={styles.whyCardBadgeMuted}>Status Quo</span>
              <h3 className={styles.whyCardTitleMuted}>Traditional Scanner</h3>
            </div>
            <ul className={styles.whyList}>
              {SCANNER_POINTS.map((pt, idx) => (
                <li key={idx} className={styles.whyItemMuted}>
                  <span className={styles.whyBulletMuted}>—</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Dephyr */}
          <div className={`${styles.whyCard} ${styles.whyCardDephyr} why-col-right`}>
            <div className={styles.whyCardHeader}>
              <span className={styles.whyCardBadgeActive}>Autonomous</span>
              <h3 className={styles.whyCardTitleActive}>Dephyr</h3>
            </div>
            <ul className={styles.whyList}>
              {DEPHYR_POINTS.map((pt, idx) => (
                <li key={idx} className={styles.whyItemActive}>
                  <span className={styles.whyBulletActive}>✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}