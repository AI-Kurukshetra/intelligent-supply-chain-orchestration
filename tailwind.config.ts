import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./stores/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"]
      },
      colors: {
        navy: {
          50: "#eef4fb",
          100: "#d8e5f4",
          200: "#b4cde8",
          300: "#89acd7",
          400: "#5e89c0",
          500: "#426da8",
          600: "#325589",
          700: "#27436d",
          800: "#203759",
          900: "#1E3A5F"
        },
        primary: "#1E3A5F",
        accent: "#0EA5E9",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        muted: "#64748B",
        supply: { 100: "#e0f2fe", 300: "#7dd3fc", 500: "#0EA5E9", 700: "#0369a1" },
        demand: { 100: "#ede9fe", 500: "#8B5CF6", 700: "#6d28d9" },
        inventory: { 100: "#d1fae5", 500: "#10B981", 700: "#047857" }
      }
    }
  },
  plugins: []
};

export default config;
