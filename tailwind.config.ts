import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        "slide-up": "slideUp 0.7s var(--ease-smooth) forwards",
        "slide-left": "slideFromLeft 0.6s var(--ease-decel) forwards",
        "slide-right": "slideFromRight 0.6s var(--ease-decel) forwards",
        "fade-in": "fadeIn 0.7s var(--ease-smooth) forwards",
        "slide-down": "slideDown 0.3s var(--ease-decel) forwards",
        "modal-enter": "modalEnter 0.2s var(--ease-decel) forwards",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.37, 0, 0.63, 1)",
        decel: "cubic-bezier(0.87, 0, 0.13, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
