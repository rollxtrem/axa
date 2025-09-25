import React from "react";
import { Link } from "react-router-dom";

export default function PoliticaCookies() {
  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Content Section */}
      <div className="relative pt-[134px]">
        {/* Main Content Container */}
        <div className="max-w-4xl mx-auto px-8 py-12 bg-white shadow-lg rounded-lg">
          <h1 className="text-3xl font-bold text-center mb-8 font-['Merriweather',serif]">
            POLÍTICA DE COOKIES
          </h1>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Una <strong>cookie</strong> es un{" "}
              <strong>archivo de datos pequeño (archivo de texto)</strong> que
              un sitio web, al ser visitado por un usuario, le pide a su
              navegador <strong>mantener información</strong> sobre usted, tal
              como sus <strong>preferencias de idioma o información</strong>.
              AXA Partners recopila y establece cookies "internas" durante su
              visita a{" "}
              <a
                href="https://siempreprotegido.axa-assistance.com.co"
                className="text-blue-600 underline"
              >
                siempreprotegido.axa-assistance.com.co
              </a>
              , según los fines descritos en la presente política.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                ACTUALIZACIÓN DE LA PRESENTE POLÍTICA
              </h2>
              <p>
                AXA Partners puede actualizar la presente política de cookies
                oportunamente en respuesta a cambios sobre las cookies
                descargadas al navegar al sitio web{" "}
                <a
                  href="https://siempreprotegido.axa-assistance.com.co"
                  className="text-blue-600 underline"
                >
                  siempreprotegido.axa-assistance.com.co
                </a>
                . La última actualización de la presente política de privacidad
                fue el 23 de junio de 2023.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                ¿QUIÉNES SON LOS CONTROLADORES DE DATOS DE SUS DATOS PERSONALES?
              </h2>
              <p>
                <strong>AXA Partners Colombia</strong> (AXA Asistencia Colombia
                S.A, AXA Asistencia IPS. y AXA Partners SAS CLP Operaciones
                Colombia), ubicado en la calle 102 N°14 - 51, Bogotá D.C., actúa
                como controlador de datos independiente de sus datos personales
                (significa que determina los fines y medios del tratamiento de
                sus datos personales).
              </p>
              <p>
                En la presente política, el controlador de datos independiente
                se denomina "<strong>AXA Partners</strong>" o "
                <strong>Controlador de Datos</strong>" o "
                <strong>nosotros</strong>" o "<strong>nuestro</strong>".
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                ¿CUÁLES SON SUS DERECHOS RELATIVOS A SUS DATOS?
              </h2>
              <p>
                El depósito de cookies puede implicar el procesamiento de sus
                datos personales. En tal caso, y de acuerdo con los requisitos
                del RGPD, usted tiene derechos que puede ejercer. Consulte
                nuestra{" "}
                <a href="#" className="text-blue-600 underline">
                  Política de privacidad
                </a>{" "}
                para consultar dichos derechos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                ¿CÓMO CONTACTAR AL DPO PARA ABORDAR UN PEDIDO O EJERCER SUS
                DERECHOS?
              </h2>
              <p>
                Si tiene alguna pregunta, queja o comentario con respecto a este
                aviso informativo o para ejercer los derechos antes mencionados,
                comuníquese por correo electrónico a{" "}
                <a
                  href="mailto:dataprivacy@axa-assistance.com.co"
                  className="text-blue-600 underline"
                >
                  dataprivacy@axa-assistance.com.co
                </a>
                . Su solicitud se redirigirá en consecuencia al DPO
                correspondiente. Los socios de AXA pueden solicitar información
                adicional para confirmar su identidad y/o ayudar a localizar los
                datos que está buscando.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                ¿CÓMO HACER UN RECLAMO A UNA AUTORIDAD DE SUPERVISIÓN?
              </h2>
              <p>
                Usted tiene derecho a plantear sus dudas sobre cómo se están
                tratando sus datos personales ante una autoridad de control
                competente, en el país de residencia habitual, lugar de trabajo
                o lugar donde crea que se ha producido una supuesta vulneración
                de sus derechos.
              </p>
              <p>
                En Colombia, es la Superintendencia de Industria y Comercio, que
                tiene la atribución de atender las denuncias y reclamos que
                interpongan quienes consideren que se han vulnerado sus derechos
                por incumplimiento de las normas vigentes en materia de
                protección de datos personales. Visite{" "}
                <a
                  href="https://www.sic.gov.co"
                  className="text-blue-600 underline"
                >
                  www.sic.gov.co
                </a>{" "}
                para obtener información adicional en la materia.
              </p>
              <p>
                El listado de autoridades de protección de datos en la Unión
                Europea está disponible a través del siguiente enlace:{" "}
                <a
                  href="https://ec.europa.eu/justice/article-29/structure/data-protection-authorities_en.htm"
                  className="text-blue-600 underline"
                >
                  ec.europa.eu/justice/article-29/structure/data-protection-authorities_en.htm
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                ¿CUÁLES SON LAS CATEGORÍAS DE LAS COOKIES QUE SE DESCARGAN
                DURANTE LA NAVEGACIÓN EN NUESTRO SITIO WEB Y CUÁLES SON SUS
                FINALIDADES?
              </h2>

              <h3 className="text-lg font-medium mb-4 text-gray-800">
                Lista de cookies
              </h3>

              <div className="mb-6">
                <h4 className="text-base font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                  COOKIES FUNCIONALES Y TÉCNICAS (COOKIES ESTRICTAMENTE
                  NECESARIAS)
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Estas cookies son necesarias para que el sitio web funcione
                  correctamente y los otros sistemas. Normalmente{" "}
                  <strong>
                    solo se fijan en respuesta a acciones que usted hace para
                    solicitar servicios
                  </strong>
                  , tales como configurar sus preferencias de privacidad,
                  iniciar sesión o completar formularios. Usted puede configurar
                  su navegador para bloquear o recibir una alerta sobre estas
                  cookies, pero en tal caso algunas partes del sitio web no
                  funcionarán.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Cookies
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Subgrupo de cookies
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Ciclo de vida
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Cookies utilizadas
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Descripción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">
                          OptanonAlertBoxClosed
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          siempreprotegido.axa-assistance.com.co
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          6 Meses
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Propia
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Esta cookie se coloca una vez que los visitantes han
                          recibido la información de la política de cookies y
                          han cerrado el aviso que el sitio no muestre el banner
                          cada vez que los visitantes se conectan.
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">
                          1TpoooooooS
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          siempreprotegido.axa-assistance.com.co
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Sesión
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Propia
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Esta cookie forma parte del módulo de seguridad del
                          sitio web. Valida las cookies de dominio y califica el
                          subdominio, así como la integridad de las cookies de
                          marco de módulo o de función, y detecta cuando expira
                          la sesión del usuario.
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">
                          OptanonConsent
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          siempreprotegido.axa-assistance.com.co
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          6 Meses
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Propia
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          Estas cookies almacenan información relativa a las
                          categorías de cookies depositadas en el sitio web y si
                          los visitantes han dado o retirado el consentimiento
                          por parte de los usuarios para cada una de ellas. Esto
                          permite impedir que se depositen cookies en ausencia
                          de consentimiento.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-base font-semibold mb-3 text-gray-800">
                  ¿ES OBLIGATORIA LA DESCARGA DE COOKIES?
                </h4>
                <p className="text-sm text-gray-600">
                  Las cookies instaladas en el sitio web pueden actualizar la
                  presente política de cookies oportunamente en respuesta a
                  cambios sobre las cookies descargadas al navegar el sitio web{" "}
                  <a
                    href="https://siempreprotegido.axa-assistance.com.co"
                    className="text-blue-600 underline"
                  >
                    siempreprotegido.axa-assistance.com.co
                  </a>
                  .{" "}
                  <strong>
                    son cookies estrictamente necesarias y su uso es obligatorio
                  </strong>{" "}
                  para que el sitio web funcione correctamente.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0e0e0e] text-white py-8">
        <div className="max-w-[1440px] mx-auto px-[140px]">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/8d00000f5bcb9510b7507406e5894f3d5a75c9af?width=84"
                alt="AXA Logo"
                className="w-[42px] h-[42px] rounded-[3px]"
              />
            </div>
            <div className="w-full h-[1px] bg-[#f0f0f0] opacity-40"></div>
            <div className="flex items-center justify-between w-full">
              <nav className="flex items-center gap-6 text-xs font-['Source_Sans_Pro'] leading-5 tracking-[0.4px]">
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
