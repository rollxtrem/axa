# 🧠 Memoria del Proyecto AXA

_Última actualización: 22 de octubre de 2025_

Esta memoria resume el estado funcional del portal AXA y los componentes técnicos más relevantes para continuar su evolución.

## Resumen funcional del frontend

- **Inicio de sesión**: la página principal valida correo y contraseña con Zod, administra el estado de "recordarme" desde `react-hook-form`, muestra errores de servidor y lanza una notificación de éxito antes de redirigir al usuario autenticado al home protegido.【F:client/pages/Index.tsx†L1-L189】
- **Registro de usuarios**: el flujo de alta exige coincidencia de contraseñas, aceptación de términos y número de documento válido; al completar el proceso limpia el formulario y confirma visualmente el registro.【F:client/pages/Register.tsx†L1-L189】
- **Portal de beneficios**: la página `Home` replica el diseño público de AXA, reutiliza recursos de Builder.io y ofrece accesos rápidos a bienestar, formación y descargas legales con enlaces parametrizados.【F:client/pages/Home.tsx†L1-L195】

## Autenticación y persistencia de sesión

- El `AuthProvider` centraliza la comunicación con el backend, almacena tokens y perfil en `localStorage` solo cuando el usuario selecciona "recordarme", y expone flujos de login, registro y logout compatibles con Auth0 y WebAuthn.【F:client/context/AuthContext.tsx†L134-L339】
- Los endpoints sensibles (`/api/demo`, `/api/email/send`, entre otros) exigen un token válido mediante el middleware `requireAuth`, que descarga el JWKS de Auth0, valida la firma y adjunta los claims verificados en la petición.【F:server/index.ts†L53-L69】【F:server/middleware/require-auth.ts†L1-L200】

## API y servicios backend

- El servidor Express registra rutas para autenticación, PQRS, formación, bienestar, SIA, email y diagnóstico desde `createServer`, manteniendo CORS abierto para integraciones corporativas y exponiendo un healthcheck para Azure App Service.【F:server/index.ts†L1-L70】
- El endpoint `/api/email/send` normaliza destinatarios (to/cc/bcc), valida el cuerpo con Zod y delega el envío al servicio SMTP corporativo, retornando el `messageId` recibido.【F:server/routes/email.ts†L1-L74】
- Las peticiones PQRS se reciben cifradas: el backend normaliza la clave pública, desencripta el payload con la clave privada, valida los campos con Zod y dispara una notificación por correo estructurada.【F:server/routes/pqrs.ts†L1-L104】
- Los controladores de bienestar y formación comparten utilitarios de cifrado, generan resúmenes de correo y, cuando aplica, envían la solicitud al servicio SIA junto con una confirmación al usuario.【F:server/routes/bienestar.ts†L1-L200】【F:server/routes/formacion.ts†L1-L200】
- Los controladores de SIA solicitan tokens, sanitizan la carga de archivos y encapsulan errores del servicio externo para entregar mensajes consistentes en la API del portal.【F:server/routes/sia.ts†L1-L199】

## Integraciones externas y configuraciones

- Los controladores de Auth0 soportan login tradicional, registro, callback OAuth 2.0 y flujos de WebAuthn, traduciendo los errores del proveedor a respuestas normalizadas para el cliente.【F:server/routes/auth.ts†L1-L199】
- Los enlaces legales del home interpolan la clave pública de Builder.io en tiempo de ejecución gracias a los utilitarios `builderPublicKey` y `encodedBuilderPublicKey`, evitando editar URL manualmente cuando cambian las credenciales.【F:client/lib/builder.ts†L1-L16】【F:client/pages/Home.tsx†L3-L188】

## Próximos pasos sugeridos

1. Configurar las credenciales definitivas de Auth0, SMTP y servicios SIA en los entornos destino antes de publicar.
2. Instrumentar monitoreo y métricas para los endpoints críticos (PQRS, SIA, bienestar) y alertas sobre errores de integración.
3. Documentar los procesos operativos para rotación de claves públicas/privadas y los periodos de validez de los tokens emitidos.
