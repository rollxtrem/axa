import type { RequestHandler } from "express";
import { z } from "zod";

import type {
  ApiErrorResponse,
  LoginRequestBody,
  LoginResponseBody,
  RegisterRequestBody,
  RegisterResponseBody,
} from "@shared/api";
import {
  Auth0ServiceError,
  createAuth0User,
  loginWithPassword,
} from "../services/auth0";

const registerSchema = z
  .object({
    fullName: z.string().min(1, "El nombre completo es obligatorio"),
    email: z.string().email("El correo electrónico no es válido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    documentNumber: z
      .string()
      .min(4, "Ingresa un número de documento válido"),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().email("El correo electrónico no es válido"),
    password: z.string().min(1, "La contraseña es obligatoria"),
  })
  .strict();

const includeDebugDetails = process.env.NODE_ENV !== "production";

const formatValidationError = (issues: z.ZodIssue[]): ApiErrorResponse => ({
  message: "Los datos enviados no son válidos.",
  errors: issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  })),
});

const handleServiceError = (error: unknown): ApiErrorResponse => {
  if (error instanceof Auth0ServiceError) {
    return {
      message: error.message,
      details: includeDebugDetails ? error.details : undefined,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Se produjo un error inesperado." };
};

export const handleAuthRegister: RequestHandler = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorBody = formatValidationError(parsed.error.issues);
    return res.status(400).json(errorBody);
  }

  try {
    const payload = parsed.data as RegisterRequestBody;
    const result: RegisterResponseBody = await createAuth0User(payload);

    return res.status(201).json(result);
  } catch (error) {
    const serviceError = handleServiceError(error);
    const status =
      error instanceof Auth0ServiceError && error.status
        ? error.status
        : 500;

    const normalizedStatus =
      status === 409 || status === 400 ? status : Math.max(400, status);

    if (status === 409 || status === 400) {
      serviceError.message =
        status === 409
          ? "El correo electrónico ya está registrado."
          : serviceError.message;
    }

    console.error("Error al registrar usuario en Auth0", error);

    return res.status(normalizedStatus).json(serviceError);
  }
};

export const handleAuthLogin: RequestHandler = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorBody = formatValidationError(parsed.error.issues);
    return res.status(400).json(errorBody);
  }

  try {
    const payload = parsed.data as LoginRequestBody;
    const result: LoginResponseBody = await loginWithPassword(payload);

    return res.status(200).json(result);
  } catch (error) {
    const serviceError = handleServiceError(error);
    const status =
      error instanceof Auth0ServiceError && error.status
        ? error.status
        : 500;

    const normalizedStatus =
      status === 401 || status === 403 ? status : Math.max(400, status);

    if (normalizedStatus === 401 || normalizedStatus === 403) {
      serviceError.message =
        serviceError.message ||
        "Credenciales inválidas. Verifica tu correo y contraseña.";
    }

    console.error("Error al iniciar sesión con Auth0", error);

    return res.status(normalizedStatus).json(serviceError);
  }
};
