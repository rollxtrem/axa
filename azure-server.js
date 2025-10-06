import { existsSync } from "fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidates = [
  path.join(__dirname, "dist", "server", "production.mjs"),
  path.join(__dirname, "dist", "server", "production.js"),
];

const entryPath = candidates.find((candidate) => existsSync(candidate));

if (!entryPath) {
  console.error(
    "No se encontró el bundle de producción del servidor. Asegúrate de ejecutar 'npm run build' antes de iniciar la aplicación.",
  );
  process.exit(1);
}

const entryUrl = pathToFileURL(entryPath).href;

import(entryUrl).catch((error) => {
  console.error("Fallo al iniciar el servidor de producción", error);
  process.exit(1);
});
