import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
// NO_SINGLEFILE=1 : produit un dist/ classique (fichiers séparés) au lieu d'un
// index.html unique. Utile sur un environnement à faible RAM où l'inlining
// d'un chunk unique dépasse la mémoire disponible. Le dist/ reste déployable
// tel quel sur Netlify / Vercel / tout hébergeur statique.
const singleFile = process.env.NO_SINGLEFILE ? [] : [viteSingleFile()];

export default defineConfig({
  plugins: [react(), tailwindcss(), ...singleFile],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Sur un environnement à faible RAM, on peut désactiver la minification
    // (LOW_MEM=1) pour éviter un pic mémoire pendant le rendu du fichier unique.
    minify: process.env.LOW_MEM ? false : "esbuild",
    sourcemap: false,
    reportCompressedSize: false,
    // NO_SINGLEFILE : sortie chunkée à faible empreinte mémoire.
    ...(process.env.NO_SINGLEFILE
      ? {
          rollupOptions: {
            // Le cache rollup double la mémoire ; inutile pour un build unique.
            cache: false,
            maxParallelFileOps: 1,
          },
        }
      : {}),
  },
  server: {
    allowedHosts: true,
  },
});
