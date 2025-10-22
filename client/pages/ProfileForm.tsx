import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import {
  encryptProfileSessionData,
  setProfileSessionCookie,
  type ProfileSessionData,
} from "@/lib/profile-session";

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/u;
const IDENTIFICATION_REGEX = /^\d+$/;
const CO_MOBILE_REGEX = /^(?:\+57)?3\d{9}$/;

const profileSchema = z.object({
  name: z
    .string({ required_error: "Ingresa tu nombre" })
    .min(1, "Ingresa tu nombre")
    .max(50, "El nombre no puede tener más de 50 caracteres")
    .refine((value) => NAME_REGEX.test(value), {
      message: "El nombre solo puede contener letras y espacios",
    }),
  email: z
    .string({ required_error: "Ingresa tu correo electrónico" })
    .min(1, "Ingresa tu correo electrónico")
    .max(50, "El correo no puede tener más de 50 caracteres")
    .email("Ingresa un correo válido"),
  identification: z
    .string({ required_error: "Ingresa tu identificación" })
    .min(1, "Ingresa tu identificación")
    .max(15, "La identificación no puede tener más de 15 caracteres")
    .refine((value) => IDENTIFICATION_REGEX.test(value), {
      message: "La identificación solo puede contener números",
    }),
  mobile: z
    .string({ required_error: "Ingresa tu teléfono móvil" })
    .min(1, "Ingresa tu teléfono móvil")
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => CO_MOBILE_REGEX.test(value), {
      message: "Ingresa un número móvil colombiano válido",
    }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      identification: "",
      mobile: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user?.email) {
      setValue("email", user.email.slice(0, 50));
    }
  }, [setValue, user?.email]);

  const onSubmit = async (values: ProfileFormValues) => {
    setServerError(null);

    try {
      const profilePayload: ProfileSessionData = {
        name: values.name,
        email: values.email,
        identification: values.identification,
        mobile: values.mobile,
      };

      const encryptedValue = await encryptProfileSessionData(profilePayload);
      setProfileSessionCookie(encryptedValue);
      setShowSuccess(true);
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
      const timeoutId = window.setTimeout(() => setShowSuccess(false), 4000);
      timeoutsRef.current.push(timeoutId);
      reset(values);
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la información del perfil.";
      setServerError(message);
    }
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0c0e45] relative overflow-hidden">
      {showSuccess && (
        <div className="absolute top-[43px] left-1/2 -translate-x-1/2 w-[313px] h-16 bg-[#6574f8] rounded-[4px] z-10">
          <div className="absolute left-3 top-5 w-6 h-6 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_profile_success)">
                <path
                  d="M19.7969 10.1113C19.7969 15.4616 15.4596 19.7988 10.1094 19.7988C4.7591 19.7988 0.421875 15.4616 0.421875 10.1113C0.421875 4.76106 4.7591 0.423828 10.1094 0.423828C15.4596 0.423828 19.7969 4.76106 19.7969 10.1113ZM8.98883 15.2408L16.1763 8.05328C16.4204 7.80922 16.4204 7.41348 16.1763 7.16941L15.2925 6.28555C15.0484 6.04145 14.6527 6.04145 14.4086 6.28555L8.54688 12.1472L5.81019 9.41051C5.56613 9.16645 5.17039 9.16645 4.92629 9.41051L4.04242 10.2944C3.79836 10.5384 3.79836 10.9342 4.04242 11.1782L8.10492 15.2407C8.34902 15.4848 8.74473 15.4848 8.98883 15.2408Z"
                  fill="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_profile_success">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.109375 0.111328)"
                  />
                </clipPath>
              </defs>
            </svg>
          </div>

          <span className="absolute left-11 top-[23px] text-white font-normal text-base leading-normal w-[190px]">
            Perfil guardado
          </span>

          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            className="absolute right-[25px] top-[9px] w-4 h-4 flex items-center justify-center"
            aria-label="Cerrar notificación"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 3L8 8M13 13L8 8M8 8L13 3L3 13" stroke="#CCEAC4" strokeWidth="2" />
            </svg>
          </button>

          <div className="absolute bottom-0 left-0 w-[188px] h-[5px] bg-white" />
        </div>
      )}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[416px] bg-white rounded-[20px] flex flex-col items-start gap-4"
        style={{ padding: "32px 28px" }}
      >
        <div className="flex flex-col items-start gap-8 w-full">
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src="/img/logo_axa.png"
                alt="Logo AXA"
                className="w-20 h-20 object-contain"
              />
            </div>

            <div className="flex flex-col gap-2 w-full text-center">
              <h1 className="text-[23px] font-semibold text-[#0e0e0e] leading-8">
                Completa tu perfil
              </h1>
              <p className="text-[15px] font-normal text-[#0e0e0e] leading-4 tracking-[0.15px]">
                Necesitamos algunos datos adicionales para continuar
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6 w-full"
            noValidate
          >
            <div className="flex flex-col gap-4">
              {serverError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <div className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1">
                  <label htmlFor="profile-name" className="text-sm font-medium text-[#0e0e0e]">
                    Nombre
                  </label>
                  <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center focus-within:border-[#0c0e45]">
                    <input
                      id="profile-name"
                      type="text"
                      placeholder="Nombre"
                      className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      maxLength={50}
                      autoComplete="given-name"
                      {...register("name")}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="profile-email" className="text-sm font-medium text-[#0e0e0e]">
                    Correo electrónico
                  </label>
                  <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center focus-within:border-[#0c0e45]">
                    <input
                      id="profile-email"
                      type="email"
                      placeholder="Correo electrónico"
                      className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      maxLength={50}
                      autoComplete="email"
                      readOnly
                      aria-readonly="true"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="profile-identification" className="text-sm font-medium text-[#0e0e0e]">
                    Identificación
                  </label>
                  <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center focus-within:border-[#0c0e45]">
                    <input
                      id="profile-identification"
                      type="text"
                      inputMode="numeric"
                      placeholder="Número de identificación"
                      className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      maxLength={15}
                      autoComplete="off"
                      {...register("identification")}
                    />
                  </div>
                  {errors.identification && (
                    <p className="text-sm text-red-600 mt-1">{errors.identification.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="profile-mobile" className="text-sm font-medium text-[#0e0e0e]">
                    Teléfono móvil
                  </label>
                  <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center focus-within:border-[#0c0e45]">
                    <input
                      id="profile-mobile"
                      type="tel"
                      placeholder="Ej: +573001234567"
                      className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      autoComplete="tel"
                      {...register("mobile")}
                    />
                  </div>
                  {errors.mobile && (
                    <p className="text-sm text-red-600 mt-1">{errors.mobile.message}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-full bg-[#0c0e45] text-white text-sm font-semibold tracking-[1.25px] uppercase flex items-center justify-center hover:bg-[#0c0e45]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
