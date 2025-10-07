import { ChangeEvent, FormEvent, useState } from "react";

import type {
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

const formatJson = (data: unknown) => JSON.stringify(data, null, 2);

const SiaServices = () => {
  const [tokenData, setTokenData] = useState<SiaTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);

  const [formValues, setFormValues] = useState<SiaFileGetRequestBody>(initialFormValues);
  const [fileGetData, setFileGetData] = useState<SiaFileGetResponse | null>(null);
  const [fileGetError, setFileGetError] = useState<string | null>(null);
  const [isSubmittingFileGet, setIsSubmittingFileGet] = useState(false);

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
      </div>
    </div>
  );
};

export default SiaServices;
