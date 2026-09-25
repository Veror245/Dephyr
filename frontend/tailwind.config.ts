import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/dashboard/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        dephyr: {
          black: "#000000",
          base: "#08080a",
          surface: "#111113",
          surface2: "#161619",
          surface3: "#1c1c20",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(255, 255, 255, 0.16)",
          pill: "#28282a",
          pillHover: "#323234",
          text: "#ffffff",
          muted: "#8e8e8e",
          subtext: "#c8c8c8",
          amber: "#ff7300",
          amberLight: "#ff8c2e",
          amberGlow: "rgba(255, 115, 0, 0.16)",
        },
        status: {
          warn: "#ffb300",
          warnBg: "rgba(255, 179, 0, 0.12)",
          warnBorder: "rgba(255, 179, 0, 0.25)",
          info: "#79b0ff",
          infoBg: "rgba(94, 162, 255, 0.12)",
          infoBorder: "rgba(94, 162, 255, 0.25)",
          error: "#ff5252",
          errorBg: "rgba(255, 82, 82, 0.14)",
          errorBorder: "rgba(255, 82, 82, 0.25)",
          action: "#e0e0e0",
          actionBg: "rgba(200, 200, 200, 0.12)",
          actionBorder: "rgba(200, 200, 200, 0.22)",
          success: "#52e185",
          successBg: "rgba(82, 225, 133, 0.14)",
          successBorder: "rgba(82, 225, 133, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "BubbledotICG-FinePos", "Geist Pixel Circle", "monospace"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(0, 0, 0, 0.5)",
        glowPill: "0 0 0 1px rgba(255, 255, 255, 0.15), 0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.1)",
        glowAmber: "0 0 24px rgba(255, 115, 0, 0.28)",
      },
      borderRadius: {
        "panel": "18px",
        "card": "14px",
        "control": "8px",
        "pill": "999px",
      },
    },
  },
  plugins: [],
};

export default config;
