import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import deno from "@deno/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { join } from "@std/path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    deno(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ["react/jsx-runtime"],
  },
  resolve: {
    alias: {
      "@stackcore/shared": join(
        import.meta.dirname ?? "",
        "../shared/src/index.ts",
      ),
    },
  },
});
