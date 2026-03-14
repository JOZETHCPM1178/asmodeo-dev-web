# AsmodeoDev v2.0 — Plataforma de Mods & APKs

> Mini red social estilo TikTok para compartir apps modificadas, juegos, scripts y tutoriales.

---

## 🚀 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Estado auth | Context API |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth |
| Imágenes | Cloudinary |
| Notificaciones push | OneSignal v16 |
| Worker / Bot | Cloudflare Workers |
| IA | Google Gemini 1.5 Flash |
| Búsqueda | Fuse.js (fuzzy search) |
| Deploy | Cloudflare Pages / Netlify |

---

## 📁 Estructura del proyecto

```
asmodeo/
├── public/
│   ├── OneSignalSDKWorker.js   ← OBLIGATORIO para push notifications
│   ├── manifest.json
│   ├── _headers
│   ├── _redirects
│   ├── icon-192x192.png        ← Copia desde el proyecto original
│   └── icon-512x512.png        ← Copia desde el proyecto original
│
├── src/
│   ├── components/
│   │   ├── ui/                 ← Componentes base (Navbar, Layout, Auth, etc.)
│   │   ├── feed/               ← Feed, PostCard, UploadForm
│   │   ├── social/             ← CommentsPanel, FollowButton
│   │   ├── chat/               ← GlobalChat
│   │   ├── search/             ← SmartSearch (Fuse.js)
│   │   └── admin/              ← AdminDashboard completo
│   │
│   ├── pages/                  ← Páginas (una por ruta)
│   │   ├── HomePage.jsx
│   │   ├── FeedPage.jsx
│   │   ├── PostDetailPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── UploadPage.jsx
│   │   ├── SearchPage.jsx
│   │   ├── AdminPage.jsx
│   │   └── NotFoundPage.jsx
│   │
│   ├── services/               ← Toda la lógica de datos
│   │   ├── firebase.js         ← Inicialización y re-exports
│   │   ├── auth.js             ← Login, registro, roles
│   │   ├── posts.js            ← CRUD posts, likes, ranking
│   │   ├── social.js           ← Follows, comentarios, chat, notifs
│   │   ├── cloudinary.js       ← Upload y optimización de imágenes
│   │   ├── gemini.js           ← IA para descripción y moderación
│   │   ├── notifications.js    ← OneSignal + Worker
│   │   └── admin.js            ← Panel admin: stats, moderación
│   │
│   ├── context/
│   │   └── AuthContext.jsx     ← Estado global de autenticación
│   │
│   ├── hooks/
│   │   ├── usePost.js
│   │   └── useRateLimit.js
│   │
│   ├── utils/
│   │   └── index.js            ← Funciones de utilidad
│   │
│   ├── styles/
│   │   └── globals.css         ← Variables CSS y estilos globales
│   │
│   ├── App.jsx                 ← Router principal
│   └── main.jsx                ← Entry point
│
├── worker/
│   ├── index.js                ← Cloudflare Worker (notifs + Telegram)
│   └── wrangler.toml           ← Config de despliegue del Worker
│
├── firestore.rules             ← Reglas de seguridad Firestore
├── firestore.indexes.json      ← Índices compuestos Firestore
├── .env.example                ← Variables de entorno requeridas
├── vite.config.js
└── package.json
```

---

## ⚙️ Instalación paso a paso

### 1. Clonar e instalar dependencias

```bash
# Entrar a la carpeta del proyecto
cd asmodeo

# Instalar dependencias
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus valores reales
nano .env
```

Las variables que necesitas configurar:

```env
# Firebase (cópiala de Firebase Console → Project Settings → Web app)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Cloudinary (Panel → Settings → Upload)
VITE_CLOUDINARY_CLOUD=dcvofzfdf
VITE_CLOUDINARY_PRESET=asmodeo-preset

# OneSignal (Dashboard → Settings → Keys & IDs)
VITE_ONESIGNAL_APP_ID=tu-app-id

# Gemini AI (Google AI Studio → Get API Key)
VITE_GEMINI_API_KEY=tu-clave-gemini

# Cloudflare Worker URL (después de hacer deploy del worker)
VITE_WORKER_URL=https://asmodeo-worker.tu-usuario.workers.dev

# Email del admin principal
VITE_ADMIN_EMAIL=asmodeotayson@gmail.com
```

### 3. Configurar Firebase

1. Ve a **Firebase Console → Firestore Database → Rules**
2. Copia el contenido de `firestore.rules` y guárdalo
3. Ve a **Firebase Console → Firestore Database → Indexes**
4. Importa `firestore.indexes.json` o crea los índices manualmente

Los índices requeridos son:
- `posts`: `status ASC, score DESC, createdAt DESC`
- `posts`: `status ASC, category ASC, score DESC, createdAt DESC`
- `notifications`: `userId ASC, createdAt DESC`

### 4. Configurar Cloudinary

1. Entra a **Cloudinary Dashboard → Settings → Upload**
2. Crea un **Upload Preset** sin firma (unsigned) llamado `asmodeo-preset`
3. Configura las transformaciones:
   - Max width: 1200px
   - Quality: auto
   - Format: auto

