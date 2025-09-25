import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const spaDir = path.resolve(rootDir, "dist", "spa");
const serverDir = path.resolve(rootDir, "dist", "server");
const targetSpaDir = path.join(serverDir, "spa");

if (!fs.existsSync(spaDir)) {
  console.error(
    "❌ No se encontró el directorio de la SPA compilada en dist/spa. Ejecuta 'npm run build:client' antes de copiar los archivos.",
  );
  process.exit(1);
}

if (!fs.existsSync(serverDir)) {
  console.error(
    "❌ No se encontró el directorio del servidor compilado en dist/server. Ejecuta 'npm run build:server' antes de copiar los archivos.",
  );
  process.exit(1);
}

if (fs.existsSync(targetSpaDir)) {
  fs.rmSync(targetSpaDir, { recursive: true, force: true });
}

fs.cpSync(spaDir, targetSpaDir, { recursive: true });

console.log("✅ Archivos de la SPA copiados dentro de dist/server/spa");
