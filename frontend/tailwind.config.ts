import type { Config } from "tailwindcss";

// Design tokens from the Claude design (styles.css) mapped into the Tailwind
// theme. The bulk of styling uses the ported CSS classes in globals.css;
// these are available for any incidental utility use.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0C0C0D",
        "bg-surface": "#161617",
        "bg-surface-2": "#1E1E20",
        "border-subtle": "rgba(255,255,255,0.07)",
        "border-strong": "rgba(255,255,255,0.14)",
        "text-primary": "#F4F4F5",
        "text-secondary": "#8B8B8F",
        "text-tertiary": "#5C5C60",
        accent: "#E8843C",
        success: "#5FB95F",
        warning: "#E0A53C",
        danger: "#DB4B45",
        "danger-panel": "#2A1A19",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        inner: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
