import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const spaDir = path.resolve(rootDir, "dist", "spa");
const distDir = path.resolve(rootDir, "dist");
const serverDir = path.join(distDir, "server");
const targetSpaDir = path.join(serverDir, "spa");
const templateSourceCandidates = [
  path.resolve(rootDir, "server", "plantillas"),
  path.resolve(rootDir, "server", "sia"),
];
const distTemplatesDir = path.join(distDir, "plantillas");
const distServerTemplatesDir = path.join(serverDir, "sia");

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

const templateSourceDir = templateSourceCandidates.find((candidate) => fs.existsSync(candidate));

if (templateSourceDir) {
  const templateEntries = fs
    .readdirSync(templateSourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  if (templateEntries.length === 0) {
    console.warn("⚠️ No se encontraron archivos .json de plantillas para copiar");
  } else {
    const copyTemplatesTo = (targetDir) => {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }

      fs.mkdirSync(targetDir, { recursive: true });

      for (const entry of templateEntries) {
        const sourcePath = path.join(templateSourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        fs.copyFileSync(sourcePath, targetPath);
      }
    };

    copyTemplatesTo(distTemplatesDir);
    copyTemplatesTo(distServerTemplatesDir);

    console.log("✅ Plantillas del servidor copiadas en dist/plantillas");
    console.log("✅ Plantillas del servidor disponibles en dist/server/sia");
  }
} else {
  console.warn(
    "⚠️ No se encontraron directorios de plantillas en server/plantillas ni server/sia; no se copiaron plantillas",
  );
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
