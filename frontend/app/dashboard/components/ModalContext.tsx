"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface ModalContextType {
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType>({
  isModalOpen: false,
  setModalOpen: () => {},
});

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const pathname = usePathname();

  // Reset modal state if route changes
  useEffect(() => {
    setModalOpen(false);
  }, [pathname]);

  return (
    <ModalContext.Provider value={{ isModalOpen, setModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
