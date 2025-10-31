import "dotenv/config";
import express from "express";
import cors, { CorsOptions } from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleDemo } from "./routes/demo";
import { handleSendEmail } from "./routes/email";
import {
  handleAuthCallback,
  handleAuthLogin,
  handleAuthRegister,
  handleAuthWebAuthnFinish,
  handleAuthWebAuthnStart,
} from "./routes/auth";
import { handleEnvironmentVariables } from "./routes/environment";
import { handleGetAppConfig, handleGetAuth0ClientConfig } from "./routes/config";
import { handleGetPqrsPublicKey, handleSubmitPqrs } from "./routes/pqrs";
import { handleGetFormacionPublicKey, handleSubmitFormacion } from "./routes/formacion";
import { handleGetBienestarPublicKey, handleSubmitBienestar } from "./routes/bienestar";
import {
  handleRequestSiaToken,
  handleSiaFileAdd,
  handleSiaFileGet,
  handleSiaProcess,
} from "./routes/sia";
import { requireAuth } from "./middleware/require-auth";
import { logAuth0ConfigSummary } from "./utils/auth0-config-logger";

let hasLoggedAuth0Config = false;

export function createServer() {
  const app = express();

  if (!hasLoggedAuth0Config) {
    logAuth0ConfigSummary();
    hasLoggedAuth0Config = true;
  }

  const moduleDirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.resolve(moduleDirname, "../public");

  const corsOptions: CorsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    optionsSuccessStatus: 200,
  };

  // Middleware
  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // Health check endpoint for Azure App Service warmup probes
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/env", handleEnvironmentVariables);
  app.get("/api/auth/config", handleGetAuth0ClientConfig);
  app.get("/api/config/app", handleGetAppConfig);
  app.get("/api/demo", requireAuth, handleDemo);
  app.post("/api/email/send", requireAuth, handleSendEmail);
  app.get("/api/pqrs/public-key", handleGetPqrsPublicKey);
  app.post("/api/pqrs", handleSubmitPqrs);
  app.get("/api/formacion/public-key", handleGetFormacionPublicKey);
  app.post("/api/formacion", handleSubmitFormacion);
  app.get("/api/bienestar/public-key", handleGetBienestarPublicKey);
  app.post("/api/bienestar", handleSubmitBienestar);
  app.post("/api/sia/token", handleRequestSiaToken);
  app.post("/api/sia/file-get", handleSiaFileGet);
  app.post("/api/sia/file-add", handleSiaFileAdd);
  app.post("/api/sia/process", handleSiaProcess);
  app.post("/api/auth/register", handleAuthRegister);
  app.post("/api/auth/login", handleAuthLogin);
  app.post("/api/auth/callback", handleAuthCallback);
  app.post("/api/auth/webauthn/login/start", handleAuthWebAuthnStart);
  app.post("/api/auth/webauthn/login/finish", handleAuthWebAuthnFinish);
  return app;
}
