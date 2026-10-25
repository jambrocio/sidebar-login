# 📡 Uptime Kuma — Monitoreo de Disponibilidad con Política "Alert-on-Down Only"

---

## 1. Descripción de su Funcionalidad

**Uptime Kuma** es una herramienta moderna, visual y ultraliviana de supervisión de disponibilidad de infraestructura y servicios:
- **Consumo Ultrabajo de Recursos:** Requiere menos de 50 MB de memoria RAM y una fracción imperceptible de CPU, siendo ideal para servidores VPS con recursos medidos.
- **Sondeo Interno Nativo y Segmentado:** Se comunica directamente con los contenedores conectándose a las redes `bevadmin-app-network` (para sondear Frontend y Backend) y `bevadmin-data-network` (para sondear PostgreSQL por TCP) usando sus alias de servicio (`dev-frontend`, `dev-backend`, `dev-postgres`), sin exponer puertos innecesarios a Internet.
- **Filosofía Estricta "Alert-on-Down":** Diseñado para **eliminar la fatiga de alertas**. El sistema permanece en absoluto silencio mientras los servicios operan con normalidad. Solo dispara notificaciones inmediatas a los canales de alerta cuando un servicio cae (**DOWN**) tras superar 3 reintentos consecutivos, y emite un único aviso de confirmación cuando se restablece (**UP**).
- **Notificaciones Push Multicanal:** Integra soporte nativo para **Telegram Bot**, **Discord Webhook**, **Slack**, **Email SMTP**, entre más de 90 proveedores.

---

## 2. Consideraciones a Tomar en Cuenta

1. **Acceso al Panel Administrativo:**
   - Por defecto está expuesto en `http://127.0.0.1:3001` (solo accesible localmente en el servidor o mediante túnel SSH). Si se desea acceso público seguro por Internet, Traefik ya cuenta con la ruta configurada para el subdominio `status.bevadmin.com` bajo HTTPS.
2. **Primer Inicio y Configuración de Cuenta:**
   - En el primer arranque, el sistema redirige a `/setup` para crear la cuenta de usuario administrador local. Los datos se almacenan de forma persistente en el volumen Docker `uptime-kuma-data`.
3. **Filtro de Falsos Positivos:**
   - Cada monitor está configurado con **3 reintentos fallidos antes de emitir la alarma**, evitando alertas erráticas causadas por reinicios breves o picos temporales de carga.
4. **Cero Dependencia de Agentes:**
   - No requiere instalar demonios pesados ni recolectores de métricas en los contenedores supervisados; utiliza sondas de aplicación estándar (HTTP Status y TCP Handshake).

---

## 3. Configuraciones Realizadas

### A. Parámetros del Contenedor en [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml)
- **Imagen:** `louislam/uptime-kuma:latest`
- **Puerto:** `127.0.0.1:3001:3001` (acceso web local)
- **Volumen:** `uptime-kuma-data` montado en `/app/data` (persistencia de base de datos SQLite y certificados).
- **Healthcheck:** Ejecuta `node extra/healthcheck.js` cada 15 segundos para auto-verificar su propia salud.

### B. Sondas Internas de Monitoreo

| Monitor | Tipo | URL / Destino Interno | Intervalo | Reintentos | Criterio de Estado UP |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **01. Frontend SPA** | HTTP(s) | `http://dev-frontend:80/` | 30s | 3 | Código `200 OK` |
| **02. Backend API** | HTTP(s) | `http://dev-backend:8080/api/v1/auth/health` | 30s | 3 | Código `200` y payload contenga `"status":"UP"` |
| **03. PostgreSQL 17** | TCP Port | Host: `dev-postgres`, Puerto: `5432` | 30s | 3 | Conexión de socket TCP establecida |

---

## 4. Pruebas y Validación Paso a Paso

### Prueba 1: Verificar la Salud del Contenedor
```powershell
docker inspect bevadmin-uptime-kuma --format "{{.State.Health.Status}}"
# Debe responder: healthy
```

### Prueba 2: Comprobar la Respuesta HTTP del Panel de Monitoreo
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/" -Method Head | Select-Object StatusCode
# Debe responder: 200 (o 302 si aún no se ha creado la cuenta inicial de setup)
```

### Prueba 3: Configurar el Canal de Notificación en la Interfaz Web
1. Abra en el navegador [http://localhost:3001](http://localhost:3001).
2. Cree su usuario y contraseña de administración.
3. Vaya a **Settings** $\rightarrow$ **Notifications** $\rightarrow$ **Setup Notification**:
   - Para **Telegram**: Ingrese el `Bot Token` y su `Chat ID` personal o de grupo.
   - Para **Discord**: Pegue la `Webhook URL` generada en su canal de `#alertas-ops`.
4. Haga clic en **Test Notification**: debe recibir un mensaje de prueba inmediato en su celular o chat.

### Prueba 4: Prueba de Fuego "Alert-on-Down" (Simulación de Incidente Real)
Esta prueba confirma que la alarma se dispara **únicamente** cuando ocurre una caída real:
```powershell
# 1. Detener intencionalmente el backend para provocar una caída controlada:
docker stop dev-backend

# 2. Esperar entre 30 y 45 segundos:
# Uptime Kuma realizará 3 intentos consecutivos. Al fallar el tercero,
# enviará inmediatamente la notificación de alarma al canal:
# 🚨 [DOWN] Backend API is DOWN (Connection refused / Timeout)

# 3. Restablecer el servicio:
docker start dev-backend

# 4. Esperar al siguiente ciclo de sondeo (aprox. 15-30s):
# Uptime Kuma detectará que la API responde nuevamente y enviará el aviso de recuperación:
# ✅ [UP] Backend API is back UP (HTTP 200 OK)
```
*Durante la operación continua, Uptime Kuma permanecerá en silencio total, garantizando cero spam en el canal de comunicación.*