### 5. Configurar OneSignal (notificaciones push)

1. Crea una app en **onesignal.com**
2. Selecciona **Web Push**
3. Configura tu dominio (o `localhost` para desarrollo)
4. Copia el **App ID** al `.env`
5. Asegúrate de que `public/OneSignalSDKWorker.js` esté en la raíz pública

### 6. Obtener API Key de Gemini

1. Ve a **aistudio.google.com**
2. Crea una API Key
3. Cópiala al `.env`

> ⚠️ **Importante:** Gemini tiene un límite gratuito generoso (60 req/min). Para uso en producción, implementa un caché o llama solo desde el backend.

### 7. Desplegar el Worker de Cloudflare

```bash
cd worker

# Instalar Wrangler CLI
npm install -g wrangler

# Autenticarse en Cloudflare
wrangler auth login

# Editar wrangler.toml con tu Account ID

# Agregar secrets (variables privadas)
wrangler secret put ONESIGNAL_APP_ID
wrangler secret put ONESIGNAL_REST_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHANNEL_ID

# Desplegar
wrangler deploy
```

### 8. Configurar el Bot de Telegram (opcional)

1. Habla con **@BotFather** en Telegram
2. Crea un bot: `/newbot`
3. Copia el token como secret en Cloudflare
4. Configura el webhook:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://asmodeo-worker.tu-usuario.workers.dev/telegram
```

### 9. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará en `http://localhost:5173`

---

## 🚀 Despliegue en producción

### Cloudflare Pages (recomendado)

```bash
# Build del proyecto
npm run build

# Desplegar con Wrangler Pages
npx wrangler pages deploy dist --project-name asmodeo-dev
```

O conecta tu repositorio GitHub en **Cloudflare Pages Dashboard**.

Configuración de build en Cloudflare Pages:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** `18`

### Netlify

```bash
npm run build
# Sube la carpeta dist/
```

---

## 🔥 Sistema de ranking del feed

El score de cada post se calcula así:

```
score = (likes × 3 + downloads × 2 + comentarios) × (1 + decay) + destacado
```

- `decay`: factor de decaimiento temporal (posts recientes → más score)
- `destacado`: +500 puntos si un admin lo destaca
- Se recalcula automáticamente al crear/actualizar posts

---

## 👥 Roles y permisos

| Permiso | USER | ADMIN JR | ADMIN |
|---------|------|----------|-------|
| Ver contenido | ✅ | ✅ | ✅ |
| Subir posts | ✅ | ✅ | ✅ |
| Dar like / comentar | ✅ | ✅ | ✅ |
| Eliminar posts ajenos | ❌ | ✅ | ✅ |
| Banear usuarios | ❌ | ✅ | ✅ |
| Revisar reportes | ❌ | ✅ | ✅ |
| Verificar contenido | ❌ | ✅ | ✅ |
| Ver estadísticas | ❌ | ❌ | ✅ |
| Cambiar roles | ❌ | ❌ | ✅ |
| Ver logs admin | ❌ | ❌ | ✅ |
| Cerrar/abrir chat | ❌ | ✅ | ✅ |
| Destacar posts | ❌ | ❌ | ✅ |

Para asignar un rol desde Firestore:
```
users/{uid} → role: "admin_jr"
```

---

## 🛡️ Seguridad implementada

- **Rate limiting** en comentarios (5/minuto) y chat (1 mensaje/2 seg)
- **Análisis de seguridad con Gemini AI** en cada publicación
- **Firestore Rules** que validan en servidor
- **Detección de links peligrosos** via Gemini
- **Sistema de reportes** con revisión por admins
- **Ban de usuarios** con validación en Auth listener
- **Validación de tamaño** de imágenes (máx 10MB)
- **Sanitización** de inputs (maxLength en todos los campos)

---

## 🎵 Notas de voz (limitación)

Firebase Storage tiene límite gratuito de 1GB. Para notas de voz te recomendamos:

**Opción A (gratuita):** Usar el API de Cloudinary para audio
```javascript
// Cloudinary acepta audio en plan gratuito (10GB transformaciones/mes)
const formData = new FormData()
formData.append('file', audioBlob, 'note.webm')
formData.append('upload_preset', PRESET)
formData.append('resource_type', 'video') // Cloudinary usa 'video' para audio
await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`, { method: 'POST', body: formData })
```

**Opción B:** Limitar duración a 30 segundos y comprimir antes de subir.

---

## 📝 Próximos pasos sugeridos

- [ ] Página de configuración de perfil (`/settings`)
- [ ] Notas de voz en chat via Cloudinary
- [ ] Sistema de logros/badges
- [ ] Modo oscuro/claro toggleable
- [ ] PWA offline support con Workbox
- [ ] Internacionalización (i18n)
- [ ] Analíticas propias con BigQuery
- [ ] Tests con Vitest + React Testing Library

---

## 📞 Soporte

- **Email:** asmodeotayson@gmail.com
- **Telegram:** [@asmodeodev](https://t.me/asmodeodev)
