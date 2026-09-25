"use client";

import React, { useRef, useEffect } from "react";
import styles from "../page.module.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionGlow from "./SectionGlow";
import { registerGsapPlugins } from "./GsapProvider";


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
      <InteractiveDotGrid />
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
