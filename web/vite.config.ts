import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project-page base path so assets resolve correctly under
// https://<user>.github.io/LinkedinPostCreator/
export default defineConfig({
  base: "/LinkedinPostCreator/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
