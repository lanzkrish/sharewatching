import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cinema: {
          950: "#06090e",
          900: "#0c111a",
          850: "#111827",
          800: "#182234",
          700: "#24324d",
          600: "#334568",
        },
        brand: {
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          glow: "#818cf8",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(99, 102, 241, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
