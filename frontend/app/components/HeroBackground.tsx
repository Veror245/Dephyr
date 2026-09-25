"use client";

import React, { useEffect, useRef } from "react";
import styles from "../page.module.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registerGsapPlugins } from "./GsapProvider";

export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    registerGsapPlugins();

    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        container,
        { opacity: 1 },
        {
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: "#home",
            start: "top+=60% top",
            end: "bottom top",
            scrub: true,
            onLeave: () => {
              if (video && !video.paused) {
                video.pause();
              }
            },
            onEnterBack: () => {
              if (video && video.paused) {
                video.play().catch(() => {});
              }
            },
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={styles.fixedHeroBg} aria-hidden="true">
      <video
        ref={videoRef}
        className={styles.fixedHeroVideo}
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          // src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
          src="/video/video3.mp4"
          type="video/mp4"
        />
      </video>
      <div className={styles.fixedHeroOverlay} />
      <div className={styles.fixedHeroFadeToBlack} />
    </div>
  );
}
