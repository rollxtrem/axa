import type { RequestHandler } from "express";
import { z } from "zod";

import type {
  ApiErrorResponse,
  AuthCallbackRequestBody,
  LoginRequestBody,
  LoginResponseBody,
  RegisterRequestBody,
  RegisterResponseBody,
  WebAuthnLoginFinishRequest,
  WebAuthnLoginStartRequest,
  WebAuthnLoginStartResponse,
} from "@shared/api";
import {
  Auth0ServiceError,
  createAuth0User,
  exchangeAuthorizationCode,
  finishWebAuthnLogin,
  loginWithPassword,
  startWebAuthnLogin,
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

const base64UrlRegex = /^[A-Za-z0-9_-]+=*$/;

const webAuthnCredentialSchema = z
  .object({
    id: z.string().min(1, "El identificador de la credencial es obligatorio."),
    rawId: z
      .string()
      .min(1, "El identificador bruto de la credencial es obligatorio.")
      .regex(base64UrlRegex, "rawId debe estar codificado en base64url."),
    type: z.literal("public-key"),
    authenticatorAttachment: z
      .string()
      .nullable()
      .optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    response: z
      .object({
        clientDataJSON: z
          .string()
          .min(1, "clientDataJSON es obligatorio.")
          .regex(base64UrlRegex, "clientDataJSON debe estar en base64url."),
        authenticatorData: z
          .string()
          .min(1, "authenticatorData es obligatorio.")
          .regex(base64UrlRegex, "authenticatorData debe estar en base64url."),
        signature: z
          .string()
          .min(1, "signature es obligatoria.")
          .regex(base64UrlRegex, "signature debe estar en base64url."),
        userHandle: z
          .string()
          .regex(base64UrlRegex, "userHandle debe estar en base64url.")
          .nullable()
          .optional(),
      })
      .strict(),
  })
  .strict();

const webAuthnStartSchema = z
  .object({
    email: z.string().email("El correo electrónico no es válido"),
  })
  .strict();

const webAuthnFinishSchema = z
  .object({
    email: z.string().email("El correo electrónico no es válido"),
    credential: webAuthnCredentialSchema,
    state: z.string().optional(),
    rememberMe: z.boolean().optional(),
  })
  .strict();

const authCallbackSchema = z
  .object({
    code: z.string().min(1, "El código de autorización es obligatorio."),
    codeVerifier: z
      .string()
      .min(43, "El code_verifier es obligatorio.")
      .max(128, "El code_verifier no es válido."),
    redirectUri: z.string().url("La URL de redirección no es válida."),
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

export const handleAuthCallback: RequestHandler = async (req, res) => {
  const parsed = authCallbackSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorBody = formatValidationError(parsed.error.issues);
    return res.status(400).json(errorBody);
  }

  try {
    const payload = parsed.data as AuthCallbackRequestBody;
    const result = await exchangeAuthorizationCode(payload);

    return res.status(200).json(result);
  } catch (error) {
    const serviceError = handleServiceError(error);
    const status =
      error instanceof Auth0ServiceError && error.status ? error.status : 500;

    const normalizedStatus =
      status === 401 || status === 403 ? status : Math.max(400, status);

    console.error("Error al completar el inicio de sesión con Auth0", error);

    return res.status(normalizedStatus).json(serviceError);
  }
};

export const handleAuthWebAuthnStart: RequestHandler = async (req, res) => {
  const parsed = webAuthnStartSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorBody = formatValidationError(parsed.error.issues);
    return res.status(400).json(errorBody);
  }

  try {
    const payload = parsed.data as WebAuthnLoginStartRequest;
    const result: WebAuthnLoginStartResponse = await startWebAuthnLogin(
      payload.email
    );

    return res.status(200).json(result);
  } catch (error) {
    const serviceError = handleServiceError(error);
    const status =
      error instanceof Auth0ServiceError && error.status
        ? error.status
        : 500;

    console.error("Error al iniciar autenticación WebAuthn", error);

    return res.status(Math.max(400, status)).json(serviceError);
  }
};

export const handleAuthWebAuthnFinish: RequestHandler = async (req, res) => {
  const parsed = webAuthnFinishSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorBody = formatValidationError(parsed.error.issues);
    return res.status(400).json(errorBody);
  }

  try {
    const payload = parsed.data as WebAuthnLoginFinishRequest;
    const result = await finishWebAuthnLogin(payload);

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
        "No se pudo validar la credencial WebAuthn proporcionada.";
    }

    console.error("Error al finalizar autenticación WebAuthn", error);

    return res.status(normalizedStatus).json(serviceError);
  }
};
