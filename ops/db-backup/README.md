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

---

## 2. Consideraciones a Tomar en Cuenta

1. **Aislamiento en Red Interna:**
   - El contenedor se comunica directamente con `dev-postgres:5432` a través de la red privada `bevadmin-network`. No requiere que el puerto 5432 esté expuesto públicamente en el host.
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
- **Volúmenes:**
  - `postgres-backups:/backups`: Volumen persistente de almacenamiento de respaldos.

---

## 4. Pruebas y Validación Paso a Paso

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
