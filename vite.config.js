import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/trae-sharing-prep-assistant/",
  plugins: [react()],
  build: {
    outDir: "docs"
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["node_modules/**", ".trae/**", "docs/**"]
  }
});
