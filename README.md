# El Roble — Plataforma Multisede de Compra y Venta de Bebidas (Mayor y Menor)

Repositorio monorepo estructurado en **módulos limpios** (`frontend/`, `backend/` y `docs/`) para la gestión integral de **Negocios Matriz, Múltiples Sedes/Sucursales, Ventas al por Mayor y Menor con Comprobante Electrónico, Historial de Ventas por Usuario, Compras y Abastecimiento, Cupones de Descuento, Arqueo de Caja por Turno y Seguridad RBAC**.

---

## 1. Estructura General del Repositorio Reorganizado

```text
sidebar-login/
├── PLAN_MAESTRO_DESARROLLO_IA.md # 🌟 Blueprint y Estándar Maestro para Modelos de IA
├── frontend/                   # Aplicación Web & PWA en Angular 21 (Standalone + Signals)
│   ├── .agents/                # Reglas de actualización automática y Skills de arquitectura
│   ├── json/                   # 11 Archivos JSON con datos dummy desacoplados
│   ├── public/                 # Manifiesto PWA (manifest.webmanifest) y Service Worker (sw.js)
│   ├── src/app/                # 16 Interfaces modulares (1 componente standalone por vista)
│   ├── angular.json
│   ├── package.json
│   └── README.md               # Guía de instalación y ejecución del Frontend
│
├── backend/                    # Backend REST API en Spring Boot 4.0 (Java 21 LTS + Hilos Virtuales)
│   ├── src/main/java/com/elroble/bevadmin/
│   │   ├── config/             # Configuración CORS y Web
│   │   ├── common/             # Manejador global de errores RFC 9457 (ProblemDetail)
│   │   ├── security/           # Spring Security 7 + JWT + RBAC + Guardia de Sede Asignada
│   │   ├── audit/              # Aspecto AOP @Auditable hacia auditoria_autenticacion
│   │   └── modules/            # 11 Controladores REST (/api/v1/...)
│   ├── src/main/resources/application.yml
│   ├── pom.xml
│   └── README.md               # Guía de ejecución del Backend Spring Boot 4
│
├── docs/                       # Documentación Centralizada, Diagramas, Cloud, SQL y Skills
│   ├── README.md               # Índice general y guía de navegación de documentación
│   ├── technical_frontend_interfaces_and_database_mapping.md # Mapeo técnico interfaces <-> DB
│   │
│   ├── cloud/                  # Arquitecturas Cloud (Azure & GCP), CI/CD y Comparativa de Costos
│   │   ├── index.html          # Portal unificado para alternar entre Azure y GCP
│   │   ├── 01_arquitectura_cloud_azure.html   # Diagrama interactivo Azure (Archify Showcase)
│   │   ├── 02_arquitectura_cloud_gcp.html     # Diagrama interactivo GCP (Archify Showcase)
│   │   └── ARQUITECTURA_CLOUD_AZURE_GCP_Y_COSTOS.md # Guía técnica y cuadro de costos FinOps
│   │
│   ├── diagrams/               # Diagramas Técnicos de Software (Archify Showcase v3.2.0)
│   │   ├── index.html          # Visor interactivo integrado en la misma pestaña
│   │   ├── 01_arquitectura_sistema.html       # C4 Contenedores y Red Docker
│   │   ├── 02_secuencia_emision_venta.html    # Secuencia: Emisión de Venta POS y Cupones
│   │   ├── 03_secuencia_monitoreo_sesiones.html # Secuencia: Auditoría NOC y Kill Session
│   │   ├── 04_secuencia_menu_dinamico_rbac.html # Secuencia: Menú Dinámico y Resolución RBAC
│   │   ├── 05_flujo_operativo_negocio.html    # Flujo Operativo End-to-End (Workflow Trace)
│   │   └── 06_modelo_datos_erd.html           # Modelo Relacional ERD (19 Tablas en Español)
│   │
│   ├── presentacion/           # Presentación Comercial para Clientes Finales
│   │   ├── PRESENTACION_INTERACTIVA_USUARIO.html # Pitch Deck interactivo en Tema Claro
│   │   └── PRESENTACION_INTERACTIVA_USUARIO.md # Manual funcional para el usuario de tienda
│   │
│   ├── skills/                 # Estándares de Ingeniería Senior (Buenas Prácticas & OWASP)
│   │   ├── backend-senior/SKILL.md            # Backend Senior (Spring Boot, Java 21, Clean Arch)
│   │   ├── dba-senior/SKILL.md                # DBA Senior (PostgreSQL 17, 3FN, Optimización)
│   │   ├── devsecops-senior/SKILL.md          # DevSecOps Senior (Docker, CI/CD, Shift-Left)
│   │   └── frontend-senior/SKILL.md           # Frontend Senior (Angular 21, Signals, WCAG)
│   │
│   └── sql/                    # Base de Datos PostgreSQL 17 (100% en Español)
│       ├── 01_schema_ddl.sql   # DDL de las 19 tablas relacionales en español
│       ├── 02_seed_dummy_data.sql # Datos semilla sincronizados
│       ├── 03_queries_and_views.sql # Función fn_obtener_menu y vistas consolidadas
│       ├── 04_password_expiration_and_locked_status.sql # Políticas de clave y bloqueo
│       ├── 05_active_sessions_and_remote_kill.sql # Auditoría de sesiones y Kill Session
│       ├── 06_add_sessions_menu_item_and_permissions.sql # Registro de menú y permisos
│       ├── 07_analyst_and_auditor_permissions.sql # Roles Auditor y Analista
│       └── README.md           # Diccionario completo de datos y objetos en español
│
├── docker-compose.yml          # Orquestación base de aplicación (dev-postgres, dev-backend, dev-frontend)
├── docker-compose.ops.yml      # 🛡️ Orquestación independiente VPS (Traefik, CrowdSec, Uptime Kuma, Autoheal, Backup)
├── ops/                        # Configuraciones modulares de Seguridad y Monitoreo (VPS Hardened)
│   ├── README.md               # 📖 Guía maestra de la suite operativa independiente
│   ├── traefik/                # Reverse Proxy, SSL TLS 1.3, Bloqueo HTTP y OWASP (README.md)
│   ├── crowdsec/               # WAF / IPS Colaborativo y Detección de Intrusiones (README.md)
│   ├── uptime-kuma/            # Monitoreo de Disponibilidad "Alert-on-Down Only" (README.md)
│   ├── autoheal/               # Watchdog de Auto-Recuperación de Contenedores (README.md)
│   ├── db-backup/              # Respaldos Diarios Automatizados con Rotación GFS (README.md)
│   ├── .env.ops.example        # Variables operativas (dominio, SSL ACME, credenciales)
│   ├── start-ops.ps1           # Script de control operativo en Windows
│   └── start-ops.sh            # Script de control operativo en Linux / VPS
├── start.ps1                   # Script maestro multiplataforma para Windows
└── start.sh                    # Script maestro multiplataforma para Linux / macOS
```

