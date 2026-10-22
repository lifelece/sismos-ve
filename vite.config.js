import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        /**
         * Leaflet en su propio chunk (ADR-007): llega por import() tras el
         * primer pintado y cambia a otro ritmo que el codigo propio.
         * El ayudante de precarga de Vite va aparte: si cae dentro del chunk
         * de Leaflet, index.html lo precargaria y el primer pintado volveria a
         * depender de el (leccion de orinoco-digital, ADR-022).
         */
        manualChunks(id) {
          if (id.includes("vite/preload-helper")) return "precarga";
          if (id.includes("node_modules/leaflet")) return "leaflet";
          return undefined;
        },
      },
    },
  },
});
