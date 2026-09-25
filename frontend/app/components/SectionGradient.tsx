"use client";

import React from "react";
import styles from "../page.module.css";

interface SectionGradientProps {
  position?: "top-center" | "center" | "bottom-left" | "bottom-right";
}

export default function SectionGradient({
  position = "top-center",
}: SectionGradientProps) {
  let gradientBackground =
    "radial-gradient(60% 50% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 70%)";

  switch (position) {
    case "top-center":
      gradientBackground =
        "radial-gradient(60% 50% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 70%)";
      break;
    case "center":
      gradientBackground =
        "radial-gradient(55% 55% at 50% 50%, rgba(255, 255, 255, 0.05), transparent 70%)";
      break;
    case "bottom-left":
      gradientBackground =
        "radial-gradient(60% 50% at 20% 80%, rgba(255, 255, 255, 0.06), transparent 70%)";
      break;
    case "bottom-right":
      gradientBackground =
        "radial-gradient(60% 50% at 80% 80%, rgba(255, 255, 255, 0.06), transparent 70%)";
      break;
  }

  return (
    <div
      className={styles.sectionGradient}
      style={{ background: gradientBackground }}
      aria-hidden="true"
    />
  );
}