---

## 2. Inicio Rápido con el Script Maestro (`start.ps1` / `start.sh`)

El proyecto cuenta con un **script maestro en la raíz** que orquesta la verificación y arranque secuencial de todos los contenedores (`PostgreSQL` $\rightarrow$ `Spring Boot Backend` $\rightarrow$ `Angular Frontend`), permitiendo elegir el ambiente de ejecución:

```powershell
# En Windows (PowerShell):
.\start.ps1 -Environment dev     # Inicia en ambiente Desarrollo
.\start.ps1 -Environment qa      # Inicia en ambiente QA
.\start.ps1 -Environment prod    # Inicia en ambiente Producción

# O simplemente ejecutar sin parámetros para el Menú Interactivo:
.\start.ps1
```

```bash
# En Linux / macOS / Git Bash:
./start.sh dev                   # Desarrollo
./start.sh qa                    # QA
./start.sh prod                  # Producción
```

---

## 3. Guía de Pruebas y Validación: Solo Aplicación vs. Conjunto con Operaciones

El proyecto está diseñado bajo una arquitectura modular donde la **Aplicación Core** y el **Módulo de Operaciones (Seguridad & Monitoreo)** pueden ejecutarse y probarse de forma totalmente independiente o en conjunto:

```
┌────────────────────────────────────────────────────────┐     ┌────────────────────────────────────────────────────────┐
│            MODO 1: SOLO APLICACIÓN                     │     │         MODO 2: CONJUNTO CON OPERACIONES (VPS)         │
│             (docker-compose.yml)                       │     │        (docker-compose.yml + docker-compose.ops.yml)   │
├────────────────────────────────────────────────────────┤     ├────────────────────────────────────────────────────────┤
│  • dev-postgres  (Red Data :5432)                      │     │  • dev-postgres  (Aislado en Red Data :5432)           │
│  • dev-backend   (Redes App & Data :8080)              │     │  • dev-backend   (Redes App & Data / Host Inactivo)    │
│  • dev-frontend  (Red App :4200 HTTP)                  │     │  • dev-frontend  (Red App / :4200 Host Inactivo)       │
│                                                        │     │  • bevadmin-proxy (Traefik TLS 1.3 Ingress :443)       │
│                                                        │     │  • bevadmin-crowdsec (WAF/IPS Anti-Bot / Anti-OWASP)   │
│                                                        │     │  • bevadmin-uptime-kuma (Alert-on-Down Monitor :3001)  │
│                                                        │     │  • bevadmin-autoheal (Watchdog auto-restart)           │
│                                                        │     │  • bevadmin-db-backup (Dumps diarios GFS automáticos)  │
│                                                        │     │  • bevadmin-databasus (Panel Visual Respaldos :8085)   │
│  Redes: bevadmin-app-network, bevadmin-data-network    │     │  Redes Segmentadas: Ops-Net, App-Net y Data-Net (Zero) │
└────────────────────────────────────────────────────────┘     └────────────────────────────────────────────────────────┘
```

