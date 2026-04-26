import { defineConfig } from "vite";

export default defineConfig({
  assetsInclude: ["**/*.wgsl"],
  server: {
    open: true,
  },
});
