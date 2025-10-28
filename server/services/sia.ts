import type {
  SiaFileGetRequestBody,
  SiaFileGetResponseItem,
  SiaTokenResponse,
  SiaFileAddRequestBody,
  SiaFileAddResponse,
  SiaFileAddPayload,
} from "@shared/api";
import { resolveTenantEnv, type TenantContext } from "../utils/tenant-env";

const DEFAULT_SIA_TOKEN_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/token";
const DEFAULT_SIA_FILE_ADD_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/FileAdd";
const DEFAULT_SIA_FILE_GET_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/FileGet";
const DEFAULT_SIA_FILE_GET_CONTRACT =
  "{'contrato':'4430010', 'IdCliente': '01544', 'IdPlan': '01586'}";

type SiaTokenApiResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  uid?: unknown;
  ulogin?: unknown;
  consumerKey?: unknown;
  dz?: unknown;
  ".issued"?: unknown;
  ".expires"?: unknown;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatDateTimeForSia = (value: string): string => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new SiaServiceError(
      "La fecha y hora proporcionadas para FileAdd están vacías.",
      400,
      value
    );
  }

  const date = new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    throw new SiaServiceError(
      "La fecha y hora proporcionadas para FileAdd no tienen un formato válido.",
      400,
      value
    );
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export class SiaServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "SiaServiceError";
    this.status = status;
    this.details = details;
  }
}

type SiaConfig = {
  username: string;
  password: string;
  dz: string;
  grantType: string;
  endpoints: SiaEndpoints;
};

type SiaEndpoints = {
  tokenUrl: string;
  fileAddUrl: string;
  fileGetUrl: string;
};

type SiaServiceOptions = {
  tenant?: TenantContext | null;
};

const getSiaEndpoints = (tenant?: TenantContext | null): SiaEndpoints => ({
  tokenUrl: resolveTenantEnv("SIA_TOKEN_URL", tenant) ?? DEFAULT_SIA_TOKEN_URL,
  fileAddUrl: resolveTenantEnv("SIA_FILE_ADD_URL", tenant) ?? DEFAULT_SIA_FILE_ADD_URL,
  fileGetUrl: resolveTenantEnv("SIA_FILE_GET_URL", tenant) ?? DEFAULT_SIA_FILE_GET_URL,
});

const getSiaConfig = (tenant?: TenantContext | null): SiaConfig => {
  const username = resolveTenantEnv("SIA_USERNAME", tenant);
  const password = resolveTenantEnv("SIA_PASSWORD", tenant);
  const dz = resolveTenantEnv("SIA_DZ", tenant);
  const grantType = resolveTenantEnv("SIA_GRANT_TYPE", tenant) ?? "password";
  const endpoints = getSiaEndpoints(tenant);

  if (!username || !password || !dz) {
    throw new SiaServiceError(
      "Configuración de SIA incompleta. Verifica las variables SIA_USERNAME, SIA_PASSWORD y SIA_DZ.",
      500
    );
  }

  return { username, password, dz, grantType, endpoints };
};

const getSiaFileGetContract = (tenant?: TenantContext | null): string => {
  const contract = resolveTenantEnv("SIA_FILE_GET_CONTRACT", tenant);
  const normalized = (contract ?? DEFAULT_SIA_FILE_GET_CONTRACT).trim();

  if (!normalized) {
    throw new SiaServiceError(
      "La configuración del contrato para FileGet de SIA está vacía.",
      500
    );
  }

  return normalized;
};

