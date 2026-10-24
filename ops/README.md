# 🛡️ Suite Operativa de Infraestructura, Seguridad y Monitoreo (VPS Hardened)

Este directorio contiene la arquitectura y configuración de los componentes operativos que blindan, supervisan y protegen la plataforma **BevAdmin Pro** en entornos de producción basados en servidores virtuales privados (**VPS Linux**).

La suite opera de forma **100% independiente y desacoplada** de la aplicación principal mediante el archivo [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml) y se comunica con los contenedores core a través de la red privada `bevadmin-network`.

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

---

## 🔐 Política de Seguridad: Bloqueo Estricto de HTTP

Por motivos estrictos de ciberseguridad, **el acceso por HTTP plano no cifrado está bloqueado**:
1. **Redirección Forzada en el Entrypoint `web` (`:80`):** Toda petición recibida en el puerto 80 es interceptada a nivel de socket con prioridad `10000` y redirigida con código permanente `HTTP 301 Moved Permanently` hacia el entrypoint seguro `websecure` (`:443`).
2. **Aislamiento de Routers:** Los routers de la aplicación (`frontend-router` y `backend-router`) solo están asociados al entrypoint seguro (`websecure`), impidiendo que viajen tokens JWT, credenciales o datos de transacciones en texto plano.
3. **Cabeceras HSTS con Precarga:**
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - Le indica al navegador que nunca vuelva a intentar comunicarse por HTTP durante al menos un año.

---

## 🚀 Gestión Rápida del Módulo Operativo

Para facilitar la administración diaria, se dispone de scripts automatizados multiplataforma:

### En Windows (PowerShell):
```powershell
.\ops\start-ops.ps1          # Iniciar todos los contenedores operativos
.\ops\start-ops.ps1 -Status  # Consultar el estado de salud de los servicios
.\ops\start-ops.ps1 -Logs    # Visualizar las bitácoras en tiempo real
.\ops\start-ops.ps1 -Down    # Detener el módulo operativo de forma limpia
```

### En Linux / VPS (Bash):
```bash
./ops/start-ops.sh           # Iniciar servicios
./ops/start-ops.sh status    # Consultar estado
./ops/start-ops.sh logs      # Ver logs
./ops/start-ops.sh down      # Detener servicios
```

---

## 🌐 Endpoints de Gestión Operativa

Una vez iniciado el módulo operativo, los siguientes puntos de acceso local quedan habilitados:

- 📊 **Uptime Kuma (Monitoreo Alert-on-Down):** [http://localhost:3001](http://localhost:3001)
- 🚦 **Traefik Dashboard (Ingress & Middlewares):** [http://localhost:8088/dashboard/](http://localhost:8088/dashboard/)
- 🔒 **Frontend Seguro (HTTPS vía Traefik):** [https://localhost](https://localhost)
- ⚙️ **Backend Seguro (HTTPS vía Traefik):** [https://localhost/api/v1/auth/health](https://localhost/api/v1/auth/health)
