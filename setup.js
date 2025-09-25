#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Configurando AXA Starter Project...\n");

// Function to run commands safely
function runCommand(command, description) {
  try {
    console.log(`📦 ${description}...`);
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} completado\n`);
  } catch (error) {
    console.error(`❌ Error en: ${description}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Check if Node.js version is supported
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

  console.log(`🔍 Verificando Node.js version: ${nodeVersion}`);

  if (majorVersion < 18) {
    console.error("❌ Error: Node.js 18 o superior es requerido");
    console.error(
      "Por favor instala una versión más reciente desde https://nodejs.org/",
    );
    process.exit(1);
  }

  console.log("✅ Node.js version compatible\n");
}

// Create .env file if it doesn't exist
function createEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log("📝 Creando archivo .env...");
    fs.copyFileSync(envExamplePath, envPath);
    console.log("✅ Archivo .env creado desde .env.example\n");
  }
}

// Main setup function
async function setup() {
  try {
    console.log("🎯 AXA - Sistema de Registro e Inicio de Sesión");
    console.log("================================================\n");

    // Check Node.js version
    checkNodeVersion();

    // Install dependencies
    runCommand("npm install", "Instalando dependencias");

    // Create .env file
    createEnvFile();

    // Run type check
    runCommand("npm run typecheck", "Verificando tipos TypeScript");

    console.log("🎉 ¡Configuración completada exitosamente!");
    console.log("\n📋 Próximos pasos:");
    console.log("   1. Ejecuta: npm run dev");
    console.log("   2. Abre tu navegador en: http://localhost:8080");
    console.log("   3. ¡Disfruta desarrollando!\n");

    console.log("📚 Comandos útiles:");
    console.log("   npm run dev      - Inicia el servidor de desarrollo");
    console.log("   npm run build    - Construye para producción");
    console.log("   npm run start    - Ejecuta la versión de producción");
    console.log("   npm run test     - Ejecuta las pruebas\n");
  } catch (error) {
    console.error("❌ Error durante la configuración:", error.message);
    process.exit(1);
  }
}

// Run setup
setup();
