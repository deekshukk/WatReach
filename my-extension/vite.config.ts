import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For Chrome extensions, often you want to build multiple entries (like popup, background, content scripts)
// but for simplicity, this example assumes a single entry point for the popup

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: "popup.html",  // make sure popup.html exists in your project root or public folder
        // add other entries if needed, e.g., background: "src/background.ts"
      },
      output: {
        // optional: control output folder structure here
      },
    },
    outDir: "dist", // build output folder for your extension
    emptyOutDir: true,
  },
  publicDir: "public", // static assets (like icons, manifest.json) go here and copied as-is
});
