import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Tailwind CSS configuration.
 * 
 * Typography styles are split between this file and globals.css:
 * - This file: Base prose plugin configuration (code styling, link defaults)
 * - globals.css: Custom prose overrides (font sizes, margins, colors)
 * 
 * We use globals.css for prose styles that need hot reload during development.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
    "./.contentlayer/generated/**/*.{js,mjs}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
    "./stories/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Calibre', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            // Remove backtick decoration from inline code
            "code::before": { content: '""' },
            "code::after": { content: '""' },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
