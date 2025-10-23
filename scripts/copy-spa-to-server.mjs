import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const spaDir = path.resolve(rootDir, "dist", "spa");
const distDir = path.resolve(rootDir, "dist");
const serverDir = path.join(distDir, "server");
const targetSpaDir = path.join(serverDir, "spa");
const templatesDir = path.resolve(rootDir, "server", "plantillas");
const distTemplatesDir = path.join(distDir, "plantillas");

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

if (fs.existsSync(templatesDir)) {
  if (fs.existsSync(distTemplatesDir)) {
    fs.rmSync(distTemplatesDir, { recursive: true, force: true });
  }

  fs.cpSync(templatesDir, distTemplatesDir, { recursive: true });
  console.log("✅ Plantillas del servidor copiadas en dist/plantillas");
} else {
  console.warn("⚠️ No se encontró el directorio server/plantillas; no se copiaron plantillas");
}

// Además de copiar los archivos para el bundle del servidor, duplicamos la SPA
// en la raíz de dist/ para que plataformas de hosting estático (como Azure
// Static Web Apps) encuentren un index.html en el directorio esperado.
for (const entry of fs.readdirSync(spaDir)) {
  const sourcePath = path.join(spaDir, entry);
  const targetPath = path.join(distDir, entry);

  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

console.log("✅ Archivos de la SPA copiados dentro de dist/server/spa");
console.log("✅ Archivos de la SPA preparados en dist/ para despliegues estáticos");
