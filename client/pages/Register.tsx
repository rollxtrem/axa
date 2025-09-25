import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      alert("Por favor completa todos los campos");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (!formData.acceptTerms) {
      alert("Debes aceptar los términos y condiciones");
      return;
    }

    // Show success notification
    setShowSuccessNotification(true);

    // Handle registration logic here
    console.log("Registration attempted with:", formData);

    // Reset form after successful registration
    setFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    });

    // Auto-hide notification after 4 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 4000);
  };

  return (
    <div className="w-screen h-screen bg-[#0c0e45] relative overflow-hidden">
      {/* Custom Success Notification */}
      {showSuccessNotification && (
        <div className="absolute top-[43px] left-[140px] w-[313px] h-16 bg-[#6574f8] rounded-[4px] z-10">
          {/* Check Icon */}
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

          {/* Text */}
          <span className="absolute left-11 top-[23px] text-white font-normal text-base leading-normal w-[115px] h-[19px]">
            Registro exitoso
          </span>

          {/* Close Button */}
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

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 w-[188px] h-[5px] bg-white" />
        </div>
      )}

      {/* Form positioned to match Figma design exactly */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[416px] bg-white rounded-[20px] flex flex-col items-start gap-4"
        style={{ padding: "32px 28px" }}
      >
        <div className="flex flex-col items-start gap-8 w-full">
          {/* Logo and Header Section */}
          <div className="flex flex-col items-center gap-10 w-full">
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/bae8fa4aa12914ed9829bce1bf8c98ab4df57ce2?width=160"
                alt="Logo AXA"
                className="w-20 h-20 object-contain"
              />
            </div>

            {/* Welcome Text */}
            <div className="flex flex-col gap-2 w-full">
              <h1 className="text-[23px] font-semibold text-[#0e0e0e] text-center leading-8">
                Te damos la bienvenida
              </h1>
              <p className="text-[15px] font-normal text-[#0e0e0e] text-center leading-4 tracking-[0.15px]">
                Regístrate para poder continuar
              </p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2">
              {/* Input Fields */}
              <div className="flex flex-col gap-[18px]">
                {/* Full Name Input */}
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={formData.fullName}
                    onChange={(e) =>
                      handleInputChange("fullName", e.target.value)
                    }
                    className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                  />
                </div>

                {/* Email Input */}
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                  />
                </div>

                {/* Password Input */}
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Contraseña*"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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

                {/* Confirm Password Input */}
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirma contraseña*"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-center w-full">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleInputChange("acceptTerms", !formData.acceptTerms)
                    }
                    className="flex items-center justify-center"
                  >
                    <span className="material-icons text-2xl text-[#666] leading-none select-none">
                      {formData.acceptTerms
                        ? "check_box"
                        : "check_box_outline_blank"}
                    </span>
                  </button>
                </div>
                <label
                  className="text-[15px] font-normal text-[#0e0e0e] leading-4 tracking-[0.15px] cursor-pointer"
                  onClick={() =>
                    handleInputChange("acceptTerms", !formData.acceptTerms)
                  }
                >
                  Acepto todos los{" "}
                  <span className="underline">términos y condiciones</span>{" "}
                  antes de registrarme
                </label>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              className="h-11 px-4 bg-[#0c0e45] rounded-[50px] flex items-center justify-center gap-4 cursor-pointer hover:bg-[#0c0e45]/90 transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-white text-sm font-bold leading-9 tracking-[1.25px] uppercase text-center">
                  REGISTRARSE
                </span>
              </div>
            </button>
          </form>
        </div>

        {/* Login Link */}
        <div className="text-[15px] font-normal text-[#0e0e0e] text-center leading-4 tracking-[0.15px] w-full">
          <span>Ya tienes una cuenta? </span>
          <Link
            to="/"
            className="text-[#0c0e45] hover:underline cursor-pointer"
          >
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