---

### 3.1. Prueba de Solo Aplicación (Modo Standalone)

Este modo levanta exclusivamente los 3 contenedores funcionales de la aplicación, exponiendo sus puertos directos (`5432`, `8080`, `4200`) para desarrollo ágil y validación de lógica de negocio:

#### 1. Iniciar los contenedores:
```powershell
# Windows PowerShell:
.\start.ps1 -Environment prod

# Linux / macOS:
./start.sh prod
```
*(Alternativa directa con Docker: `docker compose up -d`)*

#### 2. Comandos de Verificación:
```powershell
# Verificar que los 3 contenedores estén activos y saludables:
docker compose ps
```

#### 3. Pruebas Funcionales:
* **Salud de Base de Datos:**
  ```powershell
  docker exec dev-postgres pg_isready -U postgres -d admin_dashboard_db
  # Respuesta esperada: /var/run/postgresql:5432 - accepting connections
  ```
* **Healthcheck del Backend REST API:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/health"
  # Respuesta esperada: {"status":"UP","service":"bevadmin-backend"}
  ```
* **Documentación OpenAPI / Swagger:** Abrir en el navegador [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html).
* **Frontend Angular SPA:** Abrir en el navegador [http://localhost:4200](http://localhost:4200) (debe cargar la pantalla de login).
* **Prueba de Autenticación:**
  ```powershell
  $body = @{ username = "agarcia"; password = "AdminRoble2026#" } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $body
  ```

#### 4. Detener la aplicación:
```powershell
docker compose down
```

---

### 3.2. Prueba en Conjunto: Aplicación + Módulo de Operaciones (VPS Hardened)

Este modo simula el despliegue final de producción en un servidor VPS, incorporando la capa de **Seguridad Web (WAF + TLS 1.3 con Traefik)**, **Prevención de Intrusiones (CrowdSec)**, **Monitoreo inteligente (Uptime Kuma con regla "Alert-on-Down")**, **Auto-reinicio (Autoheal)** y **Respaldos de Base de Datos**:

#### 1. Iniciar la Aplicación Core:
```powershell
.\start.ps1 -Environment prod
# (o: docker compose up -d)
```

#### 2. Iniciar el Módulo de Operaciones:
```powershell
.\start-ops.ps1
# (o: docker compose -f docker-compose.ops.yml up -d)
```

#### 3. Verificar la Salud de Todos los Servicios (9 Contenedores):
```powershell
docker compose ps
docker compose -f docker-compose.ops.yml ps
```
*Todos los contenedores deben figurar en estado `Up (healthy)`.*

#### 4. Pruebas End-to-End Integradas:

##### A. Prueba de Ingress Seguro Exclusivo HTTPS (Traefik TLS 1.3):
Cuando el módulo de Operaciones está habilitado, el puerto `80` (HTTP plano) se encuentra **completamente inactivo** para evitar tráfico no cifrado y ataques de degradación (*SSL-stripping*). El único ingreso permitido es a través del puerto seguro `443` (HTTPS) con la cadena de middlewares OWASP:
```powershell
# 1. Verificar que HTTP esté inactivo (Puerto 80 cerrado / Connection Refused):
try {
    Invoke-WebRequest -Uri "http://localhost/api/v1/auth/health" -TimeoutSec 3
} catch {
    Write-Host "✓ HTTP inactivo correctamente: $($_.Exception.Message)" -ForegroundColor Green
}

