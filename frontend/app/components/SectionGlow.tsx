"use client";

import React from "react";
import styles from "../page.module.css";

interface SectionGlowProps {
  position?: "top-center" | "bottom-left" | "center-right" | "center";
}

export default function SectionGlow({
  position = "top-center",
}: SectionGlowProps) {
  let primaryPos = "50% 0%";
  let secondaryPos = "80% 100%";

  switch (position) {
    case "top-center":
      primaryPos = "50% 0%";
      secondaryPos = "20% 90%";
      break;
    case "bottom-left":
      primaryPos = "20% 100%";
      secondaryPos = "80% 10%";
      break;
    case "center-right":
      primaryPos = "75% 40%";
      secondaryPos = "20% 80%";
      break;
    case "center":
      primaryPos = "50% 50%";
      secondaryPos = "80% 20%";
      break;
  }

  const primaryGradient = `radial-gradient(ellipse 70% 55% at ${primaryPos}, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.028) 40%, rgba(255,255,255,0.01) 65%, rgba(255,255,255,0) 100%)`;
  const secondaryGradient = `radial-gradient(ellipse 60% 45% at ${secondaryPos}, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.008) 60%, rgba(255,255,255,0) 100%)`;

  return (
    <div className={styles.sectionGlowLayer} aria-hidden="true">
      <div
        className={styles.sectionGlowRadial}
        style={{
          backgroundImage: `${primaryGradient}, ${secondaryGradient}`,
        }}
      />
      <div className={styles.sectionGlowNoise} />
    </div>
  );
}
