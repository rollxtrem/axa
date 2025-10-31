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

export interface NodeVersionResponse {
  build: string;
  runtime: string;
}

export interface AppConfigResponse {
  appName: string | null;
}

export interface Auth0ClientConfigResponse {
  domain: string | null;
  clientId: string | null;
  audience: string | null;
  redirectUri: string | null;
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

export interface AuthCallbackRequestBody {
  code: string;
  codeVerifier: string;
  redirectUri: string;
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

export type WebAuthnAuthenticatorTransport =
  | "usb"
  | "nfc"
  | "ble"
  | "internal"
  | "cable"
  | "hybrid"
  | "smart-card"
  | "lightning"
  | "unknown"
  | string;

export interface WebAuthnPublicKeyCredentialDescriptorJSON {
  id: string;
  type: "public-key";
  transports?: WebAuthnAuthenticatorTransport[];
}

export interface WebAuthnPublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: WebAuthnPublicKeyCredentialDescriptorJSON[];
  userVerification?: "required" | "preferred" | "discouraged";
  extensions?: Record<string, unknown>;
}

export interface WebAuthnLoginStartRequest {
  email: string;
}

export interface WebAuthnLoginStartResponse {
  options: WebAuthnPublicKeyCredentialRequestOptionsJSON;
  state?: string;
  expiresAt?: string;
}

export interface WebAuthnAuthenticatorAssertionResponseJSON {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string | null;
}

export interface WebAuthnCredentialRequestJSON {
  id: string;
  rawId: string;
  type: "public-key";
  authenticatorAttachment?: string | null;
  clientExtensionResults?: Record<string, unknown>;
  response: WebAuthnAuthenticatorAssertionResponseJSON;
}

export interface WebAuthnLoginFinishRequest {
  email: string;
  credential: WebAuthnCredentialRequestJSON;
  state?: string;
  rememberMe?: boolean;
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
  identification: string;
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
  serviceCatalog: string;
  preferredDate: string;
  preferredTime: string;
}

export type BienestarSubmissionRequest = EncryptedSubmissionRequest;

export interface BienestarSubmissionResponse {
  status: "ok";
  message: string;
  file: string;
}

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

export interface SiaFileGetRequestBody {
  sia_token: string;
  sia_dz: string;
  sia_consumer_key: string;
  user_identification: string;
}

export type SiaFileGetResponseItem = {
  Contrato: string;
  IdCliente: string;
  IdPlan: string;
  IdClientePlan: string;
  PlanPoliza: string;
  TipoTraslado: string;
  TipoServicio: string;
  ServiciosTomados: string;
  ServiciosDisponibles: string;
  ServiciosConfigurados: string;
};

export type SiaFileGetResponse = SiaFileGetResponseItem[];

export interface SiaFileAddPayload {
  dz: string;
  consumerKey: string;
  idCatalogCountry: string;
  contract: string;
  policy: string;
  vip: boolean;
  statusPolicy: string;
  startDatePolicy: string;
  endDatePolicy: string;
  idCatalogTypeAssistance: string;
  idCatalogFile: string;
  idCatalogDiagnostic: string;
  idCatalogServices: string;
  idCatalogClassification: string;
  idCatalogRequiredService: string;
  idCatalogSinisterCode: string;
  idCatalogServiceCode: string;
  idCatalogProblem: string;
  idCatalogSecondCall: string;
  idCatalogTransfer: string;
  idCatalogAssignmentType: string;
  idCatalogServiceCondition: string;
  name: string;
  lastname: string;
  beneficiaryName: string;
  beneficiaryLastname: string;
  gender: string;
  age: number;
  email: string;
  mobile: string;
  latitudeOrigin: number;
  lengthOrigin: number;
  addressOrigin: string;
  idCityCallOrigin: string;
  cityCallOrigin: string;
  stateCallOrigin: string;
  latitudeDestiny: number;
  lengthDestiny: number;
  addressDestiny: string;
  idCityCallDestiny: string;
  stateCallDestiny: string;
  idStateCallDestiny: string;
  carPlates: string;
  carBrand: string;
  carModel: string;
  carYear: string;
  carColor: string;
  scheduleService: string;
  scheduleDate: string;
  scheduleHour: string;
  reasonCalled: string;
  comment: string;
}

export interface SiaFileAddRequestBody extends Partial<SiaFileAddPayload> {
  sia_token: string;
  sia_dz: string;
  sia_consumer_key: string;
  user_identification: string;
  form_code_service: string;
  user_name: string;
  user_email: string;
  user_mobile: string;
  form_date: string;
  form_hora: string;
}

export interface SiaFileAddResponse {
  Success: boolean;
  Code: string;
  Message: string;
  File: string;
}

export interface TenantSummary {
  id: string;
  host: string;
}

export type SiaProcessStepName = "token" | "fileGet" | "fileAdd";

export interface SiaProcessRequestBody {
  identification: string;
  serviceDate: string;
  serviceTime: string;
  serviceCode: string;
}

export interface SiaProcessStepResult {
  name: SiaProcessStepName;
  request: unknown;
  response: unknown;
}

export interface SiaProcessResponseBody {
  tenant: TenantSummary | null;
  template: {
    filename: string | null;
  };
  steps: SiaProcessStepResult[];
}

