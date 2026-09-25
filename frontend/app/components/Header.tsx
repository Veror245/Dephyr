"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "../page.module.css";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { scrollToSection } from "./GsapProvider";

interface HeaderProps {
  activeSection: "home" | "product" | "case-studies" | "contact";
  onNavClick?: (sectionId: string) => void;
}

export default function Header({ activeSection, onNavClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add("menuOpen");
    } else {
      document.body.classList.remove("menuOpen");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 720) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.classList.remove("menuOpen");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  const handleLinkClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    closeMenu();
    if (onNavClick) {
      onNavClick(sectionId);
    } else {
      const smoother = ScrollSmoother.get();
      if (smoother) {
        smoother.scrollTo(`#${sectionId}`, true, "top 96px");
      } else {
        scrollToSection(sectionId, 96);
      }
    }
  };

  return (
    <>
      <header className={styles.header}>
        {/* Logo */}
        <a
          href="#home"
          className={styles.logoButton}
          aria-label="Dephyr Home"
          onClick={(e) => handleLinkClick(e, "home")}
        >
          <Image
            src="/assets/logo.webp"
            alt=""
            width={52}
            height={52}
            className={styles.logoImage}
            priority
          />
        </a>

        {/* Desktop Nav Pill */}
        <nav className={styles.navPill} aria-label="Main Navigation">
          <a
            href="#home"
            className={`${styles.navLink} ${
              activeSection === "home" ? styles.activeNavLink : ""
            }`}
            onClick={(e) => handleLinkClick(e, "home")}
            aria-current={activeSection === "home" ? "page" : undefined}
          >
            Home
          </a>
          <a
            href="#product"
            className={`${styles.navLink} ${
              activeSection === "product" ? styles.activeNavLink : ""
            }`}
            onClick={(e) => handleLinkClick(e, "product")}
            aria-current={activeSection === "product" ? "page" : undefined}
          >
            Product
          </a>
          <a
            href="#case-studies"
            className={`${styles.navLink} ${
              activeSection === "case-studies" ? styles.activeNavLink : ""
            }`}
            onClick={(e) => handleLinkClick(e, "case-studies")}
            aria-current={activeSection === "case-studies" ? "page" : undefined}
          >
            Case Studies
          </a>
          <a
            href="#contact"
            className={`${styles.navLink} ${
              activeSection === "contact" ? styles.activeNavLink : ""
            }`}
            onClick={(e) => handleLinkClick(e, "contact")}
            aria-current={activeSection === "contact" ? "page" : undefined}
          >
            Contact
          </a>
        </nav>

        {/* Desktop Sign in */}
        <Link href="/dashboard" className={styles.signInButton}>
          Dashboard
        </Link>

        {/* Mobile Burger Button */}
        <button
          className={`${styles.burgerButton} ${
            mobileMenuOpen ? styles.burgerOpen : ""
          }`}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className={styles.burgerBar}></span>
          <span className={styles.burgerBar}></span>
          <span className={styles.burgerBar}></span>
        </button>
      </header>

      {/* Mobile Menu Backdrop Overlay & Sheet */}
      {mobileMenuOpen && (
        <>
          <div
            className={styles.mobileOverlay}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className={styles.mobileSheet} role="dialog" aria-modal="true">
            <a
              href="#home"
              className={`${styles.mobileNavLink} ${
                activeSection === "home" ? styles.mobileActiveLink : ""
              }`}
              onClick={(e) => handleLinkClick(e, "home")}
            >
              Home
            </a>
            <a
              href="#product"
              className={`${styles.mobileNavLink} ${
                activeSection === "product" ? styles.mobileActiveLink : ""
              }`}
              onClick={(e) => handleLinkClick(e, "product")}
            >
              Product
            </a>
            <a
              href="#case-studies"
              className={`${styles.mobileNavLink} ${
                activeSection === "case-studies" ? styles.mobileActiveLink : ""
              }`}
              onClick={(e) => handleLinkClick(e, "case-studies")}
            >
              Case Studies
            </a>
             <a
              href="#contact"
              className={`${styles.mobileNavLink} ${
                activeSection === "contact" ? styles.mobileActiveLink : ""
              }`}
              onClick={(e) => handleLinkClick(e, "contact")}
            >
              Contact
            </a>

            
            <Link
              href="/dashboard"
              className={styles.mobileSignIn}
              onClick={closeMenu}
            >
              Sign in
            </Link>
          </div>
        </>
      )}
    </>
  );
}
