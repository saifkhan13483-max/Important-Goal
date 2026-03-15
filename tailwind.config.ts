import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* Phase 4 — Border radius scale */
      borderRadius: {
        sm:    ".1875rem",  /* 3px  */
        md:    ".375rem",   /* 6px  */
        lg:    ".5625rem",  /* 9px  */
        xl:    ".75rem",    /* 12px */
        "2xl": "1rem",      /* 16px */
        "3xl": "1.5rem",    /* 24px */
        full:  "9999px",
      },

      /* Phase 4 — Typography scale (Hero 56px → Caption 12px) */
      fontSize: {
        "hero":       ["3.5rem",   { lineHeight: "1.1",  fontWeight: "700", letterSpacing: "-0.02em" }],
        "section":    ["2.25rem",  { lineHeight: "1.2",  fontWeight: "600" }],
        "card-title": ["1.5rem",   { lineHeight: "1.3",  fontWeight: "600" }],
        "body-lg":    ["1.125rem", { lineHeight: "1.6" }],
        "body":       ["1rem",     { lineHeight: "1.6" }],
        "label":      ["0.875rem", { lineHeight: "1.4",  fontWeight: "500" }],
        "caption":    ["0.75rem",  { lineHeight: "1.4" }],
      },

      /* Phase 4 — Full color system */
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border:     "hsl(var(--border) / <alpha-value>)",
        input:      "hsl(var(--input) / <alpha-value>)",
        ring:       "hsl(var(--ring) / <alpha-value>)",
        card: {
          DEFAULT:    "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border:     "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border:     "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border:     "var(--primary-border)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border:     "var(--secondary-border)",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border:     "var(--muted-border)",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border:     "var(--accent-border)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border:     "var(--destructive-border)",
        },
        /* Phase 4 — Semantic status tokens */
        success: {
          DEFAULT:    "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
          border:     "var(--success-border)",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
          border:     "var(--warning-border)",
        },
        /* Phase 4 — Named chart colors */
        chart: {
          "1":    "hsl(var(--chart-1) / <alpha-value>)",
          "2":    "hsl(var(--chart-2) / <alpha-value>)",
          "3":    "hsl(var(--chart-3) / <alpha-value>)",
          "4":    "hsl(var(--chart-4) / <alpha-value>)",
          "5":    "hsl(var(--chart-5) / <alpha-value>)",
          purple: "hsl(var(--chart-purple) / <alpha-value>)",
          cyan:   "hsl(var(--chart-cyan) / <alpha-value>)",
          green:  "hsl(var(--chart-green) / <alpha-value>)",
          orange: "hsl(var(--chart-orange) / <alpha-value>)",
          pink:   "hsl(var(--chart-pink) / <alpha-value>)",
        },
        sidebar: {
          ring:       "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT:    "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border:     "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT:    "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border:     "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT:    "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border:     "var(--sidebar-accent-border)",
        },
        status: {
          online:  "rgb(34 197 94)",
          away:    "rgb(245 158 11)",
          busy:    "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },

      fontFamily: {
        sans:  ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono:  ["var(--font-mono)"],
      },

      /* Phase 4 — Spacing rhythm extras (8px base) */
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
      },

      /* Phase 4 + 6 — Animation keyframes */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to:   { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-24px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to:   { opacity: "0", transform: "scale(0.95)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-success": {
          "0%":   { boxShadow: "0 0 0 0 hsl(142 72% 40% / 0.4)" },
          "70%":  { boxShadow: "0 0 0 10px hsl(142 72% 40% / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(142 72% 40% / 0)" },
        },
        "glow-pulse": {
          "0%":   { boxShadow: "0 0 0 0 hsl(258 84% 62% / 0.5)" },
          "70%":  { boxShadow: "0 0 0 12px hsl(258 84% 62% / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(258 84% 62% / 0)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "bar-grow": {
          from: { transform: "scaleY(0)" },
          to:   { transform: "scaleY(1)" },
        },
        "skeleton-shimmer": {
          "0%":   { opacity: "0.5" },
          "50%":  { opacity: "0.8" },
          "100%": { opacity: "0.5" },
        },
        "confetti-fall": {
          "0%":   { transform: "translateY(-10px) rotate(0deg)",   opacity: "1" },
          "100%": { transform: "translateY(60px)  rotate(360deg)", opacity: "0" },
        },
      },

      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 300ms ease-out both",
        "fade-out":        "fade-out 200ms ease-in both",
        "slide-up":        "slide-up 300ms cubic-bezier(0.22,1,0.36,1) both",
        "slide-down":      "slide-down 300ms cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-right":  "slide-in-right 300ms cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-left":   "slide-in-left 300ms cubic-bezier(0.22,1,0.36,1) both",
        "scale-in":        "scale-in 200ms cubic-bezier(0.22,1,0.36,1) both",
        "scale-out":       "scale-out 150ms ease-in both",
        "toast-in":        "toast-in 300ms cubic-bezier(0.22,1,0.36,1) both",
        "pulse-success":   "pulse-success 400ms ease-out",
        "glow-pulse":      "glow-pulse 500ms ease-out",
        "count-up":        "count-up 800ms cubic-bezier(0.22,1,0.36,1) both",
        "bar-grow":        "bar-grow 600ms cubic-bezier(0.22,1,0.36,1) both",
        "skeleton":        "skeleton-shimmer 1500ms ease-in-out infinite",
        "confetti-fall":   "confetti-fall 1200ms ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
