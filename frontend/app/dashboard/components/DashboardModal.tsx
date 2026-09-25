"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useModal } from "./ModalContext";

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  maxWidth?: string;
}

export default function DashboardModal({
  isOpen,
  onClose,
  children,
  ariaLabel = "Detail Dialog",
  maxWidth = "max-w-3xl",
}: DashboardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [cachedChildren, setCachedChildren] = useState<React.ReactNode>(children);
  const { setModalOpen } = useModal();

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isClosingRef = useRef(false);

  // Mount on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cache valid children so reverse exit animation remains visually intact
  useEffect(() => {
    if (children) {
      setCachedChildren(children);
    }
  }, [children]);

  const playExitAnimation = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Notify layout shell to restore sidebar and list width simultaneously
    setModalOpen(false);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !backdropRef.current || !modalRef.current) {
      setIsRendering(false);
      onClose();
      return;
    }

    gsap.killTweensOf([backdropRef.current, modalRef.current]);
    const tl = gsap.timeline({
      defaults: { ease: "power2.in" },
      onComplete: () => {
        setIsRendering(false);
        onClose();
      },
    });

    tl.to(modalRef.current, {
      opacity: 0,
      scale: 0.96,
      y: 10,
      duration: 0.2,
      ease: "power2.in",
    }).to(backdropRef.current, { opacity: 0, duration: 0.18 }, "-=0.12");
  }, [onClose, setModalOpen]);

  // Handle open / close animation triggers
  useEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      setIsRendering(true);
      isClosingRef.current = false;
      setModalOpen(true);

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const rafId = requestAnimationFrame(() => {
        if (!backdropRef.current || !modalRef.current) return;
        gsap.killTweensOf([backdropRef.current, modalRef.current]);

        if (prefersReducedMotion) {
          gsap.set(backdropRef.current, { opacity: 1 });
          gsap.set(modalRef.current, { opacity: 1, scale: 1, y: 0 });
        } else {
          gsap.set(backdropRef.current, { opacity: 0 });
          gsap.set(modalRef.current, { opacity: 0, scale: 0.95, y: 16 });

          const tl = gsap.timeline({
            defaults: { ease: "cubic-bezier(0.16, 1, 0.3, 1)" },
          });

          tl.to(backdropRef.current, {
            opacity: 1,
            duration: 0.22,
            ease: "power2.out",
          }).to(
            modalRef.current,
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.28,
            },
            "-=0.14"
          );
        }
      });

      return () => {
        cancelAnimationFrame(rafId);
        document.body.style.overflow = prevOverflow;
      };
    } else if (isRendering && !isClosingRef.current) {
      playExitAnimation();
    }
  }, [isOpen, mounted, playExitAnimation, isRendering, setModalOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isRendering) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        playExitAnimation();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRendering, playExitAnimation]);

  if (!mounted || !isRendering) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Backdrop: dimming scrim with backdrop-blur (8-12px) */}
      <div
        ref={backdropRef}
        onClick={playExitAnimation}
        className="fixed inset-0 bg-black/65 backdrop-blur-[10px]"
        style={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        aria-hidden="true"
      />

      {/* Centered Modal Card: Subtle white glow halo around its edges */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-y-auto custom-scrollbar rounded-panel`}
        style={{
          boxShadow:
            "0 0 35px 2px rgba(255, 255, 255, 0.08), 0 25px 60px rgba(0, 0, 0, 0.9)",
        }}
      >
        {children || cachedChildren}
      </div>
    </div>,
    document.body
  );
}
