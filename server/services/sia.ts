import type {
  SiaFileGetRequestBody,
  SiaFileGetResponseItem,
  SiaTokenResponse,
  SiaFileAddRequestBody,
  SiaFileAddResponse,
} from "@shared/api";

const SIA_TOKEN_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/token";
const SIA_FILE_ADD_URL = "https://sia8-uat-services.axa-assistance.com.mx/CMServices/FileAdd";

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

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

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
};

const getSiaConfig = (): SiaConfig => {
  const username = process.env.SIA_USERNAME?.trim();
  const password = process.env.SIA_PASSWORD?.trim();
  const dz = process.env.SIA_DZ?.toString().trim() || "";

  if (!username || !password || !dz) {
    throw new SiaServiceError(
      "Configuración de SIA incompleta. Verifica las variables SIA_USERNAME, SIA_PASSWORD y SIA_DZ.",
      500
    );
  }

  return { username, password, dz };
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

export const requestSiaToken = async (): Promise<SiaTokenResponse> => {
  const { username, password, dz } = getSiaConfig();

  let response: Response;
  try {
    response = await fetch(SIA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
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

export const FileGet = async ({
  sia_token,
  sia_dz,
  sia_consumer_key,
  user_identification,
}: SiaFileGetRequestBody): Promise<SiaFileGetResponseItem[]> => {
  let response: Response;
  try {
    response = await fetch("https://sia8-uat-services.axa-assistance.com.mx/CMServices/FileGet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sia_token}`,
      },
      body: JSON.stringify({
        dz: sia_dz,
        consumerKey: sia_consumer_key,
        operationType: "4",
        contract: "{'contrato':'4430010', 'IdCliente': '01544', 'IdPlan': '01586'}",
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

export const FileAdd = async ({
  sia_token,
  sia_dz,
  sia_consumer_key,
  user_identification,
  form_datetime,
  form_code_service,
  user_name,
  user_last_name,
  user_email,
  user_mobile,
  form_date,
  form_hora,
}: SiaFileAddRequestBody): Promise<SiaFileAddResponse> => {
  const formattedStartDate = formatDateTimeForSia(form_datetime);
  const formattedEndDate = formatDateTimeForSia(form_datetime);

  const body = {
    dz: sia_dz,
    consumerKey: sia_consumer_key,
    idCatalogCountry: "CO",
    contract: "4430010",
    policy: user_identification,
    vip: false,
    statusPolicy: "VIGENTE",
    startDatePolicy: formattedStartDate,
    endDatePolicy: formattedEndDate,
    idCatalogTypeAssistance: "3",
    idCatalogFile: "989",
    idCatalogDiagnostic: "058",
    idCatalogServices: form_code_service,
    idCatalogClassification: form_code_service,
    idCatalogRequiredService: form_code_service,
    idCatalogSinisterCode: "000",
    idCatalogServiceCode: "000",
    idCatalogProblem: "173",
    idCatalogSecondCall: "11",
    idCatalogTransfer: "L",
    idCatalogAssignmentType: "16",
    idCatalogServiceCondition: "13",
    name: user_name,
    lastname: user_last_name,
    beneficiaryName: user_name,
    beneficiaryLastname: user_last_name,
    gender: "M",
    age: 30,
    email: user_email,
    mobile: user_mobile,
    latitudeOrigin: 4.6874253,
    lengthOrigin: -74.0507687,
    addressOrigin: "CL. 102 #17A-61",
    idCityCallOrigin: "18",
    cityCallOrigin: "BOGOTA",
    stateCallOrigin: "BOGOTA",
    latitudeDestiny: 4.6874253,
    lengthDestiny: -74.0507687,
    addressDestiny: "CL. 102 #17A-61",
    idCityCallDestiny: "18",
    stateCallDestiny: "BOGOTA",
    idStateCallDestiny: "01",
    carPlates: user_identification,
    carBrand: "NA",
    carModel: "NA",
    carYear: "9999",
    carColor: "NA",
    scheduleService: "true",
    scheduleDate: form_date,
    scheduleHour: form_hora,
    reasonCalled: "TELEFONICA FINANCIERA reasonCalled",
    comment: "TELEFONICA FINANCIERA comment",
  } as const;

  let response: Response;
  try {
    response = await fetch(SIA_FILE_ADD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sia_token}`,
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
    throw new SiaServiceError(
      "El servicio FileAdd de SIA respondió con un error.",
      response.status || 500,
      payload
    );
  }

  return parseSiaFileAddResponse(payload);
};

export type { SiaFileGetResponseItem };

