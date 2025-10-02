import type { RequestHandler } from "express";
import type { DemoResponse } from "@shared/api";

import type { AuthenticatedRequest } from "../middleware/require-auth";

export const handleDemo: RequestHandler = (req, res) => {
  const { auth } = req as AuthenticatedRequest;

  const subject =
    typeof auth?.payload?.sub === "string" ? auth.payload.sub : undefined;

  const response: DemoResponse = {
    message: subject
      ? `Token verificado correctamente para el usuario ${subject}.`
      : "Token verificado correctamente.",
  };

  res.status(200).json(response);
};
