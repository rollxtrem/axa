# 🧠 Memoria del Proyecto AXA

_Última actualización: 17 de octubre de 2025_

Esta memoria resume el estado funcional del portal AXA y los componentes técnicos más relevantes para continuar su evolución.

## Resumen funcional del frontend

- **Inicio de sesión**: la página principal implementa validaciones con Zod y `react-hook-form`, gestiona el estado de "recordarme" y muestra una notificación de éxito antes de redirigir al usuario autenticado al home protegido.【F:client/pages/Index.tsx†L1-L189】
- **Registro de usuarios**: el flujo de alta valida coincidencia de contraseñas, términos y condiciones y provee retroalimentación visual al completar el proceso, dejando el formulario listo para un nuevo registro.【F:client/pages/Register.tsx†L1-L190】
- **Portal de beneficios**: la página `Home` replica el diseño público de AXA y expone accesos rápidos a bienestar, formación y otros servicios con recursos obtenidos dinámicamente desde Builder.io.【F:client/pages/Home.tsx†L1-L214】

## Autenticación y persistencia de sesión

- El `AuthProvider` centraliza la comunicación con el backend, administra tokens de acceso/refresh, respeta la preferencia de persistencia en `localStorage` y ofrece flujos de login, registro y logout compatibles con Auth0 y WebAuthn.【F:client/context/AuthContext.tsx†L1-L339】
- Los endpoints sensibles (`/api/demo`, `/api/email/send`, entre otros) exigen un token válido mediante el middleware `requireAuth`, que verifica firmas JWT frente al JWKS de Auth0.【F:server/index.ts†L47-L69】【F:server/middleware/require-auth.ts†L1-L200】

## API y servicios backend

- El servidor Express expone rutas para autenticación, PQRS, formación, bienestar, SIA y utilidades de diagnóstico, todas habilitadas en `createServer` para su despliegue en Azure App Service.【F:server/index.ts†L1-L70】
- El endpoint `/api/email/send` normaliza destinatarios, valida el cuerpo con Zod y delega el envío al servicio SMTP corporativo.【F:server/routes/email.ts†L1-L53】
- Las peticiones PQRS se reciben cifradas: el backend recupera la clave privada, desencripta el payload, valida los campos y dispara una notificación por correo con el contenido estructurado.【F:server/routes/pqrs.ts†L1-L138】
- Los controladores de SIA solicitan tokens, sanitizan la carga de archivos y reportes, y encapsulan errores provenientes del servicio externo para mantener mensajes consistentes en la API.【F:server/routes/sia.ts†L1-L199】

## Integraciones externas y configuraciones

- Los controladores de Auth0 soportan login tradicional, registro, callback OAuth 2.0 y flujos de WebAuthn, traduciendo los errores del proveedor a respuestas normalizadas para el cliente.【F:server/routes/auth.ts†L1-L199】
- Los enlaces legales del home interpolan la clave pública de Builder.io en tiempo de ejecución gracias a los utilitarios `builderPublicKey` y `encodedBuilderPublicKey`, evitando editar URL manualmente cuando cambian las credenciales.【F:client/lib/builder.ts†L1-L16】【F:client/pages/Home.tsx†L180-L206】

## Próximos pasos sugeridos

1. Configurar las credenciales definitivas de Auth0, SMTP y servicios SIA en los entornos destino antes de publicar.
2. Instrumentar monitoreo y métricas para los endpoints críticos (PQRS, SIA) y alertas sobre errores de integración.
3. Documentar los procesos operativos para rotación de claves públicas/privadas y los periodos de validez de los tokens emitidos.
