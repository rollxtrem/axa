import { ChangeEvent, FormEvent, useState } from "react";

import type {
  SiaFileAddRequestBody,
  SiaFileAddResponse,
  SiaFileGetRequestBody,
  SiaFileGetResponse,
  SiaTokenResponse,
} from "@shared/api";

const initialFormValues: SiaFileGetRequestBody = {
  sia_token: "",
  sia_dz: "",
  sia_consumer_key: "",
  user_identification: "",
};

const initialFileAddValues: SiaFileAddRequestBody = {
  //sia_token: "",
  //sia_dz: "",
  //sia_consumer_key: "",
  //user_identification: "",
  //form_code_service: "",
  //user_name: "",
  //user_email: "",
  //user_mobile: "",
  //form_date: "",
  //form_hora: "",
  dz : "{{sia_dz}}",
  consumerKey : "{{sia_consumer_key}}",
  idCatalogCountry : "CO",
  contract : "4430010",
  policy : "10999123133",
  vip : false,
  statusPolicy : "VIGENTE",
  startDatePolicy : "19/07/2025 12:26:51",
  endDatePolicy : "19/07/2026 12:26:51",

  idCatalogTypeAssistance : "3",
  idCatalogFile : "989",
  idCatalogDiagnostic : "058", 
  idCatalogServices : "TF",

  idCatalogClassification : "TF",
  idCatalogRequiredService : "TF",
  idCatalogSinisterCode : "000",
  idCatalogServiceCode : "000",
  idCatalogProblem : "173",
  idCatalogSecondCall : "11",
  idCatalogTransfer : "L",
  idCatalogAssignmentType : "16",
  idCatalogServiceCondition : "13", 
      
  name : "TELEFONICA ",
  lastname : "CMService",
  beneficiaryName : "Accidente",
  beneficiaryLastname : "Local",

  gender : "M",
  age : 30,
  email : "N@N.COM",
  mobile : "3202555980",
  latitudeOrigin : 4.687425300000000,
  lengthOrigin : -74.050768700000006,
  addressOrigin : "CL. 102 # 17A-61",
  idCityCallOrigin : "18",
  cityCallOrigin : "BOGOTA",
  stateCallOrigin : "BOGOTA",
  latitudeDestiny : 4.687425300000000,
  lengthDestiny : -74.050768700000006,
  addressDestiny : "CL. 102 # 17A-61",
  idCityCallDestiny : "18",
  stateCallDestiny : "BOGOTA",
  idStateCallDestiny : "01",

  carPlates : "10999123133",
      
  carBrand : "NA",
  carModel : "NA",
  carYear : "9999",
  carColor : "NA",
  scheduleService : "true",
  scheduleDate : "2025-09-18",
  scheduleHour : "18:00",
  reasonCalled : "TELEFONICA FINANCIERA reasonCalled",
  comment : "TELEFONICA FINANCIERA comment"
  
};

const formatJson = (data: unknown) => JSON.stringify(data, null, 2);