# 2. Probar acceso seguro al Backend a través de Traefik (HTTPS):
Invoke-RestMethod -Uri "https://localhost/api/v1/auth/health" -SkipCertificateCheck
# Respuesta esperada: {"status":"UP","service":"bevadmin-backend"}

# 3. Probar acceso seguro al Frontend a través de Traefik (HTTPS + Headers OWASP):
$res = Invoke-WebRequest -Uri "https://localhost/" -SkipCertificateCheck -Method Head
$res.Headers["Strict-Transport-Security"]  # max-age=31536000; includeSubDomains; preload
$res.Headers["Referrer-Policy"]            # strict-origin-when-cross-origin
$res.Headers["Permissions-Policy"]          # camera=(), microphone=(), geolocation=()

# 4. Inspeccionar el Dashboard visual de Traefik:
# Abrir en el navegador: http://localhost:8088/dashboard/
```

##### B. Prueba del Monitoreo "Alert-on-Down" (Uptime Kuma):
1. **Acceder a la interfaz web de Uptime Kuma:** [http://localhost:3001](http://localhost:3001).
2. **Crear la cuenta de administrador** inicial en el primer ingreso.
3. **Verificar las 3 sondas internas de salud:**
   - 🌐 **Frontend:** `http://dev-frontend:80/` (Protocolo HTTP, código 200).
   - ⚙️ **Backend:** `http://dev-backend:8080/api/v1/auth/health` (Protocolo HTTP, busca `"status":"UP"`).
   - 🗄️ **Base de Datos:** `dev-postgres:5432` (Protocolo TCP Port).
4. **Configurar el canal de alerta:** Ir a *Settings* $\rightarrow$ *Notifications* $\rightarrow$ Agregar **Telegram** (Bot Token + Chat ID) o **Discord** (Webhook URL).
5. **Prueba de Fuego "Alert-on-Down" (Simulación de Incidente Real):**
   ```powershell
   # 1. Detener intencionalmente el backend para simular caída:
   docker stop dev-backend

   # 2. Esperar 30 a 45 segundos:
   # Uptime Kuma realizará 3 reintentos y, al confirmar que está caído,
   # emitirá INMEDIATAMENTE una notificación de alarma al canal configurado:
   # 🚨 [DOWN] Backend REST API is down!

   # 3. Restablecer el servicio:
   docker start dev-backend

   # 4. Al volver a estar saludable, emitirá un único aviso de confirmación:
   # ✅ [UP] Backend REST API is back up!
   ```
   *Nota: Durante el funcionamiento normal no se genera ningún spam ni ruido de alertas.*

##### C. Prueba del Watchdog de Auto-Recuperación (Autoheal):
Autoheal vigila continuamente los `healthcheck` de Docker. Si un contenedor entra en estado `unhealthy`, lo reinicia automáticamente en menos de 15 segundos sin intervención humana.

##### D. Prueba de Respaldo Automatizado de Base de Datos:
```powershell
# 1. Ejecutar un volcado manual inmediato:
docker exec bevadmin-db-backup /backup.sh

# 2. Comprobar el archivo comprimido generado en el volumen:
docker exec bevadmin-db-backup ls -lh /backups/daily/
# Generará: admin_dashboard_db-YYYYMMDD.sql.gz
```

