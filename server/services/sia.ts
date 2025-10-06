import { URLSearchParams } from "node:url";

interface SiaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  dz: string;
  consumerKey: string;
}

interface SiaSession {
  accessToken: string;
  dz: string;
  consumerKey: string;
  expiresAt: number;
}

export interface SiaFileGetRequest {
  plates: string;
  contract?: string;
  operationType?: string;
  serviceTypeCode?: string;
  validationType?: string;
}

export interface SiaFileAddRequest {
  policy: string;
  serviceCode: string;
  scheduleDate: string;
  scheduleHour: string;
  name: string;
  lastname: string;
  beneficiaryName: string;
  beneficiaryLastname: string;
  email: string;
  mobile: string;
  reasonCalled: string;
  comment: string;
  vip?: boolean;
  scheduleService?: boolean;
  startDatePolicy?: string;
  endDatePolicy?: string;
  idCatalogClassification?: string;
  idCatalogRequiredService?: string;
  idCatalogCountry?: string;
  contract?: string;
  statusPolicy?: string;
  idCatalogTypeAssistance?: string;
  idCatalogFile?: string;
  idCatalogDiagnostic?: string;
  idCatalogSinisterCode?: string;
  idCatalogServiceCode?: string;
  idCatalogProblem?: string;
  idCatalogSecondCall?: string;
  idCatalogTransfer?: string;
  idCatalogAssignmentType?: string;
  idCatalogServiceCondition?: string;
  latitudeOrigin?: number;
  lengthOrigin?: number;
  addressOrigin?: string;
  idCityCallOrigin?: string;
  cityCallOrigin?: string;
  stateCallOrigin?: string;
  latitudeDestiny?: number;
  lengthDestiny?: number;
  addressDestiny?: string;
  idCityCallDestiny?: string;
  stateCallDestiny?: string;
  idStateCallDestiny?: string;
  carBrand?: string;
  carModel?: string;
  carYear?: string;
  carColor?: string;
}

interface SiaConfig {
  baseUrl: string;
  username: string;
  password: string;
  dz: string;
  defaultContractLookup: string;
  defaultContractNumber: string;
  defaultCountry: string;
  defaultPolicyStatus: string;
  defaultTypeAssistance: string;
  defaultFileId: string;
  defaultDiagnosticId: string;
  defaultSinisterCode: string;
  defaultServiceCode: string;
  defaultProblemId: string;
  defaultSecondCallId: string;
  defaultTransferId: string;
  defaultAssignmentTypeId: string;
  defaultServiceConditionId: string;
  defaultLatitude: number;
  defaultLongitude: number;
  defaultAddress: string;
  defaultCityId: string;
  defaultCity: string;
  defaultState: string;
  defaultStateId: string;
  defaultCarBrand: string;
  defaultCarModel: string;
  defaultCarYear: string;
  defaultCarColor: string;
}

class SiaConfigurationError extends Error {}

class SiaRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "SiaRequestError";
  }
}

const tokenCache: { session?: SiaSession } = {};

const resolveNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const loadConfig = (): SiaConfig => {
  const username = process.env.SIA_USERNAME;
  const password = process.env.SIA_PASSWORD;

  if (!username || !password) {
    throw new SiaConfigurationError("SIA credentials are not configured");
  }

  return {
    baseUrl: process.env.SIA_BASE_URL?.replace(/\/$/, "") ?? "https://sia8-uat-services.axa-assistance.com.mx/CMServices",
    username,
    password,
    dz: process.env.SIA_DZ ?? "44",
    defaultContractLookup:
      process.env.SIA_CONTRACT_LOOKUP ?? "{'contrato':'4430010', 'IdCliente': '01544', 'IdPlan': '01586'}",
    defaultContractNumber: process.env.SIA_CONTRACT_NUMBER ?? "4430010",
    defaultCountry: process.env.SIA_ID_CATALOG_COUNTRY ?? "CO",
    defaultPolicyStatus: process.env.SIA_STATUS_POLICY ?? "VIGENTE",
    defaultTypeAssistance: process.env.SIA_ID_CATALOG_TYPE_ASSISTANCE ?? "3",
    defaultFileId: process.env.SIA_ID_CATALOG_FILE ?? "989",
    defaultDiagnosticId: process.env.SIA_ID_CATALOG_DIAGNOSTIC ?? "058",
    defaultSinisterCode: process.env.SIA_ID_CATALOG_SINISTER_CODE ?? "000",
    defaultServiceCode: process.env.SIA_ID_CATALOG_SERVICE_CODE ?? "000",
    defaultProblemId: process.env.SIA_ID_CATALOG_PROBLEM ?? "173",
    defaultSecondCallId: process.env.SIA_ID_CATALOG_SECOND_CALL ?? "11",
    defaultTransferId: process.env.SIA_ID_CATALOG_TRANSFER ?? "L",
    defaultAssignmentTypeId: process.env.SIA_ID_CATALOG_ASSIGNMENT_TYPE ?? "16",
    defaultServiceConditionId: process.env.SIA_ID_CATALOG_SERVICE_CONDITION ?? "13",
    defaultLatitude: resolveNumber(process.env.SIA_DEFAULT_LATITUDE, 4.6874253),
    defaultLongitude: resolveNumber(process.env.SIA_DEFAULT_LONGITUDE, -74.0507687),
    defaultAddress: process.env.SIA_DEFAULT_ADDRESS ?? "CL. 102 #17A-61",
    defaultCityId: process.env.SIA_DEFAULT_CITY_ID ?? "18",
    defaultCity: process.env.SIA_DEFAULT_CITY ?? "BOGOTA",
    defaultState: process.env.SIA_DEFAULT_STATE ?? "BOGOTA",
    defaultStateId: process.env.SIA_DEFAULT_STATE_ID ?? "01",
    defaultCarBrand: process.env.SIA_DEFAULT_CAR_BRAND ?? "NA",
    defaultCarModel: process.env.SIA_DEFAULT_CAR_MODEL ?? "NA",
    defaultCarYear: process.env.SIA_DEFAULT_CAR_YEAR ?? "9999",
    defaultCarColor: process.env.SIA_DEFAULT_CAR_COLOR ?? "NA",
  };
};

