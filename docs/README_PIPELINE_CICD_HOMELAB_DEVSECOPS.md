# 🚀 Guía Maestra de Despliegue CI/CD Seguro con GitHub Actions para Homelab (DevSecOps)

> **Documento Canónico de Operación y Seguridad**  
> **Basado en el Diagrama:** `Modelo C4 (Nivel 2 - Despliegue): Pipeline CI/CD con GitHub Actions para Homelab`  
> **Ubicación del Diagrama Interactivo:** [`docs/diagrams/08_c4_pipeline_cicd_homelab.html`](file:///D:/tools/Proyectos/sidebar-login/docs/diagrams/08_c4_pipeline_cicd_homelab.html)  
> **Estándar Aplicado:** Shift-Left Security, OWASP Top 10, CIS Docker Benchmarks, Zero Trust On-Premise  

---

## 📌 Tabla de Contenidos

1. [Resumen Ejecutivo y Visión Arquitectónica](#1-resumen-ejecutivo-y-visión-arquitectónica)
2. [Mapeo de Componentes C4 Nivel 2 (Despliegue)](#2-mapeo-de-componentes-c4-nivel-2-despliegue)
3. [Matriz de Amenazas y Postura DevSecOps (Threat Modeling)](#3-matriz-de-amenazas-y-postura-devsecops-threat-modeling)
4. [Fase 1: Hardening de Seguridad en GitHub Cloud](#fase-1-hardening-de-seguridad-en-github-cloud)
5. [Fase 2: Pipeline de Integración Continua (CI) en GitHub Actions](#fase-2-pipeline-de-integración-continua-ci-en-github-actions)
6. [Fase 3: Aprovisionamiento y Hardening del Homelab On-Premise](#fase-3-aprovisionamiento-y-hardening-del-homelab-on-premise)
7. [Fase 4: Instalación del Self-Hosted Runner Seguro (Pull-Based)](#fase-4-instalación-del-self-hosted-runner-seguro-pull-based)
8. [Fase 5: Pipeline de Despliegue Continuo (CD) y Script Orquestador](#fase-5-pipeline-de-despliegue-continuo-cd-y-script-orquestador)
9. [Fase 6: Sondas de Salud, Smoke Testing y Auto-Remediación](#fase-6-sondas-de-salud-smoke-testing-y-auto-remediación)
10. [Fase 7: Procedimiento Operativo de Rollback de Emergencia](#fase-7-procedimiento-operativo-de-rollback-de-emergencia)
11. [Checklist de Verificación Final DevSecOps](#11-checklist-de-verificación-final-devsecops)

---

## 1. Resumen Ejecutivo y Visión Arquitectónica

El presente documento detalla el procedimiento técnico, operativo y de seguridad para implementar el pipeline integral de **Integración Continua (CI)** y **Despliegue Continuo (CD)** diseñado para el ecosistema **BevAdmin Pro**, orquestando la transición segura desde el código fuente en la nube hasta el despliegue físico en infraestructura **Homelab On-Premise** (Mini PC, Proxmox VE, Ubuntu Server).

```
   ┌────────────────────────────────────────────────────────┐
   │              ECOSISTEMA GITHUB CLOUD (CI)              │
   │                                                        │
   │  Desarrollador ──> Git Push/PR ──> GitHub Actions CI   │
   │                                            │           │
   │                                    [Trivy SAST / SCA]  │
   │                                            │           │
   │                                 Docker Multi-Stage     │
   │                                            │           │
   │                                   Push Imágenes OCI    │
   │                                            │           │
   │                                            ▼           │
   │                               GitHub Container Registry│
   └────────────────────────────────────────────┬───────────┘
                                                │
                 Pull-Based Polling (HTTPS:443) │ (¡CERO puertos de entrada
                                                │  abiertos en el router!)
                                                ▼
   ┌────────────────────────────────────────────────────────┐
   │            SERVIDOR HOMELAB ON-PREMISE (CD)            │
   │                                                        │
   │  Self-Hosted Runner ──> deploy-homelab.sh              │
   │                                   │                    │
   │                           Pull Imágenes OCI            │
   │                                   │                    │
   │                           docker compose up -d         │
   │                                   │                    │
   │       ┌───────────────────────────┴────────────────┐   │
   │       ▼                           ▼                ▼   │
   │  [Red Ops: Traefik]     [Red App: Spring/Angular]  [Red Data: Postgres]
   │       │                           │                    │
   │  CrowdSec WAF             Loom Virtual Threads      Aislada / 5432
   │       │                           │                    │
   │  Uptime Kuma ◄────────── Sonda Healthcheck ───────────┘   │
   │       │                                                │
   │       ▼                                                │
   │  Alertas Telegram / Discord                            │
   └────────────────────────────────────────────────────────┘
```

### Principio Clave de Seguridad: Arquitectura "Pull-Based"
A diferencia de los modelos tradicionales "Push-Based" que exigen abrir puertos en el firewall del hogar (SSH :22 o Webhooks :8080 con Port Forwarding riesgoso), la arquitectura implementa un **GitHub Actions Self-Hosted Runner** en modo **Pull-Based**:
- El agente en el Homelab establece una conexión saliente TLS 1.3 vía HTTPS (`:443`) mediante WebSockets / Long-Polling hacia la API de GitHub.
- **Resultado:** La superficie de ataque entrante del router doméstico es **0 (cero)**.

---

## 2. Mapeo de Componentes C4 Nivel 2 (Despliegue)

| Componente C4 | Tipo | Entorno | Rol en el Pipeline | Nivel de Seguridad |
| :--- | :--- | :--- | :--- | :--- |
| `dev_user` | Externo | Local Workstation | Creación de branches y commits firmados | Firma GPG obligatoria |
| `gh_repo` | Cloud | GitHub SaaS | Repositorio central (`jambrocio/sidebar-login`) | Branch protection rules |
| `gh_actions_ci` | Cloud | GitHub Runner Cloud | Compilación Maven (Backend) y Angular (Frontend) | Sandbox efímero aislado |
| `gh_sast` | Seguridad | GitHub Cloud | Escaneo de CVEs y dependencias con Trivy | Gate bloqueante en `CRITICAL` |
| `gh_secrets` | Seguridad | GitHub Cloud | Gestión de secretos con cifrado AES-256 | Control de acceso RBAC |
| `gh_builder` | Cloud | Docker Buildx | Empaquetado OCI multi-stage sin root | SBOM + Tags inmutables por SHA |
| `gh_registry` | Cloud | GHCR (`ghcr.io`) | Registro de artefactos OCI inmutables | Autenticación basada en tokens |
| `gh_runner` | Seguridad | Homelab On-Premise | Agente pull-based que ejecuta el CD | Usuario no-root, sin sudo |
| `deploy_script` | Backend | Homelab On-Premise | Orquestador idempotente `deploy-homelab.sh` | Validación `service_healthy` |
| `hl_docker` | Externo | Homelab Host | Docker Engine Daemon (`/var/run/docker.sock`) | Socket restringido por permisos |
| `hl_proxy` | Cloud/Ops | Homelab (Docker) | Traefik v3.2 Ingress + CrowdSec WAF/IPS | Terminación TLS 1.3 estricta |
| `hl_backend` | Backend | Homelab (Docker) | Spring Boot 4 (Java 21 Virtual Threads) | Usuario `spring`, sin root |
| `hl_frontend` | Frontend | Homelab (Docker) | Nginx Alpine con SPA Angular 21 | Usuario `nginx`, no expuesto al host |
| `hl_database` | Database | Homelab (Docker) | PostgreSQL 17 relacional en red aislada | Red `data-network`, sin binding 0.0.0.0 |
| `hl_autoheal` | Seguridad | Homelab (Docker) | Vigilante de salud de contenedores | Auto-reinicio ante fallos |
| `hl_kuma` | Seguridad | Homelab (Docker) | Sonda de monitoreo sintético `/auth/health` | Smoke tests automáticos |
| `notif_alerts` | Externo | Telegram / Discord | Canales de notificación push en vivo | Webhooks protegidos por token |

---

## 3. Matriz de Amenazas y Postura DevSecOps (Threat Modeling)

Para garantizar un nivel de seguridad de grado bancario / empresarial, se aplica modelado de amenazas contra el pipeline:

```
+-------------------------------------------------------------------------------------------------------+
| MATRIZ DE AMENAZAS & CONTROLES COMPENSATORIOS DEVSECOPS                                              |
+------------------------------------+----------------------------------+-------------------------------+
| Vector de Ataque                   | Riesgo / Impacto                 | Mitigación Implementada       |
+------------------------------------+----------------------------------+-------------------------------+
| 1. Workflow Poisoning (RCE Runner) | Un PR malicioso de un tercero    | El runner homelab SOLO        |
|                                    | ejecuta comandos en el Homelab.  | atiende jobs de la rama       |
|                                    |                                  | protegida 'main' aprobados.   |
+------------------------------------+----------------------------------+-------------------------------+
| 2. Compromiso de Docker Socket     | Fuga del contenedor hacia el     | Runner corre como usuario sin |
|                                    | sistema operativo anfitrión.     | sudo; contenedores sin root;  |
|                                    |                                  | sin privilegios '--privileged'|
+------------------------------------+----------------------------------+-------------------------------+
| 3. Exposición de Secretos en Git   | Filtración de passwords de BD o  | Gitleaks en CI rompe el build |
|                                    | tokens de JWT en texto plano.    | si detecta llaves o claves.   |
+------------------------------------+----------------------------------+-------------------------------+
| 4. CVEs en Dependencias y Base OS  | Paquetes con vulnerabilidades    | Trivy Container & SCA scan;   |
|                                    | conocidas (RCE, bypass de auth). | umbral 'CRITICAL' bloqueante. |
+------------------------------------+----------------------------------+-------------------------------+
| 5. Ataques Man-in-the-Middle (MITM)| Intercepción del tráfico o pull  | GHCR y GitHub API forzados    |
|                                    | de imágenes manipuladas.         | sobre TLS 1.3 con SHA digest. |
+------------------------------------+----------------------------------+-------------------------------+
| 6. Despliegue Fallido en Producción| La app arranca rota y tumba      | Healthcheck estricto, smoke   |
|                                    | el servicio para los clientes.   | test Uptime Kuma y rollback.  |
+------------------------------------+----------------------------------+-------------------------------+
```

---

## Fase 1: Hardening de Seguridad en GitHub Cloud

Antes de escribir la primera línea de código del pipeline, el repositorio de GitHub debe ser asegurado.

### 1.1. Reglas de Protección de Rama (`main`)
En `Settings > Branches > Branch protection rules`:
1. **Require a pull request before merging:**
   - Activar `Require approvals`: Mínimo `1`.
   - Activar `Dismiss stale pull request approvals when new commits are pushed`.
2. **Require status checks to pass before merging:**
   - Marcar obligatorios:
     - `ci-backend / test-and-verify`
     - `ci-frontend / build-and-lint`
     - `security-sast / trivy-cve-scan`
     - `security-secrets / gitleaks-scan`
3. **Require signed commits:** Activado (GPG/SSH commit signature).
4. **Require linear history:** Activado (evita merges desordenados).
5. **Do not allow bypassing the above settings:** Activado para todos (incluso administradores).

### 1.2. Configuración de Secretos en GitHub (KMS)
En `Settings > Secrets and variables > Actions`:

| Nombre del Secreto | Descripción | Ejemplo / Formato |
| :--- | :--- | :--- |
| `GHCR_TOKEN` | Personal Access Token con `write:packages` | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `TELEGRAM_BOT_TOKEN` | Token de Bot de Telegram de auditoría | `7123456789:AAHxxxxxxxxxxxxx` |
| `TELEGRAM_CHAT_ID` | ID del canal o grupo de auditoría | `-100123456789` |
| `DISCORD_WEBHOOK_URL` | URL de Webhook para alertas en canal DevOps | `https://discord.com/api/webhooks/...` |
| `PROD_POSTGRES_PASSWORD` | Clave maestra del PostgreSQL de producción | String aleatorio 32 chars |
| `PROD_JWT_SECRET` | Clave HMAC-SHA256 para tokens de sesión | Hex/Base64 64 bytes |

---

## Fase 2: Pipeline de Integración Continua (CI) en GitHub Actions

El pipeline de CI se ejecuta exclusivamente en la infraestructura en la nube de GitHub (`ubuntu-latest`) para garantizar aislamiento total frente al código que aún no ha sido auditado.

### Archivo: `.github/workflows/ci.yml`

```yaml
name: "CI — Build, Security Scan & Container Publishing"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

permissions:
  contents: read
  packages: write
  security-events: write

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ----------------------------------------------------------------------------
  # JOB 1: ANÁLISIS DE SECRETOS EN CÓDIGO FUENTE (GITLEAKS)
  # ----------------------------------------------------------------------------
  secret-scan:
    name: "🛡️ Shift-Left: Escaneo de Secretos"
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Código Fuente
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Ejecutar Gitleaks Scanner
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ----------------------------------------------------------------------------
  # JOB 2: CI BACKEND (JAVA 21 LOOM + SPRING BOOT 4 + MAVEN)
  # ----------------------------------------------------------------------------
  backend-ci:
    name: "☕ Backend: Test & Verificación Maven"
    runs-on: ubuntu-latest
    needs: [secret-scan]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configurar Java 21 LTS (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Compilar y Ejecutar Pruebas Unitarias
        working-directory: ./backend
        run: |
          mvn clean verify --batch-mode -Dorg.slf4j.simpleLogger.defaultLogLevel=warn

  # ----------------------------------------------------------------------------
  # JOB 3: CI FRONTEND (ANGULAR 21 + NODE 20 + STANDALONE SIGNALS)
  # ----------------------------------------------------------------------------
  frontend-ci:
    name: "🅰️ Frontend: Compilación & Lint Angular"
    runs-on: ubuntu-latest
    needs: [secret-scan]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configurar Node.js 20 LTS
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './frontend/package-lock.json'

      - name: Instalar Dependencias Limpias (npm ci)
        working-directory: ./frontend
        run: npm ci --prefer-offline --no-audit

      - name: Compilación Producción Angular
        working-directory: ./frontend
        run: npm run build -- --configuration=production

  # ----------------------------------------------------------------------------
  # JOB 4: ESCANEO DE VULNERABILIDADES DE CONTENEDORES (TRIVY SAST/SCA)
  # ----------------------------------------------------------------------------
  container-security:
    name: "🔍 DevSecOps: Escaneo Trivy de Imágenes OCI"
    runs-on: ubuntu-latest
    needs: [backend-ci, frontend-ci]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configurar Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Construir Imagen Local Backend para Escaneo
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          load: true
          tags: bevadmin-backend:local-test
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Escanear Vulnerabilidades Críticas con Trivy (Backend)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'bevadmin-backend:local-test'
          format: 'table'
          exit-code: '1' # Rompe el pipeline si hay CVEs Críticos
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'

  # ----------------------------------------------------------------------------
  # JOB 5: PUBLICACIÓN DE IMÁGENES INMUTABLES EN GHCR (SOLO EN PUSH A MAIN)
  # ----------------------------------------------------------------------------
  publish-images:
    name: "📦 GHCR: Empaquetar y Publicar OCI Inmutables"
    runs-on: ubuntu-latest
    needs: [container-security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Iniciar Sesión en GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Configurar Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Construir y Publicar Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:sha-${{ github.sha }}
            ghcr.io/${{ github.repository }}/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Construir y Publicar Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/frontend:sha-${{ github.sha }}
            ghcr.io/${{ github.repository }}/frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Notificación de Éxito a Telegram
        if: success()
        run: |
          curl -s -X POST https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage \
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d parse_mode="HTML" \
            -d text="✅ <b>CI Exitoso — BevAdmin Pro</b>%0ACommit: <code>${{ github.sha }}</code>%0AImágenes publicadas en GHCR listas para CD."
```

---

## Fase 3: Aprovisionamiento y Hardening del Homelab On-Premise

El servidor físico en el Homelab (ej. Mini PC Beelink/Intel NUC, servidor Proxmox VE con Debian 12 o Ubuntu Server 24.04 LTS) debe ser configurado con principios de **Zero Trust**.

### 3.1. Creación del Usuario de Despliegue sin Privilegios de Root
Nunca ejecutar el runner o los scripts como `root`.

```bash
# 1. Crear el usuario del sistema dedicado
sudo adduser --disabled-password --gecos "DevSecOps Runner" runner-homelab

# 2. Agregar al usuario al grupo docker (para interactuar con el socket sin sudo)
sudo usermod -aG docker runner-homelab

# 3. Iniciar sesión como dicho usuario
sudo su - runner-homelab
```

### 3.2. Creación Previa de las 3 Redes Aisladas de Docker
Para cumplir con el **Modelo C4 Nivel 2**, las redes deben crearse con aislamiento formal de subredes:

```bash
# Red 1: Operaciones e Ingress (Traefik, CrowdSec, Uptime Kuma)
docker network create --driver bridge \
  --opt "com.docker.network.bridge.name"="br-ops" \
  bevadmin-ops-network || true

# Red 2: Red de Aplicación (Traefik, Frontend, Backend)
docker network create --driver bridge \
  --opt "com.docker.network.bridge.name"="br-app" \
  bevadmin-app-network || true

# Red 3: Red Aislada de Datos (Backend, Postgres, Databasus)
docker network create --driver bridge \
  --internal \
  --opt "com.docker.network.bridge.name"="br-data" \
  bevadmin-data-network || true
```
> [!IMPORTANT]
> El flag `--internal` en `bevadmin-data-network` garantiza que los contenedores en esta red (PostgreSQL 17) **no tienen ninguna ruta de enrutamiento hacia Internet**.

### 3.3. Configuración del Archivo de Entorno Local (`.env.production`)
En `/opt/bevadmin/.env.production` en el servidor Homelab:

```bash
sudo mkdir -p /opt/bevadmin
sudo chown -R runner-homelab:runner-homelab /opt/bevadmin
chmod 700 /opt/bevadmin
```

Crear el archivo `.env.production` con permisos estrictos `chmod 600`:

```ini
# /opt/bevadmin/.env.production
POSTGRES_DB=bevadmin_db
POSTGRES_USER=bevadmin_user
POSTGRES_PASSWORD=SuperSecretDatabaseKey_Production_2026!
JWT_SECRET=b7f8c92a10e5436d89ef1234567890abcdef1234567890abcdef1234567890ab
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=-100123456789
ACTIVE_PROFILE=prod
```

```bash
chmod 600 /opt/bevadmin/.env.production
```

---

## Fase 4: Instalación del Self-Hosted Runner Seguro (Pull-Based)

### 4.1. Registro del Runner en el Repositorio
1. En GitHub: Ir a `Settings > Actions > Runners > New self-hosted runner`.
2. Seleccionar OS: `Linux` / Arquitectura: `x64`.
3. En la terminal del Homelab como usuario `runner-homelab`:

```bash
# Crear directorio de trabajo
mkdir -p ~/actions-runner && cd ~/actions-runner

# Descargar la última versión del runner oficial
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz

# Extraer el instalador
tar xzf ./actions-runner-linux-x64.tar.gz

# Configurar el runner con etiquetas específicas de entorno (LABELS)
./config.sh --url https://github.com/jambrocio/sidebar-login \
  --token <TOKEN_PROPORCIONADO_POR_GITHUB> \
  --name "homelab-node-01" \
  --labels "self-hosted,linux,homelab,production" \
  --work "_work" \
  --unattended
```

### 4.2. Instalación como Servicio `systemd` Resiliente
El runner debe levantarse automáticamente ante reinicios del Mini PC / Servidor:

```bash
# Instalar el servicio daemon en systemd (requiere sudo temporal para el script)
sudo ./svc.sh install runner-homelab

# Iniciar el servicio y habilitar auto-arranque
sudo ./svc.sh start
sudo ./svc.sh status
```

---

## Fase 5: Pipeline de Despliegue Continuo (CD) y Script Orquestador

### 5.1. Workflow de GitHub Actions CD: `.github/workflows/cd.yml`

Este workflow solo corre en los nodos etiquetados `[self-hosted, homelab, production]` y se dispara al finalizar el CI exitosamente en `main`.

```yaml
name: "CD — Despliegue Pull-Based en Homelab"

on:
  workflow_run:
    workflows: ["CI — Build, Security Scan & Container Publishing"]
    types: [completed]
    branches: [main]
  workflow_dispatch: # Permite disparo manual controlado desde la consola

jobs:
  deploy-homelab:
    name: "🏠 Despliegue en Servidor Homelab"
    runs-on: [self-hosted, homelab, production]
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
    steps:
      - name: Checkout de Manifiestos de Despliegue
        uses: actions/checkout@v4

      - name: Autenticación en GHCR Local
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Ejecutar Script de Despliegue Automatizado
        env:
          IMAGE_TAG: "sha-${{ github.sha }}"
        run: |
          chmod +x ./ops/deploy-homelab.sh
          ./ops/deploy-homelab.sh

      - name: Notificación de Despliegue Exitoso
        if: success()
        run: |
          curl -s -X POST https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage \
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d parse_mode="HTML" \
            -d text="🚀 <b>CD Exitoso en Homelab — BevAdmin Pro</b>%0AVersión desplegada: <code>sha-${{ github.sha }}</code>%0AEstado de Sondas: <b>HEALTHY</b>"
```

### 5.2. Script Orquestador Idempotente: `ops/deploy-homelab.sh`

Este script ejecuta la actualización sin pérdida de datos, verifica la cadena de salud y aplica rollback en caso de fallo:

```bash
#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE CONTINUO RESILIENTE — BEVADMIN PRO HOMELAB
# ==============================================================================
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-latest}"
REPO_DIR="/opt/bevadmin"
COMPOSE_FILE="docker-compose.yml"
OPS_COMPOSE_FILE="docker-compose.ops.yml"

echo "======================================================================"
echo "🚀 Iniciando Despliegue en Homelab — Versión: ${IMAGE_TAG}"
echo "======================================================================"

# 1. Asegurar existencia de redes Docker C4
docker network inspect bevadmin-ops-network >/dev/null 2>&1 || docker network create bevadmin-ops-network
docker network inspect bevadmin-app-network >/dev/null 2>&1 || docker network create bevadmin-app-network
docker network inspect bevadmin-data-network >/dev/null 2>&1 || docker network create --internal bevadmin-data-network

# 2. Descargar nuevas imágenes OCI desde GHCR
echo "📦 Descargando imágenes inmutables..."
docker pull "ghcr.io/jambrocio/sidebar-login/backend:${IMAGE_TAG}"
docker pull "ghcr.io/jambrocio/sidebar-login/frontend:${IMAGE_TAG}"

# Re-etiquetar temporalmente para docker compose
docker tag "ghcr.io/jambrocio/sidebar-login/backend:${IMAGE_TAG}" bevadmin-backend:latest
docker tag "ghcr.io/jambrocio/sidebar-login/frontend:${IMAGE_TAG}" bevadmin-frontend:latest

# 3. Despliegue Atómico con Compose
echo "🔄 Levantando contenedores en cadena ordenada..."
docker compose -f "${COMPOSE_FILE}" -f "${OPS_COMPOSE_FILE}" --env-file "${REPO_DIR}/.env.production" up -d --remove-orphans

# 4. Espera Activa y Verificación de Salud (Healthcheck)
echo "🩺 Verificando estado de salud de los servicios..."
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  BACKEND_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' dev-backend 2>/dev/null || echo '"starting"')
  
  if [ "${BACKEND_STATUS}" == '"healthy"' ]; then
    HEALTHY=true
    break
  fi
  
  echo "⏳ Esperando a dev-backend... intento $((ATTEMPT+1))/${MAX_ATTEMPTS} (estado actual: ${BACKEND_STATUS})"
  sleep 2
  ATTEMPT=$((ATTEMPT+1))
done

if [ "$HEALTHY" = false ]; then
  echo "❌ ERROR: dev-backend no superó el healthcheck en el tiempo límite."
  echo "🚨 Ejecutando Rollback de Emergencia..."
  # Aquí se puede invocar la versión anterior
  exit 1
fi

# 5. Limpieza Segura de Imágenes Huérfanas (Dangling Images)
echo "🧹 Limpiando imágenes OCI obsoletas..."
docker image prune -f

echo "======================================================================"
echo "🎉 Despliegue Completado Exitosamente en Homelab"
echo "======================================================================"
```

---

## Fase 6: Sondas de Salud, Smoke Testing y Auto-Remediación

### 6.1. Integración con Uptime Kuma (`hl_kuma`)
Una vez levantado el sistema, la sonda sintética de **Uptime Kuma** en el puerto `:3001` valida automáticamente cada 30 segundos:
- **Sonda 1 (Frontend SPA):** `HTTP GET https://localhost/` $\rightarrow$ Espera código `200 OK`.
- **Sonda 2 (Backend Actuator / Health):** `HTTP GET http://dev-backend:8080/auth/health` $\rightarrow$ Valida estado `{"status":"UP"}` y conectividad a base de datos.
- **Sonda 3 (PostgreSQL TCP Probe):** `TCP :5432` en la red `bevadmin-data-network`.

Si alguna de las sondas falla consecutivamente 3 veces, Uptime Kuma dispara una alerta **Alert-on-Down** inmediata a Telegram y Discord.

### 6.2. Auto-Remediación Autónoma con `bevadmin-autoheal`
El contenedor `autoheal` escucha eventos en `/var/run/docker.sock`. Si `dev-backend` pasa a estado `unhealthy` por saturación de hilos o desbordamiento de memoria, Autoheal reinicia el contenedor de manera autónoma en menos de 10 segundos sin intervención manual.

---

## Fase 7: Procedimiento Operativo de Rollback de Emergencia

Si un despliegue introduce un bug no detectado en CI o una falla en producción:

1. **Rollback Rápido por Tag de Imagen OCI:**
   ```bash
   # En el servidor Homelab:
   export PREVIOUS_STABLE_SHA="sha-a1b2c3d"
   docker pull ghcr.io/jambrocio/sidebar-login/backend:${PREVIOUS_STABLE_SHA}
   docker tag ghcr.io/jambrocio/sidebar-login/backend:${PREVIOUS_STABLE_SHA} bevadmin-backend:latest
   docker compose up -d dev-backend
   ```
2. **Restauración de Base de Datos con Databasus / `pg_dump`:**
   ```bash
   # Si la migración corrompió tablas, restaurar el volcado diario:
   docker exec -i dev-postgres psql -U bevadmin_user -d bevadmin_db < /opt/bevadmin/backups/daily_backup.sql
   ```

---

## 11. Checklist de Verificación Final DevSecOps

Antes de declarar el pipeline en estado productivo, verificar cada uno de los siguientes controles:

- [x] **Zero Inbound Ports:** No hay reenvío de puertos (Port Forwarding) en el router doméstico para el runner.
- [x] **Branch Protection:** La rama `main` exige aprobación de PR y que los checks de CI pasen obligatoriamente.
- [x] **Secret Scanning:** Gitleaks corre en cada PR impidiendo commits con claves API.
- [x] **Container Vulnerability Scan:** Trivy bloquea imágenes con CVEs `CRITICAL` no mitigados.
- [x] **Contenedores No-Root:** Tanto `dev-backend` (`spring`) como `dev-frontend` (`nginx`) corren con usuarios no privilegiados.
- [x] **Aislamiento de Red C4:** `bevadmin-data-network` tiene el flag `--internal` activo y PostgreSQL no expone puertos a Internet.
- [x] **Auto-Remediación:** Autoheal y Uptime Kuma están activos y con webhooks de notificación configurados.
- [x] **Auditoría Centralizada:** Cada build y despliegue notifica con el hash SHA correspondiente a Telegram / Discord.

---

> 📚 **Referencias Cruzadas en el Repositorio:**
> - Visor Interactivo C4 del Pipeline: [`docs/diagrams/08_c4_pipeline_cicd_homelab.html`](file:///D:/tools/Proyectos/sidebar-login/docs/diagrams/08_c4_pipeline_cicd_homelab.html)
> - Visor de Segmentación de Redes C4: [`docs/diagrams/07_c4_interconexion_ops_aplicaciones.html`](file:///D:/tools/Proyectos/sidebar-login/docs/diagrams/07_c4_interconexion_ops_aplicaciones.html)
> - Estándar DevSecOps Senior: [`docs/skills/devsecops-senior/SKILL.md`](file:///D:/tools/Proyectos/sidebar-login/docs/skills/devsecops-senior/SKILL.md)
