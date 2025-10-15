# AXA - Sistema de Registro e Inicio de Sesión

Una aplicación completa de registro e inicio de sesión desarrollada con React, TypeScript, Tailwind CSS y Express, siguiendo el diseño exacto de AXA.

## 🚀 Características

- ✅ **Diseño pixel-perfect** de AXA con Figma
- ✅ **Formulario de registro** completo con validación
- ✅ **Formulario de inicio de sesión** funcional
- ✅ **Notificaciones de éxito** personalizadas
- ✅ **Navegación entre páginas** sin recarga
- ✅ **Responsive design** para todos los dispositivos
- ✅ **TypeScript** para type safety
- ✅ **Tailwind CSS** para estilos
- ✅ **Express server** integrado

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (viene incluido con Node.js) o **pnpm** (opcional)

Para verificar que tienes Node.js instalado:

```bash
node --version
npm --version
```

## 🛠️ Instalación y Configuración

### 1. Descomprimir y Navegar al Proyecto

```bash
# Descomprime el archivo zip y navega al directorio
cd fusion-starter
```

### 2. Instalar Dependencias

```bash
# Con npm (recomendado)
npm install

# O con pnpm (si lo prefieres)
pnpm install

# Si tienes problemas, limpia e instala de nuevo
npm run install:clean
```

### 3. Configurar Variables de Entorno (Opcional)

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita el archivo .env si necesitas cambiar configuraciones
# Por defecto, el proyecto funciona sin configuración adicional
```

#### Configurar la URL base del API en producción

Cuando la aplicación web y el API se despliegan en hosts diferentes (por ejemplo, `https://mi-app.azurewebsites.net` para el
frontend y `https://mi-api.azurewebsites.net` para el backend), define la variable `VITE_API_BASE_URL` en el entorno de build
del cliente:

```bash
VITE_API_BASE_URL="https://mi-api.azurewebsites.net"
```

La aplicación utilizará automáticamente esta URL como prefijo para todas las llamadas al API (`/api/...`). Si la variable no se
define, el cliente usará el mismo host en el que está alojada la SPA.

#### Actualizar el contenido público de Builder.io

Algunos enlaces a documentos legales se sirven desde Builder.io. La clave pública utilizada para descargar estos archivos se lee de la variable `VITE_PUBLIC_BUILDER_KEY`. Por defecto, el proyecto incluye la clave configurada actualmente, pero puedes reemplazarla en tu `.env`:

```bash
VITE_PUBLIC_BUILDER_KEY="tu-clave-publica"
```

El código del frontend utiliza esta variable para interpolar dinámicamente la clave en las URLs que apuntan a los activos almacenados en Builder.io, por lo que no necesitas modificar cada enlace manualmente cuando cambie la clave. En caso de que la variable no esté definida, se usa la clave por defecto incluida en el repositorio para mantener la compatibilidad.【F:client/lib/builder.ts†L1-L14】【F:client/pages/Home.tsx†L2-L3】【F:client/pages/Home.tsx†L182-L197】

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

¡Eso es todo! El proyecto debería abrirse automáticamente en tu navegador en `http://localhost:8080`

## 🎯 Uso de la Aplicación

### Página de Inicio de Sesión

- Navega a `http://localhost:8080`
- Completa los campos: Nombre completo, Correo electrónico, Número de documento
- Marca "Recordarme" si deseas (opcional)
- Haz clic en "INICIAR SESIÓN"
- Verás una notificación de éxito en la esquina superior izquierda

### Página de Registro

- Desde la página de inicio, haz clic en "Regístrate"
- O navega directamente a `http://localhost:8080/register`
- Completa todos los campos requeridos
- Acepta los términos y condiciones
- Haz clic en "REGISTRARSE"
- Verás una notificación de "Registro exitoso"

### Navegación

- La aplicación utiliza React Router para navegación sin recarga
- Puedes navegar entre login y registro usando los enlaces en cada página

## 📁 Estructura del Proyecto

```
fusion-starter/
├── client/                 # Frontend React
│   ├── components/ui/      # Componentes UI reutilizables
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilidades y helpers
│   ├── pages/             # Páginas de la aplicación
│   │   ├── Index.tsx      # Página de inicio de sesión
│   │   ├── Register.tsx   # Página de registro
│   │   └── NotFound.tsx   # Página 404
│   ├── App.tsx            # Configuración principal y rutas
│   └── global.css         # Estilos globales y Tailwind
├── server/                # Backend Express
│   ├── routes/            # Rutas API
│   ├── index.ts           # Configuración del servidor
│   └── node-build.ts      # Build de producción
├── shared/                # Código compartido (tipos, etc.)
├── public/                # Archivos estáticos
└── dist/                  # Build de producción (generado)
```

## 📬 Envío de Correos vía API

El backend incluye un endpoint para enviar correos electrónicos utilizando los gateways SMTP corporativos con STARTTLS (TLS 1.2).

### Endpoint

- **POST** `/api/email/send`

### Payload

