import type { RequestHandler } from "express";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const handleEnvironmentVariables: RequestHandler = (_req, res) => {
  const entries = Object.entries(process.env)
    .filter(([, value]) => value !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const rows = entries
    .map(([key, value]) => {
      const safeKey = escapeHtml(key);
      const safeValue = escapeHtml(String(value ?? ""));
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
};
