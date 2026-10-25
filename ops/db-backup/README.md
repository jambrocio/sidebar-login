# 🗄️ PostgreSQL Backup — Respaldos Automatizados, Rotación y Recuperación

---

## 1. Descripción de su Funcionalidad

El módulo de respaldo de base de datos (`bevadmin-db-backup`) garantiza la protección continua de los datos transaccionales del negocio (ventas, comprobantes, inventario, usuarios y auditorías) en el VPS:
- **Respaldos Programados Autónomos:** Ejecuta automáticamente volcados consistentes de PostgreSQL 17 (`pg_dump`) todos los días a las 02:00 AM mediante la directiva `SCHEDULE=@daily`.
- **Compresión Gzip de Alta Eficiencia:** Comprime los archivos SQL en formato `.sql.gz`, reduciendo el uso de disco en más de un 80%.
- **Política de Rotación Inteligente (GFS - Grandfather-Father-Son):**
  - **7 días** de copias diarias (`daily/`).
  - **4 semanas** de copias semanales (`weekly/`).
  - **6 meses** de copias mensuales (`monthly/`).
  - Enlace simbólico persistente al último respaldo exitoso (`latest.sql.gz`).
- **Disponibilidad para Disaster Recovery:** Permite copiar o sincronizar fácilmente el volumen `postgres-backups` hacia almacenamiento remoto en la nube (Cloudflare R2, Backblaze B2, AWS S3 o Google Cloud Storage).
- **Herramienta Visual Web (Databasus):** Panel gráfico intuitivo desplegado en el puerto `8085` (`http://localhost:8085`) para configuración visual de bases de datos, destinos locales persistentes (`/backups`) o buckets S3, periodicidad cron, ejecución de respaldos con 1-click y restauración asistida sin comandos de terminal.

---

## 2. Consideraciones a Tomar en Cuenta

1. **Aislamiento en Red Interna:**
   - El contenedor se comunica directamente con `dev-postgres:5432` a través de la red aislada `bevadmin-data-network`. No requiere que el puerto 5432 esté expuesto públicamente en el host.
2. **Consistencia Transaccional:**
   - Utiliza `pg_dump` con transacciones ACID, permitiendo generar respaldos consistentes en caliente sin bloquear las ventas ni interrumpir la operación de los cajeros POS.
3. **Persistencia y Espacio en Disco:**
   - Los volcados se almacenan en el volumen Docker con nombre `bevadmin_postgres_backups`. Gracias a la rotación automática de archivos obsoletos, el espacio en disco permanece acotado y predecible.
4. **Respaldo Offsite (Regla 3-2-1):**
   - Para producción estricta, se aconseja programar un script cron en el host del VPS para sincronizar la carpeta `/backups` hacia un bucket S3 externo una vez por semana.

---

## 3. Configuraciones Realizadas

### Parámetros en [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml)
- **Imagen:** `prodrigestivill/postgres-backup-local:17`
- **Nombre:** `bevadmin-db-backup`
- **Variables de Entorno:**
  - `POSTGRES_HOST=dev-postgres`: Dirección del contenedor de base de datos en la red Docker.
  - `POSTGRES_DB=${DB_NAME:-admin_dashboard_db}`: Base de datos objetivo.
  - `POSTGRES_USER=${DB_USER:-postgres}`: Usuario administrativo de la base de datos.
  - `POSTGRES_PASSWORD=${DB_PASSWORD:-postgres}`: Contraseña de conexión.
  - `SCHEDULE=@daily`: Programación cron automática.
  - `BACKUP_KEEP_DAYS=7`: Días de retención diaria.
  - `BACKUP_KEEP_WEEKS=4`: Semanas de retención semanal.
  - `BACKUP_KEEP_MONTHS=6`: Meses de retención mensual.
- **Healthcheck:**
  - `pg_isready -h dev-postgres -U postgres -d admin_dashboard_db`: Valida que el servicio pueda conectarse exitosamente al motor PostgreSQL.
