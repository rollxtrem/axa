import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { builderPublicKey, encodedBuilderPublicKey } from "@/lib/builder";
import { apiFetch } from "@/lib/api-client";
import { encryptJsonWithPublicKey, importRsaPublicKey } from "@/lib/crypto";
import type {
  FormacionFormData,
  FormacionPublicKeyResponse,
  FormacionSubmissionResponse,
} from "@shared/api";

type FormacionFormState = Pick<FormacionFormData, "fullName" | "email">;

type AlertMessage = {
  type: "success" | "error";
  message: string;
};

export default function Formacion() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormacionFormState>({
    fullName: "",
    email: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertMessage | null>(null);

  const openModal = (course: string) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
    setFormError(null);
    if (keyError) {
      setKeyError(null);
      setPublicKey(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCourse(null);
    setFormData({ fullName: "", email: "" });
    setFormError(null);
    setFormSubmitting(false);
    setPublicKey(null);
    setLoadingKey(false);
    setKeyError(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name as keyof FormacionFormState]: value,
    }));
  };

  const handleRetryLoadKey = () => {
    setKeyError(null);
    setPublicKey(null);
  };

  useEffect(() => {
    if (!isModalOpen || loadingKey || publicKey || keyError) {
      return;
    }

    let cancelled = false;

    const fetchPublicKey = async () => {
      setLoadingKey(true);
      try {
        const response = await apiFetch("/api/formacion/public-key");
        if (!response.ok) {
          throw new Error("No se pudo obtener la llave pública.");
        }
        const data = (await response.json()) as FormacionPublicKeyResponse;
        if (cancelled) {
          return;
        }
        const key = await importRsaPublicKey(data.publicKey);
        if (cancelled) {
          return;
        }
        setPublicKey(key);
      } catch (error) {
        console.error("Failed to load formación public key", error);
        if (!cancelled) {
          setKeyError("No pudimos preparar el formulario. Intenta nuevamente.");
        }
      } finally {
        if (!cancelled) {
          setLoadingKey(false);
        }
      }
    };

    void fetchPublicKey();

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, loadingKey, publicKey, keyError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCourse) {
      setFormError("Selecciona un curso antes de enviar tu inscripción.");
      return;
    }

    if (!publicKey) {
      setFormError("No pudimos preparar la inscripción. Intenta nuevamente.");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload: FormacionFormData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        course: selectedCourse,
      };

      const encryptedPayload = await encryptJsonWithPublicKey(publicKey, payload);

      const response = await apiFetch("/api/formacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(encryptedPayload),
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as FormacionSubmissionResponse | { error?: string } | null;

      if (!response.ok) {
        const message =
          responseBody && typeof responseBody === "object" && "error" in responseBody && responseBody.error
            ? responseBody.error
            : "No se pudo completar la inscripción. Intenta nuevamente.";
        throw new Error(message);
      }

      if (!responseBody || (responseBody as FormacionSubmissionResponse).status !== "ok") {
        throw new Error("No recibimos confirmación de la inscripción. Intenta nuevamente.");
      }

      setAlertMessage({
        type: "success",
        message: "Tu inscripción fue enviada correctamente. Pronto nos pondremos en contacto contigo.",
      });
      closeModal();
    } catch (error) {
      console.error("Error submitting formación form", error);
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al enviar tu inscripción. Intenta nuevamente.";
      setFormError(message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const isSubmitDisabled = formSubmitting || loadingKey || !!keyError;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-[#0C0E45] rounded-b-[20px] md:rounded-b-[50px] h-[300px] md:h-[425px]">
        <div className="relative w-full max-w-[1440px] mx-auto px-4 md:px-8">
          {/* Hero Image */}
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/3f328910e63e2b585ed7f72f5f558e99086786ef?width=2302"
            alt="Formación y desarrollo"
            className="absolute left-[-100px] md:left-[-214px] top-[0px] w-[600px] md:w-[1012px] h-[250px] md:h-[466px] object-cover"
          />

          {/* Blue angled overlay */}
          <svg
            className="absolute left-[200px] md:left-[436px] top-[-7px] w-[600px] md:w-[973px] h-[280px] md:h-[466px] fill-[#0c0e45]"
            viewBox="0 0 957 435"
            preserveAspectRatio="none"
          >
            <path
              d="M1295 -10L948.145 449H0L348.048 -10H1295Z"
              fill="#0C0E45"
              style={{
                margin: "-1px -1px -1px 5px",
                padding: "40px 0 0 34px",
              }}
            />
          </svg>

          {/* Hero Content */}
          <div className="absolute right-4 md:left-[759px] top-[30px] md:top-[51px] w-full max-w-[350px] md:w-[470px] text-center md:text-right text-white px-4 md:px-0">
            <div className="text-[24px] md:text-[48px] leading-[28px] md:leading-[50px] font-['Publico_Text_Web'] w-full md:w-[471px] md:ml-auto">
              <h4 className="inline">
                <div>
                  <p>
                    Aprende, crece y alcanza nuevas metas
                  </p>
                </div>
                <br />
              </h4>
            </div>
            <p className="text-[14px] md:text-[20px] leading-[20px] md:leading-[32px] tracking-[0.25px] w-full md:w-[480px] md:ml-auto font-['Source_Sans_Pro'] mt-2 md:mt-0">
              Desarrolla nuevas habilidades con nuestros cursos especializados.
            </p>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="w-full max-w-[990px] mx-auto py-8 md:py-14 px-4 md:px-8">
        <div className="max-w-[1160px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <div className="max-w-[765px] mx-auto mb-4">
              <h2 className="text-[#0e0e0e] font-['Publico_Text_Web'] text-[34px] leading-10 tracking-[0.25px] mb-4">
                Cursos Disponibles
              </h2>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] leading-8 tracking-[0.25px]">
                Inscríbete en nuestros cursos y desarrolla nuevas habilidades
                para tu crecimiento personal y profesional
              </p>
            </div>
            <div className="w-[177px] h-[2px] bg-[#6574f8] mx-auto"></div>
          </div>

          {alertMessage && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-['Source_Sans_Pro'] ${
                alertMessage.type === "success"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-[#FF1721] bg-red-50 text-[#a1131a]"
              }`}
            >
              {alertMessage.message}
            </div>
          )}

          {/* Courses Grid - Only 3 courses */}
          <div className="flex flex-col md:flex-row items-center gap-5 justify-center">
            {/* Educación Digital Card */}
            <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden">
              <div className="w-full h-[110px] relative">
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/15162605f6d6c658fb4d45b2ec649d9c0ff11619?width=746"
                  alt="Educación Digital"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-3 mb-4">
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 61 60"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_4590_1916)">
                      <path
                        d="M9.3125 8H51.6875C52.5462 8 53.2964 8.31597 53.959 8.97852C54.6215 9.64106 54.9375 10.3913 54.9375 11.25V42.5C54.9375 43.3587 54.6215 44.1089 53.959 44.7715C53.2964 45.434 52.5462 45.75 51.6875 45.75V46.75H59.9658C59.869 47.4416 59.5649 48.0372 59.0469 48.5518C58.4056 49.1883 57.6487 49.5 56.75 49.5H4.0625C3.22527 49.5 2.51631 49.1926 1.90918 48.5537C1.41715 48.0358 1.12901 47.4392 1.03613 46.75H9.3125V45.75C8.45378 45.75 7.70356 45.434 7.04102 44.7715C6.37847 44.1089 6.0625 43.3587 6.0625 42.5V11.25C6.0625 10.3913 6.37847 9.64106 7.04102 8.97852C7.70356 8.31597 8.45378 8 9.3125 8ZM30.5 43.875C29.7721 43.875 29.1377 44.1265 28.6318 44.6318C28.1265 45.1377 27.875 45.7721 27.875 46.5C27.875 47.2279 28.1265 47.8623 28.6318 48.3682C29.1377 48.8735 29.7721 49.125 30.5 49.125C31.2279 49.125 31.8623 48.8735 32.3682 48.3682C32.8735 47.8623 33.125 47.2279 33.125 46.5C33.125 45.8632 32.9325 45.2983 32.5459 44.8281L32.3682 44.6318L32.1719 44.4541C31.7017 44.0675 31.1368 43.875 30.5 43.875ZM8.8125 43H52.1875V10.75H8.8125V43Z"
                        fill="#FF1721"
                        stroke="white"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_4590_1916">
                        <rect
                          width="60"
                          height="60"
                          fill="white"
                          transform="translate(0.5)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] font-semibold leading-8">
                      Educación Digital
                    </h4>
                    <span className="bg-[#6574f8] text-white text-[10px] px-3 py-1 rounded-[10px]">
                      8 semanas
                    </span>
                  </div>
                  <span className="border border-[#6574f8] text-[#0e0e0e] text-[10px] px-3 py-1 rounded-[10px] self-start">
                    Básico a intermedio
                  </span>
                </div>
                <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                  Aprende a tu ritmo con herramientas y cursos online que
                  potencian tus habilidades digitales.
                </p>
                <button
                  onClick={() => openModal("Educación Digital")}
                  className="text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
                >
                  INSCRIBIRME AL CURSO
                </button>
              </div>
            </div>

            {/* Educación Financiera Card */}
            <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden">
              <div className="w-full h-[110px] relative">
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/6cdf72c2d1802d55cec62224a4d7d86931228283?width=746"
                  alt="Educación Financiera"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-3 mb-4">
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 61 60"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.75 8H49.25C50.1476 8 50.9034 8.31394 51.5449 8.95508C52.1861 9.59663 52.5 10.3524 52.5 11.25V18.085C52.0276 17.945 51.527 17.875 51 17.875H49.75V10.75H11.25V49.25H49.75V42.1875H51C51.5271 42.1875 52.0275 42.1166 52.5 41.9766V48.75C52.5 49.6476 52.186 50.4038 51.5449 51.0449C50.9034 51.6863 50.1474 52 49.25 52H11.75C10.8525 52 10.0962 51.6864 9.45508 51.0449C8.81358 50.4038 8.5 49.6475 8.5 48.75V11.25C8.5 10.3526 8.8137 9.5966 9.45508 8.95508C10.0962 8.31396 10.8524 8 11.75 8ZM34.125 18.875H48.75V20.125H53.5V19.708C53.6424 19.8182 53.781 19.939 53.915 20.0713C54.7271 20.8726 55.125 21.8189 55.125 22.9375V37.125C55.125 38.2436 54.7271 39.1899 53.915 39.9912C53.7812 40.1233 53.6422 40.2435 53.5 40.3535V39.9375H48.75V41.1875H34.125C32.9848 41.1875 32.0223 40.7923 31.21 39.9912C30.3979 39.1899 30 38.2436 30 37.125V22.9375C30 21.8189 30.3979 20.8726 31.21 20.0713C32.0223 19.2702 32.9848 18.875 34.125 18.875ZM52.4561 40.9375C52.0061 41.1039 51.5219 41.1875 51 41.1875H49.75V40.9375H52.4561ZM32.75 38.4375H52.375V21.625H32.75V38.4375ZM41.25 26.5C42.2013 26.5 43.0147 26.8309 43.7148 27.5078C44.4098 28.1802 44.75 28.9804 44.75 29.9375C44.75 30.9385 44.4137 31.7715 43.7363 32.4658C43.0607 33.1583 42.2465 33.5 41.2646 33.5C40.2825 33.4999 39.4632 33.158 38.7773 32.4639C38.0906 31.7691 37.75 30.9366 37.75 29.9375C37.75 28.9804 38.0902 28.1802 38.7852 27.5078C39.4853 26.8309 40.2987 26.5 41.25 26.5ZM51 18.875C51.5219 18.875 52.0061 18.9586 52.4561 19.125H49.75V18.875H51Z"
                      fill="#FF1721"
                      stroke="white"
                    />
                  </svg>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] font-semibold leading-8">
                      Educación Financiera
                    </h4>
                    <span className="bg-[#6574f8] text-white text-[10px] px-3 py-1 rounded-[10px]">
                      8 semanas
                    </span>
                  </div>
                  <span className="border border-[#6574f8] text-[#0e0e0e] text-[10px] px-3 py-1 rounded-[10px] self-start">
                    Básico a intermedio
                  </span>
                </div>
                <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                  Aprende a manejar tus finanzas personales, inversiones y
                  planificación financiera.
                </p>
                <button
                  onClick={() => openModal("Educación Financiera")}
                  className="text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
                >
                  INSCRIBIRME AL CURSO
                </button>
              </div>
            </div>

            {/* Marketing Digital Card */}
            <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden">
              <div className="w-full h-[110px] relative">
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/6d3d6983a2e3351f0bceecdb07b6b3572805c452?width=746"
                  alt="Marketing Digital"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-3 mb-4">
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 61 60"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M31.6035 31.1035C31.7195 30.9876 31.851 30.9387 32.0723 30.9863L52.4814 37.1035V37.1045L52.4932 37.1074C52.6482 37.1497 52.7229 37.2077 52.7617 37.2549C52.7992 37.3006 52.8381 37.3775 52.8447 37.5225C52.8512 37.664 52.82 37.7424 52.7861 37.791C52.7504 37.8421 52.6769 37.9081 52.5195 37.9658L45.9053 40.1504L45.1348 40.4043L53.959 49.2285C54.5831 49.8527 54.875 50.5414 54.875 51.3125C54.875 52.0836 54.5831 52.7723 53.959 53.3965C53.3373 54.0182 52.6389 54.3125 51.8438 54.3125C51.0486 54.3125 50.3502 54.0182 49.7285 53.3965L49.7275 53.3955L41.4775 45.208L40.9033 44.6387L40.6504 45.4053L38.4678 52.0166C38.4098 52.1761 38.3424 52.2501 38.291 52.2861C38.2424 52.32 38.164 52.3512 38.0225 52.3447C37.8775 52.3381 37.8006 52.2992 37.7549 52.2617C37.7196 52.2327 37.6779 52.1837 37.6416 52.0957L37.6035 51.9814L31.4863 31.5723C31.4387 31.351 31.4876 31.2195 31.6035 31.1035ZM30.5 5.5C37.1629 5.5 42.8396 7.79419 47.5576 12.3896C52.274 16.9836 54.7303 22.5969 54.9365 29.2568C54.9351 29.6298 54.816 29.9145 54.584 30.1465C54.3704 30.3601 54.1111 30.4948 53.7881 30.5469L53.6455 30.5645C53.2379 30.595 52.9219 30.4812 52.6562 30.2305C52.3774 29.9671 52.2188 29.6383 52.1855 29.2148H52.1865C51.7619 23.2704 49.5698 18.2804 45.6055 14.2734C41.6284 10.2536 36.5798 8.25 30.5 8.25C24.4528 8.25 19.3042 10.3637 15.084 14.584C10.8637 18.8042 8.75 23.9528 8.75 30C8.75 35.9995 10.7658 41.0452 14.8018 45.1025C18.8289 49.151 23.81 51.3448 29.7178 51.6855C30.1398 51.7193 30.4677 51.8781 30.7305 52.1562C30.992 52.4334 31.125 52.7666 31.125 53.1875C31.125 53.544 30.999 53.8247 30.7305 54.0635C30.4481 54.3145 30.1304 54.4353 29.7559 54.4365C26.4474 54.354 23.3598 53.6608 20.4883 52.3574C17.606 51.0491 15.0949 49.2929 12.9521 47.0889C10.8095 44.885 9.1138 42.3123 7.86621 39.3672C6.62257 36.4312 6 33.3103 6 30C6 26.6068 6.64346 23.4246 7.92773 20.4482C9.21624 17.4622 10.9625 14.8695 13.166 12.666C15.3695 10.4625 17.9622 8.71624 20.9482 7.42773C23.9246 6.14346 27.1068 5.5 30.5 5.5ZM30.5 15.5C33.6859 15.5 36.5515 16.4351 39.1113 18.3096C41.665 20.1797 43.4009 22.6367 44.3291 25.6943H44.3301C44.4187 26.0195 44.3759 26.302 44.2021 26.5771C44.02 26.8654 43.7703 27.05 43.4307 27.1426L43.4229 27.1445L43.415 27.1475C43.0067 27.273 42.6597 27.2247 42.3311 27.0156C42.0146 26.8143 41.7704 26.5376 41.5986 26.1709L41.5293 26.0078C40.7025 23.6665 39.275 21.783 37.2549 20.3711C35.2331 18.9581 32.9768 18.25 30.5 18.25C27.2439 18.25 24.4601 19.3954 22.1777 21.6777C19.8954 23.9601 18.75 26.7439 18.75 30C18.75 32.4768 19.4581 34.7331 20.8711 36.7549C22.2829 38.7749 24.1666 40.2015 26.5078 41.0283V41.0293C26.9568 41.202 27.2855 41.4694 27.5156 41.8311C27.7247 42.1597 27.773 42.5067 27.6475 42.915L27.6445 42.9229L27.6426 42.9307C27.5492 43.2732 27.3603 43.5387 27.0615 43.7432C26.786 43.9317 26.5107 43.9778 26.1963 43.8926C23.1388 42.9648 20.6814 41.2185 18.8105 38.6436C16.9351 36.0622 16 33.1859 16 30C16 25.9644 17.4067 22.5503 20.2285 19.7285C23.0503 16.9067 26.4644 15.5 30.5 15.5Z"
                      fill="#FF1721"
                      stroke="white"
                    />
                  </svg>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] font-semibold leading-8">
                      Marketing Digital
                    </h4>
                    <span className="bg-[#6574f8] text-white text-[10px] px-3 py-1 rounded-[10px]">
                      6 semanas
                    </span>
                  </div>
                  <span className="border border-[#6574f8] text-[#0e0e0e] text-[10px] px-3 py-1 rounded-[10px] self-start">
                    Intermedio
                  </span>
                </div>
                <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                  Domina las estrategias de marketing digital y redes sociales
                  para hacer crecer tu negocio.
                </p>
                <button
                  onClick={() => openModal("Marketing Digital")}
                  className="text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
                >
                  INSCRIBIRME AL CURSO
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-8 md:py-14">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-[140px]">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="max-w-[765px] mx-auto mb-4">
              <h2 className="text-[#0e0e0e] font-['Publico_Text_Web'] text-[34px] leading-10 tracking-[0.25px] mb-4">
                ¿Cómo funciona?
              </h2>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] leading-8 tracking-[0.25px]">
                Proceso simple en 3 pasos
              </p>
            </div>
            <div className="w-[177px] h-[2px] bg-[#6574f8] mx-auto"></div>
          </div>

          {/* Steps */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-[85px] max-w-[1159px] mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center w-full max-w-[297px]">
              <div className="text-[#ff1721] font-['Publico_Text_Web'] text-[40px] md:text-[57px] leading-[45px] md:leading-[60px] tracking-[0.5px] mb-1">
                1
              </div>
              <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-6 md:leading-8 mb-1 w-full md:w-[216px]">
                Selecciona tu curso
              </h3>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-6 md:leading-8 tracking-[0.25px] w-full md:w-[288px]">
                Elige el curso que más te interese de nuestra plataforma
                educativa
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center w-full max-w-[261px]">
              <div className="text-[#ff1721] font-['Publico_Text_Web'] text-[40px] md:text-[57px] leading-[45px] md:leading-[60px] tracking-[0.5px] mb-1">
                2
              </div>
              <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-6 md:leading-8 mb-1">
                Completa la inscripción
              </h3>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-6 md:leading-8 tracking-[0.25px] w-full md:w-[260px]">
                Llena el formulario con tus datos y agenda tu inscripción
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center w-full max-w-[298px]">
              <div className="text-[#ff1721] font-['Publico_Text_Web'] text-[40px] md:text-[57px] leading-[45px] md:leading-[60px] tracking-[0.5px] mb-1">
                3
              </div>
              <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-6 md:leading-8 mb-1">
                Recibe confirmación
              </h3>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-6 md:leading-8 tracking-[0.25px] w-full md:w-[298px]">
                Nuestro equipo te contactará para confirmar tu inscripción
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0e0e0e] text-white py-8">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-[140px]">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/8d00000f5bcb9510b7507406e5894f3d5a75c9af?width=84"
                alt="AXA Logo"
                className="w-[42px] h-[42px] rounded-[3px]"
              />
            </div>
            <div className="w-full h-[1px] bg-[#f0f0f0] opacity-40"></div>
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-between w-full gap-4 md:gap-0">
              <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-xs font-['Source_Sans_Pro'] leading-5 tracking-[0.4px] text-center">
                <a
                  href={`https://cdn.builder.io/o/assets%2F${encodedBuilderPublicKey}%2F8b1be5fcd60f49bdbfc969301f2ca7fc?alt=media&token=5022c0df-5c99-41c0-b448-2dd45d432ccc&apiKey=${builderPublicKey}`}
                  download="Terminos-y-Condiciones.pdf"
                  target="_blank"
                  className="underline hover:no-underline"
                >
                  Términos y Condiciones
                </a>
                <Link
                  to="/politica-cookies"
                  className="underline hover:no-underline"
                >
                  Política de Cookies
                </Link>
                <a
                  href={`https://cdn.builder.io/o/assets%2F${encodedBuilderPublicKey}%2F42bed250c3b54cee8fe7078d269b6957?alt=media&token=b67a2eab-62c7-417a-9bf4-4ad68d3ac484&apiKey=${builderPublicKey}`}
                  download="Politica-de-Privacidad.pdf"
                  target="_blank"
                  className="underline hover:no-underline"
                >
                  Política de Privacidad
                </a>
                <Link
                  to="/aviso-privacidad"
                  className="underline hover:no-underline"
                >
                  Aviso de Privacidad
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </footer>

      {/* Inscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0e0e0e] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] w-[416px] p-7 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="mb-6">
              <div className="text-center mb-8">
                <h2 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8 mb-2">
                  Inscripción a curso
                </h2>
                <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[15px] leading-4 tracking-[0.15px]">
                  Regístrate fácilmente y asegura tu lugar en el curso que
                  impulsará tu desarrollo.
                </p>
            </div>
          </div>

            {selectedCourse && (
              <div className="mb-6 rounded-[12px] bg-[#f0f0f0] px-4 py-3">
                <p className="text-xs font-['Source_Sans_Pro'] font-semibold uppercase tracking-[1.25px] text-[#0c0e45]">
                  Curso seleccionado
                </p>
                <p className="mt-1 text-[#0e0e0e] font-['Source_Sans_Pro'] text-base leading-6">
                  {selectedCourse}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] leading-8 tracking-[0.25px] mb-4">
                  Información Personal
                </h3>

                <div className="space-y-[18px]">
                  {/* Name Input */}
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Nombre y apellido"
                      autoComplete="name"
                      disabled={formSubmitting}
                      className="w-full h-14 px-3 py-2 border border-black/42 rounded focus:outline-none focus:border-[#0c0e45] text-[#0e0e0e] font-['Source_Sans_Pro'] text-base leading-6 tracking-[0.5px] disabled:bg-gray-100"
                      required
                    />
                  </div>

                  {/* Email Input */}
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="correo electrónico"
                      autoComplete="email"
                      disabled={formSubmitting}
                      className="w-full h-14 px-3 py-2 border border-black/42 rounded focus:outline-none focus:border-[#0c0e45] text-[#0e0e0e] font-['Source_Sans_Pro'] text-base leading-6 tracking-[0.5px] disabled:bg-gray-100"
                      required
                    />
                  </div>
                </div>
              </div>

              {loadingKey && !keyError && (
                <p className="text-xs text-[#666] font-['Source_Sans_Pro']">
                  Preparando la información para el envío seguro…
                </p>
              )}

              {keyError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-[#a1131a] font-['Source_Sans_Pro']">
                  {keyError}
                  <button
                    type="button"
                    onClick={handleRetryLoadKey}
                    className="ml-2 font-semibold underline hover:no-underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {formError && (
                <p className="text-sm text-[#FF1721] font-['Source_Sans_Pro']">{formError}</p>
              )}

              {/* Buttons */}
              <div className="space-y-3 pt-6">
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full h-11 bg-[#0c0e45] text-white font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase rounded-full hover:bg-[#0a0c3a] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formSubmitting ? "ENVIANDO…" : "INSCRIBIRSE"}
                </button>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={formSubmitting}
                  className="w-full h-11 bg-white border border-[#0c0e45] text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase rounded-full hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
