---
name: devsecops-senior
description: >-
  Estándar y guía maestra de Ingeniería DevSecOps Senior para la orquestación de contenedores,
  diseño de pipelines CI/CD seguros, infraestructura como código (IaC), observabilidad y
  cumplimiento de seguridad "Shift-Left" basado en OWASP Top 10 y CIS Benchmarks (Docker,
  Kubernetes, Docker Compose, Linux Alpine/Debian, Nginx, GitHub Actions, GitLab CI). Enfoque
  prioritario en imágenes ultraligeras sin privilegios root, dependencias con healthchecks
  estrictos, perfiles de ambiente aislados y scripts de automatización multiplataforma.
---

# 🛡️ Estándar Maestro de Ingeniería DevSecOps Senior

Este documento define el marco global de excelencia técnica, orquestación resiliente de contenedores, automatización de infraestructura, seguridad integrada en el ciclo de vida de desarrollo (**Shift-Left Security**) y cumplimiento estricto de estándares **OWASP Top 10** y **CIS Benchmarks** para Ingenieros DevSecOps de nivel Senior.

Constituye un **estándar de conocimiento universal y reutilizable**, aplicable para orquestar y asegurar soluciones web, arquitecturas de microservicios, bases de datos y pipelines de despliegue en entornos Cloud (AWS, GCP, Azure) o infraestructura local On-Premise.

> [!NOTE]
> **Experiencia de Referencia**: Este marco ha sido validado en el despliegue y orquestación integral de sistemas empresariales como **BevAdmin Pro** (cadena estricta de arranque secuencial Postgres $\rightarrow$ Backend $\rightarrow$ Frontend basada en `service_healthy`, imágenes Docker multi-stage ultraligeras con usuarios sin privilegios `spring` y `nginx`, servidor Nginx Alpine con compresión gzip y SPA fallback, scripts de orquestación multiplataforma `start.ps1` y `start.sh` con selección de ambientes `dev`/`qa`/`prod`, y volumen inicializado automáticamente con scripts SQL).

---

## 1. Perfil, Rol y Filosofía del Ingeniero DevSecOps Senior

El Ingeniero DevSecOps Senior no es un simple operador de herramientas; es un arquitecto de confiabilidad, automatización y seguridad:

1. **Filosofía "Shift-Left"**: La seguridad no se inspecciona al final; se automatiza y valida en cada etapa: desde el commit en la máquina del desarrollador, pasando por el pipeline CI/CD, hasta el contenedor en ejecución.
2. **Infraestructura Inmutable y Código como Documentación**: Los entornos deben ser 100% reproducibles y declarativos mediante `Dockerfile`, `docker-compose.yml`, manifiestos de Kubernetes o Terraform.
3. **Resiliencia Operativa**: Las dependencias entre servicios se modelan explícitamente con sondas de salud (*healthchecks*); ningún componente de nivel superior debe aceptar tráfico hasta que sus dependencias subyacentes estén activas y verificadas.
4. **Mantenibilidad y Limpieza**: Los scripts de automatización deben ser multiplataforma, idempotentes, legibles, interactivos cuando sea necesario y totalmente auditables.

---

## 2. Buenas Prácticas en Construcción y Hardening de Contenedores Docker

### 2.1. Construcciones Multietapa (Multi-Stage Builds)

Separar estrictamente la etapa de compilación (*builder*) de la etapa de ejecución (*runtime*) para minimizar el tamaño de la imagen y eliminar herramientas de desarrollo (compiladores, SDKs, código fuente) que representan un riesgo de seguridad en producción:

