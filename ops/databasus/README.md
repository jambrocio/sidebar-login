# 💾 Databasus — Panel Visual de Configuración y Gestión de Respaldos PostgreSQL

---

## 1. Descripción de su Funcionalidad

**Databasus** (`databasus/databasus`, anteriormente conocido como *Postgresus*) es una plataforma web moderna, visual y de código abierto diseñada para la **administración, programación, ejecución, validación y restauración asistida de respaldos de bases de datos** (PostgreSQL 13 a 18, MySQL, MariaDB y MongoDB) mediante una interfaz gráfica intuitiva (Web UI):

- **Destino de Almacenamiento Local Seleccionable (Ideal para Homelab y Servidores Privados):** A diferencia de otras herramientas que obligan al uso de nubes externas, Databasus permite elegir explícitamente **"Local Storage"** en su interfaz gráfica y definir rutas del sistema de archivos local (`/backups`) montadas de forma persistente en el host.
- **Gestión Visual Integral sin Terminal:** Permite a administradores, operadores DevOps y usuarios de homelab configurar conexiones de base de datos, programar respaldos y restaurar información sin necesidad de ejecutar comandos manuales `pg_dump` o `psql`.
- **Planificador Visual de Respaldos (Schedules):** Soporta expresiones Cron estándar (ej: diario a las 02:00 AM, cada 6 horas, fines de semana) con previsualización en lenguaje natural legible.
- **Múltiples Destinos Híbridos:** Además de almacenamiento local en disco, soporta destinos remotos en AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, Google Drive, SFTP y NAS corporativo.
- **Pruebas de Restauración Automatizadas (Restore Verification):** Valida periódicamente la integridad física y lógica de los archivos de volcado, asegurando que el respaldo sea 100% recuperable ante un incidente.
- **Restauración Asistida con 1 Clic:** Selecciona cualquier respaldo histórico y aplica la restauración directamente sobre el motor PostgreSQL con validaciones previas de seguridad.
- **Canales de Notificación Nativos:** Envía alertas automáticas a **Telegram**, **Discord**, **Slack**, Microsoft Teams, correo electrónico o Webhooks HTTP cuando un respaldo culmina con éxito o si ocurre un fallo.
- **Almacenamiento Interno Ligero y Aislado:** Utiliza su propio almacenamiento local (`/databasus-data`), sin requerir crear bases de datos adicionales en el motor PostgreSQL transaccional.

---

## 2. Consideraciones a Tomar en Cuenta

1. **Segmentación de Redes (`bevadmin-ops-network` y `bevadmin-data-network`):**
   - Databasus opera conectado a la red de datos `bevadmin-data-network` para comunicarse de forma directa y privada con `dev-postgres:5432` sin exponer la base de datos a internet ni a la red de frontend.
   - Pertenece simultáneamente a `bevadmin-ops-network` para ser accesible desde el Ingress de Traefik y localhost. No tiene acceso a `bevadmin-app-network`.
2. **Acceso al Panel Web:**
   - **Acceso Local (Homelab / Admin):** Expuesto en `http://127.0.0.1:8085` (puerto interno `4005` del contenedor mapeado al `8085` en localhost).
   - **Acceso Ingress TLS (Ops / Producción):** Enrutado en Traefik v3.2 para el dominio `https://backup.bevadmin.com` bajo TLS 1.3 con middleware de encabezados de seguridad OWASP.
3. **Persistencia de Respaldos Locales en el Host:**
   - La carpeta interna `/backups` de Databasus está vinculada al volumen Docker persistente `bevadmin_postgres_backups` (compartido con el servicio de auditoría `bevadmin-db-backup`).
   - Los archivos `.sql.gz` y `.dump` generados residen físicamente en el servidor anfitrión y sobreviven a reinicios, actualizaciones o reemplazos de contenedores.
4. **Configuración Interna Aislada:**
   - Los datos de usuario, historiales de ejecución y credenciales cifradas se conservan en el volumen dedicado `bevadmin_databasus_data` montado en `/databasus-data`.

---

