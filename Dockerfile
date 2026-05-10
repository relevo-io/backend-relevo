# Etapa 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiamos el código fuente y config de TS
COPY tsconfig.json ./
COPY src ./src

# Compilamos el proyecto
RUN npm run build

# Etapa 2: Producción
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiamos solo los archivos necesarios de la etapa anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instalamos SOLO las dependencias de producción
RUN npm ci --omit=dev

# Por seguridad, no ejecutamos como root
USER node

EXPOSE 4000

# Comando para arrancar la app
CMD ["node", "dist/index.js"]
