import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#123643",
        "primary-container": "#2b4d5a",
        "on-primary-container": "#9abdcc",
        "surface": "#fbf9f4",
        "surface-bright": "#fbf9f4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3ee",
        "surface-container": "#f0eee9",
        "surface-container-high": "#eae8e3",
        "surface-container-highest": "#e4e2dd",
        "surface-dim": "#dcdad5",
        "on-surface": "#1b1c19",
        "on-surface-variant": "#41484b",
        "secondary": "#5f5e60",
        "secondary-container": "#e5e1e4",
        "tertiary": "#393125",
        "tertiary-container": "#51473a",
        "on-tertiary-container": "#c3b6a5",
        "outline": "#72787b",
        "outline-variant": "#c1c7cb",
        "inverse-surface": "#30312e",
        "background": "#fbf9f4",
        "on-background": "#1b1c19",
        "error": "#ba1a1a",
        "cloud": "#F4F2ED",
        "deep-charcoal": "#141416",
        "petrol": "#2B4D5A",
        "taupe": "#B5A898",
        "charcoal": "#141416",
      },
      fontFamily: {
        "headline": ["Cormorant Garamond", "serif"],
        "body": ["DM Sans", "sans-serif"],
        "label": ["DM Mono", "monospace"],
        "technical": ["DM Mono", "monospace"],
        "mono": ["DM Mono", "monospace"],
        "jakarta": ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px",
        "pill": "100px",
      },
    }
  },
  plugins: [],
};
export default config;