const parseSiaResponse = (body: unknown): SiaTokenResponse => {
  if (!isRecord(body)) {
    throw new SiaServiceError("La respuesta de SIA tiene un formato inesperado.", 500, body);
  }

  const {
    access_token,
    token_type,
    expires_in,
    uid,
    ulogin,
    consumerKey,
    dz,
    ".issued": issued,
    ".expires": expires,
  } = body as SiaTokenApiResponse;

  if (typeof access_token !== "string" || typeof token_type !== "string") {
    throw new SiaServiceError("La respuesta de SIA no contiene los datos esperados.", 500, body);
  }

  const parsedExpiresIn = (() => {
    if (typeof expires_in === "number" && Number.isFinite(expires_in)) {
      return expires_in;
    }

    if (typeof expires_in === "string") {
      const value = Number.parseInt(expires_in, 10);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  })();

  if (parsedExpiresIn === null) {
    throw new SiaServiceError("La respuesta de SIA tiene un tiempo de expiración inválido.", 500, body);
  }

  return {
    access_token,
    token_type,
    expires_in: parsedExpiresIn,
    uid: typeof uid === "string" ? uid : undefined,
    ulogin: typeof ulogin === "string" ? ulogin : undefined,
    consumerKey: typeof consumerKey === "string" ? consumerKey : undefined,
    dz: typeof dz === "string" ? dz : undefined,
    ".issued": typeof issued === "string" ? issued : undefined,
    ".expires": typeof expires === "string" ? expires : undefined,
  };
};

type RequestSiaTokenOptions = {
  tenant?: TenantContext | null;
};

export const requestSiaToken = async (
  options: RequestSiaTokenOptions = {}
): Promise<SiaTokenResponse> => {
  const { username, password, dz, grantType, endpoints } = getSiaConfig(options.tenant);

  let response: Response;
  try {
    response = await fetch(endpoints.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: grantType,
        username,
        password,
        DZ: dz,
      }).toString(),
    });
  } catch (error) {
    throw new SiaServiceError("No se pudo conectar con el servicio de SIA.", 502, error);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new SiaServiceError("La respuesta de SIA no es un JSON válido.", response.status || 500, error);
  }

  if (!response.ok) {
    const message =
      (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) ||
      "No se pudo obtener el token de SIA.";
    throw new SiaServiceError(message, response.status || 500, payload);
  }

  return parseSiaResponse(payload);
};

const parseSiaFileGetResponse = (payload: unknown): SiaFileGetResponseItem[] => {
  if (!Array.isArray(payload)) {
    throw new SiaServiceError(
      "La respuesta de SIA FileGet tiene un formato inesperado.",
      500,
      payload
    );
  }

  return payload.map((item, index) => {
    if (!isRecord(item)) {
      throw new SiaServiceError(
        `Elemento ${index} de la respuesta de SIA FileGet tiene un formato inesperado.`,
        500,
        item
      );
    }

    const getField = (field: keyof SiaFileGetResponseItem): string => {
      const value = item[field];

      if (typeof value !== "string" || !value.trim()) {
        throw new SiaServiceError(
          `El campo "${field}" del elemento ${index} de la respuesta de SIA FileGet es inválido.`,
          500,
          item
        );
      }

      return value;
    };

    return {
      Contrato: getField("Contrato"),
      IdCliente: getField("IdCliente"),
      IdPlan: getField("IdPlan"),
      IdClientePlan: getField("IdClientePlan"),
      PlanPoliza: getField("PlanPoliza"),
      TipoTraslado: getField("TipoTraslado"),
      TipoServicio: getField("TipoServicio"),
      ServiciosTomados: getField("ServiciosTomados"),
      ServiciosDisponibles: getField("ServiciosDisponibles"),
      ServiciosConfigurados: getField("ServiciosConfigurados"),
    };
  });
};

