import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        "headline": ["Cormorant Garamond", "serif"],
        "body":     ["DM Sans", "sans-serif"],
        "label":    ["DM Sans", "sans-serif"],
        "mono":     ["DM Mono", "monospace"],
        "jakarta":  ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg":      "2rem",
        "xl":      "3rem",
        "full":    "9999px",
        "pill":    "100px",
      },
      colors: {
        // ── Primary scale ──────────────────────────
        "primary":                    "#123643",
        "primary-container":          "#2b4d5a",
        "on-primary-container":       "#9abdcc",
        "primary-fixed":              "#c5e8f8",
        "primary-fixed-dim":          "#a9ccdb",
        "on-primary-fixed":           "#001f29",
        "on-primary-fixed-variant":   "#294b58",
        "inverse-primary":            "#a9ccdb",
        "on-primary":                 "#ffffff",
        "surface-tint":               "#416371",
      
        // ── Surface scale ──────────────────────────
        "background":                 "#fbf9f4",
        "surface":                    "#fbf9f4",
        "surface-bright":             "#fbf9f4",
        "surface-dim":                "#dcdad5",
        "surface-container-lowest":   "#ffffff",
        "surface-container-low":      "#f5f3ee",
        "surface-container":          "#f0eee9",
        "surface-container-high":     "#eae8e3",
        "surface-container-highest":  "#e4e2dd",
        "surface-variant":            "#e4e2dd",
        "on-surface":                 "#1b1c19",
        "on-surface-variant":         "#41484b",
        "on-background":              "#1b1c19",
        "inverse-surface":            "#30312e",
        "inverse-on-surface":         "#f2f1ec",
      
        // ── Secondary scale ────────────────────────
        "secondary":                  "#5f5e60",
        "secondary-container":        "#e5e1e4",
        "on-secondary":               "#ffffff",
        "on-secondary-container":     "#656466",
        "secondary-fixed":            "#e5e1e4",
        "secondary-fixed-dim":        "#c8c6c8",
        "on-secondary-fixed":         "#1b1b1d",
        "on-secondary-fixed-variant": "#474649",
      
        // ── Tertiary scale ─────────────────────────
        "tertiary":                   "#393125",
        "tertiary-container":         "#51473a",
        "on-tertiary":                "#ffffff",
        "on-tertiary-container":      "#c3b6a5",
        "tertiary-fixed":             "#efe0cf",
        "tertiary-fixed-dim":         "#d2c4b4",
        "on-tertiary-fixed":          "#221a10",
        "on-tertiary-fixed-variant":  "#4f4539",
      
        // ── Outline ────────────────────────────────
        "outline":                    "#72787b",
        "outline-variant":            "#c1c7cb",
      
        // ── Error ──────────────────────────────────
        "error":                      "#ba1a1a",
        "error-container":            "#ffdad6",
        "on-error":                   "#ffffff",
        "on-error-container":         "#93000a",
      
        // ── Brand aliases ──────────────────────────
        "cloud":        "#F4F2ED",
        "deep-charcoal":"#141416",
        "petrol":       "#2B4D5A",
        "taupe":        "#B5A898",
        "charcoal":     "#141416",
        "bone":         "#FAFAF8",
      },
    },
  },
  plugins: [],
};

export default config;
