# ==============================================================================
# Dockerfile Multi-Etapa para BevAdmin Frontend (Angular 21 + Nginx Alpine)
# ==============================================================================

# ------------------------------------------------------------------------------
# Etapa 1: Compilación de la aplicación Angular con Node 20 LTS
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Parámetro de compilación para seleccionar ambiente (development, qa, production)
ARG ENV=production

# Copiar descriptores de dependencias para optimizar la caché de capas Docker
COPY package.json package-lock.json ./
RUN npm ci --include=dev --prefer-offline --no-audit

# Copiar el código fuente del proyecto
COPY . .

# Compilar la aplicación para el ambiente especificado
RUN npm run build -- --configuration=${ENV}

# ------------------------------------------------------------------------------
# Etapa 2: Servidor web Nginx ultraliviano para servir la SPA
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

LABEL maintainer="Equipo BevAdmin <dev@elroble.com>"
LABEL description="Contenedor Frontend Nginx para BevAdmin Angular 21"

# Eliminar configuración por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copiar configuración personalizada de Nginx con soporte para SPA Routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos estáticos compilados desde la etapa de construcción
COPY --from=builder /app/dist/futuristic-login/browser /usr/share/nginx/html

# Asignar permisos adecuados
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exponer el puerto HTTP del servidor Nginx
EXPOSE 80

# Verificación de salud del contenedor Nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

# Comando por defecto para iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
