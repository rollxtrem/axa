/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface SendEmailRequestBody {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SendEmailResponse {
  messageId: string;
  envelope: {
    from: string;
    to: string[];
  };
}

export interface ApiErrorResponse {
  message: string;
  errors?: unknown;
  details?: unknown;
}

export interface RegisterRequestBody {
  fullName: string;
  email: string;
  password: string;
  documentNumber: string;
}

export interface RegisterResponseBody {
  user: Auth0UserProfile;
  message?: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface Auth0UserProfile {
  sub: string;
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface LoginResponseBody {
  tokens: AuthTokens;
  user: Auth0UserProfile;
}

export interface PqrsFormData {
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  requestType: string;
  subject: string;
  description: string;
}

export interface EncryptedSubmissionRequest {
  ciphertext: string;
  encryptedKey: string;
  iv: string;
}

export interface PqrsSubmissionRequest extends EncryptedSubmissionRequest {}

export type FormacionSubmissionRequest = EncryptedSubmissionRequest;

export interface PqrsSubmissionResponse {
  status: "ok";
}

export interface PqrsPublicKeyResponse {
  publicKey: string;
}

export interface FormacionFormData {
  fullName: string;
  email: string;
  course: string;
}

export type FormacionSubmissionResponse = PqrsSubmissionResponse;

export type FormacionPublicKeyResponse = PqrsPublicKeyResponse;

export interface BienestarFormData {
  fullName: string;
  identification: string;
  email: string;
  phone: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
}

export type BienestarSubmissionRequest = EncryptedSubmissionRequest;

export type BienestarSubmissionResponse = PqrsSubmissionResponse;

export type BienestarPublicKeyResponse = PqrsPublicKeyResponse;

export interface SiaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  uid?: string;
  ulogin?: string;
  consumerKey?: string;
  dz?: string;
  ".issued"?: string;
  ".expires"?: string;
}