const formatDateTime = (input: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const day = pad(input.getDate());
  const month = pad(input.getMonth() + 1);
  const year = input.getFullYear();
  const hours = pad(input.getHours());
  const minutes = pad(input.getMinutes());
  const seconds = pad(input.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const requestToken = async (config: SiaConfig): Promise<SiaSession> => {
  const form = new URLSearchParams();
  form.set("grant_type", "password");
  form.set("username", config.username);
  form.set("password", config.password);
  form.set("DZ", config.dz);

  const response = await fetch(`${config.baseUrl}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
    signal: AbortSignal.timeout(1000 * 30),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch (error) {
      errorBody = await response.text();
    }
    throw new SiaRequestError(`Failed to obtain SIA token (${response.status})`, response.status, errorBody);
  }

  const payload = (await response.json()) as SiaTokenResponse;

  if (!payload.access_token || !payload.dz || !payload.consumerKey) {
    throw new SiaRequestError("SIA token response is missing required fields", response.status, payload);
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 60 * 15;

  return {
    accessToken: payload.access_token,
    dz: payload.dz,
    consumerKey: payload.consumerKey,
    expiresAt: Date.now() + Math.max(expiresIn - 30, 30) * 1000,
  };
};

const getSession = async () => {
  const config = loadConfig();
  if (tokenCache.session && tokenCache.session.expiresAt > Date.now()) {
    return { session: tokenCache.session, config };
  }

  const session = await requestToken(config);
  tokenCache.session = session;
  return { session, config };
};

export const getSiaFiles = async (request: SiaFileGetRequest) => {
  const { session, config } = await getSession();

  const body = {
    dz: session.dz,
    consumerKey: session.consumerKey,
    operationType: request.operationType ?? "4",
    contract: request.contract ?? config.defaultContractLookup,
    serviceTypeCode: request.serviceTypeCode ?? "",
    Plates: request.plates,
    validationType: request.validationType ?? "1",
  };

  const response = await fetch(`${config.baseUrl}/FileGet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(1000 * 30),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch (error) {
      errorBody = await response.text();
    }
    throw new SiaRequestError(`Failed to fetch SIA file information (${response.status})`, response.status, errorBody);
  }

  return response.json();
};

export const addSiaFile = async (request: SiaFileAddRequest) => {
  const { session, config } = await getSession();
  const now = new Date();
  const defaultDateTime = formatDateTime(now);

  const payload = {
    dz: session.dz,
    consumerKey: session.consumerKey,
    idCatalogCountry: request.idCatalogCountry ?? config.defaultCountry,
    contract: request.contract ?? config.defaultContractNumber,
    policy: request.policy,
    vip: request.vip ?? false,
    statusPolicy: request.statusPolicy ?? config.defaultPolicyStatus,
    startDatePolicy: request.startDatePolicy ?? defaultDateTime,
    endDatePolicy: request.endDatePolicy ?? defaultDateTime,
    idCatalogTypeAssistance: request.idCatalogTypeAssistance ?? config.defaultTypeAssistance,
    idCatalogFile: request.idCatalogFile ?? config.defaultFileId,
    idCatalogDiagnostic: request.idCatalogDiagnostic ?? config.defaultDiagnosticId,
    idCatalogServices: request.serviceCode,
    idCatalogClassification: request.idCatalogClassification ?? request.serviceCode,
    idCatalogRequiredService: request.idCatalogRequiredService ?? request.serviceCode,
    idCatalogSinisterCode: request.idCatalogSinisterCode ?? config.defaultSinisterCode,
    idCatalogServiceCode: request.idCatalogServiceCode ?? config.defaultServiceCode,
    idCatalogProblem: request.idCatalogProblem ?? config.defaultProblemId,
    idCatalogSecondCall: request.idCatalogSecondCall ?? config.defaultSecondCallId,
    idCatalogTransfer: request.idCatalogTransfer ?? config.defaultTransferId,
    idCatalogAssignmentType: request.idCatalogAssignmentType ?? config.defaultAssignmentTypeId,
    idCatalogServiceCondition: request.idCatalogServiceCondition ?? config.defaultServiceConditionId,
    name: request.name,
    lastname: request.lastname,
    beneficiaryName: request.beneficiaryName,
    beneficiaryLastname: request.beneficiaryLastname,
    gender: "M",
    age: 30,
    email: request.email,
    mobile: request.mobile,
    latitudeOrigin: request.latitudeOrigin ?? config.defaultLatitude,
    lengthOrigin: request.lengthOrigin ?? config.defaultLongitude,
    addressOrigin: request.addressOrigin ?? config.defaultAddress,
    idCityCallOrigin: request.idCityCallOrigin ?? config.defaultCityId,
    cityCallOrigin: request.cityCallOrigin ?? config.defaultCity,
    stateCallOrigin: request.stateCallOrigin ?? config.defaultState,
    latitudeDestiny: request.latitudeDestiny ?? config.defaultLatitude,
    lengthDestiny: request.lengthDestiny ?? config.defaultLongitude,
    addressDestiny: request.addressDestiny ?? config.defaultAddress,
    idCityCallDestiny: request.idCityCallDestiny ?? config.defaultCityId,
    stateCallDestiny: request.stateCallDestiny ?? config.defaultState,
    idStateCallDestiny: request.idStateCallDestiny ?? config.defaultStateId,
    carPlates: request.policy,
    carBrand: request.carBrand ?? config.defaultCarBrand,
    carModel: request.carModel ?? config.defaultCarModel,
    carYear: request.carYear ?? config.defaultCarYear,
    carColor: request.carColor ?? config.defaultCarColor,
    scheduleService: (request.scheduleService ?? true).toString(),
    scheduleDate: request.scheduleDate,
    scheduleHour: request.scheduleHour,
    reasonCalled: request.reasonCalled,
    comment: request.comment,
  };

  const response = await fetch(`${config.baseUrl}/FileAdd`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(1000 * 30),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch (error) {
      errorBody = await response.text();
    }
    throw new SiaRequestError(`Failed to create SIA file (${response.status})`, response.status, errorBody);
  }

  return response.json();
};

export { SiaConfigurationError, SiaRequestError };
