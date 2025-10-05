import "dotenv/config";
import express from "express";
import cors, { CorsOptions } from "cors";
import { handleDemo } from "./routes/demo";
import { handleSendEmail } from "./routes/email";
import { handleAuthLogin, handleAuthRegister } from "./routes/auth";
import { handleEnvironmentVariables } from "./routes/environment";
import { handleGetPqrsPublicKey, handleSubmitPqrs } from "./routes/pqrs";
import { handleGetFormacionPublicKey, handleSubmitFormacion } from "./routes/formacion";
import { requireAuth } from "./middleware/require-auth";

export function createServer() {
  const app = express();

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
  app.get("/api/demo", requireAuth, handleDemo);
  app.post("/api/email/send", requireAuth, handleSendEmail);
  app.get("/api/pqrs/public-key", handleGetPqrsPublicKey);
  app.post("/api/pqrs", handleSubmitPqrs);
  app.get("/api/formacion/public-key", handleGetFormacionPublicKey);
  app.post("/api/formacion", handleSubmitFormacion);
  app.post("/api/auth/register", handleAuthRegister);
  app.post("/api/auth/login", handleAuthLogin);

  return app;
}
