# 🏢 Relevo — Backend API

API RESTful y servidor de WebSockets para **Relevo**, un marketplace de adquisición y sucesión empresarial. Gestiona autenticación, ofertas, solicitudes con análisis de CV por IA, chat en tiempo real, pagos con Stripe, notificaciones push y un sistema de mentoring.

---

## 🚀 Stack Tecnológico

| Tecnología             | Uso                                                |
| :--------------------- | :------------------------------------------------- |
| **Node.js 24**         | Runtime                                            |
| **Express**            | Framework HTTP                                     |
| **TypeScript**         | Tipado estricto                                    |
| **MongoDB 7**          | Base de datos (Mongoose ODM)                       |
| **Socket.io**          | WebSockets bidireccionales                         |
| **Zod**                | Validación de datos                                |
| **JWT**                | Autenticación (Access + Refresh tokens)            |
| **Firebase Admin SDK** | OAuth (Google/GitHub) + Push Notifications (FCM)   |
| **Stripe**             | Pagos y monetización                               |
| **AWS S3**             | Almacenamiento de archivos (CVs, adjuntos de chat) |
| **Pino**               | Logging estructurado                               |
| **Swagger/OpenAPI**    | Documentación auto-generada                        |
| **Vitest**             | Testing (integración)                              |

---

## 📂 Estructura del Proyecto

```
backend-relevo/src/
├── app.ts                 # Express: CORS, middlewares, rutas, Stripe webhook
├── index.ts               # Punto de entrada: servidor HTTP + WebSockets
├── config.ts              # Variables de entorno centralizadas
├── database.ts            # Conexión MongoDB, índices y datos semilla (seeding)
├── swagger.ts             # Configuración OpenAPI / Swagger UI
├── controllers/           # Capa de control: HTTP request → response
│   ├── authController.ts
│   ├── usuarioController.ts
│   ├── ofertaController.ts
│   ├── solicitudController.ts
│   ├── chatController.ts
│   ├── paymentController.ts       # ← NUEVO: Stripe checkout + webhooks
│   ├── historialController.ts     # ← NUEVO: Historial de cambios de ofertas
│   ├── notificacionController.ts
│   ├── mentoringController.ts
│   ├── alertaController.ts
│   └── storageController.ts
├── services/              # Capa de negocio: lógica, integraciones, consultas
│   ├── authService.ts             # Login local + Firebase OAuth + GitHub server-side
│   ├── usuarioService.ts          # CRUD + Pro plan + créditos de publicación
│   ├── ofertaService.ts           # Marketplace + ofertas recomendadas
│   ├── solicitudService.ts        # Solicitudes + análisis IA
│   ├── chatService.ts             # Mensajería + cierre de tratos + ratings
│   ├── paymentService.ts          # ← NUEVO: Stripe Checkout Sessions
│   ├── stripeService.ts           # ← NUEVO: Integración Stripe SDK
│   ├── historialService.ts        # ← NUEVO: Auditoría de cambios
│   ├── aiService.ts               # Comunicación con microservicio IA
│   ├── firebaseAdminService.ts    # FCM + verificación OAuth
│   ├── notificationService.ts     # Push + Socket.io + DB (triple canal)
│   ├── storageService.ts          # Pre-signed URLs (S3)
│   ├── alertaService.ts           # Alertas de búsqueda + matching
│   ├── mentoringService.ts        # Módulos formativos + progreso
│   └── ratingService.ts           # Valoraciones post-trato
├── models/                # Mongoose: esquemas e interfaces
│   ├── usuarioModel.ts            # Roles, FCM tokens, Pro plan, créditos
│   ├── ofertaModel.ts             # Marketplace de negocios
│   ├── solicitudModel.ts          # Candidaturas con resultado IA
│   ├── chatModel.ts               # Conversaciones con estados
│   ├── mensajeModel.ts            # Mensajes (texto/audio/archivo)
│   ├── paymentSessionModel.ts     # ← NUEVO: Sesiones de pago Stripe
│   ├── historialModel.ts          # ← NUEVO: Log de cambios en ofertas
│   ├── notificacionModel.ts       # Notificaciones (TTL 30 días)
│   ├── alertaModel.ts             # Alertas de búsqueda
│   ├── mentoringModuleModel.ts    # Módulos de formación
│   ├── mentoringProgressModel.ts  # Progreso por usuario
│   └── ratingModel.ts             # Valoraciones 1-5 estrellas
├── routes/                # Endpoints HTTP con validaciones
├── middlewares/            # Auth JWT, roles, validación, errores
├── validators/            # Esquemas Zod (cuerpo, params, query)
├── sockets/               # WebSockets en tiempo real
│   ├── socketServer.ts            # Init + auth middleware JWT
│   ├── chatHandler.ts             # Eventos de chat
│   └── realtimeEvents.ts          # ← NUEVO: Emisiones de actualización
├── utils/                 # AppError, asyncWrapper, JWT
└── assets/mentoring/      # Contenido Markdown multiidioma
```

