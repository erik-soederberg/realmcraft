import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file build so a playable version can be shared as one HTML page.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
});
