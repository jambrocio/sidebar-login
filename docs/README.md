# 📚 Portal Central de Documentación — BevAdmin Pro

Bienvenido al centro neurálgico de documentación técnica, operativa, arquitectónica y comercial del **Sistema de Distribución y Venta de Bebidas (Mayor y Menor)**.

Toda la documentación del repositorio ha sido reorganizada de forma modular bajo la carpeta **`docs/`** para facilitar su navegación, auditoría y mantenimiento continuo.

---

## 🗺️ Mapa y Estructura Modular de `docs/`

```text
docs/
├── cloud/                                      # Arquitectura Cloud (Azure & GCP), CI/CD y FinOps
│   ├── index.html                              # Portal interactivo para alternar entre Azure y GCP
│   ├── 01_arquitectura_cloud_azure.html        # Diagrama Archify: Azure PaaS / Serverless
│   ├── 02_arquitectura_cloud_gcp.html          # Diagrama Archify: Google Cloud Run Serverless
│   └── ARQUITECTURA_CLOUD_AZURE_GCP_Y_COSTOS.md# Especificación técnica y comparativa detallada de costos
│
├── diagrams/                                   # Diagramas de Arquitectura C4, Secuencias y Flujos
│   ├── index.html                              # Visor interactivo centralizado en la misma pestaña
│   ├── 01_arquitectura_sistema.html            # C4 Contenedores y Red Docker
│   ├── 02_secuencia_emision_venta.html         # Secuencia: Emisión de Venta POS y Cupones
│   ├── 03_secuencia_monitoreo_sesiones.html    # Secuencia: Auditoría NOC y Kill Session
│   ├── 04_secuencia_menu_dinamico_rbac.html    # Secuencia: Menú Dinámico y Resolución RBAC
│   ├── 05_flujo_operativo_negocio.html         # Flujo Operativo End-to-End (Workflow Trace)
│   ├── 06_modelo_datos_erd.html                # Modelo de Datos Relacional ERD (19 Tablas en Español)
│   ├── 07_c4_interconexion_ops_aplicaciones.html # C4 Nivel 2: Segmentación de Redes (Ops, App y Datos) con Databasus
│   └── 08_c4_pipeline_cicd_homelab.html        # C4 Nivel 2: Pipeline CI/CD con GitHub Actions y Runner en Homelab
│
├── README_PIPELINE_CICD_HOMELAB_DEVSECOPS.md   # Guía Maestra DevSecOps: Implementación paso a paso del Pipeline CI/CD en Homelab
│
├── presentacion/                               # Presentaciones, Videos HyperFrames y Pitches
│   ├── video_c4_segmentacion_redes.html        # Video animado HyperFrames (52s): C4 Nivel 2 y Segmentación de Redes (Ops, App, Datos)
│   ├── video_promocional_bevadmin.html         # Video animado de 38s con HyperFrames (Video-as-Code)
│   ├── PRESENTACION_INTERACTIVA_USUARIO.html   # Pitch interactivo en Tema Claro con Simulador POS y ROI
│   └── PRESENTACION_INTERACTIVA_USUARIO.md     # Guía funcional detallada para el usuario final
│
├── skills/                                     # Estándares y Guías Maestras de Ingeniería Senior
│   ├── backend-senior/SKILL.md                 # Estándar Backend (Spring Boot 4, Java 21, OWASP, SOLID)
│   ├── dba-senior/SKILL.md                     # Estándar DBA (PostgreSQL 17, 3FN, Optimización, CTEs)
│   ├── devsecops-senior/SKILL.md               # Estándar DevSecOps (Docker, CI/CD, Shift-Left, Hardening)
│   └── frontend-senior/SKILL.md                # Estándar Frontend (Angular 21, Signals, Standalone, WCAG)
│
├── sql/                                        # Persistencia Relacional PostgreSQL 17 (100% en Español)
│   ├── 01_schema_ddl.sql                       # DDL de las 19 tablas con COMMENT ON en catálogo
│   ├── 02_seed_dummy_data.sql                  # Datos semilla de prueba sincronizados
│   ├── 03_queries_and_views.sql                # Función recursiva fn_obtener_menu y vistas operativas
│   ├── 04_password_expiration_and_locked_status.sql # Migración: Vigencia de claves (90 días) y bloqueo
│   ├── 05_active_sessions_and_remote_kill.sql  # Migración: Sesiones activas, geolocalización y Kill Session
│   ├── 06_add_sessions_menu_item_and_permissions.sql # Registro de menú y permisos RBAC
│   ├── 07_analyst_and_auditor_permissions.sql  # Permisos de roles Auditor y Analista
│   └── README.md                               # Diccionario completo de datos y objetos en español
│
└── technical_frontend_interfaces_and_database_mapping.md # Mapeo técnico: 18 vistas -> APIs -> Tablas SQL
```

---

## ⚡ Enlaces Rápidos a Visores Web Interactivos

