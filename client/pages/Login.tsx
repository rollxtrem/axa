import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import {
  apiFetch,
  formatApiError,
  readJsonResponse,
} from "@/lib/api-client";
import {
  credentialToJSON,
  isWebAuthnSupported,
  prepareWebAuthnLoginOptions,
} from "@/lib/webauthn";
import type {
  LoginResponseBody,
  WebAuthnLoginStartResponse,
} from "@shared/api";

const loginSchema = z.object({
  email: z
    .string({ required_error: "Ingresa tu correo electrónico" })
    .min(1, "Ingresa tu correo electrónico")
    .email("Ingresa un correo válido"),
  password: z
    .string({ required_error: "Ingresa tu contraseña" })
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const navigate = useNavigate();
  const { login, isLoading, completeLogin } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");
  const emailValue = watch("email");

  const canUsePasskeys = useMemo(() => isWebAuthnSupported(), []);

  const handlePasskeyLogin = async () => {
    const normalizedEmail = (emailValue ?? "").trim();

    if (!canUsePasskeys) {
      setServerError(
        "Tu navegador no soporta passkeys. Prueba con otra opción de inicio de sesión."
      );
      return;
    }

    if (!normalizedEmail) {
      setServerError("Ingresa tu correo electrónico para usar tu passkey.");
      return;
    }

    if (!navigator.credentials || !window.PublicKeyCredential) {
      setServerError(
        "Este dispositivo no es compatible con passkeys. Usa tu correo y contraseña."
      );
      return;
    }

    setServerError(null);
    setShowSuccessNotification(false);
    setIsPasskeyLoading(true);

    try {
      const startResponse = await apiFetch(
        "/api/auth/webauthn/login/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        }
      );

      const { data: startData, errorMessage: startError } =
        await readJsonResponse<WebAuthnLoginStartResponse>(startResponse);

      if (!startResponse.ok || !startData) {
        const message = startError
          ? startError
          : "No se pudo iniciar la autenticación con passkey.";
        throw new Error(message);
      }

      const { publicKeyOptions, state } =
        prepareWebAuthnLoginOptions(startData);

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });

      if (!credential) {
        throw new Error(
          "No se recibió ninguna credencial WebAuthn. Inténtalo nuevamente."
        );
      }

      const credentialPayload = credentialToJSON(
        credential as PublicKeyCredential
      );

      const finishResponse = await apiFetch(
        "/api/auth/webauthn/login/finish",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            credential: credentialPayload,
            state,
            rememberMe,
          }),
        }
      );

      const { data: finishData, errorMessage: finishError } =
        await readJsonResponse<LoginResponseBody>(finishResponse);

      if (!finishResponse.ok || !finishData) {
        const message = finishError
          ? finishError
          : "No se pudo validar tu passkey. Inténtalo nuevamente.";
        throw new Error(message);
      }

      completeLogin(finishData, { rememberMe });
      setShowSuccessNotification(true);
      reset({ email: "", password: "", rememberMe });
      navigate("/");
      setTimeout(() => setShowSuccessNotification(false), 4000);
    } catch (err) {
      const message = formatApiError(
        err,
        "No se pudo iniciar sesión con tu passkey."
      );
      setServerError(message);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const { email, password, rememberMe } = values;
      await login({ email, password, rememberMe });
      setShowSuccessNotification(true);
      reset({ email: "", password: "", rememberMe: values.rememberMe });
      navigate("/");
      setTimeout(() => setShowSuccessNotification(false), 4000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión. Inténtalo nuevamente.";
      setServerError(message);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0c0e45] relative overflow-hidden">
      {showSuccessNotification && (
        <div className="absolute top-[43px] left-[140px] w-[313px] h-16 bg-[#6574f8] rounded-[4px] z-10">
          <div className="absolute left-3 top-5 w-6 h-6 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_4529_8946)">
                <path
                  d="M19.7969 10.1113C19.7969 15.4616 15.4596 19.7988 10.1094 19.7988C4.7591 19.7988 0.421875 15.4616 0.421875 10.1113C0.421875 4.76106 4.7591 0.423828 10.1094 0.423828C15.4596 0.423828 19.7969 4.76106 19.7969 10.1113ZM8.98883 15.2408L16.1763 8.05328C16.4204 7.80922 16.4204 7.41348 16.1763 7.16941L15.2925 6.28555C15.0484 6.04145 14.6527 6.04145 14.4086 6.28555L8.54688 12.1472L5.81019 9.41051C5.56613 9.16645 5.17039 9.16645 4.92629 9.41051L4.04242 10.2944C3.79836 10.5384 3.79836 10.9342 4.04242 11.1782L8.10492 15.2407C8.34902 15.4848 8.74473 15.4848 8.98883 15.2408Z"
                  fill="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_4529_8946">
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
            Inicio de sesión exitoso
          </span>

          <button
            onClick={() => setShowSuccessNotification(false)}
            className="absolute right-[25px] top-[9px] w-4 h-4 flex items-center justify-center"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3L8 8M13 13L8 8M8 8L13 3L3 13"
                stroke="#CCEAC4"
                strokeWidth="2"
              />
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
          <div className="flex flex-col items-center gap-10 w-full">
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/bae8fa4aa12914ed9829bce1bf8c98ab4df57ce2?width=160"
                alt="Logo AXA"
                className="w-20 h-20 object-contain"
              />
            </div>

            <div className="flex flex-col gap-2 w-full">
              <h1 className="text-[23px] font-bold text-[#0e0e0e] text-center leading-8">
                Bienvenido
              </h1>
              <p className="text-[15px] font-normal text-[#0e0e0e] text-center leading-4 tracking-[0.15px]">
                Inicia sesión para poder continuar
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6 w-full"
            noValidate
          >
            <div className="flex flex-col gap-2">
              {serverError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <div className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1">
                  <div className="h-14 px-3 py-2 border border-black/[0.42] rounded flex items-center focus-within:border-[#0c0e45]">
                    <input
                      type="email"
                      placeholder="Correo electrónico"
                      className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="h-14 px-3 py-2 border border-black/[0.42] rounded flex items-center focus-within:border-[#0c0e45]">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Contraseña"
                      className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="ml-2 text-[#666] hover:text-[#0e0e0e]"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9ZM12 4.5C17 4.5 21.27 7.61 23 12C21.27 16.39 17 19.5 12 19.5C7 19.5 2.73 16.39 1 12C2.73 7.61 7 4.5 12 4.5ZM3.18 12C3.98825 13.6503 5.24331 15.0407 6.80248 16.0133C8.36165 16.9858 10.1624 17.5013 12 17.5013C13.8376 17.5013 15.6383 16.9858 17.1975 16.0133C18.7567 15.0407 20.0117 13.6503 20.82 12C20.0117 10.3497 18.7567 8.95925 17.1975 7.98675C15.6383 7.01424 13.8376 6.49868 12 6.49868C10.1624 6.49868 8.36165 7.01424 6.80248 7.98675C5.24331 8.95925 3.98825 10.3497 3.18 12Z"
                          fill="#666666"
                        />
                      </svg>
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setValue("rememberMe", !rememberMe)}
                    className="flex items-center justify-center"
                  >
                    <span className="material-icons text-2xl text-[#666] leading-none select-none">
                      {rememberMe ? "check_box" : "check_box_outline_blank"}
                    </span>
                  </button>
                </div>
                <label
                  className="text-[15px] font-normal text-[#0e0e0e] leading-4 tracking-[0.15px] cursor-pointer"
                  onClick={() => setValue("rememberMe", !rememberMe)}
                >
                  Recordarme
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading || isPasskeyLoading}
                className="h-11 px-4 bg-[#0c0e45] rounded-[50px] flex items-center justify-center gap-4 cursor-pointer hover:bg-[#0c0e45]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white text-sm font-bold leading-9 tracking-[1.25px] uppercase text-center">
                    {isLoading ? "INGRESANDO..." : "INICIAR SESIÓN"}
                  </span>
                </div>
              </button>

              {canUsePasskeys ? (
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isPasskeyLoading || isLoading || !emailValue}
                  className="h-11 px-4 border border-[#0c0e45] rounded-[50px] flex items-center justify-center gap-4 cursor-pointer text-[#0c0e45] hover:bg-[#0c0e45]/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold leading-9 tracking-[1.25px] uppercase text-center">
                      {isPasskeyLoading ? "VALIDANDO..." : "USAR PASSKEY"}
                    </span>
                  </div>
                </button>
              ) : (
                <p className="text-xs text-[#666] text-center">
                  Tu navegador no soporta passkeys. Usa tu contraseña para ingresar.
                </p>
              )}
            </div>
          </form>
        </div>

        <div className="text-[15px] font-normal text-[#0e0e0e] text-center leading-4 tracking-[0.15px] w-full">
          <span>¿No tienes una cuenta? </span>
          <Link to="/register" className="text-[#0c0e45] hover:underline cursor-pointer">
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