## 3. Configuraciones Realizadas

### A. Parámetros del Servicio en [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml)

```yaml
  # ----------------------------------------------------------------------------
  # 6. Herramienta Visual de Gestión y Configuración de Respaldos (Databasus)
  # ----------------------------------------------------------------------------
  bevadmin-databasus:
    image: databasus/databasus:latest
    container_name: bevadmin-databasus
    restart: unless-stopped
    ports:
      - "127.0.0.1:8085:4005"
    environment:
      - ENV_MODE=production
      - IS_DISABLE_ANONYMOUS_TELEMETRY=true
    volumes:
      - databasus-data:/databasus-data
      - postgres-backups:/backups
    healthcheck:
      test: ["CMD", "bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/4005 && exec 3>&-"]
      interval: 20s
      timeout: 5s
      retries: 3
    networks:
      - bevadmin-ops-network
      - bevadmin-data-network
```

### B. Enrutamiento Ingress en [`ops/traefik/dynamic/routes.yml`](file:///D:/tools/Proyectos/sidebar-login/ops/traefik/dynamic/routes.yml)

```yaml
    # Enrutamiento hacia Panel Visual de Respaldos (Databasus)
    backup-ui-router:
      rule: "Host(`backup.bevadmin.com`)"
      entryPoints:
        - "websecure"
      service: "backup-ui-service"
      middlewares:
        - "secHeaders@file"

  services:
    backup-ui-service:
      loadBalancer:
        servers:
          - url: "http://bevadmin-databasus:4005"
```

---

## 4. Guía y Modelos de Configuración Paso a Paso (Model Examples)

### Modelo 1: Creación de la Cuenta Administradora Inicial