---

## 🔌 API Endpoints

| Ruta                  | Recurso        | Descripción                                                                  |
| :-------------------- | :------------- | :--------------------------------------------------------------------------- |
| `/api/auth`           | Autenticación  | Login local, OAuth Firebase, OAuth GitHub (server-side), refresh, logout, me |
| `/api/usuarios`       | Usuarios       | CRUD, FCM tokens, preferencias, favoritos, Pro plan, créditos                |
| `/api/ofertas`        | Ofertas        | CRUD marketplace, búsqueda paginada, filtros, recomendaciones                |
| `/api/solicitudes`    | Solicitudes    | Crear (con CV), aceptar/rechazar, análisis IA, eliminar                      |
| `/api/chats`          | Chats          | Mensajes (texto/audio/archivo), cierre de trato, ratings                     |
| `/api/payments`       | **Pagos**      | Checkout Stripe, webhook, estado de sesiones                                 |
| `/api/historial`      | **Historial**  | Auditoría de cambios en ofertas                                              |
| `/api/storage`        | Archivos       | Pre-signed URLs PUT/GET para S3                                              |
| `/api/mentoring`      | Mentoring      | Módulos de formación, progreso, contenido Markdown                           |
| `/api/alertas`        | Alertas        | CRUD alertas de búsqueda con matching automático                             |
| `/api/notificaciones` | Notificaciones | Historial, marcar leídas, limpiar                                            |
| `/docs`               | Swagger UI     | Documentación interactiva auto-generada                                      |
| `/ping`               | Health Check   | Estado del servidor                                                          |

---

## 💳 Sistema de Monetización

### Tipos de Pago

| Tipo                | Precio  | Descripción                          |
| :------------------ | :------ | :----------------------------------- |
| `offer_publication` | 99,00 € | Pago único para publicar una oferta  |
| `pro_activation`    | 19,90 € | Activación de Relevo Pro por 30 días |

### Flujo de Pago (Stripe Checkout)

```
1. Frontend → POST /api/payments/checkout { kind, offerDraft? }
2. Backend → Crea PaymentSession (status: pending)
3. Backend → Crea Stripe Checkout Session
4. Backend → Devuelve checkoutUrl al frontend
5. Frontend → Redirige al usuario a Stripe
6. Stripe → Webhook POST /api/payments/webhook
7. Backend → Completa la acción (publica oferta o activa Pro)
```

### Relevo Pro

Los usuarios con plan Pro (`proActive: true`) obtienen ventajas como acceso a ofertas recomendadas y funcionalidades premium. El plan expira automáticamente tras 30 días (`proExpiresAt`).

---

## 🔐 Autenticación

### Métodos Soportados

| Método                 | Flujo                                                         |
| :--------------------- | :------------------------------------------------------------ |
| **Email + Password**   | `POST /api/auth/login` → bcrypt → JWT                         |
| **Google OAuth**       | Firebase Auth → idToken → `POST /api/auth/firebase`           |
| **GitHub OAuth**       | Firebase Auth → idToken → `POST /api/auth/firebase`           |
| **GitHub Server-side** | `POST /api/auth/oauth/github` → code exchange → user creation |

### JWT

