# 🛡️ Suite Operativa de Infraestructura, Seguridad y Monitoreo (VPS Hardened)

Este directorio contiene la arquitectura y configuración de los componentes operativos que blindan, supervisan y protegen la plataforma **BevAdmin Pro** en entornos de producción basados en servidores virtuales privados (**VPS Linux**).

La suite opera de forma **100% independiente y desacoplada** de la aplicación principal mediante el archivo [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml) y se comunica con los contenedores core a través de una arquitectura de **3 redes segmentadas Zero-Trust**:
- 🌐 **`bevadmin-ops-network`:** Red perimetral y de soporte operativo (Traefik, CrowdSec, Uptime Kuma, Autoheal, Backup y Databasus).
- 📱 **`bevadmin-app-network`:** Red de aplicación para comunicación entre el Frontend Angular SPA, el Backend Spring Boot REST API y el Ingress de Traefik.
- 🗄️ **`bevadmin-data-network`:** Red aislada de base de datos a la que solo tienen acceso el Backend y las herramientas autorizadas de backup (PostgreSQL Backup, Databasus y sondas de Uptime Kuma). El Frontend nunca tiene acceso a esta red.

### Matriz de Segmentación y Pertenencia a Redes:

| Contenedor / Servicio | `bevadmin-ops-network` | `bevadmin-app-network` | `bevadmin-data-network` | Propósito y Restricción de Acceso |
| :--- | :---: | :---: | :---: | :--- |
| **`dev-frontend`** | ❌ | **SÍ** | ❌ | Frontend SPA servido por Nginx. Solo habla con el Backend. **Aislado de la base de datos.** |
| **`dev-backend`** | ❌ | **SÍ** | **SÍ** | REST API Spring Boot. Puente controlado entre la red de aplicación y la de persistencia. |
| **`dev-postgres`** | ❌ | ❌ | **SÍ** | **Capa de persistencia aislada.** No tiene contacto con el Frontend ni acceso a internet. |
| **`bevadmin-proxy`** | **SÍ** | **SÍ** | ❌ | Gateway TLS 1.3 perimetral. Enruta al Frontend y Backend. **No puede conectar a la BD.** |
| **`bevadmin-crowdsec`**| **SÍ** | ❌ | ❌ | WAF / IPS colaborativo. Inspecciona bitácoras de Traefik dentro de la red Ops. |
| **`bevadmin-uptime-kuma`**| **SÍ** | **SÍ** | **SÍ** | Monitoreo sintético global. Conectado a las 3 redes para ejecutar sondas de salud. |
| **`bevadmin-autoheal`** | **SÍ** | ❌ | ❌ | Watchdog de salud. Supervisa el daemon de Docker mediante socket Unix local. |
| **`bevadmin-db-backup`**| **SÍ** | ❌ | **SÍ** | Motor de respaldos automatizados `pg_dump`. Conectado a la BD y a Ops para métricas. |
| **`bevadmin-databasus`** | **SÍ** | ❌ | **SÍ** | Panel visual de respaldos. Conectado a la BD para volcados y a Ops para acceso web. |

---

## 🧭 Índice de Módulos Operativos y Documentación Individual

Cada componente cuenta con su propia guía detallada de funcionalidad, consideraciones, configuración y pruebas:

| Componente | Imagen Docker | Documentación Técnica | Funcionalidad Principal |
| :--- | :--- | :--- | :--- |
| **Traefik v3.2** | `traefik:v3.2` | 📖 [**`traefik/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/traefik/README.md) | **Reverse Proxy & TLS Ingress:** Terminación SSL/TLS 1.3 automática (Let's Encrypt), bloqueo forzado de HTTP no cifrado y middlewares OWASP. |
| **CrowdSec** | `crowdsecurity/crowdsec:latest` | 📖 [**`crowdsec/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/crowdsec/README.md) | **WAF / IPS Colaborativo:** Inspección de bitácoras de Traefik en tiempo real, protección contra OWASP Top 10 y baneo automático de IP maliciosas. |
| **Uptime Kuma** | `louislam/uptime-kuma:latest` | 📖 [**`uptime-kuma/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/uptime-kuma/README.md) | **Monitoreo "Alert-on-Down":** Sondas periódicas de disponibilidad a frontend, backend y PostgreSQL con alertas exclusivas ante fallos (**DOWN**) a Telegram/Discord. |
| **Autoheal** | `willfarrell/autoheal:latest` | 📖 [**`autoheal/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/autoheal/README.md) | **Watchdog de Auto-Recuperación:** Supervisa los healthchecks nativos de Docker y reinicia automáticamente contenedores no saludables (`unhealthy`). |
| **PostgreSQL Backup** | `prodrigestivill/postgres-backup-local:17` | 📖 [**`db-backup/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/db-backup/README.md) | **Respaldos Automatizados:** Volcados diarios consistentes (`pg_dump`) comprimidos en `.sql.gz` con política de rotación (7 días, 4 semanas, 6 meses). |
| **Databasus** | `databasus/databasus:latest` | 📖 [**`databasus/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/databasus/README.md) | **Panel Visual Web de Respaldos:** Interfaz gráfica para configuración de destinos de almacenamiento local (`/backups`) y nube S3, programación cron, ejecución con 1-click y restauración asistida. |