```json
{
  "to": "destinatario@dominio.com",
  "subject": "Asunto del correo",
  "text": "Contenido en texto plano",
  "html": "<p>Contenido en HTML</p>",
  "from": "opcional@dominio.com",
  "cc": ["cc1@dominio.com"],
  "bcc": ["bcc1@dominio.com"]
}
```

- `to` acepta un string con correos separados por coma o un arreglo de strings.
- Debes enviar al menos `text` o `html`.
- `from` es opcional si configuraste `SMTP_DEFAULT_FROM` en el archivo `.env`.

### Respuesta Exitosa

```json
{
  "messageId": "<...>",
  "envelope": {
    "from": "remitente@dominio.com",
    "to": ["destinatario@dominio.com"]
  }
}
```

### Configuración

Configura las variables del archivo `.env` (ver `.env.example`) para elegir entre los gateways de producción o pre-producción y ajustar credenciales, host o políticas TLS según el ambiente.

## 🔧 Scripts Disponibles

| Comando              | Descripción                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Inicia el servidor de desarrollo             |
| `npm run build`      | Construye la aplicación para producción      |
| `npm run start`      | Ejecuta la aplicación en modo producción     |
| `npm run preview`    | Construye y ejecuta la versión de producción |
| `npm run test`       | Ejecuta las pruebas                          |
| `npm run typecheck`  | Verifica tipos de TypeScript                 |
| `npm run format.fix` | Formatea el código con Prettier              |

## 🏗️ Build de Producción

Para crear una versión optimizada para producción:

```bash
# Construir la aplicación
npm run build

# Ejecutar la versión de producción
npm run start
```

La aplicación estará disponible en `http://localhost:3000` (o el puerto configurado en .env)

> ℹ️ **Nota sobre despliegues**: Para entornos administrados (como Netlify, Vercel o Azure Static Web Apps) no es necesario incluir un archivo `web.config`. La aplicación funciona correctamente con la configuración estándar generada por Vite.

## ☁️ Despliegue en Azure App Service (Windows)

Sigue estas recomendaciones para que el paquete publicado por la canalización funcione sin ajustes manuales al desplegar en un App Service Windows:

1. **Versión de Node.js**: el proyecto requiere Node.js `22.16.0`. Azure detectará automáticamente esta versión gracias al campo `engines` del `package.json`, pero valida que el App Service tenga configurado `WEBSITE_NODE_DEFAULT_VERSION=22.16.0`.
2. **Construcción idéntica al pipeline**: ejecuta localmente `npm ci`, `npm run build` y `npm prune --omit=dev` para validar exactamente el mismo artefacto que la canalización genera.
3. **Estructura del artefacto**: el paquete ZIP debe contener en la raíz los directorios `dist/` y `node_modules/` junto con `package.json`, `package-lock.json`, `azure-server.js` y `web.config`. La canalización ya copia estos archivos y los publica como `package.zip`.
4. **Bundle de servidor**: confirma que `dist/server/production.mjs` exista y que `dist/server/spa/` contenga la Single Page Application; de lo contrario, el `azure-server.js` no podrá inicializar el servidor.
5. **Comando de inicio**: no configures un comando personalizado. El `web.config` enruta todas las peticiones a `azure-server.js`, que a su vez inicia el bundle generado.
6. **Health check**: configura el `Health check path` del App Service en `/health`. La API expone ese endpoint para que Azure pueda calentar la instancia sin impactar a los usuarios.
7. **Variables opcionales**: si usas `WEBSITE_RUN_FROM_PACKAGE=1`, publica exactamente el `package.zip` generado por la canalización. Si necesitas mensajes personalizados, define `PING_MESSAGE` para que `/api/ping` refleje el entorno.

Con estos ajustes el despliegue en Azure App Service Windows replica fielmente el entorno empaquetado por la canalización y garantiza que la aplicación responda desde el primer arranque.

## 🎨 Personalización

### Colores y Estilos

- Los colores de AXA están definidos en `client/global.css` y `tailwind.config.ts`
- Color principal AXA: `#0c0e45`
- Puedes modificar los estilos editando las clases de Tailwind

### Fuentes

- La aplicación usa **Source Sans Pro** como se especifica en el diseño de AXA
- Las fuentes se cargan desde Google Fonts automáticamente

### Componentes

- Los componentes UI están en `client/components/ui/`
- Las páginas principales están en `client/pages/`
- Puedes agregar nuevas páginas siguiendo el patrón existente

## 🔄 Agregando Nuevas Rutas

1. Crea un nuevo componente en `client/pages/`
2. Importa el componente en `client/App.tsx`
3. Agrega la ruta en el componente `Routes`

Ejemplo:

```tsx
// En App.tsx
import NuevaPagina from "./pages/NuevaPagina";

// En las rutas
<Route path="/nueva-pagina" element={<NuevaPagina />} />;
```

## 🚨 Solución de Problemas

### Problema: "Cannot find module" o errores de TypeScript

**Solución:**

```bash
npm run typecheck
npm run install:clean
```

### Problema: Estilos no se cargan correctamente

**Solución:**

- Verifica que Tailwind CSS esté funcionando
- Ejecuta `npm run dev` de nuevo
- Limpia el caché del navegador (Ctrl+F5)

### Problema: Puerto 8080 ya en uso

