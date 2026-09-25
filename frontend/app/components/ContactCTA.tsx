"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import styles from "../page.module.css";
import gsap from "gsap";
import { registerGsapPlugins } from "./GsapProvider";
import SectionGlow from "./SectionGlow";

export default function ContactCTA() {
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
      gsap.from(".contact-anim", {
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 24,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="contact" ref={sectionRef} className={styles.contactSection}>
      <SectionGlow position="center" />
      <div className={styles.contactContainer}>
        <div className={`${styles.sectionBadge} contact-anim`}>Get Started</div>
        <h2 className={`${styles.contactHeading} contact-anim`}>
          Let&apos;s Fix This Together
        </h2>
        <p className={`${styles.contactSubhead} contact-anim`}>
          Get in touch to see Dephyr on your repositories.
        </p>
        <div className="contact-anim">
          <Link href="/contact" className={styles.ctaButton}>
            Get in Touch
          </Link>
        </div>
      </div>

      <footer className={styles.siteFooter}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span>DEPHYR</span> — Autonomous Application Security
          </div>
          <div className={styles.footerLegal}>
            <span>&copy; {new Date().getFullYear()} Dephyr Inc.</span>
            <span>All rights reserved.</span>
          </div>
        </div>
      </footer>
    </section>
  );
}
