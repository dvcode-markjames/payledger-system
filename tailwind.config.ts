import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E1620",
          soft: "#141F2B",
          card: "#182430",
          line: "#26333F",
        },
        paper: "#F4F1E9",
        text: {
          hi: "#EDF1F5",
          mid: "#AAB6C2",
          low: "#6E7B88",
        },
        gcash: {
          DEFAULT: "#1479FF",
          soft: "#12335E",
        },
        maya: {
          DEFAULT: "#00D084",
          soft: "#0E3A2C",
        },
        dito: {
          DEFAULT: "#FF6A00",
          soft: "#4A2A10",
        },
        in: "#3DDC97",
        out: "#FF6B57",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        xl: "1rem",
      },
      keyframes: {
        /* Soft glowing pulse used on the Tour's highlighted element border */
        "tour-pulse": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 4px rgba(20,121,255,0.25), 0 0 18px 4px rgba(20,121,255,0.35)",
          },
          "50%": {
            boxShadow:
              "0 0 0 4px rgba(20,121,255,0.35), 0 0 28px 8px rgba(20,121,255,0.55)",
          },
        },
        /* Entrance animation for the Tour popover card */
        "tour-pop": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        /* Entrance animation for the dimmed backdrop panels */
        "tour-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "tour-pulse": "tour-pulse 2s ease-in-out infinite",
        "tour-pop": "tour-pop 0.18s ease-out",
        "tour-fade": "tour-fade 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
