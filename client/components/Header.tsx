import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import contactInfoData from "@/data/contact-info.json";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, formatApiError, readJsonResponse, translateApiErrorMessage } from "@/lib/api-client";
import { encryptJsonWithPublicKey, importRsaPublicKey } from "@/lib/crypto";
import { readProfileSessionData } from "@/lib/profile-session";
import type { PqrsFormData } from "@shared/api";

const createInitialPqrsState = (): PqrsFormData => ({
  fullName: "",
  email: "",
  phone: "",
  documentType: "",
  documentNumber: "",
  requestType: "",
  subject: "",
  description: "",
});

const INFO_COOKIE_NAME = "info";
const ENCRYPTION_PASSPHRASE = "axa-profile-session-key";
const ENCRYPTION_SALT = "axa-profile-session-salt";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const sanitizeName = (value: string) =>
  value
    .replace(/\d+/g, "")
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/gu, "")
    .trim();

type StoredProfileInfo = {
  name?: string;
  email?: string;
  identification?: string;
  mobile?: string;
};

const decodeBase64 = (value: string) => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const deriveProfileKey = async (cryptoApi: SubtleCrypto) => {
  const keyMaterial = await cryptoApi.importKey(
    "raw",
    textEncoder.encode(ENCRYPTION_PASSPHRASE),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return cryptoApi.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode(ENCRYPTION_SALT),
      iterations: 150000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const decryptInfoCookie = async (cookieValue: string): Promise<StoredProfileInfo | null> => {
  const cryptoApi = window.crypto?.subtle;
  if (!cryptoApi) {
    throw new Error("El navegador no soporta las funciones de cifrado requeridas.");
  }

  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex === -1) {
    return null;
  }

  const ivBase64 = cookieValue.slice(0, separatorIndex);
  const payloadBase64 = cookieValue.slice(separatorIndex + 1);

  if (!ivBase64 || !payloadBase64) {
    return null;
  }

  const key = await deriveProfileKey(cryptoApi);
  const iv = decodeBase64(ivBase64);
  const ciphertext = decodeBase64(payloadBase64);

  const decryptedBuffer = await cryptoApi.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  const decoded = textDecoder.decode(decryptedBuffer);

  const parsed = JSON.parse(decoded) as Partial<StoredProfileInfo> | null;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const coerceString = (value: unknown) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return {
    name: coerceString(parsed.name),
    email: coerceString(parsed.email),
    identification: coerceString(parsed.identification),
    mobile: coerceString(parsed.mobile),
  };
};

const getInfoCookieValue = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split(";") : [];
  const prefix = `${INFO_COOKIE_NAME}=`;

  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }

  return null;
};

const loadProfileInfoFromCookie = async (): Promise<StoredProfileInfo | null> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const cookieValue = getInfoCookieValue();
  if (!cookieValue) {
    return null;
  }

  try {
    return await decryptInfoCookie(cookieValue);
  } catch (error) {
    console.error("Failed to decrypt profile info cookie", error);
    return null;
  }
};

type ContactEntry =
  | { type: "text"; text: string }
  | { type: "labelValue"; label: string; value: string }
  | { type: "footnote"; text: string };

type ContactCard = {
  id: string;
  title: string;
  entries: ContactEntry[];
  showIcon?: boolean;
  breakAll?: boolean;
};

const contactCards = contactInfoData as ContactCard[];

const contactEntryBaseClass =
  "text-[#0E0E0E] font-['Source_Sans_Pro'] text-[13px] md:text-[14px] font-normal leading-[20px] md:leading-[22px] tracking-[0.1px]";
const contactFootnoteClass = "text-[#666] text-[12px] leading-5 tracking-[0.4px]";
const contactLabelClass = "text-[#666]";
const contactValueClass = "text-[#0E0E0E]";