| Módulo | Descripción | Enlace al Visor Interactivo |
| :--- | :--- | :--- |
| **Arquitectura de Software** | Visor de 8 diagramas Archify C4, flujos, secuencias, redes y CI/CD Homelab | [**`docs/diagrams/index.html`**](file:///D:/tools/Proyectos/sidebar-login/docs/diagrams/index.html) |
| **Pipeline CI/CD DevSecOps** | Guía de implementación paso a paso CI/CD con GitHub Actions y Homelab | [**`docs/README_PIPELINE_CICD_HOMELAB_DEVSECOPS.md`**](file:///D:/tools/Proyectos/sidebar-login/docs/README_PIPELINE_CICD_HOMELAB_DEVSECOPS.md) |
| **Video C4 Redes (HyperFrames)** | Video animado didáctico (52s) de C4 Nivel 2 y Segmentación en 3 Redes Aisladas | [**`docs/presentacion/video_c4_segmentacion_redes.html`**](file:///D:/tools/Proyectos/sidebar-login/docs/presentacion/video_c4_segmentacion_redes.html) |
| **Arquitectura Cloud** | Comparador interactivo Azure vs GCP y costos FinOps | [**`docs/cloud/index.html`**](file:///D:/tools/Proyectos/mio/sidebar-login/docs/cloud/index.html) |
| **Presentación a Clientes** | Pitch comercial interactivo (Tema Claro + Simulador POS) | [**`docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html`**](file:///D:/tools/Proyectos/mio/sidebar-login/docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.html) |

---

## 📖 Guías Técnicas y Documentos de Referencia

### 0. [Plan Maestro de Desarrollo & Blueprint para Agentes IA (`../PLAN_MAESTRO_DESARROLLO_IA.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/PLAN_MAESTRO_DESARROLLO_IA.md)
Documento canónico ubicado en la raíz del repositorio diseñado para ser consumido por **cualquier modelo de Inteligencia Artificial (ChatGPT, Claude, Gemini, DeepSeek, Antigravity, Cursor)** como guía de contexto, system prompt y especificación de desarrollo para replicar o extender la arquitectura.

### 1. [Arquitectura Cloud y Comparativa de Costos (`cloud/ARQUITECTURA_CLOUD_AZURE_GCP_Y_COSTOS.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/cloud/ARQUITECTURA_CLOUD_AZURE_GCP_Y_COSTOS.md)
Propuesta de despliegue en **Microsoft Azure** (Azure Front Door, Container Apps, PostgreSQL Flexible Server) y **Google Cloud Platform** (Cloud Armor, Cloud Run, Cloud SQL). Incluye:
- Arquitectura de red privada Zero-Trust (VNet / VPC).
- Pipeline CI/CD automatizado con escaneos SAST y Trivy.
- Cuadro comparativo de costos mensuales: **$340 USD/mes en Azure** vs **$296 USD/mes en GCP** (o **$212 USD/mes con CUD**).

### 2. [Diccionario de Datos en Español (`sql/README.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/sql/README.md)
Documentación integral de los 7 scripts SQL, las 19 tablas relacionales en español, vistas (`vw_usuarios_empresas_sedes`, `vw_ventas_con_detalles_comprobante`, `vw_sesiones_activas_usuario`, `vw_arbol_jerarquia_menu`) y la función recursiva `fn_obtener_menu_efectivo_usuario`.

### 3. [Mapeo Técnico de Interfaces (`technical_frontend_interfaces_and_database_mapping.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/technical_frontend_interfaces_and_database_mapping.md)
Matriz punto a punto que vincula las 18 interfaces Angular 21, sus controladores REST en Spring Boot 4 y los objetos de base de datos consultados.

### 4. [Guía Interactiva para el Usuario Final (`presentacion/PRESENTACION_INTERACTIVA_USUARIO.md`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/presentacion/PRESENTACION_INTERACTIVA_USUARIO.md)
Manual operativo para cajeros, administradores y supervisores de tienda, explicando el inicio de sesión, ventas mayor/menor, arqueos de caja y auditoría en tiempo real.

### 5. Estándares y Skills de Ingeniería Senior (`skills/`)
- [**Backend Senior**](file:///D:/tools/Proyectos/mio/sidebar-login/docs/skills/backend-senior/SKILL.md): Arquitectura Limpia, Spring Boot 4, Java 21, Hilos Virtuales, OWASP Top 10.
- [**DBA Senior**](file:///D:/tools/Proyectos/mio/sidebar-login/docs/skills/dba-senior/SKILL.md): Modelado 3FN, PostgreSQL 17, CTEs recursivos, índices avanzados y hardening.
- [**DevSecOps Senior**](file:///D:/tools/Proyectos/mio/sidebar-login/docs/skills/devsecops-senior/SKILL.md): Multi-stage builds, hardening de contenedores, pipelines CI/CD y CIS Benchmarks.
- [**Frontend Senior**](file:///D:/tools/Proyectos/mio/sidebar-login/docs/skills/frontend-senior/SKILL.md): Angular 21 Standalone, Signals, Nginx Alpine, accesibilidad WCAG y seguridad.
