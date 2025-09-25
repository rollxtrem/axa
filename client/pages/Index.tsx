import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    documentNumber: "",
    rememberMe: false,
  });

  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.fullName || !formData.email || !formData.documentNumber) {
      alert("Por favor completa todos los campos");
      return;
    }

    // Show success notification
    setShowSuccessNotification(true);

    // Handle login logic here
    console.log("Login attempted with:", formData);

    // Mark user as authenticated and navigate to home
    try {
      login();
      navigate("/home");
    } catch (err) {
      // ignore if auth not available
    }

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
            Inicio de sesión exitoso
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

      {/* Form positioned to match original design */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[416px] bg-white rounded-[20px] flex flex-col items-start gap-4"
        style={{ padding: "32px 28px" }}
      >
        {/* Header Section */}
        <div className="flex flex-col items-start gap-8 w-full">
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
              <h1 className="text-[23px] font-bold text-[#0e0e0e] text-center leading-8">
                Bienvenido
              </h1>
              <p className="text-[15px] font-normal text-[#0e0e0e] text-center leading-4 tracking-[0.15px]">
                Inicia sesión para poder continuar
              </p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2">
              {/* Input Fields */}
              <div className="flex flex-col gap-[18px]">
                {/* Full Name Input */}
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded flex items-center">
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
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded flex items-center">
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                  />
                </div>

                {/* Document Number Input */}
                <div className="h-14 px-3 py-2 border border-black/[0.42] rounded flex items-center">
                  <input
                    type="text"
                    placeholder="Número de documento"
                    value={formData.documentNumber}
                    onChange={(e) =>
                      handleInputChange("documentNumber", e.target.value)
                    }
                    className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                  />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleInputChange("rememberMe", !formData.rememberMe)
                    }
                    className="flex items-center justify-center"
                  >
                    <span className="material-icons text-2xl text-[#666] leading-none select-none">
                      {formData.rememberMe
                        ? "check_box"
                        : "check_box_outline_blank"}
                    </span>
                  </button>
                </div>
                <label
                  className="text-[15px] font-normal text-[#0e0e0e] leading-4 tracking-[0.15px] cursor-pointer"
                  onClick={() =>
                    handleInputChange("rememberMe", !formData.rememberMe)
                  }
                >
                  Recordarme
                </label>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="h-11 px-4 bg-[#0c0e45] rounded-[50px] flex items-center justify-center gap-4 cursor-pointer hover:bg-[#0c0e45]/90 transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-white text-sm font-bold leading-9 tracking-[1.25px] uppercase text-center">
                  INICIAR SESIÓN
                </span>
              </div>
            </button>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-[15px] font-normal text-[#0e0e0e] text-center leading-4 tracking-[0.15px] w-full">
          <span>No tienes una cuenta? </span>
          <Link
            to="/register"
            className="text-[#0c0e45] hover:underline cursor-pointer"
          >
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
