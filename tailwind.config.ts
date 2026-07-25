import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
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
    },
  },
  plugins: [],
};
export default config;
