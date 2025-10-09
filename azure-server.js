// Contenido para: azure-server.js
// Este es el "puente" que iisnode puede entender.
async function start() {
  try {
    // Usamos import() dinámico para cargar nuestro script principal, que es un Módulo ES.
    console.log("Iniciando el cargador de la aplicación ESM...");
    await import('./start-app.js');
    console.log("El cargador de la aplicación ESM se ejecutó correctamente.");
  } catch(error) {
    console.error("Error al cargar la aplicación principal desde el puente:", error);
    process.exit(1);
  }
}

start();