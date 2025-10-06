import type { RequestHandler } from "express";

import type { SiaTokenResponse } from "@shared/api";
import { requestSiaToken, SiaServiceError } from "../services/sia";

export const handleRequestSiaToken: RequestHandler = async (_req, res) => {
  try {
    const response: SiaTokenResponse = await requestSiaToken();
    res.json(response);
  } catch (error) {
    if (error instanceof SiaServiceError) {
      if (error.status >= 500) {
        console.error("SIA service error", error);
      }
      return res.status(error.status).json({ error: error.message, details: error.details });
    }

    console.error("Unexpected error fetching SIA token", error);
    res.status(500).json({ error: "Ocurrió un error al obtener el token de SIA." });
  }
};

