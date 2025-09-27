import fs from "fs";
import path from "path";
import { createServer } from "./index";
import * as express from "express";
import { fileURLToPath } from "node:url";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const moduleDirname = path.dirname(fileURLToPath(import.meta.url));
const staticCandidates = [
  path.join(moduleDirname, "../spa"),
  path.join(moduleDirname, "spa"),
  path.join(process.cwd(), "dist", "spa"),
];

const distPath = staticCandidates.find((candidate) => fs.existsSync(candidate)) ?? staticCandidates[0];

if (!fs.existsSync(distPath)) {
  console.warn(
    "⚠️ No se encontraron los archivos estáticos de la SPA. Asegúrate de ejecutar 'npm run build' antes de iniciar el servidor.",
  );
}

// Serve static files
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Handle React Router - serve index.html for all non-API routes
  app.get(/^\/(?!api\/|health).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.warn(
    "⚠️ Los archivos estáticos no están disponibles; las rutas del cliente devolverán 404 hasta que se genere la compilación.",
  );
}

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
