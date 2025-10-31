import { ChangeEvent, FormEvent, useState } from "react";

import type {
  SiaProcessRequestBody,
  SiaProcessResponseBody,
  SiaProcessStepResult,
  TenantSummary,
} from "@shared/api";

const initialFormValues: SiaProcessRequestBody = {
  identification: "",
  name: "",
  phone: "",
  email: "",
  serviceDate: "",
  serviceTime: "",
  serviceCode: "",
};

const STEP_LABELS: Record<SiaProcessStepResult["name"], string> = {
  token: "GetTicket",
  fileGet: "FileGet",
  fileAdd: "FileAdd",
};

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTenantSummary = (value: unknown): TenantSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : null;
  const host = typeof value.host === "string" ? value.host : null;

  if (!id || !host) {
    return null;
  }

  return { id, host };
};

const normalizeSteps = (value: unknown): SiaProcessStepResult[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const name = item.name;
      if (name !== "token" && name !== "fileGet" && name !== "fileAdd") {
        return null;
      }

      return {
        name,
        request: item.request,
        response: item.response,
      } satisfies SiaProcessStepResult;
    })
    .filter((step): step is SiaProcessStepResult => step !== null);
};

const normalizeTemplateFilename = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const filename = value.filename;
  return typeof filename === "string" && filename.trim() ? filename : null;
};

const SiaServices = () => {
  const [formValues, setFormValues] = useState<SiaProcessRequestBody>(initialFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SiaProcessResponseBody | null>(null);
  const [submittedPayload, setSubmittedPayload] = useState<SiaProcessRequestBody | null>(null);

  const handleChange = (field: keyof SiaProcessRequestBody) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormValues((previous) => ({ ...previous, [field]: value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const payload: SiaProcessRequestBody = {
      identification: formValues.identification.trim(),
      name: formValues.name.trim(),
      phone: formValues.phone.trim(),
      email: formValues.email.trim(),
      serviceDate: formValues.serviceDate.trim(),
      serviceTime: formValues.serviceTime.trim(),
      serviceCode: formValues.serviceCode.trim(),
    };

    setSubmittedPayload(payload);

    try {
      const response = await fetch("/api/sia/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as unknown;
        const message =
          isRecord(errorPayload) && typeof errorPayload.error === "string"
            ? errorPayload.error
            : "Ocurrió un error al ejecutar el proceso de SIA.";

        const tenant = normalizeTenantSummary(
          isRecord(errorPayload) ? errorPayload.tenant : null,
        );
        const steps = normalizeSteps(isRecord(errorPayload) ? errorPayload.steps : null);
        const templateFilename = normalizeTemplateFilename(
          isRecord(errorPayload) ? errorPayload.template : null,
        );

        if (tenant || steps.length > 0 || templateFilename) {
          setResult({
            tenant: tenant ?? null,
            template: { filename: templateFilename },
            steps,
          });
        }

        setError(message);
        return;
      }

      const data = (await response.json()) as SiaProcessResponseBody;
      setResult(data);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Ocurrió un error inesperado al procesar la solicitud.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Proceso SIA8</h1>
            <p className="text-sm text-slate-600">
              Ingresa los datos requeridos para ejecutar el flujo de SIA8 (GetTicket, FileGet y
              FileAdd). Debajo verás el detalle de las solicitudes y respuestas enviadas.
            </p>
          </header>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Identificación</span>
                <input
                  type="text"
                  value={formValues.identification}
                  onChange={handleChange("identification")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="ABC123"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Nombre completo</span>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={handleChange("name")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Juan Pérez"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Teléfono</span>
                <input
                  type="tel"
                  value={formValues.phone}
                  onChange={handleChange("phone")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="3001234567"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Correo electrónico</span>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={handleChange("email")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Fecha</span>
                <input
                  type="date"
                  value={formValues.serviceDate}
                  onChange={handleChange("serviceDate")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Hora</span>
                <input
                  type="time"
                  value={formValues.serviceTime}
                  onChange={handleChange("serviceTime")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span>Código de servicio</span>
                <input
                  type="text"
                  value={formValues.serviceCode}
                  onChange={handleChange("serviceCode")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="FT"
                  required
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Ejecutando proceso..." : "Ejecutar proceso"}
              </button>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </form>
        </section>

        {submittedPayload ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Solicitud enviada</h2>
              <p className="text-sm text-slate-600">
                Este es el cuerpo enviado al endpoint interno <code>/api/sia/process</code>.
              </p>
            </header>
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
              {formatJson(submittedPayload)}
            </pre>
          </section>
        ) : null}

        {result ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="space-y-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Resultado del proceso</h2>
                <div className="flex flex-col gap-1 text-xs text-slate-600 md:text-right">
                  <span>
                    Tenant: {result.tenant ? `${result.tenant.id} (${result.tenant.host})` : "No disponible"}
                  </span>
                  <span>
                    Plantilla seleccionada: {result.template.filename ?? "No disponible"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                A continuación se muestran los request y response enviados a cada servicio de SIA.
              </p>
            </header>

            <div className="mt-6 space-y-6">
              {result.steps.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No hay información disponible de los pasos ejecutados.
                </p>
              ) : (
                result.steps.map((step, index) => (
                  <article
                    key={`${step.name}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <h3 className="text-sm font-semibold text-slate-800">
                      Paso {index + 1}: {STEP_LABELS[step.name] ?? step.name}
                    </h3>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                          Request
                        </span>
                        <pre className="max-h-60 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                          {formatJson(step.request)}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                          Response
                        </span>
                        <pre className="max-h-60 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                          {formatJson(step.response)}
                        </pre>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default SiaServices;
