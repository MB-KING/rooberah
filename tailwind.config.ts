import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1008",
        pine: "#2A160C",
        night: "#21120A",
        mint: "#FFF8E8",
        ember: "#F39C12",
        gold: "#F5C518",
        skyglass: "#FFFDF8",
        brand: {
          red: "#E31C24",
          orange: "#F39C12",
          gold: "#F5C518",
          gray: "#6B7280",
          white: "#FFFFFF"
        }
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "sheet-up": {
          from: { opacity: "0", transform: "translateY(1rem)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "sheet-up": "sheet-up 200ms ease-out"
      },
      fontFamily: {
        sans: ["var(--font-vazirmatn)", "Tahoma", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
