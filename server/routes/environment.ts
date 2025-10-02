import type { RequestHandler } from "express";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn("No se pudo serializar el valor de una variable de entorno", error);
    try {
      return String(value);
    } catch (stringifyError) {
      console.warn("No se pudo convertir a texto el valor de una variable de entorno", stringifyError);
      return "[Valor no disponible]";
    }
  }
}

function truncateValue(value: string, limit = 10_000): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}… (truncated)`;
}

export const handleEnvironmentVariables: RequestHandler = (_req, res) => {
  try {
    const entries = Object.entries(process.env)
      .filter(([, value]) => value !== undefined)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    const rows = entries
      .map(([key, rawValue]) => {
        const safeKey = escapeHtml(key);

        let normalizedValue: string;
        try {
          normalizedValue = truncateValue(normalizeValue(rawValue));
        } catch (error) {
          console.warn(`No se pudo normalizar la variable de entorno "${key}"`, error);
          normalizedValue = "[Valor no disponible]";
        }

        const safeValue = escapeHtml(normalizedValue);
        return `<tr><th scope="row">${safeKey}</th><td>${safeValue}</td></tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Environment Variables</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #0f172a; background-color: #f8fafc; }
      h1 { font-size: 1.75rem; margin-bottom: 1.5rem; }
      table { border-collapse: collapse; width: 100%; max-width: 960px; background: white; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08); }
      thead { background-color: #e2e8f0; text-align: left; }
      th, td { padding: 0.75rem 1rem; border-bottom: 1px solid #cbd5f5; font-size: 0.95rem; }
      tbody tr:nth-child(even) { background-color: #f1f5f9; }
      code { font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      caption { text-align: left; font-weight: 600; padding: 0.75rem 1rem; }
    </style>
  </head>
  <body>
    <h1>Environment Variables</h1>
    <table role="table">
      <caption>Listado de variables disponibles en el entorno del servidor</caption>
      <thead>
        <tr><th scope="col">Variable</th><th scope="col">Valor</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="2">No environment variables found.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`;

    res.type("html").send(html);
  } catch (error) {
    console.error("No se pudo renderizar la página de variables de entorno", error);
    res.status(500).type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Environment Variables</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #0f172a; background-color: #f8fafc; }
      h1 { font-size: 1.75rem; margin-bottom: 1.5rem; }
      p { font-size: 1rem; }
    </style>
  </head>
  <body>
    <h1>Environment Variables</h1>
    <p>No se pudo mostrar la lista de variables de entorno. Revisa los registros del servidor para más detalles.</p>
  </body>
</html>`);
  }
};
