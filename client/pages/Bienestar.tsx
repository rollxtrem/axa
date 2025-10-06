import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { builderPublicKey, encodedBuilderPublicKey } from "@/lib/builder";

export default function Bienestar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formData, setFormData] = useState({
    name: "",
    identification: "",
    email: "",
    phone: "",
    date: "",
    time: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Here you would handle the form submission
    setIsModalOpen(false);
    setIsConfirmationModalOpen(true);
    // Reset form after showing confirmation
    setFormData({
      name: "",
      identification: "",
      email: "",
      phone: "",
      date: "",
      time: "",
    });
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const closeConfirmationModal = () => setIsConfirmationModalOpen(false);

  // Calendar functions
  const openCalendar = () => setIsCalendarOpen(true);
  const closeCalendar = () => setIsCalendarOpen(false);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const selectDate = (day: number) => {
    const selectedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    const formattedDate = selectedDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    handleInputChange("date", formattedDate);
    setIsCalendarOpen(false);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString("es-ES", { month: "long" });
  };

  const getYear = () => {
    return currentDate.getFullYear();
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isCalendarOpen && !target.closest(".calendar-container")) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);
  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-[#0C0E45] rounded-b-[20px] md:rounded-b-[50px] h-[300px] md:h-[425px]">
        <div className="relative w-full max-w-[1440px] mx-auto px-4 md:px-8">
          {/* Hero Image */}
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/66f3a0736c9f4f678097338f1bdb8b8014ecef83?width=1794"
            alt="Servicios de asistencia"
            className="absolute right-0 md:left-[548px] top-[-12px] w-[600px] md:w-[1180px] h-[320px] md:h-[466px] object-cover"
          />

          {/* Blue angled overlay */}
          <svg
            className="absolute left-[-100px] md:left-[-287px] top-0 w-[600px] md:w-[1213px] h-[300px] md:h-[466px] fill-[#0c0e45]"
            viewBox="0 0 921 435"
            preserveAspectRatio="none"
          >
            <path
              d="M921 0L574.145 459H-374L-25.9521 0H921Z"
              fill="#0C0E45"
              style={{
                marginRight: "5px",
                paddingRight: "14px",
              }}
            />
          </svg>

          {/* Hero Content */}
          <div className="absolute left-4 md:left-[113px] top-[50px] md:top-[95px] w-full max-w-[350px] md:w-[536px] flex flex-col gap-4 md:gap-6 px-4 md:px-0">
            <h1 className="text-white font-['Publico_Text_Web'] text-[28px] md:text-[48px] leading-[32px] md:leading-[50px] w-full md:w-[475px]">
              Servicios de <br />
              asistencia <br />
              especializada
            </h1>
            <p className="text-white font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-[24px] md:leading-8 tracking-[0.25px] w-full md:w-[403px]">
              Accede a orientación profesional en seguridad informática,
              finanzas y bienestar personal.
            </p>
          </div>
        </div>
      </section>

      {/* Breadcrumbs */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-[140px] py-[18px]"></div>

      {/* Services Section */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-[140px] py-14">
        <div className="max-w-[1160px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <div className="max-w-[765px] mx-auto mb-4">
              <h2 className="text-[#0e0e0e] font-['Publico_Text_Web'] text-[34px] leading-10 tracking-[0.25px] mb-4">
                Servicios Disponibles
              </h2>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] leading-8 tracking-[0.25px]">
                Agenda tu cita con nuestros especialistas y recibe atención
                personalizada
              </p>
            </div>
            <div className="w-[177px] h-[2px] bg-[#6574f8] mx-auto"></div>
          </div>

          {/* Phone Assistance Section */}
          <div className="mb-8">
            <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8 mb-4">
              Asistencia telefónica
            </h3>

            {/* Service Cards Grid - 3 cards centered */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-5 md:gap-[22px]">
              {/* Informática Card */}
              <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden shadow-sm">
                <div className="w-full h-[110px] relative">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/0fe5e04f99c4cc66351c3aad3b43f3bf88f598b6?width=746"
                    alt="Informática"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-3 mb-4">
                    <svg
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M30 5.6875C30.3482 5.6875 30.7266 5.75624 31.1377 5.90527V5.90625L47.3828 11.9668C48.0077 12.2192 48.5149 12.622 48.9121 13.1846C49.3041 13.7399 49.5 14.3609 49.5 15.0625V27.3057C49.5 33.2525 47.8421 38.7105 44.5215 43.6914C41.2081 48.6615 36.7149 52.1032 31.0273 54.0264L31.0068 54.0332L30.9863 54.042C30.8247 54.1129 30.6663 54.1651 30.5107 54.1992C30.3604 54.2322 30.1905 54.25 30 54.25C29.8095 54.25 29.6396 54.2322 29.4893 54.1992C29.3337 54.1651 29.1753 54.1129 29.0137 54.042L28.9932 54.0332L28.9727 54.0264L28.4434 53.8418C23.0056 51.8868 18.6885 48.5063 15.4785 43.6914C12.1579 38.7105 10.5 33.2525 10.5 27.3057V15.0625C10.5 14.361 10.6956 13.7399 11.0879 13.1846H11.0889C11.4855 12.6224 11.9918 12.2193 12.6162 11.9668L28.8613 5.90527C29.2728 5.75602 29.6515 5.6875 30 5.6875ZM46.75 14.7168L46.4268 14.5947L30.1768 8.46973L30 8.40332L29.8232 8.46973L13.5732 14.5947L13.25 14.7168V27.3125C13.25 32.8694 14.7896 37.8957 17.8691 42.377C20.948 46.8572 24.9414 49.9174 29.8428 51.5371L30 51.5889L30.1572 51.5371C35.0586 49.9174 39.052 46.8572 42.1309 42.377C45.2104 37.8957 46.75 32.8694 46.75 27.3125V14.7168Z"
                        fill="#FF1721"
                        stroke="white"
                      />
                    </svg>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8">
                        Informática
                      </h4>
                      <span className="bg-[#6574f8] text-white text-[10px] px-3 py-1 rounded-[10px]">
                        12 eventos
                      </span>
                    </div>
                  </div>
                  <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                    Asesoría especializada en ciberseguridad y protección de
                    datos personales.
                  </p>
                  <button
                    onClick={openModal}
                    className="text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
                  >
                    Agendar cita
                  </button>
                </div>
              </div>

              {/* Financiera Card */}
              <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden shadow-sm">
                <div className="w-full h-[110px] relative">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/f3cacc7de060f01ab81918ce68cba47441b7b7dd?width=746"
                    alt="Financiera"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-3 mb-4">
                    <svg
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M29.999 5.5C33.3922 5.50003 36.5638 6.14394 39.5186 7.42773C42.4832 8.71586 45.0766 10.4721 47.3018 12.6973C49.527 14.9225 51.2832 17.5158 52.5713 20.4805C53.8551 23.4353 54.499 26.6067 54.499 30C54.499 33.3506 53.8559 36.5122 52.5713 39.4893C51.283 42.4747 49.5264 45.078 47.3018 47.3027C45.0766 49.5279 42.4832 51.2841 39.5186 52.5723C36.5638 53.8561 33.3922 54.5 29.999 54.5C27.6669 54.5 25.4303 54.203 23.2881 53.6113C21.1455 53.0196 19.1368 52.1534 17.2607 51.0117C16.8485 50.758 16.653 50.4307 16.623 49.9971C16.5921 49.5482 16.7383 49.1553 17.1025 48.791C17.3063 48.5873 17.5599 48.467 17.8896 48.4355C18.229 48.4032 18.5341 48.4662 18.8184 48.624C20.5596 49.6422 22.3766 50.4185 24.2695 50.9502C26.1665 51.4831 28.0771 51.75 29.999 51.75C36.0859 51.7499 41.2457 49.6479 45.4463 45.4473C49.6469 41.2466 51.749 36.0869 51.749 30C51.749 23.9131 49.6469 18.7534 45.4463 14.5527C41.2457 10.3521 36.0859 8.25006 29.999 8.25C24.2125 8.25 19.2566 10.1376 15.1602 13.9141C11.0658 17.6886 8.78091 22.4205 8.3125 28.084V28.0869C8.27911 28.5202 8.1265 28.8529 7.86426 29.1152C7.61202 29.3675 7.29488 29.4999 6.87402 29.5C6.46218 29.5 6.14808 29.3632 5.89355 29.0938C5.66648 28.8532 5.55837 28.5948 5.55469 28.2969L5.55957 28.167V28.1602C6.00888 21.8297 8.57668 16.4782 13.2773 12.084C17.976 7.69175 23.5419 5.5 29.999 5.5ZM32.4365 21H43.0615C43.4824 21.0001 43.7995 21.1325 44.0518 21.3848C44.304 21.637 44.4365 21.9541 44.4365 22.375V33C44.4365 33.4209 44.304 33.738 44.0518 33.9902C43.7995 34.2425 43.4824 34.3749 43.0615 34.375C42.6406 34.375 42.3236 34.2424 42.0713 33.9902C41.819 33.7379 41.6865 33.421 41.6865 33V25.418L28.2705 38.834C28.0264 39.0781 27.7224 39.2194 27.332 39.252C26.9685 39.2822 26.6662 39.1808 26.3936 38.9385L26.3906 38.9365L19.7656 33.124L19.4141 32.8154L10.3955 41.834C10.1359 42.0935 9.82067 42.2062 9.39746 42.1592C9.03077 42.1184 8.76377 41.9744 8.56445 41.7217L8.4834 41.6064C8.33898 41.3738 8.29442 41.1436 8.33594 40.8945C8.37986 40.6312 8.50302 40.3905 8.72754 40.166L18.415 30.4785C18.659 30.2346 18.9624 30.0931 19.3525 30.0605C19.7162 30.0302 20.0193 30.1316 20.292 30.374L20.2939 30.376L26.9189 36.1885L27.2715 36.4971L40.0186 23.75H32.4365C32.0156 23.75 31.6986 23.6174 31.4463 23.3652C31.194 23.1129 31.0615 22.796 31.0615 22.375C31.0615 21.954 31.194 21.6371 31.4463 21.3848C31.6986 21.1326 32.0156 21 32.4365 21Z"
                        fill="#FF1721"
                        stroke="white"
                      />
                    </svg>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8">
                        Financiera
                      </h4>
                      <span className="bg-[#6574f8] text-white text-[10px] px-3 py-1 rounded-[10px]">
                        12 eventos
                      </span>
                    </div>
                  </div>
                  <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                    Orientación profesional en temas financieros, inversiones y
                    planificación.
                  </p>
                  <button
                    onClick={openModal}
                    className="text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
                  >
                    Agendar cita
                  </button>
                </div>
              </div>
              
              {/* Nutricional Card */}
              {/*
              <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden shadow-sm">
                <div className="w-full h-[110px] relative">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/1e7198a84ab669df72e9ca3f10c514a128983bbc?width=746"
                    alt="Nutricional"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-3 mb-4">
                    <svg
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8.62305 23.4375H51.373C52.127 23.4375 52.7202 23.729 53.1924 24.3379C53.6666 24.9495 53.808 25.5952 53.6377 26.3164L52.0146 32.8086C51.5727 34.4647 50.8519 35.9376 49.8525 37.2324C48.8548 38.5251 47.6176 39.572 46.1357 40.373L45.9619 40.4668L45.8994 40.6533L42.8369 49.7783L42.8359 49.7793C42.6198 50.4278 42.231 50.9572 41.6562 51.377C41.0856 51.7936 40.4545 52 39.748 52H20.248C19.5384 52 18.9057 51.7986 18.335 51.3936C17.768 50.9911 17.3795 50.4596 17.1621 49.7842L17.1611 49.7812L14.1611 40.6562L14.0986 40.4658L13.9219 40.3721L13.6484 40.2207C12.2966 39.4521 11.1439 38.4604 10.1875 37.2432C9.16794 35.9446 8.43252 34.468 7.98145 32.8086L6.3584 26.3164C6.18814 25.5953 6.32962 24.9494 6.80371 24.3379C7.27584 23.729 7.86919 23.4375 8.62305 23.4375ZM17.5859 42.2822L19.7734 48.9072L19.8867 49.25H40.1064L40.2217 48.9111L42.4717 42.2861L42.6963 41.625H17.3691L17.5859 42.2822ZM9.3252 26.8076L10.6367 32.1152V32.1162C11.1208 34.1406 12.1727 35.792 13.7861 37.0508C15.3993 38.3093 17.2684 38.9375 19.373 38.9375H40.623C42.6909 38.9375 44.5394 38.3078 46.1494 37.0508C47.7592 35.7938 48.8305 34.1458 49.3574 32.126V32.125L50.7324 26.8125L50.8945 26.1875H9.17188L9.3252 26.8076ZM27.498 8C29.4197 8 31.084 8.62342 32.5127 9.87598C33.9423 11.1294 34.8824 12.7994 35.3213 14.9141L35.5283 15.9141L36.1914 15.1367C37.0002 14.1873 37.8551 13.4478 38.7549 12.9102L39.1436 12.6924C40.1811 12.1465 41.2763 11.875 42.4355 11.875C44.4326 11.875 46.1073 12.5663 47.4893 13.9561C48.8732 15.3474 49.5605 17.0193 49.5605 19V22.4375H46.8105V19.0312C46.8105 17.8877 46.4431 16.8916 45.708 16.0693L45.5557 15.9072C44.7203 15.0563 43.6913 14.625 42.498 14.625C41.7021 14.625 40.951 14.8256 40.252 15.2217C39.6179 15.581 39.0887 16.0956 38.6592 16.75H32.9434L32.418 14.8066H32.4189L32.415 14.7959L32.2695 14.3535C31.9012 13.3472 31.337 12.5128 30.5703 11.8672C29.6841 11.1209 28.6307 10.75 27.4355 10.75C26.4223 10.75 25.4843 11.0279 24.6328 11.5801C23.7818 12.1321 23.1441 12.8735 22.7295 13.7949V13.7959L21.7998 15.875H17.0605C16.0119 15.875 15.1032 16.2503 14.3633 16.9902C13.6231 17.7304 13.2482 18.6405 13.248 19.6914V22.4375H10.498V19.6875C10.498 17.8426 11.082 16.2972 12.2432 15.0215C13.3786 13.7741 14.9817 13.125 17.123 13.125H19.9395L20.0752 12.8389C20.7878 11.3346 21.8021 10.1567 23.1201 9.29297C24.4358 8.43071 25.8911 8.00003 27.498 8Z"
                        fill="#FF1721"
                        stroke="white"
                      />
                    </svg>
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8">
                        Nutricional
                      </h4>
                      <span className="bg-[#6574f8] text-white text-[10px] px-3 py-1 rounded-[10px]">
                        Ilimitado
                      </span>
                    </div>
                  </div>
                  <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                    Asistencia profesional en nutrición y bienestar mental para
                    tu salud integral.
                  </p>
                  <button
                    onClick={openModal}
                    className="text-[#0c0e45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
                  >
                    Agendar cita
                  </button>
                </div>
              </div>
              */}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-8 md:py-14">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-[139px]">
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
            <div className="flex flex-col items-center text-center w-full max-w-[217px]">
              <div className="text-[#ff1721] font-['Publico_Text_Web'] text-[40px] md:text-[57px] leading-[45px] md:leading-[60px] tracking-[0.5px] mb-1">
                1
              </div>
              <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-6 md:leading-8 mb-1">
                Selecciona el servicio
              </h3>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-6 md:leading-8 tracking-[0.25px]">
                Elige el tipo de asistencia que necesitas
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center w-full max-w-[238px]">
              <div className="text-[#ff1721] font-['Publico_Text_Web'] text-[40px] md:text-[57px] leading-[45px] md:leading-[60px] tracking-[0.5px] mb-1">
                2
              </div>
              <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-6 md:leading-8 mb-1">
                Agenda tu cita
              </h3>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-6 md:leading-8 tracking-[0.25px]">
                Completa el formulario con tus datos y preferencias
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center w-full max-w-[298px]">
              <div className="text-[#ff1721] font-['Publico_Text_Web'] text-[40px] md:text-[57px] leading-[45px] md:leading-[60px] tracking-[0.5px] mb-1">
                3
              </div>
              <h3 className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-6 md:leading-8 mb-1">
                Recibe la llamada
              </h3>
              <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[16px] md:text-[20px] leading-6 md:leading-8 tracking-[0.25px]">
                Nuestro especialista te contactará en el horario acordado
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
                <a href="#" className="underline hover:no-underline">
                  Política de Cookies
                </a>
                <a
                  href={`https://cdn.builder.io/o/assets%2F${encodedBuilderPublicKey}%2F42bed250c3b54cee8fe7078d269b6957?alt=media&token=b67a2eab-62c7-417a-9bf4-4ad68d3ac484&apiKey=${builderPublicKey}`}
                  download="Politica-de-Privacidad.pdf"
                  target="_blank"
                  className="underline hover:no-underline"
                >
                  Política de Privacidad
                </a>
                <a href="#" className="underline hover:no-underline">
                  Aviso de Privacidad
                </a>
              </nav>
              <div className="flex items-center gap-3 opacity-90">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.89h-2.33v6.987C18.343 21.128 22 16.991 22 12Z"
                    fill="#fff"
                  />
                </svg>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.055 1.97.24 2.43.403a4.92 4.92 0 0 1 1.78 1.034 4.92 4.92 0 0 1 1.034 1.78c.163.46.348 1.26.403 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.055 1.17-.24 1.97-.403 2.43a4.92 4.92 0 0 1-1.034 1.78 4.92 4.92 0 0 1-1.78 1.034c-.46.163-1.26.348-2.43.403-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.055-1.97-.24-2.43-.403a4.92 4.92 0 0 1-1.78-1.034 4.92 4.92 0 0 1-1.034-1.78c-.163-.46-.348-1.26-.403-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.055-1.17.24-1.97.403-2.43a4.92 4.92 0 0 1 1.034-1.78 4.92 4.92 0 0 1 1.78-1.034c.46-.163 1.26-.348 2.43-.403C8.416 2.175 8.796 2.163 12 2.163Zm0 1.62c-3.15 0-3.517.012-4.75.068-1.022.047-1.577.218-1.946.363-.49.19-.84.416-1.208.784a3.3 3.3 0 0 0-.784 1.208c-.145.369-.316.924-.363 1.946-.056 1.233-.068 1.6-.068 4.75s.012 3.517.068 4.75c.047 1.022.218 1.577.363 1.946.19.49.416.84.784 1.208.368.368.718.594 1.208.784.369.145.924.316 1.946.363 1.233.056 1.6.068 4.75.068s3.517-.012 4.75-.068c1.022-.047 1.577-.218 1.946-.363.49-.19.84-.416 1.208-.784.368-.368.594-.718.784-1.208.145-.369.316-.924.363-1.946.056-1.233.068-1.6.068-4.75s-.012-3.517-.068-4.75c-.047-1.022-.218-1.577-.363-1.946a3.3 3.3 0 0 0-.784-1.208 3.3 3.3 0 0 0-1.208-.784c-.369-.145-.924-.316-1.946-.363-1.233-.056-1.6-.068-4.75-.068Zm0 3.905a4.312 4.312 0 1 1 0 8.624 4.312 4.312 0 0 1 0-8.624Zm0 1.62a2.69 2.69 0 1 0 0 5.384 2.69 2.69 0 0 0 0-5.384Zm5.27-2.595a1.001 1.001 0 1 1-2.002 0 1.001 1.001 0 0 1 2.002 0Z"
                    fill="#fff"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Modal Overlay */}
          <div
            className="absolute inset-0 bg-[#0e0e0e] opacity-50"
            onClick={closeModal}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-[20px] w-full max-w-[416px] p-[32px_28px] flex flex-col gap-6">
            {/* Modal Header */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col items-center gap-10">
                <div className="flex flex-col gap-2 w-full">
                  <h2 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8 text-center">
                    Agendar Cita
                  </h2>
                </div>
              </div>

              <div className="flex flex-col items-center gap-10">
                <div className="flex flex-col gap-2 w-full">
                  <p className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[15px] leading-4 tracking-[0.15px] text-center">
                    Registra tus datos para realizar el agendamiento alguno de
                    nuestros agentes se comunicará contigo.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="overflow-y-auto overflow-x-hidden">
              <form
                onSubmit={handleSubmit}
                className="flex min-w-[416px] flex-col gap-6"
              >
                {/* Form Section Header */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-[20px] leading-8 tracking-[0.25px]">
                    Información Personal
                  </h3>

                  {/* Form Fields */}
                  <div className="flex flex-col gap-[18px]">
                    {/* Nombre y apellido */}
                    <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                      <input
                        type="text"
                        placeholder="Nombre y apellido"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      />
                    </div>

                    {/* Identificación */}
                    <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                      <input
                        type="text"
                        placeholder="Identificación"
                        value={formData.identification}
                        onChange={(e) =>
                          handleInputChange("identification", e.target.value)
                        }
                        className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      />
                    </div>

                    {/* Correo electrónico */}
                    <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      />
                    </div>

                    {/* Teléfono */}
                    <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center">
                      <input
                        type="tel"
                        placeholder="Teléfono"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none placeholder:text-[#0e0e0e]"
                      />
                    </div>

                    {/* Fecha */}
                    <div className="relative calendar-container">
                      <div
                        className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center gap-[10px] cursor-pointer"
                        onClick={openCalendar}
                      >
                        <div className="flex items-center gap-[10px] flex-1">
                          <input
                            type="text"
                            placeholder="Fecha"
                            value={formData.date}
                            readOnly
                            className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none cursor-pointer"
                          />
                        </div>
                        <div className="flex w-6 h-6 justify-center items-center flex-shrink-0">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M7 10l5 5 5-5z" fill="#0E0E0E" />
                          </svg>
                        </div>
                      </div>

                      {/* Calendar Picker */}
                      {isCalendarOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-black/[0.42] rounded-[4px] shadow-lg z-50 p-4 w-[300px]">
                          {/* Calendar Header */}
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => navigateMonth("prev")}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M15 18l-6-6 6-6"
                                  stroke="#0E0E0E"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>

                            <div className="text-[#0e0e0e] font-['Source_Sans_Pro'] text-base font-medium capitalize">
                              {getMonthName()} {getYear()}
                            </div>

                            <button
                              type="button"
                              onClick={() => navigateMonth("next")}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M9 18l6-6-6-6"
                                  stroke="#0E0E0E"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>

                          {/* Day Labels */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["S", "M", "T", "W", "T", "F", "S"].map(
                              (day, index) => (
                                <div
                                  key={index}
                                  className="text-center text-[#666] font-['Source_Sans_Pro'] text-sm py-2 font-medium"
                                >
                                  {day}
                                </div>
                              ),
                            )}
                          </div>

                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1 mb-4">
                            {getDaysInMonth().map((day, index) => (
                              <div
                                key={index}
                                className="h-8 flex items-center justify-center"
                              >
                                {day && (
                                  <button
                                    type="button"
                                    onClick={() => selectDate(day)}
                                    className="w-8 h-8 flex items-center justify-center text-[#0e0e0e] font-['Source_Sans_Pro'] text-sm hover:bg-[#6574f8] hover:text-white rounded cursor-pointer transition-colors"
                                  >
                                    {day}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Footer */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={closeCalendar}
                              className="flex-1 h-9 px-3 bg-white border border-[#0c0e45] rounded-[50px] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-[#0c0e45] text-xs font-bold leading-9 tracking-[1.25px] uppercase text-center">
                                CANCELAR
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hora */}
                    <div className="h-14 px-3 py-2 border border-black/[0.42] rounded-[4px] flex items-center gap-[10px]">
                      <div className="flex items-center gap-[10px] flex-1">
                        <select
                          value={formData.time}
                          onChange={(e) =>
                            handleInputChange("time", e.target.value)
                          }
                          className="flex-1 text-base font-normal text-[#0e0e0e] leading-6 tracking-[0.5px] bg-transparent border-none outline-none appearance-none"
                        >
                          <option value="">Hora</option>
                          <option value="09:00">09:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="14:00">02:00 PM</option>
                          <option value="15:00">03:00 PM</option>
                          <option value="16:00">04:00 PM</option>
                        </select>
                      </div>
                      <div className="flex w-6 h-6 justify-center items-center flex-shrink-0">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M7 10l5 5 5-5z" fill="#0E0E0E" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  {/* Agendar Cita Button */}
                  <button
                    type="submit"
                    className="h-11 px-4 bg-[#0c0e45] rounded-[50px] flex items-center justify-center gap-4 cursor-pointer hover:bg-[#0c0e45]/90 transition-colors"
                  >
                    <span className="text-white text-sm font-bold leading-9 tracking-[1.25px] uppercase text-center">
                      AGENDAR CITA
                    </span>
                  </button>

                  {/* Cancelar Button */}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-11 px-4 bg-white border border-[#0c0e45] rounded-[50px] flex items-center justify-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-[#0c0e45] text-sm font-bold leading-9 tracking-[1.25px] uppercase text-center">
                      CANCELAR
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Modal Overlay */}
          <div
            className="absolute inset-0 bg-[#0e0e0e] opacity-50"
            onClick={closeConfirmationModal}
          ></div>

          {/* Confirmation Modal Content */}
          <div className="relative bg-white rounded-[20px] w-[414px] flex flex-col shadow-[0_11px_15px_0_rgba(0,0,0,0.20)]">
            {/* Modal Header */}
            <div className="flex p-4 items-start gap-2 self-stretch bg-white rounded-t-[20px]">
              <div className="flex-1 text-[#0e0e0e] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-8">
                ¡Confirmación de solicitud!
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex px-4 pb-4 flex-col items-start gap-2 self-stretch">
              <div className="self-stretch text-[#0e0e0e] font-['Source_Sans_Pro'] text-[15px] leading-4 tracking-[0.15px]">
                Tu solicitud ha sido registrada con el número de expediente
                EXP123456. Un agente se pondrá en contacto contigo en breves
                minutos.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex p-2 justify-end items-center gap-2 self-stretch">
              <button
                type="button"
                onClick={closeConfirmationModal}
                className="flex h-9 px-4 items-center gap-4 rounded cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex py-[11px] items-center gap-2 self-stretch">
                  <span className="text-[#0c0e45] text-center font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase">
                    ENTENDIDO
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