```dockerfile
# ------------------------------------------------------------------------------
# ETAPA 1: COMPILADOR / BUILDER (Contiene herramientas de compilación pesadas)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --prefer-offline --no-audit
COPY . .
RUN npm run build -- --configuration=production

# ------------------------------------------------------------------------------
# ETAPA 2: RUNTIME LIGERO Y SEGURO (Solo Nginx + estáticos minificados)
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Hardening: Eliminar configuración por defecto y aplicar servidor seguro
RUN rm -rf /etc/nginx/conf.d/*
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados desde la etapa builder
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Principio de Menor Privilegio: Permisos restringidos al usuario no-root 'nginx'
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 2.2. Principio de No-Root y Reducción de la Superficie de Ataque

- **Nunca ejecutar contenedores como `root`**:
  - En Node / Nginx: `USER nginx` o `USER node`.
  - En Java: Crear un usuario y grupo dedicado sin shell de login:
    ```dockerfile
    RUN addgroup -S spring && adduser -S spring -G spring
    USER spring:spring
    ```
- **Imágenes Base Mínimas**: Preferir imágenes basadas en `Alpine Linux` o `Distroless` para reducir el inventario de paquetes y CVEs presentes en el sistema operativo base.
- **Volúmenes de Solo Lectura**: Montar carpetas que no requieran escritura con la bandera `:ro` (ej. `./sql:/docker-entrypoint-initdb.d:ro`).

---

## 3. Orquestación y Resiliencia con Docker Compose

### 3.1. Cadena de Dependencias Estricta con Healthchecks

Evitar arranques ciegos donde una API falla porque la base de datos aún no está lista para aceptar consultas. Utilizar la condición `service_healthy`:

```yaml
services:
  dev-postgres:
    image: postgres:17
    container_name: dev-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ${DB_NAME:-admin_dashboard_db}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./sql:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ${DB_NAME:-admin_dashboard_db}"]
      interval: 3s
      timeout: 3s
      retries: 10
      start_period: 2s
    networks:
      - internal-network

  dev-backend:
    image: dev-backend:latest
    container_name: dev-backend
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      dev-postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/api/v1/auth/health || exit 1"]
      interval: 4s
      timeout: 3s
      retries: 15
      start_period: 10s
    networks:
      - internal-network

  dev-frontend:
    image: dev-frontend:latest
    container_name: dev-frontend
    restart: unless-stopped
    ports:
      - "4200:80"
    depends_on:
      dev-postgres:
        condition: service_healthy
      dev-backend:
        condition: service_healthy
    networks:
      - internal-network
```

### 3.2. Aislamiento de Redes y Control de Puertos

- Crear redes internas (`networks`) para que la comunicación entre contenedores (ej. backend a postgres) se realice por nombres DNS internos sin necesidad de exponer puertos al host salvo para depuración explícita.

---

## 4. Seguridad DevSecOps y Mitigación de Vulnerabilidades OWASP

### 4.1. A05: Security Misconfiguration (Hardening de Nginx y Servidores Web)

Un archivo `nginx.conf` seguro debe incluir:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Ocultar versión del servidor web
    server_tokens off;

    # Cabeceras de Seguridad HTTP Estrictas
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Compresión Gzip para optimizar transferencia
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Fallback para Single Page Application (SPA Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4.2. A06: Vulnerable and Outdated Components (SCA & Container Scanning)

- Integrar escaneo de vulnerabilidades en pipelines con herramientas automáticas:
  - **Trivy / Grype**: Escaneo de CVEs en capas del sistema operativo y paquetes binarios de la imagen Docker.
  - **OWASP Dependency-Check / Snyk**: Detección de vulnerabilidades en dependencias Maven / NPM.
- Fallar el pipeline de CI si se detectan vulnerabilidades clasificadas como `CRITICAL` o `HIGH` con exploit público disponible.

### 4.3. A02 & A07: Gestión de Secretos (Secret Management)

- **Regla Inquebrantable**: Nunca incluir contraseñas, tokens JWT, certificados SSL ni claves privadas en imágenes Docker o archivos de control de versiones.
- Inyectar secretos en tiempo de ejecución a través de variables de entorno protegidas, Docker Secrets o agentes de bóveda (Vault).

### 4.4. A09: Seguridad en Monitoreo y Rotación de Logs

- Configurar el driver de logs de Docker para evitar que los archivos de registro consuman todo el espacio del disco del servidor:
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "20m"
      max-file: "5"
  ```

---

## 5. Checklist de Calidad DevSecOps Senior

- [ ] **Sin Usuarios Root**: Todos los contenedores de aplicación corren con usuarios sin privilegios administrativos.
- [ ] **Orquestación Determinística**: Los servicios dependen de `service_healthy` para garantizar un arranque secuencial sin condiciones de carrera.
- [ ] **Imágenes Auditadas**: Cero vulnerabilidades críticas o altas sin mitigar en el escaneo de imágenes base.
- [ ] **Scripts Maestros Multiplataforma**: Scripts de automatización (`start.ps1`, `start.sh`) que validan la salud de Docker Daemon, puertos disponibles y URLs finales.
- [ ] **Manejo Desacoplado de Ambientes**: Perfiles claros (`dev`, `qa`, `prod`) configurables sin necesidad de alterar el código fuente ni reconstruir imágenes base.
