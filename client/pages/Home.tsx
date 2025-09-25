import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-[#0C0E45] rounded-b-[20px] md:rounded-b-[50px] h-[300px] md:h-[425px]">
        <div className="relative w-full max-w-[1440px] mx-auto px-4 md:px-8">
          {/* Background Images */}
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/aa522e475c35958159de6477a0c62dd213728f3c?width=2302"
            alt="Background overlay"
            className="absolute left-[-50px] md:left-[-280px] top-[20px] md:top-[44px] w-[400px] md:w-[1075px] h-[200px] md:h-[388px] object-cover"
          />

          {/* Blue angled overlay */}
          <svg
            className="absolute left-[150px] md:left-[369px] top-[10px] md:top-[19px] w-[600px] md:w-[1295px] h-[280px] md:h-[421px] fill-[#0C0E45]"
            viewBox="0 0 982 425"
            preserveAspectRatio="none"
          >
            <path
              d="M1295 -8L948.145 451H0L348.048 -8H1295Z"
              fill="#0C0E45"
              style={{ marginLeft: "-3px" }}
            />
          </svg>

          {/* Hero Content */}
          <div className="absolute right-4 md:left-[759px] top-[30px] md:top-[51px] w-full max-w-[350px] md:w-[470px] text-center md:text-right text-white px-4 md:px-0">
            <div className="text-[24px] md:text-[48px] leading-[28px] md:leading-[50px] font-['Publico_Text_Web'] w-full md:w-[471px] md:ml-auto">
              <h4 className="inline">
                <div>
                  <p>
                    Descubrelas asistencias disponibles en cualquier momento
                  </p>
                </div>
                <br />
              </h4>
            </div>
            <p className="text-[14px] md:text-[20px] leading-[20px] md:leading-[32px] tracking-[0.25px] w-full md:w-[480px] md:ml-auto font-['Source_Sans_Pro'] mt-2 md:mt-0">
              Bienvenido al portal de Beneficios, accede a las diferentes
              asistencias que tenemos diseñadas para ti.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="max-w-[765px] text-center">
            <h2 className="text-[#0E0E0E] font-['Publico_Text_Web'] text-[34px] leading-[40px] tracking-[0.25px] mb-2">
              Beneficios
            </h2>
            <p className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-[20px] leading-[32px] tracking-[0.25px]">
              Encuentra la asistencia que necesitas y aprovecha todas las
              ventajas que tenemos para ti.
            </p>
          </div>
          <div className="w-[177px] h-[2px] bg-[#6574F8]"></div>
        </div>

        {/* Cards */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-5 px-4 md:px-8 lg:px-[129px]">
          {/* Bienestar Card */}
          <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden shadow-sm">
            <div className="w-full h-[110px] relative">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/8498c1d75b9f3087ea110a2f85e6bf01552d528d?width=746"
                alt="Bienestar"
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
                    d="M39.5625 25.4375C41.7636 25.4375 43.6259 26.208 45.1777 27.7598C46.7295 29.3116 47.5 31.1739 47.5 33.375C47.5 34.7816 47.2788 35.9957 46.8506 37.0273C46.4142 38.0785 45.8446 38.9484 45.1465 39.6465L32.7715 52.0215C32.4436 52.3494 32.0879 52.5782 31.7041 52.7178C31.297 52.8658 30.8964 52.9375 30.5 52.9375C30.1036 52.9375 29.703 52.8658 29.2959 52.7178C28.9121 52.5782 28.5564 52.3494 28.2285 52.0215L15.8535 39.6465C15.1554 38.9484 14.5858 38.0785 14.1494 37.0273C13.7212 35.9957 13.5 34.7816 13.5 33.375C13.5 31.1739 14.2705 29.3116 15.8223 27.7598C17.3741 26.208 19.2364 25.4375 21.4375 25.4375C22.4584 25.4375 23.391 25.6688 24.2441 26.1279C25.1327 26.6061 25.9119 27.1814 26.584 27.8535L30.5 31.7695L34.416 27.8535C35.0881 27.1814 35.8673 26.6061 36.7559 26.1279C37.609 25.6688 38.5416 25.4375 39.5625 25.4375Z"
                    fill="#FF1721"
                    stroke="white"
                  />
                </svg>
                <h3 className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-[32px]">
                  Bienestar
                </h3>
              </div>
              <p className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                Realiza el agendamiento de tu cita y recibe el apoyo que
                necesitas.
              </p>
              <Link
                to="/bienestar"
                className="text-[#0C0E45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
              >
                ACCEDER A SERVICIOS
              </Link>
            </div>
          </div>

          {/* Formación Card */}
          <div className="w-full max-w-[373px] bg-white rounded-[10px] overflow-hidden shadow-sm">
            <div className="w-full h-[110px] relative">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/cced39f395f6e1425bb10f30116d78d708dcaac4?width=746"
                alt="Formación"
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
                    d="M15.5625 40.6074L15.8213 40.75L30.1963 48.6875L30.4375 48.8213L30.6787 48.6875L45.0537 40.75L45.3125 40.6074V28.9766L44.5762 29.3721L32.0137 36.1221L32.002 36.1279C31.7495 36.2722 31.5059 36.3665 31.2705 36.417C31.017 36.4713 30.7397 36.5 30.4375 36.5C30.1348 36.5 29.8711 36.4715 29.6436 36.4189C29.429 36.3694 29.1933 36.2752 28.9355 36.1279L28.9268 36.123L16.3018 29.248L15.5625 28.8457V40.6074ZM30.2002 11.4971L10.6377 22.0596L9.83008 22.4961L10.6338 22.9385L30.1963 33.6885L30.4365 33.8203L30.6768 33.6885L50.3643 22.9385L51.1758 22.4961L50.3613 22.0596L30.6738 11.4971L30.4365 11.3701L30.2002 11.4971ZM12.8125 27.2666L12.5537 27.124L6.31445 23.6924C6.0394 23.5183 5.85534 23.3329 5.73926 23.1436L5.73828 23.1426C5.62219 22.9532 5.5625 22.7423 5.5625 22.498C5.56251 22.2542 5.62232 22.0439 5.73828 21.8555C5.85487 21.6661 6.04046 21.4799 6.31836 21.3047L28.8652 8.93848L28.873 8.93457C29.1235 8.79147 29.3708 8.69636 29.6152 8.64551C29.8806 8.59024 30.1545 8.5625 30.4375 8.5625C30.7205 8.5625 30.9944 8.59024 31.2598 8.64551C31.5042 8.69636 31.7515 8.79147 32.002 8.93457L32.0117 8.93945L56.7432 22.3672C56.9456 22.4949 57.0998 22.6334 57.2139 22.7812L57.3164 22.9346C57.4393 23.1483 57.5 23.3757 57.5 23.625V40.4375C57.5 40.8417 57.368 41.1571 57.1055 41.418L57.1045 41.4189C56.842 41.6802 56.5227 41.8125 56.1133 41.8125C55.7046 41.8124 55.3918 41.6799 55.1377 41.4219C54.8811 41.1617 54.75 40.8451 54.75 40.4375V23.874L54.0244 24.2412L48.3369 27.1162L48.0625 27.2549V40.3125C48.0625 40.9448 47.9075 41.5016 47.6045 41.9961C47.3327 42.44 46.9871 42.7993 46.5635 43.0771L46.377 43.1904L32.0098 51.0615L32.002 51.0654C31.7515 51.2085 31.5042 51.3036 31.2598 51.3545C30.9944 51.4098 30.7205 51.4375 30.4375 51.4375C30.1545 51.4375 29.8806 51.4098 29.6152 51.3545C29.3708 51.3036 29.1235 51.2085 28.873 51.0654L28.8652 51.0615L14.4971 43.1904H14.498C13.9886 42.8993 13.5811 42.5033 13.2705 41.9961C12.9675 41.5016 12.8125 40.9448 12.8125 40.3125V27.2666Z"
                    fill="#FF1721"
                    stroke="white"
                  />
                </svg>
                <h3 className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-[23px] font-semibold leading-[32px]">
                  Formación
                </h3>
              </div>
              <p className="text-[#0E0E0E] font-['Source_Sans_Pro'] text-sm leading-[22px] tracking-[0.1px] mb-4">
                Inscríbete y accede a cursos y herramientas que impulsan tu
                desarrollo profesional y personal.
              </p>
              <Link
                to="/formacion"
                className="text-[#0C0E45] font-['Source_Sans_Pro'] text-sm font-bold leading-9 tracking-[1.25px] uppercase hover:underline"
              >
                EXPLORAR CURSOS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 24/7 Section */}
      <section className="bg-white py-8 md:py-[52px]">
        <div className="flex justify-center items-center px-4 md:px-8 lg:px-[142px]">
          <div className="text-center">
            <div className="text-[#FF1721] font-['Publico_Text_Web'] text-[36px] md:text-[57px] leading-[40px] md:leading-[60px] tracking-[0.5px] mb-1">
              24/7
            </div>
            <div className="text-[#666] font-['Source_Sans_Pro'] text-[18px] md:text-[23px] font-semibold leading-[24px] md:leading-[32px]">
              Atención disponible
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0E0E0E] text-white py-6">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-[140px]">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/8d00000f5bcb9510b7507406e5894f3d5a75c9af?width=84"
                alt="AXA Logo"
                className="w-[42px] h-[42px] rounded-[3px]"
              />
            </div>
            <div className="w-full h-[1px] bg-[#F0F0F0] opacity-40"></div>
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-between w-full gap-4 md:gap-0">
              <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-xs font-['Source_Sans_Pro'] leading-5 tracking-[0.4px] text-center">
                <a
                  href="https://cdn.builder.io/o/assets%2F251da8f29625434a8c872a9913dedea9%2F8b1be5fcd60f49bdbfc969301f2ca7fc?alt=media&token=5022c0df-5c99-41c0-b448-2dd45d432ccc&apiKey=251da8f29625434a8c872a9913dedea9"
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
                  href="https://cdn.builder.io/o/assets%2F251da8f29625434a8c872a9913dedea9%2F42bed250c3b54cee8fe7078d269b6957?alt=media&token=b67a2eab-62c7-417a-9bf4-4ad68d3ac484&apiKey=251da8f29625434a8c872a9913dedea9"
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
    </div>
  );
}