1. Al abrir por primera vez [http://localhost:8085](http://localhost:8085) en el navegador (o [https://backup.bevadmin.com](https://backup.bevadmin.com) con Ops activo), la interfaz carga el asistente de bienvenida.
2. Completar los campos requeridos:
   - **Username / Name:** `admin` (o tu nombre preferido).
   - **Email:** `admin@bevadmin.com`.
   - **Password:** Definir una contraseña segura (mínimo 8 caracteres).
3. Hacer clic en **"Sign Up"** o **"Create Account"**. El sistema iniciará sesión y mostrará el Dashboard principal.

---

### Modelo 2: Configuración de la Conexión a la Base de Datos (`Databases`)

Para indicar a Databasus qué base de datos transaccional respaldar:

1. En el menú de navegación, hacer clic en **"Databases"** y luego en **"Add Database"** (o **"Connect Database"**).
2. Seleccionar el tipo de motor: **PostgreSQL**.
3. Ingresar los parámetros de conexión interna en la red Docker:
   - **Display Name:** `BevAdmin Pro Production DB`
   - **Host:** `dev-postgres` *(alias del contenedor en `bevadmin-data-network`)*
   - **Port:** `5432`
   - **Database Name:** `admin_dashboard_db`
   - **Username:** `postgres`
   - **Password:** `postgres` *(o el valor definido en `${DB_PASSWORD}`)*
   - **SSL Mode:** `Disable` (dentro de la red Docker interna el tráfico es privado y aislado).
4. Hacer clic en **"Test Connection"**:
   - Se validará la conectividad en caliente con el motor PostgreSQL 17.
5. Hacer clic en **"Save"**.

---

### Modelo 3: Configuración del Destino de Almacenamiento Local (`Destinations` - Local Storage para Homelab)

Para almacenar las copias de seguridad directamente en el disco duro local de tu servidor:

1. En el menú de navegación, ir a **"Destinations"** (o **"Storage"**) y hacer clic en **"Add Destination"**.
2. En el tipo de almacenamiento (**Storage Type**), seleccionar: **"Local Storage"** (o **"Local File System"**).
3. Completar los parámetros del destino:
   - **Destination Name:** `Almacenamiento Local Homelab (/backups)`
   - **Directory Path / Path:** `/backups`
     *(Esta ruta está montada directamente en el volumen persistente Docker `postgres-backups`).*
4. Hacer clic en **"Test Storage / Verify"** para comprobar permisos de escritura en la carpeta.
5. Hacer clic en **"Save Destination"**.

> [!TIP]
> **Opcional — Destino Secundario en la Nube (3-2-1 Backup Strategy):**
> Puedes agregar un segundo destino de tipo **"S3"** (Cloudflare R2, AWS S3 o MinIO) para mantener una copia offsite fuera de tu homelab sin costo adicional.

---

### Modelo 4: Configuración de Tareas Programadas de Respaldo (`Schedules`)

Para programar respaldos automáticos periódicos:

1. Ir a **"Backups"** o **"Schedules"** -> **"Create Backup Task"**.
2. Configurar la tarea:
   - **Name:** `Respaldo Diario Madrugada (ACID)`
   - **Database:** Seleccionar `BevAdmin Pro Production DB`.
   - **Destination:** Seleccionar `Almacenamiento Local Homelab (/backups)`.
   - **Backup Type:** `Full Dump` (Lógico comprimido con `gzip`).
   - **Schedule (Cron Expression):**
     - Diario a las 02:00 AM: `0 2 * * *`
     - Cada 6 horas: `0 */6 * * *`
     - Semanal los domingos a medianoche: `0 0 * * 0`
   - **Retention Policy (Rotación de Copias):**
     - Número de respaldos a conservar: `7` copias diarias (las versiones más antiguas se eliminan automáticamente para no llenar el disco).
3. Guardar el plan de respaldo. El panel mostrará la tarjeta con la próxima fecha y hora de ejecución programada.

---

### Modelo 5: Ejecución Manual Inmediata (1-Click Run) y Descarga

1. En la lista de respaldos, ubicar la tarea creada.
2. Hacer clic en el botón **"Run Now"** (o ícono de reproducción ▶).
3. El sistema ejecutará el volcado en segundo plano sin interrumpir la operación del sistema transaccional.
4. En el historial de ejecuciones se mostrará:
   - Estado: `SUCCESS`
   - Tamaño generado (ej: `38.2 KB`)
   - Duración de la operación (ej: `1.4s`)
5. **Descarga Directa:** Puedes hacer clic en el botón **"Download"** para bajar el archivo `.sql.gz` directamente en tu navegador.

---

### Modelo 6: Verificación Automatizada y Restauración Asistida (Disaster Recovery)

1. En la pestaña de ejecuciones o historial de respaldos, identificar el punto en el tiempo que se desea restablecer.
2. Hacer clic en **"Restore"**.
3. Confirmar la base de datos de destino (`admin_dashboard_db`).
4. Databasus ejecutará la prueba de consistencia y aplicará el volcado de forma atómica y segura.

---

### Modelo 7: Configuración de Notificaciones (Telegram / Discord / Slack)

Para recibir una notificación cada vez que un respaldo culmine o si ocurre algún error:

1. Ir a **"Settings"** -> **"Notifications"** (o **"Integrations"**).
2. Seleccionar el canal deseado:
   - **Telegram:** Ingresar el `Bot Token` y el `Chat ID` de tu canal o grupo de administración.
   - **Discord:** Pegar la URL del webhook del canal de logs de tu servidor de Discord.
   - **Slack / Teams / Webhook:** Configurar el webhook URL correspondiente.
3. Activar los eventos deseados:
   - `On Success`: Notificar cuando el respaldo se complete correctamente.
   - `On Failure`: Enviar alerta urgente si ocurre cualquier fallo en la ejecución.
4. Hacer clic en **"Test Notification"** para verificar la llegada del mensaje al móvil o chat.
5. Guardar la configuración.

---

## 5. Verificación de Estado y Diagnóstico

Para consultar el estado operativo del contenedor desde la terminal:

```powershell
# Consultar estado del contenedor
docker ps --filter "name=bevadmin-databasus"

# Inspeccionar logs en tiempo real
docker logs -f bevadmin-databasus

# Probar respuesta HTTP local
curl.exe -i http://localhost:8085/
```
