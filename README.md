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
