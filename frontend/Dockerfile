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

# Configuración de zona horaria America/Lima (Perú) y utilidades de privilegios mínimos
RUN apk add --no-cache tzdata libcap && \
    cp /usr/share/zoneinfo/America/Lima /etc/localtime && \
    echo "America/Lima" > /etc/timezone

ENV TZ=America/Lima

# Eliminar configuración por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copiar configuración personalizada de Nginx con soporte para SPA Routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos estáticos compilados desde la etapa de construcción
COPY --from=builder /app/dist/futuristic-login/browser /usr/share/nginx/html

# Hardening Defensivo (Mitigación de Vulnerabilidad nginx2root / CIS Docker Benchmark 4.1):
# 1. Configurar directorios de caché, logs y PID con permisos para el usuario 'nginx' (UID 101)
# 2. Otorgar capability cap_net_bind_service para bind en puerto 80 sin requerir root
# 3. Forzar ejecución no privilegiada mediante USER nginx
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx

# Mitigación Definitiva nginx2root: Ejecución bajo usuario sin privilegios 'nginx'
USER nginx

# Exponer el puerto HTTP del servidor Nginx
EXPOSE 80

# Verificación de salud del contenedor Nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

# Comando por defecto para iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