export const FileGet = async (
  {
    sia_token,
    sia_dz,
    sia_consumer_key,
    user_identification,
  }: SiaFileGetRequestBody,
  options: SiaServiceOptions = {}
): Promise<SiaFileGetResponseItem[]> => {
  const { fileGetUrl } = getSiaEndpoints(options.tenant);
  const contract = getSiaFileGetContract(options.tenant);
  let response: Response;
  try {
    response = await fetch(fileGetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sia_token}`,
      },
      body: JSON.stringify({
        dz: sia_dz,
        consumerKey: sia_consumer_key,
        operationType: "4",
        contract,
        serviceTypeCode: "",
        Plates: user_identification,
        validationType: "1",
      }),
    });
  } catch (error) {
    throw new SiaServiceError(
      "No se pudo conectar con el servicio FileGet de SIA.",
      502,
      error
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new SiaServiceError(
      "La respuesta de SIA FileGet no es un JSON válido.",
      response.status || 500,
      error
    );
  }

  if (!response.ok) {
    throw new SiaServiceError(
      "El servicio FileGet de SIA respondió con un error.",
      response.status || 500,
      payload
    );
  }

  return parseSiaFileGetResponse(payload);
};

const parseSiaFileAddResponse = (payload: unknown): SiaFileAddResponse => {
  if (!isRecord(payload)) {
    throw new SiaServiceError(
      "La respuesta de SIA FileAdd tiene un formato inesperado.",
      500,
      payload
    );
  }

  const { Success, Code, Message, File } = payload;

  if (typeof Success !== "boolean") {
    throw new SiaServiceError(
      'El campo "Success" de la respuesta de SIA FileAdd es inválido.',
      500,
      payload
    );
  }

  if (
    typeof Code !== "string" ||
    typeof Message !== "string" ||
    typeof File !== "string" ||
    !Code.trim() ||
    !Message.trim() ||
    !File.trim()
  ) {
    throw new SiaServiceError(
      "La respuesta de SIA FileAdd no contiene los datos esperados.",
      500,
      payload
    );
  }

  return { Success, Code, Message, File };
};

export const FileAdd = async (
  request: SiaFileAddRequestBody,
  options: SiaServiceOptions = {}
): Promise<SiaFileAddResponse> => {
  const {
    sia_token,
    sia_dz,
    sia_consumer_key,
    user_identification,
    form_code_service,
    user_name,
    user_email,
    user_mobile,
    form_date,
    form_hora,
    ...overrides
  } = request;

  const trimmedToken = typeof sia_token === "string" ? sia_token.trim() : "";
  if (!trimmedToken) {
    throw new SiaServiceError("El token de autenticación para FileAdd es obligatorio.", 400);
  }

  const { fileAddUrl } = getSiaEndpoints(options.tenant);

  const nowIsoString = new Date().toISOString();
  const formattedStartDate = formatDateTimeForSia(nowIsoString);
  const formattedEndDate = formatDateTimeForSia(nowIsoString);

  const pickString = (value: string | undefined, fallback: string): string => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }

    return fallback;
  };

  const pickBoolean = (value: boolean | undefined, fallback: boolean): boolean =>
    typeof value === "boolean" ? value : fallback;

  const pickNumber = (value: number | undefined, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  const defaultDz = pickString(sia_dz, "");
  const defaultConsumerKey = pickString(sia_consumer_key, "");
  const defaultIdentification = pickString(user_identification, "");
  const defaultServiceCode = pickString(form_code_service, "");
  const defaultUserName = pickString(user_name, "");
  const defaultUserEmail = pickString(user_email, "");
  const defaultUserMobile = pickString(user_mobile, "");
  const defaultFormDate = pickString(form_date, "");
  const defaultFormHour = pickString(form_hora, "");

  if (!defaultDz || !defaultConsumerKey) {
    throw new SiaServiceError(
      "Los datos de configuración de SIA para FileAdd son obligatorios.",
      400,
    );
  }

  if (!defaultIdentification || !defaultServiceCode) {
    throw new SiaServiceError(
      "La identificación del usuario y el catálogo del servicio son obligatorios para FileAdd.",
      400,
    );
  }

  if (!defaultUserName || !defaultUserEmail || !defaultUserMobile) {
    throw new SiaServiceError(
      "Los datos de contacto del usuario para FileAdd son obligatorios.",
      400,
    );
  }

  if (!defaultFormDate || !defaultFormHour) {
    throw new SiaServiceError(
      "La fecha y hora del servicio para FileAdd son obligatorias.",
      400,
    );
  }

  const body: SiaFileAddPayload = {
    dz: pickString(overrides.dz, defaultDz),
    consumerKey: pickString(overrides.consumerKey, defaultConsumerKey),
    idCatalogCountry: pickString(overrides.idCatalogCountry, "CO"),
    contract: pickString(overrides.contract, "4430010"),
    policy: pickString(overrides.policy, defaultIdentification),
    vip: pickBoolean(overrides.vip, false),
    statusPolicy: pickString(overrides.statusPolicy, "VIGENTE"),
    startDatePolicy: pickString(overrides.startDatePolicy, formattedStartDate),
    endDatePolicy: pickString(overrides.endDatePolicy, formattedEndDate),
    idCatalogTypeAssistance: pickString(overrides.idCatalogTypeAssistance, "3"),
    idCatalogFile: pickString(overrides.idCatalogFile, "989"),
    idCatalogDiagnostic: pickString(overrides.idCatalogDiagnostic, "058"),
    idCatalogServices: pickString(overrides.idCatalogServices, defaultServiceCode),
    idCatalogClassification: pickString(overrides.idCatalogClassification, defaultServiceCode),
    idCatalogRequiredService: pickString(overrides.idCatalogRequiredService, defaultServiceCode),
    idCatalogSinisterCode: pickString(overrides.idCatalogSinisterCode, "000"),
    idCatalogServiceCode: pickString(overrides.idCatalogServiceCode, "000"),
    idCatalogProblem: pickString(overrides.idCatalogProblem, "173"),
    idCatalogSecondCall: pickString(overrides.idCatalogSecondCall, "11"),
    idCatalogTransfer: pickString(overrides.idCatalogTransfer, "L"),
    idCatalogAssignmentType: pickString(overrides.idCatalogAssignmentType, "16"),
    idCatalogServiceCondition: pickString(overrides.idCatalogServiceCondition, "13"),
    name: pickString(overrides.name, defaultUserName),
    lastname: pickString(overrides.lastname, defaultUserName),
    beneficiaryName: pickString(overrides.beneficiaryName, defaultUserName),
    beneficiaryLastname: pickString(overrides.beneficiaryLastname, defaultUserName),
    gender: pickString(overrides.gender, "M"),
    age: pickNumber(overrides.age, 30),
    email: pickString(overrides.email, defaultUserEmail),
    mobile: pickString(overrides.mobile, defaultUserMobile),
    latitudeOrigin: pickNumber(overrides.latitudeOrigin, 4.6874253),
    lengthOrigin: pickNumber(overrides.lengthOrigin, -74.0507687),
    addressOrigin: pickString(overrides.addressOrigin, "CL. 102 #17A-61"),
    idCityCallOrigin: pickString(overrides.idCityCallOrigin, "18"),
    cityCallOrigin: pickString(overrides.cityCallOrigin, "BOGOTA"),
    stateCallOrigin: pickString(overrides.stateCallOrigin, "BOGOTA"),
    latitudeDestiny: pickNumber(overrides.latitudeDestiny, 4.6874253),
    lengthDestiny: pickNumber(overrides.lengthDestiny, -74.0507687),
    addressDestiny: pickString(overrides.addressDestiny, "CL. 102 #17A-61"),
    idCityCallDestiny: pickString(overrides.idCityCallDestiny, "18"),
    stateCallDestiny: pickString(overrides.stateCallDestiny, "BOGOTA"),
    idStateCallDestiny: pickString(overrides.idStateCallDestiny, "01"),
    carPlates: pickString(overrides.carPlates, defaultIdentification),
    carBrand: pickString(overrides.carBrand, "NA"),
    carModel: pickString(overrides.carModel, "NA"),
    carYear: pickString(overrides.carYear, "9999"),
    carColor: pickString(overrides.carColor, "NA"),
    scheduleService: pickString(overrides.scheduleService, "true"),
    scheduleDate: pickString(overrides.scheduleDate, defaultFormDate),
    scheduleHour: pickString(overrides.scheduleHour, defaultFormHour),
    reasonCalled: pickString(overrides.reasonCalled, "reasonCalled"),
    comment: pickString(overrides.comment, "comment"),
  };

  try {
    console.log("[SIA] FileAdd request:", JSON.stringify(body));
  } catch (error) {
    console.log("[SIA] FileAdd request:", body);
  }

  let response: Response;
  try {
    response = await fetch(fileAddUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${trimmedToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new SiaServiceError("No se pudo conectar con el servicio FileAdd de SIA.", 502, error);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new SiaServiceError(
      "La respuesta de SIA FileAdd no es un JSON válido.",
      response.status || 500,
      error
    );
  }

  if (!response.ok) {
    try {
      console.error(
        `[SIA] FileAdd response error (${response.status}):`,
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error(`[SIA] FileAdd response error (${response.status}):`, payload);
    }
    throw new SiaServiceError(
      "El servicio FileAdd de SIA respondió con un error.",
      response.status || 500,
      payload
    );
  }

  return parseSiaFileAddResponse(payload);
};

export type { SiaFileGetResponseItem };

