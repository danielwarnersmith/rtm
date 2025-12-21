import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
    // Include Contentlayer generated content
    "./.contentlayer/generated/**/*.{js,mjs}",
  ],
  theme: {
    extend: {
      // Custom typography overrides for MDX content
      typography: {
        DEFAULT: {
          css: {
            // Heading styles
            h1: {
              fontWeight: "800",
              letterSpacing: "-0.025em",
            },
            h2: {
              fontWeight: "700",
              letterSpacing: "-0.025em",
              marginTop: "2em",
            },
            h3: {
              fontWeight: "600",
            },
            // Link styles
            a: {
              color: "var(--tw-prose-links)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              fontWeight: "500",
              "&:hover": {
                color: "var(--tw-prose-links)",
                opacity: "0.8",
              },
            },
            // Inline code styles (not in code blocks)
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            code: {
              backgroundColor: "rgb(243 244 246)",
              padding: "0.25rem 0.375rem",
              borderRadius: "0.25rem",
              fontWeight: "500",
              fontSize: "0.875em",
            },
            // Code block styles (handled by rehype-pretty-code)
            pre: {
              backgroundColor: "transparent",
              padding: "0",
              margin: "0",
              borderRadius: "0.5rem",
              overflow: "auto",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
              fontSize: "0.875em",
            },
            // Blockquote styles
            blockquote: {
              fontStyle: "normal",
              borderLeftColor: "rgb(99 102 241)",
              backgroundColor: "rgb(238 242 255)",
              padding: "1rem 1.5rem",
              borderRadius: "0 0.5rem 0.5rem 0",
            },
            "blockquote p:first-of-type::before": {
              content: '""',
            },
            "blockquote p:last-of-type::after": {
              content: '""',
            },
          },
        },
        // Dark mode overrides
        invert: {
          css: {
            code: {
              backgroundColor: "rgb(55 65 81)",
            },
            blockquote: {
              borderLeftColor: "rgb(129 140 248)",
              backgroundColor: "rgb(49 46 129 / 0.3)",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;