- **Canales de Notificación y Telemetría:**
  - `BACKUP_PUSH_URL`: Endpoint de monitor Push en Uptime Kuma (`http://bevadmin-uptime-kuma:3001/api/push/<key>`).
  - `BACKUP_TELEGRAM_BOT_TOKEN` y `BACKUP_TELEGRAM_CHAT_ID`: Notificación instantánea vía bot de Telegram.
  - `BACKUP_DISCORD_WEBHOOK_URL`: Alertas con tarjetas enriquecidas a Discord.
  - `BACKUP_WEBHOOK_URL`: Webhook HTTP genérico (envía payload JSON con metadata).
- **Volúmenes:**
  - `postgres-backups:/backups`: Volumen persistente de almacenamiento de respaldos.
  - `./ops/db-backup/hooks:/hooks:ro`: Directorio de hooks nativos (`notify-backup`) ejecutados por `run-parts` en eventos `pre-backup`, `post-backup` y `error`.

---

## 4. Sistema de Notificaciones y Telemetría al Culminar el Respaldo

El contenedor integra el hook [`ops/db-backup/hooks/notify-backup`](file:///D:/tools/Proyectos/sidebar-login/ops/db-backup/hooks/notify-backup) que se activa automáticamente al culminar cada volcado:

1. **Generación de Estado Estructurado (`backup_latest.json`):**
   Registra en tiempo real la salud del volcado, tamaño en bytes y legible, nombre exacto del archivo, duración en segundos y marca de tiempo UTC:
   ```json
   {
     "status": "SUCCESS",
     "database": "admin_dashboard_db",
     "timestamp": "2026-10-24T21:02:09Z",
     "date_readable": "2026-10-24 21:02:09",
     "filename": "admin_dashboard_db-20261024-210209.sql.gz",
     "size_bytes": 34352,
     "size_human": "36K",
     "duration_seconds": 0
   }
   ```

2. **Integración con Uptime Kuma (Push Monitor / Heartbeat):**
   - En Uptime Kuma (`http://localhost:3001`), cree un monitor de tipo **"Push"** con intervalo de 25 horas.
   - Copie la URL generada (ej: `http://bevadmin-uptime-kuma:3001/api/push/CLAVE_AQUI`) y colóquela en `BACKUP_PUSH_URL` dentro de `ops/.env.ops`.
   - Cada vez que el backup culmina con éxito, el hook envía un ping HTTP con los datos de tamaño y duración. Si el respaldo no ocurre en el período esperado o falla, Uptime Kuma dispara la alarma **"Alert-on-Down"**.

3. **Notificaciones Push a Telegram / Discord:**
   Al finalizar el respaldo, el bot envía un mensaje consolidado con el archivo generado, tamaño en disco y duración. Si ocurre un error, despacha de inmediato una alerta crítica de fallo.

---

## 5. Herramienta de Gestión Integral de Respaldos

Para facilitar la administración, supervisión y recuperación de respaldos, se dispone de los scripts [`ops/manage-backups.ps1`](file:///D:/tools/Proyectos/sidebar-login/ops/manage-backups.ps1) (PowerShell) y [`ops/manage-backups.sh`](file:///D:/tools/Proyectos/sidebar-login/ops/manage-backups.sh) (Bash):

### Comandos de Gestión:

| Acción | Comando PowerShell (Windows) | Comando Bash (Linux / VPS) | Descripción |
| :--- | :--- | :--- | :--- |
| **Consultar Estado** | `.\ops\manage-backups.ps1 -Status` | `./ops/manage-backups.sh status` | Muestra salud del contenedor, último archivo generado, tamaño, duración y auditoría. |
| **Inventario de Copias** | `.\ops\manage-backups.ps1 -List` | `./ops/manage-backups.sh list` | Lista todos los archivos `.sql.gz` en los directorios `last`, `daily`, `weekly` y `monthly`. |
| **Respaldo Inmediato** | `.\ops\manage-backups.ps1 -BackupNow` | `./ops/manage-backups.sh backup-now` | Dispara un volcado manual en caliente y envía las notificaciones a los canales activos. |
| **Restauración** | `.\ops\manage-backups.ps1 -Restore <archivo>` | `./ops/manage-backups.sh restore <archivo>` | Restaura la base de datos de manera segura previa confirmación interactiva. |
| **Probar Alertas** | `.\ops\manage-backups.ps1 -TestNotification` | `./ops/manage-backups.sh test-notify` | Simula la culminación de un respaldo para comprobar conectividad con Telegram/Discord. |

---

## 6. Panel Visual Web Ops: Databasus (`:8085`)

Para operadores o administradores que prefieren gestionar los respaldos mediante una interfaz visual intuitiva sin necesidad de ejecutar comandos CLI, la suite Ops incluye **Databasus** (`bevadmin-databasus`):

- **URL de Acceso:** [http://localhost:8085](http://localhost:8085) (o vía Traefik en `https://backup.bevadmin.com`)
- **Documentación Completa:** [**`ops/databasus/README.md`**](file:///D:/tools/Proyectos/sidebar-login/ops/databasus/README.md)
- **Primer Inicio (Setup Inicial):** Al ingresar por primera vez, el sistema solicitará crear la cuenta administradora inicial.
- **Capacidades de la Interfaz Visual:**
  1. **Configuración de Bases de Datos:** Permite conectar visualmente a `dev-postgres:5432` con usuario `postgres` y base de datos `admin_dashboard_db`.
  2. **Configuración de Destinos de Almacenamiento Local (Homelab):**
     - Permite seleccionar explícitamente *Local Storage* y definir la ruta `/backups` montada en el volumen Docker persistente `postgres-backups`.
     - Opcionalmente soporta buckets S3 (Cloudflare R2, MinIO, AWS S3) para redundancia externa.
  3. **Planificador Visual (Cron):** Permite configurar periodicidad diaria, semanal o intervalos personalizados con previsualización en lenguaje natural.
  4. **Ejecución y Descarga con 1-Click:** Botón *"Run Now"* para disparar respaldos manuales y botón *"Download"* para descargar los archivos `.sql.gz` directamente al navegador.
  5. **Restauración Asistida:** Botón *"Restore"* para aplicar un respaldo sobre la base de datos con un solo clic.
  6. **Canales de Alerta Gráficos:** Integración directa con Telegram, Discord, Slack y Webhooks ante eventos de respaldo.

---

## 7. Pruebas y Validación Paso a Paso

### Prueba 1: Verificar la Conectividad y Salud del Contenedor
```powershell
docker inspect bevadmin-db-backup --format "{{.State.Health.Status}}"
# Debe responder: healthy
```

### Prueba 2: Ejecutar un Respaldo Manual Inmediato bajo Demanda
Para validar la generación del volcado sin esperar a la programación automática nocturna:
```powershell
docker exec bevadmin-db-backup /backup.sh
```
*Salida esperada:*
```text
Creating dump of admin_dashboard_db database from dev-postgres...
Replacing daily backup /backups/daily/admin_dashboard_db-YYYYMMDD.sql.gz...
SQL backup created successfully
```

### Prueba 3: Listar e Inspeccionar los Archivos Generados
```powershell
docker exec bevadmin-db-backup ls -lh /backups/daily/
```
*Debe mostrar el archivo generado (ej: `admin_dashboard_db-20261024.sql.gz`) con su peso y fecha.*

### Prueba 4: Validar la Integridad del Archivo Comprimido
Comprueba que el archivo `.sql.gz` no esté corrupto y pueda descomprimirse sin errores:
```powershell
docker exec bevadmin-db-backup gzip -t /backups/daily/admin_dashboard_db-latest.sql.gz
# Si no emite ningún error, el archivo es 100% válido y legible.
```

### Prueba 5: Procedimiento de Restauración de Emergencia (Rollback)
En caso de requerir restaurar la base de datos a partir de un volcado previo:
```powershell
# Restaurar el último respaldo directamente en la base de datos PostgreSQL:
docker exec -i dev-postgres gunzip -c /backups/daily/admin_dashboard_db-latest.sql.gz | docker exec -i dev-postgres psql -U postgres -d admin_dashboard_db
```