**Solución:**

- Cambia el puerto en `vite.config.ts`
- O mata el proceso: `lsof -ti:8080 | xargs kill -9` (Mac/Linux)

### Problema: Build falla

**Solución:**

```bash
npm run typecheck
npm run format.fix
npm run build
```

## 📱 Responsive Design

La aplicación está optimizada para:

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

Los formularios se adaptan automáticamente a todos los tamaños de pantalla.

## 🛡️ Seguridad

Para producción, considera:

- Implementar validación real del lado del servidor
- Agregar autenticación JWT
- Configurar HTTPS
- Implementar rate limiting
- Validar y sanitizar inputs

### Protección y consumo de las APIs REST con Auth0

Sigue estos pasos para aprovechar la integración con Auth0 recién agregada y exigir tokens en los endpoints del backend:

1. **Configura las variables del servidor** en tu `.env` (o como variables de entorno en producción):
   - `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` y `AUTH0_CLIENT_SECRET` siempre son obligatorias.
   - `AUTH0_DB_CONNECTION` solo es necesaria para el registro y el inicio de sesión con usuario y contraseña; los flujos de WebAuthn únicamente requieren el dominio y las credenciales del cliente.
   - Define `AUTH0_AUDIENCE` si tus tokens deben tener como audiencia una API personalizada. Si se omite, el backend aceptará el audience del _Management API_ de Auth0.
   - Las redirecciones del frontend utilizan `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` y opcionalmente `VITE_AUTH0_AUDIENCE` para construir el enlace hacia `/authorize`. Estos valores suelen coincidir con los del backend.
   - Ejemplo de configuración para el tenant de desarrollo:

     ```env
     AUTH0_DOMAIN=axa-partners-colpatria-co-customers-dev.us.auth0.com
     AUTH0_CLIENT_ID=sApJYhUMEVH64YWfkXD9HZRn2IF5ZARq
     AUTH0_CLIENT_SECRET=NUzdPuD_tVNY7GpsYUc8WhoPzpjppRI5Qq5rSHHIQYwjGyCTsot0T02YcdgekwIv
     AUTH0_DB_CONNECTION=Username-Password-Authentication
     VITE_AUTH0_DOMAIN=axa-partners-colpatria-co-customers-dev.us.auth0.com
     VITE_AUTH0_CLIENT_ID=sApJYhUMEVH64YWfkXD9HZRn2IF5ZARq
     VITE_AUTH0_AUDIENCE=https://axa-partners-colpatria-co-customers-dev.us.auth0.com/api/v2/
     ```

     Para usar el tenant de pruebas, sustituye los valores por los proporcionados por el equipo (`axa-partners-colpatria-co-customers-test...`).
2. **Habilita la autenticación en el cliente** activando el feature flag `VITE_ENABLE_AUTH=true`. Esto muestra las pantallas de login/registro y permite almacenar el token en `localStorage` cuando el usuario marca "Recordarme".
3. **Protege cualquier endpoint de Express** importando el _middleware_ `requireAuth` y añadiéndolo antes del handler:

   ```ts
   import { requireAuth } from "./middleware/require-auth";

   app.get("/api/mi-endpoint", requireAuth, miHandlerProtegido);
   ```

   El middleware valida firmas RS256 contra la JWKS pública de tu tenant y expone el token verificado en `req.auth`. Los endpoints existentes `/api/demo` y `/api/email/send` ya lo utilizan y solo responden cuando reciben un `Authorization: Bearer <token>` válido.【F:server/index.ts†L35-L41】【F:server/routes/demo.ts†L1-L22】
4. **Consume APIs protegidas desde React** usando el hook `useAuthenticatedFetch`, que inyecta automáticamente el encabezado `Authorization` con el `accessToken` del contexto de autenticación:

   ```tsx
   import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";

   const fetchProtectedData = async () => {
     const authFetch = useAuthenticatedFetch();
     const response = await authFetch("/api/demo");
     const data = await response.json();
     console.log(data);
   };
   ```

   Si prefieres un control total, puedes acceder al token directamente desde `useAuth()` y construir tus peticiones manualmente.【F:client/context/AuthContext.tsx†L24-L206】【F:client/hooks/use-authenticated-fetch.ts†L1-L27】

Cuando la validación falla, el middleware responde con los códigos HTTP correspondientes (`401`, `403` o `500`) para que el cliente pueda redirigir al flujo de login o mostrar un mensaje de error. Las claves públicas de Auth0 se cachean durante una hora y se refrescan automáticamente si cambia el `kid` del token.【F:server/middleware/require-auth.ts†L1-L216】

## 📞 Soporte

Si encuentras algún problema:

1. Verifica que tienes la versión correcta de Node.js
2. Asegúrate de que todas las dependencias están instaladas
3. Revisa la consola del navegador para errores
4. Ejecuta `npm run typecheck` para verificar TypeScript

## 📄 Licencia

Este proyecto es una implementación del diseño AXA y está destinado para uso interno.

---

## ✨ ¡Listo para usar!

Tu aplicación AXA está completamente configurada y lista para funcionar. ¡Disfruta desarrollando! 🎉
