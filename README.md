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
├── docker-compose.yml          # Orquestación de contenedores (dev-postgres, dev-backend, dev-frontend)
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

## 3. URLs y Credenciales de Acceso

- **Frontend Angular 21 (Nginx SPA):** [http://localhost:4200](http://localhost:4200)
- **Backend REST API (Spring Boot 4):** [http://localhost:8080/api/v1](http://localhost:8080/api/v1)
- **Swagger UI (OpenAPI 3.1):** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Actuator Health Check:** [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **PostgreSQL 17 Database:** `localhost:5432/admin_dashboard_db`

### Credenciales de Acceso:
| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Administrador General** | `agarcia` | `AdminRoble2026#` |
| **Administrador de Sede** | `jquispe` | `SedeRoble2026#` |
| **Supervisor de Ventas** | `cmendoza` | `SuperRoble2026#` |
| **Cajero Mayorista** | `ltorres` | `CajaRoble2026#` |

---

## 4. Enlaces a Portales Interactivos

* 🌐 **[Portal de Diagramas Técnicos de Software (`docs/diagrams/index.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/index.html)**
* ☁️ **[Portal de Arquitecturas Cloud y Costos (`docs/cloud/index.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/cloud/index.html)**
* 🎨 **[Presentación Interactiva en Tema Claro (`docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html)**
* 🗄️ **[Diccionario de Base de Datos en Español (`docs/sql/README.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/sql/README.md)**
* 🗺️ **[Mapeo Técnico de Interfaces (`docs/technical_frontend_interfaces_and_database_mapping.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/technical_frontend_interfaces_and_database_mapping.md)**
