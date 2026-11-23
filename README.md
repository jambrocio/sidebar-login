# 📦 COTIC — SISTEMA POS & GESTIÓN DE PRODUCTOS

Repositorio monorepo estructurado en **módulos limpios** (`frontend/`, `backend/` y `docs/`) para la gestión integral de **Negocios Matriz, Múltiples Sedes/Sucursales, Ventas al por Mayor y Menor de Productos en General (Abarrotes, Bebidas, Golosinas, Limpieza, Consumo Masivo), Comprobante Electrónico SUNAT con Impresión Dual, Historial de Ventas, Compras y Abastecimiento a Inventario, Cupones de Descuento, Arqueo de Caja por Turno y Seguridad RBAC**.

---

## 1. Estructura General del Repositorio Reorganizado

```text
sidebar-login/
├── PLAN_MAESTRO_DESARROLLO_IA.md # 🌟 Blueprint y Estándar Maestro para Modelos de IA
├── auth-service/               # 🛡️ Centralized Identity Provider (IdP / IAM) en Spring Boot 3.4 (Java 21 LTS + RS256 / JWKS)
│   ├── src/main/java/com/auth/identity/
│   │   ├── core/               # Configuración de Seguridad, JWT Asimétrico (RS256/JWKS) y Errores RFC 7807
│   │   ├── domain/model/       # Entidades de identidad, roles y sesiones
│   │   ├── repository/         # Acceso a esquemas auth, rbac y core vía JdbcClient
│   │   ├── service/            # Lógica transaccional de autenticación, rotación y Kill Session
│   │   └── web/                # Endpoints /login, /refresh, /introspect (RFC 7662), /.well-known/jwks.json (RFC 7517)
│   ├── src/main/resources/application.yml
│   ├── Dockerfile              # Multi-stage build con Eclipse Temurin 21 JRE Alpine
│   ├── pom.xml
│   └── README.md               # Guía técnica de integración para aplicaciones satélites
│
├── frontend/                   # Aplicación Web & PWA en Angular 21 (Standalone + Signals)
│   ├── scripts/update-version.js # Versionado semántico automático en prebuild (v2.4.1)
│   ├── public/                 # version.json, manifest PWA y Service Worker anti-caché
│   ├── src/app/                # 16 Interfaces modulares, AppVersionService y AppDialogService
│   ├── angular.json
│   ├── package.json            # Script "prebuild": "node scripts/update-version.js"
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
│   │   ├── index.html          # Visor interactivo integrado en la misma pestaña (10 Diagramas)
│   │   ├── 01_arquitectura_sistema.html       # C4 Contenedores y Red Docker
│   │   ├── 02_secuencia_emision_venta.html    # Secuencia: Emisión de Venta POS y Cupones
│   │   ├── 03_secuencia_monitoreo_sesiones.html # Secuencia: Auditoría NOC y Kill Session
│   │   ├── 04_secuencia_menu_dinamico_rbac.html # Secuencia: Menú Dinámico y Resolución RBAC
│   │   ├── 05_flujo_operativo_negocio.html    # Flujo Operativo End-to-End (Workflow Trace)
│   │   ├── 06_modelo_datos_erd.html           # Modelo Relacional ERD (19 Tablas en Español)
│   │   ├── 07_c4_interconexion_ops_aplicaciones.html # C4 Ops, Frontend, Backend y BD
│   │   ├── 08_c4_pipeline_cicd_homelab.html   # C4 CI/CD GitHub & Homelab
│   │   ├── 09_secuencia_autenticacion_centralizada_multitenant.html # Autenticación Centralizada IdP
│   │   └── 10_secuencia_versionado_cache_busting_y_dialogos.html # Auto-Version, Cache-Busting & Diálogos
│   │
│   ├── presentacion/           # Presentación Comercial para Clientes Finales
│   │   ├── video_demo_modulos_persona.html # Demo con Presentadora Virtual (Sofía - 65s) en MP4
│   │   ├── video_promocional_bevadmin.html # Spot comercial en video animado HD (50s) en MP4
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
│  • dev-postgres    (Red Data :5432)                    │     │  • dev-postgres    (Aislado en Red Data :5432)         │
│  • dev-auth-service (IdP Centralizado :8081)           │     │  • dev-auth-service (IdP Aislado / Traefik Ingress)    │
│  • dev-backend     (Redes App & Data :8080)            │     │  • dev-backend     (Redes App & Data / Host Inactivo)  │
│  • dev-frontend    (Red App :4200 HTTP)                │     │  • dev-frontend    (Red App / :4200 Host Inactivo)     │
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
* **Healthcheck de Centralized Auth Service (IdP):**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8081/api/v1/auth/health"
  # Respuesta esperada: {"status":"UP","service":"centralized-auth-service"}
  ```