- **Access Token**: `Authorization: Bearer <token>` (12h por defecto)
- **Refresh Token**: Cookie httpOnly (`refreshToken`, 7 días)
- **Silent Refresh**: `POST /api/auth/refresh`

---

## 🔔 Sistema de Notificaciones (Triple Canal)

Cada notificación se entrega simultáneamente por 3 canales:

1. **Base de datos**: `NotificacionModel` (historial, TTL 30 días)
2. **Socket.io**: Evento `new_notification` a la sala `user:{userId}`
3. **Firebase Push**: `sendEachForMulticast()` a los tokens FCM del usuario

---

## ⚡ WebSockets (Socket.io)

- **Auth**: JWT obligatorio en `socket.handshake.auth.token`
- **Salas**: `user:{userId}` (personal) + `chat:{chatId}` (conversación)
- **Eventos**: `send_message`, `new_message`, `typing_start/stop`, `chat_updated`, `solicitud_updated`, `solicitud_deleted`, `new_notification`

---

## 🛠️ Desarrollo Local

### Requisitos Previos

- Node.js 24+
- MongoDB 7+ (local o Docker)

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd backend-relevo

# Instalar dependencias
npm ci

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### Variables de Entorno Requeridas

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/relevo
JWT_ACCESS_SECRET=<tu_secret>
JWT_REFRESH_SECRET=<tu_secret>
BCRYPT_SALT_ROUNDS=12

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<tu_key>
AWS_SECRET_ACCESS_KEY=<tu_secret>
AWS_S3_BUCKET_NAME=<tu_bucket>

# Firebase Admin SDK
FIREBASE_PROJECT_ID=<tu_project>
FIREBASE_CLIENT_EMAIL=<tu_email>
FIREBASE_PRIVATE_KEY=<tu_private_key>

# Microservicio IA
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_SERVICE_API_KEY=<api_key_compartida>

# Stripe
STRIPE_SECRET_KEY=<tu_stripe_secret>
STRIPE_WEBHOOK_SECRET=<tu_webhook_secret>

# GitHub OAuth (server-side)
GITHUB_CLIENT_ID=<tu_client_id>
GITHUB_CLIENT_SECRET=<tu_client_secret>

# URLs
FRONTEND_URL=http://localhost:4200
API_URL=http://localhost:4000
```

### Comandos

| Comando              | Descripción                                 |
| :------------------- | :------------------------------------------ |
| `npm run dev`        | Servidor de desarrollo con hot-reload (tsx) |
| `npm start`          | Build + producción                          |
| `npm run build`      | Compilar TypeScript → `dist/`               |
| `npm test`           | Tests de integración (Vitest)               |
| `npm run test:watch` | Tests en modo watch                         |
| `npm run validate`   | Format check + Lint + Type check            |
| `npm run lint:fix`   | Auto-fix de lint                            |
| `npm run format`     | Auto-format con Prettier                    |

---

## 🧪 Testing

Tests de integración con **Vitest** y **MongoDB real** (servicio efímero en CI):

```
tests/
├── setup.ts              # Configuración global (MongoDB en memoria)
├── ping.test.ts           # Health check
├── auth.test.ts           # Login, registro, JWT
├── users.test.ts          # CRUD de usuarios
├── ofertas.test.ts        # CRUD de ofertas
├── monetization.test.ts   # Créditos de publicación y Pro
└── payments.test.ts       # Flujo de pagos Stripe
```

---

## 🐳 Docker

### Build de Producción (Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
# npm ci → npm run build (TypeScript → JS)

# Stage 2: Runner
FROM node:24-alpine
# npm ci --omit=dev → USER node → CMD node dist/index.js
```

```bash
docker build -t relevo-backend .
docker run -p 4000:4000 --env-file .env relevo-backend
```

---

## 🔄 CI/CD (GitHub Actions)

| Workflow | Trigger                         | Acciones                                                    |
| :------- | :------------------------------ | :---------------------------------------------------------- |
| **CI**   | Push a `dev`, PR a `dev`/`main` | Lint + Format + Types → Tests con MongoDB                   |
| **CD**   | Merge a `main`                  | Docker build → Push a Docker Hub → SSH deploy vía Tailscale |
