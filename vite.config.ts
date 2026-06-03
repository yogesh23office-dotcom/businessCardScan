import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

const apiTarget = process.env.VITE_API_URL || "http://127.0.0.1:5000";

/** Netlify functions-serve breaks SSR deps (e.g. recharts → @reduxjs/toolkit) during `vite dev`. */
const isViteDev = process.argv.includes("dev");
const isLocalProdBuild = process.argv.some((arg) => arg.includes("development"));
const enableNetlifyPlugin = !isViteDev && !isLocalProdBuild;

export default defineConfig({
  server: {
    proxy: {
      "/admin": { target: apiTarget, changeOrigin: true },
      "/contacts": { target: apiTarget, changeOrigin: true },
      "/scan-card": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
      "/integrations": { target: apiTarget, changeOrigin: true },
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ["framer-motion", "motion-dom", "motion-utils"],
  },
  ssr: {
    // victory-vendor (recharts → d3-shape) is CJS; must bundle for Netlify SSR ESM loader
    noExternal: [
      "recharts",
      "victory-vendor",
      "@reduxjs/toolkit",
      "react-redux",
      "framer-motion",
      "motion-dom",
      "motion-utils",
    ],
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    ...(enableNetlifyPlugin ? [netlify()] : []),
    react(),
  ],
});
