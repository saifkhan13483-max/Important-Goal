import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig(async () => {
  const replitPlugins = isReplit
    ? await Promise.all([
        import("@replit/vite-plugin-runtime-error-modal").then(m => m.default()),
        import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
        import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
      ])
    : [];

  return {
    plugins: [react(), ...replitPlugins],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "client", "src", "types"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core — always loaded first
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
              return "react-vendor";
            }
            // Firebase — large but only needed when authenticated
            if (id.includes("node_modules/firebase/") || id.includes("node_modules/@firebase/")) {
              return "firebase";
            }
            // Recharts + D3 — only loaded on analytics page
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
              return "charts";
            }
            // Framer Motion — animation library
            if (id.includes("node_modules/framer-motion")) {
              return "motion";
            }
            // Radix UI primitives — UI component library
            if (id.includes("node_modules/@radix-ui/")) {
              return "radix";
            }
            // Stripe
            if (id.includes("node_modules/@stripe/") || id.includes("node_modules/stripe")) {
              return "stripe";
            }
            // EmailJS
            if (id.includes("node_modules/@emailjs/")) {
              return "emailjs";
            }
            // General utilities — date-fns, zod, wouter, etc.
            if (
              id.includes("node_modules/date-fns") ||
              id.includes("node_modules/zod") ||
              id.includes("node_modules/wouter") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/class-variance-authority") ||
              id.includes("node_modules/tailwind-merge")
            ) {
              return "utils";
            }
          },
        },
      },
    },
    server: {
      port: 5000,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port: 5000,
      host: "0.0.0.0",
    },
  };
});