* **Discovery JWKS Público (Tokens Asimétricos RS256):**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8081/.well-known/jwks.json"
  # Retorna el Key Set público con el Key ID activo
  ```
* **Healthcheck del Backend de Negocio:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/health"
  # Respuesta esperada: {"status":"UP","service":"bevadmin-backend"}
  ```
* **Documentación OpenAPI / Swagger:**
  - Centralized Auth Service: [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html)
  - Backend Comercial y Ventas: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
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
- **Módulo de Vulnerabilidades & Hardening:** [http://localhost:4200/dashboard/vulnerabilities](http://localhost:4200/dashboard/vulnerabilities)
- **Identity Provider Centralizado (auth-service):** [http://localhost:8081](http://localhost:8081) (JWKS: `/.well-known/jwks.json`)
- **Backend REST API (Spring Boot 4):** [http://localhost:8080/api/v1](http://localhost:8080/api/v1) (o vía Traefik en [https://localhost/api/v1](https://localhost/api/v1))
- **Swagger UI (OpenAPI 3.1):** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Actuator Health Check:** [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **PostgreSQL 17 Database:** `localhost:5432/admin_dashboard_db`

### Endpoints del Módulo de Operaciones (VPS Hardened):
- **Uptime Kuma (Monitoreo Alert-on-Down):** [http://localhost:3001](http://localhost:3001)
- **Databasus (Panel Visual de Respaldos):** [http://localhost:8085](http://localhost:8085) (o [https://backup.bevadmin.com](https://backup.bevadmin.com))
- **Traefik Dashboard (Seguridad Ingress & Middlewares):** [http://localhost:8088/dashboard/](http://localhost:8088/dashboard/)

### Credenciales de Acceso al Sistema:
| Rol | Usuario | Contraseña | Empresa Asignada |
| :--- | :--- | :--- | :--- |
| **Administrador General** | `agarcia` | `AdminRoble2026#` | Distribuidora El Roble S.A.C. |
| **Administrador de Negocio (COTIC)** | `rambrocio` | `AdminRoble2026#` | COTIC S.A.C. |
| **Administrador de Sede** | `jquispe` | `SedeRoble2026#` | Distribuidora El Roble S.A.C. |
| **Supervisor de Ventas** | `cmendoza` | `SuperRoble2026#` | Distribuidora El Roble S.A.C. |
| **Cajero Mayorista** | `ltorres` | `CajaRoble2026#` | Distribuidora El Roble S.A.C. |

---

## 5. Enlaces a Portales Interactivos y Multimedia

* 🎬 **[Portal Central Multimedia (`presentacion/index.html`)](file:///D:/tools/Proyectos/sidebar-login/presentacion/index.html)**
* 📹 **[Opción 1: Spot Comercial Oficial en Video HD (`docs/presentacion/video_promocional_bevadmin.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/presentacion/video_promocional_bevadmin.html)**
* 👩‍💼 **[Opción 2: Demo con Presentadora Sofía (`docs/presentacion/video_demo_modulos_persona.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/presentacion/video_demo_modulos_persona.html)**
* 🎨 **[Presentación Interactiva a Clientes y Simulador POS (`docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html)**
* 🌐 **[Portal de Diagramas Técnicos de Software (`docs/diagrams/index.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/diagrams/index.html)** *(10 Diagramas interactivos listos, 100% pasaron gates)*
* ☁️ **[Portal de Arquitecturas Cloud y Costos (`docs/cloud/index.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/cloud/index.html)**
* 🛡️ **[Diagrama Arquitectura VPS Hardened con Docker (`docs/cloud/03_arquitectura_cloud_vps.html`)](file:///D:/tools/Proyectos/sidebar-login/docs/cloud/03_arquitectura_cloud_vps.html)**

---

## 6. Nuevas Capacidades y Mejoras Funcionales Empresariales

### 💱 Multi-Divisa por Negocio con Moneda por Defecto
- Soporte para operar en múltiples monedas (PEN, USD, EUR) parametrizables por empresa.
- Detección y autoselección automática de la divisa por defecto según el negocio asignado al usuario.

### 🚚 Módulo de Proveedores Comerciales y Abastecimiento
- Gestión centralizada de proveedores con RUC/DNI, razón social, rubro comercial, datos de contacto y switch reactivo de estado **Activo / Inactivo**.
- Enlace directo de compras y abastecimiento con el catálogo de bebidas: cada orden recibida actualiza el stock final de cajas y unidades en tiempo real.

### 🛒 POS Mayor / Menor con Búsqueda Ágil e Impresión Dual
- **Búsqueda rápida en tiempo real:** Filtro instantáneo por nombre y SKU con indicador visual de stock disponible antes de agregar al carrito.
- **Edición en carrito:** Modificación dinámica de cantidades con recálculo automático de subtotales e impuestos.
- **Cuadre Fiscal y Contable Riguroso:** Implementación matemática exacta:
  $$\text{Subtotal} = \text{Importe Total} - \text{IGV}$$
  Garantizando que $\text{Subtotal} + \text{IGV} = \text{Importe Total}$ cuadre al centavo tanto en backend como en frontend.
- **Impresión Dual de Comprobantes:** Selector de formato directo para ticketera térmica de 80mm o descarga en PDF formato estándar A4.

### 📋 Estandarización de Formularios y Formatos de Datos
- **Fechas Unificadas:** Formato estandarizado `YYYY-MM-DD HH:mm:ss` en todas las tablas y comprobantes.
- **Montos Numéricos:** Separador de miles por comas y decimales por punto (`1,234.56`).
- **Validación Visual Reactiva:** Los campos obligatorios sin completar se resaltan en rojo con advertencia visual al intentar guardar; limpieza automática de campos al ingresar o tras registrar/actualizar.

### 🛡️ Módulo de Auditoría de Vulnerabilidades y Hardening de Seguridad Defensiva
- **Registro Centralizado y Trazabilidad:** Monitoreo y gestión de 14 hallazgos de seguridad técnica (`SEC-2026-001` a `SEC-2026-014`) clasificados según estándares OWASP Top 10 y CIS Benchmarks.
- **Ordenamiento Descendente Prioritario:** Tabla ordenada automáticamente de **últimos a primeros por código** (`SEC-2026-014`, `SEC-2026-013` ...) con comparación numérica natural en frontend y backend.
- **Solución Aplicada Documentada:** Cada hallazgo cuenta con su descripción, impacto, plan de remediación y la **solución técnica aplicada** (`solucion_aplicada`), editable e inspeccionable vía modal interactivo.
- **Hardening de Contenedores y Mitigación `nginx2root`:**
  - `dev-frontend`: Contenedor Nginx configurado en modo **rootless** (`USER nginx`), con capacidad de Linux acotada (`setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx`, `cap_drop: ALL`, `cap_add: NET_BIND_SERVICE`).
  - **CIS Docker Benchmark 5.25:** Directiva `security_opt: [no-new-privileges:true]` activada en todos los servicios de `docker-compose.yml` para evitar escalamiento de privilegios vía SUID/SGID.
- **Blindaje de Identidad y APIs:**
  - IdP Centralizado (`auth-service`) con firmas asimétricas RS256/JWKS, historial de contraseñas (anti-reuso), validación regex de complejidad y protección contra BOLA/BFLA en endpoints multi-inquilino.
  - Cabeceras HTTP de seguridad estrictas (HSTS, CSP con origen IdP, X-Frame-Options, X-Content-Type-Options) y sandboxing estricto de iframes en tickets POS (`sandbox="allow-scripts allow-same-origin"`).

### 🚀 Protocolo de Versionado Semántico y Anti-Caché Transparente (Zero `Ctrl + F5`)
- **Hook de Compilación (`prebuild`)**: Todo build (`docker compose build dev-frontend`, `npm run build`) ejecuta obligatoriamente `scripts/update-version.js`, sincronizando la versión semántica (**v2.4.1**), release (**20261123-02**) y fecha de build en `public/version.json`, `package.json` y perfiles de entorno Angular.
- **Servicio `AppVersionService`**: Realiza sondeo periódico en background (45s) y en cada navegación. Al detectar una versión más reciente en el servidor, presenta un banner flotante reactivo permitiendo actualizar con 1 clic sin perder sesión, o aplica purga transparente de `CacheStorage` preservando tokens JWT en `sessionStorage`.
- **`AppErrorHandler`**: Captura errores de desfasaje de bundles (`ChunkLoadError` o `Failed to fetch dynamically imported module`) recargando limpiamente la aplicación sin fricción para el usuario.
- **Ubicación Estratégica de Versión**:
  - Pastilla verde pulsante (`Online`) en el Navbar (`COTIC v2.4.1`) con acceso directo al modal corporativo de soporte técnico.
  - Badge en la cabecera del Sidebar junto a la marca oficial: **`COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS`**.
  - Modal de diagnóstico integral con copiado en 1 clic de informe técnico para soporte y botón secundario de verificación manual.

### 🔔 Sistema Universal de Diálogos y Confirmaciones Corporativas (`AppDialogService`)
- **Erradicación de Alertas Nativas**: Eliminación absoluta de `window.alert()` y `window.confirm()` bloqueantes.
- **Servicio Asíncrono no Bloqueante**: Basado en `Promise<boolean>`, renderiza modales temáticos con variantes semánticas (`danger`, `warning`, `info`, `primary`, `success`).
- **Botones Corporativos Homologados**:
  - Botón de Acción Principal (`.btn-corporate-action` con variantes de color, gradientes, sombra y elevación).
  - Botón Secundario de Alto Contraste (`.btn-corporate-secondary` con altura 42px, radio 10px, padding 1.35rem, peso 700, bordes sólidos `#cbd5e1` / `#475569`, fondos slate con contraste accesible e iconos contextuales `bi-x-circle` y `bi-shield-check`).
- **Despliegue Transversal**:
  - **Cierre de Sesión**: Confirmación de salida con resguardo de operaciones no guardadas ("Sí, Cerrar Sesión" vs "Permanecer en el Sistema").
  - **Administración de Usuarios**: "¿Restablecer Contraseña?" con asignación de clave default institucional `Cotic2026#` ("Restablecer Clave" vs "Cancelar").
  - **Seguridad & Sesiones**: "¿Bloquear Cuenta de Usuario?" ante detección de accesos no autorizados ("Sí, Bloquear Cuenta" vs "Cancelar").

### 🌐 Certificación y Pruebas Multi-Navegador Automatizadas
- **Validación Multi-Browser**: Certificación automática mediante script CDP (`scripts/verify_cross_browser.js`) ejecutado sobre **Google Chrome**, **Microsoft Edge** y **Mozilla Firefox**.
- **Inspección de Computed Styles**: Confirmación programática del cálculo de estilos (`42px`, `#f1f5f9` / `#334155`, bordes sólidos visibles) y generación de capturas de alta definición en `docs/manual/imagenes/`.

* 🗄️ **[Diccionario de Base de Datos en Español (`docs/sql/README.md`)](file:///D:/tools/Proyectos/sidebar-login/docs/sql/README.md)**
* 🗺️ **[Mapeo Técnico de Interfaces (`docs/technical_frontend_interfaces_and_database_mapping.md`)](file:///D:/tools/Proyectos/sidebar-login/docs/technical_frontend_interfaces_and_database_mapping.md)**