##### E. Panel Visual de Gestión y Respaldos (Databasus):
1. **Acceder a la interfaz web:** [http://localhost:8085](http://localhost:8085) (o vía Traefik en [https://backup.bevadmin.com](https://backup.bevadmin.com)).
2. **Crear la cuenta de administrador** inicial.
3. **Conectar a la base de datos:** `dev-postgres:5432`, `admin_dashboard_db`, `postgres`/`postgres`.
4. **Definir destino de almacenamiento local (Homelab):** En *Destinations*, seleccionar *Local Storage* y configurar la ruta persistente `/backups`.
5. **Programar tareas automáticas:** Respaldos programados con rotación diaria (7 días) y restauración asistida con 1 clic.
6. **Notificaciones Nativas:** Alertas instantáneas de éxito/fallo enviadas a Telegram, Discord o Webhooks.

#### 5. Segmentación de Redes en Tres Capas (Zero-Trust):
La plataforma aísla el tráfico en tres redes virtuales independientes:
- 🌐 **`bevadmin-ops-network`:** Contiene los servicios perimetrales y de soporte (Traefik, CrowdSec, Uptime Kuma, Autoheal, Backup y Databasus).
- 📱 **`bevadmin-app-network`:** Conecta exclusivamente el Frontend Angular SPA (Nginx) con el Backend Spring Boot REST API y el Ingress Traefik.
- 🗄️ **`bevadmin-data-network`:** Conecta la base de datos PostgreSQL únicamente con el Backend y las herramientas autorizadas de respaldo (`db-backup` y `databasus`). **El Frontend no tiene acceso a esta red**, garantizando que un compromiso del servidor web nunca exponga la base de datos.

#### 6. Detención Ordenada de los Entornos:
```powershell
# Detener módulo de operaciones y rehabilitar HTTP automático:
.\stop-ops.ps1
# (o: .\start-ops.ps1 -Stop)

# Detener aplicación:
docker compose down
```

---

## 4. URLs y Credenciales de Acceso

### Endpoints de la Aplicación Core:
- **Frontend Angular 21 (Nginx SPA):** [http://localhost:4200](http://localhost:4200) (o vía Traefik en [https://localhost](https://localhost))
- **Backend REST API (Spring Boot 4):** [http://localhost:8080/api/v1](http://localhost:8080/api/v1) (o vía Traefik en [https://localhost/api/v1](https://localhost/api/v1))
- **Swagger UI (OpenAPI 3.1):** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Actuator Health Check:** [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **PostgreSQL 17 Database:** `localhost:5432/admin_dashboard_db`

### Endpoints del Módulo de Operaciones (VPS Hardened):
- **Uptime Kuma (Monitoreo Alert-on-Down):** [http://localhost:3001](http://localhost:3001)
- **Databasus (Panel Visual de Respaldos):** [http://localhost:8085](http://localhost:8085) (o [https://backup.bevadmin.com](https://backup.bevadmin.com))
- **Traefik Dashboard (Seguridad Ingress & Middlewares):** [http://localhost:8088/dashboard/](http://localhost:8088/dashboard/)

### Credenciales de Acceso al Sistema:
| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Administrador General** | `agarcia` | `AdminRoble2026#` |
| **Administrador de Sede** | `jquispe` | `SedeRoble2026#` |
| **Supervisor de Ventas** | `cmendoza` | `SuperRoble2026#` |
| **Cajero Mayorista** | `ltorres` | `CajaRoble2026#` |

---

## 5. Enlaces a Portales Interactivos

* 🌐 **[Portal de Diagramas Técnicos de Software (`docs/diagrams/index.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/diagrams/index.html)**
* ☁️ **[Portal de Arquitecturas Cloud y Costos (`docs/cloud/index.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/cloud/index.html)**
* 🛡️ **[Diagrama Arquitectura VPS Hardened con Docker (`docs/cloud/03_arquitectura_cloud_vps.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/cloud/03_arquitectura_cloud_vps.html)**
* 🎨 **[Presentación Interactiva en Tema Claro (`docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html)**
* 🗄️ **[Diccionario de Base de Datos en Español (`docs/sql/README.md`)](file:///D:/tools/Proyectos/sidebar-login/docs/sql/README.md)**
* 🗺️ **[Mapeo Técnico de Interfaces (`docs/technical_frontend_interfaces_and_database_mapping.md`)](file:///D:/tools/Proyectos/sidebar-login/docs/technical_frontend_interfaces_and_database_mapping.md)**