const SiaServices = () => {
  const [tokenData, setTokenData] = useState<SiaTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);

  const [formValues, setFormValues] = useState<SiaFileGetRequestBody>(initialFormValues);
  const [fileGetData, setFileGetData] = useState<SiaFileGetResponse | null>(null);
  const [fileGetError, setFileGetError] = useState<string | null>(null);
  const [isSubmittingFileGet, setIsSubmittingFileGet] = useState(false);

  const [fileAddValues, setFileAddValues] = useState<SiaFileAddRequestBody>(initialFileAddValues);
  const [fileAddData, setFileAddData] = useState<SiaFileAddResponse | null>(null);
  const [fileAddError, setFileAddError] = useState<string | null>(null);
  const [isSubmittingFileAdd, setIsSubmittingFileAdd] = useState(false);

  const handleRequestToken = async () => {
    setIsRequestingToken(true);
    setTokenError(null);

    try {
      const response = await fetch("/api/sia/token", { method: "POST" });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = errorPayload?.error ?? "No se pudo obtener el token de SIA.";
        throw new Error(message);
      }

      const data: SiaTokenResponse = await response.json();
      setTokenData(data);
      setFormValues((previous) => ({
        ...previous,
        sia_token: data.access_token ?? previous.sia_token,
        sia_dz: data.dz ?? previous.sia_dz,
        sia_consumer_key: data.consumerKey ?? previous.sia_consumer_key,
      }));
      setFileAddValues((previous) => ({
        ...previous,
        sia_token: data.access_token ?? previous.sia_token,
        sia_dz: data.dz ?? previous.sia_dz,
        sia_consumer_key: data.consumerKey ?? previous.sia_consumer_key,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ocurrió un error al obtener el token de SIA.";
      setTokenError(message);
      setTokenData(null);
    } finally {
      setIsRequestingToken(false);
    }
  };

  const handleChange = (field: keyof SiaFileGetRequestBody) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormValues((previous) => ({ ...previous, [field]: value }));
    };

  const handleSubmitFileGet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingFileGet(true);
    setFileGetError(null);
    setFileGetData(null);

    try {
      const payload: SiaFileGetRequestBody = {
        sia_token: formValues.sia_token.trim(),
        sia_dz: formValues.sia_dz.trim(),
        sia_consumer_key: formValues.sia_consumer_key.trim(),
        user_identification: formValues.user_identification.trim(),
      };

      const response = await fetch("/api/sia/file-get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = errorPayload?.error ?? "No se pudo consultar FileGet.";
        throw new Error(message);
      }

      const data: SiaFileGetResponse = await response.json();
      setFileGetData(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al consultar FileGet de SIA.";
      setFileGetError(message);
      setFileGetData(null);
    } finally {
      setIsSubmittingFileGet(false);
    }
  };

  const handleFileAddChange = (field: keyof SiaFileAddRequestBody) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFileAddValues((previous) => ({ ...previous, [field]: value }));
    };

    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // +1 porque los meses van de 0 a 11
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const now_datetime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;


  const handleSubmitFileAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingFileAdd(true);
    setFileAddError(null);
    setFileAddData(null);

    try {
      const payload: SiaFileAddRequestBody = {
        dz :fileAddValues.dz ,
        consumerKey :fileAddValues.consumerKey ,
        idCatalogCountry :fileAddValues.idCatalogCountry ,
        contract :fileAddValues.contract ,
        policy :fileAddValues.policy ,
        vip :fileAddValues.vip ,
        statusPolicy :fileAddValues.statusPolicy ,
        startDatePolicy :fileAddValues.startDatePolicy ,
        endDatePolicy :fileAddValues.endDatePolicy ,
        idCatalogTypeAssistance :fileAddValues.idCatalogTypeAssistance ,
        idCatalogFile :fileAddValues.idCatalogFile ,
        idCatalogDiagnostic :fileAddValues.idCatalogDiagnostic ,
        idCatalogServices :fileAddValues.idCatalogServices ,
        idCatalogClassification :fileAddValues.idCatalogClassification ,
        idCatalogRequiredService :fileAddValues.idCatalogRequiredService ,
        idCatalogSinisterCode :fileAddValues.idCatalogSinisterCode ,
        idCatalogServiceCode :fileAddValues.idCatalogServiceCode ,
        idCatalogProblem :fileAddValues.idCatalogProblem ,
        idCatalogSecondCall :fileAddValues.idCatalogSecondCall ,
        idCatalogTransfer :fileAddValues.idCatalogTransfer ,
        idCatalogAssignmentType :fileAddValues.idCatalogAssignmentType ,
        idCatalogServiceCondition :fileAddValues.idCatalogServiceCondition ,
        name :fileAddValues.name ,
        lastname :fileAddValues.lastname ,
        beneficiaryName :fileAddValues.beneficiaryName ,
        beneficiaryLastname :fileAddValues.beneficiaryLastname ,
        gender :fileAddValues.gender ,
        age :fileAddValues.age ,
        email :fileAddValues.email ,
        mobile :fileAddValues.mobile ,
        latitudeOrigin :fileAddValues.latitudeOrigin ,
        lengthOrigin :fileAddValues.lengthOrigin ,
        addressOrigin :fileAddValues.addressOrigin ,
        idCityCallOrigin :fileAddValues.idCityCallOrigin ,
        cityCallOrigin :fileAddValues.cityCallOrigin ,
        stateCallOrigin :fileAddValues.stateCallOrigin ,
        latitudeDestiny :fileAddValues.latitudeDestiny ,
        lengthDestiny :fileAddValues.lengthDestiny ,
        addressDestiny :fileAddValues.addressDestiny ,
        idCityCallDestiny :fileAddValues.idCityCallDestiny ,
        stateCallDestiny :fileAddValues.stateCallDestiny ,
        idStateCallDestiny :fileAddValues.idStateCallDestiny ,
        carPlates :fileAddValues.carPlates ,
        carBrand :fileAddValues.carBrand ,
        carModel :fileAddValues.carModel ,
        carYear :fileAddValues.carYear ,
        carColor :fileAddValues.carColor ,
        scheduleService :fileAddValues.scheduleService ,
        scheduleDate :fileAddValues.scheduleDate ,
        scheduleHour :fileAddValues.scheduleHour ,
        reasonCalled :fileAddValues.reasonCalled ,
        comment :fileAddValues.comment 
      };

      const response = await fetch("/api/sia/file-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = errorPayload?.error ?? "No se pudo invocar FileAdd.";
        throw new Error(message);
      }

      const data: SiaFileAddResponse = await response.json();
      setFileAddData(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ocurrió un error al invocar FileAdd de SIA.";
      setFileAddError(message);
      setFileAddData(null);
    } finally {
      setIsSubmittingFileAdd(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Servicios SIA</h1>
            <p className="text-sm text-slate-600">
              Obtén un token de SIA y realiza una consulta al servicio FileGet utilizando los datos
              proporcionados.
            </p>
          </header>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRequestToken}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
              disabled={isRequestingToken}
            >
              {isRequestingToken ? "Solicitando token..." : "Obtener token de SIA"}
            </button>
            {tokenError ? (
              <p className="text-sm text-red-600">{tokenError}</p>
            ) : null}
            {tokenData ? (
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
                {formatJson(tokenData)}
              </pre>
            ) : null}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Consulta FileGet</h2>
            <p className="text-sm text-slate-600">
              Completa el formulario con los datos requeridos y envíalo para consultar la información
              disponible en SIA.
            </p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmitFileGet}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>sia_token</span>
                <input
                  type="text"
                  value={formValues.sia_token}
                  onChange={handleChange("sia_token")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>sia_dz</span>
                <input
                  type="text"
                  value={formValues.sia_dz}
                  onChange={handleChange("sia_dz")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>sia_consumer_key</span>
                <input
                  type="text"
                  value={formValues.sia_consumer_key}
                  onChange={handleChange("sia_consumer_key")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>user_identification</span>
                <input
                  type="text"
                  value={formValues.user_identification}
                  onChange={handleChange("user_identification")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
                disabled={isSubmittingFileGet}
              >
                {isSubmittingFileGet ? "Consultando..." : "Consultar FileGet"}
              </button>
              {fileGetError ? (
                <p className="text-sm text-red-600">{fileGetError}</p>
              ) : null}
            </div>
          </form>

          {fileGetData !== null ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">Respuesta</h3>
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
                {formatJson(fileGetData)}
              </pre>
            </div>
          ) : null}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Registrar servicio con FileAdd</h2>
            <p className="text-sm text-slate-600">
              Ingresa los datos del servicio a registrar y envía el formulario para llamar al
              servicio FileAdd de SIA.
            </p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmitFileAdd}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>sia_token</span>
                <input
                  type="text"
                  value={fileAddValues.sia_token}
                  onChange={handleFileAddChange("sia_token")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>sia_dz</span>
                <input
                  type="text"
                  value={fileAddValues.sia_dz}
                  onChange={handleFileAddChange("sia_dz")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>sia_consumer_key</span>
                <input
                  type="text"
                  value={fileAddValues.sia_consumer_key}
                  onChange={handleFileAddChange("sia_consumer_key")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>user_identification</span>
                <input
                  type="text"
                  value={fileAddValues.user_identification}
                  onChange={handleFileAddChange("user_identification")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>form_code_service</span>
                <input
                  type="text"
                  value={fileAddValues.form_code_service}
                  onChange={handleFileAddChange("form_code_service")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>user_name</span>
                <input
                  type="text"
                  value={fileAddValues.user_name}
                  onChange={handleFileAddChange("user_name")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>user_email</span>
                <input
                  type="email"
                  value={fileAddValues.user_email}
                  onChange={handleFileAddChange("user_email")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>user_mobile</span>
                <input
                  type="tel"
                  value={fileAddValues.user_mobile}
                  onChange={handleFileAddChange("user_mobile")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>form_date</span>
                <input
                  type="date"
                  value={fileAddValues.form_date}
                  onChange={handleFileAddChange("form_date")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>form_hora</span>
                <input
                  type="time"
                  value={fileAddValues.form_hora}
                  onChange={handleFileAddChange("form_hora")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                disabled={isSubmittingFileAdd}
              >
                {isSubmittingFileAdd ? "Registrando servicio..." : "Invocar FileAdd"}
              </button>
              {fileAddError ? <p className="text-sm text-red-600">{fileAddError}</p> : null}
            </div>
          </form>

          {fileAddData ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">Respuesta</h3>
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
                {formatJson(fileAddData)}
              </pre>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default SiaServices;