---

## 🔐 Política de Seguridad: HTTP Inactivo y Acceso Exclusivo HTTPS

Por motivos estrictos de ciberseguridad, **cuando los módulos Ops están habilitados, HTTP se desactiva por completo**:
1. **Puerto HTTP :80 Inactivo:** No existe ningún listener en el puerto 80 del proxy. Cualquier intento de conexión HTTP en texto plano es rechazado directamente a nivel de socket por el sistema operativo (`Connection Refused`), impidiendo ataques de degradación de protocolo (*SSL-stripping*).
2. **Desafío SSL por TLS-ALPN-01:** Let's Encrypt opera con el resolvedor `tlsChallenge` en el puerto 443, prescindiendo totalmente de puertos HTTP no cifrados para la emisión y renovación de certificados.
3. **Ingreso Exclusivo HTTPS (`:443`):** Toda la comunicación de Frontend SPA y Backend REST API fluye obligatoriamente a través de TLS 1.3 con HSTS (`max-age=31536000; includeSubDomains; preload`).
4. **Modo Standalone (Desarrollo sin Ops):** Cuando los módulos Ops se desactivan mediante `.\stop-ops.ps1` (o `./stop-ops.sh`), el script automáticamente restablece los mapeos de puertos directos HTTP (`4200:80` para Frontend, `8080:8080` para Backend y `5432:5432` para PostgreSQL) permitiendo el uso normal de la aplicación en `http://localhost:4200` y `http://localhost:8080` sin necesidad de HTTPS. Si se desactivó el compose de ops manualmente, basta con ejecutar `docker compose up -d dev-frontend dev-backend dev-postgres` para restablecer los puertos.

---

## 🚀 Gestión Rápida del Módulo Operativo

Para facilitar la administración diaria, se dispone de scripts automatizados multiplataforma ubicados en la raíz del proyecto:

### En Windows (PowerShell):
```powershell
.\start-ops.ps1          # Iniciar suite Ops (activa HTTPS en :443 y bloquea HTTP directos)
.\stop-ops.ps1           # Detener suite Ops (desactiva HTTPS y rehabilita HTTP en :4200 y :8080)
.\start-ops.ps1 -Status  # Consultar el estado de salud de los servicios
.\start-ops.ps1 -Logs    # Visualizar las bitácoras en tiempo real
```

### En Linux / VPS (Bash):
```bash
./start-ops.sh           # Iniciar suite Ops (activa HTTPS en :443)
./stop-ops.sh            # Detener suite Ops (rehabilita HTTP en :4200 y :8080)
./start-ops.sh status    # Consultar estado
./start-ops.sh logs      # Ver logs
```

---

## 🌐 Endpoints de Gestión Operativa

Una vez iniciado el módulo operativo, los siguientes puntos de acceso local quedan habilitados:

- 📊 **Uptime Kuma (Monitoreo Alert-on-Down):** [http://localhost:3001](http://localhost:3001)
- 💾 **Databasus (Panel Visual de Respaldos):** [http://localhost:8085](http://localhost:8085)
- 🚦 **Traefik Dashboard (Ingress & Middlewares):** [http://localhost:8088/dashboard/](http://localhost:8088/dashboard/)
- 🔒 **Frontend Seguro (HTTPS vía Traefik):** [https://localhost](https://localhost)
- ⚙️ **Backend Seguro (HTTPS vía Traefik):** [https://localhost/api/v1/auth/health](https://localhost/api/v1/auth/health)
