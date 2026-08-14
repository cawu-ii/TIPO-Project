import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#16233F",
          soft: "#2A3B60",
          muted: "#6B6A62",
        },
        paper: {
          DEFAULT: "#EFEEE7",
          card: "#F8F7F3",
        },
        seal: {
          DEFAULT: "#C23B2E",
          soft: "#E8DCD4",
        },
        hairline: "#DAD7CC",
        status: {
          alive: "#2F7A4F",
          "alive-bg": "#E4EFE7",
          grace: "#B8792B",
          "grace-bg": "#F5EBDC",
          dead: "#6E6C63",
          "dead-bg": "#E7E5DE",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "6px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "draw-in": {
          "0%": { strokeDashoffset: "1", opacity: "0" },
          "100%": { strokeDashoffset: "0", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        "draw-in": "draw-in 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