export default function Header() {
  const [showLogout, setShowLogout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showPqrs, setShowPqrs] = useState(false);
  const [showPqrsSuccess, setShowPqrsSuccess] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [pqrsForm, setPqrsForm] = useState<PqrsFormData>(() => createInitialPqrsState());
  const [pqrsError, setPqrsError] = useState<string | null>(null);
  const [pqrsSubmitting, setPqrsSubmitting] = useState(false);
  const [pqrsPublicKey, setPqrsPublicKey] = useState<CryptoKey | null>(null);
  const [pqrsLoadingKey, setPqrsLoadingKey] = useState(false);
  const [pqrsKeyError, setPqrsKeyError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, isAuthenticated, isAuthEnabled } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const loadProfileName = async () => {
      if (!isAuthenticated) {
        setProfileName(null);
        return;
      }

      try {
        const profile = await readProfileSessionData();
        if (cancelled) {
          return;
        }

        const trimmedName = profile?.name?.trim();
        setProfileName(trimmedName && trimmedName.length > 0 ? trimmedName : null);
      } catch (error) {
        if (!cancelled) {
          setProfileName(null);
        }
      }
    };

    void loadProfileName();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location.pathname, location.search]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLogout(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showPqrs || pqrsPublicKey) {
      return;
    }

    let cancelled = false;

    const fetchPublicKey = async () => {
      setPqrsKeyError(null);
      setPqrsLoadingKey(true);
      try {
        const response = await apiFetch("/api/pqrs/public-key");
        const { data, errorMessage } = await readJsonResponse<{ publicKey?: string }>(response);

        if (!response.ok) {
          const message = translateApiErrorMessage(
            errorMessage,
            "No fue posible preparar el envío seguro."
          );
          throw new Error(message);
        }

        if (!data || typeof data.publicKey !== "string") {
          throw new Error("La respuesta del servidor no incluyó la llave pública requerida.");
        }

        const key = await importRsaPublicKey(data.publicKey);
        if (!cancelled) {
          setPqrsPublicKey(key);
          setPqrsLoadingKey(false);
        }
      } catch (error) {
        console.error("Error fetching PQRS public key", error);
        if (!cancelled) {
          const fallback = "No fue posible preparar el envío seguro. Por favor, inténtalo más tarde.";
          const message = formatApiError(error, fallback);
          setPqrsKeyError(message);
          setPqrsLoadingKey(false);
        }
      }
    };

    void fetchPublicKey();

    return () => {
      cancelled = true;
    };
  }, [showPqrs, pqrsPublicKey]);

  useEffect(() => {
    if (!showPqrs) {
      return;
    }

    let cancelled = false;

    const prefillFromCookie = async () => {
      const profileInfo = await loadProfileInfoFromCookie();
      if (!profileInfo || cancelled) {
        return;
      }

      setPqrsForm((previous) => {
        const isBlank = (value: string) => value.trim().length === 0;
        const next: PqrsFormData = { ...previous };

        if (profileInfo.name && isBlank(previous.fullName)) {
          next.fullName = profileInfo.name;
        }

        if (profileInfo.email && isBlank(previous.email)) {
          next.email = profileInfo.email;
        }

        if (profileInfo.mobile && isBlank(previous.phone)) {
          next.phone = profileInfo.mobile;
        }

        if (profileInfo.identification && isBlank(previous.documentNumber)) {
          next.documentNumber = profileInfo.identification;
        }

        return next;
      });
    };

    void prefillFromCookie();

    return () => {
      cancelled = true;
    };
  }, [showPqrs]);

  const handlePqrsChange = (field: keyof PqrsFormData) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setPqrsForm((prev) => ({ ...prev, [field]: value }));
    };

  const validatePqrsForm = (form: PqrsFormData) => {
    if (!form.fullName.trim()) return "El nombre es obligatorio.";
    if (!form.email.trim()) return "El correo electrónico es obligatorio.";
    if (!form.phone.trim()) return "El teléfono es obligatorio.";
    if (!form.documentType.trim()) return "Selecciona un tipo de documento.";
    if (!form.documentNumber.trim()) return "El número de documento es obligatorio.";
    if (!form.requestType.trim()) return "Selecciona el tipo de solicitud.";
    if (!form.subject.trim()) return "El asunto es obligatorio.";
    if (!form.description.trim()) return "La descripción es obligatoria.";
    return null;
  };

  const resetPqrsForm = () => {
    setPqrsForm(createInitialPqrsState());
  };

  const handlePqrsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPqrsError(null);

    const validationError = validatePqrsForm(pqrsForm);
    if (validationError) {
      setPqrsError(validationError);
      return;
    }

    if (!pqrsPublicKey) {
      setPqrsError("No fue posible preparar el envío seguro. Por favor, inténtalo más tarde.");
      return;
    }

    try {
      setPqrsSubmitting(true);
      const encryptedPayload = await encryptJsonWithPublicKey(pqrsPublicKey, pqrsForm);
      const response = await apiFetch("/api/pqrs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(encryptedPayload),
      });

      const { data, errorMessage } = await readJsonResponse<{ status?: string }>(response);

      if (!response.ok) {
        const message = translateApiErrorMessage(
          errorMessage,
          "No fue posible enviar tu PQRS. Inténtalo de nuevo más tarde."
        );
        throw new Error(message);
      }

      if (!data || data.status !== "ok") {
        throw new Error("No recibimos la confirmación del envío de tu PQRS.");
      }

      resetPqrsForm();
      setShowPqrs(false);
      setShowPqrsSuccess(true);
    } catch (error) {
      console.error("Failed to submit PQRS", error);
      const fallback = "No fue posible enviar tu PQRS.";
      const message = formatApiError(error, fallback);
      setPqrsError(message);
    } finally {
      setPqrsSubmitting(false);
    }
  };

  const openPqrsModal = () => {
    setPqrsError(null);
    setPqrsKeyError(null);
    setPqrsLoadingKey(false);
    setShowPqrs(true);
  };

  const closePqrsModal = () => {
    setShowPqrs(false);
    setPqrsLoadingKey(false);
  };

  const isPqrsSubmitDisabled = pqrsSubmitting || pqrsLoadingKey || !!pqrsKeyError;

  const greetingSource = isAuthenticated
    ? profileName && profileName.trim().length > 0
      ? profileName
      : typeof user?.name === "string" && user.name.trim().length > 0
        ? user.name
        : typeof user?.nickname === "string" && user.nickname.trim().length > 0
          ? user.nickname
          : "usuario"
    : undefined;

  const greetingName = (() => {
    if (!greetingSource) {
      return "usuario";
    }

    const sanitized = sanitizeName(greetingSource);
    if (!sanitized) {
      return "usuario";
    }

    return sanitized.split(" ")[0]?.trim().toLowerCase() || "usuario";
  })();

  const handleLogout = () => {
    logout();
    setShowLogout(false);
    navigate("/");
  };

  return (
    <header className="w-full bg-transparent h-[134px] flex flex-col">
      {/* Top bar - Exact Figma match */}
      <div className="flex justify-between items-center px-4 py-4 lg:px-[141px] lg:py-4 bg-white flex-1">
        {/* Logo */}
        <div className="flex items-center gap-[7px]">
          <div className="flex w-[42px] h-[42px] justify-center items-center aspect-square relative">
            <img
              src="/img/axa_logo.png"
              alt="AXA Logo"
              className="w-[42px] h-[42px] flex-shrink-0 absolute left-0 top-0"
            />
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-[18px]">
          <div className="flex items-center gap-[8px] relative">
            {/* CONTÁCTANOS Button */}
            <button
              onClick={() => setShowContact(true)}
              className="flex h-[28px] px-4 items-center gap-4 rounded-[4px] hover:bg-gray-50 transition-colors"
            >
              <div className="flex py-[11px] items-center gap-2 self-stretch">
                <span className="text-[#0C0E45] text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase">
                  CONTÁCTANOS
                </span>
              </div>
            </button>

            {/* PQRs Button */}
            <button
              onClick={openPqrsModal}
              className="flex h-[28px] px-4 items-center gap-4 rounded-[4px] hover:bg-gray-50 transition-colors"
            >
              <div className="flex py-[11px] items-center gap-2 self-stretch">
                <span className="text-[#0C0E45] text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase">
                  PQRs
                </span>
              </div>
            </button>

            {/* User greeting / Login link */}
            {isAuthEnabled ? (
              isAuthenticated ? (
                <button className="flex h-[28px] px-4 items-center gap-4 rounded-[4px]">
                  <div className="flex py-[11px] items-center gap-2 self-stretch">
                    <span className="text-[#FF1721] text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase">
                      hola {greetingName}
                    </span>
                  </div>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex h-[28px] px-4 items-center gap-4 rounded-[4px]"
                >
                  <span className="text-[#FF1721] text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase">
                    iniciar sesión
                  </span>
                </Link>
              )
            ) : null}

            {/* Contact Icon - positioned as in Figma */}
            <svg
              className="w-3 h-3 aspect-square absolute top-2"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_4590_648)">
                <path
                  d="M5.33333 4H6.66667V5.33333H5.33333V4ZM8 4H9.33333V5.33333H8V4ZM11.3333 8.33333C10.5 8.33333 9.7 8.2 8.95333 7.95333C8.88667 7.93333 8.81333 7.92 8.74667 7.92C8.57333 7.92 8.40667 7.98667 8.27333 8.11333L6.80667 9.58C4.92 8.62 3.37333 7.08 2.41333 5.19333L3.88 3.72C4.06667 3.54 4.12 3.28 4.04667 3.04667C3.8 2.3 3.66667 1.5 3.66667 0.666667C3.66667 0.3 3.36667 0 3 0H0.666667C0.3 0 0 0.3 0 0.666667C0 6.92667 5.07333 12 11.3333 12C11.7 12 12 11.7 12 11.3333V9C12 8.63333 11.7 8.33333 11.3333 8.33333ZM1.35333 1.33333H2.35333C2.4 1.92 2.5 2.5 2.66 3.06L1.86 3.86667C1.58667 3.06 1.41333 2.21333 1.35333 1.33333ZM10.6667 10.6467C9.78667 10.5867 8.93333 10.4133 8.13333 10.14L8.93333 9.34C9.5 9.5 10.08 9.6 10.6667 9.64V10.6467ZM10.6667 4H12V5.33333H10.6667V4Z"
                  fill="#0C0E45"
                />
              </g>
              <defs>
                <clipPath id="clip0_4590_648">
                  <rect width="12" height="12" fill="white" />
                </clipPath>
              </defs>
            </svg>

            {/* PQRS Icon - positioned as in Figma */}
            <svg
              className="w-4 h-4 aspect-square absolute left-[140px] top-[6px]"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.33594 11.9997H8.66927V10.6663H7.33594V11.9997ZM8.0026 1.33301C4.3226 1.33301 1.33594 4.31967 1.33594 7.99967C1.33594 11.6797 4.3226 14.6663 8.0026 14.6663C11.6826 14.6663 14.6693 11.6797 14.6693 7.99967C14.6693 4.31967 11.6826 1.33301 8.0026 1.33301ZM8.0026 13.333C5.0626 13.333 2.66927 10.9397 2.66927 7.99967C2.66927 5.05967 5.0626 2.66634 8.0026 2.66634C10.9426 2.66634 13.3359 5.05967 13.3359 7.99967C13.3359 10.9397 10.9426 13.333 8.0026 13.333ZM8.0026 3.99967C6.52927 3.99967 5.33594 5.19301 5.33594 6.66634H6.66927C6.66927 5.93301 7.26927 5.33301 8.0026 5.33301C8.73594 5.33301 9.33594 5.93301 9.33594 6.66634C9.33594 7.99967 7.33594 7.83301 7.33594 9.99967H8.66927C8.66927 8.49967 10.6693 8.33301 10.6693 6.66634C10.6693 5.19301 9.47594 3.99967 8.0026 3.99967Z"
                fill="#0C0E45"
              />
            </svg>
          </div>

          {/* Logout Button */}
          {isAuthEnabled && isAuthenticated ? (
            <button
              onClick={() => setShowLogout(true)}
              className="flex w-[177px] h-[36px] px-4 justify-center items-center gap-4 rounded-[50px] bg-[#FF1721]"
            >
              <div className="flex py-[11px] justify-center items-center gap-2 self-stretch">
                <span className="text-white text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase">
                  cerrar SESIÓN
                </span>
              </div>
            </button>
          ) : null}
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 text-[#0c0e45]"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 12H21M3 6H21M3 18H21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation bar - Exact Figma spacing */}
      <nav className="hidden lg:block w-full bg-[#0c0e45]">
        <div className="flex justify-center items-center gap-8 px-4 pt-4 pb-0 lg:px-[513px] lg:pt-4 lg:pb-0">
          {/* HOME Button */}
          <button className="flex h-[28px] px-4 items-center gap-4 rounded-[4px]">
            <div className="flex py-[11px] items-center gap-2 self-stretch">
              <Link
                to="/"
                className="text-white text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase hover:underline transition-all duration-200"
              >
                HOME
              </Link>
            </div>
          </button>

          {/* BIENESTAR Button */}
          <button className="flex h-[28px] px-4 items-center gap-4 rounded-[4px]">
            <div className="flex py-[11px] items-center gap-2 self-stretch">
              <Link
                to="/bienestar"
                className="text-white text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase hover:underline transition-all duration-200"
              >
                Bienestar
              </Link>
            </div>
          </button>

          {/* FORMACIÓN Button */}
          <button className="flex h-[28px] px-4 items-center gap-4 rounded-[4px]">
            <div className="flex py-[11px] items-center gap-2 self-stretch">
              <Link
                to="/formacion"
                className="text-white text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-[36px] tracking-[1.25px] uppercase hover:underline transition-all duration-200"
              >
                Formación
              </Link>
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden w-full bg-[#0c0e45]">
        <div className="flex justify-center items-center gap-4 px-4 py-3">
          <Link
            to="/"
            className="text-white text-center font-['Source_Sans_Pro'] text-[12px] font-bold leading-6 tracking-[1px] uppercase hover:underline transition-all duration-200"
          >
            HOME
          </Link>
          <Link
            to="/bienestar"
            className="text-white text-center font-['Source_Sans_Pro'] text-[12px] font-bold leading-6 tracking-[1px] uppercase hover:underline transition-all duration-200"
          >
            Bienestar
          </Link>
          <Link
            to="/formacion"
            className="text-white text-center font-['Source_Sans_Pro'] text-[12px] font-bold leading-6 tracking-[1px] uppercase hover:underline transition-all duration-200"
          >
            Formación
          </Link>
        </div>
      </nav>

      {/* Mobile Menu Modal */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(14, 14, 14, 0.5)" }}
        >
          <div className="flex w-full max-w-[350px] flex-col items-start rounded-[20px] bg-white shadow-[0_11px_15px_0_rgba(0,0,0,0.20)] p-6">
            <div className="flex justify-between items-center w-full mb-6">
              <h2 className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-[20px] font-semibold leading-8">
                Menú
              </h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="text-[#666] hover:text-[#0E0E0E]"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowContact(true);
                }}
                className="text-left text-[#0C0E45] font-['Source_Sans_Pro'] text-[16px] font-bold py-2"
              >
                CONTÁCTANOS
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  openPqrsModal();
                }}
                className="text-left text-[#0C0E45] font-['Source_Sans_Pro'] text-[16px] font-bold py-2"
              >
                PQRS
              </button>

              <div className="w-full h-[1px] bg-[#E0E0E0] my-2"></div>

              {isAuthEnabled ? (
                isAuthenticated ? (
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowLogout(true);
                    }}
                    className="text-left text-[#FF1721] font-['Source_Sans_Pro'] text-[16px] font-bold py-2"
                  >
                    CERRAR SESIÓN
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setShowMobileMenu(false)}
                    className="text-left text-[#FF1721] font-['Source_Sans_Pro'] text-[16px] font-bold py-2"
                  >
                    INICIAR SESIÓN
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {isAuthEnabled && isAuthenticated && showLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(14, 14, 14, 0.5)" }}
        >
          <div className="flex w-full max-w-[414px] h-auto flex-col items-start rounded-[20px] bg-white shadow-[0_11px_15px_0_rgba(0,0,0,0.20)]">
            {/* Title */}
            <div className="flex p-4 items-start gap-2 self-stretch bg-white rounded-t-[20px]">
              <div className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8">
                Cerrar sesión
              </div>
            </div>

            {/* Content */}
            <div className="flex px-4 pb-4 flex-col items-start gap-2 self-stretch">
              <div className="self-stretch text-[#0E0E0E] font-['Source_Sans_Pro'] text-[15px] font-normal leading-4 tracking-[0.15px]">
                ¿Estas seguro que desear realizar esta acción?
              </div>
            </div>

            {/* Actions */}
            <div className="flex p-2 justify-end items-center gap-2 self-stretch">
              <button
                onClick={() => setShowLogout(false)}
                className="flex h-9 px-4 items-center gap-4 rounded transition-colors hover:bg-gray-50"
              >
                <div className="flex py-[11px] items-center gap-2 self-stretch">
                  <span className="text-[#0C0E45] text-center font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase">
                    cancelar
                  </span>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="flex h-9 px-4 items-center gap-4 rounded transition-colors hover:bg-gray-50"
              >
                <div className="flex py-[11px] items-center gap-2 self-stretch">
                  <span className="text-[#0C0E45] text-center font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase">
                    cerrar sesión
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(14, 14, 14, 0.5)" }}
        >
          <div className="flex w-full max-w-[416px] max-h-[90vh] overflow-y-auto flex-col items-start gap-4 md:gap-6 rounded-[20px] bg-white shadow-[0_11px_15px_0_rgba(0,0,0,0.20)] p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col items-center gap-6 md:gap-10 w-full">
              <div className="flex flex-col items-start gap-2 w-full">
                <h2 className="w-full text-[#0E0E0E] text-center font-['Source_Sans_Pro'] text-[20px] md:text-[23px] font-bold leading-6 md:leading-8">
                  ¡Estamos para ayudarte!
                </h2>
                <p className="w-full text-[#0E0E0E] text-center font-['Source_Sans_Pro'] text-[14px] md:text-[15px] font-normal leading-4 tracking-[0.15px]">
                  Comunícate con nosotros, te guiaremos en lo que necesites.
                </p>
              </div>
            </div>

            {/* Contact Cards */}
            <div className="flex flex-col items-start gap-3 w-full">
              {contactCards.map((card) => {
                const entryClassName = `${contactEntryBaseClass}${card.breakAll ? " break-all" : ""}`;

                return (
                  <div key={card.id} className="flex w-full flex-col items-start rounded-[10px] bg-[#F0F0F0]">
                    <div className="flex p-4 pb-1 items-start gap-2 w-full">
                      <div className="flex flex-col items-start gap-3 flex-1">
                        {card.showIcon ? (
                          <svg
                            width="60"
                            height="60"
                            viewBox="0 0 60 60"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M40.9375 8H49.6875C50.2824 8 50.7696 8.16971 51.1738 8.50391L51.3428 8.65723C51.7786 9.09269 52 9.63243 52 10.3125C52 15.0631 50.8539 19.9185 48.5469 24.8828C46.2405 29.8457 42.9632 34.4547 38.709 38.709C34.4547 42.9632 29.8457 46.2405 24.8828 48.5469C19.9185 50.8539 15.0631 52 10.3125 52C9.71756 52 9.23042 51.8303 8.82617 51.4961L8.65723 51.3428C8.22142 50.9073 8 50.3676 8 49.6875V41.25C8 40.7517 8.16367 40.3019 8.50977 39.8848C8.86063 39.4623 9.29178 39.1847 9.81543 39.0449L17.2061 37.4307C17.6543 37.3606 18.1153 37.3952 18.5947 37.541C19.0493 37.6793 19.4563 37.9388 19.8174 38.3359L19.8232 38.3418L19.8281 38.3477L25.7656 44.4727L26.0283 44.7432L26.3604 44.5664C28.26 43.5533 30.0748 42.3818 31.8047 41.0527C33.529 39.728 35.1685 38.2671 36.7236 36.6709C38.1991 35.2375 39.549 33.7194 40.7725 32.1162C41.9935 30.5162 43.1505 28.7905 44.2432 26.9414L44.4395 26.6094L44.168 26.3359L37.9326 20.0371L37.9307 20.0361L37.832 19.9307C37.6132 19.6794 37.4681 19.3881 37.3945 19.0498C37.3064 18.6442 37.2946 18.1716 37.3721 17.625L39.0479 9.80859C39.1944 9.26367 39.4442 8.82536 39.791 8.47852C40.115 8.15455 40.4883 8 40.9375 8ZM17.5879 40.2598L11.1504 41.5723L10.75 41.6543V49.2725L11.2725 49.249C13.1838 49.1641 15.1545 48.8676 17.1836 48.3604C19.2112 47.8535 21.0956 47.1976 22.835 46.3916L23.4678 46.0977L22.9873 45.5928L18.0498 40.4053L17.8584 40.2051L17.5879 40.2598ZM41.5732 11.1475L40.1357 18.0225L40.0811 18.2852L40.2695 18.4766L45.332 23.6016L45.8604 24.1357L46.1494 23.4424C47.1972 20.9276 47.9768 18.6856 48.4844 16.7188C48.9926 14.7494 49.25 12.9255 49.25 11.25V10.75H41.6562L41.5732 11.1475Z"
                              fill="#FF1721"
                              stroke="#F0F0F0"
                            />
                          </svg>
                        ) : null}
                        <h3 className="w-full text-[#0E0E0E] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-bold leading-6 md:leading-8">
                          {card.title}
                        </h3>
                      </div>
                    </div>
                    <div className="flex p-4 pt-1 flex-col justify-center items-center gap-2 w-full">
                      <div className="flex w-full flex-col gap-1">
                        {card.entries.map((entry, index) => {
                          if (entry.type === "text") {
                            return (
                              <p key={index} className={entryClassName}>
                                {entry.text}
                              </p>
                            );
                          }

                          if (entry.type === "labelValue") {
                            return (
                              <p key={index} className={entryClassName}>
                                <span className={contactLabelClass}>{entry.label}</span>{" "}
                                <span className={contactValueClass}>{entry.value}</span>
                              </p>
                            );
                          }

                          return (
                            <p key={index} className={contactFootnoteClass}>
                              {entry.text}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close Button */}
            <div className="flex flex-col items-start gap-3 w-full">
              <button
                onClick={() => setShowContact(false)}
                className="flex h-11 px-4 justify-center items-center gap-4 w-full rounded-[50px] bg-[#0C0E45] hover:bg-[#090a3a] transition-colors"
              >
                <div className="flex py-[11px] justify-center items-center gap-2 w-full">
                  <span className="text-white text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-9 tracking-[1.25px] uppercase">
                    CERRAR
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PQRS Modal */}
      {showPqrs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(14, 14, 14, 0.5)" }}
        >
          <div className="flex w-full max-w-[416px] max-h-[90vh] overflow-y-auto flex-col items-start gap-4 md:gap-6 rounded-[20px] bg-white shadow-[0_11px_15px_0_rgba(0,0,0,0.20)] p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col items-start gap-4 md:gap-8 w-full">
              <div className="flex flex-col items-center gap-6 md:gap-10 w-full">
                <div className="flex flex-col items-start gap-2 w-full">
                  <h2 className="w-full text-[#0E0E0E] text-center font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-bold leading-6 md:leading-8">
                    Peticiones, Quejas, Reclamos y Sugerencias (PQRS)
                  </h2>
                </div>
              </div>
            </div>

            <form onSubmit={handlePqrsSubmit} className="flex w-full flex-col items-start gap-6">
              {/* Personal Information Section */}
              <div className="flex flex-col items-start gap-4 w-full">
                <h3 className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-[18px] md:text-[20px] font-normal leading-6 md:leading-8 tracking-[0.25px]">
                  Información Personal
                </h3>
                <div className="flex flex-col items-start gap-2 w-full">
                  <div className="flex flex-col items-start gap-[18px] w-full">
                    {/* Full Name */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42">
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={pqrsForm.fullName}
                        onChange={handlePqrsChange("fullName")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none placeholder:text-[#0E0E0E]"
                      />
                    </div>

                    {/* Email */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42">
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={pqrsForm.email}
                        onChange={handlePqrsChange("email")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none placeholder:text-[#0E0E0E]"
                      />
                    </div>

                    {/* Phone */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42">
                      <input
                        type="tel"
                        placeholder="Número de teléfono"
                        value={pqrsForm.phone}
                        onChange={handlePqrsChange("phone")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none placeholder:text-[#0E0E0E]"
                      />
                    </div>

                    {/* Document Type */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42">
                      <select
                        value={pqrsForm.documentType}
                        onChange={handlePqrsChange("documentType")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none appearance-none"
                      >
                        <option value="">Tipo de documento</option>
                        <option value="cc">Cédula de Ciudadanía</option>
                        <option value="ce">Cédula de Extranjería</option>
                        <option value="passport">Pasaporte</option>
                        <option value="nit">NIT</option>
                      </select>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 25"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 16.5L6 10.5H18L12 16.5Z" fill="#666666" />
                      </svg>
                    </div>

                    {/* Document Number */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42">
                      <input
                        type="text"
                        placeholder="Número de documento"
                        value={pqrsForm.documentNumber}
                        onChange={handlePqrsChange("documentNumber")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none placeholder:text-[#0E0E0E]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Details Section */}
              <div className="flex p-4 flex-col items-start gap-4 w-full rounded-[10px] bg-[#F0F0F0]">
                <h3 className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-[18px] md:text-[20px] font-normal leading-6 md:leading-8 tracking-[0.25px]">
                  Detalles de la solicitud
                </h3>
                <div className="flex flex-col items-start gap-2 w-full">
                  <div className="flex flex-col items-start gap-[18px] w-full">
                    {/* Request Type */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42 bg-white">
                      <select
                        value={pqrsForm.requestType}
                        onChange={handlePqrsChange("requestType")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none appearance-none"
                      >
                        <option value="">Tipo de solicitud</option>
                        <option value="peticion">Petición</option>
                        <option value="queja">Queja</option>
                        <option value="reclamo">Reclamo</option>
                        <option value="sugerencia">Sugerencia</option>
                      </select>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 25"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 16.5L6 10.5H18L12 16.5Z" fill="#666666" />
                      </svg>
                    </div>

                    {/* Subject */}
                    <div className="flex h-12 md:h-14 px-3 items-center gap-[10px] w-full rounded border border-black/42 bg-white">
                      <input
                        type="text"
                        placeholder="Asunto"
                        value={pqrsForm.subject}
                        onChange={handlePqrsChange("subject")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none placeholder:text-[#0E0E0E]"
                      />
                    </div>

                    {/* Description */}
                    <div className="flex h-[100px] md:h-[120px] px-3 py-2 items-start gap-[10px] w-full rounded border border-black/42 bg-white">
                      <textarea
                        placeholder="Descripción detallada"
                        rows={4}
                        value={pqrsForm.description}
                        onChange={handlePqrsChange("description")}
                        disabled={pqrsSubmitting}
                        className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[16px] font-normal leading-5 md:leading-6 tracking-[0.5px] bg-transparent outline-none resize-none placeholder:text-[#0E0E0E]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {pqrsLoadingKey ? (
                <p className="text-[#0C0E45] text-sm font-['Source_Sans_Pro']">Preparando el envío seguro…</p>
              ) : null}
              {pqrsKeyError ? (
                <p className="text-[#FF1721] text-sm font-['Source_Sans_Pro']">{pqrsKeyError}</p>
              ) : null}
              {pqrsError ? (
                <p className="text-[#FF1721] text-sm font-['Source_Sans_Pro']">{pqrsError}</p>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-col items-start gap-3 w-full">
                <button
                  type="submit"
                  disabled={isPqrsSubmitDisabled}
                  className={`flex h-11 px-4 justify-center items-center gap-4 w-full rounded-[50px] bg-[#0C0E45] transition-colors ${isPqrsSubmitDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-[#090a3a]"}`}
                >
                  <div className="flex py-[11px] justify-center items-center gap-2 w-full">
                    <span className="text-white text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-9 tracking-[1.25px] uppercase">
                      {pqrsSubmitting ? "ENVIANDO…" : "ENVIAR PQRS"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={closePqrsModal}
                  className="flex h-11 px-4 justify-center items-center gap-4 w-full rounded-[50px] border border-[#0C0E45] bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex py-[11px] justify-center items-center gap-2 w-full">
                    <span className="text-[#0C0E45] text-center font-['Source_Sans_Pro'] text-[14px] font-bold leading-9 tracking-[1.25px] uppercase">
                      CANCELAR
                    </span>
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PQRS Success Modal */}
      {showPqrsSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(14, 14, 14, 0.5)" }}
        >
          <div className="flex w-full max-w-[414px] flex-col items-start rounded-[20px] bg-white shadow-[0_11px_15px_0_rgba(0,0,0,0.20)] mx-4">
            {/* Title */}
            <div className="flex p-4 items-start gap-2 w-full bg-white rounded-t-[20px]">
              <div className="flex-1 text-[#0E0E0E] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-bold leading-6 md:leading-8">
                ¡Hemos recibido tu solicitud!
              </div>
            </div>

            {/* Content */}
            <div className="flex px-4 pb-4 flex-col items-start gap-2 w-full">
              <div className="w-full text-[#0E0E0E] font-['Source_Sans_Pro'] text-[14px] md:text-[15px] font-normal leading-4 tracking-[0.15px]">
                Gracias por enviarnos tu consulta. Nuestro equipo la está
                revisando y nos pondremos en contacto contigo lo antes posible.
              </div>
            </div>

            {/* Actions */}
            <div className="flex p-2 justify-end items-center gap-2 w-full">
              <button
                onClick={() => setShowPqrsSuccess(false)}
                className="flex h-9 px-4 items-center gap-4 rounded-[4px] transition-colors hover:bg-gray-50"
              >
                <div className="flex py-[11px] items-center gap-2 w-full">
                  <span className="text-[#0C0E45] text-center font-['Source_Sans_Pro'] text-[12px] md:text-[14px] font-bold leading-9 tracking-[1.25px] uppercase">
                    ENTENDIDO
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
